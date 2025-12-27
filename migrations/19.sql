
-- Add spin duration configuration and redemption instructions
ALTER TABLE campaigns ADD COLUMN spin_duration_seconds INTEGER DEFAULT 5;
ALTER TABLE campaigns ADD COLUMN redemption_instructions TEXT;
