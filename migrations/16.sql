
ALTER TABLE campaigns ADD COLUMN pointer_color TEXT DEFAULT '#ef4444';
ALTER TABLE campaigns ADD COLUMN background_color TEXT DEFAULT '#ffffff';
ALTER TABLE campaigns ADD COLUMN background_image_url TEXT;
ALTER TABLE campaigns ADD COLUMN logo_position TEXT DEFAULT 'center';
ALTER TABLE campaigns ADD COLUMN confetti_enabled BOOLEAN DEFAULT 1;
ALTER TABLE campaigns ADD COLUMN sound_enabled BOOLEAN DEFAULT 1;
ALTER TABLE campaigns ADD COLUMN spin_limit_per_email INTEGER;
ALTER TABLE campaigns ADD COLUMN spin_limit_per_phone INTEGER;
ALTER TABLE campaigns ADD COLUMN spin_limit_per_ip INTEGER;
ALTER TABLE campaigns ADD COLUMN spin_limit_per_device INTEGER;
ALTER TABLE campaigns ADD COLUMN spin_limit_per_day INTEGER;
ALTER TABLE campaigns ADD COLUMN spin_limit_per_week INTEGER;
ALTER TABLE campaigns ADD COLUMN spin_limit_total INTEGER;
ALTER TABLE campaigns ADD COLUMN spin_cooldown_hours INTEGER;
