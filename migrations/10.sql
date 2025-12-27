
CREATE TABLE campaign_analytics (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaign_analytics_campaign_id ON campaign_analytics(campaign_id);
CREATE INDEX idx_campaign_analytics_event_type ON campaign_analytics(event_type);
CREATE INDEX idx_campaign_analytics_created_at ON campaign_analytics(created_at);
