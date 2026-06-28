# TrainServe — Complete Setup & Deployment Guide

> **This guide covers everything:** local development, deploying the backend to Render,
> deploying the frontend to GitHub Pages, and connecting to a Neon (serverless PostgreSQL) database.

---

## Project Structure

```
KB ENTERPRISES/
├── TrainServe/                    ← Frontend (deploy to GitHub Pages)
│   └── index.html
│
└── TrainServe_BackEnd/            ← Backend (deploy to Render)
    ├── src/
    │   ├── index.js               ← Server entry point
    │   ├── db/
    │   │   ├── pool.js            ← Database connection pool
    │   │   └── init.js            ← Creates all tables + indexes on startup
    │   ├── middleware/
    │   │   └── auth.js            ← JWT authentication middleware
    │   └── routes/
    │       ├── auth.js            ← Register, login, crew-login
    │       ├── users.js           ← Crew list, all users, logout
    │       ├── orders.js          ← All order operations
    │       ├── products.js        ← Product catalog management
    │       ├── notifications.js   ← Notifications
    │       └── reports.js         ← Excel report generation
    ├── scripts/
    │   └── seed.js                ← Creates admin + crew accounts (run ONCE locally)
    ├── .env                       ← Your secrets — NEVER commit this
    ├── .env.example               ← Template — safe to commit
    ├── .gitignore
    └── package.json
```

---

## PART 1 — Local Development Setup

### Step 1 — Prerequisites

Install these if you don't have them:

- **Node.js 18+** — https://nodejs.org (download LTS)
- **Git** — https://git-scm.com

Verify in a terminal:
```
node -v    # should show v18 or higher
npm -v     # should show 9 or higher
```

---

### Step 2 — Set up a Neon database (free, works locally AND in production)

Neon is a free serverless PostgreSQL service. Using it from day one means you don't need to install PostgreSQL locally.

1. Go to **https://neon.tech** and sign up for free
2. Click **"New Project"** → give it a name like `trainserve`
3. Neon will show you a **connection string** like:
   ```
   postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Click **"Connection Details"** and note down individually:
   - **Host** — `ep-xxx.us-east-2.aws.neon.tech`
   - **Database** — `neondb`
   - **User** — your username
   - **Password** — your password
   - **Port** — `5432`

---

### Step 3 — Configure your .env file

In the `TrainServe_BackEnd` folder, copy the example:
```bash
cp .env.example .env
```

Open `.env` and fill in every value:

```env
# Server
PORT=8080
NODE_ENV=development

# Database — paste your Neon values here
DB_HOST=ep-xxx.us-east-2.aws.neon.tech
DB_PORT=5432
DB_NAME=neondb
DB_USER=your_neon_username
DB_PASSWORD=your_neon_password
DB_POOL_MAX=10

# Auth — generate a strong secret (see below)
JWT_SECRET=paste_your_generated_secret_here

# CORS — for local development only
FRONTEND_ORIGIN=http://localhost:5500

# Seed script (only used when running scripts/seed.js)
SEED_ADMIN_EMAIL=your_admin_email@example.com
SEED_ADMIN_PASSWORD=your_strong_password_here
SEED_ADMIN_FIRST=Admin
SEED_ADMIN_LAST=TrainServe
SEED_CREW1_ID=CREW001
SEED_CREW1_NAME=Crew Member One
SEED_CREW1_PIN=1234
SEED_CREW2_ID=CREW002
SEED_CREW2_NAME=Crew Member Two
SEED_CREW2_PIN=5678
SEED_CREW3_ID=CREW003
SEED_CREW3_NAME=Crew Member Three
SEED_CREW3_PIN=9012
SEED_CREW4_ID=CREW004
SEED_CREW4_NAME=Crew Member Four
SEED_CREW4_PIN=3456
```

**Generate a strong JWT_SECRET** (run this in any terminal):
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copy the output (128-character hex string) and paste as `JWT_SECRET`.

---

### Step 4 — Install dependencies

In the `TrainServe_BackEnd` folder:
```bash
npm install
```

---

### Step 5 — Start the server

```bash
npm start
```

You should see:
```
Database tables ready
KB ENTERPRISES backend running on port 8080
Health: http://localhost:8080/health
API:    http://localhost:8080/api
```

The server automatically creates all database tables and indexes on first run.

---

### Step 6 — Seed the database (run ONCE only)

This creates your admin account and crew members using the values in your `.env`:
```bash
node scripts/seed.js
```

You should see:
```
Seeding database...
  Admin created: your_admin_email@example.com
  Crew created: CREW001 - Crew Member One
  Crew created: CREW002 - Crew Member Two
  ...
