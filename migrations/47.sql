
ALTER TABLE campaign_templates ADD COLUMN campaign_type TEXT DEFAULT 'spinwheel';
ALTER TABLE campaign_templates ADD COLUMN scratch_card_shape TEXT DEFAULT 'rounded-rectangle';
ALTER TABLE campaign_templates ADD COLUMN scratch_mask_style TEXT DEFAULT 'silver';
ALTER TABLE campaign_templates ADD COLUMN scratch_instructions_title TEXT DEFAULT 'Scratch to reveal your prize!';
ALTER TABLE campaign_templates ADD COLUMN scratch_instructions_subtitle TEXT;

UPDATE campaign_templates SET campaign_type = 'spinwheel';
