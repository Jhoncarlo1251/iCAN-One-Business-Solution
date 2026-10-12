# iCAN Java Backend (v6.6 development)

A Java 21 + Spring Boot REST API for iCAN, using PostgreSQL, Flyway migrations, BCrypt password hashing, JWT bearer authentication, workspace scoping, audit events, and transactional stock/sales/purchasing operations.

## Implemented endpoints

- `GET /api/health`, `GET /api/health/db`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST /api/products`, `PATCH /api/products/{id}`
- `GET/POST /api/customers`, `GET/POST /api/suppliers`
- `GET/POST /api/expenses`, `GET /api/finance/summary`
- `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/{id}`
- `GET/POST /api/warehouses`, `GET/POST /api/warehouses/locations`
- `GET /api/inventory`, `POST /api/inventory/adjustments`
- `GET /api/sales`, `POST /api/sales/checkout`
- `GET /api/wms/movements`, `GET /api/wms/pick-lists`, WMS locations/receipts/transfers/cycle-counts/pick/dispatch
- `GET/POST /api/purchase-orders`, purchase-order cancellation and partial receiving

## Run locally

Requires Java 21, Maven 3.9+, and PostgreSQL 15+.

Set environment variables before starting:

```sh
export DATABASE_URL='jdbc:postgresql://localhost:5432/ican'
export DATABASE_USER='ican'
export DATABASE_PASSWORD='use-a-strong-database-password'
export JWT_SECRET="$(openssl rand -base64 48)"
export CORS_ORIGINS='http://localhost:8080'
mvn spring-boot:run
```

The first startup runs Flyway migrations. For a packaged jar: `mvn package`, then `java -jar target/ican-java-backend-6.6.0-dev.2.jar`.

## Docker

From the project root, create a `.env` file with strong unique `DATABASE_PASSWORD` and `JWT_SECRET` values, and set `CORS_ORIGINS` to the actual frontend origin. Run:

```sh
docker compose -f docker-compose.java.yml up --build -d
```

Health check: `http://localhost:4000/api/health` and `/api/health/db`.

## Frontend connection

The current UI API bridge still defaults to port 4000 for local development. In the browser's **Connect API** dialog, enter the Java API URL (for example `http://localhost:4000`). When deployed, use the HTTPS API origin and configure `CORS_ORIGINS` to the exact frontend origin. The frontend expects `accessToken`; this backend returns `accessToken` plus `token` for compatibility.

## Important limitations

This is a new Java implementation, not a claim that every previous Node.js route has been ported or independently audited. The current UI and Java API need end-to-end testing against a real PostgreSQL instance. Payment subscriptions/webhooks, connected wallet transfers, accounting double-entry, receivables/payables settlement, returns, and some advanced WMS flows are not implemented here. Do not process live financial transactions until deployment, migrations, integration tests, backup/restore, and security review are complete.

## Live smoke test (after deployment)

The build environment used for this package does not include Maven, Docker, or PostgreSQL CLI, and external package repositories are unreachable. Static checks are not a substitute for running the server. After deploying the API and database and applying Flyway migrations, run this with Python 3:

```sh
ICAN_API_URL='https://your-api-domain.example' python3 backend-java/smoke-test.py
```

This checks API health, PostgreSQL connectivity, registration/token issuance, authenticated `/api/auth/me`, and workspace-scoped product listing. It creates one temporary smoke-test account; use a staging database, not production. This is not a full security or concurrency test.
