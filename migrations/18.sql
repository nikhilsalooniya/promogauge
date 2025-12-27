
ALTER TABLE campaigns ADD COLUMN font_family TEXT DEFAULT 'Inter';
ALTER TABLE campaigns ADD COLUMN font_size INTEGER DEFAULT 16;
ALTER TABLE campaigns ADD COLUMN wheel_border_thickness INTEGER DEFAULT 3;
ALTER TABLE campaigns ADD COLUMN wheel_border_color TEXT DEFAULT '#ffffff';
ALTER TABLE campaigns ADD COLUMN pointer_style TEXT DEFAULT 'arrow';
ALTER TABLE campaigns ADD COLUMN spin_button_text TEXT DEFAULT 'SPIN';
ALTER TABLE campaigns ADD COLUMN spin_button_color TEXT DEFAULT '#6366f1';
ALTER TABLE campaigns ADD COLUMN spin_button_border_radius INTEGER DEFAULT 40;
ALTER TABLE campaigns ADD COLUMN spin_button_pulse_enabled BOOLEAN DEFAULT 1;
