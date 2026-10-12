# iCAN v6 release gate

A passing source test suite is not proof of a production-ready business platform. Sign off each item with recorded evidence from the target staging environment.

- [ ] Build image from a clean checkout; dependency audit and container scan reviewed
- [ ] PostgreSQL schema and versioned migrations apply to an empty database and upgrade a previous release
- [ ] Automated integration tests use an isolated PostgreSQL test database
- [ ] Registration, login, workspace isolation, authorization matrix, expiry and session revocation verified
- [ ] Product create/edit/list persist and synchronize across browsers
- [ ] Inventory adjustments, receiving, transfer, cycle count, reservation and dispatch are transactional and auditable
- [ ] POS checkout is concurrency-safe, idempotent, correctly prices totals server-side, and reconciles inventory
- [ ] Customers, suppliers, purchasing, expenses and finance persist server-side with tenant-scoped access controls
- [ ] Reports derive only from persisted transactions; no demo/illustrative data in live mode
- [ ] Payment webhook signature, replay, duplicate, delayed, failed and mismatched-stock scenarios verified in sandbox
- [ ] Subscription renewals/dunning/cancellation/refunds/reconciliation requirements implemented or explicitly excluded from product scope
- [ ] E-wallet UI clearly states whether it is a ledger only; no claim of real transfers without a licensed provider integration
- [ ] HTTPS, exact CORS origins, proxy trust, rate limits, secret management, log redaction and security headers reviewed
- [ ] Backup and restore drill, monitoring, alerting, retention/deletion process and incident runbook verified
- [ ] Android phone and desktop browser E2E/accessibility/usability checks passed
- [ ] Business owner signs off taxes, receipts, privacy terms, service terms, support and operational runbooks

Until these items are complete, label this build **staging / controlled pilot**, not production-certified.


## Core UI/API wiring gate
- [ ] Run authenticated PostgreSQL integration tests for product create/edit, stock adjustment, warehouse/location creation, and POS checkout.
- [ ] Verify UI state after failed API calls and after reload/re-login.
- [ ] Verify location quantities and multi-product bins in WMS UI.
- [ ] Verify sale receipt items and transaction history against persisted sale_items.
- [ ] Verify concurrency behavior with two simultaneous checkouts for the same stock.


## WMS integration follow-up (v6.3.0-dev.5)
- [ ] Exercise receiving, transfer, cycle count, pick reservation and dispatch against an isolated PostgreSQL test database.
- [ ] Test concurrent transfers/counts/dispatches for the same product-location balance.
- [ ] Add pick-list cancellation and reservation-release workflows before operational rollout.
- [ ] Verify multi-product location display, fractional quantity handling and stock movement history on Android and desktop.


## CRM and purchasing follow-up (v6.4.0-dev.6)
- [ ] Apply migration 003 to an isolated PostgreSQL database and verify fresh-install schema equivalence.
- [ ] Test customer/supplier uniqueness, workspace isolation, role restrictions and customer deletion/privacy handling.
- [ ] Test partial receipts, over-receipt rejection, idempotent retries, duplicate references and concurrent receiving.
- [ ] Verify purchase order lines, receipt lines, inventory balances, movement history and customer sales aggregates with SQL assertions.
- [ ] Expand Purchasing UI to edit multiple product lines and add PO cancellation, supplier invoice/payables, returns and accounting linkage.


## v6.5 additional gate items
- [ ] Apply migration 004 after migrations 002 and 003 in staging and verify rollback/restore.
- [ ] Verify expense create/list and finance summary with real PostgreSQL under viewer/member/manager roles.
- [ ] Verify purchase-order cancellation races safely against receipt posting.
- [ ] Implement and test supplier payables, customer receivables/aging, purchase returns, double-entry accounting, tax handling, and bank/payment reconciliation before claiming accounting completeness.
- [ ] Complete mobile browser E2E, monitoring, TLS, backup restore drill, and independent security review.
