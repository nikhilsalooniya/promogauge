
CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  campaign_type TEXT DEFAULT 'spinwheel',
  template_id TEXT,
  public_slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  cover_image_url TEXT,
  is_lead_form_required BOOLEAN DEFAULT 1,
  lead_form_fields TEXT,
  wheel_segments TEXT,
  wheel_colors TEXT,
  status TEXT DEFAULT 'active',
  spins_count INTEGER DEFAULT 0,
  leads_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_public_slug ON campaigns(public_slug);
CREATE INDEX idx_campaigns_status ON campaigns(status);
