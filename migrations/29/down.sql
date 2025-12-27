
-- Restore premium border columns to campaigns table
ALTER TABLE campaigns ADD COLUMN border_type TEXT DEFAULT 'static';
ALTER TABLE campaigns ADD COLUMN border_theme_key TEXT;
ALTER TABLE campaigns ADD COLUMN border_asset_url TEXT;
ALTER TABLE campaigns ADD COLUMN border_is_premium BOOLEAN DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN border_premium_unlocked BOOLEAN DEFAULT 0;

-- Recreate premium border related tables
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

CREATE TABLE premium_border_settings (
id TEXT PRIMARY KEY,
addon_price_amount REAL NOT NULL DEFAULT 5.00,
addon_price_currency TEXT NOT NULL DEFAULT 'USD',
enabled BOOLEAN DEFAULT 1,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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
