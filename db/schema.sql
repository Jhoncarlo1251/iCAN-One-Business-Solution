-- iCAN PostgreSQL starter schema (run as a database migration, not from the browser).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL CHECK (role IN ('owner','admin','manager','member','viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS workspace_members_user_idx ON workspace_members(user_id);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  title VARCHAR(240) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  due_date DATE,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_workspace_created_idx ON tasks(workspace_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80),
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_workspace_created_idx ON audit_events(workspace_id, created_at DESC);

-- Future module tables should include workspace_id and enforce membership/role checks in the API.
-- Do not expose direct database credentials or privileged keys in frontend JavaScript.

-- iCAN Warehouse Management System (WMS) foundation.
-- These tables are intended for the PostgreSQL backend. The current browser WMS
-- screens are a local prototype and do NOT call these tables yet.
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL,
  barcode VARCHAR(128),
  name VARCHAR(240) NOT NULL,
  category VARCHAR(120) NOT NULL DEFAULT '',
  selling_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  cost_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, sku)
);
CREATE UNIQUE INDEX IF NOT EXISTS products_workspace_barcode_unique
  ON products(workspace_id, barcode) WHERE barcode IS NOT NULL AND barcode <> '';

CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code VARCHAR(60) NOT NULL,
  name VARCHAR(160) NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, code)
);

CREATE TABLE IF NOT EXISTS warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  code VARCHAR(100) NOT NULL,
  zone VARCHAR(80) NOT NULL DEFAULT '',
  aisle VARCHAR(80) NOT NULL DEFAULT '',
  rack VARCHAR(80) NOT NULL DEFAULT '',
  shelf VARCHAR(80) NOT NULL DEFAULT '',
  bin VARCHAR(80) NOT NULL DEFAULT '',
  location_type VARCHAR(30) NOT NULL DEFAULT 'shelf'
    CHECK (location_type IN ('shelf','bin','rack','floor','cold_storage','staging','receiving','dispatch')),
  capacity_units NUMERIC(14,3) CHECK (capacity_units IS NULL OR capacity_units >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, code)
);
CREATE INDEX IF NOT EXISTS warehouse_locations_workspace_idx ON warehouse_locations(workspace_id, warehouse_id);

CREATE TABLE IF NOT EXISTS inventory_balances (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0 AND reserved_quantity <= quantity),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, location_id)
);
CREATE INDEX IF NOT EXISTS inventory_balances_workspace_product_idx ON inventory_balances(workspace_id, product_id);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type VARCHAR(40) NOT NULL CHECK (movement_type IN ('opening','receipt','putaway','transfer_out','transfer_in','sale','return','adjustment','pick','dispatch','reservation','release')),
  quantity_delta NUMERIC(14,3) NOT NULL CHECK (quantity_delta <> 0),
  from_location_id UUID REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
  to_location_id UUID REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
  reference_type VARCHAR(60) NOT NULL DEFAULT '',
  reference_id UUID,
  idempotency_key VARCHAR(160),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS inventory_movements_idempotency_unique
  ON inventory_movements(workspace_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS inventory_movements_product_date_idx ON inventory_movements(workspace_id, product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS warehouse_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  supplier_name VARCHAR(200) NOT NULL DEFAULT '',
  purchase_order_ref VARCHAR(120) NOT NULL DEFAULT '',
  receipt_ref VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','received','cancelled')),
  received_by UUID REFERENCES users(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, receipt_ref)
);

CREATE TABLE IF NOT EXISTS warehouse_receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES warehouse_receipts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
  expected_quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (expected_quantity >= 0),
  received_quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  lot_number VARCHAR(120) NOT NULL DEFAULT '',
  expires_on DATE,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS warehouse_pick_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  order_ref VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','picking','picked','dispatched','cancelled')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  dispatched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, order_ref)
);

CREATE TABLE IF NOT EXISTS warehouse_pick_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_list_id UUID NOT NULL REFERENCES warehouse_pick_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
  requested_quantity NUMERIC(14,3) NOT NULL CHECK (requested_quantity > 0),
  picked_quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (picked_quantity >= 0 AND picked_quantity <= requested_quantity),
  lot_number VARCHAR(120) NOT NULL DEFAULT '',
  serial_numbers JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS warehouse_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  transfer_ref VARCHAR(120) NOT NULL,
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  to_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_transit','received','cancelled')),
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  received_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at TIMESTAMPTZ,
  UNIQUE (workspace_id, transfer_ref),
  CHECK (from_warehouse_id <> to_warehouse_id)
);

CREATE TABLE IF NOT EXISTS warehouse_transfer_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  from_location_id UUID NOT NULL REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
  to_location_id UUID NOT NULL REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0)
);


-- iCAN Integrated Core v6: server-side sales and POS transactions.
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  receipt_no VARCHAR(40) NOT NULL,
  customer_name VARCHAR(200) NOT NULL DEFAULT 'Walk-in customer',
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash','card','other','online')),
  total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','voided','refunded')),
  idempotency_key VARCHAR(160) NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, receipt_no),
  UNIQUE (workspace_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS sales_workspace_created_idx ON sales(workspace_id, created_at DESC);
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sku_snapshot VARCHAR(100) NOT NULL,
  name_snapshot VARCHAR(240) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(14,2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sale_items_sale_idx ON sale_items(sale_id);


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


-- iCAN v6.4 CRM and purchasing tables (also available as migration 003).
CREATE TABLE IF NOT EXISTS customers (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 name VARCHAR(200) NOT NULL, email VARCHAR(254) NOT NULL DEFAULT '', phone VARCHAR(80) NOT NULL DEFAULT '',
 notes TEXT NOT NULL DEFAULT '', active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_workspace_email_unique ON customers(workspace_id, lower(email)) WHERE email <> '';
CREATE INDEX IF NOT EXISTS customers_workspace_name_idx ON customers(workspace_id, name);
CREATE TABLE IF NOT EXISTS suppliers (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 name VARCHAR(200) NOT NULL, contact_name VARCHAR(200) NOT NULL DEFAULT '', email VARCHAR(254) NOT NULL DEFAULT '',
 phone VARCHAR(80) NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', payment_terms VARCHAR(120) NOT NULL DEFAULT '',
 notes TEXT NOT NULL DEFAULT '', active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS suppliers_workspace_email_unique ON suppliers(workspace_id, lower(email)) WHERE email <> '';
CREATE INDEX IF NOT EXISTS suppliers_workspace_name_idx ON suppliers(workspace_id, name);
CREATE TABLE IF NOT EXISTS purchase_orders (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT, warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
 order_number VARCHAR(80) NOT NULL, status VARCHAR(24) NOT NULL DEFAULT 'ordered' CHECK(status IN ('ordered','partially_received','received','cancelled')),
 currency CHAR(3) NOT NULL DEFAULT 'PHP', notes TEXT NOT NULL DEFAULT '', subtotal NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(subtotal >= 0),
 created_by UUID REFERENCES users(id) ON DELETE SET NULL, ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(workspace_id, order_number)
);
CREATE TABLE IF NOT EXISTS purchase_order_lines (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
 product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT, ordered_quantity NUMERIC(14,3) NOT NULL CHECK(ordered_quantity > 0),
 received_quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK(received_quantity >= 0 AND received_quantity <= ordered_quantity),
 unit_cost NUMERIC(14,2) NOT NULL CHECK(unit_cost >= 0), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS purchase_orders_workspace_date_idx ON purchase_orders(workspace_id, ordered_at DESC);



ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
