# 💰 FinTracker & Investment

A modern and feature-rich Personal Finance Tracker built using HTML, CSS, and Vanilla JavaScript. FinTracker & Investment helps users manage their income, expenses, and financial activities with a clean dashboard, interactive analytics, and secure local data storage.

---

## ✨ Features

- 🔐 User Authentication (Login & Register)
- 💰 Income & Expense Management
- 📊 Financial Dashboard
- 📈 Interactive Cash Flow Chart
- 🔍 Search & Filter Transactions
- 👤 User Profile Management
- 🌍 Multi-Currency Support
- 🌙 Dark / Light Mode
- 💾 LocalStorage Data Persistence
- 📱 Responsive phone, tablet, and desktop layouts

---

## 🚀 Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript (ES6)
- Chart.js
- LocalStorage API

---

## 📂 Project Structure

```
📦 fintrack-pro
├── index.html
├── style.css
├── app.js
├── logo.png
└── README.md
```

---

## 📸 Application Modules

- Authentication System
- Dashboard Overview
- Add Transactions
- Income & Expense Tracking
- Analytics Dashboard
- Cash Flow Visualization
- Search & Filter
- Settings Page
- Profile Management
- Theme Switching

## 📐 Responsive behavior

- **Small phones (320px+):** compact bottom navigation, safe-area spacing, single-column forms, stacked transaction rows, and horizontally scrollable market/schedule tables.
- **Phones (up to 640px):** bottom navigation, compact cards, readable touch targets, and short-landscape support.
- **Tablets (641px–820px):** icon navigation rail, adaptive two-column cards and forms, and single-column dashboard panels where needed.
- **Tablet/desktop landscape (821px+):** full navigation rail, fluid content width, multi-column dashboards, market watch layout, and expanded advisor workspace.
- Tested layouts include iPhone SE (320px), common 390px phones, phone landscape, iPad mini (768px), tablet portrait (820px), iPad landscape (1024px), and Nest Hub Max (1280px).


### Core principles

- **Riba:** avoid businesses whose core activity is interest-based lending, conventional banking, or earning interest.
- **Gharar and maysir:** avoid excessive contractual uncertainty, speculation, gambling, margin, and short selling.
- **Haram activities:** screen out alcohol, pork, gambling, adult entertainment, conventional financial services, and prohibited weapons activity. Mixed business lines require a documented scholarly decision.
- **Financial ratios:** apply the selected provider's debt, cash, and impure-income tests without mixing denominators.
- **Purification:** if the selected committee permits incidental non-compliant income, calculate the provider's published purification amount and donate it without treating it as ordinary investment return.
- **Zakat:** calculate separately with a qualified scholar; treatment differs between trading inventory and long-term investment holdings and between jurisdictions.

### Methodology comparison

The UI presents common published-style thresholds for education:

| Methodology | Debt / balance-sheet convention | Impure income | Liquidity convention |
|---|---|---:|---|
| AAOIFI-style | commonly below 30%; denominator and averaging rules must be confirmed | commonly below 5% | illiquid assets commonly at least 30% |
| MSCI Islamic | commonly 33.33% of total assets for balance-sheet tests | 5% activity-income screen | provider-specific; do not substitute an AAOIFI liquidity test |
| S&P DJI Islamic | commonly 33% of total assets | 5% non-permissible revenue | methodology-specific |
| FTSE Russell Shariah | commonly 33% of total assets | 5% non-permissible revenue | methodology-specific |

These are not interchangeable rules. Providers may use total assets, market capitalization, trailing averages, or different data dates. Thresholds and index review schedules can change, so the current rulebook controls.

### Practical workflow and gray areas

1. Choose a committee-backed index, halal ETF, mutual fund, or screening service and record its methodology version.
2. Screen business activities and subsidiaries before calculating ratios.
3. Reconcile debt, cash, revenue, and asset figures to the latest annual/quarterly filing.
4. Record the screen date, source documents, denominator, result, purification ratio, and scholar decision.
5. Re-screen at least quarterly and after acquisitions, debt issuance, divestitures, or a material business change.
6. If a holding fails, stop new purchases, verify whether the failure is a data error or a real change, check the provider's grace period, and exit or purify according to its committee guidance.

Preferred shares, conventional bonds, convertible debt, derivatives, hedging, options, margin, and short selling are not automatically permissible or impermissible in every fact pattern. They need instrument-level review by a qualified Shariah adviser.



---

## 🛠️ Getting Started

Clone the repository

```bash

```

Move into the project folder

```bash
cd fintrack-pro
```

Run the frontend project

