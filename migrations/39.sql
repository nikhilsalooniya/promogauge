
-- Clear existing billing plans to start fresh
DELETE FROM billing_plans;

-- USD Subscription Plans
INSERT INTO billing_plans (id, plan_type, name, description, currency, amount, billing_interval, campaign_limit, lead_limit, features, is_active, display_order, is_popular, created_at, updated_at)
VALUES
('usd-starter', 'subscription', 'Starter', 'Perfect for small businesses getting started', 'USD', 29.00, 'monthly', 3, NULL, '["3 active campaigns", "Unlimited spins", "Basic analytics", "Email support", "Custom branding"]', 1, 0, 0, datetime('now'), datetime('now')),
('usd-business', 'subscription', 'Business', 'For growing businesses with multiple campaigns', 'USD', 79.00, 'monthly', 10, NULL, '["10 active campaigns", "Unlimited spins", "Advanced analytics", "Priority email support", "Custom branding", "Remove watermark"]', 1, 1, 1, datetime('now'), datetime('now')),
('usd-pro', 'subscription', 'Pro', 'For agencies and power users', 'USD', 199.00, 'monthly', NULL, NULL, '["Unlimited campaigns", "Unlimited spins", "Advanced analytics", "24/7 priority support", "Custom branding", "Remove watermark", "API access", "White-label options"]', 1, 2, 0, datetime('now'), datetime('now'));

-- KES Subscription Plans (100 KES = 1 USD)
INSERT INTO billing_plans (id, plan_type, name, description, currency, amount, billing_interval, campaign_limit, lead_limit, features, is_active, display_order, is_popular, created_at, updated_at)
VALUES
('kes-starter', 'subscription', 'Starter', 'Perfect for small businesses getting started', 'KES', 2900.00, 'monthly', 3, NULL, '["3 active campaigns", "Unlimited spins", "Basic analytics", "Email support", "Custom branding"]', 1, 0, 0, datetime('now'), datetime('now')),
('kes-business', 'subscription', 'Business', 'For growing businesses with multiple campaigns', 'KES', 7900.00, 'monthly', 10, NULL, '["10 active campaigns", "Unlimited spins", "Advanced analytics", "Priority email support", "Custom branding", "Remove watermark"]', 1, 1, 1, datetime('now'), datetime('now')),
('kes-pro', 'subscription', 'Pro', 'For agencies and power users', 'KES', 19900.00, 'monthly', NULL, NULL, '["Unlimited campaigns", "Unlimited spins", "Advanced analytics", "24/7 priority support", "Custom branding", "Remove watermark", "API access", "White-label options"]', 1, 2, 0, datetime('now'), datetime('now'));

-- USD Campaign Credit Packs
INSERT INTO billing_plans (id, plan_type, name, description, currency, amount, billing_interval, campaign_limit, lead_limit, features, is_active, display_order, is_popular, created_at, updated_at)
VALUES
('usd-campaign-1', 'campaign', 'Single Campaign', 'One-time campaign credit', 'USD', 15.00, NULL, 1, NULL, '["1 campaign credit", "Valid for 30 days", "No subscription required"]', 1, 0, 0, datetime('now'), datetime('now')),
('usd-campaign-5', 'campaign', '5 Campaigns', 'Five campaign credits', 'USD', 60.00, NULL, 5, NULL, '["5 campaign credits", "Valid for 90 days", "No subscription required", "Save 20%"]', 1, 1, 1, datetime('now'), datetime('now')),
('usd-campaign-10', 'campaign', '10 Campaigns', 'Ten campaign credits', 'USD', 100.00, NULL, 10, NULL, '["10 campaign credits", "Valid for 180 days", "No subscription required", "Save 33%"]', 1, 2, 0, datetime('now'), datetime('now'));

-- KES Campaign Credit Packs
INSERT INTO billing_plans (id, plan_type, name, description, currency, amount, billing_interval, campaign_limit, lead_limit, features, is_active, display_order, is_popular, created_at, updated_at)
VALUES
('kes-campaign-1', 'campaign', 'Single Campaign', 'One-time campaign credit', 'KES', 1500.00, NULL, 1, NULL, '["1 campaign credit", "Valid for 30 days", "No subscription required"]', 1, 0, 0, datetime('now'), datetime('now')),
('kes-campaign-5', 'campaign', '5 Campaigns', 'Five campaign credits', 'KES', 6000.00, NULL, 5, NULL, '["5 campaign credits", "Valid for 90 days", "No subscription required", "Save 20%"]', 1, 1, 1, datetime('now'), datetime('now')),
('kes-campaign-10', 'campaign', '10 Campaigns', 'Ten campaign credits', 'KES', 10000.00, NULL, 10, NULL, '["10 campaign credits", "Valid for 180 days", "No subscription required", "Save 33%"]', 1, 2, 0, datetime('now'), datetime('now'));

-- USD Lead Credit Packs
INSERT INTO billing_plans (id, plan_type, name, description, currency, amount, billing_interval, campaign_limit, lead_limit, features, is_active, display_order, is_popular, created_at, updated_at)
VALUES
('usd-leads-100', 'leads', '100 Leads', 'Capture up to 100 leads', 'USD', 10.00, NULL, NULL, 100, '["100 lead credits", "Never expires", "Works with any plan"]', 1, 0, 0, datetime('now'), datetime('now')),
('usd-leads-500', 'leads', '500 Leads', 'Capture up to 500 leads', 'USD', 40.00, NULL, NULL, 500, '["500 lead credits", "Never expires", "Works with any plan", "Save 20%"]', 1, 1, 1, datetime('now'), datetime('now')),
('usd-leads-1000', 'leads', '1,000 Leads', 'Capture up to 1,000 leads', 'USD', 70.00, NULL, NULL, 1000, '["1,000 lead credits", "Never expires", "Works with any plan", "Save 30%"]', 1, 2, 0, datetime('now'), datetime('now'));

-- KES Lead Credit Packs
INSERT INTO billing_plans (id, plan_type, name, description, currency, amount, billing_interval, campaign_limit, lead_limit, features, is_active, display_order, is_popular, created_at, updated_at)
VALUES
('kes-leads-100', 'leads', '100 Leads', 'Capture up to 100 leads', 'KES', 1000.00, NULL, NULL, 100, '["100 lead credits", "Never expires", "Works with any plan"]', 1, 0, 0, datetime('now'), datetime('now')),
('kes-leads-500', 'leads', '500 Leads', 'Capture up to 500 leads', 'KES', 4000.00, NULL, NULL, 500, '["500 lead credits", "Never expires", "Works with any plan", "Save 20%"]', 1, 1, 1, datetime('now'), datetime('now')),
('kes-leads-1000', 'leads', '1,000 Leads', 'Capture up to 1,000 leads', 'KES', 7000.00, NULL, NULL, 1000, '["1,000 lead credits", "Never expires", "Works with any plan", "Save 30%"]', 1, 2, 0, datetime('now'), datetime('now'));
