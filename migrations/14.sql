
CREATE TABLE payment_gateway_settings (
  id TEXT PRIMARY KEY,
  gateway_name TEXT NOT NULL,
  is_sandbox BOOLEAN DEFAULT 1,
  api_key TEXT,
  api_secret TEXT,
  webhook_secret TEXT,
  additional_config TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_payment_gateway_mode ON payment_gateway_settings(gateway_name, is_sandbox);
