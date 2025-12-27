
ALTER TABLE billing_plans ADD COLUMN allow_background_image BOOLEAN DEFAULT 0;
ALTER TABLE billing_plans ADD COLUMN allow_logo_upload BOOLEAN DEFAULT 0;
ALTER TABLE billing_plans ADD COLUMN allow_external_border BOOLEAN DEFAULT 0;
ALTER TABLE billing_plans ADD COLUMN allow_qr_code BOOLEAN DEFAULT 0;
