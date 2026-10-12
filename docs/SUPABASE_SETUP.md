# Supabase setup for iCAN

## What works in this build

iCAN's Node API uses PostgreSQL through the `pg` package. You can use **Supabase-hosted PostgreSQL as the database** by putting the database connection string into `DATABASE_URL`. This does not automatically switch iCAN login to Supabase Auth or file uploads to Supabase Storage.

## Connect Supabase PostgreSQL

1. Create a project at https://supabase.com/ and wait until the database is ready.
2. Open the project dashboard and select **Connect** (or the database connection settings).
3. Copy the PostgreSQL connection string. For hosted/serverless deployment, choose the connection method recommended for your host; the Supabase pooler is often the right choice. Do not use a browser/public frontend for this connection.
4. Copy `.env.example` to `.env` on the machine running the API.
5. Replace `DATABASE_URL` with the copied connection string. URL-encode special characters in the database password if required. Set `PGSSL=true` for Supabase hosted PostgreSQL.
6. Apply the iCAN schema to the new database. From a machine with `psql` installed, run `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/schema.sql`. Apply the numbered migrations in `db/migrations/` in the order described by the project README/runbook. Do not apply to an existing production database before taking a backup and reviewing the SQL.
7. Start the API with `npm install` then `npm start`, and check `/api/health/db`.

## Supabase keys

- `SUPABASE_URL`: project URL.
- `SUPABASE_ANON_KEY`: publishable/anon key. It is not a database password, but it is still not needed by the current app's API flow.
- `SUPABASE_SERVICE_ROLE_KEY`: privileged server-side key. Treat it like a root password; never put it in frontend code, screenshots, or source control.
- `SUPABASE_STORAGE_BUCKET`: reserved configuration for a future storage adapter.

**Current limitation:** the app's authentication is its own Node/JWT implementation, and the app does not yet use Supabase Auth or Storage for sign-in, files, or avatars. Adding these environment variables alone does not enable those features. Row Level Security policies for Supabase REST access also need to be designed before exposing tables through the Supabase API.
