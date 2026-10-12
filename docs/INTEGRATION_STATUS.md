# iCAN API integration status

## Connected in this development build
- Frontend account registration and login call the iCAN API.
- The selected workspace comes from the API.
- Tasks list/create/complete/reopen/delete use the authenticated API and PostgreSQL while connected.
- API address is configurable in the Connect API dialog; default is `http://localhost:4000`.

## Still local/demo-only
- Products, POS/sales, inventory, customers, suppliers, expenses, reports, projects, calendar, notes, cloud files, AI, team management, billing, and settings.
- POS now supports Bluetooth HID keyboard-emulation scanners in local demo mode: exact barcode/SKU lookup, unknown/out-of-stock feedback, repeated scans increasing cart quantity, manual exact-match fallback, and local stock deduction at demo checkout.
- Do not use these demo modules for live business transactions.

## Development-only session note
The frontend stores the short-lived bearer token in `sessionStorage` for local integration testing. This is intentionally not presented as production-ready. Before production, use a reviewed secure session design (for example, appropriately configured HttpOnly, Secure, SameSite cookies with CSRF protections where applicable), refresh/revocation strategy, HTTPS, rate limits, email verification/recovery, role checks, audit events, migrations, monitoring, and backup/restore testing.


See [`PENDING_AUDIT.md`](./PENDING_AUDIT.md) for the feature-preservation audit, blockers, and release gates.
