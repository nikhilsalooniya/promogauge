
ALTER TABLE campaigns ADD COLUMN start_datetime TEXT;
ALTER TABLE campaigns ADD COLUMN end_datetime TEXT;
ALTER TABLE campaigns ADD COLUMN timezone TEXT DEFAULT 'UTC';
