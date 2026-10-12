-- Apply after the original core schema if it was already installed. Safe to re-run.
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;
ALTER TABLE sales ADD CONSTRAINT sales_payment_method_check CHECK (payment_method IN ('cash','card','other','online'));

-- iCAN v6 payment foundation. Subscription billing and merchant sales remain separate.
CREATE TABLE IF NOT EXISTS payment_transactions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 purpose VARCHAR(30) NOT NULL CHECK (purpose IN ('ican_subscription','merchant_order')),
 provider VARCHAR(40) NOT NULL DEFAULT 'paymongo', plan_id VARCHAR(40),
 billing_interval VARCHAR(20) CHECK (billing_interval IS NULL OR billing_interval IN ('monthly','annual')),
 amount_minor BIGINT NOT NULL CHECK (amount_minor > 0), currency CHAR(3) NOT NULL DEFAULT 'PHP',
 status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','expired','paid_needs_review')),
 idempotency_key VARCHAR(160) NOT NULL, provider_checkout_session_id VARCHAR(120), checkout_url TEXT,
 customer_name VARCHAR(200) NOT NULL DEFAULT 'Customer', items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
 expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'), provider_event_id VARCHAR(160), failure_code VARCHAR(120),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE (workspace_id,idempotency_key), UNIQUE (provider_checkout_session_id)
);
CREATE INDEX IF NOT EXISTS payment_transactions_workspace_date_idx ON payment_transactions(workspace_id,created_at DESC);
CREATE INDEX IF NOT EXISTS payment_transactions_pending_expiry_idx ON payment_transactions(status,expires_at) WHERE status='pending';

CREATE TABLE IF NOT EXISTS workspace_subscriptions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
 plan_id VARCHAR(40) NOT NULL DEFAULT 'free', status VARCHAR(30) NOT NULL DEFAULT 'free' CHECK (status IN ('free','active','past_due','cancelled','pending')),
 billing_interval VARCHAR(20) CHECK (billing_interval IS NULL OR billing_interval IN ('monthly','annual')),
 current_period_start TIMESTAMPTZ, current_period_end TIMESTAMPTZ,
 last_payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
 provider VARCHAR(40) NOT NULL DEFAULT 'paymongo', updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_webhook_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider VARCHAR(40) NOT NULL, provider_event_id VARCHAR(160) NOT NULL,
 event_type VARCHAR(160) NOT NULL, livemode BOOLEAN NOT NULL DEFAULT FALSE, processed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE (provider,provider_event_id)
);
