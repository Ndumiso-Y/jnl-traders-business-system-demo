# JNL Traders — Business Management System (Demonstration)

A fictional-data, browser-only demonstration of a business management system for JNL Traders,
built by Embark Digitals as a discovery prototype. It is **not** a production system.

- All customers, vehicles, staff codes, invoices, requests and figures are fictional.
- Records persist only in the current browser (localStorage). Another browser or device starts fresh.
- The role switcher is a simulation for demonstration; a public static site cannot enforce real permissions.
- No credentials, analytics or third-party services are embedded.

## Live demo

See `docs/DEPLOYMENT_STATUS.md` for the verified status. (Updated after each verified deployment.)

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

## Stack

Vite + React 19 + TypeScript, react-router (hash routing for GitHub Pages), zustand (persisted to localStorage),
jsPDF for sample PDF documents. No backend.
