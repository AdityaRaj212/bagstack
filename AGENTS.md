<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Bagstack AI Agent & Contributor Guidelines

You are assisting development on **Bagstack** (production: `bagstack.tech`).
These rules apply to all AI coding agents (Antigravity, Claude Code, Cursor, Copilot, etc.) and human contributors.

---

## 1. Branching & Pull Request Rules (CRITICAL)

- **NEVER push directly to `main` or `staging`.**
  - Direct pushes to `main` are strictly forbidden; `main` deploys directly to production.
  - Direct pushes to `staging` are strictly forbidden.
- **Branch Workflow**:
  1. Always branch off the latest `staging` branch:
     ```bash
     git checkout staging
     git pull origin staging
     git checkout -b feat/your-feature-name  # or fix/your-bugfix
     ```
  2. Make changes, test thoroughly, and commit following Conventional Commits (`feat: ...`, `fix: ...`, `chore: ...`).
  3. Push your feature branch to `origin`:
     ```bash
     git push -u origin feat/your-feature-name
     ```
  4. **Open a Pull Request with target branch set to `staging`** (NEVER `main`).
  5. The PR template in `.github/PULL_REQUEST_TEMPLATE.md` must be completed.

---

## 2. Deterministic Financial Math Rules

- **Integer Minor Units Only**:
  - All currency calculations, splits, transaction records, and database rows MUST use integer minor units (paise/cents).
  - NEVER use raw floating point math (`0.1 + 0.2`) for financial balances, totals, or percentage calculations without integer conversion (`Math.round(...)`).
  - Formatting for display must use the app's established currency helpers (e.g. `formatCurrency`).

---

## 3. Security & Anti-IDOR Standards

- **Authentication**:
  - Always validate incoming requests using `getCurrentUser(req)` from `src/lib/auth.ts`.
- **Entity Authorization & Ownership**:
  - Never trust client-provided IDs (`userId`, `profileId`, `transactionId`, `documentId`) without verifying that the authenticated user owns or belongs to the target entity.
- **SQL Injection Prevention**:
  - All database operations in `src/lib/db.ts` or route handlers must use parameterized queries (`db.prepare('... WHERE id = ?').get(id)`).
  - String concatenation or interpolation in SQL queries is strictly prohibited.
- **Sensitive Data Exposure**:
  - Passwords and tokens must be salted and hashed (bcrypt/crypto).
  - Sensitive user data must not be leaked into client-accessible API responses or client-side logs.

---

## 4. Design & UI System Integrity

- **Theme Compliance**:
  - Bagstack features seamless Light and Dark mode switching.
  - Always use theme CSS variables (`var(--bg-primary)`, `var(--text-primary)`, `var(--card-bg)`, `var(--border-color)`) or theme-aware Tailwind classes.
  - Never hardcode arbitrary static colors (e.g., `#ffffff`, `#000000`, `bg-white`, `text-black`) that ruin dark mode visibility.
- **Micro-Interactions**:
  - UI interactions (account switching, delete actions, state toggles) should use smooth, refined transitions and feedback (e.g., gradual opacity fades, subtle spinners). Avoid abrupt or jarring animations.

---

## 5. Verification & Quality Gates

Before declaring any task complete or submitting a PR, verify:
1. `npx tsc --noEmit` — passes with 0 TypeScript compiler errors.
2. `npm test` — all test suites pass without regressions.
3. `npm run build` — Next.js production build succeeds.
