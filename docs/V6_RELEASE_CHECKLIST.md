# iCAN v6 release checklist

## Included in this consolidated development build
- [x] Mobile-first iCAN workspace UI, POS barcode workflows, WMS prototype, receipts and local demo data
- [x] Express API, PostgreSQL schema, account registration/login, workspace membership, Tasks API
- [x] Workspace-scoped product, warehouse/location, inventory adjustment, and transactional sales APIs
- [x] Separate subscription and merchant payment records
- [x] PayMongo v2 hosted checkout session creation (sandbox-first)
- [x] Raw-body HMAC webhook signature verification and duplicate-event protection
- [x] Merchant inventory reservation and webhook-based sale fulfillment
- [x] Setup, API, payment, scanner, and WMS documentation
- [x] Static tests and JavaScript syntax checks

## Required before any live commercial use
- [ ] Install dependencies and run the full suite on the target machine/environment
- [ ] Apply schema/migrations on a clean PostgreSQL database and test restore from backup
- [ ] End-to-end browser and mobile testing with real PayMongo test-mode keys
- [ ] Verify test and live webhook delivery separately over HTTPS
- [ ] Add explicit PayMongo Checkout Session expiration/reconciliation job before relying on timed inventory reservations
- [ ] Integrate PayMongo Subscriptions API for automatic recurring renewal only after account enablement; test renewals, failures, cancellations, and past-due access
- [ ] Add refunds and payment reconciliation workflows
- [ ] Decide and obtain provider approval for the merchant marketplace/connected-account settlement model
- [ ] Complete authentication hardening (email verification, recovery, session revocation, MFA where appropriate)
- [ ] Complete RBAC matrix, rate limits on sensitive routes, monitoring, alerting, backup/restore drill, and security review
- [ ] Tax-compliant invoices/receipts and legal/compliance review for target countries
- [ ] Confirm PayMongo account eligibility, fees, accepted methods, supported currencies, and international card policy

**Do not use live payment credentials or real customer data until the required checklist is completed.**
