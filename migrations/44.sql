
ALTER TABLE campaigns ADD COLUMN scratch_card_shape TEXT DEFAULT 'rounded-rectangle';
ALTER TABLE campaigns ADD COLUMN scratch_mask_style TEXT DEFAULT 'silver';
ALTER TABLE campaigns ADD COLUMN scratch_instructions_title TEXT DEFAULT 'Scratch to reveal your prize!';
ALTER TABLE campaigns ADD COLUMN scratch_instructions_subtitle TEXT;
