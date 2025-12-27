-- SQL Script to Install Email Templates in Production
-- Run this script in your production database console

-- 1. Renewal Reminder Template (3-day and 7-day warnings)
INSERT OR REPLACE INTO email_templates (
  id, template_name, subject, html_body, text_body, variables, created_at, updated_at
) VALUES (
  'renewal_reminder',
  'renewal_reminder',
  'Your {{plan_name}} Plan Expires in {{days_remaining}} Days',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #333;">Hi {{user_name}},</h2>
    <p>This is a friendly reminder that your <strong>{{plan_name}}</strong> subscription will expire on <strong>{{expiry_date}}</strong>.</p>
    <p>You have <strong>{{days_remaining}} days</strong> remaining to renew your subscription and continue enjoying all the benefits of PromoGuage.</p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">What happens when your plan expires?</h3>
      <ul style="line-height: 1.6;">
        <li>Your active campaigns will be paused</li>
        <li>You won''t be able to create new campaigns</li>
        <li>Lead collection will be disabled</li>
      </ul>
    </div>
    <p style="margin: 30px 0;">
      <a href="{{renewal_link}}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Renew Your Subscription</a>
    </p>
    <p>If you have any questions, feel free to reach out to our support team.</p>
    <p>Best regards,<br>The PromoGuage Team</p>
  </body></html>',
  'Hi {{user_name}},

This is a friendly reminder that your {{plan_name}} subscription will expire on {{expiry_date}}.

You have {{days_remaining}} days remaining to renew your subscription and continue enjoying all the benefits of PromoGuage.

What happens when your plan expires?
- Your active campaigns will be paused
- You won''t be able to create new campaigns
- Lead collection will be disabled

Renew your subscription now: {{renewal_link}}

If you have any questions, feel free to reach out to our support team.

Best regards,
The PromoGuage Team',
  '["user_name", "plan_name", "expiry_date", "days_remaining", "renewal_link"]',
  datetime('now'),
  datetime('now')
);

-- 2. Welcome Email for Business Owner
INSERT OR REPLACE INTO email_templates (
  id, template_name, subject, html_body, text_body, variables, created_at, updated_at
) VALUES (
  'welcome_email_owner',
  'welcome_email_owner',
  'Welcome to PromoGuage, {{user_name}}!',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #333;">Welcome to PromoGuage, {{user_name}}!</h2>
    <p>We''re excited to have you on board! 🎉</p>
    <p>PromoGuage makes it easy to create engaging promotional campaigns with our Spin the Wheel and Scratch & Win templates.</p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Get Started in 3 Easy Steps:</h3>
      <ol style="line-height: 1.8;">
        <li>Choose a campaign template</li>
        <li>Customize your prizes and branding</li>
        <li>Share your campaign link and start collecting leads!</li>
      </ol>
    </div>
    <p style="margin: 30px 0;">
      <a href="{{dashboard_link}}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
    </p>
    <p>Need help? Check out our <a href="{{help_link}}">Getting Started Guide</a> or contact our support team.</p>
    <p>Best regards,<br>The PromoGuage Team</p>
  </body></html>',
  'Welcome to PromoGuage, {{user_name}}!

We''re excited to have you on board!

PromoGuage makes it easy to create engaging promotional campaigns with our Spin the Wheel and Scratch & Win templates.

Get Started in 3 Easy Steps:
1. Choose a campaign template
2. Customize your prizes and branding
3. Share your campaign link and start collecting leads!

Go to your dashboard: {{dashboard_link}}

Need help? Check out our Getting Started Guide: {{help_link}}

Best regards,
The PromoGuage Team',
  '["user_name", "dashboard_link", "help_link"]',
  datetime('now'),
  datetime('now')
);

-- 3. Subscription Receipt for Business Owner
INSERT OR REPLACE INTO email_templates (
  id, template_name, subject, html_body, text_body, variables, created_at, updated_at
) VALUES (
  'subscription_receipt_owner',
  'subscription_receipt_owner',
  'Payment Confirmation - {{plan_name}} Subscription',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #333;">Payment Received</h2>
    <p>Hi {{user_name}},</p>
    <p>Thank you for your payment! Your <strong>{{plan_name}}</strong> subscription has been confirmed.</p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Payment Details</h3>
      <table style="width: 100%; line-height: 1.8;">
        <tr><td><strong>Plan:</strong></td><td>{{plan_name}}</td></tr>
        <tr><td><strong>Amount:</strong></td><td>{{amount}} {{currency}}</td></tr>
        <tr><td><strong>Billing Cycle:</strong></td><td>{{billing_cycle}}</td></tr>
        <tr><td><strong>Next Billing Date:</strong></td><td>{{next_billing_date}}</td></tr>
        <tr><td><strong>Transaction ID:</strong></td><td>{{transaction_id}}</td></tr>
      </table>
    </div>
    <p>Your subscription is now active and you can start using all premium features!</p>
    <p style="margin: 30px 0;">
      <a href="{{dashboard_link}}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
    </p>
    <p>If you have any questions about your subscription, please contact our support team.</p>
    <p>Best regards,<br>The PromoGuage Team</p>
  </body></html>',
  'Payment Received

Hi {{user_name}},

Thank you for your payment! Your {{plan_name}} subscription has been confirmed.

Payment Details:
- Plan: {{plan_name}}
- Amount: {{amount}} {{currency}}
- Billing Cycle: {{billing_cycle}}
- Next Billing Date: {{next_billing_date}}
- Transaction ID: {{transaction_id}}

Your subscription is now active and you can start using all premium features!

Go to Dashboard: {{dashboard_link}}

If you have any questions about your subscription, please contact our support team.

Best regards,
The PromoGuage Team',
  '["user_name", "plan_name", "amount", "currency", "billing_cycle", "next_billing_date", "transaction_id", "dashboard_link"]',
  datetime('now'),
  datetime('now')
);

