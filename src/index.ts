#!/usr/bin/env node

/**
 * DNA Analysis MCP Server (Node.js)
 *
 * A Model Context Protocol server for analyzing DNA data with privacy protection.
 * Provides tools to list subjects, get subject information, and query SNP data by RSID.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

// Base directory for DNA profiles
const SAMPLES_DIR = join(homedir(), "dna-profiles");

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

// Create the MCP server
const server = new Server({
  name: "dna-analysis-mcp",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
  },
});

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
                    text: JSON.stringify([`Error: Invalid regex pattern '${pattern}': ${e}`]),
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
                text: JSON.stringify([`Error: ${e}`]),
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
                  text: JSON.stringify({ error: `Subject '${subject_name}' not found` }),
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

          const content = await readFile(infoFile, 'utf-8');

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
                text: JSON.stringify({ error: `Error reading test info: ${e}` }),
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
                  text: JSON.stringify({ error: `Subject '${subject_name}' not found` }),
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

          const content = await readFile(infoFile, 'utf-8');

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
                text: JSON.stringify({ error: `Error reading subject info: ${e}` }),
              },
            ],
          };
        }
      }

      case "query_snp_data": {
        const { subject_name, rsids: rsidsInput } = QuerySnpDataSchema.parse(args);
        
        try {
          // Convert single RSID to array
          const rsids = Array.isArray(rsidsInput) ? rsidsInput : [rsidsInput];

          // Validate RSID count (privacy protection)
          if (rsids.length > 10) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ error: "Maximum 10 RSIDs allowed per query for privacy protection" }),
                },
              ],
            };
          }

          if (rsids.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ error: "At least 1 RSID must be provided" }),
                },
              ],
            };
          }

          // Validate RSID formats
          const invalidRsids = rsids.filter(rsid => !validateRsid(rsid));
          if (invalidRsids.length > 0) {
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
                  text: JSON.stringify({ error: `Subject '${subject_name}' not found` }),
                },
              ],
            };
          }

          if (!(await fileExists(snpFile))) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ error: `No snp.txt file found for subject '${subject_name}'` }),
                },
              ],
            };
          }

          // Read and process the SNP file
          const fileContent = await readFile(snpFile, 'utf-8');
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
                text: JSON.stringify({ error: `Error querying SNP data: ${e}` }),
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});