# Personal Finance Tracker

A Python-based finance tracking system with AI-powered transaction extraction using Google Gemini API. Built with Flask backend and vanilla JavaScript frontend.

## Features

- **Role-Based Access Control**: Three user roles (Viewer, Analyst, Admin) with different permissions
- **AI-Powered Ingestion**: Extract transactions from receipts, bank statements, and Excel files using Gemini Vision API
- **Transaction Management**: Full CRUD operations with filtering and search
- **Analytics Dashboard**: Visual summaries with charts showing spending by category and monthly trends
- **Multiple Upload Methods**: Receipt images, bank statement screenshots, Excel files, and manual entry
- **Confirmation Workflow**: Preview and edit AI-extracted transactions before saving

## Tech Stack

- **Backend**: Python 3.8+, Flask, SQLAlchemy
- **Database**: SQLite
- **AI**: Google Gemini API (Vision + Text)
- **Frontend**: Vanilla HTML/CSS/JavaScript, Chart.js
- **Auth**: JWT tokens (PyJWT)
- **Excel Parsing**: openpyxl

## Project Structure

```
finance-tracker/
├── app/
│   ├── __init__.py           # Flask app factory
│   ├── config.py             # Configuration
│   ├── models.py             # SQLAlchemy models
│   ├── database.py           # Database initialization
│   ├── routes/               # API endpoints
│   │   ├── auth.py           # Authentication
│   │   ├── transactions.py   # Transaction CRUD
│   │   ├── summary.py        # Analytics
│   │   ├── upload.py         # File uploads
│   │   ├── categories.py     # Category management
│   │   └── users.py          # User management
│   ├── services/             # Business logic
│   │   ├── transaction_service.py
│   │   ├── summary_service.py
│   │   └── gemini_service.py
│   └── middleware/
│       └── auth.py           # JWT authentication
├── static/                   # Frontend assets
│   ├── css/style.css
│   └── js/
│       ├── dashboard.js
│       ├── upload.js
│       └── transactions.js
├── templates/                # HTML pages
│   ├── index.html
│   ├── login.html
│   ├── upload.html
│   └── transactions.html
├── run.py                    # Application entry point
├── seed.py                   # Database seeding
├── requirements.txt
└── README.md
```

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
SECRET_KEY=your_jwt_secret_key_here
DATABASE_URL=sqlite:///finance.db
```

To get a Gemini API key:
1. Visit https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy it to your `.env` file

### 3. Seed the Database

```bash
python seed.py
```

This creates:
- Three demo users with different roles
- Default categories (Food, Transport, Shopping, Bills, Entertainment, Health, Income, Other)
- 20 sample transactions

### 4. Run the Application

```bash
python run.py
```

The API will be available at `http://localhost:5000`

### 5. Access the Frontend

Open `templates/login.html` in your browser or serve the static files using a simple HTTP server:

```bash
python -m http.server 8000
```

Then navigate to `http://localhost:8000/templates/login.html`

## Demo Users

| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| admin@demo.com | password123 | Admin | Full access - create, update, delete transactions and upload files |
| analyst@demo.com | password123 | Analyst | View all data, access detailed analytics and filters |
| viewer@demo.com | password123 | Viewer | View basic summaries and recent transactions only |

## API Endpoints

### Authentication

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/register` | Public | Register new user |
| POST | `/auth/login` | Public | Login and get JWT token |
| GET | `/auth/me` | All roles | Get current user info |

**Example - Login:**
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@demo.com", "password": "password123"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@demo.com",
      "role": "admin"
    }
  }
}
```

### Transactions

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/transactions` | All roles | List all transactions with optional filters |
| GET | `/transactions/:id` | All roles | Get single transaction |
| POST | `/transactions` | Admin | Create transaction |
| POST | `/transactions/batch` | Admin | Save batch of transactions |
| POST | `/transactions/manual` | Admin | Create manual transaction |
| PUT | `/transactions/:id` | Admin | Update transaction |
| DELETE | `/transactions/:id` | Admin | Delete transaction |

**Example - Get Filtered Transactions:**
```bash
curl -X GET "http://localhost:5000/transactions?category=Food&type=expense&month=2024-03" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example - Create Transaction:**
```bash
curl -X POST http://localhost:5000/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "item_name": "Grocery Shopping",
    "amount": 85.50,
    "category": "Food",
    "type": "expense",
    "date": "2024-03-15"
  }'
```

### Upload (AI Ingestion)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/upload/receipt` | Admin | Extract from receipt image |
| POST | `/upload/bank-statement` | Admin | Extract from bank statement |
| POST | `/upload/excel` | Admin | Parse and classify Excel file |

**Example - Upload Receipt:**
```bash
curl -X POST http://localhost:5000/upload/receipt \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@receipt.jpg"
```

Response:
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "item_name": "Grocery items",
        "amount": 45.99,
        "category": "Food",
        "type": "expense",
        "date": "2024-03-15",
        "source": "receipt"
      }
    ],
    "message": "Preview extracted. Review and confirm to save."
  }
}
```

### Summary & Analytics

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/summary` | All roles | Total income, expenses, net balance |
| GET | `/summary/by-category` | Analyst + Admin | Spending breakdown by category |
| GET | `/summary/by-month` | Analyst + Admin | Monthly income vs expenses |
| GET | `/summary/recent` | All roles | Last 10 transactions |

