#!/usr/bin/env python3
"""
DNA Analysis MCP Server

A Model Context Protocol server for analyzing DNA data with privacy protection.
Provides tools to list subjects, get subject information, and query SNP data by RSID.
"""

from mcp.server.fastmcp import FastMCP
from typing import List, Dict, Any, Union, Optional
import os
import pathlib
import re

# Create an MCP server
mcp = FastMCP("DNA Analysis")

# Base directory for DNA profiles
SAMPLES_DIR = pathlib.Path.home() / "dna-profiles"


def validate_rsid(rsid: str) -> bool:
    """
    Validate RSID format: must start with 'rs' followed by digits.
    
    Args:
        rsid: The RSID string to validate
        
    Returns:
        True if valid, False if invalid
    """
    pattern = r'^rs\d+$'
    return bool(re.match(pattern, rsid.strip()))


@mcp.tool()
def list_subjects(pattern: Optional[str] = None) -> List[str]:
    """
    List all available DNA test subjects. DNA samples are organized by subjects,
    where each subject represents an individual with genetic test data available for analysis.
    
    Args:
        pattern: Optional regex pattern to filter subject names. If provided, only subjects
                whose names match the pattern will be returned.
    
    Returns:
        List of subject names, optionally filtered by the regex pattern
    
    Example:
        # List all subjects
        subjects = list_subjects()
        # Returns: ["subject1", "john", "alice", ...]
        
        # Filter subjects with regex
        subjects = list_subjects("^a")  # Names starting with 'a'
        # Returns: ["alice"]
        
        subjects = list_subjects("john")  # Names containing 'john'  
        # Returns: ["john"]
    """
    try:
        if not SAMPLES_DIR.exists():
            return []
        
        subjects = []
        for item in SAMPLES_DIR.iterdir():
            if item.is_dir():
                subjects.append(item.name)
        
        # Apply regex filter if pattern is provided
        if pattern:
            try:
                regex = re.compile(pattern)
                subjects = [subject for subject in subjects if regex.search(subject)]
            except re.error as e:
                return [f"Error: Invalid regex pattern '{pattern}': {str(e)}"]
        
        return sorted(subjects)
    except Exception as e:
        return [f"Error: {str(e)}"]


@mcp.tool()
def get_test_info(subject_name: str) -> Dict[str, Any]:
    """
    Get metadata about a specific DNA test (not the subject personally, but the test itself).
    This returns information about how the DNA data was collected, processed, and formatted.
    
    The metadata contains:
    - DNA testing company (e.g., AncestryDNA)
    - Test date and time
    - Array version used for data collection
    - Data format version
    - Legal disclaimers and usage terms
    - Technical details about the genetic data format
    
    Args:
        subject_name: The name of the subject
    
    Returns:
        Dictionary with 'subject' and 'info' keys, where 'info' contains
        the raw content with test metadata
    
    Example:
        info = get_test_info("subject1")
        # Returns: {
        #   "subject": "subject1",
        #   "info": "#AncestryDNA raw data download\n#This file was generated..."
        # }
    """
    try:
        subject_dir = SAMPLES_DIR / subject_name
        info_file = subject_dir / "test_info.txt"
        
        if not subject_dir.exists():
            return {"error": f"Subject '{subject_name}' not found"}
        
        if not info_file.exists():
            return {
                "subject": subject_name,
                "info": None,
                "message": f"No test_info.txt file found for subject '{subject_name}'. You can create this optional file to add information about the DNA test itself (company, date, array version, etc.)."
            }
        
        with open(info_file, 'r', encoding='utf-8') as f:
            content = f.read().strip()
        
        return {
            "subject": subject_name,
            "info": content
        }
    except Exception as e:
        return {"error": f"Error reading test info: {str(e)}"}


@mcp.tool()
def get_subject_info(subject_name: str) -> Dict[str, Any]:
    """
    Get information about a specific subject (person). This returns personal information
    about the individual whose DNA was tested, such as demographics, background, or
    other metadata about the person themselves.
    
    Args:
        subject_name: The name of the subject
    
    Returns:
        Dictionary with 'subject' and 'info' keys, where 'info' contains
        the raw content with subject metadata
    
    Example:
        info = get_subject_info("subject1")
        # Returns: {
        #   "subject": "subject1",
        #   "info": "Name: John Doe\nAge: 45\nEthnicity: European..."
        # }
    """
    try:
        subject_dir = SAMPLES_DIR / subject_name
        info_file = subject_dir / "subject_info.txt"
        
        if not subject_dir.exists():
            return {"error": f"Subject '{subject_name}' not found"}
        
        if not info_file.exists():
            return {
                "subject": subject_name,
                "info": None,
                "message": f"No subject_info.txt file found for subject '{subject_name}'. You can create this optional file to add personal information about the individual (demographics, background, etc.)."
            }
        
        with open(info_file, 'r', encoding='utf-8') as f:
            content = f.read().strip()
        
        return {
            "subject": subject_name,
            "info": content
        }
    except Exception as e:
        return {"error": f"Error reading subject info: {str(e)}"}


