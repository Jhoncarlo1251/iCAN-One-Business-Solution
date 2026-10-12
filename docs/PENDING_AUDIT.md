# iCAN v6 — Feature Preservation and Pending Audit

Audit basis: `iCAN_One_Business_Solution_v6_Consolidated_Development_Build.zip` (47 files; ZIP integrity verified). This is a source-code audit, not a live deployment or end-to-end browser test.

## Verified baseline

- `node --test`: 9/9 original tests passed before repairs.
- Express API routes exist for authentication, tasks, products, inventory, sales, warehouses, and PayMongo payment foundation.
- Frontend task workflows are the only confirmed main-screen module connected to the API in this build's integration status documentation.
- Most business screens store local browser/demo data. A visible screen is not evidence that its workflow is database-backed.

## Module status

| Module / workflow | Status in supplied v6 | Blocking work |
|---|---|---|
| Registration/login/workspace | Partial | Production-grade session design, recovery/verification, complete role enforcement and end-to-end verification |
| Tasks | API-connected, needs E2E verification | Test create/edit/complete/reopen/delete with real PostgreSQL and expired sessions |
| Products/catalog | Backend API exists; UI local/demo | Connect list/create/edit to API, handle UUIDs, barcode uniqueness, stock opening workflow |
| Inventory | Backend API exists; UI local/demo | Connect balances/adjustments, initialize warehouses/locations, verify transaction ledger |
| Sales/POS | Backend checkout exists; UI demo/local | Connect cart to UUID product/location IDs, server-side checkout, receipt details and idempotent retry UI |
| Warehouses/WMS | API foundation partial; UI local/demo | Connect warehouse/location forms, receiving/transfers/counts/picking/dispatch transactions and movement history |
| Customers/CRM | Demo/local | Schema/API, validation, permissions, UI integration, tests |
| Suppliers/purchasing | Demo/local | Purchase orders, receiving linkage, supplier balances, API/database integration |
| Expenses/finance | Demo/local | Persistent ledger, categories, permissions, reconciled reporting and tests |
| Reports/analytics | Demo/local/illustrative | Derive metrics from persisted transactions; remove illustrative values from live mode |
| Projects/calendar/notes/cloud | Demo/local or partial | Persistent APIs, access rules, sync, file storage and integration tests |
| iCAN AI/automation | Preview only | Provider configuration, scoped tool permissions, auditability, usage controls and error handling |
| Team & invitations | Incomplete | Invite lifecycle, role matrix, revocation and audit events |
| Subscription billing | Payment foundation | Recurring renewal, dunning, cancellation/refund flows and reconciliation; current checkout is one-time |
| Merchant online payments | Payment foundation | Provider-account approval, sandbox E2E tests, stock reservation expiry/reconciliation, operational exception handling |
| E-wallet cash-in/out | Local ledger only | No real transfer/provider integration; must not be described as moving funds |
| Production readiness | Not certified | HTTPS/deployment hardening, migrations, backup restore drill, observability, security review, complete E2E tests |

## Repairs applied in this audit pass

1. Local CORS defaults now include common local frontend origins (`localhost:5500`, `127.0.0.1:5500`) so the documented local frontend can reach the API without requiring a copied `.env` just to pass CORS.
2. Production startup now fails closed if `DATABASE_URL`, an adequately long `JWT_SECRET`, or explicit `CORS_ORIGINS` is missing.
3. Added regression tests for these configuration safeguards.

## Remaining blockers / honest boundaries

- Product, inventory, POS, and WMS frontend-to-API integration remains unfinished in this pass; do not use these screens for live transactions.
- Database integration tests require a configured PostgreSQL test database; payment end-to-end tests require PayMongo sandbox credentials and a reachable webhook endpoint.
- Browser/mobile UI tests and real scanner/camera tests require an actual running deployment/device; source tests cannot certify them.
- Automatic recurring subscription billing and real GCash/Maya transfers are not implemented by this package.

## Release gate

Do not label a module complete until its data persists in PostgreSQL, permissions are enforced server-side, failure/retry paths are tested, related modules stay consistent, and a repeatable end-to-end test passes. Bootstrap integration remains deferred until these functional integration gaps are resolved.
