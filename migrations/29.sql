
-- Remove premium border columns from campaigns table
ALTER TABLE campaigns DROP COLUMN border_type;
ALTER TABLE campaigns DROP COLUMN border_theme_key;
ALTER TABLE campaigns DROP COLUMN border_asset_url;
ALTER TABLE campaigns DROP COLUMN border_is_premium;
ALTER TABLE campaigns DROP COLUMN border_premium_unlocked;

-- Drop premium border related tables
DROP TABLE IF EXISTS border_assets;
DROP TABLE IF EXISTS premium_border_settings;
DROP TABLE IF EXISTS built_in_border_assets;
