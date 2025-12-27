
-- Remove all seeded billing plans
DELETE FROM billing_plans WHERE id IN (
  'starter-usd', 'business-usd', 'pro-usd',
  'starter-kes', 'business-kes', 'pro-kes',
  'campaign-1-usd', 'campaign-5-usd', 'campaign-10-usd',
  'campaign-1-kes', 'campaign-5-kes', 'campaign-10-kes',
  'leads-100-usd', 'leads-500-usd', 'leads-1000-usd',
  'leads-100-kes', 'leads-500-kes', 'leads-1000-kes'
);
