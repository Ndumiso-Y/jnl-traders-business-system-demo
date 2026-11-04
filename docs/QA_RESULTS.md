# QA results — 04 November 2026

Evidence rule: a row is **PASS** only where the command output or browser capture below shows it. Anything
not directly observed is marked as such.

## Commands (actual output, 04 Nov 2026 ~23:50 SAST, Windows 11, Node 24.14.0)

```
> tsc -b                       (no errors)
> eslint src                   (no errors, no warnings)

> vitest run
 ✓ tests/money.test.ts (14 tests) 10ms
 ✓ tests/requests.test.ts (5 tests) 3ms
 ✓ tests/pdf.test.ts (2 tests) 41ms
 Test Files  3 passed (3)
      Tests  21 passed (21)

> vite build
dist/index.html                            1.00 kB │ gzip:   0.51 kB
dist/assets/index-hWdKkRFV.css            23.88 kB │ gzip:   6.11 kB
dist/assets/purify.es-CAi2OJFm.js         30.47 kB │ gzip:  11.73 kB
dist/assets/index.es-BogGrTkW.js         159.76 kB │ gzip:  53.55 kB
dist/assets/html2canvas.esm-B0tyYwQk.js  202.36 kB │ gzip:  48.04 kB
dist/assets/pdf-UN0bpbpM.js              424.33 kB │ gzip: 138.78 kB   (lazy-loaded only when a PDF is requested)
dist/assets/index-DAPuPGLj.js            473.36 kB │ gzip: 142.50 kB
✓ built in 4.27s

> playwright test   (Chromium headless 156, local dev server)
  15 passed (37.1s)   1 skipped (live spec; runs only with LIVE_URL)

> LIVE_URL=https://ndumiso-y.github.io/jnl-traders-business-system-demo/ playwright test e2e/live.spec.ts
  1 passed (3.2s)
```

Earlier in the day the first full Playwright run reported **4 failed / 11 passed**. The failures were real defects and
were fixed before the final run (see "Defects found and fixed").

## Must-pass validation matrix

| # | Requirement | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Online Pages URL loads from a clean browser; CSS/JS/images under the repo subpath; in-app navigation; hard refresh no 404 | **PASS** | `curl` 200 for `/`, CSS and JS; `e2e/live.spec.ts` (fresh Chromium context: loads, navigates to Finance, deep-links `#/fleet`, reloads, asserts sidebar CSS applied, no 4xx responses, no console errors) |
| 2 | GitHub Actions publishes on a new commit to main | **PASS** | Runs 41913772772 (5602b85), 41917014574 (af6e7b5), 41918968121 (143e530) all build ✓ deploy ✓ — see `docs/DEPLOYMENT_STATUS.md` |
| 3 | 2 × R100 excl VAT at 15% = R230.00 | **PASS** | `tests/money.test.ts`; `e2e/demo.spec.ts` Finance test asserts subtotal R200.00, VAT R30.00, grand total R230.00 in the rendered UI |
| 4 | VAT-inclusive prices | **PASS** | Unit: R230 incl → R200 + R30. Browser: 2 × R100 inclusive → total R200.00, VAT R26.09 |
| 5 | Discounts | **PASS** | Unit: mockup example R4,000 − R400 + R540 = R4,140. Browser: 10% on R200 → discount −R20.00, total R207.00 |
| 6 | Awkward rounding | **PASS** | Unit + browser: 3 × R33.33 → R99.99 + R15.00 = R114.99; sum of rounded lines equals document total; 1.005 rounds to 1.01 |
| 7 | Invalid input / zero-value handling | **PASS** | Browser: qty 0 → "Quantity must be greater than zero."; price −5 → "Price cannot be negative."; save blocked; empty customer name blocked; payment above balance rejected with message |
| 8 | Quote-to-invoice retains totals and new identifier | **PASS** | Browser: Q-D0104 (R230.00) → INV-D0210 (R230.00), balance R230.00, quotation locked as "Converted" |
| 9 | PDF file actually opens and contains fictional items | **PASS** | Playwright download saved to `qa/screenshots/INV-D0210-DEMO.pdf` (10 307 bytes, starts `%PDF-1.3`, contains "DEMONSTRATION / NOT A VALID TAX INVOICE" ×2, the item "Demo item" and the invoice number). Unit test parses jsPDF output for stamp, number, item, total and customer. Opening in a desktop PDF viewer was **not** independently observed. |
| 10 | Statement changes after recording a fictional payment | **PASS** | Browser: INV-D0210 R230.00 debit, R100.00 credit, running balance updated; stats Total received / Balance change; survives reload |
| 11 | Requester cannot approve/reject | **PASS** | Browser: Approve and Reject disabled with reason tooltip + amber notice; store rule unit-tested |
| 12 | Manager/Owner can process; manager cannot approve own; owner can | **PASS** | Browser tests "requester blocked; manager approves…" and "manager cannot approve own request; owner can" |
| 13 | Finance sees approved request, raises PO | **PASS** | Browser: "Finance review: this request is approved…" notice, PO-D014 raised, history entry "Purchase order raised", linked PO panel |
| 14 | Status history and dashboard change | **PASS** | History timeline shows role, timestamp and comment; Overview pending count and Recent activity update |
| 15 | Fleet renewal due/overdue changes with dates | **PASS** | Browser: FLT-003 licence Overdue → On track after date change; Fleet "Overdue renewals" count decrements; Overview "Upcoming attention" list recalculates |
| 16 | Edited records update reports and dashboard | **PASS** | Browser: recording a cost changes Reports "Recorded costs" and the cost register; invoices/payments change Overview and Reports totals |
| 17 | Records survive reload in the same browser; reset warns | **PASS** | Browser: new customer persists after reload; Settings → Reset shows confirmation ("cannot be undone"); after confirm the record is gone and seed restored. Separate browsers/devices hold separate state (by design, documented) |
| 18 | 1440 / 1024 / 768 / 390 px readable, no horizontal overflow, actions reachable | **PASS** | `document.scrollWidth − innerWidth ≤ 0` asserted on Overview, Quotation editor, Fleet, Procurement, Reports at each width; drawer navigation tested at 768 and 390; screenshots in `qa/screenshots/` |
| 19 | Keyboard support / focus states | **PASS (partial)** | Tab order reaches nav links and Enter activates (tested); visible gold focus ring via `:focus-visible`; Escape closes dialogs; table rows focusable with Enter/Space. A full screen-reader audit was **not** performed. |
| 20 | Build, lint/typecheck, unit tests, browser tests | **PASS** | Output above |
| 21 | Visual comparison with four PNGs, ≤3 corrections per pass, ≤3 passes | **DONE — 2 passes** | See below |
| 22 | Online app verified after the last update | **PASS** | Live spec run against the Pages URL after the final deploy (see DEPLOYMENT_STATUS for the SHA) |

