#!/usr/bin/env node

/**
 * DNA Analysis MCP Server (Desktop Extension)
 *
 * A Model Context Protocol server for analyzing DNA data with privacy protection.
 * Provides tools to list subjects, get subject information, and query SNP data by RSID.
 * 
 * This server runs as a Desktop Extension (DXT) with configurable DNA profiles directory.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readdir, readFile, stat } from "fs/promises";
import { join, resolve } from "path";
import { homedir } from "os";

// Get DNA profiles directory from environment or use default
function getDnaProfilesDirectory(): string {
  const envDir = process.env.DNA_PROFILES_DIRECTORY;
  if (envDir) {
    // Expand ~ to home directory if present
    return envDir.startsWith('~') ? 
      join(homedir(), envDir.slice(1)) : 
      resolve(envDir);
  }
  return join(homedir(), "dna-profiles");
}

const SAMPLES_DIR = getDnaProfilesDirectory();

// Enhanced logging for DXT environment
function log(level: 'info' | 'error' | 'warn', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] DNA-Analysis-MCP: ${message}`;
  
  if (data) {
    console.error(`${logMessage} ${JSON.stringify(data)}`);
  } else {
    console.error(logMessage);
  }
}

/**
 * Validate RSID format: must start with 'rs' followed by digits.
 */
function validateRsid(rsid: string): boolean {
  const pattern = /^rs\d+$/;
  return pattern.test(rsid.trim());
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists
 */
async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

// Define Zod schemas for tool inputs
const ListSubjectsSchema = z.object({
  pattern: z.string().optional(),
});

const GetTestInfoSchema = z.object({
  subject_name: z.string(),
});

const GetSubjectInfoSchema = z.object({
  subject_name: z.string(),
});

const QuerySnpDataSchema = z.object({
  subject_name: z.string(),
  rsids: z.union([z.string(), z.array(z.string())]),
});

// Configuration constants
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit for SNP files
const OPERATION_TIMEOUT = 30000; // 30 second timeout for operations

// Create the MCP server with enhanced configuration
const server = new Server({
  name: "dna-analysis-mcp",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
  },
});

