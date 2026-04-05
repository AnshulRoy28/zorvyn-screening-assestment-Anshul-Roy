from datetime import date, timedelta
from werkzeug.security import generate_password_hash
from app.database import db
from app.models import User, Transaction, Category

def seed_database_if_empty():
    """Seed database only if it's empty"""
    # Check if users already exist
    if User.query.first() is not None:
        print("Database already seeded, skipping...")
        return
    
    print("Seeding database...")
    
    # Create default categories
    categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Income', 'Other']
    for cat_name in categories:
        if not Category.query.filter_by(name=cat_name).first():
            category = Category(name=cat_name)
            db.session.add(category)
    
    # Create demo users
    users_data = [
        {'username': 'admin', 'email': 'admin@demo.com', 'password': 'password123', 'role': 'admin'},
        {'username': 'analyst', 'email': 'analyst@demo.com', 'password': 'password123', 'role': 'analyst'},
        {'username': 'viewer', 'email': 'viewer@demo.com', 'password': 'password123', 'role': 'viewer'}
    ]
    
    created_users = []
    for user_data in users_data:
        user = User(
            username=user_data['username'],
            email=user_data['email'],
            password_hash=generate_password_hash(user_data['password']),
            role=user_data['role']
        )
        db.session.add(user)
        created_users.append(user)
    
    db.session.commit()
    
    # Create sample transactions
    admin_user = created_users[0]
    
    sample_transactions = [
        # ── Recurring: Netflix Subscription $50/mo (6 months) ──
        {'days_ago': 5,   'item_name': 'Netflix Subscription', 'category': 'Entertainment', 'amount': 50.00, 'type': 'expense'},
        {'days_ago': 35,  'item_name': 'Netflix Subscription', 'category': 'Entertainment', 'amount': 50.00, 'type': 'expense'},
        {'days_ago': 65,  'item_name': 'Netflix Subscription', 'category': 'Entertainment', 'amount': 50.00, 'type': 'expense'},
        {'days_ago': 95,  'item_name': 'Netflix Subscription', 'category': 'Entertainment', 'amount': 50.00, 'type': 'expense'},
        {'days_ago': 125, 'item_name': 'Netflix Subscription', 'category': 'Entertainment', 'amount': 50.00, 'type': 'expense'},
        {'days_ago': 155, 'item_name': 'Netflix Subscription', 'category': 'Entertainment', 'amount': 50.00, 'type': 'expense'},

        # ── Recurring: Home Loan Payment $3000/mo (6 months) ──
        {'days_ago': 1,   'item_name': 'Home Loan Payment', 'category': 'Bills', 'amount': 3000.00, 'type': 'expense'},
        {'days_ago': 31,  'item_name': 'Home Loan Payment', 'category': 'Bills', 'amount': 3000.00, 'type': 'expense'},
        {'days_ago': 61,  'item_name': 'Home Loan Payment', 'category': 'Bills', 'amount': 3000.00, 'type': 'expense'},
        {'days_ago': 91,  'item_name': 'Home Loan Payment', 'category': 'Bills', 'amount': 3000.00, 'type': 'expense'},
        {'days_ago': 121, 'item_name': 'Home Loan Payment', 'category': 'Bills', 'amount': 3000.00, 'type': 'expense'},
        {'days_ago': 151, 'item_name': 'Home Loan Payment', 'category': 'Bills', 'amount': 3000.00, 'type': 'expense'},

        # ── Variable transactions (won't trigger recurring detection) ──
        {'days_ago': 1,  'item_name': 'Grocery Shopping',  'category': 'Food',          'amount': 85.50,   'type': 'expense'},
        {'days_ago': 2,  'item_name': 'Uber Ride',         'category': 'Transport',     'amount': 15.00,   'type': 'expense'},
        {'days_ago': 3,  'item_name': 'Monthly Salary',    'category': 'Income',        'amount': 5000.00, 'type': 'income'},
        {'days_ago': 7,  'item_name': 'Electricity Bill',  'category': 'Bills',         'amount': 120.00,  'type': 'expense'},
        {'days_ago': 8,  'item_name': 'Restaurant Dinner', 'category': 'Food',          'amount': 65.00,   'type': 'expense'},
        {'days_ago': 10, 'item_name': 'Gas Station',       'category': 'Transport',     'amount': 45.00,   'type': 'expense'},
        {'days_ago': 12, 'item_name': 'Online Shopping',   'category': 'Shopping',      'amount': 150.00,  'type': 'expense'},
        {'days_ago': 15, 'item_name': 'Gym Membership',    'category': 'Health',        'amount': 50.00,   'type': 'expense'},
        {'days_ago': 18, 'item_name': 'Coffee Shop',       'category': 'Food',          'amount': 12.50,   'type': 'expense'},
        {'days_ago': 20, 'item_name': 'Freelance Project', 'category': 'Income',        'amount': 800.00,  'type': 'income'},
        {'days_ago': 22, 'item_name': 'Movie Tickets',     'category': 'Entertainment', 'amount': 30.00,   'type': 'expense'},
        {'days_ago': 25, 'item_name': 'Pharmacy',          'category': 'Health',        'amount': 25.00,   'type': 'expense'},
        {'days_ago': 28, 'item_name': 'Internet Bill',     'category': 'Bills',         'amount': 60.00,   'type': 'expense'},
        {'days_ago': 30, 'item_name': 'Supermarket',       'category': 'Food',          'amount': 95.00,   'type': 'expense'},
        {'days_ago': 32, 'item_name': 'Bus Pass',          'category': 'Transport',     'amount': 80.00,   'type': 'expense'},
        {'days_ago': 35, 'item_name': 'Clothing Store',    'category': 'Shopping',      'amount': 120.00,  'type': 'expense'},
        {'days_ago': 40, 'item_name': 'Consulting Fee',    'category': 'Income',        'amount': 1200.00, 'type': 'income'},
        {'days_ago': 42, 'item_name': 'Restaurant Lunch',  'category': 'Food',          'amount': 35.00,   'type': 'expense'},
        {'days_ago': 45, 'item_name': 'Water Bill',        'category': 'Bills',         'amount': 40.00,   'type': 'expense'},
    ]
    
    for trans_data in sample_transactions:
        transaction = Transaction(
            user_id=admin_user.id,
            date=date.today() - timedelta(days=trans_data['days_ago']),
            item_name=trans_data['item_name'],
            category=trans_data['category'],
            amount=trans_data['amount'],
            type=trans_data['type'],
            source='manual'
        )
        db.session.add(transaction)
    
    db.session.commit()
    
    print("✅ Database seeded successfully!")
    print("\nDemo Users:")
    print("  Admin:   admin@demo.com / password123")
    print("  Analyst: analyst@demo.com / password123")
    print("  Viewer:  viewer@demo.com / password123")
    print(f"\nCreated {len(sample_transactions)} sample transactions")

def seed_database():
    """Original seed function for manual seeding"""
    from app import create_app
    app = create_app()
    
    with app.app_context():
        print("Dropping all tables...")
        db.drop_all()
        
        print("Creating all tables...")
        db.create_all()
        
        seed_database_if_empty()

if __name__ == '__main__':
    seed_database()
