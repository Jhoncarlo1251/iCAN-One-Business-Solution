# iCAN v6 deployment bundle

This repository now includes a Docker Compose deployment topology for the current API + PostgreSQL schema + static frontend. It is a **repeatable deployment candidate**, not a claim that every product module is production-certified. Customer-facing launch remains blocked until the release gates below pass against a real staging environment.

## Included topology

- Nginx serves the current static Bootstrap-oriented frontend and reverse-proxies `/api/` to Express.
- Express API runs in a non-root Node container with health checks.
- PostgreSQL runs on a private internal network with a persistent Docker volume; its port is not published to the host.
- `.env.production.example` documents required secrets; never commit a populated `.env`.
- API-wide and stricter authentication rate limits are enabled. `TRUST_PROXY=1` is only set for the included single-Nginx-hop topology.

## First launch (staging only)

1. Install Docker Engine and the Docker Compose plugin on a server you control.
2. Copy `.env.production.example` to `.env`; replace all database/JWT secrets and set the exact public HTTPS origin and return URL. Start with PayMongo test keys only.
3. Run `docker compose config` and inspect the rendered configuration for accidental secrets or incorrect origins.
4. Run `docker compose up --build -d`.
5. Verify `http://SERVER:8080/api/health` and `/api/health/db`, then use TLS termination (managed platform load balancer or a reviewed reverse proxy) before exposing it publicly. The included Nginx service alone does **not** terminate HTTPS.
6. Run `npm test` in a Node 20+ development environment and repeat browser/API checks against staging.

The PostgreSQL init mount runs `db/schema.sql` only when the database volume is first created. Later schema changes require explicit versioned migrations and a backup; do not delete the production volume to apply schema changes. The current payment migration is separate and the schema/migration strategy still needs to be consolidated before ongoing production releases.

## Go-live blockers — do not skip

- **Module persistence:** frontend Products, Inventory, POS/Sales, WMS, Customers, Suppliers, Expenses, Projects, Calendar, Notes/Cloud, e-wallet ledger and Reports are not all connected end-to-end to server-backed storage. Local browser data is not a shared database and must not be treated as authoritative.
- **Identity/session:** bearer access token currently lives in `sessionStorage`; no reviewed secure-cookie refresh/revocation strategy, email verification, account recovery, or MFA lifecycle is complete.
- **Billing:** PayMongo checkout/webhook foundation exists, but automatic recurring subscription renewal/dunning and marketplace connected-account settlement are not implemented. GCash/Maya cash-in/out screens do not move funds.
- **Operations:** establish managed TLS, backups and tested restores, monitoring/alerting, structured log redaction, retention policy, incident response, migration rollback, dependency scanning, penetration/security review, privacy/data-retention review and applicable tax/receipt compliance.
- **Verification:** run PostgreSQL-backed integration tests, browser/mobile E2E tests, concurrent checkout/stock tests, payment webhook replay tests, restore drill, and load tests in staging with the actual chosen host/provider.

## Security notes

- Use separate staging and production databases and credentials.
- Keep PostgreSQL private; restrict host firewall and admin access.
- Do not switch `PAYMONGO_MODE=live` until account approval, live webhook secret, HTTPS callback, reconciliation and full sandbox acceptance tests have passed.
- Rotate any secret that has ever been committed or shared. Do not paste secrets into support chats.
- Use a managed TLS/load-balancer layer; do not assume the HTTP-only container stack supplies HTTPS.
