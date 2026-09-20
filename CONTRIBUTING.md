# Contributing to Bagstack

Thank you for your interest in contributing to **Bagstack** — the personal financial command center!

To maintain a secure, deterministic, and highly reliable financial application in production, all contributors (both human developers and AI coding agents) must adhere to the following workflow and standards.

---

## 🌳 Branching & Deployment Model

We strictly enforce a two-tier release flow:

```
[ Feature Branch (feat/* or fix/*) ]
                  │
                  ▼ (Pull Request)
         [ staging branch ] ──────────► Auto-deploys to Staging Environment
                  │
                  ▼ (Release PR after validation)
          [ main branch ]   ──────────► Auto-deploys to Production (bagstack.tech)
```

1. **`main` (Production)**:
   - Contains the live code served at **[https://bagstack.tech](https://bagstack.tech)**.
   - **Direct pushes are strictly blocked**.
   - Code enters `main` only via pull requests merged from `staging`.
2. **`staging` (Pre-Production)**:
   - Integration branch for testing upcoming features and bug fixes.
   - **All contributor PRs MUST target `staging`**.
3. **Feature Branches**:
   - Always branch off `staging`:
     ```bash
     git checkout staging
     git pull origin staging
     git checkout -b feat/your-feature-name
     ```
   - Naming convention:
     - `feat/<short-description>` (new features)
     - `fix/<short-description>` (bug fixes)
     - `refactor/<short-description>` (code refactoring)
     - `perf/<short-description>` (performance improvements)

---

## 💻 Local Development Setup

### 1. Prerequisites
- **Node.js**: v20.x or later
- **npm**: v10.x or later

### 2. Installation
```bash
git clone https://github.com/AdityaRaj212/bagstack.git
cd bagstack
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Configure your email credentials for passwordless OTP authentication (Google App Password or Resend API key).

### 4. Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📐 Core Engineering Standards

### 1. Deterministic Minor-Unit Financial Math
- **CRITICAL RULE**: Never store or calculate money using floating-point decimals.
- All monetary values in SQLite, service logic, and database schemas are strictly stored in **integer minor units** (e.g., paise for INR, cents for USD).
- ₹500.00 is stored as `50000`.
- Format values for display using `formatMoney()` or the `<MoneyDisplay />` component.
- Parse user inputs using `toMinorUnits()` and `parseIndianNumber()`.

### 2. Security & Tenant Isolation
- **Authentication**: All API endpoints handling user data must call `getCurrentUser(req)`.
- **No Spoofing**: Never accept client-supplied user IDs without cryptographic session validation (`apex_session_token`).
- **Authorization (IDOR Prevention)**: Ensure that every update or deletion operation checks that the entity belongs to the requesting user's `owner_email` or `user_id`.
- **SQL Injection**: Never use string interpolation (`${val}`) in raw SQL queries. Always use parameterized queries with `?` placeholders.

### 3. Design Aesthetics & Styling
- Pure Vanilla CSS with centralized design tokens in `src/styles/globals.css`.
- Support both Light and Dark modes seamlessly via CSS variables (`--bg-surface`, `--text-primary`, `--border-subtle`, etc.).
- Ensure responsive mobile layouts with native touch-friendly padding.

---

## 🧪 Testing & Verification Requirements

Every change must pass all automated checks before a pull request can be merged:

```bash
# 1. Typecheck (Must pass with 0 errors)
npx tsc --noEmit

# 2. Run Test Suite (Must pass 100% of tests)
npm test

# 3. Verify Production Next.js Build
npm run build
```

---

## 📝 Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new user-facing feature
- `fix:` A bug fix
- `docs:` Documentation changes
- `style:` Formatting, missing semicolons, etc.
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Maintenance tasks, dependency updates, CI workflows

*Example:*
```bash
git commit -m "feat(accounts): add credit card utilization progress bar"
git commit -m "fix(transactions): resolve date grouping timezone offset"
```

---

## 🚀 Submitting a Pull Request

1. Push your feature branch to your fork or origin:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Open a Pull Request on GitHub.
3. **Verify the base branch is `staging`** (NOT `main`).
4. Fill out the PR template checklist.
5. Ensure the automated GitHub Actions CI checks pass (`verify` job).
6. Request a review from the maintainers.