@mcp.tool()
def query_snp_data(subject_name: str, rsids: Union[str, List[str]]) -> Dict[str, Any]:
    """
    Query SNP (Single Nucleotide Polymorphism) data for specific RSIDs from a subject's genetic data.
    
    Args:
        subject_name: The name of the subject
        rsids: A single RSID string or list of RSIDs (1-10 RSIDs maximum)
               Example: "rs3131972" or ["rs3131972", "rs1815739"]
    
    Returns:
        Dictionary containing:
        - 'subject': subject name
        - 'header': column headers (rsid, chromosome, position, allele1, allele2)
        - 'matching_rows': list of comma-delimited rows for found RSIDs
        - 'queried_rsids': list of RSIDs that were searched for
        - 'found_count': number of RSIDs found
        - 'found_rsids': list of RSIDs that were successfully found
        - 'not_found_rsids': list of RSIDs that were not found in the genetic data
        
    Note: Check 'not_found_rsids' to see which RSIDs had no matches in the genetic data.
    Each matching row contains: RSID, chromosome, base pair position, and two alleles (genotype).
        
    Privacy Protection:
        - Only returns rows matching the specified RSIDs
        - Maximum 10 RSIDs per query
        - Includes file header for context
    
    Example:
        # Query single RSID
        data = query_snp_data("subject1", "rs3131972")
        # Returns: {
        #   "subject": "subject1",
        #   "header": "rsid,chromosome,position,allele1,allele2",
        #   "matching_rows": ["rs3131972,1,230710048,A,G"],
        #   "queried_rsids": ["rs3131972"],
        #   "found_count": 1,
        #   "found_rsids": ["rs3131972"],
        #   "not_found_rsids": []
        # }
        
        # Query multiple RSIDs (some may not be found)
        data = query_snp_data("subject1", ["rs3131972", "rs999999999"])
        # Returns found_rsids: ["rs3131972"], not_found_rsids: ["rs999999999"]
    """
    try:
        # Convert single RSID to list
        if isinstance(rsids, str):
            rsids = [rsids]
        
        # Validate RSID count (privacy protection)
        if len(rsids) > 10:
            return {"error": "Maximum 10 RSIDs allowed per query for privacy protection"}
        
        if len(rsids) == 0:
            return {"error": "At least 1 RSID must be provided"}
        
        # Validate RSID formats
        invalid_rsids = [rsid for rsid in rsids if not validate_rsid(rsid)]
        if invalid_rsids:
            return {
                "error": f"Invalid RSID format(s): {invalid_rsids}. RSIDs must match pattern: rs followed by digits (e.g., rs123456)"
            }
        
        # Validate subject exists
        subject_dir = SAMPLES_DIR / subject_name
        snp_file = subject_dir / "snp.txt"
        
        if not subject_dir.exists():
            return {"error": f"Subject '{subject_name}' not found"}
        
        if not snp_file.exists():
            return {"error": f"No snp.txt file found for subject '{subject_name}'"}
        
        # Read and process the SNP file
        header = None
        matching_rows = []
        found_rsids = set()  # Track which RSIDs we actually found
        
        with open(snp_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                
                # First non-empty line is the header
                if header is None:
                    # Convert header from tab-delimited to comma-delimited
                    header = line.replace('\t', ',')
                    continue
                
                # Split the line and check if first column matches any RSID
                columns = line.split('\t')
                if len(columns) > 0 and columns[0] in rsids:
                    # Convert row from tab-delimited to comma-delimited
                    comma_delimited_row = ','.join(columns)
                    matching_rows.append(comma_delimited_row)
                    found_rsids.add(columns[0])
        
        # Determine which RSIDs were not found
        not_found_rsids = [rsid for rsid in rsids if rsid not in found_rsids]
        
        return {
            "subject": subject_name,
            "header": header,
            "matching_rows": matching_rows,
            "queried_rsids": rsids,
            "found_count": len(matching_rows),
            "found_rsids": list(found_rsids),
            "not_found_rsids": not_found_rsids
        }
        
    except Exception as e:
        return {"error": f"Error querying SNP data: {str(e)}"}


def main():
    """Main entry point for the MCP server."""
    mcp.run()


if __name__ == "__main__":
    main()