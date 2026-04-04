from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()
        
        # Auto-seed on first run
        from seed import seed_database_if_empty
        seed_database_if_empty()
