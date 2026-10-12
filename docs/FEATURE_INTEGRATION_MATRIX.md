# iCAN Feature Integration Matrix — v6.4.0-dev.6

Status definitions:
- **Connected (code-level):** UI invokes an authenticated API and updates from API results. Live database behavior still requires integration testing.
- **Partial:** API foundation or partial UI/API connection exists, but key workflows are not connected.
- **Demo/local:** browser state only; not suitable for live business records.
- **Not verified:** no runtime or end-to-end evidence available in this environment.

| Feature | Current status | Connection implemented / available | Remaining work |
|---|---|---|---|
| Authentication/workspace | Partial | Express auth routes, workspace selection, bearer token in sessionStorage for development | Replace browser bearer-token design with reviewed production sessions; recovery and verification; multi-workspace switcher |
| Tasks | Connected (code-level) | Create/list/update/delete use task API | PostgreSQL integration/E2E tests; permission matrix |
| Products/catalog | Connected (code-level) | Load, create, edit, SKU/barcode uniqueness errors; workspace-scoped API | Live DB test; archive behavior; pagination and product variants |
| Inventory balances | Connected (code-level) | Loads balances; opening stock, manual adjustment, receiving, transfers and cycle counts call transactional APIs; pick reservations and dispatch update balances | Live PostgreSQL concurrency tests; display fractional units safely |
| Warehouses | Connected (code-level) | Load/create warehouse and storage locations; location creation plus opening stock is transactional | Edit/deactivate, live DB integration tests, location capacity enforcement |
| POS/sales checkout | Connected (code-level) | Checkout calls transactional API, allocates stock across locations, refreshes catalog/sales after success | Persisted itemized receipt UI, returns/refunds, payment capture, concurrency tests, device E2E |
| WMS receiving/transfers/picking/dispatch | Connected (code-level) | API endpoints for receipt, location transfer, cycle count, pick reservation, dispatch, pick-list reads and movement history; role-gated transactions and audit events | Live PostgreSQL concurrency/integration tests; multi-product bin UX; cancellation/release workflows; live pilot verification |
| Customers | Connected (code-level) | Workspace-scoped customer API, create/list, customer spend/order aggregates, POS customer linkage | Live DB integration tests; customer editing/archive and privacy/deletion workflow |
| Suppliers/purchasing | Connected (code-level) | Supplier create/list, purchase orders with product lines, partial/full receiving into warehouse inventory, audit/movement records | Live DB integration tests; multi-line PO editor, cancellation/returns, supplier bills/payables and accounting linkage |
| Expenses/finance/reports | Partial (code-level) | Expense create/list APIs persist to PostgreSQL with role checks and audit events; summary aggregates completed sales, posted expenses and purchasing | Not double-entry accounting; accounts receivable/payable, tax rules, bank reconciliation, refund handling, live DB tests and validated reports remain pending |
| Projects/calendar/notes/cloud/team | Demo/local or partial UI | Screens exist; task API is the exception | Persistent APIs, collaboration, file storage, invitations, permissions, notifications and sync |
| AI/automation | Preview/local | Local summary of browser state | Provider integration, scoped access, provenance, approval gates, audit logs and failure controls |
| Subscription/merchant payments | Partial foundation | PayMongo checkout/webhook foundation | Sandbox E2E, renewal lifecycle, refund/reconciliation, operational alerts; no actual GCash/Maya transfers |
| Deployment/security | Preparation only | Compose/Nginx examples, rate limiting, health checks, release gate | Real host/TLS, DB migration and restore drill, monitoring, independent review and full staging validation |

## Implemented in this pass
- Shared API loader for products, warehouse list, locations, inventory balances, sales, WMS pick lists and movement history.
- Product create/edit is database-backed when connected. Initial stock is recorded as an idempotent inventory adjustment.
- Manual stock adjustment and warehouse creation are database-backed when connected.
- POS checkout submits to the transactional sales API and refreshes core data after success.
- Asynchronous modal save now waits for API success and leaves the dialog open when the request fails.
- Added transactional WMS receiving, location-to-location transfers, cycle counts, pick reservations, dispatch, location creation with opening stock, and movement-history reads.
- Connected WMS UI actions to those APIs when authenticated; demo actions remain local when disconnected.
- UI notices explicitly identify any WMS display that remains preview/local/illustrative.

## Verification boundary
Static checks and source-level tests pass, but no live PostgreSQL instance or browser/mobile E2E was available. Therefore the statuses above are implementation assessments, not production certification. Do not process real transactions until the remaining release gates are completed.


## v6.4 CRM and purchasing pass
- Added authenticated customer and supplier create/list APIs, workspace-scoped data access, writable-role checks and audit events.
- Added purchase-order create/list and transactional receiving endpoints; partial receipts update received quantities and warehouse balances, write receipt lines, inventory movements and audit events.
- Connected customer selection to POS customer IDs; customer lifetime spend and order count are calculated from completed sales.
- Added Purchasing screen and create/receive workflows. Current UI creates a single product line per purchase order; the API supports multiple lines.
- Added repeatable migration `db/migrations/003_crm_purchasing.sql` and corrected a duplicate column declaration in the fresh schema.
- Verification is source-level only; live PostgreSQL behavior remains unverified.


## v6.5 finance/pending-work pass
- Added repeatable migration `db/migrations/004_finance_foundation.sql` for persistent workspace expenses.
- Added authenticated expense create/list endpoints with role validation and audit events.
- Added management finance summary endpoint; online sales are explicitly identified as unreconciled, and the response warns that it is not double-entry accounting.
- Connected the business-data loader to persisted expenses and finance summary.
- Remaining high-priority gaps: supplier payables/settlements, customer receivables and aging, purchase returns and safe PO cancellation, expense voiding/editing, double-entry ledger, tax setup, bank/payment reconciliation, broader multi-line PO editor, live PostgreSQL integration/concurrency tests, backup/restore, deployment TLS and mobile E2E.

- v6.5 follow-up: safe cancellation is now available for purchase orders only before any receiving; orders with received stock are blocked and require a future return workflow.
