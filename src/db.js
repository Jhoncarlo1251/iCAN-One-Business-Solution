import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not set. API health works, but database routes will fail until configured.');
}
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Enable SSL via deployment-specific configuration when your database provider requires it.
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: true } : undefined,
  max: Number(process.env.PGPOOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});
pool.on('error', (err) => console.error('Unexpected idle PostgreSQL client error:', err.message));
