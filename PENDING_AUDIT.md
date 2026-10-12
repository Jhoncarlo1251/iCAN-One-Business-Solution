# iCAN One Business Solution — Consolidated Pending Audit

Audit date: 2026-10-12
Build line: v6.6 Java backend / existing Node.js backend retained

## Verified in the available workspace

- Existing Node.js regression tests pass (36/36 after this pass).
- Java source-level contract checks pass (10/10 after this pass).
- Java smoke-test script passes Python syntax compilation.
- ZIP archive integrity is checked when release package is built.
- Java Spring Boot + PostgreSQL + Flyway source, Dockerfile, Compose configuration, schema migration, and staging smoke test are present.
- The Java API now centrally restricts POST/PATCH/PUT/DELETE routes to OWNER, ADMIN, or MANAGER roles. Health and auth registration/login stay public. This is statically verified, not yet runtime-tested.
- Existing Node API continues to be the more complete fallback for payment foundations and current workflows; do not switch production traffic to the Java API until route parity is verified.

## Still pending — cannot be honestly marked complete yet

### Release-blocking runtime/deployment checks

- Compile/package Java application with Maven.
- Provision a real PostgreSQL instance and apply Flyway migrations against it.
- Start the Java API and verify `/api/health` and `/api/health/db`.
- Run `backend-java/smoke-test.py` against a staging URL (registration, JWT, workspace isolation, products).
- Run browser/mobile end-to-end workflows against the real deployed API and database.
- Test backup/restore, logs, restart behavior, TLS, exact CORS origin, and secret rotation.

### Backend completeness

- Java backend is a partial port; it does not replace all Node routes. Payment provider routes and some advanced workflows remain Node-only.
- Complete and test recurring subscription renewal, refund handling, payment reconciliation, checkout expiration, and multi-merchant settlement before real payments.
- Complete full accounting ledger and AR/AP settlement; current Java finance summary is not a full accounting system.
- Review API validation, rate limiting, password/session policy, tenant isolation, and all role-based permissions with live integration tests.
- Review idempotency and transaction/locking behavior for every stock and sales workflow.

### Frontend/module parity

- Verify every frontend API call against the selected backend and ensure all module writes persist after reload.
- Projects, calendar, HR, AI/automation, and other modules must be individually audited for API/database persistence; any local/demo-only behavior must remain clearly labeled until integrated.
- Replace the development-only sessionStorage bearer-token approach with a reviewed production session strategy before public launch.

## Release rule

This build is a development/staging candidate, not production-certified. Do not process real payments or live financial transactions until the runtime, database, authorization, end-to-end, payment reconciliation, and backup/restore gates pass.

## What blocks the remaining live steps

The current execution environment has Java 21 but no Maven, Docker, or PostgreSQL CLI, and Maven Central was unreachable during the previous verification pass. A real deployment also requires the user's chosen hosting target and credentials configured privately in that provider; these must not be sent in chat.

## v6.7 AI Workforce status
- Added eight role-specific Mistral AI specialists in the iCAN AI interface.
- Added authenticated Node API adapter; workspace membership is checked before forwarding a request to Mistral.
- Mistral key remains server-side; optional context is sent only when the user enters it; endpoint is advisory-only and executes no actions.
- `MISTRAL_API_KEY` must be configured privately on the server before provider calls can work.
- Automated Node tests: 38/38 passed, including AI role and secret-handling source checks; JS syntax checks passed.
- Not yet tested: live Mistral API call, usage-cost controls, real hosting, mobile end-to-end behavior, and any connection to live business records.
- Do not market these roles as autonomous AI employees yet. They are role-specific advisory agents only; business data tools, approval-gated actions, detailed AI audit logs, and role-by-role permission policy remain future work.
