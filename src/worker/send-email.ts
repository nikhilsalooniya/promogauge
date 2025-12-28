// Helper function to send emails via Mailgun
export async function sendEmail(
  to: string,
  templateName: string,
  variables: Record<string, string>,
  env: Env
): Promise<boolean> {
  try {
    console.log(`[Email] Attempting to send ${templateName} to ${to}`);

    
    // Get active email integration settings
    const emailSettings = await env.DB.prepare(
      "SELECT * FROM email_integration_settings WHERE provider = 'mailgun' AND is_active = 1"
    ).first();

    console.log('Edited by one.salooniya@gmail.com');
    
    if (!emailSettings) {
      console.error("[Email] Mailgun integration not configured or not active");
      return false;
    }

    console.log(`[Email] Using config: ${emailSettings.is_sandbox ? 'SANDBOX' : 'LIVE'} | Domain: ${emailSettings.api_domain} | Sender: ${emailSettings.sender_email}`);
    
    // Get email template
    const template = await env.DB.prepare(
      "SELECT * FROM email_templates WHERE template_name = ?"
    ).bind(templateName).first();

    if (!template) {
      console.error(`[Email] Template ${templateName} not found`);
      return false;
    }

    // Replace template variables in subject, html_body, and text_body
    let subject = template.subject as string;
    let htmlBody = template.html_body as string;
    let textBody = template.text_body as string;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      htmlBody = htmlBody.replace(new RegExp(placeholder, 'g'), value);
      textBody = textBody.replace(new RegExp(placeholder, 'g'), value);
    }

    // Determine Mailgun API endpoint
    const apiDomain = (emailSettings.api_domain as string) || "mg.promoguage.com";
    const mailgunUrl = `https://api.mailgun.net/v3/${apiDomain}/messages`;

    // Send via Mailgun
    const formData = new FormData();
    const senderName = (emailSettings.sender_name as string) || "PromoGuage";
    const senderEmail = (emailSettings.sender_email as string) || "noreply@mg.promoguage.com";
    const apiKey = (emailSettings.api_key as string);
    
    formData.append('from', `${senderName} <${senderEmail}>`);
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('html', htmlBody);
    formData.append('text', textBody);
    
    console.log(`[Email] Sending to: ${to}, From: ${senderName} <${senderEmail}>, Subject: ${subject}`);

    const mailgunRes = await fetch(mailgunUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${apiKey}`)}`,
      },
      body: formData,
    });

    if (mailgunRes.ok) {
      const responseData = await mailgunRes.json() as any;
      console.log(`[Email] Successfully sent ${templateName} to ${to}. Message ID: ${responseData.id}`);
      return true;
    } else {
      const errorData = await mailgunRes.text();
      console.error(`[Email] Failed to send ${templateName} to ${to}:`, errorData);
      return false;
    }
  } catch (error) {
    console.error(`[Email] Error sending ${templateName}:`, error);
    return false;
  }
}

// Helper to get admin emails (users with is_admin = 1)
export async function getAdminEmails(env: Env): Promise<string[]> {
  try {
    const { results: admins } = await env.DB.prepare(
      "SELECT mocha_user_id FROM users WHERE is_admin = 1"
    ).all();

    const adminEmails: string[] = [];

    for (const admin of admins) {
      try {
        const mochaUserRes = await fetch(`${env.MOCHA_USERS_SERVICE_API_URL}/users/${(admin as any).mocha_user_id}`, {
          headers: {
            'Authorization': `Bearer ${env.MOCHA_USERS_SERVICE_API_KEY}`,
          },
        });

        if (mochaUserRes.ok) {
          const mochaUser = await mochaUserRes.json() as { email: string };
          if (mochaUser.email) {
            adminEmails.push(mochaUser.email);
          }
        }
      } catch (err) {
        console.error(`[Email] Error fetching admin email:`, err);
      }
    }

    return adminEmails;
  } catch (error) {
    console.error("[Email] Error getting admin emails:", error);
    return [];
  }
}
