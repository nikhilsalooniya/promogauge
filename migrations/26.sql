
CREATE TABLE email_integration_settings (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  is_sandbox BOOLEAN DEFAULT 1,
  api_key TEXT,
  api_domain TEXT,
  sender_email TEXT,
  sender_name TEXT,
  is_active BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_integration_provider ON email_integration_settings(provider, is_sandbox);

CREATE TABLE email_templates (
  id TEXT PRIMARY KEY,
  template_name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO email_templates (id, template_name, subject, html_body, text_body, variables) VALUES (
  'renewal_reminder',
  'renewal_reminder',
  'Your {{plan_name}} subscription expires in {{days_remaining}} days',
  '<html><body><h1>Subscription Renewal Reminder</h1><p>Hi {{user_name}},</p><p>Your <strong>{{plan_name}}</strong> subscription will expire on <strong>{{expiry_date}}</strong>.</p><p>To continue enjoying premium features, please renew your subscription before it expires.</p><p><a href="{{renewal_link}}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Renew Now</a></p><p>Thank you for being a valued customer!</p><p>Best regards,<br>The PromoGuage Team</p></body></html>',
  'Hi {{user_name}},\n\nYour {{plan_name}} subscription will expire on {{expiry_date}}.\n\nTo continue enjoying premium features, please renew your subscription before it expires.\n\nRenewal Link: {{renewal_link}}\n\nThank you for being a valued customer!\n\nBest regards,\nThe PromoGuage Team',
  '["user_name", "plan_name", "expiry_date", "days_remaining", "renewal_link"]'
);
