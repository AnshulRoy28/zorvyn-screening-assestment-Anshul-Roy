from flask import Blueprint, request, jsonify
from app.models import User
from app.database import db
from app.middleware.auth import require_role

users_bp = Blueprint('users', __name__, url_prefix='/users')

@users_bp.route('', methods=['GET'])
@require_role('admin')
def get_users():
    users = User.query.all()
    return jsonify({
        'success': True,
        'data': [u.to_dict() for u in users]
    }), 200

@users_bp.route('/<int:id>/role', methods=['PUT'])
@require_role('admin')
def update_user_role(id):
    data = request.get_json()
    
    if not data or not data.get('role'):
        return jsonify({'success': False, 'error': 'Role is required'}), 400
    
    if data['role'] not in ['viewer', 'analyst', 'admin']:
        return jsonify({'success': False, 'error': 'Invalid role'}), 400
    
    user = User.query.get(id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    user.role = data['role']
    db.session.commit()
    
    return jsonify({'success': True, 'data': user.to_dict()}), 200

@users_bp.route('/<int:id>', methods=['DELETE'])
@require_role('admin')
def delete_user(id):
    user = User.query.get(id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'success': True, 'data': {'message': 'User deleted'}}), 200