## Defects found and fixed during QA (real failures, not invented)

| Found by | Defect | Fix |
| --- | --- | --- |
| Playwright "all modules load…" | Settings page crashed with "Maximum update depth exceeded" — zustand selector returned a new object each render | `useShallow` selector |
| Playwright "recording a cost…" | Seeded expenses dated in the future (e.g. 25 Nov) so a new cost was not first in the register | Seed clamps dates to today |
| Playwright mobile-390 | Overview overflowed by 82 px, Quotation editor by 145 px, Reports by 125 px | Responsive grids use `minmax(0, 1fr)`; `.table-wrap` made `position: relative` so the sr-only label no longer escapes the scroll container |
| Built-in browser console | "controlled → uncontrolled input" warning when converting quotation → invoice (React reused the editor instance across routes) | Editor keyed by `kind-id` |
| Unit test | `toLocaleString('en-ZA')` grouped thousands with spaces on Node | Explicit comma grouping |
| Unit test | `1.005 × 100` rounded down due to binary float noise | Epsilon in `roundCents` |

## Visual comparison log (against the four selected PNGs)

Captures: `qa/screenshots/desktop-1440-*.png`, `desktop-1024-*.png`, `tablet-768-*.png`, `mobile-390-*.png`
(+ `*-nav-open.png` for the drawer).

**Pass 1 (1440 px, Overview / Fleet / Quotation vs 01 / 02 / 03)** — top three real mismatches, corrected:
1. Overview "Financial activity" bars were dominated by the current month (seed amounts) — seed rebalanced so months compare as in the mockup, recent months in graphite.
2. Fleet illustration panel was small with an inline caption — enlarged generic truck SVG filling the panel with the "GENERIC ILLUSTRATION · NOT A JNL ASSET" pill overlaid bottom-right, as in mockup 02.
3. Fleet stat wording differed — now "Service due soon" and "Overdue renewals (n licence alerts)" following mockup 02.

**Pass 2 (390 px vs 04; 768 px)** — one real mismatch, corrected:
1. Recent-activity table crushed its status tags at 390 px — data tables now keep a minimum width and scroll inside their wrapper.

Remaining, accepted differences are listed in `docs/DESIGN_LOCK.md` (live numbers, role bar, drawer, lighter illustration).
No similarity percentage is claimed; judge the PNG captures against the mockups directly.

## Not verified / out of scope

- Opening the generated PDF in Adobe Reader / Edge was not observed (only parsed and byte-checked).
- Safari / Firefox were not tested (Chromium only).
- Screen-reader behaviour not audited.
- Lighthouse / performance not measured.
