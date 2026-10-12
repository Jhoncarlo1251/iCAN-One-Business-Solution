# iCAN One Business Solution — Integrated Core v6 (Development Build)

A starter for a **self-managed modular-monolith API** using Node.js, Express, and PostgreSQL. It does not require Supabase. The iCAN HTML/CSS/JS frontend is included with a development API connection for account registration/login and PostgreSQL-backed Tasks. Other modules still use local demo data.

## Included
- Consolidated iCAN workspace, POS/barcode scanner, WMS, and Node.js/Express + PostgreSQL foundation
- Separate PayMongo hosted checkout flows for iCAN subscriptions and business customer orders (sandbox-first)
- Server-defined subscription plan prices, webhook signature verification, payment event idempotency, and payment history API
- Merchant checkout reserves inventory and records a sale only after a verified paid webhook
- Node.js/Express API with basic security headers and origin allow-list CORS
- PostgreSQL schema for users, workspaces, memberships, tasks, and audit events
- Bluetooth HID barcode scanner workflow in the POS (keyboard-emulation mode)
- Product barcode field, duplicate SKU/barcode checks, exact barcode/SKU lookup
- POS cart quantity controls, checkout stock deduction, and local sales record updates
- Barcode test guide at `docs/BARCODE_SCANNER_TEST.md`
- Password hashing with bcrypt
- Short-lived JWT access tokens
- Register/login/me endpoints
- Tenant/workspace membership checks for starter task CRUD
- Request validation using Zod
- Health and database health endpoints
- Local setup guide and API reference

## Quick start
Follow [`docs/LOCAL_SETUP.md`](docs/LOCAL_SETUP.md). Do not skip the database setup or `.env` configuration.

## Project layout
```text
index.html, styles.css, src/app.js   iCAN workspace frontend (some modules remain local demo)
src/server.js                       API entry point
src/routes/auth.js                  Registration, login, current user/workspaces
src/routes/tasks.js                 Workspace-scoped task API
db/schema.sql                       PostgreSQL starter schema
docs/                               Setup and API docs
.env.example                        Environment variable template
```

## Important limitations
This is a development foundation, not a production-certified SaaS. Only the Tasks module is connected to the API. Product catalog, barcode lookup, POS checkout, inventory deduction, and sales history in this build work as local demo data; they are not yet persisted to PostgreSQL or synced across devices. Before real users or business data, implement and test rate limiting, email verification, password reset, MFA where appropriate, refresh-token/session revocation, detailed role-based permissions, secure frontend token handling, migrations, automated tests, monitoring, backup/restore, deployment hardening, and independent security review. JWTs are currently returned to the client for API testing; don't store them in browser localStorage as a final production decision without a threat-model review.

## Architecture direction
Frontend → iCAN API → PostgreSQL. File storage, email, payments, and AI can be integrated later behind interfaces so the core business data and business rules remain under iCAN's control.


## Warehouse Management System (WMS) prototype

This version adds a Warehouse Management page with demo warehouse/location management, receiving, location transfers, cycle counts, pick lists, dispatch confirmation, and movement history. See `docs/WMS_IMPLEMENTATION_STATUS.md` for the exact boundary between local prototype behavior and production work. The WMS UI still stores its demo data in the browser and is not connected to WMS API routes. The PostgreSQL WMS schema is included in `db/schema.sql` as a foundation only; apply and test migrations before using real data.


## v5 prototype additions

- POS camera barcode scan using the browser `BarcodeDetector` API when supported. Camera use requires permission and HTTPS (or localhost). Manual entry and Bluetooth/USB HID scanners remain available.
- E-wallet cash-in/cash-out ledger demo for GCash, Maya, and Other. It records manually entered transactions and balances locally; it does not send funds or connect to a wallet provider.
- E-receipts are generated after demo checkout and can be viewed/printed or saved as PDF. Receipt records are browser-local.
- E-wallet checkout/payment integration is planned but disabled. No real payment is processed by this prototype.

See `docs/WMS_IMPLEMENTATION_STATUS.md` for limitations and next backend work.

