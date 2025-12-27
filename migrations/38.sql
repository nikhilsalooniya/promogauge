
-- Insert USD Subscription Plans
INSERT INTO billing_plans (id, plan_type, name, description, currency, amount, billing_interval, campaign_limit, lead_limit, features, is_active, display_order, is_popular, created_at, updated_at)
VALUES 
  ('starter-usd', 'subscription', 'Starter', 'Perfect for small businesses testing the waters', 'USD', 29.00, 'monthly', 3, NULL, '["3 Active Campaigns", "Unlimited Spins", "Basic Analytics", "Email Support", "Custom Branding"]', 1, 0, 0, datetime('now'), datetime('now')),
  ('business-usd', 'subscription', 'Business', 'Ideal for growing businesses', 'USD', 79.00, 'monthly', 10, NULL, '["10 Active Campaigns", "Unlimited Spins", "Advanced Analytics", "Priority Support", "Custom Branding", "Remove Watermark", "API Access"]', 1, 1, 1, datetime('now'), datetime('now')),
  ('pro-usd', 'subscription', 'Pro', 'For agencies and enterprises', 'USD', 199.00, 'monthly', NULL, NULL, '["Unlimited Campaigns", "Unlimited Spins", "Advanced Analytics", "Dedicated Support", "Custom Branding", "Remove Watermark", "API Access", "White Label"]', 1, 2, 0, datetime('now'), datetime('now'));

-- Insert KES Subscription Plans
INSERT INTO billing_plans (id, plan_type, name, description, currency, amount, billing_interval, campaign_limit, lead_limit, features, is_active, display_order, is_popular, created_at, updated_at)
VALUES 
  ('starter-kes', 'subscription', 'Starter', 'Perfect for small businesses testing the waters', 'KES', 3500.00, 'monthly', 3, NULL, '["3 Active Campaigns", "Unlimited Spins", "Basic Analytics", "Email Support", "Custom Branding"]', 1, 0, 0, datetime('now'), datetime('now')),
  ('business-kes', 'subscription', 'Business', 'Ideal for growing businesses', 'KES', 9500.00, 'monthly', 10, NULL, '["10 Active Campaigns", "Unlimited Spins", "Advanced Analytics", "Priority Support", "Custom Branding", "Remove Watermark", "API Access"]', 1, 1, 1, datetime('now'), datetime('now')),
  ('pro-kes', 'subscription', 'Pro', 'For agencies and enterprises', 'KES', 24000.00, 'monthly', NULL, NULL, '["Unlimited Campaigns", "Unlimited Spins", "Advanced Analytics", "Dedicated Support", "Custom Branding", "Remove Watermark", "API Access", "White Label"]', 1, 2, 0, datetime('now'), datetime('now'));

-- Insert USD Campaign Credits
INSERT INTO billing_plans (id, plan_type, name, description, currency, amount, billing_interval, campaign_limit, lead_limit, features, is_active, display_order, is_popular, created_at, updated_at)
VALUES 
  ('campaign-1-usd', 'campaign', '1 Campaign Credit', 'Add one additional campaign to your account', 'USD', 15.00, NULL, 1, NULL, '["Valid for 30 days", "All campaign features included"]', 1, 0, 0, datetime('now'), datetime('now')),
  ('campaign-5-usd', 'campaign', '5 Campaign Credits', 'Add five additional campaigns to your account', 'USD', 60.00, NULL, 5, NULL, '["Valid for 30 days", "All campaign features included", "20% savings"]', 1, 1, 1, datetime('now'), datetime('now')),
  ('campaign-10-usd', 'campaign', '10 Campaign Credits', 'Add ten additional campaigns to your account', 'USD', 100.00, NULL, 10, NULL, '["Valid for 30 days", "All campaign features included", "33% savings"]', 1, 2, 0, datetime('now'), datetime('now'));

-- Insert KES Campaign Credits
INSERT INTO billing_plans (id, plan_type, name, description, currency, amount, billing_interval, campaign_limit, lead_limit, features, is_active, display_order, is_popular, created_at, updated_at)
VALUES 
  ('campaign-1-kes', 'campaign', '1 Campaign Credit', 'Add one additional campaign to your account', 'KES', 1800.00, NULL, 1, NULL, '["Valid for 30 days", "All campaign features included"]', 1, 0, 0, datetime('now'), datetime('now')),
  ('campaign-5-kes', 'campaign', '5 Campaign Credits', 'Add five additional campaigns to your account', 'KES', 7200.00, NULL, 5, NULL, '["Valid for 30 days", "All campaign features included", "20% savings"]', 1, 1, 1, datetime('now'), datetime('now')),
  ('campaign-10-kes', 'campaign', '10 Campaign Credits', 'Add ten additional campaigns to your account', 'KES', 12000.00, NULL, 10, NULL, '["Valid for 30 days", "All campaign features included", "33% savings"]', 1, 2, 0, datetime('now'), datetime('now'));

-- Insert USD Lead Credits
INSERT INTO billing_plans (id, plan_type, name, description, currency, amount, billing_interval, campaign_limit, lead_limit, features, is_active, display_order, is_popular, created_at, updated_at)
VALUES 
  ('leads-100-usd', 'leads', '100 Lead Credits', 'Capture 100 additional leads', 'USD', 10.00, NULL, NULL, 100, '["Never expires", "Use across all campaigns"]', 1, 0, 0, datetime('now'), datetime('now')),
  ('leads-500-usd', 'leads', '500 Lead Credits', 'Capture 500 additional leads', 'USD', 40.00, NULL, NULL, 500, '["Never expires", "Use across all campaigns", "20% savings"]', 1, 1, 1, datetime('now'), datetime('now')),
  ('leads-1000-usd', 'leads', '1,000 Lead Credits', 'Capture 1,000 additional leads', 'USD', 70.00, NULL, NULL, 1000, '["Never expires", "Use across all campaigns", "30% savings"]', 1, 2, 0, datetime('now'), datetime('now'));

-- Insert KES Lead Credits
INSERT INTO billing_plans (id, plan_type, name, description, currency, amount, billing_interval, campaign_limit, lead_limit, features, is_active, display_order, is_popular, created_at, updated_at)
VALUES 
  ('leads-100-kes', 'leads', '100 Lead Credits', 'Capture 100 additional leads', 'KES', 1200.00, NULL, NULL, 100, '["Never expires", "Use across all campaigns"]', 1, 0, 0, datetime('now'), datetime('now')),
  ('leads-500-kes', 'leads', '500 Lead Credits', 'Capture 500 additional leads', 'KES', 4800.00, NULL, NULL, 500, '["Never expires", "Use across all campaigns", "20% savings"]', 1, 1, 1, datetime('now'), datetime('now')),
  ('leads-1000-kes', 'leads', '1,000 Lead Credits', 'Capture 1,000 additional leads', 'KES', 8400.00, NULL, NULL, 1000, '["Never expires", "Use across all campaigns", "30% savings"]', 1, 2, 0, datetime('now'), datetime('now'));
