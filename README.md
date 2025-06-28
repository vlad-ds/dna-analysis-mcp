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

### Easy Installation (Recommended)

**Simply double-click on `dna-analysis-mcp.dxt`** to install the extension automatically in Claude Desktop or other DXT-compatible applications.

### Manual Installation

If the double-click method doesn't work:

1. **Download the .dxt file**
   - Download `dna-analysis-mcp.dxt` from the [GitHub releases](https://github.com/vlad-ds/dna-analysis-mcp/releases)
   - Or clone this repository to get the latest version

2. **Install via Claude Desktop**
   - Open Claude Desktop
   - Go to Settings → Extensions
   - Click "Install Extension" and select the `dna-analysis-mcp.dxt` file
   - The extension will be automatically configured

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

## 📁 Data Structure

DNA profiles are organized in the configured directory (default: `~/dna-profiles/`):

```
~/dna-profiles/
├── subject1/
│   ├── snp.txt           # Required: Raw genetic data
│   ├── subject_info.txt  # Optional: Personal information
│   └── test_info.txt     # Optional: Test metadata
├── subject2/
│   ├── snp.txt
│   └── test_info.txt
└── ...
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

## 🔧 Configuration

The extension supports user configuration through the DXT manifest:

- **DNA Profiles Directory**: Customize where your DNA data is stored
- **Environment Variables**: Set `DNA_PROFILES_DIRECTORY` to override the default location

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
- **Error Handling**: Comprehensive error logging and recovery

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
npm run build:dxt
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

## 📋 System Requirements

- **Node.js**: 16.0.0 or higher
- **Operating System**: macOS, Windows, or Linux
- **Architecture**: x64 or arm64
- **Memory**: Minimum 512MB available RAM
- **Storage**: Varies based on DNA file sizes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

ISC License - see LICENSE file for details.

## 👤 Author

**Vlad Gheorghe**
- LinkedIn: [vlad-ds](https://www.linkedin.com/in/vlad-ds/)
- GitHub: [vlad-ds](https://github.com/vlad-ds)

## 🆘 Support

- Report issues on [GitHub Issues](https://github.com/vlad-ds/dna-analysis-mcp/issues)
- Check the [Wiki](https://github.com/vlad-ds/dna-analysis-mcp/wiki) for additional documentation
- Review privacy guidelines in the documentation

---

**⚠️ Important Privacy Notice**: This extension is designed for personal use with your own genetic data. Always ensure you have proper consent and legal authority to analyze any DNA data you process.