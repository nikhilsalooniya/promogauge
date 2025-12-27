
CREATE TABLE billing_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  gateway_name TEXT NOT NULL,
  transaction_reference TEXT,
  transaction_type TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  plan_type TEXT,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_billing_transactions_user_id ON billing_transactions(user_id);
CREATE INDEX idx_billing_transactions_status ON billing_transactions(status);

ALTER TABLE users ADD COLUMN campaign_credits INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN lead_credits INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN billing_cycle TEXT DEFAULT 'monthly';
