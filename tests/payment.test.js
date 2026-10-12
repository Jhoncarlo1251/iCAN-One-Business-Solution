import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { getPlanPriceMinor, verifyPayMongoSignature } from '../src/lib/paymongo.js';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
test('subscription pricing is server-defined and annual discount is two months equivalent', () => {
  assert.equal(getPlanPriceMinor('starter', 'monthly'), 49900);
  assert.equal(getPlanPriceMinor('growth', 'annual'), 1499000);
  assert.equal(getPlanPriceMinor('unknown', 'monthly'), null);
});
test('PayMongo webhook signature verifies raw payload and rejects tampering/stale timestamps', () => {
  const body = Buffer.from('{"data":{"id":"evt_test"}}');
  const secret = 'whsk_test_secret';
  const timestamp = String(1800000000);
  const digest = crypto.createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest('hex');
  const header = `t=${timestamp},te=${digest},li=`;
  assert.equal(verifyPayMongoSignature(body, header, secret, 'test', Number(timestamp)), true);
  assert.equal(verifyPayMongoSignature(Buffer.from('{"data":{"id":"evt_forged"}}'), header, secret, 'test', Number(timestamp)), false);
  assert.equal(verifyPayMongoSignature(body, header, secret, 'test', Number(timestamp) + 301), false);
  assert.equal(verifyPayMongoSignature(body, header, secret, 'live', Number(timestamp)), false);
});
test('payment routes separate subscription billing and merchant checkout', () => {
  const routes = source('../src/routes/payments.js');
  const schema = source('../db/schema.sql');
  const server = source('../src/server.js');
  for (const path of ["router.post('/subscription/checkout'", "router.post('/merchant/checkout'", "router.get('/status'"]) assert.ok(routes.includes(path));
  for (const table of ['payment_transactions','workspace_subscriptions','payment_webhook_events']) assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`));
  assert.ok(server.includes("'/api/webhooks/paymongo'"));
  assert.ok(server.includes("'/api/payments'"));
});
test('PayMongo secret key is never shipped to browser code', () => {
  const front = source('../src/app.js') + source('../src/api-client.js');
  assert.doesNotMatch(front, /PAYMONGO_SECRET_KEY|sk_live_|sk_test_/);
});