**Example - Get Summary:**
```bash
curl -X GET http://localhost:5000/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "total_income": 7000.00,
    "total_expenses": 1048.49,
    "net_balance": 5951.51
  }
}
```

### Categories

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/categories` | All roles | List all categories |
| POST | `/categories` | Admin | Add custom category |
| DELETE | `/categories/:name` | Admin | Remove category |

### Users

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/users` | Admin | List all users |
| PUT | `/users/:id/role` | Admin | Change user role |
| DELETE | `/users/:id` | Admin | Delete user |

## How Gemini Integration Works

### 1. Receipt & Bank Statement Extraction

When you upload an image:
1. Image is base64 encoded and sent to Gemini Vision API
2. Gemini extracts transaction details (item name, amount, category, type, date)
3. Results are returned as a preview - nothing is saved yet
4. User can review and edit the extracted data
5. User clicks "Confirm" to save via `/transactions/batch`

**Prompt Strategy:**
- Single API call extracts AND classifies in one shot
- Explicit instructions to return valid JSON only
- Fallback to "Other" category when unsure
- Never hallucinate amounts - set null if not visible

### 2. Excel Classification

When you upload an Excel file:
1. File is parsed using openpyxl
2. Description strings are extracted
3. Gemini classifies each description (category + type)
4. Results combined with amounts/dates from Excel
5. Preview shown for confirmation

### Testing Gemini Features

**Test with Receipt:**
1. Login as admin@demo.com
2. Go to Upload page
3. Select "Receipt" tab
4. Upload a receipt image
5. Review extracted transactions
6. Edit if needed, then click "Confirm & Save"

**Test with Excel:**
1. Create an Excel file with columns: Date, Description, Amount
2. Add sample rows like "ZOMATO ORDER", "SALARY CREDIT", etc.
3. Upload via "Excel" tab
4. Gemini will classify each row
5. Review and confirm

## Assumptions

1. **User Scope**: One user owns all transactions they create. Viewers and analysts can see all transactions in the system (not scoped per user), but only admins can modify data.

2. **Date Handling**: If date is not provided or not extractable from uploaded files, today's date is used as fallback.

3. **Amount Storage**: Amounts are always stored as positive floats. The `type` field (income/expense) determines the direction.

4. **Categories**: Categories are global and shared across all users, not per-user.

5. **AI Accuracy**: Gemini extraction is not 100% accurate. The confirmation workflow allows users to review and correct any errors before saving.

6. **File Formats**: 
   - Images: JPEG/PNG for receipts and bank statements
   - Excel: .xlsx or .xls format with columns: Date, Description, Amount

7. **Security**: This is a demo application. In production, you would need:
   - HTTPS for all communications
   - More robust password requirements
   - Rate limiting on API endpoints
   - Input sanitization
   - CORS configuration for specific domains

## Role-Based Access Testing

### Test as Viewer (viewer@demo.com)
```bash
# Login
TOKEN=$(curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "viewer@demo.com", "password": "password123"}' \
  | jq -r '.data.token')

# Can view summary
curl -X GET http://localhost:5000/summary \
  -H "Authorization: Bearer $TOKEN"

# Cannot access detailed analytics (403 Forbidden)
curl -X GET http://localhost:5000/summary/by-category \
  -H "Authorization: Bearer $TOKEN"

# Cannot create transactions (403 Forbidden)
curl -X POST http://localhost:5000/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"item_name": "Test", "amount": 10, "category": "Food", "type": "expense"}'
```

### Test as Analyst (analyst@demo.com)
```bash
# Can access detailed analytics
curl -X GET http://localhost:5000/summary/by-category \
  -H "Authorization: Bearer $TOKEN"

# Can apply filters
curl -X GET "http://localhost:5000/transactions?category=Food" \
  -H "Authorization: Bearer $TOKEN"

# Cannot create transactions (403 Forbidden)
curl -X POST http://localhost:5000/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"item_name": "Test", "amount": 10, "category": "Food", "type": "expense"}'
```

### Test as Admin (admin@demo.com)
```bash
# Full access - can create, update, delete
curl -X POST http://localhost:5000/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"item_name": "Test", "amount": 10, "category": "Food", "type": "expense"}'

# Can upload files
curl -X POST http://localhost:5000/upload/receipt \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@receipt.jpg"

# Can manage users
curl -X GET http://localhost:5000/users \
  -H "Authorization: Bearer $TOKEN"
```

## Error Handling

All API responses follow a consistent format:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

**HTTP Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (missing or invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error

## Development Notes

- All Gemini API calls are isolated in `services/gemini_service.py`
- Business logic is separated from routes in `services/` directory
- JWT authentication is handled via decorators in `middleware/auth.py`
- Database uses SQLAlchemy ORM with automatic table creation on startup
- CORS is enabled for local development
- No database migrations needed for this scope

## Optional Enhancements Implemented

1. **AI-Powered Import**: Gemini Vision API extracts transactions from receipts, bank statements, and Excel files (maps to "import of records" enhancement)
2. **Role-Based Access Control**: Three distinct user roles with different permission levels
3. **Confirmation Workflow**: Preview and edit AI-extracted data before saving
4. **Analytics Dashboard**: Visual charts for spending patterns and trends
5. **Filtering**: Filter transactions by date range, category, and type

## License

This project is for assessment purposes only.
