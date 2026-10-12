import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { createHostedCheckout, getPlanPriceMinor, PLAN_CATALOG, verifyPayMongoSignature } from '../lib/paymongo.js';

const router = Router();
router.use(requireAuth);
const subscriptionSchema = z.object({
  workspaceId: z.string().uuid(), idempotencyKey: z.string().trim().min(8).max(160),
  planId: z.enum(['starter', 'growth', 'business_pro', 'business_plus']),
  interval: z.enum(['monthly', 'annual']).default('monthly')
});
const merchantSchema = z.object({
  workspaceId: z.string().uuid(), idempotencyKey: z.string().trim().min(8).max(160),
  customerName: z.string().trim().min(1).max(200).default('Walk-in customer'),
  email: z.string().email().max(254).optional(),
  items: z.array(z.object({ productId: z.string().uuid(), locationId: z.string().uuid(), quantity: z.coerce.number().int().min(1).max(10000) })).min(1).max(100)
}).superRefine((d, ctx) => {
  const seen = new Set();
  d.items.forEach((item, i) => { const key = `${item.productId}:${item.locationId}`; if (seen.has(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items', i], message: 'Combine duplicate product/location lines.' }); seen.add(key); });
});
const billingRoles = ['owner', 'admin'];
const salesRoles = ['owner', 'admin', 'manager', 'member'];
const paymentMethods = () => (process.env.PAYMONGO_PAYMENT_METHOD_TYPES || 'card,gcash,qrph').split(',').map(x => x.trim()).filter(Boolean);
const returnBase = () => (process.env.PAYMENT_RETURN_URL || 'http://localhost:5500').replace(/\/$/, '');
async function memberRole(client, userId, workspaceId) {
  const r = await client.query('SELECT role FROM workspace_members WHERE user_id=$1 AND workspace_id=$2', [userId, workspaceId]);
  return r.rows[0]?.role || null;
}
async function createSessionForPayment({ paymentId, workspaceId, purpose, planId = '', interval = '', amountMinor, name, email }) {
  const base = returnBase();
  try {
    const session = await createHostedCheckout({
      secretKey: process.env.PAYMONGO_SECRET_KEY,
      idempotencyKey: `ican-${purpose}-${paymentId}`,
      referenceNumber: `ICAN-${paymentId}`,
      name,
      description: purpose === 'ican_subscription' ? `iCAN ${planId} subscription (${interval})` : 'iCAN merchant order',
      amountMinor, currency: 'PHP',
      successUrl: `${base}/?payment=success&paymentId=${paymentId}`,
      cancelUrl: `${base}/?payment=cancelled&paymentId=${paymentId}`,
      paymentMethodTypes: paymentMethods(),
      metadata: { payment_id: paymentId, workspace_id: workspaceId, purpose, plan_id: planId, billing_interval: interval },
      email
    });
    await pool.query('UPDATE payment_transactions SET provider_checkout_session_id=$1,checkout_url=$2,updated_at=now() WHERE id=$3', [session.id, session.checkoutUrl, paymentId]);
    return { paymentId, checkoutUrl: session.checkoutUrl, provider: 'paymongo', mode: session.livemode ? 'live' : 'test' };
  } catch (e) {
    await pool.query("UPDATE payment_transactions SET status='failed',failure_code=$1,updated_at=now() WHERE id=$2 AND status='pending'", [e.providerCode || 'checkout_creation_failed', paymentId]).catch(() => {});
    throw e;
  }
}
async function releaseExpiredReservations(client, workspaceId) {
  const expired = await client.query("SELECT id,items_json FROM payment_transactions WHERE workspace_id=$1 AND purpose='merchant_order' AND status='pending' AND expires_at<now() FOR UPDATE", [workspaceId]);
  for (const tx of expired.rows) {
    for (const item of tx.items_json || []) {
      await client.query('UPDATE inventory_balances SET reserved_quantity=GREATEST(0,reserved_quantity-$1),updated_at=now() WHERE workspace_id=$2 AND product_id=$3 AND location_id=$4', [item.quantity, workspaceId, item.productId, item.locationId]);
    }
    await client.query("UPDATE payment_transactions SET status='expired',updated_at=now() WHERE id=$1", [tx.id]);
  }
}

router.get('/status', async (req, res, next) => {
  const workspaceId = req.query.workspaceId;
  if (typeof workspaceId !== 'string') return res.status(400).json({ error: 'workspaceId query parameter is required.' });
  try {
    if (!await memberRole(pool, req.user.id, workspaceId)) return res.status(403).json({ error: 'Workspace access denied.' });
    const [sub, tx] = await Promise.all([
      pool.query('SELECT plan_id,status,billing_interval,current_period_start,current_period_end,updated_at FROM workspace_subscriptions WHERE workspace_id=$1', [workspaceId]),
      pool.query('SELECT id,purpose,plan_id,billing_interval,amount_minor,currency,status,provider,checkout_url,created_at FROM payment_transactions WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 50', [workspaceId])
    ]);
    res.json({ subscription: sub.rows[0] || { plan_id: 'free', status: 'free' }, transactions: tx.rows.map(x => ({ ...x, amount: Number(x.amount_minor) / 100, amount_minor: undefined })) });
  } catch (e) { next(e); }
});

router.post('/subscription/checkout', async (req, res, next) => {
  const parsed = subscriptionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid subscription checkout details.', details: parsed.error.flatten().fieldErrors });
  const d = parsed.data;
  const amountMinor = getPlanPriceMinor(d.planId, d.interval);
  try {
    if (!billingRoles.includes(await memberRole(pool, req.user.id, d.workspaceId))) return res.status(403).json({ error: 'Only workspace owners or admins can change subscription billing.' });
    const key = `sub:${d.idempotencyKey}`;
    const existing = await pool.query('SELECT id,status,checkout_url FROM payment_transactions WHERE workspace_id=$1 AND idempotency_key=$2', [d.workspaceId, key]);
    if (existing.rowCount) {
      if (existing.rows[0].status === 'pending' && existing.rows[0].checkout_url) return res.json({ paymentId: existing.rows[0].id, checkoutUrl: existing.rows[0].checkout_url, reused: true });
      return res.status(409).json({ error: 'This idempotency key was already used. Generate a new key for a new checkout.' });
    }
    const inserted = await pool.query("INSERT INTO payment_transactions(workspace_id,created_by,purpose,provider,plan_id,billing_interval,amount_minor,currency,status,idempotency_key,customer_name,expires_at) VALUES($1,$2,'ican_subscription','paymongo',$3,$4,$5,'PHP','pending',$6,$7,now()+interval '2 hours') RETURNING id", [d.workspaceId, req.user.id, d.planId, d.interval, amountMinor, key, req.user.email || 'iCAN subscriber']);
    const paymentId = inserted.rows[0].id;
    const result = await createSessionForPayment({ paymentId, workspaceId: d.workspaceId, purpose: 'ican_subscription', planId: d.planId, interval: d.interval, amountMinor, name: PLAN_CATALOG[d.planId].name, email: req.user.email });
    res.status(201).json(result);
  } catch (e) {
    if (e.message?.includes('PayMongo is not configured') || e.message?.includes('Live PayMongo mode is blocked')) return res.status(503).json({ error: e.message });
    next(e);
  }
});

router.post('/merchant/checkout', async (req, res, next) => {
  const parsed = merchantSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid merchant checkout details.', details: parsed.error.flatten().fieldErrors });
  const d = parsed.data;
  const client = await pool.connect();
  let paymentId = null;
  try {
    await client.query('BEGIN');
    if (!salesRoles.includes(await memberRole(client, req.user.id, d.workspaceId))) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Workspace access denied or role cannot create sales.' }); }
    await releaseExpiredReservations(client, d.workspaceId);
    const key = `merchant:${d.idempotencyKey}`;
    const existing = await client.query('SELECT id,status,checkout_url FROM payment_transactions WHERE workspace_id=$1 AND idempotency_key=$2 FOR UPDATE', [d.workspaceId, key]);
    if (existing.rowCount) {
      await client.query('COMMIT');
      if (existing.rows[0].status === 'pending' && existing.rows[0].checkout_url) return res.json({ paymentId: existing.rows[0].id, checkoutUrl: existing.rows[0].checkout_url, reused: true });
      return res.status(409).json({ error: 'This idempotency key was already used.' });
    }
    const prepared = [];
    let totalMinor = 0;
    for (const item of d.items) {
      const product = await client.query('SELECT id,name,sku,selling_price FROM products WHERE id=$1 AND workspace_id=$2 AND active=true FOR SHARE', [item.productId, d.workspaceId]);
      if (!product.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'A product was not found in this workspace.' }); }
      const balance = await client.query('SELECT quantity,reserved_quantity FROM inventory_balances WHERE workspace_id=$1 AND product_id=$2 AND location_id=$3 FOR UPDATE', [d.workspaceId, item.productId, item.locationId]);
      if (!balance.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: `No inventory balance for ${product.rows[0].name} at the selected location.` }); }
      const available = Number(balance.rows[0].quantity) - Number(balance.rows[0].reserved_quantity);
      if (available < item.quantity) { await client.query('ROLLBACK'); return res.status(409).json({ error: `Insufficient stock for ${product.rows[0].name}.`, available, requested: item.quantity }); }
      const unitPriceMinor = Math.round(Number(product.rows[0].selling_price) * 100);
      totalMinor += unitPriceMinor * item.quantity;
      prepared.push({ productId: item.productId, locationId: item.locationId, quantity: item.quantity, unitPriceMinor, sku: product.rows[0].sku, name: product.rows[0].name });
      await client.query('UPDATE inventory_balances SET reserved_quantity=reserved_quantity+$1,updated_at=now() WHERE workspace_id=$2 AND product_id=$3 AND location_id=$4', [item.quantity, d.workspaceId, item.productId, item.locationId]);
    }
    if (totalMinor <= 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Order total must be greater than zero.' }); }
    const inserted = await client.query("INSERT INTO payment_transactions(workspace_id,created_by,purpose,provider,amount_minor,currency,status,idempotency_key,customer_name,items_json,expires_at) VALUES($1,$2,'merchant_order','paymongo',$3,'PHP','pending',$4,$5,$6::jsonb,now()+interval '30 minutes') RETURNING id", [d.workspaceId, req.user.id, totalMinor, key, d.customerName, JSON.stringify(prepared)]);
    paymentId = inserted.rows[0].id;
    await client.query('COMMIT');
    const result = await createSessionForPayment({ paymentId, workspaceId: d.workspaceId, purpose: 'merchant_order', amountMinor: totalMinor, name: `Order for ${d.customerName}`, email: d.email });
    res.status(201).json({ ...result, amount: totalMinor / 100, currency: 'PHP' });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    if (paymentId) {
      const failed = await pool.query("SELECT workspace_id,items_json FROM payment_transactions WHERE id=$1 AND status='failed'", [paymentId]).catch(() => ({ rows: [] }));
      for (const item of failed.rows[0]?.items_json || []) await pool.query('UPDATE inventory_balances SET reserved_quantity=GREATEST(0,reserved_quantity-$1),updated_at=now() WHERE workspace_id=$2 AND product_id=$3 AND location_id=$4', [item.quantity, failed.rows[0].workspace_id, item.productId, item.locationId]).catch(() => {});
    }
    if (e.message?.includes('PayMongo is not configured') || e.message?.includes('Live PayMongo mode is blocked')) return res.status(503).json({ error: e.message });
    next(e);
  } finally { client.release(); }
});

export async function paymongoWebhookHandler(req, res) {
  const rawBody = req.body;
  const mode = process.env.PAYMONGO_MODE === 'live' ? 'live' : 'test';
  const secret = mode === 'live' ? (process.env.PAYMONGO_WEBHOOK_SECRET_LIVE || process.env.PAYMONGO_WEBHOOK_SECRET) : (process.env.PAYMONGO_WEBHOOK_SECRET_TEST || process.env.PAYMONGO_WEBHOOK_SECRET);
  if (!verifyPayMongoSignature(rawBody, req.headers['paymongo-signature'], secret, mode)) return res.status(401).json({ error: 'Invalid webhook signature.' });
  let envelope;
  try { envelope = JSON.parse(rawBody.toString('utf8')); } catch { return res.status(400).json({ error: 'Invalid JSON payload.' }); }
  const topAttrs = envelope?.data?.attributes || {};
  const eventType = topAttrs.type || envelope?.data?.type || envelope?.type || 'unknown';
  const resource = topAttrs.data || envelope?.data?.data || envelope?.data || {};
  const eventId = envelope?.data?.id || envelope?.id;
  if (!eventId) return res.status(400).json({ error: 'Webhook event ID is required.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const newEvent = await client.query("INSERT INTO payment_webhook_events(provider,provider_event_id,event_type,livemode) VALUES('paymongo',$1,$2,$3) ON CONFLICT(provider,provider_event_id) DO NOTHING RETURNING id", [eventId, eventType, Boolean(topAttrs.livemode ?? envelope?.data?.livemode ?? envelope?.livemode)]);
    if (!newEvent.rowCount) { await client.query('COMMIT'); return res.status(200).json({ received: true, duplicate: true }); }
    if (eventType !== 'checkout_session.payment.paid') {
      await client.query("UPDATE payment_webhook_events SET processed_at=now() WHERE provider='paymongo' AND provider_event_id=$1", [eventId]);
      await client.query('COMMIT'); return res.status(200).json({ received: true, ignored: true });
    }
    const attrs = resource?.attributes || {};
    const metadata = attrs.metadata || {};
    const reference = attrs.reference_number || '';
    const paymentId = metadata.payment_id || (reference.startsWith('ICAN-') ? reference.slice(5) : null);
    if (!paymentId) {
      await client.query("UPDATE payment_webhook_events SET processed_at=now() WHERE provider='paymongo' AND provider_event_id=$1", [eventId]);
      await client.query('COMMIT'); return res.status(200).json({ received: true, ignored: true, reason: 'No iCAN payment reference.' });
    }
    const paymentResult = await client.query('SELECT * FROM payment_transactions WHERE id=$1 FOR UPDATE', [paymentId]);
    if (!paymentResult.rowCount) {
      await client.query("UPDATE payment_webhook_events SET processed_at=now() WHERE provider='paymongo' AND provider_event_id=$1", [eventId]);
      await client.query('COMMIT'); return res.status(200).json({ received: true, ignored: true, reason: 'Payment record not found.' });
    }
    const payment = paymentResult.rows[0];
    const eventLive = Boolean(topAttrs.livemode ?? envelope?.data?.livemode ?? envelope?.livemode);
    if (eventLive !== (mode === 'live')) { await client.query('ROLLBACK'); return res.status(401).json({ error: 'Webhook mode mismatch.' }); }
    if (payment.status === 'paid' || payment.status === 'paid_needs_review') {
      await client.query("UPDATE payment_webhook_events SET processed_at=now() WHERE provider='paymongo' AND provider_event_id=$1", [eventId]);
      await client.query('COMMIT'); return res.status(200).json({ received: true, duplicate: true });
    }
    if (payment.purpose === 'ican_subscription') {
      const intervalSql = payment.billing_interval === 'annual' ? "interval '1 year'" : "interval '1 month'";
      await client.query(`INSERT INTO workspace_subscriptions(workspace_id,plan_id,status,billing_interval,current_period_start,current_period_end,last_payment_transaction_id,provider) VALUES($1,$2,'active',$3,now(),now()+${intervalSql},$4,'paymongo') ON CONFLICT(workspace_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,status='active',billing_interval=EXCLUDED.billing_interval,current_period_start=now(),current_period_end=now()+${intervalSql},last_payment_transaction_id=EXCLUDED.last_payment_transaction_id,provider='paymongo',updated_at=now()`, [payment.workspace_id, payment.plan_id, payment.billing_interval, payment.id]);
      await client.query("UPDATE payment_transactions SET status='paid',provider_checkout_session_id=COALESCE(provider_checkout_session_id,$1),provider_event_id=$2,updated_at=now() WHERE id=$3", [resource.id, eventId, payment.id]);
    } else if (payment.purpose === 'merchant_order') {
      const items = payment.items_json || [];
      let canFulfill = true;
      for (const item of items) {
        const balance = await client.query('SELECT quantity,reserved_quantity FROM inventory_balances WHERE workspace_id=$1 AND product_id=$2 AND location_id=$3 FOR UPDATE', [payment.workspace_id, item.productId, item.locationId]);
        if (!balance.rowCount || Number(balance.rows[0].reserved_quantity) < item.quantity || Number(balance.rows[0].quantity) < item.quantity) { canFulfill = false; break; }
      }
      if (!canFulfill) {
        await client.query("UPDATE payment_transactions SET status='paid_needs_review',provider_event_id=$1,updated_at=now() WHERE id=$2", [eventId, payment.id]);
        await client.query("INSERT INTO audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'payment.paid_needs_review','payment_transaction',$3,$4::jsonb)", [payment.workspace_id, payment.created_by, payment.id, JSON.stringify({ provider: 'paymongo', eventId, reason: 'Inventory reservation mismatch; manual refund or fulfillment review required.' })]);
      } else {
        const sale = await client.query("INSERT INTO sales(workspace_id,receipt_no,customer_name,payment_method,total_amount,status,idempotency_key,created_by) VALUES($1,'RCPT-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),$2,'online',$3,'completed',$4,$5) RETURNING id,receipt_no", [payment.workspace_id, payment.customer_name, (Number(payment.amount_minor) / 100).toFixed(2), `payment:${payment.id}`, payment.created_by]);
        for (const item of items) {
          await client.query('INSERT INTO sale_items(sale_id,product_id,sku_snapshot,name_snapshot,quantity,unit_price,line_total) VALUES($1,$2,$3,$4,$5,$6,$7)', [sale.rows[0].id, item.productId, item.sku, item.name, item.quantity, (item.unitPriceMinor / 100).toFixed(2), ((item.unitPriceMinor * item.quantity) / 100).toFixed(2)]);
          await client.query('UPDATE inventory_balances SET quantity=quantity-$1,reserved_quantity=reserved_quantity-$1,updated_at=now() WHERE workspace_id=$2 AND product_id=$3 AND location_id=$4', [item.quantity, payment.workspace_id, item.productId, item.locationId]);
          await client.query("INSERT INTO inventory_movements(workspace_id,product_id,movement_type,quantity_delta,from_location_id,reference_type,reference_id,idempotency_key,actor_user_id,notes) VALUES($1,$2,'sale',$3,$4,'sale',$5,$6,$7,$8) ON CONFLICT DO NOTHING", [payment.workspace_id, item.productId, -item.quantity, item.locationId, sale.rows[0].id, `payment:${payment.id}:${item.productId}:${item.locationId}`, payment.created_by, `PayMongo checkout ${payment.id}`]);
        }
        await client.query("INSERT INTO audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'sale.completed','sale',$3,$4::jsonb)", [payment.workspace_id, payment.created_by, sale.rows[0].id, JSON.stringify({ paymentId: payment.id, provider: 'paymongo', receiptNo: sale.rows[0].receipt_no, amount: Number(payment.amount_minor) / 100 })]);
        await client.query("UPDATE payment_transactions SET status='paid',provider_event_id=$1,updated_at=now() WHERE id=$2", [eventId, payment.id]);
      }
    }
    await client.query("UPDATE payment_webhook_events SET processed_at=now() WHERE provider='paymongo' AND provider_event_id=$1", [eventId]);
    await client.query('COMMIT');
    return res.status(200).json({ received: true, processed: true });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('PayMongo webhook processing failed:', e.message);
    return res.status(500).json({ error: 'Webhook processing failed; retry delivery.' });
  } finally { client.release(); }
}

export default router;
