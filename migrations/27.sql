
ALTER TABLE campaigns ADD COLUMN border_enabled BOOLEAN DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN border_theme TEXT DEFAULT 'none';
ALTER TABLE campaigns ADD COLUMN border_custom_colors TEXT;
ALTER TABLE campaigns ADD COLUMN border_bulb_shape TEXT DEFAULT 'circle';
ALTER TABLE campaigns ADD COLUMN border_bulb_count INTEGER DEFAULT 24;
ALTER TABLE campaigns ADD COLUMN border_bulb_size INTEGER DEFAULT 10;
ALTER TABLE campaigns ADD COLUMN border_blink_speed TEXT DEFAULT 'medium';
