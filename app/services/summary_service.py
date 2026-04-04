from datetime import datetime
from sqlalchemy import func, extract
from app.models import Transaction
from app.database import db

def get_summary(filters=None):
    query = Transaction.query
    
    if filters and filters.get('month'):
        try:
            year, month = map(int, filters['month'].split('-'))
            query = query.filter(
                extract('year', Transaction.date) == year,
                extract('month', Transaction.date) == month
            )
        except (ValueError, AttributeError):
            pass
    
    income = query.filter(Transaction.type == 'income').with_entities(
        func.sum(Transaction.amount)
    ).scalar() or 0
    
    expenses = query.filter(Transaction.type == 'expense').with_entities(
        func.sum(Transaction.amount)
    ).scalar() or 0
    
    return {
        'total_income': float(income),
        'total_expenses': float(expenses),
        'net_balance': float(income - expenses)
    }

def get_summary_by_category(filters=None):
    query = Transaction.query.filter(Transaction.type == 'expense')
    
    if filters and filters.get('month'):
        try:
            year, month = map(int, filters['month'].split('-'))
            query = query.filter(
                extract('year', Transaction.date) == year,
                extract('month', Transaction.date) == month
            )
        except (ValueError, AttributeError):
            pass
    
    if filters and filters.get('start_date'):
        try:
            start = datetime.fromisoformat(filters['start_date']).date()
            query = query.filter(Transaction.date >= start)
        except ValueError:
            pass
    
    if filters and filters.get('end_date'):
        try:
            end = datetime.fromisoformat(filters['end_date']).date()
            query = query.filter(Transaction.date <= end)
        except ValueError:
            pass
    
    results = query.with_entities(
        Transaction.category,
        func.sum(Transaction.amount).label('total')
    ).group_by(Transaction.category).all()
    
    return [{'category': r.category, 'total': float(r.total)} for r in results]

def get_summary_by_month():
    results = Transaction.query.with_entities(
        extract('year', Transaction.date).label('year'),
        extract('month', Transaction.date).label('month'),
        Transaction.type,
        func.sum(Transaction.amount).label('total')
    ).group_by('year', 'month', Transaction.type).order_by('year', 'month').all()
    
    monthly_data = {}
    for r in results:
        key = f"{int(r.year)}-{int(r.month):02d}"
        if key not in monthly_data:
            monthly_data[key] = {'month': key, 'income': 0, 'expenses': 0}
        
        if r.type == 'income':
            monthly_data[key]['income'] = float(r.total)
        else:
            monthly_data[key]['expenses'] = float(r.total)
    
    return list(monthly_data.values())

def get_recent_transactions(limit=10):
    transactions = Transaction.query.order_by(
        Transaction.date.desc(),
        Transaction.created_at.desc()
    ).limit(limit).all()
    
    return [t.to_dict() for t in transactions]
