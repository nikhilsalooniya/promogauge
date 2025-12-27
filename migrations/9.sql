
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  custom_field_value TEXT,
  prize_won TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_created_at ON leads(created_at);
