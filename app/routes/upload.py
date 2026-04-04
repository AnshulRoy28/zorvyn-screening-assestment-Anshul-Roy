import base64
from flask import Blueprint, request, jsonify
from openpyxl import load_workbook
from app.middleware.auth import require_role
from app.services.gemini_service import (
    extract_from_receipt, extract_from_bank_statement, classify_excel_rows
)

upload_bp = Blueprint('upload', __name__, url_prefix='/upload')

@upload_bp.route('/receipt', methods=['POST'])
@require_role('admin')
def upload_receipt():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400
    
    try:
        image_data = base64.b64encode(file.read()).decode('utf-8')
        transactions, error = extract_from_receipt(image_data)
        
        if error:
            return jsonify({'success': False, 'error': error}), 500
        
        for t in transactions:
            t['source'] = 'receipt'
        
        return jsonify({
            'success': True,
            'data': {
                'transactions': transactions,
                'message': 'Preview extracted. Review and confirm to save.'
            }
        }), 200
    
    except Exception as e:
        return jsonify({'success': False, 'error': f'Processing error: {str(e)}'}), 500

@upload_bp.route('/bank-statement', methods=['POST'])
@require_role('admin')
def upload_bank_statement():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400
    
    try:
        image_data = base64.b64encode(file.read()).decode('utf-8')
        transactions, error = extract_from_bank_statement(image_data)
        
        if error:
            return jsonify({'success': False, 'error': error}), 500
        
        for t in transactions:
            t['source'] = 'bank_statement'
        
        return jsonify({
            'success': True,
            'data': {
                'transactions': transactions,
                'message': 'Preview extracted. Review and confirm to save.'
            }
        }), 200
    
    except Exception as e:
        return jsonify({'success': False, 'error': f'Processing error: {str(e)}'}), 500

@upload_bp.route('/excel', methods=['POST'])
@require_role('admin')
def upload_excel():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        return jsonify({'success': False, 'error': 'File must be Excel format'}), 400
    
    try:
        workbook = load_workbook(file, read_only=True)
        sheet = workbook.active
        
        rows = []
        for row in sheet.iter_rows(min_row=2, values_only=True):
            if row[0]:
                date_val = row[0] if len(row) > 0 else None
                description = row[1] if len(row) > 1 else ''
                amount = row[2] if len(row) > 2 else None
                
                if description:
                    rows.append({
                        'date': str(date_val) if date_val else None,
                        'description': str(description),
                        'amount': float(amount) if amount else None
                    })
        
        if not rows:
            return jsonify({'success': False, 'error': 'No data found in Excel file'}), 400
        
        descriptions = [r['description'] for r in rows]
        classifications, error = classify_excel_rows(descriptions)
        
        if error:
            return jsonify({'success': False, 'error': error}), 500
        
        transactions = []
        for i, row in enumerate(rows):
            if i < len(classifications):
                transactions.append({
                    'item_name': classifications[i].get('item_name', row['description']),
                    'amount': row['amount'],
                    'category': classifications[i].get('category', 'Other'),
                    'type': classifications[i].get('type', 'expense'),
                    'date': row['date'],
                    'source': 'excel'
                })
        
        return jsonify({
            'success': True,
            'data': {
                'transactions': transactions,
                'message': 'Preview extracted. Review and confirm to save.'
            }
        }), 200
    
    except Exception as e:
        return jsonify({'success': False, 'error': f'Processing error: {str(e)}'}), 500
