# iCAN One Business Solution v6.7 — AI Workforce Integration Build

- Version: `6.7.0-dev.1`
- Base: v6.6.3 Security & Pending Audit Pass
- New feature: role-based iCAN AI Workforce with eight specialist roles and a Mistral API adapter.
- Backend: authenticated `/api/ai/roles` and `/api/ai/ask` endpoints; workspace membership checked before provider requests; API key is server-side only; request lengths bounded; provider timeout configured.
- Frontend: role selector, task prompt, optional user-supplied context, response status and explicit advice-only messaging. No actions are executed by the AI endpoint.
- Provider configuration: `MISTRAL_API_KEY`, optional `MISTRAL_MODEL` and `MISTRAL_API_URL` in the server environment.
- Tests: 38/38 Node tests pass, including two AI Workforce source/security contract tests; JavaScript syntax checks pass.
- Not verified: no live Mistral request was sent because no API key was configured; no production hosting, live PostgreSQL, or mobile end-to-end verification was performed.

This remains a development/staging build, not production-certified. The AI specialists do not yet read live business data or execute tools. Future work needs separately permissioned business-data connectors, per-role access scopes, AI usage budgets, audit/retention controls, approval-gated tools, and end-to-end tests.
