# Testing Subscription Credits with Test Endpoint

## Test Endpoint: `/api/test/grant-subscription-credits`

This admin-only endpoint allows you to manually simulate a subscription purchase and credit granting for testing purposes.

### Requirements
- Must be authenticated
- Must have admin access

### Request Format

**POST** `/api/test/grant-subscription-credits`

**Headers:**
```
Content-Type: application/json
Cookie: mocha-session=<your-session-token>
```

**Body:**
```json
{
  "user_id": "user123456",
  "plan_name": "starter",
  "billing_cycle": "monthly"
}
```

**Parameters:**
- `user_id` (required): The app user ID (not mocha_user_id)
- `plan_name` (required): The plan name: "starter", "business", or "pro"
- `billing_cycle` (optional): "monthly" or "weekly", defaults to "monthly"

### Response Format

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription granted: Starter",
  "plan": {
    "name": "Starter",
    "billing_interval": "monthly",
    "campaign_limit": 1,
    "lead_limit": 300
  },
  "credits_granted": {
    "campaign_credits": 1,
    "lead_credits": 300
  },
  "user": {
    "id": "user123456",
    "business_name": "My Business",
    "plan_type": "starter",
    "subscription_status": "active",
    "billing_cycle": "monthly",
    "campaign_credits": 1,
    "lead_credits": 300,
    "plan_expires_at": "2025-01-02T07:26:32.000Z"
  }
}
```

**Error Responses:**

**User Not Found (404):**
```json
{
  "error": "User not found"
}
```

**Plan Not Found (404):**
```json
{
  "error": "Plan not found: \"Starter\" in USD",
  "hint": "Available plans can be viewed at /api/billing-plans"
}
```

## How to Use

### Step 1: Get Your User ID

Use the authenticated endpoint to get your app user ID:

```bash
curl https://promoguage.mocha.app/api/users/me \
  -H "Cookie: mocha-session=<your-session-token>"
```

Look for `appUser.id` in the response.

### Step 2: Grant Test Credits

```bash
curl -X POST https://promoguage.mocha.app/api/test/grant-subscription-credits \
  -H "Content-Type: application/json" \
  -H "Cookie: mocha-session=<your-session-token>" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "plan_name": "starter",
    "billing_cycle": "monthly"
  }'
```

### Step 3: Verify Credits Were Granted

Check your user data again:

```bash
curl https://promoguage.mocha.app/api/users/me \
  -H "Cookie: mocha-session=<your-session-token>"
```

You should see:
- `appUser.campaign_credits`: Increased by plan's campaign_limit
- `appUser.lead_credits`: Increased by plan's lead_limit
- `appUser.plan_type`: Set to the plan name
- `appUser.subscription_status`: Set to "active"
- `appUser.plan_expires_at`: Set based on billing_cycle

## Available Plans by Currency

### USD Plans
- **Starter** (Monthly): $0.05, 1 campaign, 300 leads
- **Starter** (Weekly): $5, 1 campaign, 120 leads
- **Business**: $25, 5 campaigns, 1000 leads
- **Pro**: $50, unlimited (-1) campaigns, 3000 leads

### KES Plans
- **Starter** (Monthly): KSh 500, 1 campaign, 300 leads
- **Starter** (Weekly): KSh 500, 1 campaign, 120 leads
- **Business**: KSh 2500, 5 campaigns, 1000 leads
- **Pro**: KSh 5000, unlimited (-1) campaigns, 3000 leads

## What the Endpoint Does

1. **Validates Input**: Checks that user_id and plan_name are provided
2. **Fetches User**: Gets the user record from the database
3. **Determines Currency**: Uses the user's currency setting (USD or KES)
4. **Finds Billing Plan**: Looks up the plan by name and currency
   - First tries to match with billing_interval
   - Falls back to any plan with that name if billing_interval doesn't match
5. **Calculates Expiry**: Sets plan_expires_at based on billing_cycle
   - Weekly: +7 days
   - Monthly: +1 month
6. **Updates User Record**: 
   - Sets `plan_type` to the plan name
   - Sets `subscription_status` to "active"
   - Sets `billing_cycle`
   - Sets `plan_expires_at`
   - Adds `campaign_limit` to `campaign_credits`
   - Adds `lead_limit` to `lead_credits`
7. **Returns Details**: Shows exactly what was granted

## Common Issues

### Issue: Plan Not Found
**Cause**: The plan name doesn't match or the user's currency doesn't have that plan.

**Solution**: 
- Check available plans at `/api/billing-plans?currency=USD` or `/api/billing-plans?currency=KES`
- Ensure the plan_name matches exactly (case-insensitive)
- Verify the user's currency setting matches an available plan

### Issue: Unlimited Campaigns Showing as -1
**Cause**: The database stores unlimited as -1.

**Solution**: This is expected. The Pro plan has -1 for campaign_limit, meaning unlimited campaigns.

### Issue: Credits Not Being Consumed
**Cause**: The credit consumption logic checks if the user is on free plan or has expired subscription.

**Solution**: This is working as designed. Active subscriptions don't consume credits per action.

## Testing the Complete Flow

1. **Start with Zero Credits**: Verify user has 0 credits
2. **Grant Starter Plan**: Use test endpoint to grant Starter plan
3. **Verify Credits Granted**: Check user now has 1 campaign credit and 300 lead credits
4. **Create Campaign**: Create a campaign (should not deduct credits for active subscription)
5. **Capture Lead**: Have someone spin and submit lead (should not deduct credits for active subscription)
6. **Check Dashboard**: Verify billing dashboard shows correct credit totals

## Notes

- This endpoint bypasses payment gateways entirely
- Credits are added, not set, so you can call it multiple times
- The subscription expiry is calculated from current time
- This does NOT create a Stripe subscription or payment record
- Use this for testing the credit system logic without involving real payments
