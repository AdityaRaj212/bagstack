# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Installable PWA (`public/manifest.json`, standalone display). Mobile web remains web; there is no native app.

## Users

The builder and people like them: salaried individuals in India who juggle several bank accounts, credit cards, loans, subscriptions and savings goals, and want one honest ledger instead of a bank app per account plus a spreadsheet.

They use it in two modes, roughly equally:
- **On the phone (installed PWA):** quick capture — log a transaction, mark a subscription paid, check a balance.
- **On the desktop:** sit-down review — import and reconcile statements, read reports, compare months, adjust budgets and goals.

## Product Purpose

Bagstack is a personal financial command center (live at `bagstack.tech`). It keeps a multi-account, multi-profile ledger whose numbers are always exactly right, and turns it into balances, budgets, recurring obligations, goal progress, forecasts and month-over-month analysis.

Success means the user trusts every figure without double-checking it against their bank, and spends less time on data entry because statements can be imported safely.

## Positioning

Bagstack owns all four of these together; a generic budgeting app cannot honestly claim the set:

1. **Deterministic money.** Every amount is stored and computed in integer minor units (paise/cents). No floating-point drift; insights derive from the transaction ledger.
2. **AI that can't touch money.** The LLM only proposes structured rows or picks a typed, read-only, profile-scoped query. Deterministic validation (schema, integer amounts, dates, source grounding, running balance, reconciliation) decides what reaches the ledger. The eval's headline metric is zero unreconciled postings, enforced in CI.
3. **One command center.** Savings, checking, credit cards (limits, billing cycles), cash, investments and loans; subscriptions with auto-deduction; goals; budgets; reports; first-class transfers that don't inflate income or expense. One verified email holds multiple compartmentalized profiles (e.g. Personal, Business).
4. **Privacy / local-first.** SQLite storage, self-hostable (Docker, or Render + Turso). No bank-login aggregation; data enters by hand or by user-supplied statements.

## Operating Context

- Passwordless sign-in by 6-digit email OTP; a one-click demo sandbox with preloaded sample data from the public landing page.
- Statement import accepts CSV, text, PDF and receipt photos; extracted rows are reviewed before posting.
- Natural-language questions ("how much did I spend on food last month?") answered from the ledger via read-only queries.
- Command palette, transaction modal, import modal and account modal are global, available from any screen.
- Light and dark themes, following the system preference with a manual override (`fm_theme`).

## Capabilities and Constraints

- Default base currency INR (₹, paise); per-profile `base_currency` exists. Display goes through the app's currency helpers (`formatCurrency`, `MoneyDisplay`).
- Financial math is integer-only; floating-point balances are prohibited (see AGENTS.md).
- Routes: dashboard, accounts, transactions, budgets, goals, investments, loans, subscriptions, reports, assistant.
- Destructive actions (account, profile, goal, subscription deletion; sign-out) always go through a confirmation dialog.
- AI providers: an offline rules-based engine, Gemini (free tier, not for real statements because of data-use terms), and Anthropic. Free-tier providers are for demo and synthetic eval only.
- Stack is fixed by the codebase: Next.js 16 App Router, React 19, TypeScript, vanilla CSS with design tokens (no Tailwind), Lucide icons.

## Brand Commitments

- Name: **Bagstack**. Descriptor: **Personal Financial Command Center**.
- App icon: `public/icon.svg`.
- Explanations of the AI layer use the phrasing "the LLM proposes, deterministic code decides".
- Visual bar (chosen 2026-10-31): the modern personal-finance standard, executed at the craft level of Copilot Money. It must not read as a generic indigo SaaS template or a crypto/trading terminal.

## Evidence on Hand

- AI eval: 33 labelled synthetic documents and 20 NL questions in `tests/eval/`; results in `tests/eval/results/offline.md` and `offline-faults.md` (0 unreconciled postings; 55 injected faults, none reached the ledger). Gemini and Anthropic results do not exist yet.
- Demo sandbox data is synthetic. Figures shown on the landing page preview (e.g. "+14.2% from last month", "Savings rate: 71%") are illustrative sample values, not user outcomes.
- No testimonials, user counts, press, partner banks or security certifications exist. Do not fabricate any.

## Product Principles

1. **Exactness is the product.** A number that might be wrong is worse than no number; never round, estimate or approximate where the ledger can be exact, and say plainly when something is a forecast.
2. **Proposals are visible, decisions are explicit.** Anything automated (AI extraction, auto-deductions, recurring rolls) is shown as a proposal or an audit trail the user can inspect before or after it affects balances.
3. **Fast in the pocket, deep at the desk.** Capture flows must be quick on a phone; review flows can be dense on a desktop. Neither mode is the secondary one.
4. **The user's data stays the user's.** No dark patterns, no upsell into sharing credentials, and clear separation between profiles.
