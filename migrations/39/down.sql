
-- Remove standardized billing plans
DELETE FROM billing_plans WHERE id IN (
  'usd-starter', 'usd-business', 'usd-pro',
  'kes-starter', 'kes-business', 'kes-pro',
  'usd-campaign-1', 'usd-campaign-5', 'usd-campaign-10',
  'kes-campaign-1', 'kes-campaign-5', 'kes-campaign-10',
  'usd-leads-100', 'usd-leads-500', 'usd-leads-1000',
  'kes-leads-100', 'kes-leads-500', 'kes-leads-1000'
);
