
-- Revert border_theme NULL values back to 'none'
UPDATE campaigns SET border_theme = 'none' WHERE border_theme IS NULL;
