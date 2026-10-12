import crypto from 'node:crypto';

export const PLAN_CATALOG = Object.freeze({
  starter: { name: 'iCAN Starter', monthlyPHP: 499 },
  growth: { name: 'iCAN Growth', monthlyPHP: 1499 },
  business_pro: { name: 'iCAN Business Pro', monthlyPHP: 2999 },
  business_plus: { name: 'iCAN Business Plus', monthlyPHP: 4999 }
});

export function getPlanPriceMinor(planId, interval = 'monthly') {
  const plan = PLAN_CATALOG[planId];
  if (!plan || !['monthly', 'annual'].includes(interval)) return null;
  return Math.round(plan.monthlyPHP * (interval === 'annual' ? 10 : 1) * 100);
}

export function verifyPayMongoSignature(rawBody, signatureHeader, secret, mode = 'test', nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!Buffer.isBuffer(rawBody) || !signatureHeader || !secret) return false;
  const fields = Object.fromEntries(String(signatureHeader).split(',').map(part => {
    const i = part.indexOf('=');
    return i < 0 ? [part.trim(), ''] : [part.slice(0, i).trim(), part.slice(i + 1).trim()];
  }));
  if (!fields.t || !/^\d+$/.test(fields.t) || Math.abs(nowSeconds - Number(fields.t)) > 300) return false;
  const signature = mode === 'live' ? fields.li : fields.te;
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${fields.t}.`).update(rawBody).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

export async function createHostedCheckout({ secretKey, idempotencyKey, referenceNumber, name, description, amountMinor, currency = 'PHP', successUrl, cancelUrl, paymentMethodTypes, metadata, email }) {
  if (!secretKey || secretKey.includes('REPLACE_ME')) throw new Error('PayMongo is not configured. Set PAYMONGO_SECRET_KEY in the server environment.');
  if (process.env.PAYMONGO_MODE === 'live' && process.env.NODE_ENV !== 'production') throw new Error('Live PayMongo mode is blocked unless NODE_ENV=production.');
  const attributes = {
    line_items: [{ name, amount: amountMinor, currency, quantity: 1 }],
    payment_method_types: paymentMethodTypes,
    reference_number: referenceNumber,
    description,
    success_url: successUrl,
    cancel_url: cancelUrl,
    send_email_receipt: true,
    show_description: true,
    show_line_items: true,
    metadata
  };
  if (email) attributes.billing = { email };
  const response = await fetch('https://api.paymongo.com/v2/checkout_sessions', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
      'Content-Type': 'application/json', Accept: 'application/json', 'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify({ data: { attributes } }),
    signal: AbortSignal.timeout(15000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error('PayMongo checkout could not be created. Check provider configuration and enabled payment methods.');
    err.providerStatus = response.status;
    err.providerCode = result?.errors?.[0]?.code || 'paymongo_request_failed';
    throw err;
  }
  const data = result?.data;
  const checkoutUrl = data?.attributes?.checkout_url;
  if (!data?.id || !checkoutUrl) throw new Error('PayMongo returned an incomplete checkout session.');
  return { id: data.id, checkoutUrl, livemode: Boolean(data.attributes?.livemode) };
}