Seeding complete. You can now sign in.
```

> ⚠️ Run this **only once**. Running it again is safe (it uses ON CONFLICT DO NOTHING) but unnecessary.

---

### Step 7 — Test the backend

Open a browser and go to:
```
http://localhost:8080/health
```

You should see: `{"status":"ok","time":"..."}`

---

### Step 8 — Open the frontend locally

Open `TrainServe/index.html` directly in a browser, or serve it with:
```bash
# Using VS Code Live Server extension (recommended)
# OR using npx:
npx serve TrainServe
```

The frontend will automatically use `https://trainserve-backend.onrender.com/api` as the default API URL. For local development, click the **"Configure Backend URL"** button in the app and set it to:
```
http://localhost:8080/api
```

---

## PART 2 — Deploy Backend to Render

### Step 1 — Push backend to GitHub

Create a GitHub repository for your backend (separate from the frontend):

```bash
cd TrainServe_BackEnd
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/trainserve-backend.git
git push -u origin main
```

> Make sure `.env` is in `.gitignore` (it is). Never push your `.env` file.

---

### Step 2 — Create a Render Web Service

1. Go to **https://render.com** and sign up / log in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select your backend repository
4. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `trainserve-backend` |
| **Region** | Choose closest to your users |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |

---

### Step 3 — Set environment variables on Render

In your Render service dashboard → **"Environment"** tab → add each variable:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `DB_HOST` | Your Neon host (e.g. `ep-xxx.us-east-2.aws.neon.tech`) |
| `DB_PORT` | `5432` |
| `DB_NAME` | Your Neon database name |
| `DB_USER` | Your Neon username |
| `DB_PASSWORD` | Your Neon password |
| `DB_POOL_MAX` | `10` |
| `JWT_SECRET` | Your generated 128-char hex secret |
| `FRONTEND_ORIGIN` | Your GitHub Pages URL (e.g. `https://yourusername.github.io`) |

> ⚠️ Do NOT add any `SEED_*` variables to Render — the seed script only runs locally.

---

### Step 4 — Deploy

Click **"Create Web Service"**. Render will:
1. Pull your code from GitHub
2. Run `npm install`
3. Run `npm start`
4. Your backend will be live at `https://trainserve-backend.onrender.com`

Check the **Logs** tab in Render to verify:
```
Database tables ready
KB ENTERPRISES backend running on port 8080
```

---

### Step 5 — Test the deployed backend

```
https://trainserve-backend.onrender.com/health
```

Should return `{"status":"ok","time":"..."}`.

> **Free tier note:** Render's free tier spins down after 15 minutes of inactivity. The first request after sleep takes 30–60 seconds to respond (cold start). This is normal. The frontend handles this gracefully.

---

## PART 3 — Deploy Frontend to GitHub Pages

### Step 1 — Update the backend URL in index.html

Open `TrainServe/index.html` and find line ~2011:
```js
const BACKEND_API_URL = 'https://trainserve-backend.onrender.com/api';
```

Replace `trainserve-backend` with **your actual Render service name**.

---

### Step 2 — Push frontend to GitHub

```bash
cd TrainServe
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/trainserve.git
git push -u origin main
```

---

### Step 3 — Enable GitHub Pages

1. Go to your frontend repository on GitHub
2. Click **"Settings"** → **"Pages"** (left sidebar)
3. Under **"Source"**, select:
   - Branch: `main`
   - Folder: `/ (root)`
4. Click **"Save"**

GitHub Pages will be live at:
```
https://YOUR_USERNAME.github.io/trainserve/
```

(It may take 2–5 minutes the first time.)

---

### Step 4 — Update FRONTEND_ORIGIN on Render

Now that you know your GitHub Pages URL, go back to Render → Environment and set:
```
FRONTEND_ORIGIN = https://YOUR_USERNAME.github.io
```

Click **"Save Changes"** — Render will redeploy automatically.

---

## PART 4 — Payment Screenshots Setup

The app uses URL-based screenshot storage instead of uploading files to the database.

**How it works for crew members:**
1. Crew takes a payment screenshot on their phone
2. Crew opens **https://imgbb.com** or **https://podu.pics** in their browser
3. Upload the screenshot → copy the **direct image URL** (not the page URL)
4. Paste that URL into the TrainServe app when completing an order

**Accepted URL formats:**
- `https://i.ibb.co/...` (imgbb direct link)
- `https://ibb.co/...` (imgbb page link)
- `https://podu.pics/...`

---

## PART 5 — Post-Deployment Checklist

### Before going live, test all of these:

- [ ] `https://your-render-url.onrender.com/health` returns `{"status":"ok"}`
- [ ] Admin login works with the email/password from your seed
- [ ] Crew login works with a crew ID and PIN from your seed
- [ ] User registration works
- [ ] Placing an order works
- [ ] Crew can see and accept a pending order
- [ ] Crew can complete an order with an imgbb/podu.pics screenshot URL
- [ ] Admin dashboard loads (orders, payments, delivery logs)
- [ ] Excel report downloads without error
- [ ] CORS is working (no errors in browser console on GitHub Pages)

---

## PART 6 — Maintenance

### Add a new crew member (after initial setup)

Log in as admin → go to **Crew Management** → **Add Crew Member**.
No need to touch seed.js or the database directly.

