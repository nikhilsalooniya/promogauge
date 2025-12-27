
-- Update existing campaigns with border_theme = 'none' to NULL for better data consistency
UPDATE campaigns SET border_theme = NULL WHERE border_theme = 'none';
