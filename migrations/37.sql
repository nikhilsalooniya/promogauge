
CREATE TABLE billing_plans (
  id TEXT PRIMARY KEY,
  plan_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL,
  amount REAL NOT NULL,
  billing_interval TEXT,
  campaign_limit INTEGER,
  lead_limit INTEGER,
  features TEXT,
  is_active BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  is_popular BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_billing_plans_type_currency ON billing_plans(plan_type, currency);
CREATE INDEX idx_billing_plans_active ON billing_plans(is_active);
