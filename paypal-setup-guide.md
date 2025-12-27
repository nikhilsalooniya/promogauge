# PayPal Integration Setup Guide

## Current Status

✅ **Working**: One-time payments (Pay-Per-Campaign, Pay-Per-Lead)  
⚠️ **Requires Setup**: Subscription payments (Monthly/Weekly plans)

## Error Fixed

The "Failed to initiate payment" error for subscriptions has been fixed. The code now provides clear error messages when PayPal product setup is incomplete.

## Required One-Time Setup for Subscriptions

To enable subscription payments via PayPal, you need to create a product in your PayPal account:

### Step 1: Access PayPal Dashboard

1. Log into your PayPal Business account at https://www.paypal.com
2. Navigate to **Developer Dashboard** or **Business Dashboard**
3. Look for **Products** or **Catalog** section

### Step 2: Create Subscription Product

Create a new product with these exact details:

- **Product ID**: `PROMOGUAGE_SUBSCRIPTION` (must match exactly)
- **Product Name**: PromoGuage Subscription
- **Product Type**: Service or Digital Product
- **Category**: Software/Digital Services
- **Description**: PromoGuage promotional campaign management service

### Step 3: Verify API Credentials

Ensure your PayPal credentials in the app are correct:

**Current Live Credentials:**
- Client ID: AXFOPI0hu6PiXizA_jekrVYC3qIwiRcGUuONvSr10iKBR9zd6FtClX02p1sPiicEIeJlMGpdygcHqEbR
- Is Active: Yes
- Environment: Live (Production)

**Sandbox Credentials (for testing):**
- Client ID: AT5UozNRpAbNoC5f5rVGnJa4A67eTzp6XKhXwu1aT50ATf1gxopvsBiNXwrZlXoh5qhM6HAGaP6lCatu
- Is Active: No
- Environment: Sandbox

## Testing

### Test One-Time Payments (Should work now)
1. Go to Billing page
2. Select "Pay Per Campaign" or "Pay Per Lead"
3. Choose PayPal as payment method
4. Complete the payment flow

### Test Subscriptions (After product setup)
1. Go to Pricing or Billing page
2. Select a Starter, Business, or Pro plan
3. Choose PayPal as payment method
4. You should be redirected to PayPal to approve the subscription

## Troubleshooting

### If subscriptions still fail after setup:

1. **Verify Product ID matches exactly**: The product ID in PayPal must be `PROMOGUAGE_SUBSCRIPTION` (case-sensitive)

2. **Check API credentials**: Make sure you're using the correct Client ID and Secret for your live account

3. **Verify account permissions**: Your PayPal business account must have subscriptions enabled

4. **Check logs**: Look in the console for `[PayPal]` prefixed messages to see detailed error information

### Common Error Messages

- **"PayPal product not configured"**: The PROMOGUAGE_SUBSCRIPTION product doesn't exist in your PayPal account
- **"Failed to authenticate with PayPal"**: API credentials are incorrect or expired
- **"INVALID_PARAMETER_SYNTAX for plan_id"**: The product exists but plan creation is failing (check product configuration)

## Alternative: Disable PayPal Subscriptions

If you only want to use PayPal for one-time payments:

1. Go to Admin → Payment Gateways
2. Find PayPal (Live)
3. Mark it as inactive for subscription purchases
4. Keep it active only for pay-per-campaign and pay-per-lead

## Support

If you continue experiencing issues after following this guide, the code now provides detailed error messages that will help identify the specific problem.
