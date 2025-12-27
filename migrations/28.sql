
-- Add border configuration fields to campaigns
ALTER TABLE campaigns ADD COLUMN border_type TEXT DEFAULT 'static';
ALTER TABLE campaigns ADD COLUMN border_theme_key TEXT;
ALTER TABLE campaigns ADD COLUMN border_asset_url TEXT;
ALTER TABLE campaigns ADD COLUMN border_is_premium BOOLEAN DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN border_premium_unlocked BOOLEAN DEFAULT 0;

-- Add premium borders access to users
ALTER TABLE users ADD COLUMN has_global_premium_borders BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN premium_unlock_expiry DATETIME;

-- Create table for uploaded border assets
CREATE TABLE border_assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  campaign_id TEXT,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create table for premium border settings
CREATE TABLE premium_border_settings (
  id TEXT PRIMARY KEY,
  addon_price_amount REAL NOT NULL DEFAULT 5.00,
  addon_price_currency TEXT NOT NULL DEFAULT 'USD',
  enabled BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default premium border settings
INSERT INTO premium_border_settings (id, addon_price_amount, addon_price_currency, enabled)
VALUES ('default', 5.00, 'USD', 1);

-- Create table for built-in animated border assets (admin-curated)
CREATE TABLE built_in_border_assets (
  id TEXT PRIMARY KEY,
  theme_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT 1,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
