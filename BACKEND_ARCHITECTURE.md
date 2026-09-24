# FinTrackerAI — Backend Architecture & Cloud Database Integration Guide

This document outlines the production architecture, cloud database integration, and deployment strategy for **FinTrackerAI**.

---

## 1. System Architecture Overview

```
 ┌─────────────────────────────────────────────────────────────┐
 │                FinTrackerAI Frontend (PWA)                  │
 │      React 18 + Vite + Service Worker (Offline Support)     │
 └──────────────────────────────┬──────────────────────────────┘
                                │ HTTPS / REST API / JWT
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │              Node.js + Express Production API               │
 │  - Helmet Security & CSP     - Redis Cache (Upstash)        │
 │  - Rate Limiter (brute-force)- Zod Schema Validation        │
 │  - JWT Auth (Access+Refresh) - PDFKit & CSV Report Engine   │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Mongoose / TLS 1.3
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                 Cloud Database Layer                        │
 │  Primary Option: MongoDB Atlas (Document Store / Clusters)  │
 │  SQL Alternative: Supabase (PostgreSQL 15 + Row Level Sec)  │
 └─────────────────────────────────────────────────────────────┘
```

### Dual-Mode Architecture (Hybrid Client + Cloud)
The FinTrackerAI frontend is built with **resilient offline-first capability**:
- **Offline / Standalone Mode**: When offline or in local demo mode, transactions, budgets, recurring bills, and user credentials sync to browser LocalStorage and the PWA Cache.
- **Cloud-Connected Mode**: When `VITE_API_URL` is configured and the Express API is live, authentication tokens (Access + Refresh JWTs) are persisted and all records synchronize automatically with the cloud database.

---

## 2. Recommended Cloud Database: MongoDB Atlas

MongoDB Atlas is the most natural fit for FinTrackerAI because the backend (`d:/Finance/src/app.js` and `d:/Finance/src/models/`) is already modeled using **Mongoose** with schemas for:
- `User` (email, hashed password, refresh token hash)
- `Transaction` (income, expense, buy, sell, dividend, categories)
- `Portfolio` & `Holding` (assets, quantities, average cost)
- `Alert` & `Watchlist` (price alerts, tracked symbols)

### Step-by-Step MongoDB Atlas Setup:
1. **Create Free Account**:
   - Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and register.
2. **Deploy Free Shared Cluster**:
   - Select **M0 Free Tier** (512MB storage, free forever).
   - Choose a cloud provider and region closest to your users (e.g., AWS `ap-south-1` Mumbai or `us-east-1`).
3. **Database Access (User Credentials)**:
   - Navigate to **Security** -> **Database Access** -> **Add New Database User**.
   - Select **Password Authentication**.
   - Create a username (e.g. `fintrack_admin`) and a secure password.
   - Grant role: `Read and write to any database`.
4. **Network Access (IP Whitelist)**:
   - Navigate to **Security** -> **Network Access** -> **Add IP Address**.
   - For cloud platforms (Render, Railway, Fly.io), add `0.0.0.0/0` (Allow Access from Anywhere) with password auth.
5. **Get Connection String**:
   - Click **Connect** on your cluster -> **Drivers** -> **Node.js**.
   - Copy the URI:
     ```
     mongodb+srv://fintrack_admin:<password>@cluster0.abcde.mongodb.net/fintrack?retryWrites=true&w=majority
     ```

---

## 3. Alternative Cloud Database: Supabase (PostgreSQL)

