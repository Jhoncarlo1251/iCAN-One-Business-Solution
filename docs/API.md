# iCAN API starter reference

Base URL: `http://localhost:4000/api`

## Health
- `GET /health` — process health, no database access.
- `GET /health/db` — database connectivity check.

## Authentication
- `POST /auth/register` body: `{ "name":"Your Name", "workspaceName":"My Business", "email":"you@example.com", "password":"use-a-long-unique-password" }`
- `POST /auth/login` body: `{ "email":"you@example.com", "password":"..." }`
- `GET /auth/me` requires `Authorization: Bearer <accessToken>`.

Passwords must be at least 12 characters. The access token expires after two hours. This starter does not yet implement refresh tokens, email verification, password reset, MFA, account lockout, or session revocation.

## Tasks
All task routes require `Authorization: Bearer <accessToken>`.
- `GET /tasks?workspaceId=<workspace UUID>`
- `POST /tasks` body: `{ "workspaceId":"<UUID>", "title":"Review sales", "description":"", "dueDate":"2026-10-20", "priority":"high" }`
- `PATCH /tasks/:id` body: `{ "workspaceId":"<UUID>", "completed":true }`
- `DELETE /tasks/:id?workspaceId=<workspace UUID>`

Each request checks workspace membership. More granular role checks and wider CRUD APIs are still needed before production.


## Frontend integration status

The included frontend can register/login against `/api/auth/register` and `/api/auth/login`, then load the first workspace via `/api/auth/me`. Only the Tasks screen uses `/api/tasks` for CRUD when connected. Other screens are still demo/local data. The development UI uses `sessionStorage` for the access token; replace this before production with a reviewed secure session strategy.

## Payments (PayMongo sandbox-first)
Payment endpoints require a Bearer token. Subscription billing and merchant customer payments are intentionally separate.

- `GET /payments/status?workspaceId=<UUID>` — subscription and recent payment transactions.
- `POST /payments/subscription/checkout` body: `{ "workspaceId":"<UUID>", "idempotencyKey":"sub-unique-123", "planId":"growth", "interval":"monthly" }`. Only workspace owners/admins may create a subscription checkout. Prices are server-defined.
- `POST /payments/merchant/checkout` body: `{ "workspaceId":"<UUID>", "idempotencyKey":"order-unique-123", "customerName":"Walk-in customer", "items":[{"productId":"<UUID>","locationId":"<UUID>","quantity":1}] }`. Optional `email` is supported. The backend calculates the amount from the database and reserves stock.
- `POST /webhooks/paymongo` — public PayMongo webhook endpoint. It verifies the raw body signature and processes `checkout_session.payment.paid` idempotently.

The browser never receives `PAYMONGO_SECRET_KEY`. Read `docs/PAYMENT_INTEGRATION.md` for setup, subscription renewal limitations, marketplace settlement boundaries, and go-live cautions.
