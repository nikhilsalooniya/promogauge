
ALTER TABLE campaigns ADD COLUMN background_gradient_enabled BOOLEAN DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN background_gradient_start TEXT;
ALTER TABLE campaigns ADD COLUMN background_gradient_end TEXT;
ALTER TABLE campaigns ADD COLUMN background_gradient_direction TEXT DEFAULT 'to-bottom';