## Integrated Core v6 note
See `docs/V6_STATUS.md` for the new product, inventory adjustment, and transactional sales API routes, setup steps, and remaining production-readiness gaps. The frontend POS/WMS screens are not all API-connected yet; do not treat local demo screens as live transaction systems.

V6 also adds workspace-scoped warehouse and storage-location API endpoints. See `docs/V6_STATUS.md`.

## PayMongo payment integration
Read [`docs/PAYMENT_INTEGRATION.md`](docs/PAYMENT_INTEGRATION.md) before configuring payments. The integration defaults to test mode and requires your own PayMongo account keys and webhook signing secret. It does not include credentials.

**Readiness:** this is an integrated development build, not a production-ready SaaS. Subscription checkout currently grants a term after a one-time payment; automatic recurring renewals and marketplace settlement to multiple merchants are not implemented. Do not process live customer payments until the remaining items in the payment guide and go-live review are complete.


### v6.5 finance migration
After applying the base schema and migrations 002 and 003, apply migration 004 with `npm run db:migrate:finance`. It creates the persistent expenses table and indexes. The finance summary is a management overview only; it is not a statutory accounting ledger or reconciled balance sheet.

## Alternate Java backend (new in v6.6)

The `backend-java/` directory contains an independently implemented Java 21 + Spring Boot API with PostgreSQL, Flyway migrations, BCrypt password hashing, JWT bearer auth, workspace scoping, audit records, and initial products/CRM/tasks/finance/inventory/POS/WMS/purchasing routes. It is a parallel backend implementation, not a claim that every Node/Express endpoint (notably PayMongo payment flows) has been ported.

To run the Java stack with Docker, create a root `.env` containing a strong unique `DATABASE_PASSWORD`, a random `JWT_SECRET` of at least 32 characters, and the actual `CORS_ORIGINS` for your frontend. Then run `docker compose -f docker-compose.java.yml up --build -d`. Health endpoints are `/api/health` and `/api/health/db`. Read `backend-java/README.md` before deployment.

Verification caveat: the current environment did not have Maven installed, so the Java source was not compiled or started here. Build and integration-test it before using real data.

## iCAN AI Workforce (Mistral)

The iCAN AI page now provides eight role-specific AI specialists and a server-side Mistral API adapter. Roles include Chief of Staff, Finance Analyst, Sales & CRM, Operations & Inventory, Project & Task Manager, Developer & Automation Engineer, HR & People Operations, and Business Intelligence Analyst.

To enable provider requests:
1. Configure `MISTRAL_API_KEY` on the API server environment (never in frontend code or a public repository).
2. Optionally set `MISTRAL_MODEL` (default `mistral-small-latest`) and `MISTRAL_API_URL`.
3. Restart the API, sign in to a workspace, open **iCAN AI**, choose a specialist, and submit a question.
4. The authenticated server checks workspace membership before sending the prompt to Mistral. The endpoint does not load live business records or execute tools/actions. Optional context is only sent when the user explicitly enters it.

This is a role-based AI advisory foundation, not a fully autonomous agent system. No Mistral API call was live-tested without a configured key. Before production, add usage budgets, provider-specific audit/retention review, data-loss controls, and separately permissioned tool integrations with approval gates.

## Environment secrets and optional Supabase database

- Copy `.env.example` to `.env` and fill in only the keys for services you use. The ZIP intentionally contains no real credentials.
- Read [`docs/SECRETS_AND_ENV.md`](docs/SECRETS_AND_ENV.md) for the variable list and secret-handling rules.
- The app can use **Supabase PostgreSQL** through `DATABASE_URL`. See [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md).
- For Docker with local PostgreSQL, use `docker compose up --build -d` after configuring `.env`.
- For Docker with Supabase PostgreSQL instead of a local database container, use `docker compose -f docker-compose.supabase.yml up --build -d`.
- Supabase Auth and Storage are not yet connected to the app's login/file workflows; adding their keys does not activate those features. Do not set a real service-role key unless a reviewed server-side feature needs it.
