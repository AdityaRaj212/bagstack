# Bagstack — Personal Financial Command Center

> **A production-grade, local-first personal financial command center built with deterministic financial math, multi-account ledgering, automated recurring obligations, deep analytics, and PWA mobile support.**

🌐 **Live Production App**: [https://bagstack.tech](https://bagstack.tech)

---

## Highlights & Features

### 🏦 Multi-Account & Multi-Profile Ledger
- **Financial Account Diversity**: Seamlessly track Savings, Checking, Credit Cards (with credit limits and billing cycle dates), Cash, Investments, and Loans.
- **Email-Scoped Workspaces**: One master verified email account with unlimited compartmentalized profiles (e.g., Personal, Business, Side-Hustle).
- **First-Class Transfers**: Move money between accounts without artificially inflating income or expense metrics.

### 🤖 AI Statement Import & Natural-Language Questions
- Import bank statements (CSV, text, PDF) and receipt photos. Every row the model extracts passes schema, integer-amount, date, source-grounding, running-balance and reconciliation checks before you can post it.
- Ask questions in plain English. The model can only pick from typed, read-only, profile-scoped queries. See [AI Assistant](#ai-assistant-the-llm-proposes-deterministic-code-decides).

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

## AI Assistant: the LLM proposes, deterministic code decides

Bagstack can read bank statements and receipts and answer questions like *"how much did I spend on food last month?"*. The model is never trusted with money: it only **proposes** structured data or picks a **read-only query**, and integer-only code decides what, if anything, reaches the ledger.

```
 document (CSV / text / PDF / image)
        │
        ▼
 ┌──────────────────┐   zod schema: { date, amount: "1245.50", merchant, direction, balance_after }
 │ LLM extraction   │── structured output, re-validated with zod on arrival
 └──────────────────┘
        │ proposal
        ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ Deterministic validation (src/lib/ai/validation.ts)          │
 │  • decimal string → integer paise with BigInt, no floats;   │
 │    excess precision rejected, never rounded                  │
 │  • date sanity: real calendar date, not future, < 10 years,  │
 │    inside the printed statement period                       │
 │  • grounding: every amount and date must appear in the       │
 │    source text (catches hallucinated / mistyped values)      │
 │  • running-balance chain: prev balance ± amount = printed    │
 │    balance, row by row (either print order)                  │
 │  • reconciliation: opening + Σ rows = closing, or receipt    │
 │    total; a mismatch blocks the *whole* document             │
 │  • duplicates: within the document and against the ledger   │
 │  • currency must match the target account                    │
 └──────────────────────────────────────────────────────────────┘
        │ validated rows            │ rows with reasons
        ▼                           ▼
   user confirms             review queue (edit / approve soft
        │                    reasons / skip / remove / add row),
        ▼                    re-validated after every change
 FinanceService.createTransaction  ◄── the only write path; the batch is
                                       re-validated server-side right before posting
```

**Auto-categorisation**: existing rules and merchant history run first. The model fills gaps, choosing only from the profile's own category list. Any answer that isn't one of those categories, or has the wrong income/expense type, is dropped, and the row stays uncategorised.

**Natural-language queries**: the model picks one of 8 typed, read-only query functions (`total_spending`, `total_income`, `spending_by_category`, `top_merchants`, `account_balances`, `list_transactions`, `compare_spending`, `average_monthly_spending`) via strict tool use. It never writes SQL. Arguments are re-validated with zod (category names are an enum of the user's categories; periods are presets resolved by code). The profile id comes from the authenticated session when the executor is built and is never a tool argument. All SQL is static and parameterised. The answer sentence is formatted by code from the query result, so the model never produces the numbers shown to the user.

**Provider adapter** (`src/lib/ai/provider.ts`): a two-method interface (`generateStructured`, `chooseTool`) with three implementations:
- **Google Gemini** (`gemini-3.8-flash` by default, free tier). Uses schema-constrained JSON and function calling, and reads PDFs and images natively. Schemas are normalized to Gemini's documented JSON Schema subset.
- **Anthropic** (Claude Opus 5.5 by default, server-side refusal fallback enabled).
- **Offline**: a deterministic rules engine.

The provider is picked by `AI_PROVIDER`, or by whichever key is set (Gemini first). All three feed the same zod re-validation and the same deterministic checks, so switching provider only changes how well rows are transcribed, never what is allowed to post. Both are wrapped in `ResilientProvider`, which adds a per-attempt timeout, bounded exponential backoff on retryable errors (429/5xx/timeouts), and one `ai_usage_log` row per call (tokens, integer micro-USD cost, latency, attempts). Free-tier 429s are retried after the server-suggested delay. The hosted demo also has per-profile rate limits and a daily per-profile and global cost budget. With no API key, the app falls back to the offline engine, which reads text and CSV only.

> **Data use on Gemini's free tier:** Google's pricing page states that free-tier content is used to improve Google's products. That is fine for the demo sandbox and the synthetic eval set. For real users' bank statements, use a paid tier (Gemini or Anthropic).

### Eval

`tests/eval/` holds **33 labelled synthetic documents** (21 statements across 7 bank layouts, 5 receipts, 7 adversarial cases: misprinted closing balance, future-dated row, overlap with existing ledger rows, identical twin rows, prompt injection in a narration, a USD receipt into an INR account, and a wrong running balance). It also holds **20 NL questions** whose answers were computed by an independent reference implementation over a fixture ledger, including two that must not map to any tool (a delete request and an off-topic question).

```bash
npm run eval                                  # offline provider
npm run eval:faults                           # + 2 simulated LLM errors per document
GEMINI_API_KEY=... npm run eval -- --provider gemini        # free tier, paced to 8 req/min
ANTHROPIC_API_KEY=... npm run eval -- --provider anthropic
```

Live model responses are recorded under `tests/eval/cache/<model>/`. A run cut off by a free-tier daily quota resumes where it stopped, and anyone can re-score a committed recording without a key. Pass `--no-cache` for fresh calls and `--rpm N` to change pacing.

The headline metric is **unreconciled postings**: postings that reach the ledger but don't match a labelled, postable row. The target is 0, and CI enforces it in `tests/ai-eval.test.ts`.

Fault injection simulates typical extraction errors on top of the provider output: decimal shift, digit typo, flipped debit/credit, swapped day/month, dropped row, hallucinated row, fabricated credit, and misread balance.

| Metric | Offline baseline | Offline + 55 injected faults |
|---|---|---|
| Labelled rows / extracted | 274 / 274 | 274 / 279 |
| Field accuracy: date / amount / direction / merchant | 99.6% / 100% / 100% / 100% | 94.5% / 89.8% / 94.9% / 96.0% |
| Category accuracy | 96.0% | 95.1% |
| Rows held for review by validation | 51 | 171 |
| Postings after confirm (all correct) | 223 | 108 |
| **Unreconciled postings reaching ledger** | **0** | **0** |
| NL: correct tool / correct result (20 q) | 100% / 100% | n/a |

Full tables (per sample, per reason, per question) are in `tests/eval/results/`.

How to read these numbers:
- The offline engine is a rules-based baseline written alongside these synthetic layouts. Its extraction accuracy is an upper bound for familiar formats, not a claim about real-world statements.
- The fault-injection column measures the validation layer itself: 55 realistic model errors, and none produced a wrong ledger entry.
- The price is recall. On a tampered statement, correct rows are held too, because reconciliation is a document-level gate.
- Gemini and Claude results are not included yet. Run the commands above to produce `tests/eval/results/<provider>.md`, including token usage and list-price cost.

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
Run the AI eval (see [Eval](#eval)):
```bash
npm run eval && npm run eval:faults
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
│   │   ├── assistant/          # AI import review queue & NL questions
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
│   │   ├── ai/                 # Provider adapter, validation, review queue, query tools
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
│   └── eval/                   # Labelled AI eval set, fault injection & results
├── Dockerfile                  # Multi-stage production container
├── docker-compose.yml          # Persistent container orchestration
└── README.md
```

---

## License

MIT License. Designed and engineered for private, personal financial independence.
