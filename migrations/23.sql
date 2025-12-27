
-- Add redemption and social sharing fields to campaigns table
ALTER TABLE campaigns ADD COLUMN redemption_expiry_days INTEGER DEFAULT 7;
ALTER TABLE campaigns ADD COLUMN contact_phone TEXT;
ALTER TABLE campaigns ADD COLUMN contact_email TEXT;
ALTER TABLE campaigns ADD COLUMN contact_address TEXT;
ALTER TABLE campaigns ADD COLUMN whatsapp_number TEXT;
ALTER TABLE campaigns ADD COLUMN facebook_url TEXT;
ALTER TABLE campaigns ADD COLUMN instagram_url TEXT;
ALTER TABLE campaigns ADD COLUMN twitter_url TEXT;
ALTER TABLE campaigns ADD COLUMN show_winner_info BOOLEAN DEFAULT 1;
ALTER TABLE campaigns ADD COLUMN show_contact_info BOOLEAN DEFAULT 0;

-- Add reference number and redemption fields to leads table
ALTER TABLE leads ADD COLUMN reference_number TEXT;
ALTER TABLE leads ADD COLUMN redemption_expires_at DATETIME;
ALTER TABLE leads ADD COLUMN is_redeemed BOOLEAN DEFAULT 0;
ALTER TABLE leads ADD COLUMN redeemed_at DATETIME;
