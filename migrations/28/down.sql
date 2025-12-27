
-- Remove built-in border assets table
DROP TABLE built_in_border_assets;

-- Remove premium border settings table
DROP TABLE premium_border_settings;

-- Remove border assets table
DROP TABLE border_assets;

-- Remove premium borders fields from users
ALTER TABLE users DROP COLUMN premium_unlock_expiry;
ALTER TABLE users DROP COLUMN has_global_premium_borders;

-- Remove border configuration fields from campaigns
ALTER TABLE campaigns DROP COLUMN border_premium_unlocked;
ALTER TABLE campaigns DROP COLUMN border_is_premium;
ALTER TABLE campaigns DROP COLUMN border_asset_url;
ALTER TABLE campaigns DROP COLUMN border_theme_key;
ALTER TABLE campaigns DROP COLUMN border_type;
