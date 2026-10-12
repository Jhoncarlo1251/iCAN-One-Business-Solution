-- iCAN v6.4 CRM and purchasing foundation. Apply after schema.sql and 002_payment_foundation.sql.
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
