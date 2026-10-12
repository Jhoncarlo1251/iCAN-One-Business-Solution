# iCAN v6 Payment Integration (PayMongo sandbox-first)

This build has two separate payment flows:

1. **iCAN subscription billing** — `POST /api/payments/subscription/checkout`
2. **Business customer order payments** — `POST /api/payments/merchant/checkout`

They share a provider adapter and webhook endpoint, but their transaction purposes, permissions, and fulfillment behavior are separate in PostgreSQL. The provider secret key is server-only.

## Current implementation boundary

- Creates PayMongo v2 hosted checkout sessions from the backend.
- Prices for iCAN plans are defined server-side: Starter PHP 499/month, Growth PHP 1,499/month, Business Pro PHP 2,999/month, Business Plus PHP 4,999/month. Annual checkout charges ten monthly amounts and sets a one-year entitlement period.
- Confirms payment using a signature-verified `checkout_session.payment.paid` webhook; a redirect alone does not activate a subscription or complete a sale.
- Merchant orders validate workspace membership, calculate totals from database product prices, reserve stock, and only finalize the sale and stock deduction after a verified paid webhook.
- Webhook events and checkout requests use database idempotency controls.
- If a merchant checkout becomes paid after its local stock reservation was released, the transaction is marked `paid_needs_review` and logged for manual fulfillment/refund review.

**Not yet production-ready:** the current subscription checkout is a one-time checkout that grants a monthly/yearly entitlement after payment. Automatic recurring renewal, dunning, cancellation sync, refunds UI, merchant marketplace/connected-account settlement, and automatic provider session expiration are not implemented. PayMongo says Subscriptions API access must be enabled for the account; integrate that separate API only after PayMongo confirms access. Do not promise automatic renewals until that work is completed and tested.

PayMongo's hosted Checkout Session is recommended for this build; the provider hosts the payment UI and the backend uses the `checkout_session.payment.paid` event as the source of truth. See the official [Hosted Checkout quick start](https://docs.paymongo.com/docs/payment-channels-hosted-checkout-quick-start), [Hosted Checkout guide](https://docs.paymongo.com/docs/payment-channels-hosted-checkout), [webhook setup and signature verification](https://docs.paymongo.com/docs/developer-tools-webhook-setup-management), and [subscription docs](https://docs.paymongo.com/docs/payment-acceptance-subscriptions).

## Configure sandbox

1. Complete the business/account setup and obtain a PayMongo **test** secret key from Dashboard → Developers.
2. Copy `.env.example` to `.env` and set:
   - `PAYMONGO_MODE=test`
   - `PAYMONGO_SECRET_KEY=sk_test_...`
   - `PAYMONGO_WEBHOOK_SECRET_TEST=whsk_...` (the webhook signing secret, not the API secret key)
   - `PAYMENT_RETURN_URL=http://localhost:5500` for local testing
   - `PAYMONGO_PAYMENT_METHOD_TYPES=card,gcash,qrph` or a set of methods actually enabled on your PayMongo account.
3. Apply `db/schema.sql` to a fresh database, or follow the migration file if the previous schema was already applied.
4. Run `npm install`, `npm run db:check`, and `npm test`.
5. Start the API and frontend. Sign in, connect the API, open **Plan & Billing**, and choose a plan.
6. In PayMongo Dashboard → Developers/Webhooks, create a **test-mode** webhook endpoint at `https://YOUR_PUBLIC_TEST_URL/api/webhooks/paymongo`, subscribing to `checkout_session.payment.paid`. A public HTTPS tunnel is required for local webhook tests; PayMongo cannot call localhost directly.
7. Use PayMongo's webhook test tool and verify event deliveries. The handler verifies the raw request body with HMAC-SHA256 and a mode-specific signing secret.

## API routes

- `GET /api/payments/status?workspaceId=<uuid>` — current subscription and last 50 transactions for a workspace member.
- `POST /api/payments/subscription/checkout` — body: `{ "workspaceId": "<uuid>", "idempotencyKey": "unique-key-123", "planId": "growth", "interval": "monthly" }`.
- `POST /api/payments/merchant/checkout` — body: `{ "workspaceId": "<uuid>", "idempotencyKey": "unique-key-123", "customerName": "Customer", "items": [{ "productId": "<uuid>", "locationId": "<uuid>", "quantity": 1 }] }`. Optional `email` is supported. Amounts are always calculated server-side.
- `POST /api/webhooks/paymongo` — public endpoint, protected by PayMongo signature verification.

All payment API routes except the webhook require a Bearer token. Subscription changes require workspace owner/admin. Merchant checkout requires owner/admin/manager/member.

## Important operating cautions

- PayMongo checkout sessions can remain active until explicitly expired. Do not expose this build to live merchants until session expiry/stock reservation cleanup and late-payment handling have been fully designed and tested.
- Do not use live keys in development. Do not commit `.env`, API keys, or webhook secrets.
- PayMongo can accept international card payments for eligible Philippine businesses, but supported payment methods and currency are provider/account dependent. This implementation prices in PHP and does not claim universal country or local-method coverage.
- This integration does not implement the provider-approved marketplace/connected-account model required to route settlements independently to multiple merchants. Do not collect all merchants' proceeds into one iCAN account without explicit provider approval and legal/compliance review.
- Before live use: verify KYC/account approval, HTTPS, webhooks in both environments, database backup/restore, rate limits, monitoring, refunds/reconciliation, taxes/receipts, recurring billing, security review, and provider support for the exact business model.
