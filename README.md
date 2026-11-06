# JNL Traders — Business Management System (Demonstration)

A fictional-data, browser-only demonstration of a business management system for JNL Traders,
built by Embark Digitals as a discovery prototype. It is **not** a production system.

- All customers, vehicles, staff codes, invoices, requests and figures are fictional.
- Records persist only in the current browser (localStorage). Another browser or device starts fresh.
- Users, roles and module permissions are a simulation for demonstration; a public static site cannot enforce real access control.
- No credentials, analytics or third-party services are embedded.

## Live demo (verified)

- **Pages URL:** https://ndumiso-y.github.io/jnl-traders-business-system-demo/
- **Repository:** https://github.com/Ndumiso-Y/jnl-traders-business-system-demo
- **Deploys:** GitHub Actions on every push to `main` (typecheck → unit tests → build → Pages). Status, run links and
  the checks performed on each release are recorded in `docs/DEPLOYMENT_STATUS.md`.

Open the URL in any modern browser. Use the **Signed in as** switcher in the top bar to move between fictional
users (Super Admin, Owner, Supervisor, Finance Clerk, Procurement Officer, HR Officer, Fleet Controller, Requester).
Each user sees only the modules granted to them; the Super Admin sees everything and grants or revokes module
access and approval rights under **Users & permissions**. Settings → Reset restores the fictional starting data.

## Documentation

| File | Contents |
| --- | --- |
| `docs/DEPLOYMENT_STATUS.md` | GitHub owner, repo, Pages method, verified releases, blockers |
| `docs/DESIGN_LOCK.md` | Visual references, design tokens, screen map, deviations |
| `docs/BUSINESS_SCOPE_AND_LIMITATIONS.md` | Demonstrated vs simulated vs future; unknowns; Zoom discovery questions |
| `docs/QA_RESULTS.md` | Unit, browser and live-URL test results with real output; screenshot paths |
| `qa/screenshots/` | Browser captures at 1440 / 1024 / 768 / 390 px |

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173/jnl-traders-business-system-demo/
npm run build      # production build to dist/
npm run preview    # serve the production build
npm test           # unit tests (vitest)
npm run typecheck  # tsc
npm run lint       # eslint
npm run e2e        # Playwright browser tests (after: npx playwright install chromium)
```

## How to resume development

1. `git pull` then `npm install`.
2. `npm run dev` and open the local URL above (hash routes, e.g. `#/finance/quotations`).
3. Make changes; run `npm run typecheck && npm test && npm run e2e` (the e2e suite needs `npx playwright install chromium` once).
4. Commit and push to `main`; the Pages workflow deploys automatically. Verify the live URL and add a row to
   `docs/DEPLOYMENT_STATUS.md`.

Source layout: `src/app` (shell, routes, nav) · `src/components` (shared UI) · `src/lib` (money, dates, selectors, PDF)
· `src/store` (types, fictional seed, persisted zustand store) · `src/modules/*` (pages per module) · `tests/` (vitest)
· `e2e/` (Playwright).

## Limitations

- Static frontend only: data lives in the browser's localStorage, per browser/device, with no sync or backup.
- Users and permissions are a simulation. Pages are hidden by JavaScript, not protected.
- PDFs are watermarked demonstration documents, not valid tax invoices. VAT 15% is a configurable demo default.
- No login, email, payments, integrations or real records. See `docs/BUSINESS_SCOPE_AND_LIMITATIONS.md`.

## Stack

Vite + React 19 + TypeScript, react-router (hash routing for GitHub Pages), zustand (persisted to localStorage),
jsPDF for sample PDF documents. No backend.
