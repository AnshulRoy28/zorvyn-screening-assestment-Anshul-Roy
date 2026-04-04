# Personal Finance Tracker — Project Plan

## Stack
- **Frontend:** Vanilla HTML / CSS / JS
- **Backend:** Python (Flask)
- **AI:** Google Gemini API (Vision + Text)
- **Database:** SQLite + SQLAlchemy ORM
- **Excel Parsing:** openpyxl
- **Auth:** JWT tokens (PyJWT)

---

## Project Structure

```
finance-tracker/
├── app/
│   ├── __init__.py               # Flask app factory, register blueprints
│   ├── config.py                 # Config class, loads from .env
│   ├── models.py                 # SQLAlchemy models — Transaction, User, Category
│   ├── database.py               # DB init, session management
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py               # POST /auth/register, POST /auth/login
│   │   ├── transactions.py       # CRUD + filter endpoints
│   │   ├── summary.py            # Analytics endpoints
│   │   └── upload.py             # Receipt, bank statement, Excel, manual
│   ├── services/
│   │   ├── __init__.py
│   │   ├── transaction_service.py  # Business logic for transactions
│   │   ├── summary_service.py      # Aggregation and analytics logic
│   │   └── gemini_service.py       # All Gemini API calls isolated here
│   └── middleware/
│       ├── __init__.py
│       └── auth.py               # JWT decode + role-checking decorators
├── static/
│   ├── css/style.css
│   └── js/
│       ├── dashboard.js
│       ├── upload.js
│       └── transactions.js
├── templates/
│   ├── index.html                # Dashboard
│   ├── upload.html
│   └── transactions.html
├── run.py                        # Entry point
├── seed.py                       # Seed DB with sample users and transactions
├── requirements.txt
├── .env
└── README.md
```

---

## Data Models (SQLAlchemy)

### User
```python
id            Integer, primary key
username      String, unique, not null
email         String, unique, not null
password_hash String, not null
role          Enum: "viewer" | "analyst" | "admin"
created_at    DateTime
```

### Transaction
```python
id          Integer, primary key
user_id     Integer, foreign key → User
date        Date, not null
item_name   String, not null
category    String, not null
amount      Float, not null
type        Enum: "income" | "expense"
source      Enum: "receipt" | "bank_statement" | "excel" | "manual"
notes       String, nullable
raw_text    String, nullable  # original extracted text, for debugging
created_at  DateTime
```

### Category
```python
id    Integer, primary key
name  String, unique, not null
```

Default categories: `Food, Transport, Shopping, Bills, Entertainment, Health, Income, Other`

---

## User Roles & Permissions

| Action | Viewer | Analyst | Admin |
|--------|--------|---------|-------|
| View transactions | ✅ | ✅ | ✅ |
| View summaries | ✅ | ✅ | ✅ |
| Filter & detailed insights | ❌ | ✅ | ✅ |
| Create transactions | ❌ | ❌ | ✅ |
| Update transactions | ❌ | ❌ | ✅ |
| Delete transactions | ❌ | ❌ | ✅ |
| Upload receipts / files | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Manage categories | ❌ | ❌ | ✅ |

### Role enforcement pattern
Use a decorator in `middleware/auth.py`:
```python
@require_role("admin")
def delete_transaction(id): ...

@require_role("analyst", "admin")
def get_filtered_transactions(): ...
```

The decorator decodes the JWT, checks the role, and returns `403` if unauthorized.

---

## API Endpoints

### Auth

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/register` | Public | Register new user with role |
| POST | `/auth/login` | Public | Returns JWT token |
| GET | `/auth/me` | All roles | Returns current user info |

### Transactions

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/transactions` | All roles | List all transactions. Supports `?month=YYYY-MM&category=Food&type=expense&start_date=&end_date=` |
| GET | `/transactions/:id` | All roles | Get a single transaction |
| POST | `/transactions` | Admin | Create a single transaction |
| POST | `/transactions/batch` | Admin | Save a batch (used after confirming Gemini output) |
| PUT | `/transactions/:id` | Admin | Update a transaction |
| DELETE | `/transactions/:id` | Admin | Delete a transaction |

### Upload (AI Ingestion)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/upload/receipt` | Admin | Image → Gemini Vision → returns extracted transactions for preview |
| POST | `/upload/bank-statement` | Admin | Image → Gemini Vision → returns extracted transactions for preview |
| POST | `/upload/excel` | Admin | .xlsx → openpyxl parse → Gemini classifies → returns preview |
| POST | `/transactions/manual` | Admin | Single manual entry, saved directly |

> Upload endpoints return a **preview payload only** — nothing is saved until the user confirms via `POST /transactions/batch`

### Summary & Analytics

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/summary` | All roles | Total income, total expenses, net balance. Supports `?month=YYYY-MM` |
| GET | `/summary/by-category` | Analyst + Admin | Spending breakdown per category for a period |
| GET | `/summary/by-month` | Analyst + Admin | Monthly income vs expense totals (for bar chart) |
| GET | `/summary/recent` | All roles | Last 10 transactions |

### Categories

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/categories` | All roles | List all categories |
| POST | `/categories` | Admin | Add a custom category |
| DELETE | `/categories/:name` | Admin | Remove a category |