Open `index.html` in your browser.

### Backend API

The repository also contains a production-oriented Express/Mongoose API. Node.js 18+
is required (the market service uses the native `fetch` API).

```bash
npm install
copy .env.example .env
# Edit .env and set MongoDB, JWT secrets, and the operator-provided market key
npm test
npm start
```

For production, use MongoDB Atlas (or another managed MongoDB deployment) and
restrict its network access and database credentials to the API service.

The API listens on `http://localhost:3000` by default. Never commit `.env` or a
provider key. The supplied opaque `AQ...` value does not match the documented
key formats for Alpaca or Finnhub, so it cannot be safely attributed to a
financial provider from the string alone. Confirm the issuer before deployment
and place the exact value in the corresponding provider variable; the service
supports Alpha Vantage, Finnhub, CryptoCompare, and Yahoo Finance fallback
requests without storing secrets in source control.

#### API endpoints

All endpoints below `/api` except registration, login, and refresh require an
access token in the `Authorization: Bearer <access-token>` header. The
`/health` endpoint is public.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create a user and receive access/refresh tokens |
| POST | `/api/auth/login` | Authenticate |
| POST | `/api/auth/refresh` | Rotate an access token |
| GET/POST | `/api/portfolios` | List/create portfolios |
| GET/PATCH/DELETE | `/api/portfolios/:id` | Manage a portfolio |
| GET/POST | `/api/portfolios/:portfolioId/holdings` | Holdings CRUD |
| PATCH/DELETE | `/api/holdings/:id` | Update/delete a holding |
| GET/POST | `/api/portfolios/:portfolioId/transactions` | List/create transactions scoped to an owned portfolio |
| GET/POST | `/api/transactions` | List/create transactions |
| PATCH/DELETE | `/api/transactions/:id` | Update/delete a transaction |
| GET | `/api/watchlist` | Read the authenticated user's watchlist |
| PUT | `/api/watchlist` | Replace watchlist symbols |
| GET/POST | `/api/alerts` | List/create price alerts |
| PATCH/DELETE | `/api/alerts/:id` | Update/delete a price alert |
| GET | `/api/dashboard` | Aggregate income, expenses, deposits, withdrawals, cash flow, and invested value |
| GET | `/api/market/quote/:symbol` | Cached provider/fallback quote |
| GET | `/api/reports/transactions?format=csv\|pdf` | Download a transaction report |

Transaction `type` accepts `buy`, `sell`, `income`, `expense`, `dividend`,
`deposit`, or `withdrawal`; `amount` is a non-negative number. Report format
defaults to CSV, and `format=pdf` returns an `application/pdf` download.
Portfolio, holding, transaction, watchlist, and alert write endpoints reject
malformed bodies with HTTP 400 validation errors.

Security defaults include Helmet, CORS, compression, rate limiting, bcrypt
password hashing, short-lived JWT access tokens, refresh tokens, structured
Winston logging, input validation, provider retries/circuit protection, Redis-ready
configuration, and graceful MongoDB shutdown.

---


---

## 🎯 Learning Outcomes

Building FinTracker & Investment strengthened my understanding of:

- DOM Manipulation
- Authentication Flow
- LocalStorage
- CRUD Operations
- State Management
- Dynamic Rendering
- Data Visualization
- Responsive Design
- UI/UX Development
- Modular JavaScript

---

## 🚀 Key Features & Capabilities (Recently Completed)

- ✅ **Export Reports (PDF / Excel)**: Official printable PDF bank statement and UTF-8 encoded Excel (.csv) ledger export.
- ✅ **Monthly Budget Planner**: Category budget allocations, 50/30/20 rule calculator, real-time variance tracking, and daily safe-to-spend allowance.
- ✅ **Financial Goals**: Integrated goal tracking, progress badges, target dates, and direct deposit contributions.
- ✅ **Recurring Transactions**: Subscriptions & bills manager with recurrence schedules, upcoming due reminders, and one-click "Pay & Post to Ledger".
- ✅ **Expense Categories Analytics**: Deep breakdown of monthly outflows, percentage share, average ticket size, and AI financial health observations.
- ✅ **Cloud Database Integration**: Complete Mongoose + MongoDB Atlas and Supabase PostgreSQL architecture guide ([BACKEND_ARCHITECTURE.md](file:///d:/Finance/BACKEND_ARCHITECTURE.md)).
- ✅ **Email Authentication**: Full email login & registration validation with JWT session management and offline local fallback.
- ✅ **PWA Support**: Progressive Web App installability with offline service worker caching and standalone display.

---


---



---


