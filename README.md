# Bagstack — Personal Financial Command Center

> **A production-grade, local-first personal financial command center built with deterministic financial math, multi-account ledgering, automated recurring obligations, deep analytics, and PWA mobile support.**

---

## Highlights & Features

### 🏦 Multi-Account & Multi-Profile Ledger
- **Financial Account Diversity**: Seamlessly track Savings, Checking, Credit Cards (with credit limits and billing cycle dates), Cash, Investments, and Loans.
- **Email-Scoped Workspaces**: One master verified email account with unlimited compartmentalized profiles (e.g., Personal, Business, Side-Hustle).
- **First-Class Transfers**: Move money between accounts without artificially inflating income or expense metrics.

### 💰 Deterministic Financial Math
- **Zero Floating-Point Drift**: All currency calculations are executed strictly in integer minor units (paise/cents). No `0.1 + 0.2 = 0.30000000000000004` rounding bugs.
- **Deterministic Insights**: Real-time savings rates, burn-rate metrics, and net-worth calculations derived directly from the immutable transaction ledger.

### 🔁 Subscriptions & Recurring Obligations
- **Auto-Deductions**: Subscriptions automatically log their payments into the account ledger when reaching their renewal date.
- **Flexible Controls**:
  - **"Mark as Paid"**: Manually log an early payment and automatically roll the renewal date forward to the next cycle.
  - **"Pay Late" / Snooze**: Postpone upcoming renewal reminders using the custom date picker without triggering premature deductions.
  - **"Already Paid" on Creation**: Checkbox allowing new subscriptions to record their initial payment and compute the true next billing cycle.

### 🎯 Savings Goals & Milestone Tracking
- **Direct Account Funding**: Contribute directly to savings goals with automatic account balance deduction and linked expense logging under the **Savings & Goals** category.
- **Goal Editing & Target Tracking**: Set target dates, modify opening balances, and track progress percentage.

### 📊 Deep Analytics & Month-over-Month Comparisons
- **Interactive Reports**: Category spend breakdowns, top merchant volume, daily spending distribution, and 90-day forecast projections.
- **Side-by-Side Comparison**: Compare any two months to inspect variance in income, expenses, net savings, and category-by-category shifts.

### 📱 Progressive Web App (PWA) Mobile Support
- **Add to Home Screen**: Installable as a standalone app on iOS Safari and Android Chrome with custom app icons, zero browser address-bar distraction, and native mobile viewport handling.

### 🎨 Theme-Adaptive Modern UI
- **Pure Vanilla CSS Design System**: Lightweight, responsive interface using CSS tokens (`--bg-surface`, `--text-primary`, `--border-default`, etc.).
- **System Theme Adaptation**: Built-in `@media (prefers-color-scheme: dark)` and pre-hydration initialization to seamlessly adapt to system light or dark preferences without white flashes.
- **Custom Modern Date Picker**: Custom calendar dropdown with quick presets (*Today*, *Tomorrow*, *+1 Week*, *+1 Month*) replacing browser native white inputs.
- **Standard Warning Dialogs**: Smooth, glassmorphic confirmation modal safeguarding all destructive operations (account, profile, goal, and subscription deletions) and session sign-outs.

### 🔐 Passwordless Authentication & Instant Demo Sandbox
- **Email OTP Verification**: Cryptographic 6-digit one-time code sent via Gmail SMTP, stored as SHA-256 hashes with 10-minute expiration and rate limiting.
- **Instant Sandbox Demo**: New visitors can immediately explore preloaded sample data in demo mode with one click from the public landing page.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router + Turbopack) |
| **Language** | TypeScript / React 19 |
| **Database** | SQLite via native Node.js 22 `node:sqlite` (`DatabaseSync` + WAL mode) |
| **Styling** | Vanilla CSS with design tokens (Zero Tailwind overhead) |
| **Mobile / PWA** | Web App Manifest (`manifest.json`), Apple touch icons, standalone display |
| **Icons** | Lucide React |
| **Email / SMTP** | Nodemailer (Gmail App Password support) |
| **Testing** | Vitest (23 domain & integration tests) |
| **Containerization** | Multi-stage Alpine Dockerfile with standalone Next.js build |

---

