from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
from app.models import User
from app.database import db
from app.config import Config
from app.middleware.auth import require_auth

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'success': False, 'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'success': False, 'error': 'Email already exists'}), 400
    
    role = data.get('role', 'viewer')
    if role not in ['viewer', 'analyst', 'admin']:
        return jsonify({'success': False, 'error': 'Invalid role'}), 400
    
    user = User(
        username=data['username'],
        email=data['email'],
        password_hash=generate_password_hash(data['password']),
        role=role
    )
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'success': True, 'data': user.to_dict()}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'success': False, 'error': 'Missing email or password'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
    
    expiration = datetime.utcnow() + timedelta(hours=Config.JWT_EXPIRATION_HOURS)
    token = jwt.encode(
        {'user_id': user.id, 'role': user.role, 'exp': expiration},
        Config.SECRET_KEY,
        algorithm=Config.JWT_ALGORITHM
    )
    
    return jsonify({
        'success': True,
        'data': {
            'token': token,
            'user': user.to_dict()
        }
    }), 200

@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_current_user():
    user = User.query.get(request.user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    return jsonify({'success': True, 'data': user.to_dict()}), 200
