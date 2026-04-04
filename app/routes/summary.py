from flask import Blueprint, request, jsonify
from app.middleware.auth import require_auth, require_role
from app.services.summary_service import (
    get_summary, get_summary_by_category, get_summary_by_month, get_recent_transactions
)

summary_bp = Blueprint('summary', __name__, url_prefix='/summary')

@summary_bp.route('', methods=['GET'])
@require_auth
def get_summary_route():
    filters = {'month': request.args.get('month')}
    data = get_summary(filters)
    return jsonify({'success': True, 'data': data}), 200

@summary_bp.route('/by-category', methods=['GET'])
@require_role('analyst', 'admin')
def get_by_category():
    filters = {
        'month': request.args.get('month'),
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date')
    }
    data = get_summary_by_category(filters)
    return jsonify({'success': True, 'data': data}), 200

@summary_bp.route('/by-month', methods=['GET'])
@require_role('analyst', 'admin')
def get_by_month():
    data = get_summary_by_month()
    return jsonify({'success': True, 'data': data}), 200

@summary_bp.route('/recent', methods=['GET'])
@require_auth
def get_recent():
    limit = request.args.get('limit', 10, type=int)
    data = get_recent_transactions(limit)
    return jsonify({'success': True, 'data': data}), 200