## Quick Start (Local Development)

### Prerequisites
- **Node.js**: `v22.0.0` or higher (required for native `node:sqlite`).
- **npm** / **yarn** / **pnpm**

### 1. Clone the repository
```bash
git clone https://github.com/AdityaRaj212/bagstack.git
cd bagstack
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy the template file to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Optional: Set port (defaults to 3000)
PORT=3000

# Nodemailer / SMTP Configuration for Passwordless Email OTP
# Generate a Google App Password at: https://myaccount.google.com/apppasswords
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password

# Public App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
> *Note: If SMTP credentials are omitted, OTP codes are logged directly to the server terminal console for local development.*

### 4. Start the development server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Testing & Quality Assurance

Run the Vitest test suite:
```bash
npm test
```
Build for production verification:
```bash
npm run build
```

---

## Production Deployment (Render + Turso Cloud SQLite)

Bagstack supports **zero-cost 24/7 cloud deployment** using Render for compute and Turso for distributed SQLite cloud persistence. Even when the free container sleeps or rebuilds, all user accounts, transactions, and settings remain permanently saved.

### 1. Database Setup (Turso)
1. Sign up for free at [turso.tech](https://turso.tech) (using GitHub).
2. Create a database: `bagstack` in region `sin` (Singapore) or `aws-ap-south-1` (Mumbai).
3. Copy your **Database URL** (`libsql://...`) and **Auth Token**.

### 2. Deploy to Render (No Credit Card Required)
1. Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** → **Web Service**.
2. Connect your GitHub repository `AdityaRaj212/bagstack`.
3. Choose runtime: **Docker** on the **Free ($0)** instance plan.
4. Add Environment Variables:
   - `PORT` = `3000`
   - `NODE_ENV` = `production`
   - `SMTP_USER` = `your-email@gmail.com`
   - `SMTP_PASS` = `your-google-app-password`
   - `TURSO_DATABASE_URL` = `libsql://bagstack-yourname.turso.io`
   - `TURSO_AUTH_TOKEN` = `your-turso-token`
5. Click **Deploy Web Service**.

Your app is now live with automatic SSL at `https://bagstack.onrender.com`!

---

## Local Docker Setup

To run the production container locally with Docker Compose:
```bash
docker compose up -d --build
```
Your SQLite database will be persisted in the local Docker volume `bagstack_data`.

---

## Architecture & Project Structure

```
bagstack/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── accounts/           # Financial accounts management
│   │   ├── budgets/            # Envelope budgeting & limits
│   │   ├── goals/              # Savings goals & account contributions
│   │   ├── investments/        # Investment tracking & asset allocation
│   │   ├── loans/              # EMI & loan amortization schedule
│   │   ├── reports/            # Analytics, trends & month-over-month diffs
│   │   ├── subscriptions/      # Recurring subscriptions & auto-deductions
│   │   ├── transactions/       # Ledger feed with search, filters & tags
│   │   └── api/                # REST endpoints
│   ├── components/             # Reusable UI components
│   │   ├── AppShell.tsx        # Responsive layout shell & demo banner
│   │   ├── ModernDatePicker.tsx# Custom theme-adaptive calendar dropdown
│   │   ├── ConfirmDialog.tsx   # Universal confirmation modal
│   │   ├── LandingPage.tsx     # High-converting public landing page
│   │   └── ...
│   ├── context/                # Global AppContext & theme state
│   ├── lib/                    # Domain logic & services
│   │   ├── db.ts               # SQLite schema, pragmas & migrations
│   │   ├── finance-service.ts  # Financial engine & deterministic calculations
│   │   ├── auth.ts             # Session & multi-profile management
│   │   ├── mailer.ts           # Branded email templates & SMTP delivery
│   │   └── money.ts            # Integer minor-unit currency utilities
│   └── styles/                 # Global styles & design tokens
├── public/
│   ├── manifest.json           # Web App Manifest for mobile installation
│   └── icon.svg                # Vector brand app icon
├── tests/                      # Automated test suite (Vitest)
├── Dockerfile                  # Multi-stage production container
├── docker-compose.yml          # Persistent container orchestration
└── README.md
```

---

## License

MIT License. Designed and engineered for private, personal financial independence.
