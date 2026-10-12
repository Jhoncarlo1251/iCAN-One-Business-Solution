# iCAN Java + PostgreSQL Deployment Runbook

**Status:** prepared for deployment; not yet live. This runbook does not imply a server, database, or migration has already been provisioned.

## Required access

Choose a hosting provider/server that supports Docker and provide the repository/deployment target. Keep credentials in the provider's secret/environment-variable settings; never commit `.env` or share passwords in chat.

## Services

- PostgreSQL 16, private network only, persistent storage enabled.
- Java 21 Spring Boot API, container build from `backend-java/Dockerfile`, port `4000` (or platform-provided `PORT`).
- HTTPS ingress for the API and the frontend's exact origin in `CORS_ORIGINS`.

## Required environment variables for Java API

- `DATABASE_URL`: JDBC URL, e.g. `jdbc:postgresql://HOST:5432/ican`
- `DATABASE_USER`: dedicated least-privilege database user
- `DATABASE_PASSWORD`: strong unique secret
- `JWT_SECRET`: at least 32 random characters; use a secret manager
- `CORS_ORIGINS`: comma-separated exact trusted frontend origins
- `PORT`: set by the host or `4000`

Do not expose PostgreSQL to the public internet. Do not use `ican_dev_only` in production.

## Local or VPS deployment with Docker Compose

1. Install Docker Engine and the Docker Compose plugin on the target server.
2. Copy the repository to the server.
3. Create `.env` in the project root with strong random values:

```dotenv
DATABASE_PASSWORD=replace-with-a-long-unique-password
JWT_SECRET=replace-with-at-least-32-random-characters
CORS_ORIGINS=https://YOUR-FRONTEND-DOMAIN.example
```

4. Start the database and API:

```sh
docker compose -f docker-compose.java.yml up --build -d
```

5. Flyway migrations run automatically when the Java API starts. Check startup logs and confirm Flyway reports successful migration before continuing:

```sh
docker compose -f docker-compose.java.yml logs --tail=200 java-api
```

6. Verify API and database health:

```sh
curl -fsS http://127.0.0.1:4000/api/health
curl -fsS http://127.0.0.1:4000/api/health/db
```

7. Run the staging smoke test from a machine with Python 3 and internet access:

```sh
ICAN_API_URL='https://YOUR-API-DOMAIN.example' python3 backend-java/smoke-test.py
```

The smoke test creates a temporary account. Use staging, not production.

## Frontend connection and workflow test

The frontend API bridge is `src/api-client.js`. It defaults to same-origin in hosted mode and `http://localhost:4000` for local development. If frontend and API are on different origins, set `window.ICAN_API_BASE` to the HTTPS API origin before `api-client.js` loads, or use the **Connect API** dialog, and configure matching `CORS_ORIGINS` on the API.

Test with a staging workspace and test data:

1. Register an account; sign out and sign in again.
2. Reload the page and confirm the authenticated workspace is restored.
3. Create and edit a product; verify product persists after refresh.
4. Create a warehouse/location; receive stock and verify quantity/movement history.
5. Create a customer and supplier; create a purchase order and receive part of it.
6. Complete a test sale and confirm stock cannot become negative; retry an identical idempotency key only through controlled API tests.
7. Create an expense/task and verify both persist after refresh.
8. Attempt access with a second workspace/account and confirm records are isolated.
9. Test logout, invalid/expired token, API unavailable state, CORS, and mobile viewport.

## Release gate / known limits

- Do not call this deployment complete until a live Java build, Flyway migration, smoke test, frontend end-to-end checks, role/tenant authorization review, and backup/restore test pass.
- The available environment used for preparation does not have Maven, Docker, or PostgreSQL CLI and cannot reach Maven Central; Java compilation and live database tests therefore have not been performed here.
- The Java backend is a partial port. Compare every frontend API call with Java endpoints before switching all users from the existing Node API. Payment integrations and several advanced accounting/payment workflows remain incomplete.
- Do not process real payments or production financial transactions until security review and reconciliation tests are complete.
