from datetime import datetime, date
from app.models import Transaction
from app.database import db

def validate_transaction_data(data):
    errors = []
    
    if not data.get('item_name'):
        errors.append('item_name is required')
    
    if not data.get('category'):
        errors.append('category is required')
    
    if 'amount' not in data:
        errors.append('amount is required')
    
    try:
        amount = float(data.get('amount', 0))
        if amount <= 0:
            errors.append('amount must be positive')
    except (ValueError, TypeError):
        errors.append('amount must be a valid number')
    
    if data.get('type') not in ['income', 'expense']:
        errors.append('type must be income or expense')
    
    return errors

def create_transaction(user_id, data):
    errors = validate_transaction_data(data)
    if errors:
        return None, errors
    
    transaction_date = data.get('date')
    if transaction_date:
        if isinstance(transaction_date, str):
            try:
                transaction_date = datetime.fromisoformat(transaction_date).date()
            except ValueError:
                return None, ['Invalid date format']
    else:
        transaction_date = date.today()
    
    transaction = Transaction(
        user_id=user_id,
        date=transaction_date,
        item_name=data['item_name'],
        category=data['category'],
        amount=float(data['amount']),
        type=data['type'],
        source=data.get('source', 'manual'),
        notes=data.get('notes'),
        raw_text=data.get('raw_text')
    )
    
    db.session.add(transaction)
    db.session.commit()
    
    return transaction, None

def update_transaction(transaction_id, user_id, data):
    transaction = Transaction.query.filter_by(id=transaction_id, user_id=user_id).first()
    if not transaction:
        return None, ['Transaction not found']
    
    if 'item_name' in data:
        transaction.item_name = data['item_name']
    
    if 'category' in data:
        transaction.category = data['category']
    
    if 'amount' in data:
        try:
            amount = float(data['amount'])
            if amount <= 0:
                return None, ['amount must be positive']
            transaction.amount = amount
        except (ValueError, TypeError):
            return None, ['amount must be a valid number']
    
    if 'type' in data:
        if data['type'] not in ['income', 'expense']:
            return None, ['type must be income or expense']
        transaction.type = data['type']
    
    if 'date' in data:
        if isinstance(data['date'], str):
            try:
                transaction.date = datetime.fromisoformat(data['date']).date()
            except ValueError:
                return None, ['Invalid date format']
    
    if 'notes' in data:
        transaction.notes = data['notes']
    
    db.session.commit()
    return transaction, None

def delete_transaction(transaction_id, user_id):
    transaction = Transaction.query.filter_by(id=transaction_id, user_id=user_id).first()
    if not transaction:
        return False, 'Transaction not found'
    
    db.session.delete(transaction)
    db.session.commit()
    return True, None

def get_filtered_transactions(user_id, filters):
    query = Transaction.query.filter_by(user_id=user_id)
    
    if filters.get('month'):
        try:
            year, month = map(int, filters['month'].split('-'))
            query = query.filter(
                db.extract('year', Transaction.date) == year,
                db.extract('month', Transaction.date) == month
            )
        except (ValueError, AttributeError):
            pass
    
    if filters.get('category'):
        query = query.filter(Transaction.category == filters['category'])
    
    if filters.get('type'):
        query = query.filter(Transaction.type == filters['type'])
    
    if filters.get('start_date'):
        try:
            start = datetime.fromisoformat(filters['start_date']).date()
            query = query.filter(Transaction.date >= start)
        except ValueError:
            pass
    
    if filters.get('end_date'):
        try:
            end = datetime.fromisoformat(filters['end_date']).date()
            query = query.filter(Transaction.date <= end)
        except ValueError:
            pass
    
    return query.order_by(Transaction.date.desc()).all()
