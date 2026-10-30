---
name: Bagstack
description: Personal Financial Command Center on a graphite ground with a cool-paper twin, at the craft level of modern personal finance.
colors:
  periwinkle: "#5b67f5"
  periwinkle-deep: "#4a55e0"
  periwinkle-wash: "rgba(91, 103, 245, 0.1)"
  mint: "#12b98a"
  ink: "#0b0c10"
  ink-raised: "#262933"
  paper-white: "#ffffff"
  cool-paper: "#f5f6f8"
  paper-subtle: "#f0f1f4"
  paper-hover: "#e9ebf0"
  paper-active: "#dfe2e9"
  text-secondary: "#4a4f5c"
  text-muted: "#646978"
  hairline-subtle: "#eef0f3"
  hairline: "#e3e5ea"
  hairline-strong: "#cdd1d9"
  money-in: "#0b8f63"
  money-in-subtle: "#e3f6ee"
  money-out: "#d93f4c"
  money-out-subtle: "#fdecee"
  transfer: "#2570d4"
  transfer-subtle: "#e8f1fd"
  due-amber: "#b76e00"
  due-amber-subtle: "#fff4e0"
  emi-violet: "#7c4fe0"
  emi-violet-subtle: "#f1ebfd"
  cat-1: "#7c87ff"
  cat-2: "#2bd4a4"
  cat-3: "#ffb547"
  cat-4: "#ff6b81"
  cat-5: "#5ab8ff"
  cat-6: "#b18cff"
  cat-7: "#3dd6d0"
  cat-8: "#ff9f6b"
  cat-9: "#e879c6"
  cat-10: "#c7d65a"
  cat-11: "#8b90a0"
  cat-12: "#6fe38f"
