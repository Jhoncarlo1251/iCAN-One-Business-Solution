-- iCAN v6.5 finance foundation; apply after 003_crm_purchasing.sql.
CREATE TABLE IF NOT EXISTS expenses (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
 category VARCHAR(80) NOT NULL,
 description VARCHAR(500) NOT NULL,
 amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
 currency CHAR(3) NOT NULL DEFAULT 'PHP',
 reference VARCHAR(120) NOT NULL DEFAULT '',
 status VARCHAR(20) NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','voided')),
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expenses_workspace_date_idx ON expenses(workspace_id, expense_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS expenses_workspace_status_idx ON expenses(workspace_id,status);
