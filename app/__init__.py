import os
from flask import Flask, send_from_directory, render_template
from flask_cors import CORS
from app.config import Config
from app.database import db, init_db
from app.routes.auth import auth_bp
from app.routes.transactions import transactions_bp
from app.routes.summary import summary_bp
from app.routes.upload import upload_bp
from app.routes.categories import categories_bp
from app.routes.users import users_bp

def create_app():
    # Get the parent directory (project root)
    basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    
    app = Flask(__name__,
                template_folder=os.path.join(basedir, 'templates'),
                static_folder=os.path.join(basedir, 'static'))
    app.config.from_object(Config)
    
    CORS(app)
    
    init_db(app)
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(summary_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(users_bp)
    
    @app.route('/')
    def index():
        return render_template('index.html')
    
    @app.route('/login.html')
    def login():
        return render_template('login.html')
    
    @app.route('/signup.html')
    def signup():
        return render_template('signup.html')
    
    @app.route('/upload.html')
    def upload():
        return render_template('upload.html')
    
    @app.route('/transactions.html')
    def transactions():
        return render_template('transactions.html')
    
    @app.route('/recurring.html')
    def recurring():
        return render_template('recurring.html')
    
    return app
