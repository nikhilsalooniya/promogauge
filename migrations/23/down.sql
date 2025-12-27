
-- Remove added columns from leads table
ALTER TABLE leads DROP COLUMN redeemed_at;
ALTER TABLE leads DROP COLUMN is_redeemed;
ALTER TABLE leads DROP COLUMN redemption_expires_at;
ALTER TABLE leads DROP COLUMN reference_number;

-- Remove added columns from campaigns table
ALTER TABLE campaigns DROP COLUMN show_contact_info;
ALTER TABLE campaigns DROP COLUMN show_winner_info;
ALTER TABLE campaigns DROP COLUMN twitter_url;
ALTER TABLE campaigns DROP COLUMN instagram_url;
ALTER TABLE campaigns DROP COLUMN facebook_url;
ALTER TABLE campaigns DROP COLUMN whatsapp_number;
ALTER TABLE campaigns DROP COLUMN contact_address;
ALTER TABLE campaigns DROP COLUMN contact_email;
ALTER TABLE campaigns DROP COLUMN contact_phone;
ALTER TABLE campaigns DROP COLUMN redemption_expiry_days;
