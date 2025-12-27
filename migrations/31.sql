
ALTER TABLE campaigns ADD COLUMN border_connector_ring_enabled BOOLEAN DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN border_connector_ring_color TEXT DEFAULT '#FFFFFF';
ALTER TABLE campaigns ADD COLUMN border_connector_ring_thickness INTEGER DEFAULT 6;