-- 4. Reward Confirmation for Campaign Participant
INSERT OR REPLACE INTO email_templates (
  id, template_name, subject, html_body, text_body, variables, created_at, updated_at
) VALUES (
  'reward_confirmation_participant',
  'reward_confirmation_participant',
  'Congratulations! You won {{prize_name}}',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #333;">🎉 Congratulations, {{participant_name}}!</h2>
    <p>You''re a winner! You''ve won <strong>{{prize_name}}</strong> from {{business_name}}.</p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Your Prize Details</h3>
      <table style="width: 100%; line-height: 1.8;">
        <tr><td><strong>Prize:</strong></td><td>{{prize_name}}</td></tr>
        <tr><td><strong>Reference Number:</strong></td><td>{{reference_number}}</td></tr>
        <tr><td><strong>Valid Until:</strong></td><td>{{expiry_date}}</td></tr>
      </table>
    </div>
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
      <h3 style="margin-top: 0;">How to Redeem</h3>
      <p style="margin: 0;">{{redemption_instructions}}</p>
    </div>
    <p><strong>Important:</strong> Please save your reference number ({{reference_number}}) as you''ll need it to claim your prize.</p>
    <p>If you have any questions, please contact {{business_name}}.</p>
    <p>Enjoy your prize!<br>The PromoGuage Team</p>
  </body></html>',
  'Congratulations, {{participant_name}}!

You''re a winner! You''ve won {{prize_name}} from {{business_name}}.

Your Prize Details:
- Prize: {{prize_name}}
- Reference Number: {{reference_number}}
- Valid Until: {{expiry_date}}

How to Redeem:
{{redemption_instructions}}

Important: Please save your reference number ({{reference_number}}) as you''ll need it to claim your prize.

If you have any questions, please contact {{business_name}}.

Enjoy your prize!
The PromoGuage Team',
  '["participant_name", "prize_name", "business_name", "reference_number", "expiry_date", "redemption_instructions"]',
  datetime('now'),
  datetime('now')
);

-- 5. Admin Notification for New Signup
INSERT OR REPLACE INTO email_templates (
  id, template_name, subject, html_body, text_body, variables, created_at, updated_at
) VALUES (
  'admin_new_signup',
  'admin_new_signup',
  'New User Signup - {{user_name}}',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #333;">New User Signup</h2>
    <p>A new user has signed up for PromoGuage!</p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">User Details</h3>
      <table style="width: 100%; line-height: 1.8;">
        <tr><td><strong>Name:</strong></td><td>{{user_name}}</td></tr>
        <tr><td><strong>Email:</strong></td><td>{{user_email}}</td></tr>
        <tr><td><strong>Business:</strong></td><td>{{business_name}}</td></tr>
        <tr><td><strong>Country:</strong></td><td>{{country}}</td></tr>
        <tr><td><strong>Industry:</strong></td><td>{{industry}}</td></tr>
        <tr><td><strong>Signup Date:</strong></td><td>{{signup_date}}</td></tr>
      </table>
    </div>
  </body></html>',
  'New User Signup

A new user has signed up for PromoGuage!

User Details:
- Name: {{user_name}}
- Email: {{user_email}}
- Business: {{business_name}}
- Country: {{country}}
- Industry: {{industry}}
- Signup Date: {{signup_date}}',
  '["user_name", "user_email", "business_name", "country", "industry", "signup_date"]',
  datetime('now'),
  datetime('now')
);

-- 6. Reward Redemption Notification for Business Owner
INSERT OR REPLACE INTO email_templates (
  id, template_name, subject, html_body, text_body, variables, created_at, updated_at
) VALUES (
  'reward_redemption_owner',
  'reward_redemption_owner',
  'Prize Redeemed - {{campaign_name}}',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #333;">Prize Redeemed</h2>
    <p>Hi {{owner_name}},</p>
    <p>A participant has redeemed their prize from your campaign <strong>{{campaign_name}}</strong>.</p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Redemption Details</h3>
      <table style="width: 100%; line-height: 1.8;">
        <tr><td><strong>Campaign:</strong></td><td>{{campaign_name}}</td></tr>
        <tr><td><strong>Participant:</strong></td><td>{{participant_name}}</td></tr>
        <tr><td><strong>Prize:</strong></td><td>{{prize_name}}</td></tr>
        <tr><td><strong>Reference Number:</strong></td><td>{{reference_number}}</td></tr>
        <tr><td><strong>Redeemed On:</strong></td><td>{{redemption_date}}</td></tr>
      </table>
    </div>
    <p style="margin: 30px 0;">
      <a href="{{campaign_link}}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Campaign Details</a>
    </p>
    <p>Best regards,<br>The PromoGuage Team</p>
  </body></html>',
  'Prize Redeemed

Hi {{owner_name}},

A participant has redeemed their prize from your campaign {{campaign_name}}.

Redemption Details:
- Campaign: {{campaign_name}}
- Participant: {{participant_name}}
- Prize: {{prize_name}}
- Reference Number: {{reference_number}}
- Redeemed On: {{redemption_date}}

View Campaign Details: {{campaign_link}}

Best regards,
The PromoGuage Team',
  '["owner_name", "campaign_name", "participant_name", "prize_name", "reference_number", "redemption_date", "campaign_link"]',
  datetime('now'),
  datetime('now')
);

-- Verify installation
SELECT 'Email templates installed successfully!' as status;
SELECT COUNT(*) as total_templates FROM email_templates;
SELECT template_name FROM email_templates ORDER BY template_name;
