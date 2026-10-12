# iCAN environment variables and secrets

## First-time setup

1. Copy `.env.example` to `.env` in the project root.
2. Replace the placeholder database URL and `JWT_SECRET`; use a different random secret for each environment.
3. Add provider keys only when you have created them in the provider dashboard.
4. Restart the API after changing environment variables.
5. Keep `.env` on the server or private device. It is ignored by Git and must not be included in a public upload.

## Variable map

| Variable | Purpose | Needed now? |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection; can be local PostgreSQL or Supabase PostgreSQL | Yes for database routes |
| `JWT_SECRET` | Signs iCAN API access tokens | Required; production must use a unique random secret >=32 characters |
| `CORS_ORIGINS` | Exact frontend origins allowed to call the API | Required in production |
| `MISTRAL_API_KEY` | Server-side AI Workforce calls | Only if using iCAN AI |
| `PAYMONGO_SECRET_KEY` | Payment provider secret; test mode by default | Only for payment tests; do not use live payments yet |
| `PAYMONGO_WEBHOOK_SECRET_TEST` | Verifies test webhook signatures | For webhook testing |
| `SUPABASE_URL` | Supabase project URL | Optional; metadata/future adapter |
| `SUPABASE_ANON_KEY` | Supabase publishable/anon key | Not used by current login/database routes |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged Supabase server key | Not used by current app flows; keep empty until a reviewed server-side feature needs it |

## Generate a JWT secret

Use a password manager's random generator, or run `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` on a trusted computer. Do not use the example placeholder.

## Safety rules

- Never paste real keys/passwords into ChatGPT, public issues, or frontend JavaScript.
- Never prefix server secrets with `VITE_`, `NEXT_PUBLIC_`, or other public frontend environment prefixes.
- Do not enable PayMongo live mode until payment lifecycle, refunds, reconciliation, webhook behavior, and production security are independently tested.
- Revoke and rotate any key that has been exposed.
- `.env.example` and `.env.production.example` contain placeholders only. Create your own local `.env` after extracting the ZIP.
