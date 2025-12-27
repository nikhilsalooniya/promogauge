
UPDATE users 
SET is_admin = 0, updated_at = datetime('now') 
WHERE business_name = 'FreelanceKafe';