typography:
  display:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(2.25rem, 4.4vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline-section:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(1.6rem, 3vw, 2.1rem)"
    fontWeight: 700
    letterSpacing: "-0.03em"
  figure:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.025em"
    fontFeature: "'tnum'"
  title:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'ss01', 'cv11'"
  label:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
  micro:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 550
  axis:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    fontFeature: "'tnum'"
  mono:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
rounded:
  sm: "8px"
  md: "10px"
  lg: "16px"
  xl: "20px"
  full: "9999px"
spacing:
  2xs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "28px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-white}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.6rem 1.1rem"
  button-primary-hover:
    backgroundColor: "{colors.ink-raised}"
    textColor: "{colors.paper-white}"
  button-secondary:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.6rem 1.1rem"
  button-secondary-hover:
    backgroundColor: "{colors.paper-hover}"
  button-ghost:
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  button-ghost-hover:
    backgroundColor: "{colors.paper-hover}"
    textColor: "{colors.ink}"
  button-icon:
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    size: "36px"
  segmented:
    backgroundColor: "{colors.paper-subtle}"
    rounded: "{rounded.md}"
    padding: "3px"
  segmented-active:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    padding: "0.35rem 0.8rem"
  card:
    backgroundColor: "{colors.paper-white}"
    rounded: "{rounded.lg}"
    padding: "1.25rem"
  input:
    backgroundColor: "{colors.paper-subtle}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.625rem 0.875rem"
  input-focus:
    backgroundColor: "{colors.paper-white}"
  tag-chip:
    backgroundColor: "{colors.paper-subtle}"
    textColor: "{colors.ink}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: "0.2rem 0.6rem"
  badge-income:
    backgroundColor: "{colors.money-in-subtle}"
    textColor: "{colors.money-in}"
    rounded: "{rounded.full}"
    padding: "0.2rem 0.6rem"
  badge-expense:
    backgroundColor: "{colors.money-out-subtle}"
    textColor: "{colors.money-out}"
    rounded: "{rounded.full}"
    padding: "0.2rem 0.6rem"
  nav-link:
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "0.55rem 0.65rem"
  nav-link-active:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
  sidebar:
    backgroundColor: "{colors.cool-paper}"
    width: "240px"
  modal:
    backgroundColor: "{colors.paper-white}"
    rounded: "{rounded.xl}"
    width: "540px"
  brand-mark:
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    size: "28px"
---

# Design System: Bagstack

## Overview

**Creative North Star: "The Category Standard, Crafted"**

Bagstack looks like a modern personal-finance app, deliberately: the category's own grammar (sidebar, KPI row, net-worth trend, spending donut, recent activity) executed at the polish of Copilot Money. The ground is graphite (`#0b0c10` in dark) with a cool-paper light twin (`{colors.cool-paper}`); both themes are first-class and every surface reads from theme variables. Depth comes from hairline borders, gradient-lit neutral cards and soft offset shadows, never from colour glows.

Colour is semantic before it is decorative. Ink carries the primary action, periwinkle carries data, selection and focus, and a fixed set of money colours tells you what a number means before you read it: mint in, coral out, sky for transfers, amber for what is due, violet for EMIs. Figures are set in Geist with tabular numerals so columns and KPI values hold still. Density is moderate: a 4-up KPI grid, 16px gaps, 20px card padding.

Motion is spent once. Charts draw their line in on load; cards lift 2px when they are links; everything else is a 150 to 250ms state transition on an expo-out curve, and all of it collapses under `prefers-reduced-motion`. The two rejected looks are confirmed by the user: never a generic indigo SaaS template, never a crypto or trading terminal.

**Key Characteristics:**
- Graphite ground, cool-paper light twin, full light/dark parity through CSS variables.
- Inverted-ink primary action, one per view.
- Periwinkle reserved for data, selection and focus.
- Fixed semantic money colours; a 12-step category palette assigned by rank.
- Geist only, tabular figures everywhere money appears.
- Hairlines, gradient-lit cards, soft offset shadows, no glows.
- One authored motion moment: charts draw in once.

## Colors

A near-neutral graphite and paper system with one cool accent for data and a disciplined set of semantic money hues.

### Primary
- **Inverted Ink** (`{colors.ink}`, hover `{colors.ink-raised}`): the primary action fill. In dark mode it flips to near-white `#f4f5f8` with ink text, so the primary is always the highest-contrast object on screen rather than a coloured one.
- **Signal Periwinkle** (`{colors.periwinkle}`; dark `#7c87ff`): data lines (net-worth trend, savings sparkline, goal progress), the active nav icon, the active mobile tab, focus outlines and input focus borders, caret and text selection. Its 10% wash (`{colors.periwinkle-wash}`) backs input focus rings and informational icon tiles.

### Secondary
- **Ledger Mint** (`{colors.mint}`; dark `#2bd4a4`): the second stop of the brand mark gradient. As a meaning colour, mint is carried by `{colors.money-in}`.

### Tertiary (semantic money hues)
- **Money In, Mint** (`{colors.money-in}` on `{colors.money-in-subtle}`; dark `#2bd4a4`): income, positive deltas, under-budget progress.
- **Money Out, Coral** (`{colors.money-out}` on `{colors.money-out-subtle}`; dark `#ff6b81`): spending, negative deltas, overspent budgets, liabilities and card debt, destructive actions.
- **Transfer Sky** (`{colors.transfer}` on `{colors.transfer-subtle}`; dark `#5ab8ff`): transfers between own accounts.
- **Due Amber** (`{colors.due-amber}` on `{colors.due-amber-subtle}`; dark `#ffb547`): due soon, caution, demo-mode notices. The "Due in the next 7 days" KPI turns amber only when something is due.
- **EMI Violet** (`{colors.emi-violet}` on `{colors.emi-violet-subtle}`; dark `#b18cff`): loan EMIs.
- **Category palette** (`{colors.cat-1}` to `{colors.cat-12}`): a bright 12-hue set shared by both themes for charts, tags and account colours. `cat-11` (slate grey) is reserved for "Other".

### Neutral
- **Cool Paper** (`{colors.cool-paper}`; dark graphite `#0b0c10`): app and sidebar ground.
- **Paper White** (`{colors.paper-white}`; dark `#121419` surface, `#181b22` elevated): cards, modals, popovers, active segment and active nav row.
- **Paper Subtle / Hover / Active** (`{colors.paper-subtle}`, `{colors.paper-hover}`, `{colors.paper-active}`; dark `#16181f`, `#1e212a`, `#272b36`): input wells and segmented tracks, hover fills, progress tracks and donut rings.
- **Text** (`{colors.ink}` primary, `{colors.text-secondary}` secondary, `{colors.text-muted}` muted; dark `#f4f5f8`, `#a3a7b4`, `#7d8291`).
- **Hairlines** (`{colors.hairline-subtle}`, `{colors.hairline}`, `{colors.hairline-strong}`; dark `#1a1d24`, `#23262f`, `#323642`): every border is 1px and drawn from these three.

### Named Rules
**The Ink Primary Rule.** The primary action is an inverted-ink fill, never a periwinkle or indigo fill, and there is exactly one per view. Persistent chrome actions (the sidebar's "Record Transaction", Import) are secondary.

**The Periwinkle Reserve Rule.** Periwinkle marks data, selection and focus. It is never a button fill and never display or heading text.

**The Money Means Rule.** Mint is money in, coral is money out (card debt included), sky is a transfer, amber is due or caution, violet is an EMI. Never use these hues decoratively, and never swap them.

**The Rank Rule.** Chart categories take `--cat-N` by rank (largest slice is `cat-1`), with "Other" on `cat-11`. Colour encodes order, not identity.

## Typography

**Display Font:** Geist (via next/font as `--font-geist`, with -apple-system, Segoe UI, Roboto fallback)
**Body Font:** Geist
**Label/Mono Font:** Geist Mono (`--font-geist-mono`), loaded for code-like strings only

**Character:** One neutral grotesk carries the whole product, tightened with negative tracking at large sizes and set with `ss01`/`cv11` alternates at the root. Hierarchy comes from weight (400 to 700, including the variable 550 and 650 steps) and size, not from a second face.

### Hierarchy
- **Display** (700, `clamp(2.25rem, 4.4vw, 3.75rem)`, 1.08, -0.035em, max 14ch): landing hero headline only.
- **Headline** (650, 1.625rem, 1.2, -0.025em): page titles in the app; paired with a 0.875rem muted subtitle.
- **Headline Section** (700, `clamp(1.6rem, 3vw, 2.1rem)`, -0.03em): landing section heads.
- **Figure** (650, 1.5rem, 1.2, -0.025em, tabular): KPI values and headline money figures.
- **Title** (600, 0.9375rem, -0.01em): card titles.
- **Body** (400, 0.875rem, 1.5): rows, descriptions, form values. Landing lede runs at up to 1.15rem, 1.6 leading, 52ch.
- **Label** (500, 0.8125rem, muted): card labels, deltas, form labels (550, secondary).
- **Micro** (550, 0.75rem): badges, chips, keyboard hints.
- **Axis** (400, 11px, tabular, muted; the last point's label at 600 in primary text): chart axes.

### Named Rules
**The Tabular Money Rule.** Every money figure, percentage, axis tick and subtotal uses tabular numerals (`.tabular`, `.kpi-value`, `.kpi-delta`).

**The One Face Rule.** Geist throughout. No second display face, no serif, no system-font display.

## Layout

A fixed 240px sidebar on desktop beside a centred content column (max 1280px, padding 1.75rem 2rem 3rem). Pages open with a header row: headline plus one-line subtitle on the left, secondary then primary actions on the right.

The dashboard uses a 4-column grid with 16px gaps: four KPI cards (Income, Spent, Saved, Due in the next 7 days), each with a 36px sparkline; then the net-worth card spanning three columns beside the spending donut; then content cards. At 1100px the grid drops to two columns and spanning cards go full width; at 560px gaps tighten to 10px, KPI padding to 0.9rem and KPI figures to 1.125rem.

At 768px and below the sidebar disappears for a frosted bottom tab bar with a centred inverted-ink round add button; content padding drops to 0.875rem with 85px bottom clearance. The landing page uses a 1160 to 1240px column, a two-column hero (copy 0.9fr, product preview 1.1fr) that stacks at 1024px, and a 3-up pillar grid (2-up at 900px, 1-up at 560px).

Spacing rhythm is a 4px base: 4, 8, 12, 16, 20, 28, 32px, with 20px card padding as the default inner measure.

## Elevation & Depth

A hybrid: hairline borders and a near-flat vertical surface gradient do most of the work, and soft, negative-spread offset shadows add depth that grows with state. Shadows are neutral (ink-tinted in light, black in dark) and never coloured.

### Shadow Vocabulary
- **Rest** (`box-shadow: 0 1px 2px 0 rgba(16, 18, 27, 0.05)`): cards, primary button, active segment, active nav row.
- **Lift** (`box-shadow: 0 8px 24px -12px rgba(16, 18, 27, 0.16), 0 2px 6px -2px rgba(16, 18, 27, 0.06)`): hovered interactive cards and primary button.
- **Float** (`box-shadow: 0 18px 40px -18px rgba(16, 18, 27, 0.22), 0 4px 10px -4px rgba(16, 18, 27, 0.06)`): dropdowns, demo banner, mobile add button.
- **Showcase** (`box-shadow: 0 28px 56px -24px rgba(16, 18, 27, 0.28)`): the landing product preview.
- **Modal** (`box-shadow: 0 32px 80px -24px rgba(16, 18, 27, 0.35)`): dialogs over a blurred scrim.

### Named Rules
**The No Glow Rule.** Shadows are soft, offset and neutral. No coloured glows, no hard offset shadows.

**The Lift-on-Link Rule.** Only cards that navigate or act (`card-interactive`) lift, by 2px with the Lift shadow. Static cards only darken their hairline on hover.

## Shapes

Softly rounded rectangles on a 1px hairline. Controls (buttons, inputs, segmented, nav rows, list rows) use the gently curved 10px radius; segments and menu items inset it by their 3px padding. Cards are 16px, modals 20px, the brand mark and small icon tiles 8px. Chips, badges, progress bars and avatars are full pills or circles. Legend swatches are 8px squares with 3px corners. Chart lines use round caps and monotone curves; axes snap to round steps (1, 2, 2.5 or 5 times a power of ten) with a solid baseline and dashed gridlines.

The only chromatic gradient is the brand mark: a 135deg periwinkle-to-mint tile with a dark ink glyph. Neutral surface gradients on cards and the fading area fills under chart lines are native to the world and are not decoration.

## Components

### Buttons
Quiet and confident: neutrals everywhere, ink for the one thing to do.
- **Shape:** gently curved (10px); landing CTAs 12px; the mobile add button is a full circle.
- **Primary:** inverted ink fill with paper text, 600 weight, 0.875rem, padding 0.6rem 1.1rem, Rest shadow.
- **Hover / Focus:** hover raises to `{colors.ink-raised}` (dark: pure white), rises 1px with the Lift shadow, settles on press. Focus is a 2px periwinkle outline at 2px offset on every control.
- **Secondary:** surface fill, 1px hairline, ink text, 550 weight; hover fills with the hover neutral and strengthens the hairline.
- **Ghost:** no fill, secondary text; hover fills neutral and promotes text to primary.
- **Icon:** 36px square, ghost behaviour.
- **Disabled:** 50% opacity, not-allowed cursor.

### Segmented control
A sunken track (subtle fill, subtle hairline, 3px padding) holding text buttons in muted 0.8125rem; the pressed segment becomes an elevated surface with primary text and the Rest shadow. Used for the Net worth / Cash flow chart switch.

### Chips
- **Style:** tag chips are pills with subtle fill, hairline border and primary 0.75rem text; the remove control turns coral on hover. Badges are borderless pills tinted by meaning (income, expense, transfer, neutral).
- **State:** chips have no selected variant; meaning lives in badge tint.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** the neutral surface gradient (light `#ffffff` to `#fbfbfc`; dark `#15171e` to `#111319`).
- **Shadow Strategy:** Rest at rest; Lift on interactive hover (see Elevation & Depth).
- **Border:** 1px hairline, strengthening on hover.
- **Internal Padding:** 20px; titles at Title, labels at Label.

### Inputs / Fields
- **Style:** subtle-fill well, 1px hairline, 10px radius, 0.625rem 0.875rem padding, periwinkle caret; selects carry an inline chevron.
- **Focus:** fill lifts to surface, border turns periwinkle, plus a 3px periwinkle-wash ring.
- **Dropdowns:** elevated surface, strong hairline, Float shadow, 160ms pop-in; items highlight with the hover neutral.

### Navigation
- **Sidebar:** 240px on the app ground with a right hairline. Top to bottom: brand lockup (28px gradient mark, 650-weight wordmark), profile switcher (surface row with an initials avatar), secondary "Record Transaction", a search trigger with a ⌘K key hint, nav links, then a footer of ghost actions.
- **Nav links:** 0.875rem, 500, secondary text; hover fills neutral; the current page becomes a raised surface row (inset hairline plus Rest shadow) at 600 weight with a periwinkle icon.
- **Mobile:** a frosted bottom tab bar (surface at 86% with 16px blur), periwinkle for the active tab, and a centred inverted-ink circular add button ringed by the app ground.

### Modals
Elevated surface, 20px radius, hairline, Modal shadow, max 540px, over a blurred (6px) ink scrim; enter with a 260ms slide-up and scale from 0.98.

### KPI Card (signature)
Label, Figure, a delta line (coloured arrow and percentage, muted comparison text) and a 36px sparkline whose line draws in and whose area fades from 28% of the series colour to transparent. The Due KPI is a link card: its figure is amber when items are due and names the next bill.

### Trend Chart (signature)
Monotone curves with round caps, a 2.5px lead series and 2px secondary series, a gradient area fill under filled series, an end-point dot ringed in the surface colour, round-step tabular axis ticks, and a legend of 8px swatches. Net worth runs in periwinkle; Cash flow pairs mint income with coral spend.

### Spending Donut (signature)
A 14px ring on the active-neutral track, slices coloured by rank from the category palette with "Other" on `cat-11`, the period total centred in tabular figures, and a legend of name and percentage.

### Motion
Charts draw in once: the stroke reveals over 900ms on the expo-out curve after 120ms, area fills and dots fade in over 700ms after 300ms. State transitions run 150ms (fast) or 250ms (normal) on `cubic-bezier(0.16, 1, 0.3, 1)`. Under `prefers-reduced-motion` every animation and transition collapses to 1ms.

## Do's and Don'ts

### Do:
- **Do** read every colour, shadow and radius from the theme variables in `src/styles/tokens.css` so light and dark stay in parity.
- **Do** make the one primary action per view an inverted-ink button (`.btn-primary`); make everything else secondary or ghost.
- **Do** keep periwinkle for data series, the current selection and focus.
- **Do** colour money by meaning: mint in, coral out (including card debt), sky transfer, amber due, violet EMI.
- **Do** assign chart categories from `--cat-1` to `--cat-12` by rank, with "Other" on `--cat-11`.
- **Do** set every figure in tabular numerals and snap chart axes to round steps.
- **Do** use 1px hairlines, 16px card radius, 10px control radius and the soft offset shadow scale.
- **Do** lift only interactive cards, by 2px, and let charts draw in exactly once.
- **Do** honour `prefers-reduced-motion`.

### Don't:
- **Don't** ship a generic indigo SaaS template: no indigo or periwinkle button fills, no slate-plus-indigo dashboard.
- **Don't** drift toward a crypto or trading terminal: no neon, no coloured glows, no ticker density.
- **Don't** use periwinkle for headings, display text or button fills.
- **Don't** add a second display face or set display type in a system font.
- **Don't** add gradients beyond the brand mark, the neutral card surface and chart area fills.
- **Don't** hardcode hex colours in new UI; the persisted user palettes in CategoryModal, PayeeTagManagerModal, BankAndCreditAccountModal and TransactionModal store hex by design and are the only sanctioned exception.
- **Don't** add new inline-style surfaces; many routes still carry inline styles as debt, and new work should use the shared classes in `src/styles/globals.css`.
- **Don't** mirror the category palette in hex; `/reports` still carries a `DONUT_PALETTE` hex copy as debt, and it should read `--cat-N`.
- **Don't** add uppercase tracked micro-labels or kickers above titles; label with sentence-case card labels.
