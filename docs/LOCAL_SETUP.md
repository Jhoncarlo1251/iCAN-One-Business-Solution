# Run iCAN API locally (Windows/macOS/Linux)

This is the development path. The API is not deployed publicly and is not production-ready.

## 1. Install prerequisites
- Install Node.js 20 or later.
- Install PostgreSQL 15 or later and make sure its service is running.

## 2. Create database and app user
Open `psql` as a PostgreSQL administrator, then run commands similar to these. Replace the password with a strong unique password:

```sql
CREATE USER ican_app WITH PASSWORD 'REPLACE_WITH_A_STRONG_UNIQUE_PASSWORD';
CREATE DATABASE ican_db OWNER ican_app;
```

Connect to the `ican_db` database as an administrator and run `db/schema.sql` for a fresh database:

```bash
psql -U ican_app -d ican_db -f db/schema.sql
```

If your environment doesn't allow the app user to create extensions, run `CREATE EXTENSION pgcrypto;` as a database administrator first.

If you already installed an earlier iCAN schema, back up the database and run the additive payment migration from the project root (with `DATABASE_URL` configured):

```bash
npm run db:migrate:payments
```

## 3. Configure secrets
Copy `.env.example` to `.env`. Set `DATABASE_URL` to your database credentials. Generate a JWT secret with a cryptographically secure random generator; for Node.js, one option is:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Paste the generated value into `JWT_SECRET`. Never share or commit `.env`.

## 4. Install and run
In the VS Code terminal, from the project folder:

```bash
npm install
npm run db:check
npm run dev
```

Open `http://localhost:4000/api/health` and `http://localhost:4000/api/health/db`. A `401` from protected routes without a token is expected.

## 5. Run the frontend and connect it to the API

1. In one VS Code terminal, start the API from the project root:

   ```bash
   npm run dev
   ```

2. In VS Code, install/use the **Live Server** extension and open `index.html` with Live Server. The usual address is `http://127.0.0.1:5500` or `http://localhost:5500`. Do not open `index.html` as a `file://` URL for API testing.
3. Keep the API terminal running at `http://localhost:4000`.
4. In the iCAN header, select **Connect API**. Choose **Create account + workspace** for a new test account, or **Sign in** for an existing account.
5. Use a test email and a unique password of at least 12 characters. After connection, open **Tasks**. Create, complete, and delete a task; these task actions should use the API and PostgreSQL.
6. The API connection status appears in the header/footer. If connection fails, check `/api/health`, database health, and `CORS_ORIGINS` in `.env`.

The integration stores its short-lived bearer token in `sessionStorage` only as a development convenience. This is not the final production session strategy. Do not use real customer information or expose the API publicly yet.

## 6. Test registration via API client (optional)
Use an API client (for example, VS Code REST Client extension, curl, or Postman) to POST JSON to `http://localhost:4000/api/auth/register`:

```json
{
  "name": "Workspace Owner",
  "workspaceName": "My Business",
  "email": "owner@example.com",
  "password": "a-long-unique-password-12"
}
```

Copy the returned `workspace.id` and `accessToken` to test the task endpoints. Do not use real customer information during early testing.

## Notes
- The existing frontend is still a local demo and is **not yet wired to this API**. This starter is a separate backend foundation; the next development step is to connect frontend features one by one.
- Set `CORS_ORIGINS` to the exact trusted frontend origins. Don't use `*` for a production app with authenticated data.
- For public deployment, add HTTPS, rate limiting, refresh/session strategy, email verification and recovery, stronger role/permission checks, automated tests, migrations, logging/monitoring, backups, restore drills, and a security review.
- Never expose the database port to the public internet if the API can access it privately.
