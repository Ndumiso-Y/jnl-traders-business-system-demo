# Design lock — JNL Traders business system demo

## Visual authority (locked 04 Nov 2026)

The four owner-selected mockups are the visual direction. They live in the local execution pack only
(`01_VISUAL_REFERENCES/`, not committed to the public repo):

| Ref | File | Governs |
| --- | --- | --- |
| 01 | `01_Executive_Dashboard.png` | Sidebar + topbar shell, Overview page: dark hero, ivory action card, 4 stat cards, bar chart, donut, recent-activity table |
| 02 | `02_Fleet_Management.png` | Fleet page: 4 stats, illustration panel + "Upcoming attention" list, asset register table with condition / next check / action |
| 03 | `03_Finance_Quotation.png` | Document editor: status pill, customer/validity fields, items table, notes, totals card, document journey, dark "prototype goal" notice |
| 04 | `04_Overview_Mobile.png` | Mobile composition at 390 px: hamburger topbar, stacked stats (2-up), stacked panels |

**Rejected:** the earlier combined JNL/Embark promotional infographic. It is not in the pack and nothing in the
app derives from it. The two logos are never combined in a banner; Embark Digitals appears only as a small
"Prototype review" credit at the foot of the sidebar and in the page footer line.

**Brand mark:** no approved JNL logo file was supplied, so the app uses the mockups' temporary text wordmark
("JNL." with a gold full stop and letter-spaced "TRADERS"). This is a placeholder, not a brand asset.

## Design tokens (extracted from the mockup HTML sources and verified against the PNGs)

Implemented as CSS custom properties in `src/styles/app.css`.

| Token | Value | Use |
| --- | --- | --- |
| `--bg-app` | `#f7f7f4` | Application workspace background (ivory / off-white) |
| `--bg-sidebar` / `--bg-panel` | `#ffffff` | Sidebar and cards |
| `--bg-subtle` / `--bg-ivory` / `--bg-ivory-2` | `#f5f5f1` / `#faf9f4` / `#f6f3eb` | Subtle fills, workspace tag, help card, action card |
| `--bg-dark` | `#242924` | Active nav item, hero panel, dark notices, primary buttons (`#262c26`) |
| `--ink` / `--ink-2` / `--ink-3` | `#212521` / `#2d342d` / `#4c564d` | Graphite text |
| `--muted` / `--muted-2` / `--muted-3` | `#6e756f` / `#8c918a` / `#a2a7a2` | Secondary text, nav labels, table headers |
| `--gold` / `--gold-2` / `--gold-soft` | `#b49358` / `#bd9b62` / `#e9c77a` | JNL muted gold accent, gold button, active-nav icon |
| `--gold-tint` / `--gold-line` / `--gold-text` | `#f0eadd` / `#e4d6be` / `#967647` | Demonstration pill, gold notices |
| `--line` / `--line-2` / `--line-3` | `#e9e8e4` / `#eff0ec` / `#dedfd8` | Borders, table rules, button borders |
| Status green | `#63796b` on `#f3f5f0` (tag), `#3f9260` on `#edf7ef` (change) | Active / approved / paid |
| Status amber | `#a67b3c` on `#f8f0e1` | Due soon / awaiting review / part paid |
| Status red | `#ae6460` on `#fcf0ed` | Overdue / rejected / open incident |
| Radii | panel 16 px · card 14 px · button 10 px · nav 11 px · input 10 px | |
| Shadow | `0 9px 20px rgba(50,55,44,.03)` panels; `0 18px 40px rgba(30,34,28,.14)` modals | |
| Type | Inter 400/500/600/700/800 (Google Fonts), 14 px base; page title 32 px / −1.4 px tracking; kicker 11 px / +2 px uppercase gold | |
| Layout | Sidebar 254 px (232 px ≤ 1180 px, drawer ≤ 900 px); topbar 72 px; content gutter 40 / 28 / 20 / 16 px | |

## Screen map

| Route | Mockup basis | Status |
| --- | --- | --- |
| `#/` Overview | 01 / 04 | Implemented, live data from store |
| `#/finance/quotations`, `/invoices`, `/statements`, `/customers` | 03 (editor); lists follow 02's register pattern | Implemented |
| `#/procurement`, `#/ppe`, `/requests/:id`, `/orders` | 02 register pattern + 03 editor pattern | Implemented |
| `#/fleet`, `/fleet/:id` | 02 | Implemented |
| `#/reports` | 01 chart language | Implemented |
| `#/people` | 02 register pattern (tabs: HR / Safety) | Implemented |
| `#/owner` | 01 stat/panel language | Implemented (simulated restriction) |
| `#/settings`, `#/search` | shell patterns | Implemented |

## Deliberate deviations from the mockups

1. **Numbers are live.** Mockup figures (R218,750 etc.) are replaced by values computed from the fictional records, so they change as the demo is used.
2. **"This month" button** on the Overview links to Reports rather than opening a date menu (no dead control).
3. **Fleet illustration** is a simple inline SVG generic truck labelled "Generic illustration · not a JNL asset", lighter than the mockup's rendered vehicle, to avoid implying a real asset and to keep the bundle small.
4. **Mockup 03's "Prototype goal" notice** referencing the Manus version is replaced by a "Demonstration boundary" notice (Manus is no longer the executor).
5. **Role bar** (segmented Requester / Manager / Finance / Owner control) is an addition required by the brief; it is styled with the gold notice tokens so it reads as a demo control.
6. **Mobile** uses a slide-in drawer for the sidebar; mockup 04 only shows the closed state.

## Locked / regression rule

Overview, Fleet and the Quotation editor at 1440 / 1024 / 768 / 390 px are the regression set. Screenshots in
`qa/screenshots/` are the baseline for later correction passes; see `docs/QA_RESULTS.md` for the comparison log.
