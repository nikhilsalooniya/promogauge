# Testing Subscription Credits Flow

## Current Billing Plans in Database

Looking at the database, we have these plans set up:

**USD Plans:**
- Starter - Weekly: $5, 1 campaign, 120 leads
- Starter: $0.05, 1 campaign, 300 leads  
- Business: $25, 5 campaigns, 1000 leads
- Pro: $50, unlimited campaigns, 3000 leads

**KES Plans:**
- Starter: KSh 500, 1 campaign, 300 leads
- Starter - Weekly: KSh 500, 1 campaign, 120 leads
- Business: KSh 2500, 5 campaigns, 1000 leads
- Pro: KSh 5000, unlimited campaigns, 3000 leads

## Test Steps

1. **Purchase a subscription** via Stripe or Paystack
2. **Webhook fires** and should:
   - Update user plan_type (e.g., 'starter', 'business', 'pro')
   - Set subscription_status to 'active'
   - Calculate plan_expires_at based on billing_cycle
   - Fetch the billing plan's lead_limit and campaign_limit
   - Add lead_limit to user's lead_credits
   - Add campaign_limit to user's campaign_credits

3. **Verify in database** that credits were granted:
   ```sql
   SELECT plan_type, campaign_credits, lead_credits, subscription_status 
   FROM users WHERE mocha_user_id = 'YOUR_MOCHA_USER_ID';
   ```

4. **Check Usage Summary** in billing dashboard shows the credits

## Expected Behavior

When user "Soni Mungai" subscribes to Starter plan:
- campaign_credits should increase by 1
- lead_credits should increase by 300
- Usage Summary should display: "Campaign Credits: 1" and "Lead Credits: 300"
