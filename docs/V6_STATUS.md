# iCAN Integrated Core v6 — build status

## What this package adds
- Consolidated from the V5 mobile/WMS frontend and the existing Node.js/Express + PostgreSQL foundation.
- Authenticated API endpoints for workspace-scoped product listing/create/update, inventory listing/stock adjustments, and sales listing/checkout.
- PostgreSQL transactions for checkout and manual stock adjustments; checkout validates available stock and records sale items, inventory movements, and audit events together.
- Idempotency keys for checkout and inventory adjustment to reduce accidental duplicate operations.
- Role-gated writes: owner/admin/manager for catalog and stock adjustments; owner/admin/manager/member for sales checkout; viewer is read-only.
- Added `sales` and `sale_items` schema tables and API routes.

## API routes
- `GET /api/health`, `GET /api/health/db`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET|POST /api/tasks`, `PATCH|DELETE /api/tasks/:id`
- `GET|POST /api/products`, `PATCH /api/products/:id`
- `GET|POST /api/warehouses`, `GET|POST /api/warehouses/locations`
- `GET /api/inventory`, `POST /api/inventory/adjustments`
- `GET /api/sales`, `POST /api/sales/checkout`

All workspace APIs require `workspaceId`; authenticated routes require `Authorization: Bearer <token>`. Never expose database credentials in frontend files.

## Setup
1. Install Node.js 20 or newer and PostgreSQL.
2. Copy `.env.example` to `.env`; set a strong random `JWT_SECRET` (at least 32 characters), `DATABASE_URL`, `CORS_ORIGINS`, and `NODE_ENV`.
3. Create a fresh database and apply `db/schema.sql` once using a PostgreSQL client.
4. Run `npm install`, then `npm run db:check`, then `npm start`.
5. Verify `GET /api/health` and `GET /api/health/db`.
6. Create a workspace, warehouse, and active location in PostgreSQL before using inventory adjustments or checkout. Add products via `/api/products`.

## Honest readiness status
This is an **integrated development build**, not a production-certified SaaS release. The frontend's existing POS/WMS and e-wallet ledger screens remain demo/local-browser workflows; this build adds backend APIs but does not yet wire every screen to those APIs. The e-wallet ledger does not move real funds and no GCash/Maya/payment provider is integrated. Email verification, password reset, production session strategy, complete role/permission matrix, migrations, backup/restore drill, observability, tax-compliant receipts, payment reconciliation, full automated tests, and deployment hardening remain required before real customers or live transactions.

## Operational notes
- Checkout expects each item to include a product UUID, location UUID, and positive integer quantity.
- Create a warehouse and a location in the same workspace before stocking inventory.
- Every checkout uses a client-generated unique `idempotencyKey` (UUID recommended). Reuse the same key for retrying the same checkout.
- Do not expose this API publicly until HTTPS, secrets, database access, rate limits, logging, backup/restore, and deployment controls are reviewed.


## PayMongo payment foundation added
- `POST /api/payments/subscription/checkout`: server-priced iCAN plans, owner/admin-only checkout creation.
- `POST /api/payments/merchant/checkout`: server-calculated order total, workspace-scoped inventory reservation, and idempotency.
- `GET /api/payments/status`: subscription and transaction history for workspace members.
- `POST /api/webhooks/paymongo`: raw-body HMAC signature validation and idempotent processing of `checkout_session.payment.paid`.
- Successful merchant payment creates the sale, sale items, inventory movement, and stock deduction in one database transaction. A stock mismatch is marked `paid_needs_review` instead of silently fulfilling.
- Payment records and subscription records are separate.

The subscription integration is currently one-time checkout with a monthly/annual entitlement term. Automatic recurring billing requires separate PayMongo Subscriptions API enablement and implementation. Merchant marketplace/connected-account settlements are not implemented. See `docs/PAYMENT_INTEGRATION.md`.