### Users (Admin only)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/users` | Admin | List all users |
| PUT | `/users/:id/role` | Admin | Change a user's role |
| DELETE | `/users/:id` | Admin | Remove a user |

---

## Gemini Integration (`services/gemini_service.py`)

### 1. Vision Prompt — receipts + bank statement screenshots
- Input: base64 encoded image
- Single API call extracts AND classifies in one shot
- Expected output:
```json
[
  { "item_name": "Uber ride", "amount": 12.50, "category": "Transport", "type": "expense", "date": "2024-03-15" },
  { "item_name": "Salary credit", "amount": 3000.00, "category": "Income", "type": "income", "date": "2024-03-01" }
]
```

### 2. Classification Prompt — Excel rows
- Input: list of raw description strings from parsed Excel
- Gemini assigns category and type to each
- Expected output:
```json
[
  { "item_name": "ZOMATO ORDER", "category": "Food", "type": "expense" },
  { "item_name": "SALARY HDFC", "category": "Income", "type": "income" }
]
```

### Rules for both prompts
- Always return valid JSON only — no markdown, no explanation text
- Fallback category must be `"Other"` when unsure
- Never hallucinate amounts — if an amount is not visible, set `null`
- If date is not visible, set `null` (backend will use today's date as fallback)

---

## Confirmation Step (Important UX Flow)

After any upload, **do not save directly to the database**.

```
Upload file
    ↓
Gemini extracts → preview payload returned to frontend
    ↓
User sees editable table — can fix categories, remove junk rows
    ↓
User clicks Confirm
    ↓
POST /transactions/batch → saved to DB
```

This handles Gemini errors gracefully and is a strong talking point.

---

## Validation & Error Handling

- All inputs validated before hitting the DB (amount must be positive, type must be income/expense, date must be valid)
- Missing required fields return `400` with a clear message
- Unauthorized role returns `403`
- Invalid JWT or missing token returns `401`
- Resource not found returns `404`
- All responses follow a consistent shape:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "Descriptive message here" }
```

---

## Frontend Pages

### 1. Dashboard (`/`)
- Net balance card (Income − Expenses)
- Donut chart — spending by category
- Bar chart — income vs expenses by month
- Recent transactions list

### 2. Upload (`/upload`)
- Drag and drop zone
- Tabs: Receipt | Bank Statement | Excel | Manual Entry
- Editable preview table after Gemini extraction
- Confirm button to save batch

### 3. Transactions (`/transactions`)
- Full paginated list
- Filter by date range, category, type
- Inline edit and delete (admin only)

### 4. Categories (`/categories`) *(low priority)*
- List, add, remove categories

---

## Build Order (1 Day)

| Time Block | What to Build |
|------------|---------------|
| Morning | Flask app factory, SQLAlchemy models, DB init, `seed.py`, JWT auth endpoints, role middleware |
| Late Morning | Transaction CRUD routes + `transaction_service.py`, filter support, validation |
| Early Afternoon | Summary routes + `summary_service.py`, wire to dashboard charts |
| Mid Afternoon | Gemini service, upload endpoints, confirmation flow |
| Late Afternoon | Excel upload, frontend upload UI, transactions list page |
| Evening | Polish, edge cases, README, seed data |

---

## Dependencies (`requirements.txt`)

```
flask
flask-cors
flask-sqlalchemy
PyJWT
google-generativeai
openpyxl
python-dotenv
```

---

## Environment Variables (`.env`)

```
GEMINI_API_KEY=your_key_here
SECRET_KEY=your_jwt_secret_here
DATABASE_URL=sqlite:///finance.db
```

---

## Seed Data (`seed.py`)

Create three users to demo role behavior:
```
admin@demo.com   / password123  → role: admin
analyst@demo.com / password123  → role: analyst
viewer@demo.com  / password123  → role: viewer
```
Plus ~20 sample transactions across categories and months so the dashboard has something to show immediately.

---

## README Must Include

- Project overview
- Setup instructions (`pip install -r requirements.txt`, configure `.env`, `python seed.py`, `python run.py`)
- How to test each role (which endpoints each role can and cannot access)
- Assumptions made
- How Gemini ingestion works and how to test it
- Full list of API endpoints with example request/response for each

---

## Assumptions (document these in README)

- One user owns all transactions they create — no shared records between users
- Viewers and analysts can see all transactions in the system (not scoped per user), only admins can modify
- Date defaults to today if not provided or not extractable from uploaded file
- Amount is always stored as a positive float — type (income/expense) determines direction
- Categories are global, not per-user

---

## Notes for the Coding Agent

- All Gemini calls live in `services/gemini_service.py` only — never inline in routes
- All business logic lives in `services/` — routes handle only request/response parsing
- `middleware/auth.py` exports two decorators: `@require_auth` and `@require_role(*roles)`
- Use Flask blueprints for each route file, registered in `app/__init__.py`
- Use `db.create_all()` on app startup — no migrations needed for this scope
- Charts use Chart.js via CDN — no npm needed
- CORS must be enabled on Flask for local frontend dev
- The Gemini upload feature maps to the "import of records" optional enhancement in the assessment — frame it that way in the README
- `seed.py` should be runnable standalone: `python seed.py` drops and recreates all tables then inserts demo data