If your enterprise policy requires strict relational integrity or ACID SQL compliance:
- **Provider**: [supabase.com](https://supabase.com) (PostgreSQL 15 with pgvector & Row Level Security).
- **ORM Recommendation**: **Prisma** or **Drizzle ORM**.
- **Migration Path**:
  ```bash
  npm install @prisma/client prisma
  npx prisma init
  ```
- **Prisma Schema Equivalent**:
  ```prisma
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }

  model User {
    id           String        @id @default(uuid())
    email        String        @unique
    passwordHash String
    name         String?
    createdAt    DateTime      @default(now())
    transactions Transaction[]
    budgets      Budget[]
  }

  model Transaction {
    id       String   @id @default(uuid())
    userId   String
    type     String   // income, expense
    category String
    amount   Float
    date     DateTime @default(now())
    notes    String?
    user     User     @relation(fields: [userId], references: [id])
  }
  ```

---

## 4. Environment Configuration (`.env`)

Create a `.env` file in the root backend directory:

```env
# Server Config
PORT=3000
NODE_ENV=production
CORS_ORIGIN=http://localhost:5173,https://yourdomain.com

# Database Connection (MongoDB Atlas)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/fintrack?retryWrites=true&w=majority

# JWT Security Secrets (Generate using: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=c8d4e9b7201f9e8a5b2a0c6d9e1f3a5b7c9e0d2f4a6b8c0e2d4f6a8b0c2d4e6f
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=f1a2b3c4d5e67890abcdef1234567890abcdef1234567890abcdef1234567890
REFRESH_TOKEN_EXPIRES_IN=7d

# Optional Redis Cache (Upstash Redis Free Tier)
REDIS_URL=rediss://default:your-token@your-redis-host.upstash.io:6379

# Alpha Vantage / Market Data API
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
```

And in `frontend/.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

---

## 5. Production API Endpoints Reference

All endpoints (except `/auth/*`) require header: `Authorization: Bearer <access_token>`.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user with `{ name, email, password }` |
| `POST` | `/api/auth/login` | Login with `{ email, password }` -> returns `{ token, refreshToken }` |
| `POST` | `/api/auth/refresh` | Refresh expired access token with `{ refreshToken }` |
| `GET` | `/api/dashboard` | Aggregated net worth, monthly cash flow, and asset distribution |
| `GET` | `/api/transactions` | List all transactions with pagination and date filter |
| `POST` | `/api/transactions` | Create income, expense, or asset buy/sell order |
| `PATCH`| `/api/transactions/:id` | Update transaction amount, category, or note |
| `DELETE`| `/api/transactions/:id` | Delete transaction |
| `GET` | `/api/reports/transactions?format=pdf` | Stream official printable financial statement (PDF) |
| `GET` | `/api/reports/transactions?format=csv` | Download transaction ledger (Excel CSV) |
| `GET` | `/api/watchlist` | Get user stock watchlist |
| `PUT` | `/api/watchlist` | Update user stock watchlist |
| `GET` | `/api/market/quote/:symbol` | Live stock quote with Redis caching |

---

## 6. Recommended Free-to-Low-Cost Deployment

### Frontend (Static SPA / PWA)
- **Vercel** or **Cloudflare Pages**:
  - Connect your GitHub repository.
  - Build command: `npm run build` (inside `frontend/`).
  - Output directory: `dist`.
  - Global edge CDN with automatic SSL and PWA caching.

### Backend (Node.js API)
- **Render.com** (Free / $7/mo Starter):
  - Environment: Node.js.
  - Start command: `node app.js`.
  - Set environment variables under Render dashboard (`MONGODB_URI`, `JWT_SECRET`, etc.).
- **Railway.app** ($5/mo credits):
  - Instant deployment from GitHub.
  - Built-in zero-config SSL and custom domains.

---

## 7. Security Hardening Checklist Implemented

- [x] **Strict Content Security Policy (CSP)** configured in Helmet.
- [x] **Rate Limiting**: Express-rate-limit prevents brute force attacks on authentication.
- [x] **Zod Schema Validation**: Every incoming request payload is strictly validated.
- [x] **Bcrypt Hashing**: Passwords hashed with cost factor 12 before storage.
- [x] **HSTS & TLS 1.3**: Strict Transport Security forced for 1 year.
- [x] **Token Isolation**: Refresh tokens hashed in DB to prevent replay attacks.
