import 'dotenv/config';
import { pool } from './db.js';
try { const r = await pool.query('SELECT version()'); console.log('PostgreSQL connection successful:', r.rows[0].version); } catch (err) { console.error('PostgreSQL connection failed:', err.message); process.exitCode = 1; } finally { await pool.end(); }
