# Deployment Guide

## Important: Vercel Limitation
**Vercel does not support Flask/Docker applications.** Vercel is designed for serverless functions and static sites only.

## Recommended Deployment Options

### Option 1: Render (Recommended - Free Tier)

Render provides free hosting for web services with Docker support.

**Steps:**

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy on Render**
   - Go to https://render.com
   - Sign up/Login with GitHub
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Render will auto-detect the `render.yaml` file
   - Add environment variables:
     - `GEMINI_API_KEY`: Your Gemini API key
     - `SECRET_KEY`: Auto-generated
   - Click "Create Web Service"

3. **Initialize Database**
   - Once deployed, go to the Shell tab
   - Run: `python seed.py`

**Your app will be live at:** `https://your-app-name.onrender.com`

---

### Option 2: Railway (Easy, Free Tier)

**Steps:**

1. **Push to GitHub** (same as above)

2. **Deploy on Railway**
   - Go to https://railway.app
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Add environment variables in Settings:
     - `GEMINI_API_KEY`
     - `SECRET_KEY`
     - `DATABASE_URL=sqlite:///finance.db`
   - Railway will auto-deploy

3. **Initialize Database**
   - Use Railway CLI or web shell
   - Run: `python seed.py`

---

### Option 3: Docker Locally

**Test locally with Docker:**

```bash
# Build the image
docker build -t finance-tracker .

# Run the container
docker run -p 5000:5000 \
  -e GEMINI_API_KEY=your_key \
  -e SECRET_KEY=your_secret \
  finance-tracker
```

**Or use Docker Compose:**

```bash
# Create .env file first
docker-compose up --build
```

Access at: `http://localhost:5000`

---

### Option 4: Heroku (Paid)

**Steps:**

1. **Install Heroku CLI**
   ```bash
   heroku login
   ```

2. **Create Heroku App**
   ```bash
   heroku create your-app-name
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set GEMINI_API_KEY=your_key
   heroku config:set SECRET_KEY=your_secret
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

5. **Initialize Database**
   ```bash
   heroku run python seed.py
   ```

---

### Option 5: DigitalOcean App Platform

**Steps:**

1. Push to GitHub
2. Go to https://cloud.digitalocean.com/apps
3. Create new app from GitHub
4. Select your repository
5. Add environment variables
6. Deploy

---

## Production Considerations

### Database
- SQLite works for demos but consider PostgreSQL for production
- Update `DATABASE_URL` in `.env` for PostgreSQL:
  ```
  DATABASE_URL=postgresql://user:password@host:5432/dbname
  ```

### Security
- Use strong `SECRET_KEY`
- Enable HTTPS (most platforms do this automatically)
- Set proper CORS origins in production
- Add rate limiting

### Performance
- Consider using Gunicorn instead of Flask dev server:
  ```bash
  pip install gunicorn
  gunicorn -w 4 -b 0.0.0.0:5000 run:app
  ```

### File Storage
- For production, use cloud storage (S3, Cloudinary) for uploaded files
- SQLite database will reset on some platforms - use PostgreSQL

---

## Why Not Vercel?

Vercel is optimized for:
- Next.js applications
- Static sites
- Serverless functions (short-lived, stateless)

Your Flask app needs:
- Long-running server process
- Persistent database connections
- File system access for SQLite

**Alternatives that work:** Render, Railway, Heroku, DigitalOcean, AWS, Google Cloud

---

## Quick Start (Render - Recommended)

1. Push code to GitHub
2. Go to render.com → New Web Service
3. Connect GitHub repo
4. Add `GEMINI_API_KEY` in environment variables
5. Deploy
6. Run `python seed.py` in Shell tab
7. Done! 🎉

**Free tier includes:**
- 750 hours/month
- Automatic HTTPS
- Custom domains
- Auto-deploy on git push
