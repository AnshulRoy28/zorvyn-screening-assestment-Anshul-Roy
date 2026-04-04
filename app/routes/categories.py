from flask import Blueprint, request, jsonify
from app.models import Category
from app.database import db
from app.middleware.auth import require_auth, require_role

categories_bp = Blueprint('categories', __name__, url_prefix='/categories')

@categories_bp.route('', methods=['GET'])
@require_auth
def get_categories():
    categories = Category.query.all()
    return jsonify({
        'success': True,
        'data': [c.to_dict() for c in categories]
    }), 200

@categories_bp.route('', methods=['POST'])
@require_role('admin')
def create_category():
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({'success': False, 'error': 'Category name is required'}), 400
    
    if Category.query.filter_by(name=data['name']).first():
        return jsonify({'success': False, 'error': 'Category already exists'}), 400
    
    category = Category(name=data['name'])
    db.session.add(category)
    db.session.commit()
    
    return jsonify({'success': True, 'data': category.to_dict()}), 201

@categories_bp.route('/<string:name>', methods=['DELETE'])
@require_role('admin')
def delete_category(name):
    category = Category.query.filter_by(name=name).first()
    if not category:
        return jsonify({'success': False, 'error': 'Category not found'}), 404
    
    db.session.delete(category)
    db.session.commit()
    
    return jsonify({'success': True, 'data': {'message': 'Category deleted'}}), 200
