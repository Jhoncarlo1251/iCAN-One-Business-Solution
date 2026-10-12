import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import productRoutes from './routes/products.js';
import inventoryRoutes from './routes/inventory.js';
import salesRoutes from './routes/sales.js';
import warehouseRoutes from './routes/warehouses.js';
import wmsRoutes from './routes/wms.js';
import paymentRoutes, { paymongoWebhookHandler } from './routes/payments.js';
import crmPurchasingRoutes from './routes/crm-purchasing.js';
import financeRoutes from './routes/finance.js';
import aiWorkforceRoutes from './routes/ai-workforce.js';
import { pool } from './db.js';

const app = express();
app.disable('x-powered-by');
// The included deployment topology has one trusted Nginx proxy in front of Express.
// If deployed behind a different proxy chain, set this to the exact trusted hop count.
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use(helmet());
// Safe local-development defaults; production deployments must explicitly configure allowed origins.
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && (!process.env.DATABASE_URL || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || !process.env.CORS_ORIGINS)) {
  throw new Error('Production startup blocked: configure DATABASE_URL, a JWT_SECRET of at least 32 characters, and explicit CORS_ORIGINS.');
}
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5500,http://127.0.0.1:5500,http://localhost:4000').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin(origin, cb) { if (!origin || allowedOrigins.includes(origin)) return cb(null, true); return cb(new Error('Origin not allowed by CORS')); }, methods: ['GET','POST','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization','Idempotency-Key'] }));
// Preserve the raw body for PayMongo HMAC signature verification.
app.post('/api/webhooks/paymongo', express.raw({ type: 'application/json', limit: '256kb' }), paymongoWebhookHandler);
app.use(express.json({ limit: '100kb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'ican-api', environment: process.env.NODE_ENV || 'development' }));
app.get('/api/health/db', async (_req, res) => { try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); } catch { res.status(503).json({ status: 'error', database: 'unavailable' }); } });
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'API request limit reached. Please retry later.' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many authentication requests. Please try again later.' } });
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/wms', wmsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', crmPurchasingRoutes);
app.use('/api', financeRoutes);
app.use('/api/ai', aiWorkforceRoutes);
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((err, _req, res, _next) => {
  if (err.message === 'Origin not allowed by CORS') return res.status(403).json({ error: 'Origin not allowed.' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});
const port = Number(process.env.PORT || 4000);
const server = app.listen(port, () => console.log(`iCAN API listening on http://localhost:${port}`));
async function shutdown(signal) { console.log(`${signal} received; closing server...`); server.close(async () => { await pool.end().catch(() => {}); process.exit(0); }); setTimeout(() => process.exit(1), 10000).unref(); }
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
