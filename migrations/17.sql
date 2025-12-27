
CREATE TABLE spin_tracking (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  ip_address TEXT,
  device_fingerprint TEXT,
  last_spin_at DATETIME NOT NULL,
  spin_count INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spin_tracking_campaign ON spin_tracking(campaign_id);
CREATE INDEX idx_spin_tracking_email ON spin_tracking(campaign_id, email);
CREATE INDEX idx_spin_tracking_phone ON spin_tracking(campaign_id, phone);
CREATE INDEX idx_spin_tracking_ip ON spin_tracking(campaign_id, ip_address);
CREATE INDEX idx_spin_tracking_device ON spin_tracking(campaign_id, device_fingerprint);
