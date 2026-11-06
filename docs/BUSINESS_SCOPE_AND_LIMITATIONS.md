# Business scope and limitations

This is a **discovery demonstration** for a prospective JNL Traders business management system. It exists to
make the 14 October 2026 discussion tangible for a client walkthrough and to surface the real scope of a
future system. It is separate from the existing two-website engagement and carries no production commitment.

## Demonstrated (working in the browser, fictional data)

| Area | What works |
| --- | --- |
| Quotations | Create, edit, save, delete (with confirmation); customers and line items; quantity, unit price, per-line discount; VAT exclusive / inclusive basis; configurable VAT rate per document (15% demo default); cent-accurate rounding; validation for empty descriptions, zero / negative quantities, negative prices, discount range; mark issued / accepted / declined; convert to invoice with identical totals and a new document number; watermarked PDF download and print view |
| Invoices | Same editor; issue; record fictional payments (validated against balance); paid / part-paid / overdue / unpaid states; delete with confirmation; PDF |
| Statements | Per-customer running statement derived from issued invoices and recorded payments; totals; PDF |
| Customers | Add / edit fictional customers with validation |
| Procurement & PPE | Draft → Submitted → Approved / Rejected → Fulfilled; optional decision comment; chronological history with role and timestamp; purchase-order creation from approved requests; PO status progression; dashboard counts update |
| Users & permissions | Eight fictional users with module-scoped access, as requested in the 14 October meeting: the Super Admin sees everything and grants or revokes each user's modules (Overview, Finance, Procurement, PPE, Fleet, Reports, HR, Safety, Owner view, Users & permissions) plus approval and finance-review rights; Finance sees finance, HR sees HR, Fleet sees fleet; hidden modules disappear from navigation and direct links show a "No access" page; nobody except an owner or super admin may approve their own request; add/remove demo users; changes persist in the browser and older saved data migrates automatically |
| Fleet & equipment | Vehicle and equipment register; make / model / registration / year / status / assignment / odometer; service, licence, insurance, inspection dates with due-soon (30 days) and overdue states computed from today; search and filters; add / edit / delete |
| Reports | Date-range monthly aggregates of invoices issued, payments received and recorded costs (kept separate, never labelled profit); cost register with categories and asset links |
| HR & safety | Representative hiring and disciplinary records (codes only) and a safety incident register with follow-up dates |
| Owner view | Six-month summary, approvals waiting, top customers, operational flags |
| Workspace | Live search across all records; persistence in `localStorage`; reset with warning; empty states; keyboard focus; responsive 1440 / 1024 / 768 / 390 px |

## Simulated (looks real, is not)

- **Users, permissions and the owner-only page.** Enforced only in browser JavaScript. Anyone with the link can switch users from the top bar. A public static site cannot protect confidential data; the model shows intent, not security.
- **Persistence.** Records live in the visitor's browser only. A second browser, device or private window starts from the seed. Nothing syncs and nothing is backed up.
- **Documents.** PDFs are watermarked "DEMONSTRATION / NOT A VALID TAX INVOICE". Numbering (`Q-D…`, `INV-D…`, `REQ-D…`, `PO-D…`) is a demo scheme. VAT at 15% is a configurable demonstration default and says nothing about JNL's VAT registration or compliance.
- **Payments and statements.** Fictional entries typed into the demo. No bank, email or accounting integration.
- **Activity feed and notifications.** The bell icon is decorative; the feed is a local log.

## Future, separately approved work (not built)

Real multi-user backend and authentication; server-side authorisation; real business records; accounting
compliance and legal tax invoices; email / SMS reminders; integrations; data migration; backups; POPIA-compliant
HR handling; hosting, support and maintenance terms; final pricing.

## Unknowns about the current Access-based system

The client reportedly has an Access-based system from around 2017 with a quarterly service cost. None of the
following has been verified and nothing in this demo is derived from it: its actual workflows, tables and
exports; who owns and maintains it; whether it must be replaced, integrated or migrated; current invoice and
statement templates and numbering; VAT treatment; real roles, approvers and limits; reporting definitions.

## Discovery questions for the client Zoom

1. Which of the demonstrated modules matter most, and which are missing entirely?
2. Who approves procurement and PPE requests today, with what limits, and does Finance need a separate step?
2a. Does the proposed user list (super admin, owner, supervisor, finance, procurement, HR, fleet, requester) match the real people, and should any module be shared between departments?
3. What do current quotations, invoices and statements look like (templates, numbering, VAT, terms)?
4. Which reports are produced monthly now, for whom, and what do "costs" include?
5. Which vehicles / equipment renewals are tracked today and where does the reminder need to arrive?
6. How sensitive are the HR and owner data, who may see them, and where must they be stored?
7. Should the Access system be replaced, kept alongside, or migrated — and who can export its data?
8. How many users and sites; office-only or mobile use in the field?
9. Hosting preference (cloud vs on-premise), backup expectations and support hours.
10. Budget range and timing for a production phase.
