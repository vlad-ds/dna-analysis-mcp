# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **DNA Analysis MCP Server** packaged as a **Desktop Extension (DXT)**. It provides privacy-first genetic analysis tools through the Model Context Protocol, allowing users to query their local DNA data without external transmission.

## Architecture

### Core Components
- **`src/index.ts`** - Main MCP server implementation with TypeScript
- **`server/index.js`** - Compiled JavaScript output (auto-generated, do not edit directly)
- **`manifest.json`** - DXT configuration defining server entry point and metadata
- **`dna-analysis-mcp.dxt`** - Packaged extension file (ZIP archive with .dxt extension)

### Key Design Patterns
- **MCP Protocol**: Uses `@modelcontextprotocol/sdk` for tool registration and request handling
- **Privacy Protection**: 10 RSID query limits, file size restrictions (100MB), operation timeouts (30s)
- **Configurable Directory**: DNA profiles location via `DNA_PROFILES_DIRECTORY` environment variable or `~/dna-profiles` default
- **DXT Path Resolution**: Uses `${__dirname}/server/index.js` syntax in manifest for proper extension loading

### Data Structure
Expected DNA profile organization:
```
~/dna-profiles/
├── subject1/
│   ├── snp.txt           # Required: Tab-delimited genetic data (rsid, chromosome, position, allele1, allele2)
│   ├── subject_info.txt  # Optional: Personal information
│   └── test_info.txt     # Optional: Test metadata
```

## Development Commands

### Building
```bash
npm run build          # Compile TypeScript to build/ then copy to server/
npm run build:dxt       # Full DXT build: compile + package into .dxt file
npm run bundle          # Create npm package in dist/
dxt pack               # CORRECT way to repackage .dxt extension after changes
```

### Development
```bash
npm run dev             # Compile and run directly from build/
npm start               # Run compiled server from server/index.js
node server/index.js    # Manual server execution for testing
```

### Cleanup
```bash
npm run clean           # Remove build/, server/, and dist/ directories
```

## MCP Tools Implementation

The server provides 4 main tools through `server.setRequestHandler(CallToolRequestSchema)`:

1. **`list_subjects`** - Directory scanning with optional regex filtering
2. **`get_subject_info`** - Reads `subject_info.txt` files
3. **`get_test_info`** - Reads `test_info.txt` files  
4. **`query_snp_data`** - Parses `snp.txt` files, validates RSIDs, returns matching rows

### Security Features
- RSID validation with `/^rs\d+$/` pattern
- File existence checks before operations
- Size limits and timeout protection via `safeReadFile()`
- Enhanced logging with timestamps for DXT environment

## DXT Packaging

The `.dxt` file is created through:
1. TypeScript compilation (`tsc`)
2. File copying to `server/` directory
3. npm pack with specific file inclusion
4. Results in bundled extension with all dependencies

**Critical Notes**:
- The manifest must use `${__dirname}/server/index.js` for proper DXT path resolution, not relative paths like `./server/index.js`
- **Always use `dxt pack` to repackage extensions** - do NOT manually copy .tgz files or use other methods

## Release Process

When updating the .dxt file:
1. Update version in `package.json` and `manifest.json`
2. Run `npm run build:dxt`
3. Move .dxt file to project root (not in dist/ which is gitignored)
4. Commit changes and push to GitHub
5. **Check previous releases for consistency**: `gh release list` and `gh release view v1.0.0`
6. Create GitHub release with standardized format using template below

### GitHub Release Command Template
```bash
gh release create v1.0.X dna-analysis-mcp.dxt \
  --title "DNA Analysis MCP v1.0.X - Desktop Extension Release" \
  --notes "$(cat <<'EOF'
## 🧬 DNA Analysis MCP Desktop Extension v1.0.X

### Easy Installation
**Simply double-click on \`dna-analysis-mcp.dxt\` to install!**

### What's New
- ✅ [List key changes/features]
- ✅ [Bug fixes if applicable]

### Features
- **list_subjects** - Browse available DNA test subjects
- **get_subject_info** - Get personal information about individuals
- **get_test_info** - Access DNA test metadata 
- **query_snp_data** - Query specific genetic variants by RSID

### Privacy & Security
- All DNA data remains on your local machine
- No external data transmission
- Built-in query limits and file size protections
- Comprehensive input validation

### Installation
1. Download \`dna-analysis-mcp.dxt\` from this release
2. Double-click to install in Claude Desktop
3. Place your DNA files in \`~/dna-profiles/\`
4. Start analyzing!

### Requirements
- Node.js 16.0.0+ (bundled in .dxt file)
- Claude Desktop or DXT-compatible application

See the [README](https://github.com/vlad-ds/dna-analysis-mcp/blob/main/README.md) for detailed setup instructions.
EOF
)"
```

**Note**: Replace `1.0.X` with actual version and update "What's New" section with specific changes.

## Environment Configuration

- **`DNA_PROFILES_DIRECTORY`** - Override default DNA profiles location
- Supports `~` expansion for home directory paths
- Falls back to `join(homedir(), "dna-profiles")` if not set