
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  mocha_user_id TEXT NOT NULL UNIQUE,
  business_name TEXT,
  country TEXT,
  currency TEXT DEFAULT 'USD',
  plan_type TEXT DEFAULT 'free',
  plan_expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_mocha_user_id ON users(mocha_user_id);