// Enhanced file reading with size and timeout protection
async function safeReadFile(filePath: string, maxSize: number = MAX_FILE_SIZE): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`File read timeout after ${OPERATION_TIMEOUT/1000} seconds. The file may be too large or the system may be under heavy load. Try again or check file size.`));
    }, OPERATION_TIMEOUT);

    try {
      const stats = await stat(filePath);
      if (stats.size > maxSize) {
        clearTimeout(timeout);
        reject(new Error(`File too large: ${(stats.size/1024/1024).toFixed(1)}MB (max ${maxSize/1024/1024}MB). Please reduce file size or split the data into smaller files.`));
        return;
      }

      const content = await readFile(filePath, 'utf-8');
      clearTimeout(timeout);
      resolve(content);
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && (error as any).code === 'ENOENT') {
        reject(new Error(`File not found: ${filePath}. Please check the file path and ensure the file exists.`));
      } else if (error instanceof Error && (error as any).code === 'EACCES') {
        reject(new Error(`Permission denied: ${filePath}. Please check file permissions and ensure you have read access.`));
      } else {
        reject(error);
      }
    }
  });
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_subjects",
        description: "List all available DNA test subjects. DNA samples are organized by subjects, where each subject represents an individual with genetic test data available for analysis.",
        inputSchema: {
          type: "object",
          properties: {
            pattern: {
              type: "string",
              description: "Optional regex pattern to filter subject names. If provided, only subjects whose names match the pattern will be returned.",
            },
          },
        },
      },
      {
        name: "get_test_info",
        description: "Get metadata about a specific DNA test (not the subject personally, but the test itself). This returns information about how the DNA data was collected, processed, and formatted.",
        inputSchema: {
          type: "object",
          properties: {
            subject_name: {
              type: "string",
              description: "The name of the subject",
            },
          },
          required: ["subject_name"],
        },
      },
      {
        name: "get_subject_info",
        description: "Get information about a specific subject (person). This returns personal information about the individual whose DNA was tested, such as demographics, background, or other metadata about the person themselves.",
        inputSchema: {
          type: "object",
          properties: {
            subject_name: {
              type: "string",
              description: "The name of the subject",
            },
          },
          required: ["subject_name"],
        },
      },
      {
        name: "query_snp_data",
        description: "Query SNP (Single Nucleotide Polymorphism) data for specific RSIDs from a subject's genetic data. Maximum 10 RSIDs per query for privacy protection.",
        inputSchema: {
          type: "object",
          properties: {
            subject_name: {
              type: "string",
              description: "The name of the subject",
            },
            rsids: {
              oneOf: [
                { type: "string" },
                { type: "array", items: { type: "string" } }
              ],
              description: "A single RSID string or list of RSIDs (1-10 RSIDs maximum). Example: 'rs3131972' or ['rs3131972', 'rs1815739']",
            },
          },
          required: ["subject_name", "rsids"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_subjects": {
        const { pattern } = ListSubjectsSchema.parse(args);
        
        try {
          if (!(await directoryExists(SAMPLES_DIR))) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify([]),
                },
              ],
            };
          }

          const items = await readdir(SAMPLES_DIR);
          const subjects: string[] = [];

          for (const item of items) {
            const itemPath = join(SAMPLES_DIR, item);
            if (await directoryExists(itemPath)) {
              subjects.push(item);
            }
          }

          let filteredSubjects = subjects;

          // Apply regex filter if pattern is provided
          if (pattern) {
            try {
              const regex = new RegExp(pattern);
              filteredSubjects = subjects.filter(subject => regex.test(subject));
            } catch (e) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify([`Error: Invalid regex pattern '${pattern}': ${e}. Please use valid JavaScript regex syntax (e.g., 'john.*' for names starting with 'john').`]),
                  },
                ],
              };
            }
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(filteredSubjects.sort()),
              },
            ],
          };
        } catch (e) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify([`Error accessing DNA profiles directory: ${e}. Please ensure the directory '${SAMPLES_DIR}' exists and you have read permissions. Create it with: mkdir -p "${SAMPLES_DIR}"`]),
              },
            ],
          };
        }
      }

      case "get_test_info": {
        const { subject_name } = GetTestInfoSchema.parse(args);
        
        try {
          const subjectDir = join(SAMPLES_DIR, subject_name);
          const infoFile = join(subjectDir, "test_info.txt");

          if (!(await directoryExists(subjectDir))) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ 
                    error: `Subject '${subject_name}' not found. Available subjects can be listed using the 'list_subjects' tool. To create this subject, run: mkdir -p "${subjectDir}" and add a snp.txt file.` 
                  }),
                },
              ],
            };
          }

          if (!(await fileExists(infoFile))) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    subject: subject_name,
                    info: null,
                    message: `No test_info.txt file found for subject '${subject_name}'. You can create this optional file to add information about the DNA test itself (company, date, array version, etc.).`,
                  }),
                },
              ],
            };
          }

          const content = await safeReadFile(infoFile);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  subject: subject_name,
                  info: content.trim(),
                }),
              },
            ],
          };
        } catch (e) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: `Error reading test info for '${subject_name}': ${e}. Please check that the file exists and you have read permissions. File should be at: ${join(SAMPLES_DIR, subject_name, "test_info.txt")}` }),
              },
            ],
          };
        }
      }

      case "get_subject_info": {
        const { subject_name } = GetSubjectInfoSchema.parse(args);
        
        try {
          const subjectDir = join(SAMPLES_DIR, subject_name);
          const infoFile = join(subjectDir, "subject_info.txt");

          if (!(await directoryExists(subjectDir))) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ 
                    error: `Subject '${subject_name}' not found. Available subjects can be listed using the 'list_subjects' tool. To create this subject, run: mkdir -p "${subjectDir}" and add a snp.txt file.` 
                  }),
                },
              ],
            };
          }

          if (!(await fileExists(infoFile))) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    subject: subject_name,
                    info: null,
                    message: `No subject_info.txt file found for subject '${subject_name}'. You can create this optional file to add personal information about the individual (demographics, background, etc.).`,
                  }),
                },
              ],
            };
          }

          const content = await safeReadFile(infoFile);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  subject: subject_name,
                  info: content.trim(),
                }),
              },
            ],
          };
        } catch (e) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: `Error reading subject info for '${subject_name}': ${e}. Please check that the file exists and you have read permissions. File should be at: ${join(SAMPLES_DIR, subject_name, "subject_info.txt")}` }),
              },
            ],
          };
        }
      }

      case "query_snp_data": {
        const { subject_name, rsids: rsidsInput } = QuerySnpDataSchema.parse(args);
        
        // Log input type for debugging complex serialization issues
        log('info', 'query_snp_data input', { 
          subject: subject_name,
          rsidsType: typeof rsidsInput, 
          isArray: Array.isArray(rsidsInput)
        });
        
        try {
          // Handle different input formats robustly
          let rsids: string[];
          
          if (Array.isArray(rsidsInput)) {
            // Already an array - use as-is
            rsids = rsidsInput;
          } else if (typeof rsidsInput === 'string') {
            // Check if it's a JSON-encoded array string
            if (rsidsInput.trim().startsWith('[') && rsidsInput.trim().endsWith(']')) {
              try {
                const parsed = JSON.parse(rsidsInput);
                if (Array.isArray(parsed)) {
                  log('info', 'Parsed JSON array from string input', { originalInput: rsidsInput, parsed });
                  rsids = parsed;
                } else {
                  // Single string that looks like JSON but isn't an array
                  rsids = [rsidsInput];
                }
              } catch (parseError) {
                log('warn', 'Failed to parse JSON-like string, treating as single RSID', { input: rsidsInput, error: parseError });
                rsids = [rsidsInput];
              }
            } else {
              // Regular string - single RSID
              rsids = [rsidsInput];
            }
          } else {
            log('error', 'Unexpected rsidsInput type', { rsidsInput, type: typeof rsidsInput });
            rsids = [String(rsidsInput)]; // Fallback conversion
          }
          
          // Log final processing result  
          log('info', 'Processing RSIDs', { 
            count: rsids.length,
            isStringInput: typeof rsidsInput === 'string' && rsidsInput.startsWith('[')
          });

          // Validate RSID count (privacy protection)
          if (rsids.length > 10) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ 
                    error: `Maximum 10 RSIDs allowed per query for privacy protection. You provided ${rsids.length} RSIDs. Please reduce your query to 10 or fewer RSIDs and try again.` 
                  }),
                },
              ],
            };
          }

          if (rsids.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ 
                    error: "At least 1 RSID must be provided. Please provide a valid RSID (e.g., 'rs3131972') or an array of RSIDs (e.g., ['rs3131972', 'rs1815739'])." 
                  }),
                },
              ],
            };
          }

          // Validate RSID formats
          const invalidRsids = rsids.filter(rsid => !validateRsid(rsid));
          
          if (invalidRsids.length > 0) {
            log('warn', 'Invalid RSID formats detected', { 
              invalidCount: invalidRsids.length, 
              totalCount: rsids.length,
              examples: invalidRsids.slice(0, 3) // Show first 3 invalid ones
            });
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: `Invalid RSID format(s): ${JSON.stringify(invalidRsids)}. RSIDs must match pattern: rs followed by digits (e.g., rs123456)`
                  }),
                },
              ],
            };
          }

          // Validate subject exists
          const subjectDir = join(SAMPLES_DIR, subject_name);
          const snpFile = join(subjectDir, "snp.txt");

          if (!(await directoryExists(subjectDir))) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ 
                    error: `Subject '${subject_name}' not found. Available subjects can be listed using the 'list_subjects' tool. To create this subject, run: mkdir -p "${subjectDir}" and add a snp.txt file.` 
                  }),
                },
              ],
            };
          }

          if (!(await fileExists(snpFile))) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ 
                    error: `No snp.txt file found for subject '${subject_name}'. Please create a tab-delimited SNP file at: ${snpFile}. The file should have columns: rsid, chromosome, position, allele1, allele2.` 
                  }),
                },
              ],
            };
          }

          // Read and process the SNP file
          const fileContent = await safeReadFile(snpFile);
          const lines = fileContent.split('\n');
          
          let header: string | null = null;
          const matchingRows: string[] = [];
          const foundRsids = new Set<string>();

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // First non-empty line is the header
            if (header === null) {
              // Convert header from tab-delimited to comma-delimited
              header = trimmedLine.replace(/\t/g, ',');
              continue;
            }

            // Split the line and check if first column matches any RSID
            const columns = trimmedLine.split('\t');
            if (columns.length > 0 && rsids.includes(columns[0])) {
              // Convert row from tab-delimited to comma-delimited
              const commaDelimitedRow = columns.join(',');
              matchingRows.push(commaDelimitedRow);
              foundRsids.add(columns[0]);
            }
          }

          // Determine which RSIDs were not found
          const notFoundRsids = rsids.filter(rsid => !foundRsids.has(rsid));

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  subject: subject_name,
                  header,
                  matching_rows: matchingRows,
                  queried_rsids: rsids,
                  found_count: matchingRows.length,
                  found_rsids: Array.from(foundRsids),
                  not_found_rsids: notFoundRsids,
                }),
              },
            ],
          };
        } catch (e) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ 
                  error: `Error querying SNP data for '${subject_name}': ${e}. Please check that the snp.txt file exists, is readable, and contains valid tab-delimited data. File location: ${join(SAMPLES_DIR, subject_name, 'snp.txt')}` 
                }),
              },
            ],
          };
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  try {
    log('info', 'Starting DNA Analysis MCP Server (DXT)', {
      version: '1.0.0',
      dnaProfilesDir: SAMPLES_DIR,
      nodeVersion: process.version,
      platform: process.platform
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    log('info', 'DNA Analysis MCP Server connected successfully');
    console.error("DNA Analysis MCP server running...");
  } catch (error) {
    log('error', 'Failed to start server', { error: error instanceof Error ? error.message : error });
    throw error;
  }
}

// Enhanced error handling with graceful shutdown
process.on('SIGINT', () => {
  log('info', 'Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('info', 'Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  log('error', 'Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log('error', 'Unhandled rejection', { reason });
  process.exit(1);
});

main().catch((error) => {
  log('error', 'Server startup failed', { error: error instanceof Error ? error.message : error });
  process.exit(1);
});