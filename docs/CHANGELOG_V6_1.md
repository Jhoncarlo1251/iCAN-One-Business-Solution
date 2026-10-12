# v6.1 deployment preparation pass

## Added
- Dockerfile for a non-root Node API container with a health check.
- Docker Compose topology for Nginx static frontend, Express API, and private PostgreSQL with persistent storage and health checks.
- Nginx API reverse proxy and baseline response security headers.
- `.env.production.example` with required secret/origin variables.
- Deployment guide and explicit release-gate checklist.
- API-wide rate limiting in addition to the stricter authentication rate limit.
- Optional trusted-proxy configuration, enabled only in the included single-hop Nginx topology.
- Frontend API client now defaults to same-origin API requests when hosted outside localhost; local development still defaults to `http://localhost:4000`.
- Deployment regression tests.

## Verification
- `npm test`: 16 tests passed.
- `node --check` on all source and test JavaScript: passed.
- Docker runtime/Compose validation, real PostgreSQL integration, PayMongo sandbox, HTTPS deployment, and browser/device E2E: not run in this environment.

## Not completed / not represented as complete
- All UI modules are not yet connected to backend persistence.
- Automatic recurring subscription billing, dunning, marketplace settlements and actual GCash/Maya transfers are not implemented.
- Production session lifecycle, email verification/recovery, full role matrix, comprehensive migrations, monitoring, backup/restore drill and independent security review remain release blockers.


## Core feature wiring follow-up (v6.2.0-dev.4)
- Added a shared core-data loader that retrieves products, warehouses, locations, inventory balances and sales from the authenticated workspace APIs.
- Connected product creation/editing to PostgreSQL, including opening-stock adjustments with idempotency keys.
- Connected manual stock adjustments and warehouse creation to backend endpoints.
- Connected POS checkout to the transactional sales endpoint, allocating quantities across available inventory locations and refreshing the core data after success.
- Kept local demo mode separate; it is not silently represented as database-backed.
- Updated modal save handling to await asynchronous requests and keep the dialog open on failed saves.
- Added regression checks for core API wiring.
- Not yet connected: full WMS receiving/transfers/picking/dispatch, customers/suppliers/purchasing, expenses/finance, projects/calendar/cloud/team, and complete payment lifecycle.


## WMS integration pass (v6.3.0-dev.5)
- Added authenticated WMS endpoints for receiving, location transfers, cycle counts, pick lists/reservations, dispatch, transactional location creation with opening stock, pick-list reads and movement history.
- Stock mutations use database transactions, workspace/role checks, stock availability guards and audit events.
- Connected WMS UI actions when the API is authenticated; local demo mode remains separate.
- Added source-level WMS wiring and safety regression tests.
- Live PostgreSQL, concurrency and mobile/browser end-to-end testing remain outstanding.


## CRM and purchasing integration pass (v6.4.0-dev.6)
- Added customer and supplier tables and authenticated workspace-scoped APIs.
- Added customer lifetime spend/order counts and optional POS-to-customer association.
- Added purchase orders, order lines, partial/full receiving into stock, receipt records, stock movements and audit events.
- Added Purchasing navigation/screen and connected create/receive actions when API is authenticated.
- Added migration 003 and CRM/purchasing regression tests.
