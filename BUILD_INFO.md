# iCAN One Business Solution — Consolidated v6 Development Build

Build label: v6.0.0-dev.2
Source basis: iCAN WMS/mobile UI V5 + Node.js/Express/PostgreSQL backend foundation + v6 product/inventory/sales API + PayMongo payment foundation.

## Included in this package
- Mobile-first iCAN workspace UI with personal-workspace and business-suite navigation
- Demo POS with barcode search, phone-camera scanner prototype, e-receipts, and local e-wallet ledger prototype
- Warehouse Management System (WMS) screens and inventory/workflow schema
- Express API and PostgreSQL schema for identity, workspaces, Tasks, products, warehouses, inventory, sales, and audit events
- Transactional POS sales API with stock checks, role checks, audit events, and idempotency
- PayMongo v2 hosted checkout adapter, sandbox-first configuration, subscription checkout and merchant order checkout endpoints
- Separate subscription/merchant payment records, webhook signature verification, duplicate-event protection, and webhook-based merchant sale fulfillment
- Additive payment migration for an earlier installed schema
- Setup, API, scanner, WMS, payment, and release-checklist documentation

## Validation performed in this environment
- `node --check` passed for the server, payment routes/provider helper, frontend app, and API client.
- `node --test`: 9 tests passed, including schema/route checks, plan price checks, webhook signature/tamper/stale-timestamp checks, and confirmation that secret keys are not shipped in frontend code.
- No PostgreSQL server was available for schema execution or integration tests.
- Dependency installation timed out in this environment, so the Express API was not started and no live/sandbox PayMongo request was performed.
- No real browser/mobile end-to-end test was performed.

## Known boundaries
- This is a development build, not production-certified software.
- Several frontend business modules remain local/demo workflows; only Tasks and the documented backend API endpoints are connected to PostgreSQL.
- The phone-camera scanner depends on browser support and HTTPS/localhost.
- E-wallet cash-in/cash-out is a local ledger prototype and does not move funds.
- Subscription checkout currently makes a one-time charge and grants a term; automatic recurring renewals need PayMongo Subscriptions API enablement and separate implementation.
- Merchant marketplace/connected-account settlement, refunds UI, reconciliation jobs, checkout session expiration, and complete production security hardening remain unfinished.

Read `README.md`, `docs/LOCAL_SETUP.md`, `docs/PAYMENT_INTEGRATION.md`, and `docs/V6_RELEASE_CHECKLIST.md` before setup or deployment.
