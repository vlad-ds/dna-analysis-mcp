# DNA Analysis MCP Server

A Model Context Protocol (MCP) server for analyzing DNA data with privacy protection.

## Features

- List available DNA test subjects
- Get information about specific subjects and their DNA tests
- Query SNP data by RSID with privacy protection

## Data Structure

Each subject's data is stored in `~/dna-profiles/[subject_name]/` with up to 3 types of files:

### Required Files
- **`snp.txt`** (REQUIRED) - Raw genetic data with SNP information in tab-delimited format
  
  **Format:** Tab-delimited file with the following columns:
  ```
  rsid    chromosome    position    allele1    allele2
  ```
  
  **Example content:**
  ```
  rsid	chromosome	position	allele1	allele2
  rs3131972	1	230710048	A	G
  rs1815739	11	66328095	C	T
  rs4988235	2	135851076	T	T
  ```
  
  - **rsid**: SNP identifier (e.g., rs3131972)
  - **chromosome**: Chromosome number (1-22, X, Y, MT)
  - **position**: Base pair position on the chromosome
  - **allele1**: First allele (A, T, G, C, or variants)
  - **allele2**: Second allele (A, T, G, C, or variants)
  
  This format is compatible with raw data exports from major DNA testing companies like AncestryDNA, 23andMe, etc.

### Optional Files
- **`subject_info.txt`** (OPTIONAL) - Personal information about the individual (demographics, background, etc.)
- **`test_info.txt`** (OPTIONAL) - Information about the DNA test itself (company, date, array version, etc.)

If optional files don't exist, the corresponding functions will return a helpful message indicating the file was not found and suggesting the user can create it to add context.

### Setting Up Data Directory

Create the data directory and example subject folder:

```bash
# Create the main directory
mkdir -p ~/dna-profiles

# Create an example subject folder
mkdir -p ~/dna-profiles/example_subject

# Create the required SNP data file (replace with your actual data)
touch ~/dna-profiles/example_subject/snp.txt

# Create optional files
touch ~/dna-profiles/example_subject/subject_info.txt
touch ~/dna-profiles/example_subject/test_info.txt
```

## Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -e .
```

3. Run the server:
```bash
python server.py
```

## Privacy Notice

This server is designed with privacy protection in mind:
- Only authorized RSIDs can be queried
- No bulk data export is allowed
- DNA profile data is stored in ~/dna-profiles/ and excluded from version control