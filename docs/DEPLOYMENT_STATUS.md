# Deployment status — GitHub Pages demo

| Item | Value |
| --- | --- |
| Authenticated GitHub owner | `Ndumiso-Y` (verified with `gh auth status`; token scopes: gist, read:org, repo, workflow) |
| Repository | https://github.com/Ndumiso-Y/jnl-traders-business-system-demo (public, created 04 Nov 2026) |
| Live Pages URL | https://ndumiso-y.github.io/jnl-traders-business-system-demo/ |
| Pages build method | GitHub Actions (`.github/workflows/deploy-pages.yml`): `npm ci` → typecheck → unit tests → `vite build` → upload `dist/` → `actions/deploy-pages@v4` |
| Pages source setting | `build_type: workflow` (set through the GitHub API: `POST /repos/{owner}/{repo}/pages`) |
| Routing | Hash router (`#/finance`, `#/fleet` …) so deep links and hard refresh never hit a GitHub 404. `dist/404.html` is also a copy of `index.html` as a safety net. |
| Base path | `/jnl-traders-business-system-demo/` (set in `vite.config.ts`) |

## Why a separate public repository

The account's plan could not be read with the current token, and GitHub Pages from a **private** repository
requires a paid plan. The master prompt allows a separate public repository containing **only sanitized static
demo assets**, so that route was taken. The execution pack (playbook `.docx`, mockup PNGs, prompts, the ZIP) is
excluded by `.gitignore` and verified with `git check-ignore` before the first commit. No credentials, analytics,
or real business data exist in the repository.

## Verified releases

| Date (SAST) | Commit | Workflow run | Result | Live checks performed |
| --- | --- | --- | --- | --- |
| 04 Nov 2026 23:58 | `30b786d` | https://github.com/Ndumiso-Y/jnl-traders-business-system-demo/actions/runs/41919785414 | build ✓ deploy ✓ | **Final release.** `curl` shows the Pages URL serving `assets/index-DAPuPGLj.js` (same hash as the local build). Playwright live spec against the Pages URL — **1 passed (8.0s)**: HTTP 200, navigation, deep link + hard refresh, CSS applied, no 4xx, no console errors. |
| 04 Nov 2026 23:45 | `143e530` | https://github.com/Ndumiso-Y/jnl-traders-business-system-demo/actions/runs/41918968121 | build ✓ deploy ✓ | Playwright `e2e/live.spec.ts` against the Pages URL: HTTP 200, Finance navigation, `#/fleet` deep link + reload, sidebar CSS applied, no 4xx, no console errors — **1 passed (3.9s)**. |
| 04 Nov 2026 23:30 | `af6e7b5` | https://github.com/Ndumiso-Y/jnl-traders-business-system-demo/actions/runs/41917014574 | build ✓ deploy ✓ | `curl` confirmed new JS bundle (`index-m00knJ8R.js`) served from the Pages URL. |
| 04 Nov 2026 23:15 | `5602b85` | https://github.com/Ndumiso-Y/jnl-traders-business-system-demo/actions/runs/41913772772 | build ✓ deploy ✓ | `curl` → HTTP 200 for `/`, CSS (200, 23 181 B), JS (200, 366 001 B), favicon 200. Browser: opened `#/fleet` deep link, pressed F5 (hard refresh) — page re-rendered, sidebar + heading present, **no console errors**. |

## Blockers

None. Pages is enabled and deploys automatically on every push to `main`. The commit after `30b786d` is documentation only (this file) and does not change the application.

## Known deployment limitations

- Non-hash paths such as `/jnl-traders-business-system-demo/finance` return HTTP 404 status (GitHub serves `404.html`, which still boots the app). All in-app links use hash routes, so this is not hit in normal use.
- Demo data lives in the visitor's browser `localStorage`. Each browser/device has its own copy; nothing syncs.
