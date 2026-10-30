---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/components/LandingPage.tsx","src/components/Navigation.tsx","src/styles/tokens.css"]
---

# Surface brief: Bagstack app shell + dashboard (whole-app redesign)

Scope: replacement visual world for the whole signed-in app (shell, dashboard, every route, modals) and the public landing page. Visitor mode: Operate for the app; the landing page (src/components/LandingPage.tsx) is Persuade inside the same world.

Audience and job: salaried individuals in India checking balances, logging spends on the phone, reviewing and importing on the desk (see PRODUCT.md). Constraints: integer-minor-unit money, theme variables only, light and dark parity, no flow or navigation changes (muscle memory), Next 16 + vanilla CSS tokens.

Chosen direction: the category standard (canon), executed at the craft level of Copilot Money. Chosen sketch: .impeccable/mocks/decision/canon.html. User guardrails: no generic indigo-SaaS template, no crypto/trading neon.

## Direction contract

THESIS: A modern personal-finance app at Copilot Money's polish: deep graphite surfaces, soft depth, and money that reads instantly. Refuses the slate-plus-indigo Tailwind dashboard the app shipped before.

OWN-WORLD: Graphite ground (#0B0C10) with gradient-lit cards and 1px hairline borders; a light twin on cool paper white. Primary actions are inverted ink pills (light on dark, dark on light), not indigo fills. Periwinkle (#6E7BFF) is for data, selection and focus; mint for money in, coral for money out, amber for due. Geist throughout, tabular figures, 16px card radius.

STORY: The visitor sees net worth and its trend, what came in and went out this month, what is due, and where the money went, then acts: add, import, or drill in.

FIRST VIEWPORT: Left 232px sidebar (gradient mark, nav, active row on raised graphite). Header: greeting + date at left, search and inverted "Add transaction" at right. Row of four KPI cards, each with a sparkline. Then net-worth card spanning three columns with a gradient-filled area chart, beside a spending donut with legend. Recent transactions follow.

FORM: canon (category standard), chosen in the safer re-roll; seed: seed:dc39e3931fbcc570

Signature interaction and motion: charts draw in once on load (stroke reveal, 600ms ease-out), cards lift subtly on hover, figures use tabular nums; all motion off under prefers-reduced-motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
