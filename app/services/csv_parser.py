"""ICICI Bank E-Statement CSV Parser
Extracts transactions from bank statement CSV files.
"""
import csv
import re
from io import StringIO


def parse_csv_line(line: str) -> list:
    """Parse a single CSV line, handling quoted fields with commas."""
    reader = csv.reader(StringIO(line))
    for row in reader:
        return [cell.strip() for cell in row]
    return []


def parse_transactions_from_statement(content: str) -> list:
    """
    Parse transactions from ICICI bank statement CSV content.
    Returns list of dicts with: date, description, amount, type
    """
    lines = [line.strip('\r') for line in content.split('\n')]
    
    transactions = []
    txn_start = None
    
    for i, line in enumerate(lines):
        # Find transaction header row
        if line.strip().startswith('DATE,MODE,PARTICULARS'):
            txn_start = i + 1
            continue
        
        # Parse transaction rows
        if txn_start is not None and i >= txn_start:
            row = parse_csv_line(line)
            if not row or not row[0]:
                break  # End of transactions
            
            # Validate it looks like a date
            if not re.match(r'\d{2}-\d{2}-\d{4}', row[0]):
                break
            
            date = row[0]
            particulars = row[2] if len(row) > 2 else ''
            deposits = _to_float(row[3] if len(row) > 3 else '')
            withdrawals = _to_float(row[4] if len(row) > 4 else '')
            
            # Skip B/F (brought forward) and C/F (carried forward) entries
            if particulars.upper() in ['B/F', 'C/F', '']:
                continue
            
            # Determine amount and type
            if deposits > 0:
                amount = deposits
                trans_type = 'income'
            elif withdrawals > 0:
                amount = withdrawals
                trans_type = 'expense'
            else:
                continue  # Skip zero amount transactions
            
            transactions.append({
                'date': date,
                'description': particulars[:200],  # Limit length
                'amount': amount,
                'type': trans_type
            })
    
    return transactions


def _to_float(val: str) -> float:
    """Convert a string to float, handling commas and empty strings."""
    if not val:
        return 0.0
    try:
        return float(val.replace(',', ''))
    except ValueError:
        return 0.0
