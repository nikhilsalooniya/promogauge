
ALTER TABLE users DROP COLUMN billing_cycle;
ALTER TABLE users DROP COLUMN lead_credits;
ALTER TABLE users DROP COLUMN campaign_credits;

DROP INDEX idx_billing_transactions_status;
DROP INDEX idx_billing_transactions_user_id;
DROP TABLE billing_transactions;
