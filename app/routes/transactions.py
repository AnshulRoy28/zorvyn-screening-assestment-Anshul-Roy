from flask import Blueprint, request, jsonify, Response
from io import StringIO
import csv
from app.models import Transaction
from app.database import db
from app.middleware.auth import require_auth, require_role
from app.services.transaction_service import (
    create_transaction, update_transaction, delete_transaction, get_filtered_transactions
)

transactions_bp = Blueprint('transactions', __name__, url_prefix='/transactions')

@transactions_bp.route('', methods=['GET'])
@require_auth
def get_transactions():
    filters = {
        'month': request.args.get('month'),
        'category': request.args.get('category'),
        'type': request.args.get('type'),
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date')
    }
    
    transactions = get_filtered_transactions(request.user_id, filters)
    return jsonify({
        'success': True,
        'data': [t.to_dict() for t in transactions]
    }), 200

@transactions_bp.route('/<int:id>', methods=['GET'])
@require_auth
def get_transaction(id):
    transaction = Transaction.query.filter_by(id=id, user_id=request.user_id).first()
    if not transaction:
        return jsonify({'success': False, 'error': 'Transaction not found'}), 404
    
    return jsonify({'success': True, 'data': transaction.to_dict()}), 200

@transactions_bp.route('', methods=['POST'])
@require_role('admin')
def create_transaction_route():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
    
    transaction, errors = create_transaction(request.user_id, data)
    if errors:
        return jsonify({'success': False, 'error': ', '.join(errors)}), 400
    
    return jsonify({'success': True, 'data': transaction.to_dict()}), 201

@transactions_bp.route('/batch', methods=['POST'])
@require_role('admin')
def create_batch():
    data = request.get_json()
    if not data or not isinstance(data.get('transactions'), list):
        return jsonify({'success': False, 'error': 'Invalid batch data'}), 400
    
    created = []
    errors = []
    
    for item in data['transactions']:
        transaction, error = create_transaction(request.user_id, item)
        if error:
            errors.append({'item': item.get('item_name', 'unknown'), 'errors': error})
        else:
            created.append(transaction.to_dict())
    
    return jsonify({
        'success': True,
        'data': {
            'created': created,
            'errors': errors
        }
    }), 201

@transactions_bp.route('/<int:id>', methods=['PUT'])
@require_role('admin')
def update_transaction_route(id):
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
    
    transaction, errors = update_transaction(id, request.user_id, data)
    if errors:
        return jsonify({'success': False, 'error': ', '.join(errors)}), 400
    
    return jsonify({'success': True, 'data': transaction.to_dict()}), 200

@transactions_bp.route('/<int:id>', methods=['DELETE'])
@require_role('admin')
def delete_transaction_route(id):
    success, error = delete_transaction(id, request.user_id)
    if not success:
        return jsonify({'success': False, 'error': error}), 404
    
    return jsonify({'success': True, 'data': {'message': 'Transaction deleted'}}), 200

@transactions_bp.route('/manual', methods=['POST'])
@require_role('admin')
def create_manual():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
    
    data['source'] = 'manual'
    transaction, errors = create_transaction(request.user_id, data)
    if errors:
        return jsonify({'success': False, 'error': ', '.join(errors)}), 400
    
    return jsonify({'success': True, 'data': transaction.to_dict()}), 201

@transactions_bp.route('/export/csv', methods=['GET'])
@require_auth
def export_csv():
    filters = {
        'month': request.args.get('month'),
        'category': request.args.get('category'),
        'type': request.args.get('type'),
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date')
    }
    
    transactions = get_filtered_transactions(request.user_id, filters)
    
    output = StringIO()
    writer = csv.writer(output)
    
    writer.writerow(['Date', 'Item Name', 'Category', 'Amount', 'Type', 'Source', 'Notes'])
    
    for t in transactions:
        writer.writerow([
            t.date.isoformat(),
            t.item_name,
            t.category,
            t.amount,
            t.type,
            t.source,
            t.notes or ''
        ])
    
    output.seek(0)
    
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=transactions.csv'}
    )

@transactions_bp.route('/export/json', methods=['GET'])
@require_auth
def export_json():
    filters = {
        'month': request.args.get('month'),
        'category': request.args.get('category'),
        'type': request.args.get('type'),
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date')
    }
    
    transactions = get_filtered_transactions(request.user_id, filters)
    
    import json
    data = json.dumps([t.to_dict() for t in transactions], indent=2)
    
    return Response(
        data,
        mimetype='application/json',
        headers={'Content-Disposition': 'attachment; filename=transactions.json'}
    )
