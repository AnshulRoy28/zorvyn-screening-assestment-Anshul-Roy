from flask import Blueprint, request, jsonify
from app.middleware.auth import require_auth, require_role
from app.services.summary_service import (
    get_summary, get_summary_by_category, get_summary_by_month, get_recent_transactions
)
from app.services.recurring_service import detect_recurring_expenses, get_recurring_calendar

summary_bp = Blueprint('summary', __name__, url_prefix='/summary')

@summary_bp.route('', methods=['GET'])
@require_auth
def get_summary_route():
    filters = {'month': request.args.get('month')}
    data = get_summary(request.user_id, filters)
    return jsonify({'success': True, 'data': data}), 200

@summary_bp.route('/by-category', methods=['GET'])
@require_role('analyst', 'admin')
def get_by_category():
    filters = {
        'month': request.args.get('month'),
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date')
    }
    data = get_summary_by_category(request.user_id, filters)
    return jsonify({'success': True, 'data': data}), 200

@summary_bp.route('/by-month', methods=['GET'])
@require_role('analyst', 'admin')
def get_by_month():
    data = get_summary_by_month(request.user_id)
    return jsonify({'success': True, 'data': data}), 200

@summary_bp.route('/recent', methods=['GET'])
@require_auth
def get_recent():
    limit = request.args.get('limit', 10, type=int)
    data = get_recent_transactions(request.user_id, limit)
    return jsonify({'success': True, 'data': data}), 200

@summary_bp.route('/recurring', methods=['GET'])
@require_auth
def get_recurring():
    data = detect_recurring_expenses(request.user_id)
    return jsonify({'success': True, 'data': data}), 200

@summary_bp.route('/recurring/calendar', methods=['GET'])
@require_auth
def get_recurring_calendar_route():
    from datetime import date
    year = request.args.get('year', date.today().year, type=int)
    month = request.args.get('month', date.today().month, type=int)
    data = get_recurring_calendar(request.user_id, year, month)
    return jsonify({'success': True, 'data': data}), 200

@summary_bp.route('/cashflow', methods=['GET'])
@require_auth
def get_cashflow():
    """Returns income sources, expense categories, and savings for Sankey diagram."""
    from sqlalchemy import func
    from app.models import Transaction

    user_id = request.user_id

    # Income by category
    income_rows = Transaction.query.filter_by(user_id=user_id, type='income').with_entities(
        Transaction.category, func.sum(Transaction.amount).label('total')
    ).group_by(Transaction.category).all()

    # Expense by category
    expense_rows = Transaction.query.filter_by(user_id=user_id, type='expense').with_entities(
        Transaction.category, func.sum(Transaction.amount).label('total')
    ).group_by(Transaction.category).all()

    total_income = sum(r.total for r in income_rows)
    total_expenses = sum(r.total for r in expense_rows)
    savings = max(total_income - total_expenses, 0)

    # Build Sankey flow data
    flows = []

    # Income sources → Total Income
    for r in income_rows:
        flows.append({'from': r.category, 'to': 'Total Income', 'value': round(float(r.total), 2)})

    # Total Income → Expense categories
    for r in expense_rows:
        flows.append({'from': 'Total Income', 'to': r.category, 'value': round(float(r.total), 2)})

    # Total Income → Savings (if positive)
    if savings > 0:
        flows.append({'from': 'Total Income', 'to': 'Savings', 'value': round(float(savings), 2)})

    return jsonify({'success': True, 'data': {
        'flows': flows,
        'total_income': round(float(total_income), 2),
        'total_expenses': round(float(total_expenses), 2),
        'savings': round(float(savings), 2)
    }}), 200