### Add or edit products

Log in as admin → go to **Products** → **Add Product** or edit existing ones.
Product images: upload to imgbb.com or podu.pics and paste the direct URL.

### Download daily reports

Log in as admin → **Reports** → select a date → **Download Excel Report**.

### Redeploy after code changes

```bash
git add .
git commit -m "Your change description"
git push
```
Render detects the push and redeploys automatically (usually takes 1–2 minutes).

### Rotate JWT secret (if compromised)

1. Generate a new secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
2. Update `JWT_SECRET` in Render environment variables
3. All existing tokens will be invalidated — all users will need to log in again

---

## PART 7 — API Endpoints Reference

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/health` | Public | Health check |
| GET | `/api/auth/crew-list` | Public | Crew names for login dropdown |
| POST | `/api/auth/register` | Public | Create user account |
| POST | `/api/auth/login` | Public | User/admin login |
| POST | `/api/auth/crew-login` | Public | Crew PIN login |
| GET | `/api/users/crew` | Auth | List all crew |
| GET | `/api/users/all` | Admin | List all users |
| POST | `/api/users/crew` | Admin | Add new crew member |
| PATCH | `/api/users/crew/:id` | Admin | Update crew member |
| DELETE | `/api/users/crew/:id` | Admin | Remove crew member |
| POST | `/api/users/logout` | Auth | Mark crew offline |
| POST | `/api/orders` | Auth | Place new order |
| GET | `/api/orders/my` | Auth | My orders (user) |
| GET | `/api/orders/pending` | Crew/Admin | All pending orders |
| GET | `/api/orders/deliveries` | Crew | My assigned deliveries |
| GET | `/api/orders/all` | Admin | All orders (filter by ?date=YYYY-MM-DD) |
| GET | `/api/orders/stats` | Admin | Dashboard stats |
| PATCH | `/api/orders/:id/accept` | Crew | Accept a pending order |
| PATCH | `/api/orders/:id/assign` | Admin | Assign order to crew |
| PATCH | `/api/orders/:id/payment-screenshot` | Crew/Admin | Submit payment URL + complete order |
| PATCH | `/api/orders/:id/complete` | Admin | Manually complete order |
| GET | `/api/orders/admin/logs` | Admin | Audit event log (paginated) |
| GET | `/api/orders/admin/delivery-logs` | Admin | Delivery timeline (paginated) |
| GET | `/api/orders/admin/payments` | Admin | Payment records (paginated) |
| GET | `/api/notifications` | Auth | Get notifications |
| PATCH | `/api/notifications/mark-read` | Auth | Mark all read |
| GET | `/api/products` | Public | Product catalog |
| POST | `/api/products` | Admin | Add product |
| PUT | `/api/products/:id` | Admin | Update product |
| PATCH | `/api/products/:id/stock` | Admin | Toggle stock status |
| DELETE | `/api/products/:id` | Admin | Soft-delete product |
| GET | `/api/reports/daily` | Admin | Download Excel report (?date=YYYY-MM-DD) |

---

## PART 8 — Environment Variables Quick Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Server port (Render sets this automatically) |
| `NODE_ENV` | Yes | Set to `production` on Render |
| `DB_HOST` | Yes | Neon database host |
| `DB_PORT` | Yes | Database port (5432) |
| `DB_NAME` | Yes | Database name |
| `DB_USER` | Yes | Database username |
| `DB_PASSWORD` | Yes | Database password |
| `DB_POOL_MAX` | No | Max DB connections (default: 10) |
| `JWT_SECRET` | Yes | 64-byte random hex string |
| `FRONTEND_ORIGIN` | Yes (production) | Your GitHub Pages URL |
| `SEED_ADMIN_EMAIL` | Seed only | Admin account email |
| `SEED_ADMIN_PASSWORD` | Seed only | Admin account password |
| `SEED_CREW*_*` | Seed only | Crew member details and PINs |

---

## Troubleshooting

**Backend won't start:**
- Check Render logs for `FATAL:` messages
- Ensure all required env vars are set on Render
- Verify Neon database credentials

**CORS errors in browser console:**
- Make sure `FRONTEND_ORIGIN` on Render exactly matches your GitHub Pages URL (no trailing slash)
- Redeploy Render after changing env vars

**"Invalid or expired token" errors:**
- User needs to log out and log in again
- Check that `JWT_SECRET` is the same value that issued the token

**Render cold start (first request takes 30+ seconds):**
- This is normal on the free tier
- Upgrade to Render's paid tier ($7/month) for always-on instances

**Neon connection issues:**
- Verify `DB_HOST` does not include `postgresql://` prefix — just the hostname
- Ensure Neon project is not suspended (free tier suspends after 7 days of inactivity)
- Check Neon dashboard → your project → "Branches" to wake it up

**Excel report is empty:**
- Verify the date format is `YYYY-MM-DD`
- Check that there are orders for that date
- Check Render logs for any report generation errors
