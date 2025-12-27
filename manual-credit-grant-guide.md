# Manual Credit Grant Guide

## Problem
Subscription purchases via Paystack are showing as "pending" in the database instead of "completed". This means the webhook isn't processing successfully, and users aren't receiving their credits automatically.

## Solution
Use the admin endpoints to manually grant credits to users who purchased subscriptions.

## Step 1: Find User ID by Email

**Endpoint:** `POST /api/admin/find-user-by-email`

**Request:**
```bash
curl -X POST https://promoguage.mocha.app/api/admin/find-user-by-email \
  -H "Content-Type: application/json" \
  -H "Cookie: mocha-session=YOUR_SESSION_TOKEN" \
  -d '{"email": "mungaisoni@gmail.com"}'
```

**Response:**
```json
{
  "found": true,
  "user": {
    "id": "user_id_here",
    "email": "mungaisoni@gmail.com",
    "business_name": "Business Name",
    "plan_type": "free",
    "campaign_credits": 0,
    "lead_credits": 0
  }
}
```

## Step 2: Grant Credits to User

**Endpoint:** `POST /api/admin/grant-credits/:userId`

**For Starter Plan (300 lead credits):**
```bash
curl -X POST https://promoguage.mocha.app/api/admin/grant-credits/USER_ID_HERE \
  -H "Content-Type: application/json" \
  -H "Cookie: mocha-session=YOUR_SESSION_TOKEN" \
  -d '{
    "credits": 300,
    "reason": "Manual grant for Starter subscription - webhook issue"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully granted 300 lead credits",
  "user": {
    "id": "user_id",
    "lead_credits": 300,
    "plan_type": "free",
    "subscription_status": null
  }
}
```

## Credits by Plan

Based on your billing plans:

- **Starter (Monthly)**: 300 lead credits, 1 campaign credit
- **Starter (Weekly)**: 120 lead credits, 1 campaign credit
- **Business**: 1000 lead credits, 5 campaign credits
- **Pro**: 3000 lead credits, unlimited campaigns

## Users to Process

Based on the transaction data:

1. **mungaisoni@gmail.com** (Declata)
   - Has 2 pending Starter subscriptions (KES 5.00)
   - Should receive: 300 lead credits + 1 campaign credit

2. **testingkafe1@gmail.com** (Freelance Kafe)
   - Has 1 completed leads purchase (100 lead credits) - already credited
   - No pending subscriptions found

## Quick Command Sequence

```bash
# 1. Login to admin panel and get session token from browser cookies

# 2. Find user ID
curl -X POST https://promoguage.mocha.app/api/admin/find-user-by-email \
  -H "Content-Type: application/json" \
  -H "Cookie: mocha-session=YOUR_SESSION" \
  -d '{"email": "mungaisoni@gmail.com"}'

# 3. Grant lead credits (replace USER_ID)
curl -X POST https://promoguage.mocha.app/api/admin/grant-credits/USER_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: mocha-session=YOUR_SESSION" \
  -d '{"credits": 300, "reason": "Starter subscription - manual grant"}'

# 4. Repeat for other users as needed
```

## Next Steps

After granting credits manually:

1. **Update subscription status**: The users still need their `plan_type` and `subscription_status` updated
2. **Fix webhook**: Investigate why Paystack webhook isn't marking transactions as "completed"
3. **Set up monitoring**: Add logging to track webhook processing

## Webhook Investigation

The Paystack transactions are stuck at "pending" because the webhook endpoint at `/api/webhooks/paystack` isn't receiving the success event or isn't processing it correctly. 

Check:
- Paystack webhook configuration in the dashboard
- Webhook secret is correct in environment variables
- Webhook URL is accessible from Paystack servers
- Review webhook logs in Paystack dashboard for failures
