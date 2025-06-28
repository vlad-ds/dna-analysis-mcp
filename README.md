# DNA Analysis Desktop Extension (DXT)

A Model Context Protocol (MCP) server for analyzing DNA data with privacy protection, packaged as a Desktop Extension (DXT) for easy installation across DXT-compatible applications.

## 🧬 Features

- **List DNA Subjects**: Browse available DNA test subjects in your collection
- **Subject Information**: Get personal information about individuals 
- **Test Metadata**: Access DNA test details (company, date, array version, etc.)
- **SNP Queries**: Query specific genetic variants by RSID (max 10 per query for privacy)
- **Privacy-First**: All data processing happens locally on your machine
- **Cross-Platform**: Works on macOS, Windows, and Linux

## 📦 Installation

### Quick Install (Recommended)

1. **Download the latest .dxt file** from [GitHub Releases](https://github.com/vlad-ds/dna-analysis-mcp/releases)
2. **Simply double-click on `dna-analysis-mcp.dxt`** to install automatically in Claude Desktop

### Alternative Installation

If the double-click method doesn't work:

1. **Download the .dxt file**
   - Get `dna-analysis-mcp.dxt` from the [GitHub releases](https://github.com/vlad-ds/dna-analysis-mcp/releases)
   - Or build from source (see Development section below)

2. **Install via Claude Desktop**
   - Open Claude Desktop
   - Go to Settings → Extensions
   - Drag the .dxt file on the window

### Prerequisites
- Node.js 16.0.0 or higher (automatically handled by the .dxt file)
- Claude Desktop or other DXT-compatible application

### Manual Claude Desktop Integration

If not using DXT, you can manually add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dna-analysis": {
      "command": "node",
      "args": ["/ABSOLUTE_PATH/dna-analysis-mcp/server/index.js"],
      "env": {
        "DNA_PROFILES_DIRECTORY": "~/dna-profiles"
      }
    }
  }
}
```

## 📁 Data Setup

### Creating Your DNA Profiles Directory

After installation, you need to create the DNA profiles directory and add your data:

```bash
# Create the main directory
mkdir -p ~/dna-profiles

# Create your first subject folder (replace 'john_doe' with desired name)
mkdir -p ~/dna-profiles/john_doe
```

### Directory Structure

DNA profiles are organized in the configured directory (default: `~/dna-profiles/`):

```
~/dna-profiles/
├── john_doe/
│   ├── snp.txt           # Required: Raw genetic data
│   ├── subject_info.txt  # Optional: Personal information
│   └── test_info.txt     # Optional: Test metadata
├── jane_smith/
│   ├── snp.txt
│   └── test_info.txt
└── ...
```

### AI-Assisted Setup from DNA Export Files

If you have a DNA export file from 23andMe, AncestryDNA, or other services, you can use an AI agent to automatically convert it to the correct format. Copy this prompt and share your DNA export file with an AI agent:

```
I have a DNA export file that I need to convert for use with the DNA Analysis MCP Server. Please help me:

1. Analyze my DNA export file and convert it to the required format:
   - Create a tab-delimited file called `snp.txt` with this exact header: `rsid	chromosome	position	allele1	allele2`
   - Extract all SNP data rows that have valid RSIDs (format: rs followed by numbers)
   - Ensure proper tab separation between columns

2. Extract any available metadata and create these optional files:
   - `subject_info.txt` - Any personal information (name, age, gender, ethnicity, etc.)
   - `test_info.txt` - Test details (company name, test date, array version, quality scores, etc.)

3. Set up the directory structure:
   - Create `~/dna-profiles/[subject_name]/` directory (use appropriate subject name)
   - Place all three files in that directory
   - Create the main `~/dna-profiles/` directory if it doesn't exist

Please process my DNA export file and create the properly formatted files in the correct directory structure.
```

### Manual Example Setup

Alternatively, here's how to set up your first subject with example data manually:

```bash
# Create example subject folder
mkdir -p ~/dna-profiles/john_doe

# Create the required SNP data file
cat > ~/dna-profiles/john_doe/snp.txt << 'EOF'
rsid	chromosome	position	allele1	allele2
rs3131972	1	230710048	A	G
rs1815739	11	66328095	C	T
rs4988235	2	135851076	T	T
EOF

# Create optional subject info file
cat > ~/dna-profiles/john_doe/subject_info.txt << 'EOF'
Name: John Doe
Age: 35
Gender: Male
Ethnicity: European
Notes: Personal genetic analysis
EOF

# Create optional test info file
cat > ~/dna-profiles/john_doe/test_info.txt << 'EOF'
Company: 23andMe
Test Date: 2024-01-15
Array Version: v5
Quality Score: 99.2%
Total SNPs: 650000
EOF
```

### Required Files

**`snp.txt`** - Tab-delimited genetic data compatible with major DNA testing companies:

```
rsid	chromosome	position	allele1	allele2
rs3131972	1	230710048	A	G
rs1815739	11	66328095	C	T
rs4988235	2	135851076	T	T
```

### Optional Files

- **`subject_info.txt`** - Demographics, background, notes about the individual
- **`test_info.txt`** - Test company, date, array version, quality metrics

## 🛠️ Available Tools

### `list_subjects`
Lists all available DNA subjects with optional regex filtering.

**Parameters:**
- `pattern` (optional): Regex pattern to filter subject names

### `get_subject_info`
Retrieves personal information about a specific subject.

**Parameters:**
- `subject_name` (required): Name of the subject

### `get_test_info`
Gets metadata about the DNA test for a specific subject.

**Parameters:**
- `subject_name` (required): Name of the subject

### `query_snp_data`
Queries SNP data for specific RSIDs (maximum 10 per query).

**Parameters:**
- `subject_name` (required): Name of the subject
- `rsids` (required): Single RSID string or array of RSIDs

## 🔒 Privacy & Security

### Local-Only Processing
- ✅ All DNA data remains on your computer
- ✅ No data transmission to external servers
- ✅ AI sees only requested SNP data, not entire genome
- ✅ No bulk data export capabilities

### Built-in Protections
- **Query Limits**: Maximum 10 RSIDs per query
- **File Size Limits**: 100MB maximum file size protection
- **Timeout Protection**: 30-second operation timeouts
- **Input Validation**: Strict RSID format validation

## 🚀 Development

### Building the .dxt file from Source

If you want to build your own .dxt file:

```bash
# Clone the repository
git clone https://github.com/vlad-ds/dna-analysis-mcp.git
cd dna-analysis-mcp

# Install dependencies
npm install

# Build the TypeScript source
npm run build

# Create the .dxt file
npx @anthropic-ai/dxt pack
```

This will create `dna-analysis-mcp.dxt` in the project root, ready for installation.

### Development Commands
```bash
# Development build and run
npm run dev

# Clean build artifacts
npm run clean

# Test the server manually
node server/index.js
```

### Testing
```bash
# Basic functionality test
npm test

# Manual testing with sample data
node server/index.js
```

## 👤 Author

**Vlad Gheorghe**
- LinkedIn: [vlad-ds](https://www.linkedin.com/in/vlad-ds/)
- GitHub: [vlad-ds](https://github.com/vlad-ds)

## 🆘 Support

- Report issues on [GitHub Issues](https://github.com/vlad-ds/dna-analysis-mcp/issues)

---

**⚠️ Important Privacy Notice**: This extension is designed for personal use with your own genetic data. Always ensure you have proper consent and legal authority to analyze any DNA data you process.