import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  authMiddleware,
  getOAuthRedirectUrl,
  exchangeCodeForSessionToken,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";
import { 
  CreateCampaignRequestSchema,
  UpdateCampaignRequestSchema,
  UpdateUserRequestSchema,
  ProfileSetupRequestSchema,
  WheelSegment,
  LeadFormField,
} from "@/shared/types";
import { campaignTemplates } from "@/shared/templates";
import { nanoid } from "nanoid";
import Stripe from "stripe";
import { userHasWatermarkRemoval } from "./check-watermark-entitlement";
import { userHasBackgroundImageUpload, userHasLogoUpload, userHasExternalBorder, userHasQRCode } from "./check-feature-entitlements";
import { sendEmail, getAdminEmails } from "./send-email";
import { handleFaviconUpload } from "./homepage-favicon-upload";

const app = new Hono<{ Bindings: Env }>();

app.use("/*", cors());

// Initialize Stripe
const getStripe = (env: Env) => {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-11-17.clover",
  });
};

// Auth routes
app.get("/api/oauth/google/redirect_url", async (c) => {
  const redirectUrl = await getOAuthRedirectUrl("google", {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true }, 200);
});

app.get("/api/logout", async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === "string") {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// User routes
app.get("/api/users/me", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Get or create app user
  let appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    const userId = nanoid();
    await c.env.DB.prepare(
      "INSERT INTO users (id, mocha_user_id, email, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))"
    ).bind(userId, mochaUser.id, mochaUser.email).run();

    appUser = await c.env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(userId).first();
  } else if (appUser.email !== mochaUser.email) {
    // Update email if it has changed
    await c.env.DB.prepare(
      "UPDATE users SET email = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(mochaUser.email, appUser.id).run();
    
    appUser = await c.env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(appUser.id).first();
  }

  // Auto-sync currency with country if there's a mismatch
  if (appUser && appUser.country) {
    const expectedCurrency = appUser.country === 'KE' ? 'KES' : 'USD';
    if (appUser.currency !== expectedCurrency) {
      await c.env.DB.prepare(
        "UPDATE users SET currency = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(expectedCurrency, appUser.id).run();
      
      // Fetch updated user
      appUser = await c.env.DB.prepare(
        "SELECT * FROM users WHERE id = ?"
      ).bind(appUser.id).first();
    }
  }

  return c.json({ 
    ...mochaUser, 
    appUser: {
      ...appUser,
      email: mochaUser.email // Include email from Mocha user
    }
  });
});

app.patch("/api/users/me", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const validatedData = UpdateUserRequestSchema.parse(body);

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (validatedData.business_name !== undefined) {
    updates.push("business_name = ?");
    values.push(validatedData.business_name);
  }
  if (validatedData.country !== undefined) {
    updates.push("country = ?");
    values.push(validatedData.country);
    
    // Auto-update currency when country changes: Kenya → KES, others → USD
    const currency = validatedData.country === 'KE' ? 'KES' : 'USD';
    updates.push("currency = ?");
    values.push(currency);
  }
  if (validatedData.currency !== undefined) {
    updates.push("currency = ?");
    values.push(validatedData.currency);
  }
  if (body.phone !== undefined) {
    updates.push("phone = ?");
    values.push(body.phone);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(appUser.id);

    await c.env.DB.prepare(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...values).run();
  }

  const updatedUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE id = ?"
  ).bind(appUser.id).first();

  // Send welcome email to the user (async, don't wait)
  const userName = (updatedUser as any).full_name || 'Valued Customer';
  const businessName = (updatedUser as any).business_name || 'Not provided';
  const userCountry = (updatedUser as any).country || 'Not provided';
  const userIndustry = (updatedUser as any).industry || 'Not provided';

  // **** CUSTOM: one.salooniya@gmail.com

  c.executionCtx.waitUntil(
    Promise.all([
      // 1. Send Welcome Email to the User
      sendEmail(
        mochaUser.email,
        'welcome_email_owner',
        {
          user_name: userName,
          dashboard_link: `${c.req.header("origin") || 'https://promoguage.mocha.app'}/dashboard`,
          help_link: `${c.req.header("origin") || 'https://promoguage.mocha.app'}/how-it-works`,
        },
        c.env
      ).then(sent => {
        if (sent) console.log(`[Profile Update] Welcome email sent to ${mochaUser.email}`);
        else console.error(`[Profile Update] Failed to send welcome email to ${mochaUser.email}`);
      }),

      // 2. Send Notification to Admins
      getAdminEmails(c.env).then(adminEmails => {
        const adminPromises = adminEmails.map(adminEmail => 
          sendEmail(
            adminEmail,
            'admin_new_signup',
            {
              user_name: userName,
              user_email: mochaUser.email,
              business_name: businessName,
              country: userCountry,
              industry: userIndustry,
              signup_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            },
            c.env
          )
        );
        return Promise.all(adminPromises);
      }).catch(err => console.error('[Profile Update] Failed to notify admins:', err))
    ])
  );
  
  // **** CUSTOM: one.salooniya@gmail.com

  // **** CUSTOM: OLD CODE COMMENTED OUT
  // sendEmail(
  //   mochaUser.email,
  //   'welcome_email_owner',
  //   {
  //     user_name: userName,
  //     dashboard_link: `${c.req.header("origin") || 'https://promoguage.mocha.app'}/dashboard`,
  //     help_link: `${c.req.header("origin") || 'https://promoguage.mocha.app'}/how-it-works`,
  //   },
  //   c.env
  // ).then(sent => {
  //   if (sent) {
  //     console.log(`[Profile Setup] Welcome email sent to ${mochaUser.email}`);
  //   } else {
  //     console.error(`[Profile Setup] Failed to send welcome email to ${mochaUser.email}`);
  //   }
  // }).catch(err => console.error('[Profile Setup] Welcome email error:', err));

  // // Send admin notification email (async, don't wait)
  // getAdminEmails(c.env).then(adminEmails => {
  //   for (const adminEmail of adminEmails) {
  //     sendEmail(
  //       adminEmail,
  //       'admin_new_signup',
  //       {
  //         user_name: userName,
  //         user_email: mochaUser.email,
  //         business_name: businessName,
  //         country: userCountry,
  //         industry: userIndustry || 'Not provided',
  //         signup_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  //       },
  //       c.env
  //     ).then(sent => {
  //       if (sent) {
  //         console.log(`[Profile Setup] Admin notification sent to ${adminEmail}`);
  //       }
  //     }).catch(err => console.error('[Profile Setup] Admin email error:', err));
  //   }
  // }).catch(err => console.error('[Profile Setup] Failed to get admin emails:', err));

  return c.json(updatedUser);
});

app.post("/api/users/profile-setup", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const validatedData = ProfileSetupRequestSchema.parse(body);

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  // Auto-set currency based on country: Kenya → KES, others → USD
  const currency = validatedData.country === 'KE' ? 'KES' : 'USD';

  await c.env.DB.prepare(
    `UPDATE users SET 
      full_name = ?,
      business_name = ?,
      industry = ?,
      country = ?,
      currency = ?,
      phone = ?,
      profile_completed = 1,
      updated_at = datetime('now')
    WHERE id = ?`
  ).bind(
    validatedData.full_name,
    validatedData.business_name,
    validatedData.industry,
    validatedData.country,
    currency,
    validatedData.phone || null,
    appUser.id
  ).run();

  const updatedUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE id = ?"
  ).bind(appUser.id).first();

  // **** CUSTOM: one.salooniya@gmail.com

  // FIX 1: Add the Welcome Email logic here
  const userName = validatedData.full_name || 'Valued Customer';
  
  // Only send welcome email if user doesn't have an active subscription
  // (to avoid sending welcome email after they just purchased a plan)
  const shouldSendWelcome = !updatedUser || 
    (updatedUser.plan_type === 'free' && 
     updatedUser.subscription_status !== 'active');
  
  if (shouldSendWelcome) {
    // FIX 2: Use c.executionCtx.waitUntil to ensure the email sends in the background
    c.executionCtx.waitUntil(
      Promise.all([
        // Send Welcome Email to User
        sendEmail(
          mochaUser.email,
          'welcome_email_owner',
          {
            user_name: userName,
            dashboard_link: `${c.req.header("origin") || 'https://promoguage.mocha.app'}/dashboard`,
            help_link: `${c.req.header("origin") || 'https://promoguage.mocha.app'}/how-it-works`,
          },
          c.env
        ).then(sent => {
          if (sent) console.log(`[Profile Setup] Welcome email sent to ${mochaUser.email}`);
          else console.error(`[Profile Setup] Failed to send welcome email`);
        }),

      // Send Admin Notification
      getAdminEmails(c.env).then(adminEmails => {
        const emailPromises = adminEmails.map(adminEmail => 
          sendEmail(
            adminEmail,
            'admin_new_signup',
            {
              user_name: userName,
              user_email: mochaUser.email,
              business_name: validatedData.business_name,
              country: validatedData.country,
              industry: validatedData.industry || 'Not provided',
              signup_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            },
            c.env
          )
        );
        return Promise.all(emailPromises);
      })
    ])
    );
  } else {
    console.log(`[Profile Setup] Skipping welcome email for ${mochaUser.email} - user already has active subscription`);
  }
  
  // **** CUSTOM: one.salooniya@gmail.com
  
  return c.json(updatedUser);
});

// File upload routes
app.post("/api/campaigns/:id/upload-logo", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const campaignId = c.req.param("id");
  const campaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ? AND user_id = ?"
  ).bind(campaignId, appUser.id).first();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get("logo");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Invalid file type. Only images are allowed." }, 400);
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: "File too large. Maximum size is 5MB." }, 400);
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const filename = `${timestamp}.${fileExtension}`;
    const key = `campaigns/${campaignId}/logo/${filename}`;

    // Upload to R2
    await c.env.R2_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Generate public URL
    const publicUrl = `/api/files/${key}`;

    // Update campaign with new logo URL
    await c.env.DB.prepare(
      "UPDATE campaigns SET logo_url = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(publicUrl, campaignId).run();

    return c.json({ url: publicUrl });
  } catch (error) {
    console.error("Logo upload error:", error);
    return c.json({ error: "Failed to upload logo" }, 500);
  }
});

app.post("/api/campaigns/:id/upload-prize-image", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const campaignId = c.req.param("id");
  const campaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ? AND user_id = ?"
  ).bind(campaignId, appUser.id).first();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get("prize_image");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Invalid file type. Only images are allowed." }, 400);
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: "File too large. Maximum size is 5MB." }, 400);
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const filename = `${timestamp}.${fileExtension}`;
    const key = `campaigns/${campaignId}/prizes/${filename}`;

    // Upload to R2
    await c.env.R2_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Generate public URL
    const publicUrl = `/api/files/${key}`;

    return c.json({ url: publicUrl });
  } catch (error) {
    console.error("Prize image upload error:", error);
    return c.json({ error: "Failed to upload prize image" }, 500);
  }
});

app.post("/api/campaigns/:id/upload-prize-file", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const campaignId = c.req.param("id");
  const campaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ? AND user_id = ?"
  ).bind(campaignId, appUser.id).first();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get("prize_file");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file size (max 50MB for downloadable files)
    if (file.size > 50 * 1024 * 1024) {
      return c.json({ error: "File too large. Maximum size is 50MB." }, 400);
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const originalName = file.name;
    const fileExtension = originalName.split(".").pop();
    const filename = `${timestamp}.${fileExtension}`;
    const key = `campaigns/${campaignId}/files/${filename}`;

    // Upload to R2 with original filename in custom metadata
    await c.env.R2_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalFileName: originalName,
      },
    });

    // Generate public URL
    const publicUrl = `/api/files/${key}`;

    return c.json({ url: publicUrl, fileName: originalName });
  } catch (error) {
    console.error("Prize file upload error:", error);
    return c.json({ error: "Failed to upload prize file" }, 500);
  }
});

app.post("/api/campaigns/:id/upload-background", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const campaignId = c.req.param("id");
  const campaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ? AND user_id = ?"
  ).bind(campaignId, appUser.id).first();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get("background");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Invalid file type. Only images are allowed." }, 400);
    }

    // Validate file size (max 10MB for backgrounds)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: "File too large. Maximum size is 10MB." }, 400);
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const filename = `${timestamp}.${fileExtension}`;
    const key = `campaigns/${campaignId}/background/${filename}`;

    // Upload to R2
    await c.env.R2_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Generate public URL
    const publicUrl = `/api/files/${key}`;

    // Update campaign with new background image URL
    await c.env.DB.prepare(
      "UPDATE campaigns SET background_image_url = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(publicUrl, campaignId).run();

    return c.json({ url: publicUrl });
  } catch (error) {
    console.error("Background image upload error:", error);
    return c.json({ error: "Failed to upload background image" }, 500);
  }
});

app.get("/api/files/*", async (c) => {
  // Extract the file key from the request path
  const fullPath = c.req.path;
  const key = fullPath.replace('/api/files/', '');
  
  if (!key) {
    return c.json({ error: "Invalid file path" }, 400);
  }
  
  try {
    const object = await c.env.R2_BUCKET.get(key);
    
    if (!object) {
      return c.json({ error: "File not found" }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=31536000");
    
    // Check if this is a downloadable file (from campaigns/.../files/ path)
    // and set Content-Disposition header to force download with original filename
    if (key.includes('/files/')) {
      const originalFileName = object.customMetadata?.originalFileName;
      let filename = originalFileName || key.split('/').pop() || 'download';
      
      // Ensure proper Content-Type based on file extension
      const extension = filename.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'zip': 'application/zip',
        'mp4': 'video/mp4',
        'mp3': 'audio/mpeg',
      };
      
      if (extension && mimeTypes[extension]) {
        headers.set("content-type", mimeTypes[extension]);
      }
      
      // Force download with attachment and original filename
      headers.set("content-disposition", `attachment; filename="${filename}"`);
    }
    
    return c.body(object.body, { headers });
  } catch (error) {
    console.error("File retrieval error:", error);
    return c.json({ error: "Failed to retrieve file" }, 500);
  }
});

// Campaign routes
app.get("/api/campaigns", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const { results } = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC"
  ).bind(appUser.id).all();

  const campaigns = results.map(campaign => ({
    ...campaign,
    lead_form_fields: campaign.lead_form_fields ? JSON.parse(campaign.lead_form_fields as string) : [],
    wheel_segments: campaign.wheel_segments ? JSON.parse(campaign.wheel_segments as string) : [],
    wheel_colors: campaign.wheel_colors ? JSON.parse(campaign.wheel_colors as string) : { primary: "#6366f1", secondary: "#8b5cf6" },
    sound_settings: campaign.sound_settings ? JSON.parse(campaign.sound_settings as string) : { spin: true, win: true, noWin: true },
    valid_countries: campaign.valid_countries ? JSON.parse(campaign.valid_countries as string) : [],
    terms_conditions: campaign.terms_conditions || null,
    privacy_policy: campaign.privacy_policy || null,
    is_lead_form_required: campaign.is_lead_form_required === 1,
    confetti_enabled: campaign.confetti_enabled === 1,
    sound_enabled: campaign.sound_enabled === 1,
    spin_button_pulse_enabled: campaign.spin_button_pulse_enabled === 1,
    border_enabled: campaign.border_enabled === 1,
    border_default_enabled: campaign.border_default_enabled === 1,
    border_custom_colors: campaign.border_custom_colors ? JSON.parse(campaign.border_custom_colors as string) : [],
    border_connector_ring_enabled: campaign.border_connector_ring_enabled === 1,
    show_watermark: campaign.show_watermark === 1,
  }));

  return c.json(campaigns);
});

app.post("/api/campaigns", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  // Check campaign credits - ALL users must have credits to create campaigns
  const userCampaignCredits = Number(appUser.campaign_credits) || 0;

  if (userCampaignCredits <= 0) {
    return c.json({ 
      error: "Campaign credits exhausted. Please upgrade your plan or purchase campaign credits to continue.",
      credits_exhausted: true
    }, 403);
  }

  const body = await c.req.json();
  const validatedData = CreateCampaignRequestSchema.parse(body);

  const campaignId = nanoid();
  const publicSlug = nanoid(10);
  const campaignType = body.campaign_type || "spinwheel";

  // Get template data from database if template_id is provided
  let defaultSegments: WheelSegment[] = [];
  let defaultColors = { primary: "#6366f1", secondary: "#8b5cf6" };
  let defaultLeadFormFields: LeadFormField[] = [];

  if (validatedData.template_id) {
    const dbTemplate = await c.env.DB.prepare(
      "SELECT * FROM campaign_templates WHERE id = ? AND is_active = 1"
    ).bind(validatedData.template_id).first();

    if (dbTemplate) {
      defaultSegments = JSON.parse(dbTemplate.wheel_segments as string);
      defaultColors = JSON.parse(dbTemplate.wheel_colors as string);
      defaultLeadFormFields = JSON.parse(dbTemplate.lead_form_fields as string);
    } else {
      // Fallback to hardcoded templates if not found in database
      const template = campaignTemplates.find(t => t.id === validatedData.template_id);
      if (template) {
        defaultSegments = template.wheelSegments;
        defaultColors = template.wheelColors;
        defaultLeadFormFields = template.leadFormFields;
      }
    }
  }

  // If still no template data, use default
  if (defaultSegments.length === 0) {
    const defaultTemplate = await c.env.DB.prepare(
      "SELECT * FROM campaign_templates WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1"
    ).first();

    if (defaultTemplate) {
      defaultSegments = JSON.parse(defaultTemplate.wheel_segments as string);
      defaultColors = JSON.parse(defaultTemplate.wheel_colors as string);
      defaultLeadFormFields = JSON.parse(defaultTemplate.lead_form_fields as string);
    } else {
      // Ultimate fallback
      const fallbackTemplate = campaignTemplates.find(t => t.id === "retail-sale");
      if (fallbackTemplate) {
        defaultSegments = fallbackTemplate.wheelSegments;
        defaultColors = fallbackTemplate.wheelColors;
        defaultLeadFormFields = fallbackTemplate.leadFormFields;
      }
    }
  }

  // New campaigns default to SUBSCRIPTION payment type
  const campaignPaymentType = "SUBSCRIPTION";

  await c.env.DB.prepare(
    `INSERT INTO campaigns (
      id, user_id, name, campaign_type, template_id, public_slug,
      is_lead_form_required, lead_form_fields, wheel_segments, wheel_colors,
      status, campaign_payment_type, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).bind(
    campaignId,
    appUser.id,
    validatedData.name,
    campaignType,
    validatedData.template_id || null,
    publicSlug,
    1,
    JSON.stringify(defaultLeadFormFields),
    JSON.stringify(defaultSegments),
    JSON.stringify(defaultColors),
    "active",
    campaignPaymentType
  ).run();

  // Deduct campaign credit for ALL users
  await c.env.DB.prepare(
    "UPDATE users SET campaign_credits = campaign_credits - 1, updated_at = datetime('now') WHERE id = ?"
  ).bind(appUser.id).run();

  const campaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ?"
  ).bind(campaignId).first();

  return c.json({
    ...campaign,
    lead_form_fields: JSON.parse(campaign!.lead_form_fields as string),
    wheel_segments: JSON.parse(campaign!.wheel_segments as string),
    wheel_colors: JSON.parse(campaign!.wheel_colors as string),
    sound_settings: campaign!.sound_settings ? JSON.parse(campaign!.sound_settings as string) : { spin: true, win: true, noWin: true },
    valid_countries: campaign!.valid_countries ? JSON.parse(campaign!.valid_countries as string) : [],
    terms_conditions: campaign!.terms_conditions || null,
    privacy_policy: campaign!.privacy_policy || null,
    is_lead_form_required: campaign!.is_lead_form_required === 1,
    confetti_enabled: campaign!.confetti_enabled === 1,
    sound_enabled: campaign!.sound_enabled === 1,
    spin_button_pulse_enabled: campaign!.spin_button_pulse_enabled === 1,
    border_enabled: campaign!.border_enabled === 1,
    border_default_enabled: campaign!.border_default_enabled === 1,
    border_custom_colors: campaign!.border_custom_colors ? JSON.parse(campaign!.border_custom_colors as string) : [],
    border_connector_ring_enabled: campaign!.border_connector_ring_enabled === 1,
    show_watermark: campaign!.show_watermark === 1,
  });
});

app.get("/api/campaigns/:id", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const campaignId = c.req.param("id");
  const campaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ? AND user_id = ?"
  ).bind(campaignId, appUser.id).first();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  return c.json({
    ...campaign,
    lead_form_fields: JSON.parse(campaign.lead_form_fields as string),
    wheel_segments: JSON.parse(campaign.wheel_segments as string),
    wheel_colors: JSON.parse(campaign.wheel_colors as string),
    sound_settings: campaign.sound_settings ? JSON.parse(campaign.sound_settings as string) : { spin: true, win: true, noWin: true },
    valid_countries: campaign.valid_countries ? JSON.parse(campaign.valid_countries as string) : [],
    terms_conditions: campaign.terms_conditions || null,
    privacy_policy: campaign.privacy_policy || null,
    is_lead_form_required: campaign.is_lead_form_required === 1,
    confetti_enabled: campaign.confetti_enabled === 1,
    sound_enabled: campaign.sound_enabled === 1,
    spin_button_pulse_enabled: campaign.spin_button_pulse_enabled === 1,
    border_enabled: campaign.border_enabled === 1,
    border_default_enabled: campaign.border_default_enabled === 1,
    border_custom_colors: campaign.border_custom_colors ? JSON.parse(campaign.border_custom_colors as string) : [],
    border_connector_ring_enabled: campaign.border_connector_ring_enabled === 1,
    show_watermark: campaign.show_watermark === 1,
  });
});

app.patch("/api/campaigns/:id", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const campaignId = c.req.param("id");
  const campaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ? AND user_id = ?"
  ).bind(campaignId, appUser.id).first();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  const body = await c.req.json();
  const validatedData = UpdateCampaignRequestSchema.parse(body);

  const updates: string[] = [];
  const values: any[] = [];

  if (validatedData.name !== undefined) {
    updates.push("name = ?");
    values.push(validatedData.name);
  }
  if (validatedData.logo_url !== undefined) {
    updates.push("logo_url = ?");
    values.push(validatedData.logo_url);
  }
  if (validatedData.cover_image_url !== undefined) {
    updates.push("cover_image_url = ?");
    values.push(validatedData.cover_image_url);
  }
  if (validatedData.is_lead_form_required !== undefined) {
    updates.push("is_lead_form_required = ?");
    values.push(validatedData.is_lead_form_required ? 1 : 0);
  }
  if (validatedData.lead_form_fields !== undefined) {
    updates.push("lead_form_fields = ?");
    values.push(JSON.stringify(validatedData.lead_form_fields));
  }
  if (validatedData.wheel_segments !== undefined) {
    updates.push("wheel_segments = ?");
    values.push(JSON.stringify(validatedData.wheel_segments));
  }
  if (validatedData.wheel_colors !== undefined) {
    updates.push("wheel_colors = ?");
    values.push(JSON.stringify(validatedData.wheel_colors));
  }
  if (validatedData.status !== undefined) {
    // Get current campaign state based on dates
    const dateState = getCampaignDateState(campaign);
    
    // Validate status transition
    const requestedStatus = validatedData.status;
    
    // If campaign has ended, force status to ended
    if (dateState.enforcedStatus === "ended" && requestedStatus !== "ended") {
      return c.json({ 
        error: "Cannot change status - campaign has ended",
        reason: dateState.reason
      }, 400);
    }
    
    // Validate specific transitions
    if (requestedStatus === "active" && !dateState.canActivate) {
      return c.json({ 
        error: "Cannot activate this campaign",
        reason: dateState.reason
      }, 400);
    }
    
    if (requestedStatus === "paused" && !dateState.canPause) {
      return c.json({ 
        error: "Cannot pause this campaign",
        reason: "Campaign is scheduled for the future"
      }, 400);
    }
    
    if (requestedStatus === "ended" && !dateState.canEnd) {
      return c.json({ 
        error: "Cannot end this campaign",
        reason: "Campaign has not started yet"
      }, 400);
    }
    
    updates.push("status = ?");
    values.push(validatedData.status);
  }
  if (validatedData.pointer_color !== undefined) {
    updates.push("pointer_color = ?");
    values.push(validatedData.pointer_color);
  }
  if (validatedData.background_color !== undefined) {
    updates.push("background_color = ?");
    values.push(validatedData.background_color);
  }
  if (validatedData.background_gradient_enabled !== undefined) {
    updates.push("background_gradient_enabled = ?");
    values.push(validatedData.background_gradient_enabled ? 1 : 0);
  }
  if (validatedData.background_gradient_start !== undefined) {
    updates.push("background_gradient_start = ?");
    values.push(validatedData.background_gradient_start);
  }
  if (validatedData.background_gradient_end !== undefined) {
    updates.push("background_gradient_end = ?");
    values.push(validatedData.background_gradient_end);
  }
  if (validatedData.background_gradient_direction !== undefined) {
    updates.push("background_gradient_direction = ?");
    values.push(validatedData.background_gradient_direction);
  }
  if (validatedData.background_image_url !== undefined) {
    updates.push("background_image_url = ?");
    values.push(validatedData.background_image_url);
  }
  if (validatedData.logo_position !== undefined) {
    updates.push("logo_position = ?");
    values.push(validatedData.logo_position);
  }
  if (validatedData.confetti_enabled !== undefined) {
    updates.push("confetti_enabled = ?");
    values.push(validatedData.confetti_enabled ? 1 : 0);
  }
  if (validatedData.sound_enabled !== undefined) {
    updates.push("sound_enabled = ?");
    values.push(validatedData.sound_enabled ? 1 : 0);
  }
  if (validatedData.font_family !== undefined) {
    updates.push("font_family = ?");
    values.push(validatedData.font_family);
  }
  if (validatedData.font_size !== undefined) {
    updates.push("font_size = ?");
    values.push(validatedData.font_size);
  }
  if (validatedData.wheel_border_thickness !== undefined) {
    updates.push("wheel_border_thickness = ?");
    values.push(validatedData.wheel_border_thickness);
  }
  if (validatedData.wheel_border_color !== undefined) {
    updates.push("wheel_border_color = ?");
    values.push(validatedData.wheel_border_color);
  }
  if (validatedData.pointer_style !== undefined) {
    updates.push("pointer_style = ?");
    values.push(validatedData.pointer_style);
  }
  if (validatedData.spin_button_text !== undefined) {
    updates.push("spin_button_text = ?");
    values.push(validatedData.spin_button_text);
  }
  if (validatedData.spin_button_color !== undefined) {
    updates.push("spin_button_color = ?");
    values.push(validatedData.spin_button_color);
  }
  if (validatedData.spin_button_border_radius !== undefined) {
    updates.push("spin_button_border_radius = ?");
    values.push(validatedData.spin_button_border_radius);
  }
  if (validatedData.spin_button_pulse_enabled !== undefined) {
    updates.push("spin_button_pulse_enabled = ?");
    values.push(validatedData.spin_button_pulse_enabled ? 1 : 0);
  }
  if (validatedData.spin_limit_per_email !== undefined) {
    updates.push("spin_limit_per_email = ?");
    values.push(validatedData.spin_limit_per_email);
  }
  if (validatedData.spin_limit_per_phone !== undefined) {
    updates.push("spin_limit_per_phone = ?");
    values.push(validatedData.spin_limit_per_phone);
  }
  if (validatedData.spin_limit_per_ip !== undefined) {
    updates.push("spin_limit_per_ip = ?");
    values.push(validatedData.spin_limit_per_ip);
  }
  if (validatedData.spin_limit_per_device !== undefined) {
    updates.push("spin_limit_per_device = ?");
    values.push(validatedData.spin_limit_per_device);
  }
  if (validatedData.spin_limit_per_day !== undefined) {
    updates.push("spin_limit_per_day = ?");
    values.push(validatedData.spin_limit_per_day);
  }
  if (validatedData.spin_limit_per_week !== undefined) {
    updates.push("spin_limit_per_week = ?");
    values.push(validatedData.spin_limit_per_week);
  }
  if (validatedData.spin_limit_total !== undefined) {
    updates.push("spin_limit_total = ?");
    values.push(validatedData.spin_limit_total);
  }
  if (validatedData.spin_cooldown_hours !== undefined) {
    updates.push("spin_cooldown_hours = ?");
    values.push(validatedData.spin_cooldown_hours);
  }
  if (validatedData.spin_duration_seconds !== undefined) {
    updates.push("spin_duration_seconds = ?");
    values.push(validatedData.spin_duration_seconds);
  }
  if (validatedData.redemption_instructions !== undefined) {
    updates.push("redemption_instructions = ?");
    values.push(validatedData.redemption_instructions);
  }
  if (validatedData.start_datetime !== undefined) {
    updates.push("start_datetime = ?");
    values.push(validatedData.start_datetime);
  }
  if (validatedData.end_datetime !== undefined) {
    updates.push("end_datetime = ?");
    values.push(validatedData.end_datetime);
  }
  if (validatedData.timezone !== undefined) {
    updates.push("timezone = ?");
    values.push(validatedData.timezone);
  }
  if (validatedData.valid_countries !== undefined) {
    updates.push("valid_countries = ?");
    values.push(JSON.stringify(validatedData.valid_countries));
  }
  if (validatedData.terms_conditions !== undefined) {
    updates.push("terms_conditions = ?");
    values.push(validatedData.terms_conditions);
  }
  if (validatedData.privacy_policy !== undefined) {
    updates.push("privacy_policy = ?");
    values.push(validatedData.privacy_policy);
  }
  if (validatedData.sound_settings !== undefined) {
    updates.push("sound_settings = ?");
    values.push(JSON.stringify(validatedData.sound_settings));
  }
  if (validatedData.border_enabled !== undefined) {
    updates.push("border_enabled = ?");
    values.push(validatedData.border_enabled ? 1 : 0);
  }
  if (validatedData.border_theme !== undefined) {
    updates.push("border_theme = ?");
    values.push(validatedData.border_theme);
  }
  if (validatedData.border_default_enabled !== undefined) {
    updates.push("border_default_enabled = ?");
    values.push(validatedData.border_default_enabled ? 1 : 0);
  }
  if (validatedData.border_default_color !== undefined) {
    updates.push("border_default_color = ?");
    values.push(validatedData.border_default_color);
  }
  if (validatedData.border_default_thickness !== undefined) {
    updates.push("border_default_thickness = ?");
    values.push(validatedData.border_default_thickness);
  }
  if (validatedData.border_custom_colors !== undefined) {
    updates.push("border_custom_colors = ?");
    values.push(JSON.stringify(validatedData.border_custom_colors));
  }
  if (validatedData.border_bulb_shape !== undefined) {
    updates.push("border_bulb_shape = ?");
    values.push(validatedData.border_bulb_shape);
  }
  if (validatedData.border_bulb_count !== undefined) {
    updates.push("border_bulb_count = ?");
    values.push(validatedData.border_bulb_count);
  }
  if (validatedData.border_bulb_size !== undefined) {
    updates.push("border_bulb_size = ?");
    values.push(validatedData.border_bulb_size);
  }
  if (validatedData.border_blink_speed !== undefined) {
    updates.push("border_blink_speed = ?");
    values.push(validatedData.border_blink_speed);
  }
  if (validatedData.border_connector_ring_enabled !== undefined) {
    updates.push("border_connector_ring_enabled = ?");
    values.push(validatedData.border_connector_ring_enabled ? 1 : 0);
  }
  if (validatedData.border_connector_ring_color !== undefined) {
    updates.push("border_connector_ring_color = ?");
    values.push(validatedData.border_connector_ring_color);
  }
  if (validatedData.border_connector_ring_thickness !== undefined) {
    updates.push("border_connector_ring_thickness = ?");
    values.push(validatedData.border_connector_ring_thickness);
  }
  if (validatedData.show_watermark !== undefined) {
    // Validate watermark entitlement
    if (validatedData.show_watermark === false) {
      const hasEntitlement = await userHasWatermarkRemoval(appUser.id as string, c.env.DB);
      if (!hasEntitlement) {
        return c.json({ 
          error: "Upgrade your plan to remove the PromoGauge watermark",
          watermark_entitlement_required: true 
        }, 403);
      }
    }
    updates.push("show_watermark = ?");
    values.push(validatedData.show_watermark ? 1 : 0);
  }
  if (validatedData.scratch_card_shape !== undefined) {
    updates.push("scratch_card_shape = ?");
    values.push(validatedData.scratch_card_shape);
  }
  if (validatedData.scratch_mask_style !== undefined) {
    updates.push("scratch_mask_style = ?");
    values.push(validatedData.scratch_mask_style);
  }
  if (validatedData.scratch_instructions_title !== undefined) {
    updates.push("scratch_instructions_title = ?");
    values.push(validatedData.scratch_instructions_title);
  }
  if (validatedData.scratch_instructions_subtitle !== undefined) {
    updates.push("scratch_instructions_subtitle = ?");
    values.push(validatedData.scratch_instructions_subtitle);
  }
  if (validatedData.campaign_payment_type !== undefined) {
    updates.push("campaign_payment_type = ?");
    values.push(validatedData.campaign_payment_type);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(campaignId);

    await c.env.DB.prepare(
      `UPDATE campaigns SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...values).run();
  }

  const updatedCampaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ?"
  ).bind(campaignId).first();

  return c.json({
    ...updatedCampaign,
    lead_form_fields: JSON.parse(updatedCampaign!.lead_form_fields as string),
    wheel_segments: JSON.parse(updatedCampaign!.wheel_segments as string),
    wheel_colors: JSON.parse(updatedCampaign!.wheel_colors as string),
    sound_settings: updatedCampaign!.sound_settings ? JSON.parse(updatedCampaign!.sound_settings as string) : { spin: true, win: true, noWin: true },
    valid_countries: updatedCampaign!.valid_countries ? JSON.parse(updatedCampaign!.valid_countries as string) : [],
    terms_conditions: updatedCampaign!.terms_conditions || null,
    privacy_policy: updatedCampaign!.privacy_policy || null,
    is_lead_form_required: updatedCampaign!.is_lead_form_required === 1,
    confetti_enabled: updatedCampaign!.confetti_enabled === 1,
    sound_enabled: updatedCampaign!.sound_enabled === 1,
    spin_button_pulse_enabled: updatedCampaign!.spin_button_pulse_enabled === 1,
    border_enabled: updatedCampaign!.border_enabled === 1,
    border_default_enabled: updatedCampaign!.border_default_enabled === 1,
    border_custom_colors: updatedCampaign!.border_custom_colors ? JSON.parse(updatedCampaign!.border_custom_colors as string) : [],
    border_connector_ring_enabled: updatedCampaign!.border_connector_ring_enabled === 1,
    show_watermark: updatedCampaign!.show_watermark === 1,
    is_published: updatedCampaign!.is_published === 1,
  });
});

app.delete("/api/campaigns/:id", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const campaignId = c.req.param("id");
  const campaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ? AND user_id = ?"
  ).bind(campaignId, appUser.id).first();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  await c.env.DB.prepare(
    "DELETE FROM campaigns WHERE id = ?"
  ).bind(campaignId).run();

  return c.json({ success: true });
});

// Publish campaign
app.post("/api/campaigns/:id/publish", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const campaignId = c.req.param("id");
  const campaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ? AND user_id = ?"
  ).bind(campaignId, appUser.id).first();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  // Validate campaign has required fields before publishing
  if (!campaign.name || campaign.name === '') {
    return c.json({ error: "Campaign name is required" }, 400);
  }

  const wheelSegments = JSON.parse(campaign.wheel_segments as string);
  if (!wheelSegments || wheelSegments.length === 0) {
    return c.json({ error: "At least one prize is required" }, 400);
  }

  if (!campaign.start_datetime || !campaign.end_datetime) {
    return c.json({ error: "Start and end dates are required" }, 400);
  }

  if (!campaign.timezone) {
    return c.json({ error: "Timezone is required" }, 400);
  }

  // Update is_published to true
  await c.env.DB.prepare(
    "UPDATE campaigns SET is_published = 1, updated_at = datetime('now') WHERE id = ?"
  ).bind(campaignId).run();

  // Recalculate status based on dates
  let newStatus = campaign.status as string;
  
  const now = new Date();
  const startDate = new Date(campaign.start_datetime as string);
  const endDate = new Date(campaign.end_datetime as string);
  
  if (now > endDate) {
    newStatus = "ended";
  } else if (now >= startDate && now <= endDate) {
    newStatus = "active";
  } else if (now < startDate) {
    newStatus = "active"; // Scheduled (will show as draft until start date)
  }

  await c.env.DB.prepare(
    "UPDATE campaigns SET status = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(newStatus, campaignId).run();

  const updatedCampaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ?"
  ).bind(campaignId).first();

  return c.json({
    success: true,
    campaign: {
      ...updatedCampaign,
      is_published: updatedCampaign!.is_published === 1,
    },
  });
});

// Unpublish campaign
app.post("/api/campaigns/:id/unpublish", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const campaignId = c.req.param("id");
  const campaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ? AND user_id = ?"
  ).bind(campaignId, appUser.id).first();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  // Update is_published to false and status to draft
  await c.env.DB.prepare(
    "UPDATE campaigns SET is_published = 0, status = 'draft', updated_at = datetime('now') WHERE id = ?"
  ).bind(campaignId).run();

  const updatedCampaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ?"
  ).bind(campaignId).first();

  return c.json({
    success: true,
    campaign: {
      ...updatedCampaign,
      is_published: updatedCampaign!.is_published === 1,
    },
  });
});

// Campaign analytics
app.get("/api/campaigns/:id/analytics", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const campaignId = c.req.param("id");
  const campaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ? AND user_id = ?"
  ).bind(campaignId, appUser.id).first();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  const range = c.req.query("range") || "7d";
  
  // Calculate date range
  let dateFilter = "";
  if (range === "7d") {
    dateFilter = "AND created_at >= datetime('now', '-7 days')";
  } else if (range === "30d") {
    dateFilter = "AND created_at >= datetime('now', '-30 days')";
  }

  // Get time series data for spins from campaign_analytics
  const spinsTimeSeriesQuery = `
    SELECT 
      date(created_at) as date,
      COUNT(*) as spins
    FROM campaign_analytics
    WHERE campaign_id = ? ${dateFilter} AND event_type = 'spin'
    GROUP BY date(created_at)
    ORDER BY date(created_at) ASC
  `;

  const { results: spinsData } = await c.env.DB.prepare(spinsTimeSeriesQuery)
    .bind(campaignId)
    .all();

  // Get time series data for leads from leads table (more accurate)
  const leadsTimeSeriesQuery = `
    SELECT 
      date(created_at) as date,
      COUNT(*) as leads
    FROM leads
    WHERE campaign_id = ? ${dateFilter}
    GROUP BY date(created_at)
    ORDER BY date(created_at) ASC
  `;

  const { results: leadsData } = await c.env.DB.prepare(leadsTimeSeriesQuery)
    .bind(campaignId)
    .all();

  // Merge spins and leads data by date
  const dateMap = new Map<string, { date: string; spins: number; leads: number }>();
  
  // Add spins data
  for (const row of spinsData) {
    const dateStr = (row as any).date;
    dateMap.set(dateStr, { date: dateStr, spins: (row as any).spins || 0, leads: 0 });
  }
  
  // Add leads data
  for (const row of leadsData) {
    const dateStr = (row as any).date;
    const existing = dateMap.get(dateStr);
    if (existing) {
      existing.leads = (row as any).leads || 0;
    } else {
      dateMap.set(dateStr, { date: dateStr, spins: 0, leads: (row as any).leads || 0 });
    }
  }
  
  // Convert to array and sort by date
  const timeSeriesData = Array.from(dateMap.values()).sort((a, b) => 
    a.date.localeCompare(b.date)
  );

  // Get prize distribution
  const prizeQuery = `
    SELECT 
      json_extract(event_data, '$.prize') as prize,
      COUNT(*) as count
    FROM campaign_analytics
    WHERE campaign_id = ? AND event_type = 'spin' ${dateFilter}
      AND json_extract(event_data, '$.prize') IS NOT NULL
    GROUP BY prize
  `;

  const { results: prizeData } = await c.env.DB.prepare(prizeQuery)
    .bind(campaignId)
    .all();

  // Parse wheel segments to get colors
  const wheelSegments = JSON.parse(campaign.wheel_segments as string);
  const prizeDistribution = prizeData.map((item: any) => {
    const segment = wheelSegments.find((s: any) => s.label === item.prize);
    return {
      prize: item.prize,
      count: item.count,
      color: segment?.color || "#6366f1",
    };
  });

  // Calculate total stats - Use actual database counts for accuracy
  // Get total spins from campaign record (most accurate)
  const totalSpins = Number(campaign.spins_count) || 0;
  
  // Get total leads from actual leads table (most accurate) - ALWAYS get all leads for the card
  const totalLeadsResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM leads WHERE campaign_id = ?`
  ).bind(campaignId).first();
  
  const totalLeads = (totalLeadsResult as any)?.count || 0;

  const conversionRate = totalSpins > 0 
    ? (totalLeads / totalSpins) * 100 
    : 0;

  const daysCount = range === "7d" ? 7 : range === "30d" ? 30 : 
    Math.max(1, Math.ceil((Date.now() - new Date(campaign.created_at as string).getTime()) / (1000 * 60 * 60 * 24)));

  const avgSpinsPerDay = totalSpins / daysCount;

  return c.json({
    timeSeriesData,
    prizeDistribution,
    totalStats: {
      total_spins: totalSpins,
      total_leads: totalLeads,
      conversion_rate: conversionRate,
      avg_spins_per_day: avgSpinsPerDay,
    },
  });
});

// Get leads for a campaign
app.get("/api/campaigns/:id/leads", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const campaignId = c.req.param("id");
  const campaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ? AND user_id = ?"
  ).bind(campaignId, appUser.id).first();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  const { results: leads } = await c.env.DB.prepare(
    "SELECT * FROM leads WHERE campaign_id = ? ORDER BY created_at DESC"
  ).bind(campaignId).all();

  return c.json({
    leads: leads.map(lead => ({
      ...lead,
      is_redeemed: lead.is_redeemed === 1,
    })),
  });
});

// Mark lead as redeemed
app.patch("/api/campaigns/:campaignId/leads/:leadId/redeem", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const campaignId = c.req.param("campaignId");
  const leadId = c.req.param("leadId");

  // Verify campaign ownership
  const campaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ? AND user_id = ?"
  ).bind(campaignId, appUser.id).first();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  // Verify lead belongs to campaign
  const lead = await c.env.DB.prepare(
    "SELECT * FROM leads WHERE id = ? AND campaign_id = ?"
  ).bind(leadId, campaignId).first();

  if (!lead) {
    return c.json({ error: "Lead not found" }, 404);
  }

  const body = await c.req.json();
  const isRedeemed = body.is_redeemed ? 1 : 0;
  const redeemedAt = body.is_redeemed ? "datetime('now')" : "NULL";

  await c.env.DB.prepare(
    `UPDATE leads SET 
      is_redeemed = ?, 
      redeemed_at = ${redeemedAt}, 
      updated_at = datetime('now') 
    WHERE id = ?`
  ).bind(isRedeemed, leadId).run();

  const updatedLead = await c.env.DB.prepare(
    "SELECT * FROM leads WHERE id = ?"
  ).bind(leadId).first();

  // If lead was marked as redeemed, send notification email to campaign owner
  if (body.is_redeemed && updatedLead) {
    // Get campaign owner's mocha_user_id
    const campaignOwner = await c.env.DB.prepare(
      "SELECT u.mocha_user_id, u.full_name FROM users u JOIN campaigns c ON u.id = c.user_id WHERE c.id = ?"
    ).bind(campaign.id).first();

    if (campaignOwner) {
      // Fetch owner's email from Mocha service
      const mochaUserRes = await fetch(`${c.env.MOCHA_USERS_SERVICE_API_URL}/users/${campaignOwner.mocha_user_id}`, {
        headers: {
          'Authorization': `Bearer ${c.env.MOCHA_USERS_SERVICE_API_KEY}`,
        },
      });

      if (mochaUserRes.ok) {
        const mochaUser = await mochaUserRes.json() as { email: string };
        
        // Send redemption notification email (async, don't wait)
        sendEmail(
          mochaUser.email,
          'reward_redemption_owner',
          {
            owner_name: campaignOwner.full_name as string || 'Business Owner',
            campaign_name: campaign.name as string,
            participant_name: updatedLead.name as string || 'Customer',
            prize_name: updatedLead.prize_won as string || 'Prize',
            reference_number: updatedLead.reference_number as string || 'N/A',
            redemption_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            campaign_link: `${c.req.header("origin") || 'https://promoguage.mocha.app'}/campaigns/${campaign.id}/analytics`,
          },
          c.env
        ).then(sent => {
          if (sent) {
            console.log(`[Redeem Lead] Redemption notification sent to ${mochaUser.email}`);
          }
        }).catch(err => console.error('[Redeem Lead] Redemption email error:', err));
      }
    }
  }

  return c.json({
    ...updatedLead,
    is_redeemed: updatedLead!.is_redeemed === 1,
  });
});

// New Billing routes - Active gateways and transactions
app.get("/api/billing/active-gateways", async (c) => {
  try {
    const { results: gateways } = await c.env.DB.prepare(
      "SELECT gateway_name, is_active, display_name FROM payment_gateway_settings WHERE is_active = 1"
    ).all();

    return c.json({ gateways });
  } catch (error) {
    console.error("Failed to fetch active gateways:", error);
    return c.json({ gateways: [] });
  }
});

app.get("/api/billing/transactions", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  try {
    const { results: transactions } = await c.env.DB.prepare(
      "SELECT * FROM billing_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
    ).bind(appUser.id).all();

    return c.json({ transactions });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return c.json({ transactions: [] });
  }
});

app.post("/api/billing/initiate-payment", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const body = await c.req.json();
  const { gateway, amount, currency, description, planType, purchaseType, billingCycle, credits, leads } = body;

  try {
    // Get gateway settings
    const gatewaySettings = await c.env.DB.prepare(
      "SELECT * FROM payment_gateway_settings WHERE gateway_name = ? AND is_active = 1"
    ).bind(gateway).first();

    if (!gatewaySettings) {
      return c.json({ error: "Payment gateway not configured" }, 400);
    }

    let redirectUrl = "";
    let transactionRef = "";

    if (gateway === "paystack") {
      // Initialize Paystack payment
      const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${gatewaySettings.api_secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: mochaUser.email,
          amount: Math.round(amount * 100), // Paystack uses kobo/cents
          currency: currency,
          callback_url: `${c.req.header("origin")}/billing/success`,
          metadata: {
            user_id: appUser.id,
            plan_type: planType,
            purchase_type: purchaseType,
            billing_cycle: billingCycle,
            credits: credits,
            leads: leads,
          },
        }),
      });

      const paystackData = await paystackRes.json() as any;
      
      if (paystackData.status && paystackData.data) {
        redirectUrl = paystackData.data.authorization_url;
        transactionRef = paystackData.data.reference;
      } else {
        return c.json({ error: "Failed to initialize Paystack payment" }, 500);
      }
    } else if (gateway === "stripe") {
      // Use Stripe integration
      const stripe = getStripe(c.env);
      
      let customerId = appUser.stripe_customer_id as string | null;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: mochaUser.email,
          metadata: {
            mocha_user_id: mochaUser.id,
            app_user_id: appUser.id as string,
          },
        });
        customerId = customer.id;

        await c.env.DB.prepare(
          "UPDATE users SET stripe_customer_id = ?, updated_at = datetime('now') WHERE id = ?"
        ).bind(customerId, appUser.id).run();
      }

      // Determine if this is a subscription or one-time payment
      const isSubscription = purchaseType === 'subscription';
      
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: isSubscription ? "subscription" : "payment",
        payment_method_types: ["card"],
        line_items: isSubscription ? [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: description,
              },
              unit_amount: Math.round(amount * 100),
              recurring: {
                interval: billingCycle === 'weekly' ? 'week' : 'month',
              },
            },
            quantity: 1,
          },
        ] : [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: description,
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${c.req.header("origin")}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${c.req.header("origin")}/billing/cancel`,
        metadata: {
          app_user_id: appUser.id as string,
          plan_type: planType,
          purchase_type: purchaseType,
          billing_cycle: billingCycle || "",
          credits: credits?.toString() || "",
          leads: leads?.toString() || "",
        },
      });

      redirectUrl = session.url || "";
      transactionRef = session.id;
    } else if (gateway === "paypal") {
      // Initialize PayPal payment
      console.log(`[PayPal] Payment request - purchaseType: "${purchaseType}", planType: "${planType}", credits: ${credits}, leads: ${leads}`);
      
      // PayPal only supports specific currencies. Convert KES and other unsupported currencies to USD
      const paypalSupportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
      let paypalCurrency = currency;
      let paypalAmount = amount;
      
      if (!paypalSupportedCurrencies.includes(currency)) {
        // Convert to USD - approximate conversion for KES (130 KES ≈ 1 USD)
        if (currency === 'KES') {
          paypalAmount = amount / 130;
          paypalCurrency = 'USD';
          console.log(`[PayPal] Converting ${currency} ${amount} to USD ${paypalAmount.toFixed(2)}`);
        } else {
          // For other unsupported currencies, default to USD with 1:1 conversion
          paypalCurrency = 'USD';
          console.log(`[PayPal] Currency ${currency} not supported, using USD`);
        }
      }
      
      // Determine PayPal API base URL (sandbox vs live)
      const paypalApiBase = gatewaySettings.is_sandbox 
        ? "https://api-m.sandbox.paypal.com"
        : "https://api-m.paypal.com";

      // Get access token first
      const authResponse = await fetch(`${paypalApiBase}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${gatewaySettings.api_key}:${gatewaySettings.api_secret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      if (!authResponse.ok) {
        console.error("PayPal auth failed:", await authResponse.text());
        return c.json({ error: "Failed to authenticate with PayPal" }, 500);
      }

      const authData = await authResponse.json() as any;
      const accessToken = authData.access_token;

      // Determine if this is a subscription or one-time payment
      // For Pay-Per-Campaign (credits) and Pay-Per-Lead (leads), use one-time payment
      const isSubscription = purchaseType === 'subscription';
      
      console.log(`[PayPal] isSubscription: ${isSubscription}, will use ${isSubscription ? 'Billing API' : 'Orders API'}`);

      if (isSubscription) {
        // Create PayPal subscription
        // First create a plan if it doesn't exist
        const planCreateResponse = await fetch(`${paypalApiBase}/v1/billing/plans`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_id: "PROMOGUAGE_SUBSCRIPTION", // Should be created once in PayPal
            name: description,
            description: `${description} - ${billingCycle === 'weekly' ? 'Weekly' : 'Monthly'} subscription`,
            billing_cycles: [
              {
                frequency: {
                  interval_unit: billingCycle === 'weekly' ? 'WEEK' : 'MONTH',
                  interval_count: 1,
                },
                tenure_type: "REGULAR",
                sequence: 1,
                total_cycles: 0, // Infinite
                pricing_scheme: {
                  fixed_price: {
                    value: paypalAmount.toFixed(2),
                    currency_code: paypalCurrency,
                  },
                },
              },
            ],
            payment_preferences: {
              auto_bill_outstanding: true,
              setup_fee_failure_action: "CONTINUE",
              payment_failure_threshold: 3,
            },
          }),
        });

        let planId: string;
        if (planCreateResponse.ok) {
          const planData = await planCreateResponse.json() as any;
          planId = planData.id;
        } else {
          // Plan creation failed - return detailed error
          const planError = await planCreateResponse.text();
          console.error(`[PayPal] Plan creation failed:`, planError);
          
          // Try to parse error for better message
          let errorMessage = "PayPal subscription setup failed. ";
          try {
            const errorJson = JSON.parse(planError);
            if (errorJson.message) {
              errorMessage += errorJson.message;
            }
            // Check if it's a product_id issue
            if (errorJson.details?.some((d: any) => d.field?.includes('product_id'))) {
              errorMessage = "PayPal product not configured. Please contact support to set up PayPal subscriptions.";
            }
          } catch (e) {
            errorMessage += "Please contact support.";
          }
          
          return c.json({ error: errorMessage }, 500);
        }

        // Create subscription
        const subscriptionResponse = await fetch(`${paypalApiBase}/v1/billing/subscriptions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan_id: planId,
            subscriber: {
              email_address: mochaUser.email,
            },
            application_context: {
              brand_name: "PromoGuage",
              return_url: `${c.req.header("origin")}/billing/success`,
              cancel_url: `${c.req.header("origin")}/billing/cancel`,
              user_action: "SUBSCRIBE_NOW",
            },
            payment_method: {
              payee_preferred: "UNRESTRICTED"
            },
            custom_id: JSON.stringify({
              user_id: appUser.id,
              plan_type: planType,
              purchase_type: purchaseType,
              billing_cycle: billingCycle,
            }),
          }),
        });

        if (!subscriptionResponse.ok) {
          const errorData = await subscriptionResponse.text();
          console.error("PayPal subscription creation failed:", errorData);
          return c.json({ error: "Failed to create PayPal subscription" }, 500);
        }

        const subscriptionData = await subscriptionResponse.json() as any;
        redirectUrl = subscriptionData.links.find((link: any) => link.rel === "approve")?.href || "";
        transactionRef = subscriptionData.id;
      } else {
        // Create one-time PayPal order with card payment support
        console.log(`[PayPal] Creating order - amount: ${paypalAmount.toFixed(2)} ${paypalCurrency}, description: "${description}"`);
        
        const orderPayload = {
          intent: "CAPTURE",
          payment_source: {
            paypal: {
              experience_context: {
                payment_method_preference: "UNRESTRICTED",
                brand_name: "PromoGuage",
                locale: "en-US",
                landing_page: "LOGIN",
                shipping_preference: "NO_SHIPPING",
                user_action: "PAY_NOW",
                return_url: `${c.req.header("origin")}/billing/success`,
                cancel_url: `${c.req.header("origin")}/billing/cancel`,
              }
            }
          },
          purchase_units: [
            {
              description: description,
              amount: {
                currency_code: paypalCurrency,
                value: paypalAmount.toFixed(2),
              },
              custom_id: JSON.stringify({
                user_id: appUser.id,
                plan_type: planType,
                purchase_type: purchaseType,
                credits: credits,
                leads: leads,
              }),
            },
          ],
        };
        
        console.log(`[PayPal] Order payload:`, JSON.stringify(orderPayload, null, 2));
        
        const orderResponse = await fetch(`${paypalApiBase}/v2/checkout/orders`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify(orderPayload),
        });

        if (!orderResponse.ok) {
          const errorData = await orderResponse.text();
          console.error(`[PayPal] Order creation failed with status ${orderResponse.status}:`, errorData);
          return c.json({ error: "Failed to create PayPal order" }, 500);
        }

        const orderData = await orderResponse.json() as any;
        console.log(`[PayPal] Order created successfully, ID: ${orderData.id}`);
        // Look for either "approve" or "payer-action" link
        const approvalLink = orderData.links.find((link: any) => link.rel === "approve" || link.rel === "payer-action");
        redirectUrl = approvalLink?.href || "";
        transactionRef = orderData.id;
        console.log(`[PayPal] Redirect URL found: ${redirectUrl}`);
      }
    }

    // Create transaction record
    const transactionId = nanoid();
    await c.env.DB.prepare(
      `INSERT INTO billing_transactions (
        id, user_id, gateway_name, transaction_reference, transaction_type,
        amount, currency, status, plan_type, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      transactionId,
      appUser.id,
      gateway,
      transactionRef,
      purchaseType || 'subscription',
      amount,
      currency,
      'pending',
      planType,
      JSON.stringify({ billingCycle, credits, leads, description })
    ).run();

    return c.json({ redirectUrl, transactionRef });
  } catch (error) {
    console.error("Payment initiation error:", error);
    return c.json({ error: "Failed to initiate payment" }, 500);
  }
});

// PayPal webhook handler
app.post("/api/webhooks/paypal", async (c) => {
  console.log("PayPal webhook received");
  
  try {
    const body = await c.req.text();
    const event = JSON.parse(body);
    
    console.log("PayPal webhook event type:", event.event_type);

    // Get PayPal settings
    const paypalSettings = await c.env.DB.prepare(
      "SELECT * FROM payment_gateway_settings WHERE gateway_name = 'paypal' AND is_active = 1"
    ).first();

    if (!paypalSettings) {
      console.error("PayPal not configured");
      return c.json({ error: "PayPal not configured" }, 400);
    }

    // Verify webhook with PayPal (webhook_id is optional but recommended)
    if (paypalSettings.webhook_secret) {
      const paypalApiBase = paypalSettings.is_sandbox 
        ? "https://api-m.sandbox.paypal.com"
        : "https://api-m.paypal.com";

      // Get access token
      const authResponse = await fetch(`${paypalApiBase}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${paypalSettings.api_key}:${paypalSettings.api_secret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      if (authResponse.ok) {
        const authData = await authResponse.json() as any;
        
        // Verify webhook signature
        const verifyResponse = await fetch(`${paypalApiBase}/v1/notifications/verify-webhook-signature`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${authData.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transmission_id: c.req.header("paypal-transmission-id"),
            transmission_time: c.req.header("paypal-transmission-time"),
            cert_url: c.req.header("paypal-cert-url"),
            auth_algo: c.req.header("paypal-auth-algo"),
            transmission_sig: c.req.header("paypal-transmission-sig"),
            webhook_id: paypalSettings.webhook_secret,
            webhook_event: event,
          }),
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json() as any;
          if (verifyData.verification_status !== "SUCCESS") {
            console.error("PayPal webhook verification failed");
            return c.json({ error: "Invalid webhook signature" }, 400);
          }
        }
      }
    }

    // Handle different event types
    if (event.event_type === "PAYMENT.SALE.COMPLETED" || event.event_type === "CHECKOUT.ORDER.APPROVED") {
      // One-time payment completed
      const resource = event.resource;
      const customId = resource.custom_id || resource.purchase_units?.[0]?.custom_id;
      
      if (customId) {
        const metadata = JSON.parse(customId);
        const userId = metadata.user_id;
        const purchaseType = metadata.purchase_type;
        const credits = metadata.credits;
        const leads = metadata.leads;
        const planType = metadata.plan_type;

        if (userId) {
          if (purchaseType === 'campaign' && credits) {
            // Get plan details to check for lead credits
            const transactionCurrency = resource.amount?.currency_code || resource.purchase_units?.[0]?.amount?.currency_code;
            
            const planRes = await c.env.DB.prepare(
              "SELECT lead_limit FROM billing_plans WHERE campaign_limit = ? AND currency = ? AND plan_type = 'campaign'"
            ).bind(parseInt(credits), transactionCurrency).first();

            const leadCredits = planRes?.lead_limit ? Number(planRes.lead_limit) : 0;

            await c.env.DB.prepare(
              "UPDATE users SET campaign_credits = campaign_credits + ?, lead_credits = lead_credits + ?, updated_at = datetime('now') WHERE id = ?"
            ).bind(parseInt(credits), leadCredits, userId).run();
            
            console.log(`[PayPal Webhook] Granted ${credits} campaign credits and ${leadCredits} lead credits to user ${userId}`);
          } else if (purchaseType === 'leads' && leads) {
            await c.env.DB.prepare(
              "UPDATE users SET lead_credits = lead_credits + ?, updated_at = datetime('now') WHERE id = ?"
            ).bind(parseInt(leads), userId).run();
            
            console.log(`[PayPal Webhook] Granted ${leads} lead credits to user ${userId}`);
          }

          // Create transaction record
          const transactionId = nanoid();
          const transactionCurrency = resource.amount?.currency_code || resource.purchase_units?.[0]?.amount?.currency_code;
          
          await c.env.DB.prepare(
            `INSERT INTO billing_transactions (
              id, user_id, gateway_name, transaction_reference, transaction_type,
              amount, currency, status, plan_type, metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
          ).bind(
            transactionId,
            userId,
            'paypal',
            resource.id,
            purchaseType || 'payment',
            parseFloat(resource.amount?.value || resource.purchase_units?.[0]?.amount?.value),
            transactionCurrency,
            'completed',
            planType || null,
            JSON.stringify({ credits, leads })
          ).run();
        }
      }
    } else if (event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
      // Subscription activated
      const subscription = event.resource;
      const customId = subscription.custom_id;
      
      if (customId) {
        const metadata = JSON.parse(customId);
        const userId = metadata.user_id;
        const planType = metadata.plan_type;
        const billingCycle = metadata.billing_cycle || 'monthly';

        if (userId) {
          // Calculate expiry date
          const expiryDate = new Date();
          if (billingCycle === 'weekly') {
            expiryDate.setDate(expiryDate.getDate() + 7);
          } else {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
          }

          // Get plan amount from billing plan
          const amount = parseFloat(subscription.billing_info?.last_payment?.amount?.value || "0");
          const currency = subscription.billing_info?.last_payment?.amount?.currency_code || 'USD';
          
          console.log(`[PayPal Webhook] Looking for plan with: amount=${amount}, currency=${currency}, billing_interval=${billingCycle}`);
          
          const planRes = await c.env.DB.prepare(
            "SELECT lead_limit, campaign_limit, name FROM billing_plans WHERE amount = ? AND currency = ? AND billing_interval = ? AND plan_type = 'subscription' LIMIT 1"
          ).bind(amount, currency, billingCycle).first();

          const leadCredits = planRes?.lead_limit ? Number(planRes.lead_limit) : 0;
          const campaignCredits = planRes?.campaign_limit ? Number(planRes.campaign_limit) : 0;
          
          console.log(`[PayPal Webhook] Granting credits - lead_credits: ${leadCredits}, campaign_credits: ${campaignCredits}`);

          await c.env.DB.prepare(
            `UPDATE users SET 
              plan_type = ?,
              subscription_status = ?,
              billing_cycle = ?,
              plan_expires_at = ?,
              lead_credits = lead_credits + ?,
              campaign_credits = campaign_credits + ?,
              updated_at = datetime('now')
            WHERE id = ?`
          ).bind(
            planType,
            'active',
            billingCycle,
            expiryDate.toISOString(),
            leadCredits,
            campaignCredits,
            userId
          ).run();
          
          console.log(`[PayPal Webhook] User subscription activated for user ${userId}`);

          // Get user data for email
          const userForEmail = await c.env.DB.prepare(
            "SELECT full_name, mocha_user_id FROM users WHERE id = ?"
          ).bind(userId).first();

          if (userForEmail) {

            // **** CUSTOM: one.salooniya@gmail.com

            // FIX: Use waitUntil to ensure background email sending completes
          c.executionCtx.waitUntil((async () => {
            try {
              const mochaUserRes = await fetch(`${c.env.MOCHA_USERS_SERVICE_API_URL}/users/${(userForEmail as any).mocha_user_id}`, {
                headers: {
                  'Authorization': `Bearer ${c.env.MOCHA_USERS_SERVICE_API_KEY}`,
                },
              });

              if (mochaUserRes.ok) {
                const mochaUser = await mochaUserRes.json() as { email: string };
                
                const nextBillingDate = new Date(expiryDate);
                const planNames: Record<string, string> = {
                  'starter': 'Starter Plan',
                  'business': 'Business Plan',
                  'pro': 'Pro Plan',
                };
                
                await sendEmail(
                  mochaUser.email,
                  'subscription_receipt_owner',
                  {
                    user_name: (userForEmail as any).full_name || 'Valued Customer',
                    plan_name: planNames[planType] || 'Subscription Plan',
                    amount: amount.toFixed(2),
                    currency: currency,
                    billing_cycle: billingCycle === 'weekly' ? 'Weekly' : 'Monthly',
                    next_billing_date: nextBillingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                    transaction_id: subscription.id,
                    dashboard_link: 'https://promoguage.mocha.app/dashboard',
                  },
                  c.env
                );
                console.log(`[PayPal Webhook] Receipt email sent to ${mochaUser.email}`);
              }
            } catch (err) {
              console.error('[PayPal Webhook] Failed to send receipt email:', err);
            }
          })());
            
            // **** CUSTOM: one.salooniya@gmail.com
            
            // // Fetch user email from Mocha service
            // const mochaUserRes = await fetch(`${c.env.MOCHA_USERS_SERVICE_API_URL}/users/${userForEmail.mocha_user_id}`, {
            //   headers: {
            //     'Authorization': `Bearer ${c.env.MOCHA_USERS_SERVICE_API_KEY}`,
            //   },
            // });

            // if (mochaUserRes.ok) {
            //   const mochaUser = await mochaUserRes.json() as { email: string };
              
            //   // Send subscription receipt email (async, don't wait)
            //   const nextBillingDate = new Date(expiryDate);
            //   const planNames: Record<string, string> = {
            //     'starter': 'Starter Plan',
            //     'business': 'Business Plan',
            //     'pro': 'Pro Plan',
            //   };
              
            //   c.executionCtx.waitUntil(
            //     sendEmail(
            //       mochaUser.email,
            //       'subscription_receipt_owner',
            //       {
            //         user_name: userForEmail.full_name as string || 'Valued Customer',
            //         plan_name: planNames[planType] || 'Subscription Plan',
            //         amount: amount.toFixed(2),
            //         currency: currency,
            //         billing_cycle: billingCycle === 'weekly' ? 'Weekly' : 'Monthly',
            //         next_billing_date: nextBillingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            //         transaction_id: subscription.id,
            //         dashboard_link: 'https://promoguage.mocha.app/dashboard',
            //       },
            //       c.env
            //     ).then(sent => {
            //       if (sent) {
            //         console.log(`[PayPal Webhook] Receipt email sent to ${mochaUser.email}`);
            //       } else {
            //         console.error(`[PayPal Webhook] Failed to send receipt email to ${mochaUser.email}`);
            //       }
            //     }).catch(err => console.error('[PayPal Webhook] Receipt email error:', err))
            //   );
            // }
          }
        }
      }
    } else if (event.event_type === "BILLING.SUBSCRIPTION.CANCELLED" || event.event_type === "BILLING.SUBSCRIPTION.SUSPENDED") {
      // Subscription cancelled or suspended
      const subscription = event.resource;
      const customId = subscription.custom_id;
      
      if (customId) {
        const metadata = JSON.parse(customId);
        const userId = metadata.user_id;

        if (userId) {
          await c.env.DB.prepare(
            `UPDATE users SET 
              subscription_status = ?,
              updated_at = datetime('now')
            WHERE id = ?`
          ).bind(
            event.event_type === "BILLING.SUBSCRIPTION.CANCELLED" ? 'canceled' : 'suspended',
            userId
          ).run();
          
          console.log(`[PayPal Webhook] Subscription ${event.event_type} for user ${userId}`);
        }
      }
    }

    console.log("PayPal webhook processed successfully");
    return c.json({ received: true });
  } catch (error) {
    console.error("PayPal webhook error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

// Paystack webhook handler
app.post("/api/webhooks/paystack", async (c) => {
  console.log("Paystack webhook received");
  
  try {
    const body = await c.req.text();
    const signature = c.req.header("x-paystack-signature");
    
    console.log("Webhook signature present:", !!signature);
    console.log("Webhook body length:", body.length);

    // Get Paystack settings to verify webhook
    const paystackSettings = await c.env.DB.prepare(
      "SELECT * FROM payment_gateway_settings WHERE gateway_name = 'paystack' AND is_active = 1"
    ).first();

    if (!paystackSettings) {
      console.error("Paystack not configured");
      return c.json({ error: "Paystack not configured" }, 400);
    }

    console.log("Paystack settings found, webhook_secret present:", !!paystackSettings.webhook_secret);

    // Verify webhook signature using Web Crypto API (Cloudflare Workers compatible)
    if (signature && paystackSettings.webhook_secret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(paystackSettings.webhook_secret as string),
        { name: 'HMAC', hash: 'SHA-512' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(body)
      );
      
      const hashArray = Array.from(new Uint8Array(signatureBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      console.log("Computed signature matches:", hashHex === signature);
      
      if (hashHex !== signature) {
        console.error("Invalid webhook signature");
        return c.json({ error: "Invalid signature" }, 400);
      }
    } else {
      console.warn("Webhook signature verification skipped - signature or secret missing");
    }

    const event = JSON.parse(body);
    console.log("Webhook event type:", event.event);

    if (event.event === "charge.success") {
      const { reference } = event.data;
      console.log("Processing charge.success for reference:", reference);
      
      // Update transaction status
      const updateResult = await c.env.DB.prepare(
        "UPDATE billing_transactions SET status = ?, updated_at = datetime('now') WHERE transaction_reference = ?"
      ).bind("completed", reference).run();
      
      console.log("Transaction update result:", updateResult.meta.changes, "rows updated");

      // Get transaction details
      const transaction = await c.env.DB.prepare(
        "SELECT * FROM billing_transactions WHERE transaction_reference = ?"
      ).bind(reference).first();
      
      console.log("Transaction found:", !!transaction);

      if (transaction && transaction.user_id) {
        const userId = transaction.user_id as string;
        const transactionMeta = transaction.metadata ? JSON.parse(transaction.metadata as string) : {};
        
        console.log("Processing transaction type:", transaction.transaction_type);
        console.log("User ID:", userId);

        // Process based on purchase type
        if (transaction.transaction_type === 'subscription') {
          // Calculate expiry date
          const billingCycle = transactionMeta.billingCycle || 'monthly';
          const expiryDate = new Date();
          if (billingCycle === 'weekly') {
            expiryDate.setDate(expiryDate.getDate() + 7);
          } else {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
          }

          // Match plan by amount, currency, and billing_interval
          const transactionAmount = Number(transaction.amount);
          const transactionCurrency = transaction.currency as string;
          
          console.log(`[Paystack Webhook] Looking for plan: amount=${transactionAmount}, currency=${transactionCurrency}, cycle=${billingCycle}`);
          
          const planRes = await c.env.DB.prepare(
            "SELECT lead_limit, campaign_limit, remove_watermark, name, amount, billing_interval FROM billing_plans WHERE amount = ? AND currency = ? AND billing_interval = ? AND plan_type = 'subscription' LIMIT 1"
          ).bind(transactionAmount, transactionCurrency, billingCycle).first();

          const leadCredits = planRes?.lead_limit ? Number(planRes.lead_limit) : 0;
          const campaignCredits = planRes?.campaign_limit ? Number(planRes.campaign_limit) : 0;
          
          console.log(`[Paystack Webhook] Granting credits: Leads=${leadCredits}, Campaigns=${campaignCredits}`);

          await c.env.DB.prepare(
            `UPDATE users SET 
              plan_type = ?,
              subscription_status = ?,
              billing_cycle = ?,
              plan_expires_at = ?,
              lead_credits = lead_credits + ?,
              campaign_credits = campaign_credits + ?,
              updated_at = datetime('now')
            WHERE id = ?`
          ).bind(
            transaction.plan_type,
            'active',
            billingCycle,
            expiryDate.toISOString(),
            leadCredits,
            campaignCredits,
            userId
          ).run();
          
          // --- EMAIL FIX START ---
          // Fetch the updated user details so we have the name
          const finalUser = await c.env.DB.prepare(
            "SELECT full_name, mocha_user_id FROM users WHERE id = ?"
          ).bind(userId).first();

          if (finalUser) {
            // CRITICAL FIX: Wrap the email logic in waitUntil so the worker doesn't die
            c.executionCtx.waitUntil((async () => {
              try {
                // 1. Get user email from Mocha Service
                const mochaUserRes = await fetch(`${c.env.MOCHA_USERS_SERVICE_API_URL}/users/${(finalUser as any).mocha_user_id}`, {
                  headers: {
                    'Authorization': `Bearer ${c.env.MOCHA_USERS_SERVICE_API_KEY}`,
                  },
                });

                if (mochaUserRes.ok) {
                  const mochaUser = await mochaUserRes.json() as { email: string };
                  
                  // 2. Prepare email data
                  const nextBillingDate = new Date(expiryDate);
                  const planNames: Record<string, string> = {
                    'starter': 'Starter Plan',
                    'business': 'Business Plan',
                    'pro': 'Pro Plan',
                  };
                  
                  // 3. Send the email using the robust sendEmail function
                  const emailSent = await sendEmail(
                    mochaUser.email,
                    'subscription_receipt_owner',
                    {
                      user_name: (finalUser as any).full_name || 'Valued Customer',
                      plan_name: planNames[transaction.plan_type as string] || 'Subscription Plan',
                      amount: transactionAmount.toFixed(2),
                      currency: transactionCurrency,
                      billing_cycle: billingCycle === 'weekly' ? 'Weekly' : 'Monthly',
                      next_billing_date: nextBillingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                      transaction_id: reference,
                      dashboard_link: 'https://promoguage.mocha.app/dashboard',
                    },
                    c.env
                  );

                  if (emailSent) {
                    console.log(`[Paystack Webhook] SUCCESS: Receipt email sent to ${mochaUser.email}`);
                  } else {
                    console.error(`[Paystack Webhook] FAILED: sendEmail returned false`);
                  }
                }
              } catch (err) {
                console.error('[Paystack Webhook] EXCEPTION in background email task:', err);
              }
            })());
          // // Calculate expiry date
          // const billingCycle = transactionMeta.billingCycle || 'monthly';
          // const expiryDate = new Date();
          // if (billingCycle === 'weekly') {
          //   expiryDate.setDate(expiryDate.getDate() + 7);
          // } else {
          //   expiryDate.setMonth(expiryDate.getMonth() + 1);
          // }

          // // Match plan by amount, currency, and billing_interval
          // const transactionAmount = Number(transaction.amount);
          // const transactionCurrency = transaction.currency as string;
          
          // console.log(`[Paystack Webhook] Looking for plan with: amount=${transactionAmount}, currency=${transactionCurrency}, billing_interval=${billingCycle}`);
          
          // const planRes = await c.env.DB.prepare(
          //   "SELECT lead_limit, campaign_limit, remove_watermark, name, amount, billing_interval FROM billing_plans WHERE amount = ? AND currency = ? AND billing_interval = ? AND plan_type = 'subscription' LIMIT 1"
          // ).bind(transactionAmount, transactionCurrency, billingCycle).first();

          // if (planRes) {
          //   console.log(`[Paystack Webhook] Found plan: "${planRes.name}", lead_limit: ${planRes.lead_limit}, campaign_limit: ${planRes.campaign_limit}`);
          // } else {
          //   console.error(`[Paystack Webhook] No plan found for amount=${transactionAmount}, currency=${transactionCurrency}, billing_interval=${billingCycle}`);
          // }

          // const leadCredits = planRes?.lead_limit ? Number(planRes.lead_limit) : 0;
          // const campaignCredits = planRes?.campaign_limit ? Number(planRes.campaign_limit) : 0;
          
          // console.log(`[Paystack Webhook] Granting credits - lead_credits: ${leadCredits}, campaign_credits: ${campaignCredits}`);

          // const userUpdateResult = await c.env.DB.prepare(
          //   `UPDATE users SET 
          //     plan_type = ?,
          //     subscription_status = ?,
          //     billing_cycle = ?,
          //     plan_expires_at = ?,
          //     lead_credits = lead_credits + ?,
          //     campaign_credits = campaign_credits + ?,
          //     updated_at = datetime('now')
          //   WHERE id = ?`
          // ).bind(
          //   transaction.plan_type,
          //   'active',
          //   billingCycle,
          //   expiryDate.toISOString(),
          //   leadCredits,
          //   campaignCredits,
          //   userId
          // ).run();
          
          // console.log(`[Paystack Webhook] User subscription updated: ${userUpdateResult.meta.changes} rows affected`);
          // console.log(`[Paystack Webhook] Credits granted - Lead: +${leadCredits}, Campaign: +${campaignCredits}`);
          
          // // Verify credits were added
          // const updatedUser = await c.env.DB.prepare(
          //   "SELECT campaign_credits, lead_credits, plan_type, subscription_status, full_name, mocha_user_id FROM users WHERE id = ?"
          // ).bind(userId).first();
          // console.log(`[Paystack Webhook] User after update:`, updatedUser);

          // // Get user data for email
          // if (updatedUser) {

          //   // *** CUSTOM

          //   // FIX: Use waitUntil to ensure background email sending completes
          //   c.executionCtx.waitUntil((async () => {
          //     try {
          //       const mochaUserRes = await c.env.DB.prepare(
          //         "SELECT mocha_user_id FROM users WHERE id = ?"
          //       ).bind(userId).first();

          //       if (mochaUserRes) {
          //         const mochaUserFetch = await fetch(`${c.env.MOCHA_USERS_SERVICE_API_URL}/users/${(mochaUserRes as any).mocha_user_id}`, {
          //           headers: {
          //             'Authorization': `Bearer ${c.env.MOCHA_USERS_SERVICE_API_KEY}`,
          //           },
          //         });

          //         if (mochaUserFetch.ok) {
          //           const mochaUser = await mochaUserFetch.json() as { email: string };
                    
          //           const nextBillingDate = new Date(expiryDate);
          //           const planNames: Record<string, string> = {
          //             'starter': 'Starter Plan',
          //             'business': 'Business Plan',
          //             'pro': 'Pro Plan',
          //           };
                    
          //           await sendEmail(
          //             mochaUser.email,
          //             'subscription_receipt_owner',
          //             {
          //               user_name: (updatedUser as any).full_name || 'Valued Customer',
          //               plan_name: planNames[transaction.plan_type as string] || 'Subscription Plan',
          //               amount: transactionAmount.toFixed(2),
          //               currency: transactionCurrency,
          //               billing_cycle: billingCycle === 'weekly' ? 'Weekly' : 'Monthly',
          //               next_billing_date: nextBillingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          //               transaction_id: reference,
          //               dashboard_link: 'https://promoguage.mocha.app/dashboard',
          //             },
          //             c.env
          //           );
          //           console.log(`[Paystack Webhook] Receipt email sent to ${mochaUser.email}`);
          //         }
          //       }
          //     } catch (err) {
          //       console.error('[Paystack Webhook] Failed to send receipt email:', err);
          //     }
          //   })());
            
            // *** CUSTOM
            
            // // Fetch user email from Mocha service
            // const mochaUserRes = await c.env.DB.prepare(
            //   "SELECT mocha_user_id FROM users WHERE id = ?"
            // ).bind(userId).first();

            // if (mochaUserRes) {
            //   const mochaUserFetch = await fetch(`${c.env.MOCHA_USERS_SERVICE_API_URL}/users/${(mochaUserRes as any).mocha_user_id}`, {
            //     headers: {
            //       'Authorization': `Bearer ${c.env.MOCHA_USERS_SERVICE_API_KEY}`,
            //     },
            //   });

            //   if (mochaUserFetch.ok) {
            //     const mochaUser = await mochaUserFetch.json() as { email: string };
                
            //     // Send subscription receipt email (async, don't wait)
            //     const nextBillingDate = new Date(expiryDate);
            //     const planNames: Record<string, string> = {
            //       'starter': 'Starter Plan',
            //       'business': 'Business Plan',
            //       'pro': 'Pro Plan',
            //     };
                
            //     c.executionCtx.waitUntil(
            //       sendEmail(
            //         mochaUser.email,
            //         'subscription_receipt_owner',
            //         {
            //           user_name: (updatedUser as any).full_name || 'Valued Customer',
            //           plan_name: planNames[transaction.plan_type as string] || 'Subscription Plan',
            //           amount: transactionAmount.toFixed(2),
            //           currency: transactionCurrency,
            //           billing_cycle: billingCycle === 'weekly' ? 'Weekly' : 'Monthly',
            //           next_billing_date: nextBillingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            //           transaction_id: reference,
            //           dashboard_link: 'https://promoguage.mocha.app/dashboard',
            //         },
            //         c.env
            //       ).then(sent => {
            //         if (sent) {
            //           console.log(`[Paystack Webhook] Receipt email sent to ${mochaUser.email}`);
            //         } else {
            //           console.error(`[Paystack Webhook] Failed to send receipt email to ${mochaUser.email}`);
            //         }
            //       }).catch(err => console.error('[Paystack Webhook] Receipt email error:', err))
            //     );
            //   }
            // }
          }
        } else if (transaction.transaction_type === 'campaign') {
          // Add campaign credits and lead credits
          const credits = transactionMeta.credits || 1;
          
          // Get the plan details to check for lead credits
          const planRes = await c.env.DB.prepare(
            "SELECT lead_limit FROM billing_plans WHERE campaign_limit = ? AND currency = ? AND plan_type = 'campaign'"
          ).bind(credits, transaction.currency).first();

          const leadCredits = planRes?.lead_limit ? Number(planRes.lead_limit) : 0;

          const creditUpdateResult = await c.env.DB.prepare(
            "UPDATE users SET campaign_credits = campaign_credits + ?, lead_credits = lead_credits + ?, updated_at = datetime('now') WHERE id = ?"
          ).bind(credits, leadCredits, userId).run();
          
          console.log("Campaign credits added:", credits, "rows affected:", creditUpdateResult.meta.changes);
          console.log("Lead credits added:", leadCredits);
        } else if (transaction.transaction_type === 'leads') {
          // Add lead credits
          const leads = transactionMeta.leads || 100;
          const leadUpdateResult = await c.env.DB.prepare(
            "UPDATE users SET lead_credits = lead_credits + ?, updated_at = datetime('now') WHERE id = ?"
          ).bind(leads, userId).run();
          
          console.log("Lead credits added:", leads, "rows affected:", leadUpdateResult.meta.changes);
        }
      } else {
        console.warn("Transaction not found or missing user_id");
      }
    } else {
      console.log("Webhook event type not handled:", event.event);
    }

    console.log("Paystack webhook processed successfully");
    return c.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

// Billing routes
app.post("/api/billing/create-checkout-session", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const body = await c.req.json();
  const { planType, amount, currency } = body;

  const stripe = getStripe(c.env);

  try {
    // Get or create Stripe customer
    let customerId = appUser.stripe_customer_id as string | null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: mochaUser.email,
        metadata: {
          mocha_user_id: mochaUser.id,
          app_user_id: appUser.id as string,
        },
      });
      customerId = customer.id;

      await c.env.DB.prepare(
        "UPDATE users SET stripe_customer_id = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(customerId, appUser.id).run();
    }

    // Get plan name for display
    // Get plan details from database to include all entitlements
    const dbPlan = await c.env.DB.prepare(
      "SELECT * FROM billing_plans WHERE plan_type = 'subscription' AND amount = ? AND currency = ? LIMIT 1"
    ).bind(amount, currency).first();

    const planNames: Record<string, string> = {
      'starter': 'Starter Plan',
      'business': 'Business Plan',
      'pro': 'Pro Plan',
    };
    const planName = planNames[planType] || 'Subscription Plan';

    // Create checkout session with dynamic pricing
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: planName,
              description: `${planName} - Monthly subscription`,
            },
            unit_amount: Math.round(amount * 100),
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${c.req.header("origin")}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${c.req.header("origin")}/billing/cancel`,
      metadata: {
        app_user_id: appUser.id as string,
        plan_type: planType,
        billing_cycle: 'monthly',
        remove_watermark: dbPlan?.remove_watermark ? 'true' : 'false',
      },
    });

    return c.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return c.json({ error: "Failed to create checkout session" }, 500);
  }
});

app.post("/api/billing/create-portal-session", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser || !appUser.stripe_customer_id) {
    return c.json({ error: "No subscription found" }, 404);
  }

  const stripe = getStripe(c.env);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: appUser.stripe_customer_id as string,
      return_url: `${c.req.header("origin")}/profile`,
    });

    return c.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal error:", error);
    return c.json({ error: "Failed to create portal session" }, 500);
  }
});

app.post("/api/webhooks/stripe", async (c) => {
  console.log("[Stripe Webhook] Received webhook request");
  const stripe = getStripe(c.env);
  const signature = c.req.header("stripe-signature");

  if (!signature) {
    console.error("[Stripe Webhook] No signature header found");
    return c.json({ error: "No signature" }, 400);
  }

  let event: Stripe.Event;

  try {
    const body = await c.req.text();
    console.log("[Stripe Webhook] Attempting to verify signature for event");
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET
    );
    console.log(`[Stripe Webhook] Signature verified successfully. Event type: ${event.type}, Event ID: ${event.id}`);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    console.error("[Stripe Webhook] Error details:", err instanceof Error ? err.message : String(err));
    return c.json({ error: "Invalid signature" }, 400);
  }

  try {
    console.log(`[Stripe Webhook] Processing event: ${event.type}`);
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const appUserId = session.metadata?.app_user_id;
        const planType = session.metadata?.plan_type;
        const purchaseType = session.metadata?.purchase_type;
        const billingCycle = session.metadata?.billing_cycle;
        const credits = session.metadata?.credits;
        const leads = session.metadata?.leads;

        if (appUserId) {
          // Handle subscription payments
          if (purchaseType === 'subscription' && session.subscription) {
            // Calculate expiry date
            const expiryDate = new Date();
            if (billingCycle === 'weekly') {
              expiryDate.setDate(expiryDate.getDate() + 7);
            } else {
              expiryDate.setMonth(expiryDate.getMonth() + 1);
            }

            // Match plan by amount, currency, and billing_interval
            // Stripe amounts are in cents, so convert to dollars
            const sessionAmount = (session.amount_total || 0) / 100;
            const sessionCurrency = (session.currency || 'usd').toUpperCase();
            const sessionBillingCycle = billingCycle || 'monthly';
            
            const planNames: Record<string, string> = {
              'starter': 'Starter Plan',
              'business': 'Business Plan',
              'pro': 'Pro Plan',
            };
            
            console.log(`[Stripe Webhook] Looking for plan with: amount=${sessionAmount}, currency=${sessionCurrency}, billing_interval=${sessionBillingCycle}`);
            
            const planRes = await c.env.DB.prepare(
              "SELECT lead_limit, campaign_limit, name, amount, billing_interval FROM billing_plans WHERE amount = ? AND currency = ? AND billing_interval = ? AND plan_type = 'subscription' LIMIT 1"
            ).bind(sessionAmount, sessionCurrency, sessionBillingCycle).first();

            if (planRes) {
              console.log(`[Stripe Webhook] Found plan: "${planRes.name}", lead_limit: ${planRes.lead_limit}, campaign_limit: ${planRes.campaign_limit}`);
            } else {
              console.error(`[Stripe Webhook] No plan found for amount=${sessionAmount}, currency=${sessionCurrency}, billing_interval=${sessionBillingCycle}`);
            }

            const leadCredits = planRes?.lead_limit ? Number(planRes.lead_limit) : 0;
            const campaignCredits = planRes?.campaign_limit ? Number(planRes.campaign_limit) : 0;
            
            console.log(`[Stripe Webhook] Granting credits - lead_credits: ${leadCredits}, campaign_credits: ${campaignCredits}`);

            await c.env.DB.prepare(
              `UPDATE users SET 
                stripe_subscription_id = ?,
                plan_type = ?,
                subscription_status = ?,
                billing_cycle = ?,
                plan_expires_at = ?,
                lead_credits = lead_credits + ?,
                campaign_credits = campaign_credits + ?,
                updated_at = datetime('now')
              WHERE id = ?`
            ).bind(
              session.subscription,
              planType,
              "active",
              billingCycle || 'monthly',
              expiryDate.toISOString(),
              leadCredits,
              campaignCredits,
              appUserId
            ).run();

            // Get user data for email
            const userForEmail = await c.env.DB.prepare(
              "SELECT full_name, mocha_user_id FROM users WHERE id = ?"
            ).bind(appUserId).first();

            if (userForEmail) {

              // *** CUSTOM

              // FIX: Use waitUntil to ensure background email sending completes
              c.executionCtx.waitUntil((async () => {
                try {
                  const mochaUserRes = await fetch(`${c.env.MOCHA_USERS_SERVICE_API_URL}/users/${(userForEmail as any).mocha_user_id}`, {
                    headers: {
                      'Authorization': `Bearer ${c.env.MOCHA_USERS_SERVICE_API_KEY}`,
                    },
                  });
  
                  if (mochaUserRes.ok) {
                    const mochaUser = await mochaUserRes.json() as { email: string };
                    
                    const nextBillingDate = new Date(expiryDate);
                    const planNameForEmail = planType ? (planNames[planType] || 'Subscription Plan') : 'Subscription Plan';
                    
                    await sendEmail(
                      mochaUser.email,
                      'subscription_receipt_owner',
                      {
                        user_name: (userForEmail as any).full_name || 'Valued Customer',
                        plan_name: planNameForEmail,
                        amount: sessionAmount.toFixed(2),
                        currency: sessionCurrency,
                        billing_cycle: (billingCycle || 'monthly') === 'weekly' ? 'Weekly' : 'Monthly',
                        next_billing_date: nextBillingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                        transaction_id: session.id,
                        dashboard_link: 'https://promoguage.mocha.app/dashboard',
                      },
                      c.env
                    );
                    console.log(`[Stripe Webhook] Receipt email sent to ${mochaUser.email}`);
                  }
                } catch (err) {
                  console.error('[Stripe Webhook] Failed to send receipt email:', err);
                }
              })());
              
              // *** CUSTOM
              
              // // Fetch user email from Mocha service
              // const mochaUserRes = await fetch(`${c.env.MOCHA_USERS_SERVICE_API_URL}/users/${userForEmail.mocha_user_id}`, {
              //   headers: {
              //     'Authorization': `Bearer ${c.env.MOCHA_USERS_SERVICE_API_KEY}`,
              //   },
              // });

              // if (mochaUserRes.ok) {
              //   const mochaUser = await mochaUserRes.json() as { email: string };
                
              //   // Send subscription receipt email (async, don't wait)
              //   const nextBillingDate = new Date(expiryDate);
              //   const planNameForEmail = planType ? (planNames[planType] || 'Subscription Plan') : 'Subscription Plan';
              //   c.executionCtx.waitUntil(
              //     sendEmail(
              //       mochaUser.email,
              //       'subscription_receipt_owner',
              //       {
              //         user_name: userForEmail.full_name as string || 'Valued Customer',
              //         plan_name: planNameForEmail,
              //         amount: sessionAmount.toFixed(2),
              //         currency: sessionCurrency,
              //         billing_cycle: billingCycle === 'weekly' ? 'Weekly' : 'Monthly',
              //         next_billing_date: nextBillingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              //         transaction_id: session.id,
              //         dashboard_link: 'https://promoguage.mocha.app/dashboard',
              //       },
              //       c.env
              //     ).then(sent => {
              //       if (sent) {
              //         console.log(`[Stripe Webhook] Receipt email sent to ${mochaUser.email}`);
              //       } else {
              //         console.error(`[Stripe Webhook] Failed to send receipt email to ${mochaUser.email}`);
              //       }
              //     }).catch(err => console.error('[Stripe Webhook] Receipt email error:', err))
              //   );
              // }
            }
          }
          // Handle one-time payments (campaign credits or lead credits)
          else if (purchaseType === 'campaign' && credits) {
            // Get the plan details to check for lead credits
            const planRes = await c.env.DB.prepare(
              "SELECT lead_limit FROM billing_plans WHERE campaign_limit = ? AND currency = ? AND plan_type = 'campaign'"
            ).bind(parseInt(credits), (session.currency || 'usd').toUpperCase()).first();

            const leadCredits = planRes?.lead_limit ? Number(planRes.lead_limit) : 0;

            await c.env.DB.prepare(
              "UPDATE users SET campaign_credits = campaign_credits + ?, lead_credits = lead_credits + ?, updated_at = datetime('now') WHERE id = ?"
            ).bind(parseInt(credits), leadCredits, appUserId).run();
          }
          else if (purchaseType === 'leads' && leads) {
            await c.env.DB.prepare(
              "UPDATE users SET lead_credits = lead_credits + ?, updated_at = datetime('now') WHERE id = ?"
            ).bind(parseInt(leads), appUserId).run();
          }

          // Update existing transaction record or create new one
          const existingTransaction = await c.env.DB.prepare(
            "SELECT id FROM billing_transactions WHERE transaction_reference = ? AND gateway_name = 'stripe'"
          ).bind(session.id).first();

          if (existingTransaction) {
            console.log(`[Stripe Webhook] Updating existing transaction ${existingTransaction.id}`);
            await c.env.DB.prepare(
              `UPDATE billing_transactions SET 
                status = 'completed',
                updated_at = datetime('now')
              WHERE id = ?`
            ).bind(existingTransaction.id).run();
          } else {
            console.log(`[Stripe Webhook] Creating new transaction record for session ${session.id}`);
            const transactionId = nanoid();
            await c.env.DB.prepare(
              `INSERT INTO billing_transactions (
                id, user_id, gateway_name, transaction_reference, transaction_type,
                amount, currency, status, plan_type, metadata, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
            ).bind(
              transactionId,
              appUserId,
              'stripe',
              session.id,
              purchaseType || 'subscription',
              (session.amount_total || 0) / 100,
              (session.currency || 'usd').toUpperCase(),
              'completed',
              planType || null,
              JSON.stringify({ billingCycle, credits, leads })
            ).run();
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        
        await c.env.DB.prepare(
          `UPDATE users SET 
            subscription_status = ?,
            updated_at = datetime('now')
          WHERE stripe_subscription_id = ?`
        ).bind(
          subscription.status,
          subscription.id
        ).run();
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        await c.env.DB.prepare(
          `UPDATE users SET 
            plan_type = ?,
            subscription_status = ?,
            stripe_subscription_id = NULL,
            updated_at = datetime('now')
          WHERE stripe_subscription_id = ?`
        ).bind(
          "free",
          "canceled",
          subscription.id
        ).run();
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        
        // Extract subscription ID from invoice
        const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription?.id;
        
        if (subscriptionId) {
          await c.env.DB.prepare(
            `UPDATE users SET 
              subscription_status = ?,
              updated_at = datetime('now')
            WHERE stripe_subscription_id = ?`
          ).bind(
            "past_due",
            subscriptionId
          ).run();
        }
        break;
      }
      
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    console.log(`[Stripe Webhook] Successfully processed event: ${event.type}`);
    return c.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error processing webhook:", error);
    console.error("[Stripe Webhook] Error details:", error instanceof Error ? error.message : String(error));
    console.error("[Stripe Webhook] Stack trace:", error instanceof Error ? error.stack : "No stack trace");
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

// Admin middleware
const adminMiddleware = async (c: any, next: any) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  // Handle different data types for is_admin (could be 0/1, true/false, or "0"/"1")
  const isAdmin = appUser && (appUser.is_admin === 1 || appUser.is_admin === true || appUser.is_admin === "1");
  
  if (!isAdmin) {
    return c.json({ error: "Admin access required" }, 403);
  }

  await next();
};

// Admin routes
app.get("/api/admin/stats", authMiddleware, adminMiddleware, async (c) => {
  // Platform-wide statistics
  const totalUsers = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM users"
  ).first();

  const totalCampaigns = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM campaigns"
  ).first();

  const totalSpins = await c.env.DB.prepare(
    "SELECT SUM(spins_count) as total FROM campaigns"
  ).first();

  const totalLeads = await c.env.DB.prepare(
    "SELECT SUM(leads_count) as total FROM campaigns"
  ).first();

  const activeSubscriptions = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM users WHERE plan_type != 'free' AND subscription_status = 'active'"
  ).first();

  const recentUsers = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-7 days')"
  ).first();

  const planDistribution = await c.env.DB.prepare(
    "SELECT plan_type, COUNT(*) as count FROM users GROUP BY plan_type"
  ).all();

  return c.json({
    total_users: (totalUsers as any)?.count || 0,
    total_campaigns: (totalCampaigns as any)?.count || 0,
    total_spins: (totalSpins as any)?.total || 0,
    total_leads: (totalLeads as any)?.total || 0,
    active_subscriptions: (activeSubscriptions as any)?.count || 0,
    recent_users: (recentUsers as any)?.count || 0,
    plan_distribution: (planDistribution as any).results || [],
  });
});

app.get("/api/admin/users", authMiddleware, adminMiddleware, async (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = (page - 1) * limit;

  const { results: users } = await c.env.DB.prepare(
    `SELECT u.*, COUNT(c.id) as campaign_count 
     FROM users u 
     LEFT JOIN campaigns c ON u.id = c.user_id 
     GROUP BY u.id 
     ORDER BY u.created_at DESC 
     LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();

  const totalCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM users"
  ).first();

  return c.json({
    users,
    total: (totalCount as any)?.count || 0,
    page,
    limit,
  });
});

app.get("/api/admin/users/:id", authMiddleware, adminMiddleware, async (c) => {
  const userId = c.req.param("id");
  
  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE id = ?"
  ).bind(userId).first();

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  const { results: campaigns } = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC"
  ).bind(userId).all();

  const campaignStats = await c.env.DB.prepare(
    "SELECT SUM(spins_count) as total_spins, SUM(leads_count) as total_leads FROM campaigns WHERE user_id = ?"
  ).bind(userId).first();

  return c.json({
    user,
    campaigns: campaigns.map(campaign => ({
      ...campaign,
      lead_form_fields: campaign.lead_form_fields ? JSON.parse(campaign.lead_form_fields as string) : [],
      wheel_segments: campaign.wheel_segments ? JSON.parse(campaign.wheel_segments as string) : [],
      wheel_colors: campaign.wheel_colors ? JSON.parse(campaign.wheel_colors as string) : { primary: "#6366f1", secondary: "#8b5cf6" },
      sound_settings: campaign.sound_settings ? JSON.parse(campaign.sound_settings as string) : { spin: true, win: true, noWin: true },
      valid_countries: campaign.valid_countries ? JSON.parse(campaign.valid_countries as string) : [],
      is_lead_form_required: campaign.is_lead_form_required === 1,
      confetti_enabled: campaign.confetti_enabled === 1,
      sound_enabled: campaign.sound_enabled === 1,
      spin_button_pulse_enabled: campaign.spin_button_pulse_enabled === 1,
      border_enabled: campaign.border_enabled === 1,
      border_default_enabled: campaign.border_default_enabled === 1,
      border_custom_colors: campaign.border_custom_colors ? JSON.parse(campaign.border_custom_colors as string) : [],
      border_connector_ring_enabled: campaign.border_connector_ring_enabled === 1,
    })),
    stats: {
      total_spins: (campaignStats as any)?.total_spins || 0,
      total_leads: (campaignStats as any)?.total_leads || 0,
    },
  });
});

app.get("/api/admin/campaigns", authMiddleware, adminMiddleware, async (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = (page - 1) * limit;

  const { results: campaigns } = await c.env.DB.prepare(
    `SELECT c.*, u.business_name, u.plan_type 
     FROM campaigns c 
     JOIN users u ON c.user_id = u.id 
     ORDER BY c.created_at DESC 
     LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();

  const totalCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM campaigns"
  ).first();

  return c.json({
    campaigns: campaigns.map(campaign => ({
      ...campaign,
      lead_form_fields: campaign.lead_form_fields ? JSON.parse(campaign.lead_form_fields as string) : [],
      wheel_segments: campaign.wheel_segments ? JSON.parse(campaign.wheel_segments as string) : [],
      wheel_colors: campaign.wheel_colors ? JSON.parse(campaign.wheel_colors as string) : { primary: "#6366f1", secondary: "#8b5cf6" },
      sound_settings: campaign.sound_settings ? JSON.parse(campaign.sound_settings as string) : { spin: true, win: true, noWin: true },
      valid_countries: campaign.valid_countries ? JSON.parse(campaign.valid_countries as string) : [],
      is_lead_form_required: campaign.is_lead_form_required === 1,
      confetti_enabled: campaign.confetti_enabled === 1,
      sound_enabled: campaign.sound_enabled === 1,
      spin_button_pulse_enabled: campaign.spin_button_pulse_enabled === 1,
      border_enabled: campaign.border_enabled === 1,
      border_default_enabled: campaign.border_default_enabled === 1,
      border_custom_colors: campaign.border_custom_colors ? JSON.parse(campaign.border_custom_colors as string) : [],
      border_connector_ring_enabled: campaign.border_connector_ring_enabled === 1,
    })),
    total: (totalCount as any)?.count || 0,
    page,
    limit,
  });
});

app.patch("/api/admin/users/:id/admin", authMiddleware, adminMiddleware, async (c) => {
  const userId = c.req.param("id");
  const body = await c.req.json();
  
  await c.env.DB.prepare(
    "UPDATE users SET is_admin = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(body.is_admin ? 1 : 0, userId).run();

  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE id = ?"
  ).bind(userId).first();

  return c.json(user);
});

app.delete("/api/admin/users/:id", authMiddleware, adminMiddleware, async (c) => {
  const userId = c.req.param("id");
  
  // Check if user exists
  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE id = ?"
  ).bind(userId).first();

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  // Don't allow deleting yourself
  const mochaUser = c.get("user");
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (appUser && appUser.id === userId) {
    return c.json({ error: "You cannot delete your own account" }, 400);
  }

  try {
    // Get all campaigns for this user
    const { results: campaigns } = await c.env.DB.prepare(
      "SELECT id FROM campaigns WHERE user_id = ?"
    ).bind(userId).all();

    // Delete related data in order
    for (const campaign of campaigns) {
      const campaignId = (campaign as any).id;
      
      // Delete campaign analytics
      await c.env.DB.prepare(
        "DELETE FROM campaign_analytics WHERE campaign_id = ?"
      ).bind(campaignId).run();

      // Delete spin tracking
      await c.env.DB.prepare(
        "DELETE FROM spin_tracking WHERE campaign_id = ?"
      ).bind(campaignId).run();

      // Delete leads
      await c.env.DB.prepare(
        "DELETE FROM leads WHERE campaign_id = ?"
      ).bind(campaignId).run();
    }

    // Delete campaigns
    await c.env.DB.prepare(
      "DELETE FROM campaigns WHERE user_id = ?"
    ).bind(userId).run();

    // Finally, delete the user
    await c.env.DB.prepare(
      "DELETE FROM users WHERE id = ?"
    ).bind(userId).run();

    return c.json({ success: true, message: "User and all related data deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return c.json({ error: "Failed to delete user" }, 500);
  }
});

// Email Integration Settings routes
app.get("/api/admin/email-integration/:provider", authMiddleware, adminMiddleware, async (c) => {
  const provider = c.req.param("provider");
  const isSandbox = c.req.query("sandbox") === "true" ? 1 : 0;

  const settings = await c.env.DB.prepare(
    "SELECT * FROM email_integration_settings WHERE provider = ? AND is_sandbox = ?"
  ).bind(provider, isSandbox).first();

  if (!settings) {
    return c.json({ settings: null });
  }

  return c.json({ 
    settings: {
      ...settings,
      is_sandbox: settings.is_sandbox === 1,
      is_active: settings.is_active === 1,
    }
  });
});

app.put("/api/admin/email-integration/:provider", authMiddleware, adminMiddleware, async (c) => {
  const provider = c.req.param("provider");
  const body = await c.req.json();
  const isSandbox = body.is_sandbox ? 1 : 0;

  // Check if settings exist
  const existing = await c.env.DB.prepare(
    "SELECT * FROM email_integration_settings WHERE provider = ? AND is_sandbox = ?"
  ).bind(provider, isSandbox).first();

  if (existing) {
    // Update existing settings
    const updates: string[] = [];
    const values: any[] = [];

    if (body.api_key !== undefined) {
      updates.push("api_key = ?");
      values.push(body.api_key);
    }
    if (body.api_domain !== undefined) {
      updates.push("api_domain = ?");
      values.push(body.api_domain);
    }
    if (body.sender_email !== undefined) {
      updates.push("sender_email = ?");
      values.push(body.sender_email);
    }
    if (body.sender_name !== undefined) {
      updates.push("sender_name = ?");
      values.push(body.sender_name);
    }
    if (body.is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(body.is_active ? 1 : 0);
    }
    if (body.display_name !== undefined) {
      updates.push("display_name = ?");
      values.push(body.display_name);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(existing.id);

      await c.env.DB.prepare(
        `UPDATE email_integration_settings SET ${updates.join(", ")} WHERE id = ?`
      ).bind(...values).run();
    }
  } else {
    // Create new settings
    const settingsId = nanoid();
    await c.env.DB.prepare(
      `INSERT INTO email_integration_settings (
        id, provider, is_sandbox, api_key, api_domain, sender_email, sender_name,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      settingsId,
      provider,
      isSandbox,
      body.api_key || null,
      body.api_domain || null,
      body.sender_email || null,
      body.sender_name || null,
      body.is_active ? 1 : 0
    ).run();
  }

  // Return updated settings
  const updated = await c.env.DB.prepare(
    "SELECT * FROM email_integration_settings WHERE provider = ? AND is_sandbox = ?"
  ).bind(provider, isSandbox).first();

  return c.json({ 
    settings: updated ? {
      ...updated,
      is_sandbox: updated.is_sandbox === 1,
      is_active: updated.is_active === 1,
    } : null
  });
});

// Email Templates routes
app.get("/api/admin/email-templates", authMiddleware, adminMiddleware, async (c) => {
  try {
    const { results: templates } = await c.env.DB.prepare(
      "SELECT * FROM email_templates ORDER BY created_at ASC"
    ).all();

    return c.json({ 
      templates: templates.map(template => ({
        ...template,
        variables: template.variables ? JSON.parse(template.variables as string) : [],
      }))
    });
  } catch (error) {
    console.error("Failed to fetch email templates:", error);
    return c.json({ error: "Failed to fetch email templates" }, 500);
  }
});

app.get("/api/admin/email-templates/:templateName", authMiddleware, adminMiddleware, async (c) => {
  const templateName = c.req.param("templateName");

  const template = await c.env.DB.prepare(
    "SELECT * FROM email_templates WHERE template_name = ?"
  ).bind(templateName).first();

  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }

  return c.json({ 
    template: {
      ...template,
      variables: template.variables ? JSON.parse(template.variables as string) : [],
    }
  });
});

app.put("/api/admin/email-templates/:templateName", authMiddleware, adminMiddleware, async (c) => {
  const templateName = c.req.param("templateName");
  const body = await c.req.json();

  const template = await c.env.DB.prepare(
    "SELECT * FROM email_templates WHERE template_name = ?"
  ).bind(templateName).first();

  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (body.subject !== undefined) {
    updates.push("subject = ?");
    values.push(body.subject);
  }
  if (body.html_body !== undefined) {
    updates.push("html_body = ?");
    values.push(body.html_body);
  }
  if (body.text_body !== undefined) {
    updates.push("text_body = ?");
    values.push(body.text_body);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(template.id);

    await c.env.DB.prepare(
      `UPDATE email_templates SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...values).run();
  }

  const updated = await c.env.DB.prepare(
    "SELECT * FROM email_templates WHERE template_name = ?"
  ).bind(templateName).first();

  return c.json({ 
    template: updated ? {
      ...updated,
      variables: updated.variables ? JSON.parse(updated.variables as string) : [],
    } : null
  });
});

// Install default email templates
app.post("/api/admin/install-email-templates", authMiddleware, adminMiddleware, async (c) => {
  try {
    console.log("[Email Templates] Starting installation...");
    
    const templates = [
      {
        id: 'renewal_reminder',
        template_name: 'renewal_reminder',
        subject: 'Your {{plan_name}} Plan Expires in {{days_remaining}} Days',
        html_body: `<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #333;">Hi {{user_name}},</h2>
    <p>This is a friendly reminder that your <strong>{{plan_name}}</strong> subscription will expire on <strong>{{expiry_date}}</strong>.</p>
    <p>You have <strong>{{days_remaining}} days</strong> remaining to renew your subscription and continue enjoying all the benefits of PromoGuage.</p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">What happens when your plan expires?</h3>
      <ul style="line-height: 1.6;">
        <li>Your active campaigns will be paused</li>
        <li>You won't be able to create new campaigns</li>
        <li>Lead collection will be disabled</li>
      </ul>
    </div>
    <p style="margin: 30px 0;">
      <a href="{{renewal_link}}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Renew Your Subscription</a>
    </p>
    <p>If you have any questions, feel free to reach out to our support team.</p>
    <p>Best regards,<br>The PromoGuage Team</p>
  </body></html>`,
        text_body: `Hi {{user_name}},\n\nThis is a friendly reminder that your {{plan_name}} subscription will expire on {{expiry_date}}.\n\nYou have {{days_remaining}} days remaining to renew your subscription and continue enjoying all the benefits of PromoGuage.\n\nWhat happens when your plan expires?\n- Your active campaigns will be paused\n- You won't be able to create new campaigns\n- Lead collection will be disabled\n\nRenew your subscription now: {{renewal_link}}\n\nIf you have any questions, feel free to reach out to our support team.\n\nBest regards,\nThe PromoGuage Team`,
        variables: JSON.stringify(['user_name', 'plan_name', 'expiry_date', 'days_remaining', 'renewal_link']),
      },
      {
        id: 'welcome_email_owner',
        template_name: 'welcome_email_owner',
        subject: 'Welcome to PromoGuage, {{user_name}}!',
        html_body: `<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #333;">Welcome to PromoGuage, {{user_name}}!</h2>
    <p>We're excited to have you on board! 🎉</p>
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
  </body></html>`,
        text_body: `Welcome to PromoGuage, {{user_name}}!\n\nWe're excited to have you on board!\n\nPromoGuage makes it easy to create engaging promotional campaigns with our Spin the Wheel and Scratch & Win templates.\n\nGet Started in 3 Easy Steps:\n1. Choose a campaign template\n2. Customize your prizes and branding\n3. Share your campaign link and start collecting leads!\n\nGo to your dashboard: {{dashboard_link}}\n\nNeed help? Check out our Getting Started Guide: {{help_link}}\n\nBest regards,\nThe PromoGuage Team`,
        variables: JSON.stringify(['user_name', 'dashboard_link', 'help_link']),
      },
      {
        id: 'subscription_receipt_owner',
        template_name: 'subscription_receipt_owner',
        subject: 'Payment Confirmation - {{plan_name}} Subscription',
        html_body: `<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
  </body></html>`,
        text_body: `Payment Received\n\nHi {{user_name}},\n\nThank you for your payment! Your {{plan_name}} subscription has been confirmed.\n\nPayment Details:\n- Plan: {{plan_name}}\n- Amount: {{amount}} {{currency}}\n- Billing Cycle: {{billing_cycle}}\n- Next Billing Date: {{next_billing_date}}\n- Transaction ID: {{transaction_id}}\n\nYour subscription is now active and you can start using all premium features!\n\nGo to Dashboard: {{dashboard_link}}\n\nIf you have any questions about your subscription, please contact our support team.\n\nBest regards,\nThe PromoGuage Team`,
        variables: JSON.stringify(['user_name', 'plan_name', 'amount', 'currency', 'billing_cycle', 'next_billing_date', 'transaction_id', 'dashboard_link']),
      },
      {
        id: 'reward_confirmation_participant',
        template_name: 'reward_confirmation_participant',
        subject: 'Congratulations! You won {{prize_name}}',
        html_body: `<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #333;">🎉 Congratulations, {{participant_name}}!</h2>
    <p>You're a winner! You've won <strong>{{prize_name}}</strong> from {{business_name}}.</p>
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
    <p><strong>Important:</strong> Please save your reference number ({{reference_number}}) as you'll need it to claim your prize.</p>
    <p>If you have any questions, please contact {{business_name}}.</p>
    <p>Enjoy your prize!<br>The PromoGuage Team</p>
  </body></html>`,
        text_body: `Congratulations, {{participant_name}}!\n\nYou're a winner! You've won {{prize_name}} from {{business_name}}.\n\nYour Prize Details:\n- Prize: {{prize_name}}\n- Reference Number: {{reference_number}}\n- Valid Until: {{expiry_date}}\n\nHow to Redeem:\n{{redemption_instructions}}\n\nImportant: Please save your reference number ({{reference_number}}) as you'll need it to claim your prize.\n\nIf you have any questions, please contact {{business_name}}.\n\nEnjoy your prize!\nThe PromoGuage Team`,
        variables: JSON.stringify(['participant_name', 'prize_name', 'business_name', 'reference_number', 'expiry_date', 'redemption_instructions']),
      },
      {
        id: 'admin_new_signup',
        template_name: 'admin_new_signup',
        subject: 'New User Signup - {{user_name}}',
        html_body: `<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
  </body></html>`,
        text_body: `New User Signup\n\nA new user has signed up for PromoGuage!\n\nUser Details:\n- Name: {{user_name}}\n- Email: {{user_email}}\n- Business: {{business_name}}\n- Country: {{country}}\n- Industry: {{industry}}\n- Signup Date: {{signup_date}}`,
        variables: JSON.stringify(['user_name', 'user_email', 'business_name', 'country', 'industry', 'signup_date']),
      },
      {
        id: 'reward_redemption_owner',
        template_name: 'reward_redemption_owner',
        subject: 'Prize Redeemed - {{campaign_name}}',
        html_body: `<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
  </body></html>`,
        text_body: `Prize Redeemed\n\nHi {{owner_name}},\n\nA participant has redeemed their prize from your campaign {{campaign_name}}.\n\nRedemption Details:\n- Campaign: {{campaign_name}}\n- Participant: {{participant_name}}\n- Prize: {{prize_name}}\n- Reference Number: {{reference_number}}\n- Redeemed On: {{redemption_date}}\n\nView Campaign Details: {{campaign_link}}\n\nBest regards,\nThe PromoGuage Team`,
        variables: JSON.stringify(['owner_name', 'campaign_name', 'participant_name', 'prize_name', 'reference_number', 'redemption_date', 'campaign_link']),
      },
    ];

    let installedCount = 0;
    let updatedCount = 0;

    for (const templateData of templates) {
      // Check if template exists
      const existing = await c.env.DB.prepare(
        "SELECT id FROM email_templates WHERE template_name = ?"
      ).bind(templateData.template_name).first();

      if (existing) {
        // Update existing template
        await c.env.DB.prepare(
          `UPDATE email_templates SET 
            subject = ?,
            html_body = ?,
            text_body = ?,
            variables = ?,
            updated_at = datetime('now')
          WHERE template_name = ?`
        ).bind(
          templateData.subject,
          templateData.html_body,
          templateData.text_body,
          templateData.variables,
          templateData.template_name
        ).run();
        updatedCount++;
        console.log(`[Email Templates] Updated: ${templateData.template_name}`);
      } else {
        // Create new template
        await c.env.DB.prepare(
          `INSERT INTO email_templates (
            id, template_name, subject, html_body, text_body, variables,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(
          templateData.id,
          templateData.template_name,
          templateData.subject,
          templateData.html_body,
          templateData.text_body,
          templateData.variables
        ).run();
        installedCount++;
        console.log(`[Email Templates] Installed: ${templateData.template_name}`);
      }
    }

    // Get final count
    const countResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM email_templates"
    ).first();

    return c.json({
      success: true,
      message: "Email templates installed successfully",
      installed: installedCount,
      updated: updatedCount,
      total_templates: (countResult as any)?.count || 0,
      templates_installed: templates.map(t => t.template_name),
    });
  } catch (error) {
    console.error("[Email Templates] Installation failed:", error);
    return c.json({ 
      success: false,
      error: "Failed to install email templates",
      details: String(error) 
    }, 500);
  }
});

// Send test email
app.post("/api/admin/send-test-email", authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { email, provider, is_sandbox } = body;

    if (!email) {
      return c.json({ error: "Email address is required" }, 400);
    }

    // Get email integration settings
    const emailSettings = await c.env.DB.prepare(
      "SELECT * FROM email_integration_settings WHERE provider = ? AND is_sandbox = ?"
    ).bind(provider, is_sandbox ? 1 : 0).first();

    if (!emailSettings) {
      return c.json({ error: "Email integration not configured" }, 400);
    }

    if (!emailSettings.is_active) {
      return c.json({ error: "Email integration is not active" }, 400);
    }

    // Prepare test email content
    const subject = "PromoGuage Email Integration Test";
    const htmlBody = `
      <html>
        <body>
          <h1>Email Integration Test Successful!</h1>
          <p>This is a test email from PromoGuage to verify your email integration is working correctly.</p>
          <p><strong>Configuration Details:</strong></p>
          <ul>
            <li>Provider: ${emailSettings.provider}</li>
            <li>Mode: ${emailSettings.is_sandbox ? 'Sandbox' : 'Live'}</li>
            <li>Domain: ${emailSettings.api_domain}</li>
            <li>Sender: ${emailSettings.sender_name} &lt;${emailSettings.sender_email}&gt;</li>
          </ul>
          <p>If you received this email, your email integration is configured correctly!</p>
          <br>
          <p>Best regards,<br>The PromoGuage Team</p>
        </body>
      </html>
    `;
    const textBody = `
Email Integration Test Successful!

This is a test email from PromoGuage to verify your email integration is working correctly.

Configuration Details:
- Provider: ${emailSettings.provider}
- Mode: ${emailSettings.is_sandbox ? 'Sandbox' : 'Live'}
- Domain: ${emailSettings.api_domain}
- Sender: ${emailSettings.sender_name} <${emailSettings.sender_email}>

If you received this email, your email integration is configured correctly!

Best regards,
The PromoGuage Team
    `;

    // Determine Mailgun API endpoint
    const apiDomain = emailSettings.api_domain as string;
    const mailgunUrl = `https://api.mailgun.net/v3/${apiDomain}/messages`;

    // Send via Mailgun
    const formData = new FormData();
    formData.append('from', `${emailSettings.sender_name} <${emailSettings.sender_email}>`);
    formData.append('to', email);
    formData.append('subject', subject);
    formData.append('html', htmlBody);
    formData.append('text', textBody);

    const mailgunRes = await fetch(mailgunUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${emailSettings.api_key}`)}`,
      },
      body: formData,
    });

    if (!mailgunRes.ok) {
      const errorData = await mailgunRes.text();
      console.error("Mailgun error:", errorData);
      return c.json({ error: `Failed to send email: ${errorData}` }, 500);
    }

    return c.json({ success: true, message: "Test email sent successfully" });
  } catch (error) {
    console.error("Failed to send test email:", error);
    return c.json({ error: "Failed to send test email" }, 500);
  }
});

// Send renewal reminder email (can be called manually or via cron)
app.post("/api/admin/send-renewal-reminders", authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { days_before_expiry } = body; // 3 or 7

    // Get active email integration
    const emailSettings = await c.env.DB.prepare(
      "SELECT * FROM email_integration_settings WHERE provider = 'mailgun' AND is_active = 1"
    ).first();

    if (!emailSettings) {
      return c.json({ error: "Email integration not configured" }, 400);
    }

    // Get renewal reminder template
    const template = await c.env.DB.prepare(
      "SELECT * FROM email_templates WHERE template_name = 'renewal_reminder'"
    ).first();

    if (!template) {
      return c.json({ error: "Email template not found" }, 404);
    }

    // Get users with subscriptions expiring in specified days
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days_before_expiry);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Note: We can't join with Mocha's user table, so we'll need to get user emails separately
    const { results: expiringUsers } = await c.env.DB.prepare(
      `SELECT * FROM users
       WHERE plan_type != 'free' 
       AND subscription_status = 'active'
       AND plan_expires_at IS NOT NULL
       AND datetime(plan_expires_at) >= datetime(?)
       AND datetime(plan_expires_at) < datetime(?)`
    ).bind(targetDate.toISOString(), nextDay.toISOString()).all();

    let sentCount = 0;
    const errors = [];

    // Send emails via Mailgun
    for (const user of expiringUsers) {
      try {
        const userData = user as any;
        
        // Fetch Mocha user data to get email
        // In production, you'd want to cache this or batch fetch
        // For now, we'll skip users we can't get email for
        const mochaUserRes = await fetch(`${c.env.MOCHA_USERS_SERVICE_API_URL}/users/${userData.mocha_user_id}`, {
          headers: {
            'Authorization': `Bearer ${c.env.MOCHA_USERS_SERVICE_API_KEY}`,
          },
        });

        if (!mochaUserRes.ok) {
          errors.push({ user_id: userData.id, error: "Could not fetch user email" });
          continue;
        }

        const mochaUser = await mochaUserRes.json() as { email: string };
        const userEmail = mochaUser.email;

        if (!userEmail) {
          errors.push({ user_id: userData.id, error: "User has no email" });
          continue;
        }

        const expiryDate = new Date(userData.plan_expires_at);
        
        // Replace template variables
        let htmlBody = (template.html_body as string)
          .replace(/\{\{user_name\}\}/g, userData.full_name || 'Valued Customer')
          .replace(/\{\{plan_name\}\}/g, userData.plan_type.charAt(0).toUpperCase() + userData.plan_type.slice(1))
          .replace(/\{\{expiry_date\}\}/g, expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
          .replace(/\{\{days_remaining\}\}/g, days_before_expiry.toString())
          .replace(/\{\{renewal_link\}\}/g, `${c.req.header("origin")}/pricing`);

        let textBody = (template.text_body as string)
          .replace(/\{\{user_name\}\}/g, userData.full_name || 'Valued Customer')
          .replace(/\{\{plan_name\}\}/g, userData.plan_type.charAt(0).toUpperCase() + userData.plan_type.slice(1))
          .replace(/\{\{expiry_date\}\}/g, expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
          .replace(/\{\{days_remaining\}\}/g, days_before_expiry.toString())
          .replace(/\{\{renewal_link\}\}/g, `${c.req.header("origin")}/pricing`);

        let subject = (template.subject as string)
          .replace(/\{\{user_name\}\}/g, userData.full_name || 'Valued Customer')
          .replace(/\{\{plan_name\}\}/g, userData.plan_type.charAt(0).toUpperCase() + userData.plan_type.slice(1))
          .replace(/\{\{expiry_date\}\}/g, expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
          .replace(/\{\{days_remaining\}\}/g, days_before_expiry.toString());

        // Determine Mailgun API endpoint based on sandbox mode
        const apiDomain = emailSettings.is_sandbox ? 'sandbox' : emailSettings.api_domain;
        const mailgunUrl = `https://api.mailgun.net/v3/${apiDomain}/messages`;

        // Send via Mailgun
        const formData = new FormData();
        formData.append('from', `${emailSettings.sender_name} <${emailSettings.sender_email}>`);
        formData.append('to', userEmail);
        formData.append('subject', subject);
        formData.append('html', htmlBody);
        formData.append('text', textBody);

        const mailgunRes = await fetch(mailgunUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`api:${emailSettings.api_key}`)}`,
          },
          body: formData,
        });

        if (mailgunRes.ok) {
          sentCount++;
        } else {
          const errorData = await mailgunRes.text();
          errors.push({ user_id: userData.id, error: errorData });
        }
      } catch (error) {
        errors.push({ user_id: (user as any).id, error: String(error) });
      }
    }

    return c.json({
      success: true,
      sent_count: sentCount,
      total_users: expiringUsers.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Failed to send renewal reminders:", error);
    return c.json({ error: "Failed to send renewal reminders" }, 500);
  }
});

// Payment Gateway Settings routes
app.get("/api/admin/payment-gateways", authMiddleware, adminMiddleware, async (c) => {
  const { results: gateways } = await c.env.DB.prepare(
    "SELECT * FROM payment_gateway_settings ORDER BY gateway_name, is_sandbox DESC"
  ).all();

  return c.json({ gateways });
});

app.get("/api/admin/payment-gateways/:gateway", authMiddleware, adminMiddleware, async (c) => {
  const gatewayName = c.req.param("gateway");
  const isSandbox = c.req.query("sandbox") === "true" ? 1 : 0;

  const gateway = await c.env.DB.prepare(
    "SELECT * FROM payment_gateway_settings WHERE gateway_name = ? AND is_sandbox = ?"
  ).bind(gatewayName, isSandbox).first();

  if (!gateway) {
    return c.json({ gateway: null });
  }

  return c.json({ 
    gateway: {
      ...gateway,
      is_sandbox: gateway.is_sandbox === 1,
      is_active: gateway.is_active === 1,
      additional_config: gateway.additional_config ? JSON.parse(gateway.additional_config as string) : null,
    }
  });
});

app.put("/api/admin/payment-gateways/:gateway", authMiddleware, adminMiddleware, async (c) => {
  const gatewayName = c.req.param("gateway");
  const body = await c.req.json();
  const isSandbox = body.is_sandbox ? 1 : 0;

  // Check if gateway setting exists
  const existing = await c.env.DB.prepare(
    "SELECT * FROM payment_gateway_settings WHERE gateway_name = ? AND is_sandbox = ?"
  ).bind(gatewayName, isSandbox).first();

  if (existing) {
    // Update existing gateway
    const updates: string[] = [];
    const values: any[] = [];

    if (body.api_key !== undefined) {
      updates.push("api_key = ?");
      values.push(body.api_key);
    }
    if (body.api_secret !== undefined) {
      updates.push("api_secret = ?");
      values.push(body.api_secret);
    }
    if (body.webhook_secret !== undefined) {
      updates.push("webhook_secret = ?");
      values.push(body.webhook_secret);
    }
    if (body.additional_config !== undefined) {
      updates.push("additional_config = ?");
      values.push(JSON.stringify(body.additional_config));
    }
    if (body.is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(body.is_active ? 1 : 0);
    }
    if (body.display_name !== undefined) {
      updates.push("display_name = ?");
      values.push(body.display_name);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(existing.id);

      await c.env.DB.prepare(
        `UPDATE payment_gateway_settings SET ${updates.join(", ")} WHERE id = ?`
      ).bind(...values).run();
    }
  } else {
    // Create new gateway setting
    const gatewayId = nanoid();
    await c.env.DB.prepare(
      `INSERT INTO payment_gateway_settings (
        id, gateway_name, is_sandbox, api_key, api_secret, webhook_secret,
        additional_config, is_active, display_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      gatewayId,
      gatewayName,
      isSandbox,
      body.api_key || null,
      body.api_secret || null,
      body.webhook_secret || null,
      body.additional_config ? JSON.stringify(body.additional_config) : null,
      body.is_active ? 1 : 0,
      body.display_name || null
    ).run();
  }

  // Return updated gateway
  const updated = await c.env.DB.prepare(
    "SELECT * FROM payment_gateway_settings WHERE gateway_name = ? AND is_sandbox = ?"
  ).bind(gatewayName, isSandbox).first();

  return c.json({ 
    gateway: updated ? {
      ...updated,
      is_sandbox: updated.is_sandbox === 1,
      is_active: updated.is_active === 1,
      additional_config: updated.additional_config ? JSON.parse(updated.additional_config as string) : null,
    } : null
  });
});

// Admin Template Management routes
app.get("/api/admin/templates", authMiddleware, async (c) => {
  // Allow any authenticated user to view templates (not just admins)
  // This ensures the templates can be fetched for campaign creation
  try {
    const { results: templates } = await c.env.DB.prepare(
      "SELECT * FROM campaign_templates ORDER BY created_at DESC"
    ).all();

    return c.json({
      templates: templates.map(template => ({
        ...template,
        wheel_segments: JSON.parse(template.wheel_segments as string),
        wheel_colors: JSON.parse(template.wheel_colors as string),
        lead_form_fields: JSON.parse(template.lead_form_fields as string),
        sound_settings: template.sound_settings ? JSON.parse(template.sound_settings as string) : { spin: true, win: true, noWin: true },
        border_custom_colors: template.border_custom_colors ? JSON.parse(template.border_custom_colors as string) : [],
        is_active: template.is_active === 1,
        confetti_enabled: template.confetti_enabled === 1,
        sound_enabled: template.sound_enabled === 1,
        spin_button_pulse_enabled: template.spin_button_pulse_enabled === 1,
        border_enabled: template.border_enabled === 1,
        border_default_enabled: template.border_default_enabled === 1,
        border_connector_ring_enabled: template.border_connector_ring_enabled === 1,
        background_gradient_enabled: template.background_gradient_enabled === 1,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return c.json({ error: "Failed to fetch templates" }, 500);
  }
});

app.get("/api/admin/templates/:id", authMiddleware, adminMiddleware, async (c) => {
  const templateId = c.req.param("id");

  try {
    const template = await c.env.DB.prepare(
      "SELECT * FROM campaign_templates WHERE id = ?"
    ).bind(templateId).first();

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    return c.json({
      template: {
        ...template,
        wheel_segments: JSON.parse(template.wheel_segments as string),
        wheel_colors: JSON.parse(template.wheel_colors as string),
        lead_form_fields: JSON.parse(template.lead_form_fields as string),
        sound_settings: template.sound_settings ? JSON.parse(template.sound_settings as string) : { spin: true, win: true, noWin: true },
        border_custom_colors: template.border_custom_colors ? JSON.parse(template.border_custom_colors as string) : [],
        is_active: template.is_active === 1,
        confetti_enabled: template.confetti_enabled === 1,
        sound_enabled: template.sound_enabled === 1,
        spin_button_pulse_enabled: template.spin_button_pulse_enabled === 1,
        border_enabled: template.border_enabled === 1,
        border_default_enabled: template.border_default_enabled === 1,
        border_connector_ring_enabled: template.border_connector_ring_enabled === 1,
        background_gradient_enabled: template.background_gradient_enabled === 1,
      },
    });
  } catch (error) {
    console.error("Failed to fetch template:", error);
    return c.json({ error: "Failed to fetch template" }, 500);
  }
});

app.post("/api/admin/templates", authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const templateId = nanoid();

    await c.env.DB.prepare(
      `INSERT INTO campaign_templates (
        id, name, description, category, icon, is_active,
        wheel_segments, wheel_colors, pointer_color,
        background_color, background_gradient_enabled, background_gradient_start,
        background_gradient_end, background_gradient_direction, background_image_url,
        logo_position, confetti_enabled, sound_enabled, sound_settings,
        font_family, font_size, wheel_border_thickness, wheel_border_color,
        pointer_style, spin_button_text, spin_button_color, spin_button_border_radius,
        spin_button_pulse_enabled, spin_duration_seconds,
        border_enabled, border_theme, border_default_enabled, border_default_color,
        border_default_thickness, border_custom_colors, border_bulb_shape,
        border_bulb_count, border_bulb_size, border_blink_speed,
        border_connector_ring_enabled, border_connector_ring_color, border_connector_ring_thickness,
        lead_form_fields, redemption_instructions,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      templateId,
      body.name,
      body.description || null,
      body.category,
      body.icon,
      body.is_active ? 1 : 0,
      JSON.stringify(body.wheel_segments),
      JSON.stringify(body.wheel_colors),
      body.pointer_color || '#ef4444',
      body.background_color || '#ffffff',
      body.background_gradient_enabled ? 1 : 0,
      body.background_gradient_start || null,
      body.background_gradient_end || null,
      body.background_gradient_direction || 'to-bottom',
      body.background_image_url || null,
      body.logo_position || 'center',
      body.confetti_enabled ? 1 : 0,
      body.sound_enabled ? 1 : 0,
      JSON.stringify(body.sound_settings || { spin: true, win: true, noWin: true }),
      body.font_family || 'Inter',
      body.font_size || 16,
      body.wheel_border_thickness || 3,
      body.wheel_border_color || '#ffffff',
      body.pointer_style || 'arrow',
      body.spin_button_text || 'SPIN',
      body.spin_button_color || '#6366f1',
      body.spin_button_border_radius || 40,
      body.spin_button_pulse_enabled ? 1 : 0,
      body.spin_duration_seconds || 5,
      body.border_enabled ? 1 : 0,
      body.border_theme || null,
      body.border_default_enabled ? 1 : 0,
      body.border_default_color || '#FFFFFF',
      body.border_default_thickness || 10,
      JSON.stringify(body.border_custom_colors || []),
      body.border_bulb_shape || 'circle',
      body.border_bulb_count || 24,
      body.border_bulb_size || 10,
      body.border_blink_speed || 'medium',
      body.border_connector_ring_enabled ? 1 : 0,
      body.border_connector_ring_color || '#FFFFFF',
      body.border_connector_ring_thickness || 6,
      JSON.stringify(body.lead_form_fields),
      body.redemption_instructions || null
    ).run();

    const template = await c.env.DB.prepare(
      "SELECT * FROM campaign_templates WHERE id = ?"
    ).bind(templateId).first();

    return c.json({
      template: {
        ...template,
        wheel_segments: JSON.parse(template!.wheel_segments as string),
        wheel_colors: JSON.parse(template!.wheel_colors as string),
        lead_form_fields: JSON.parse(template!.lead_form_fields as string),
        sound_settings: template!.sound_settings ? JSON.parse(template!.sound_settings as string) : { spin: true, win: true, noWin: true },
        border_custom_colors: template!.border_custom_colors ? JSON.parse(template!.border_custom_colors as string) : [],
        is_active: template!.is_active === 1,
      },
    });
  } catch (error) {
    console.error("Failed to create template:", error);
    return c.json({ error: "Failed to create template" }, 500);
  }
});

app.patch("/api/admin/templates/:id", authMiddleware, adminMiddleware, async (c) => {
  const templateId = c.req.param("id");

  try {
    const template = await c.env.DB.prepare(
      "SELECT * FROM campaign_templates WHERE id = ?"
    ).bind(templateId).first();

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    const body = await c.req.json();
    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      updates.push("name = ?");
      values.push(body.name);
    }
    if (body.description !== undefined) {
      updates.push("description = ?");
      values.push(body.description);
    }
    if (body.category !== undefined) {
      updates.push("category = ?");
      values.push(body.category);
    }
    if (body.icon !== undefined) {
      updates.push("icon = ?");
      values.push(body.icon);
    }
    if (body.is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(body.is_active ? 1 : 0);
    }
    if (body.wheel_segments !== undefined) {
      updates.push("wheel_segments = ?");
      values.push(JSON.stringify(body.wheel_segments));
    }
    if (body.wheel_colors !== undefined) {
      updates.push("wheel_colors = ?");
      values.push(JSON.stringify(body.wheel_colors));
    }
    if (body.pointer_color !== undefined) {
      updates.push("pointer_color = ?");
      values.push(body.pointer_color);
    }
    if (body.background_color !== undefined) {
      updates.push("background_color = ?");
      values.push(body.background_color);
    }
    if (body.background_gradient_enabled !== undefined) {
      updates.push("background_gradient_enabled = ?");
      values.push(body.background_gradient_enabled ? 1 : 0);
    }
    if (body.background_gradient_start !== undefined) {
      updates.push("background_gradient_start = ?");
      values.push(body.background_gradient_start);
    }
    if (body.background_gradient_end !== undefined) {
      updates.push("background_gradient_end = ?");
      values.push(body.background_gradient_end);
    }
    if (body.background_gradient_direction !== undefined) {
      updates.push("background_gradient_direction = ?");
      values.push(body.background_gradient_direction);
    }
    if (body.background_image_url !== undefined) {
      updates.push("background_image_url = ?");
      values.push(body.background_image_url);
    }
    if (body.logo_position !== undefined) {
      updates.push("logo_position = ?");
      values.push(body.logo_position);
    }
    if (body.confetti_enabled !== undefined) {
      updates.push("confetti_enabled = ?");
      values.push(body.confetti_enabled ? 1 : 0);
    }
    if (body.sound_enabled !== undefined) {
      updates.push("sound_enabled = ?");
      values.push(body.sound_enabled ? 1 : 0);
    }
    if (body.sound_settings !== undefined) {
      updates.push("sound_settings = ?");
      values.push(JSON.stringify(body.sound_settings));
    }
    if (body.font_family !== undefined) {
      updates.push("font_family = ?");
      values.push(body.font_family);
    }
    if (body.font_size !== undefined) {
      updates.push("font_size = ?");
      values.push(body.font_size);
    }
    if (body.wheel_border_thickness !== undefined) {
      updates.push("wheel_border_thickness = ?");
      values.push(body.wheel_border_thickness);
    }
    if (body.wheel_border_color !== undefined) {
      updates.push("wheel_border_color = ?");
      values.push(body.wheel_border_color);
    }
    if (body.pointer_style !== undefined) {
      updates.push("pointer_style = ?");
      values.push(body.pointer_style);
    }
    if (body.spin_button_text !== undefined) {
      updates.push("spin_button_text = ?");
      values.push(body.spin_button_text);
    }
    if (body.spin_button_color !== undefined) {
      updates.push("spin_button_color = ?");
      values.push(body.spin_button_color);
    }
    if (body.spin_button_border_radius !== undefined) {
      updates.push("spin_button_border_radius = ?");
      values.push(body.spin_button_border_radius);
    }
    if (body.spin_button_pulse_enabled !== undefined) {
      updates.push("spin_button_pulse_enabled = ?");
      values.push(body.spin_button_pulse_enabled ? 1 : 0);
    }
    if (body.spin_duration_seconds !== undefined) {
      updates.push("spin_duration_seconds = ?");
      values.push(body.spin_duration_seconds);
    }
    if (body.border_enabled !== undefined) {
      updates.push("border_enabled = ?");
      values.push(body.border_enabled ? 1 : 0);
    }
    if (body.border_theme !== undefined) {
      updates.push("border_theme = ?");
      values.push(body.border_theme);
    }
    if (body.border_default_enabled !== undefined) {
      updates.push("border_default_enabled = ?");
      values.push(body.border_default_enabled ? 1 : 0);
    }
    if (body.border_default_color !== undefined) {
      updates.push("border_default_color = ?");
      values.push(body.border_default_color);
    }
    if (body.border_default_thickness !== undefined) {
      updates.push("border_default_thickness = ?");
      values.push(body.border_default_thickness);
    }
    if (body.border_custom_colors !== undefined) {
      updates.push("border_custom_colors = ?");
      values.push(JSON.stringify(body.border_custom_colors));
    }
    if (body.border_bulb_shape !== undefined) {
      updates.push("border_bulb_shape = ?");
      values.push(body.border_bulb_shape);
    }
    if (body.border_bulb_count !== undefined) {
      updates.push("border_bulb_count = ?");
      values.push(body.border_bulb_count);
    }
    if (body.border_bulb_size !== undefined) {
      updates.push("border_bulb_size = ?");
      values.push(body.border_bulb_size);
    }
    if (body.border_blink_speed !== undefined) {
      updates.push("border_blink_speed = ?");
      values.push(body.border_blink_speed);
    }
    if (body.border_connector_ring_enabled !== undefined) {
      updates.push("border_connector_ring_enabled = ?");
      values.push(body.border_connector_ring_enabled ? 1 : 0);
    }
    if (body.border_connector_ring_color !== undefined) {
      updates.push("border_connector_ring_color = ?");
      values.push(body.border_connector_ring_color);
    }
    if (body.border_connector_ring_thickness !== undefined) {
      updates.push("border_connector_ring_thickness = ?");
      values.push(body.border_connector_ring_thickness);
    }
    if (body.lead_form_fields !== undefined) {
      updates.push("lead_form_fields = ?");
      values.push(JSON.stringify(body.lead_form_fields));
    }
    if (body.redemption_instructions !== undefined) {
      updates.push("redemption_instructions = ?");
      values.push(body.redemption_instructions);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(templateId);

      await c.env.DB.prepare(
        `UPDATE campaign_templates SET ${updates.join(", ")} WHERE id = ?`
      ).bind(...values).run();
    }

    const updatedTemplate = await c.env.DB.prepare(
      "SELECT * FROM campaign_templates WHERE id = ?"
    ).bind(templateId).first();

    return c.json({
      template: {
        ...updatedTemplate,
        wheel_segments: JSON.parse(updatedTemplate!.wheel_segments as string),
        wheel_colors: JSON.parse(updatedTemplate!.wheel_colors as string),
        lead_form_fields: JSON.parse(updatedTemplate!.lead_form_fields as string),
        sound_settings: updatedTemplate!.sound_settings ? JSON.parse(updatedTemplate!.sound_settings as string) : { spin: true, win: true, noWin: true },
        border_custom_colors: updatedTemplate!.border_custom_colors ? JSON.parse(updatedTemplate!.border_custom_colors as string) : [],
        is_active: updatedTemplate!.is_active === 1,
        confetti_enabled: updatedTemplate!.confetti_enabled === 1,
        sound_enabled: updatedTemplate!.sound_enabled === 1,
        spin_button_pulse_enabled: updatedTemplate!.spin_button_pulse_enabled === 1,
        border_enabled: updatedTemplate!.border_enabled === 1,
        border_default_enabled: updatedTemplate!.border_default_enabled === 1,
        border_connector_ring_enabled: updatedTemplate!.border_connector_ring_enabled === 1,
        background_gradient_enabled: updatedTemplate!.background_gradient_enabled === 1,
      },
    });
  } catch (error) {
    console.error("Failed to update template:", error);
    return c.json({ error: "Failed to update template" }, 500);
  }
});

app.post("/api/admin/templates/:id/upload-background", authMiddleware, adminMiddleware, async (c) => {
  const templateId = c.req.param("id");

  try {
    const template = await c.env.DB.prepare(
      "SELECT * FROM campaign_templates WHERE id = ?"
    ).bind(templateId).first();

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    const formData = await c.req.formData();
    const file = formData.get("background");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Invalid file type. Only images are allowed." }, 400);
    }

    // Validate file size (10MB for backgrounds)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: "File too large. Maximum size is 10MB." }, 400);
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const filename = `${timestamp}.${fileExtension}`;
    const key = `templates/${templateId}/background/${filename}`;

    // Upload to R2
    await c.env.R2_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Generate public URL
    const publicUrl = `/api/files/${key}`;

    // Update template with new background image URL
    await c.env.DB.prepare(
      "UPDATE campaign_templates SET background_image_url = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(publicUrl, templateId).run();

    return c.json({ url: publicUrl });
  } catch (error) {
    console.error("Template background image upload error:", error);
    return c.json({ error: "Failed to upload background image" }, 500);
  }
});

app.post("/api/admin/templates/:id/upload-prize-image", authMiddleware, adminMiddleware, async (c) => {
  const templateId = c.req.param("id");

  try {
    const template = await c.env.DB.prepare(
      "SELECT * FROM campaign_templates WHERE id = ?"
    ).bind(templateId).first();

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    const formData = await c.req.formData();
    const file = formData.get("prize_image");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Invalid file type. Only images are allowed." }, 400);
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: "File too large. Maximum size is 5MB." }, 400);
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const filename = `${timestamp}.${fileExtension}`;
    const key = `templates/${templateId}/prizes/${filename}`;

    // Upload to R2
    await c.env.R2_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Generate public URL
    const publicUrl = `/api/files/${key}`;

    return c.json({ url: publicUrl });
  } catch (error) {
    console.error("Template prize image upload error:", error);
    return c.json({ error: "Failed to upload prize image" }, 500);
  }
});

app.delete("/api/admin/templates/:id", authMiddleware, adminMiddleware, async (c) => {
  const templateId = c.req.param("id");

  try {
    const template = await c.env.DB.prepare(
      "SELECT * FROM campaign_templates WHERE id = ?"
    ).bind(templateId).first();

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    await c.env.DB.prepare(
      "DELETE FROM campaign_templates WHERE id = ?"
    ).bind(templateId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to delete template:", error);
    return c.json({ error: "Failed to delete template" }, 500);
  }
});

app.post("/api/admin/templates/:id/duplicate", authMiddleware, adminMiddleware, async (c) => {
  const templateId = c.req.param("id");

  try {
    const template = await c.env.DB.prepare(
      "SELECT * FROM campaign_templates WHERE id = ?"
    ).bind(templateId).first();

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    const newTemplateId = nanoid();
    const newName = `${template.name} (Copy)`;

    await c.env.DB.prepare(
      `INSERT INTO campaign_templates (
        id, name, description, category, icon, is_active,
        wheel_segments, wheel_colors, pointer_color,
        background_color, background_gradient_enabled, background_gradient_start,
        background_gradient_end, background_gradient_direction, background_image_url,
        logo_position, confetti_enabled, sound_enabled, sound_settings,
        font_family, font_size, wheel_border_thickness, wheel_border_color,
        pointer_style, spin_button_text, spin_button_color, spin_button_border_radius,
        spin_button_pulse_enabled, spin_duration_seconds,
        border_enabled, border_theme, border_default_enabled, border_default_color,
        border_default_thickness, border_custom_colors, border_bulb_shape,
        border_bulb_count, border_bulb_size, border_blink_speed,
        border_connector_ring_enabled, border_connector_ring_color, border_connector_ring_thickness,
        lead_form_fields, redemption_instructions,
        created_at, updated_at
      ) SELECT ?, ?, description, category, icon, 0,
        wheel_segments, wheel_colors, pointer_color,
        background_color, background_gradient_enabled, background_gradient_start,
        background_gradient_end, background_gradient_direction, background_image_url,
        logo_position, confetti_enabled, sound_enabled, sound_settings,
        font_family, font_size, wheel_border_thickness, wheel_border_color,
        pointer_style, spin_button_text, spin_button_color, spin_button_border_radius,
        spin_button_pulse_enabled, spin_duration_seconds,
        border_enabled, border_theme, border_default_enabled, border_default_color,
        border_default_thickness, border_custom_colors, border_bulb_shape,
        border_bulb_count, border_bulb_size, border_blink_speed,
        border_connector_ring_enabled, border_connector_ring_color, border_connector_ring_thickness,
        lead_form_fields, redemption_instructions,
        datetime('now'), datetime('now')
      FROM campaign_templates WHERE id = ?`
    ).bind(newTemplateId, newName, templateId).run();

    return c.json({ success: true, id: newTemplateId });
  } catch (error) {
    console.error("Failed to duplicate template:", error);
    return c.json({ error: "Failed to duplicate template" }, 500);
  }
});

// Public billing plans endpoint (no auth required for pricing page)
app.get("/api/billing-plans", async (c) => {
  const currency = c.req.query("currency") || "USD";
  const type = c.req.query("type") || "subscription";

  try {
    const { results: plans } = await c.env.DB.prepare(
      "SELECT * FROM billing_plans WHERE currency = ? AND plan_type = ? AND is_active = 1 ORDER BY display_order ASC"
    ).bind(currency, type).all();

    return c.json({
      plans: plans.map(plan => ({
        ...plan,
        features: plan.features ? JSON.parse(plan.features as string) : [],
        is_active: plan.is_active === 1,
        is_popular: plan.is_popular === 1,
        remove_watermark: plan.remove_watermark === 1,
        allow_background_image: plan.allow_background_image === 1,
        allow_logo_upload: plan.allow_logo_upload === 1,
        allow_external_border: plan.allow_external_border === 1,
        allow_qr_code: plan.allow_qr_code === 1,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch billing plans:", error);
    return c.json({ error: "Failed to fetch billing plans" }, 500);
  }
});

// Homepage favicon upload endpoint
app.post("/api/admin/homepage-favicon/upload", authMiddleware, adminMiddleware, async (c) => {
  return handleFaviconUpload(c.req.raw, c.env);
});

// Homepage logo upload endpoint
app.post("/api/admin/homepage-logo/upload", authMiddleware, adminMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("logo");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Invalid file type. Only images are allowed." }, 400);
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: "File size must be less than 5MB." }, 400);
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const filename = `${timestamp}.${fileExtension}`;
    const key = `homepage/logo/${filename}`;

    // Upload to R2 with optimization metadata
    await c.env.R2_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        optimized: "true",
        uploadedAt: new Date().toISOString(),
      },
    });

    // Generate public URL
    const publicUrl = `/api/files/${key}`;

    return c.json({ url: publicUrl });
  } catch (error) {
    console.error("Homepage logo upload error:", error);
    return c.json({ error: "Failed to upload logo" }, 500);
  }
});

// Homepage benefit image upload endpoint
app.post("/api/admin/homepage-benefit-image/upload", authMiddleware, adminMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Invalid file type. Only images are allowed." }, 400);
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: "File size must be less than 10MB." }, 400);
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const fileExtension = file.name.split(".").pop();
    const filename = `${timestamp}-${random}.${fileExtension}`;
    const key = `homepage/benefits/${filename}`;

    // Upload to R2
    await c.env.R2_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        recommendedDimensions: "600x400",
      },
    });

    // Generate public URL
    const publicUrl = `/api/files/${key}`;

    return c.json({ url: publicUrl });
  } catch (error) {
    console.error("Benefit image upload error:", error);
    return c.json({ error: "Failed to upload image" }, 500);
  }
});

// Homepage how-it-works image upload endpoint
app.post("/api/admin/homepage-how-it-works-image/upload", authMiddleware, adminMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Invalid file type. Only images are allowed." }, 400);
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: "File size must be less than 10MB." }, 400);
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const fileExtension = file.name.split(".").pop();
    const filename = `${timestamp}-${random}.${fileExtension}`;
    const key = `homepage/how-it-works/${filename}`;

    // Upload to R2
    await c.env.R2_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        recommendedDimensions: "600x400",
      },
    });

    // Generate public URL
    const publicUrl = `/api/files/${key}`;

    return c.json({ url: publicUrl });
  } catch (error) {
    console.error("How It Works image upload error:", error);
    return c.json({ error: "Failed to upload image" }, 500);
  }
});

// Homepage Configuration routes - Public endpoint (no auth required)
app.get("/api/homepage-config", async (c) => {
  try {
    const config = await c.env.DB.prepare(
      "SELECT config_json FROM homepage_config WHERE id = ?"
    ).bind("default").first();

    if (!config) {
      return c.json({ error: "Homepage configuration not found" }, 404);
    }

    const parsedConfig = JSON.parse(config.config_json as string);
    
    // Debug logging
    console.log('[API] Parsed config keys:', Object.keys(parsedConfig));
    console.log('[API] Has campaign_types:', 'campaign_types' in parsedConfig);
    console.log('[API] campaign_types value:', parsedConfig.campaign_types);
    console.log('[API] Order array:', parsedConfig.order);
    
    const response = c.json({ 
      config: parsedConfig,
      _timestamp: new Date().toISOString(),
      _debug: {
        has_campaign_types: 'campaign_types' in parsedConfig,
        campaign_types_visible: parsedConfig.campaign_types?.visible,
        config_keys: Object.keys(parsedConfig),
      }
    });
    
    // Prevent browser and CDN caching to ensure latest config is always fetched
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error("Failed to fetch homepage config:", error);
    return c.json({ error: "Failed to fetch homepage configuration" }, 500);
  }
});

// Admin endpoint for homepage config
app.get("/api/admin/homepage-config", authMiddleware, adminMiddleware, async (c) => {
  try {
    const config = await c.env.DB.prepare(
      "SELECT config_json FROM homepage_config WHERE id = ?"
    ).bind("default").first();

    if (!config) {
      return c.json({ error: "Homepage configuration not found" }, 404);
    }

    return c.json({ 
      config: JSON.parse(config.config_json as string)
    });
  } catch (error) {
    console.error("Failed to fetch homepage config:", error);
    return c.json({ error: "Failed to fetch homepage configuration" }, 500);
  }
});

app.put("/api/admin/homepage-config", authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { config } = body;

    if (!config) {
      return c.json({ error: "Config is required" }, 400);
    }

    await c.env.DB.prepare(
      "UPDATE homepage_config SET config_json = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(JSON.stringify(config), "default").run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to save homepage config:", error);
    return c.json({ error: "Failed to save homepage configuration" }, 500);
  }
});

// Admin Billing Plan Management routes
app.get("/api/admin/billing-plans", authMiddleware, adminMiddleware, async (c) => {
  const currency = c.req.query("currency") || "USD";
  const type = c.req.query("type") || "subscription";

  try {
    const { results: plans } = await c.env.DB.prepare(
      "SELECT * FROM billing_plans WHERE currency = ? AND plan_type = ? ORDER BY display_order ASC"
    ).bind(currency, type).all();

    return c.json({
      plans: plans.map(plan => ({
        ...plan,
        features: plan.features ? JSON.parse(plan.features as string) : [],
        is_active: plan.is_active === 1,
        is_popular: plan.is_popular === 1,
        remove_watermark: plan.remove_watermark === 1,
        allow_background_image: plan.allow_background_image === 1,
        allow_logo_upload: plan.allow_logo_upload === 1,
        allow_external_border: plan.allow_external_border === 1,
        allow_qr_code: plan.allow_qr_code === 1,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch billing plans:", error);
    return c.json({ error: "Failed to fetch billing plans" }, 500);
  }
});

app.post("/api/admin/billing-plans", authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const planId = nanoid();

    await c.env.DB.prepare(
      `INSERT INTO billing_plans (
        id, plan_type, name, description, currency, amount, billing_interval,
        campaign_limit, lead_limit, features, is_active, display_order, is_popular,
        remove_watermark, allow_background_image, allow_logo_upload, allow_external_border, 
        allow_qr_code, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      planId,
      body.plan_type,
      body.name,
      body.description || null,
      body.currency,
      body.amount,
      body.billing_interval || null,
      body.campaign_limit || null,
      body.lead_limit || null,
      JSON.stringify(body.features || []),
      body.is_active ? 1 : 0,
      body.display_order || 0,
      body.is_popular ? 1 : 0,
      body.remove_watermark ? 1 : 0,
      body.allow_background_image ? 1 : 0,
      body.allow_logo_upload ? 1 : 0,
      body.allow_external_border ? 1 : 0,
      body.allow_qr_code ? 1 : 0
    ).run();

    const plan = await c.env.DB.prepare(
      "SELECT * FROM billing_plans WHERE id = ?"
    ).bind(planId).first();

    return c.json({
      plan: {
        ...plan,
        features: plan!.features ? JSON.parse(plan!.features as string) : [],
        is_active: plan!.is_active === 1,
        is_popular: plan!.is_popular === 1,
        remove_watermark: plan!.remove_watermark === 1,
        allow_background_image: plan!.allow_background_image === 1,
        allow_logo_upload: plan!.allow_logo_upload === 1,
        allow_external_border: plan!.allow_external_border === 1,
        allow_qr_code: plan!.allow_qr_code === 1,
      },
    });
  } catch (error) {
    console.error("Failed to create billing plan:", error);
    return c.json({ error: "Failed to create billing plan" }, 500);
  }
});

app.patch("/api/admin/billing-plans/:id", authMiddleware, adminMiddleware, async (c) => {
  const planId = c.req.param("id");

  try {
    const plan = await c.env.DB.prepare(
      "SELECT * FROM billing_plans WHERE id = ?"
    ).bind(planId).first();

    if (!plan) {
      return c.json({ error: "Billing plan not found" }, 404);
    }

    const body = await c.req.json();
    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      updates.push("name = ?");
      values.push(body.name);
    }
    if (body.description !== undefined) {
      updates.push("description = ?");
      values.push(body.description);
    }
    if (body.amount !== undefined) {
      updates.push("amount = ?");
      values.push(body.amount);
    }
    if (body.billing_interval !== undefined) {
      updates.push("billing_interval = ?");
      values.push(body.billing_interval);
    }
    if (body.campaign_limit !== undefined) {
      updates.push("campaign_limit = ?");
      values.push(body.campaign_limit);
    }
    if (body.lead_limit !== undefined) {
      updates.push("lead_limit = ?");
      values.push(body.lead_limit);
    }
    if (body.features !== undefined) {
      updates.push("features = ?");
      values.push(JSON.stringify(body.features));
    }
    if (body.is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(body.is_active ? 1 : 0);
    }
    if (body.display_order !== undefined) {
      updates.push("display_order = ?");
      values.push(body.display_order);
    }
    if (body.is_popular !== undefined) {
      updates.push("is_popular = ?");
      values.push(body.is_popular ? 1 : 0);
    }
    if (body.remove_watermark !== undefined) {
      updates.push("remove_watermark = ?");
      values.push(body.remove_watermark ? 1 : 0);
    }
    if (body.allow_background_image !== undefined) {
      updates.push("allow_background_image = ?");
      values.push(body.allow_background_image ? 1 : 0);
    }
    if (body.allow_logo_upload !== undefined) {
      updates.push("allow_logo_upload = ?");
      values.push(body.allow_logo_upload ? 1 : 0);
    }
    if (body.allow_external_border !== undefined) {
      updates.push("allow_external_border = ?");
      values.push(body.allow_external_border ? 1 : 0);
    }
    if (body.allow_qr_code !== undefined) {
      updates.push("allow_qr_code = ?");
      values.push(body.allow_qr_code ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(planId);

      await c.env.DB.prepare(
        `UPDATE billing_plans SET ${updates.join(", ")} WHERE id = ?`
      ).bind(...values).run();
    }

    const updatedPlan = await c.env.DB.prepare(
      "SELECT * FROM billing_plans WHERE id = ?"
    ).bind(planId).first();

    return c.json({
      plan: {
        ...updatedPlan,
        features: updatedPlan!.features ? JSON.parse(updatedPlan!.features as string) : [],
        is_active: updatedPlan!.is_active === 1,
        is_popular: updatedPlan!.is_popular === 1,
        remove_watermark: updatedPlan!.remove_watermark === 1,
        allow_background_image: updatedPlan!.allow_background_image === 1,
        allow_logo_upload: updatedPlan!.allow_logo_upload === 1,
        allow_external_border: updatedPlan!.allow_external_border === 1,
        allow_qr_code: updatedPlan!.allow_qr_code === 1,
      },
    });
  } catch (error) {
    console.error("Failed to update billing plan:", error);
    return c.json({ error: "Failed to update billing plan" }, 500);
  }
});

app.delete("/api/admin/billing-plans/:id", authMiddleware, adminMiddleware, async (c) => {
  const planId = c.req.param("id");

  try {
    const plan = await c.env.DB.prepare(
      "SELECT * FROM billing_plans WHERE id = ?"
    ).bind(planId).first();

    if (!plan) {
      return c.json({ error: "Billing plan not found" }, 404);
    }

    await c.env.DB.prepare(
      "DELETE FROM billing_plans WHERE id = ?"
    ).bind(planId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to delete billing plan:", error);
    return c.json({ error: "Failed to delete billing plan" }, 500);
  }
});

// Admin Posts Management routes
app.get("/api/admin/posts", authMiddleware, adminMiddleware, async (c) => {
  try {
    const { results: posts } = await c.env.DB.prepare(
      "SELECT * FROM posts ORDER BY created_at DESC"
    ).all();

    return c.json({ posts });
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return c.json({ error: "Failed to fetch posts" }, 500);
  }
});

app.get("/api/admin/posts/:slug", authMiddleware, adminMiddleware, async (c) => {
  const slug = c.req.param("slug");

  try {
    const post = await c.env.DB.prepare(
      "SELECT * FROM posts WHERE slug = ?"
    ).bind(slug).first();

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    return c.json({ post });
  } catch (error) {
    console.error("Failed to fetch post:", error);
    return c.json({ error: "Failed to fetch post" }, 500);
  }
});

app.post("/api/admin/posts", authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const postId = nanoid();

    // Generate slug from title if not provided
    let slug = body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    
    // Ensure slug is unique
    let slugExists = await c.env.DB.prepare(
      "SELECT id FROM posts WHERE slug = ?"
    ).bind(slug).first();
    
    let counter = 1;
    while (slugExists) {
      slug = `${body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${counter}`;
      slugExists = await c.env.DB.prepare(
        "SELECT id FROM posts WHERE slug = ?"
      ).bind(slug).first();
      counter++;
    }

    const publishedAt = body.status === 'published' ? new Date().toISOString() : null;

    await c.env.DB.prepare(
      `INSERT INTO posts (
        id, title, slug, category, content_html, featured_image_url,
        status, published_at, seo_title, seo_description,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      postId,
      body.title,
      slug,
      body.category,
      body.content_html,
      body.featured_image_url || null,
      body.status || 'draft',
      publishedAt,
      body.seo_title || null,
      body.seo_description || null
    ).run();

    const post = await c.env.DB.prepare(
      "SELECT * FROM posts WHERE id = ?"
    ).bind(postId).first();

    return c.json({ post });
  } catch (error) {
    console.error("Failed to create post:", error);
    return c.json({ error: "Failed to create post" }, 500);
  }
});

app.put("/api/admin/posts/:slug", authMiddleware, adminMiddleware, async (c) => {
  const slug = c.req.param("slug");

  try {
    const post = await c.env.DB.prepare(
      "SELECT * FROM posts WHERE slug = ?"
    ).bind(slug).first();

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    const body = await c.req.json();
    const updates: string[] = [];
    const values: any[] = [];

    if (body.title !== undefined) {
      updates.push("title = ?");
      values.push(body.title);
    }
    if (body.content_html !== undefined) {
      updates.push("content_html = ?");
      values.push(body.content_html);
    }
    if (body.featured_image_url !== undefined) {
      updates.push("featured_image_url = ?");
      values.push(body.featured_image_url);
    }
    if (body.seo_title !== undefined) {
      updates.push("seo_title = ?");
      values.push(body.seo_title);
    }
    if (body.seo_description !== undefined) {
      updates.push("seo_description = ?");
      values.push(body.seo_description);
    }
    if (body.status !== undefined) {
      updates.push("status = ?");
      values.push(body.status);
      
      // Set published_at when status changes to published
      if (body.status === 'published' && post.published_at === null) {
        updates.push("published_at = ?");
        values.push(new Date().toISOString());
      }
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(post.id);

      await c.env.DB.prepare(
        `UPDATE posts SET ${updates.join(", ")} WHERE id = ?`
      ).bind(...values).run();
    }

    const updatedPost = await c.env.DB.prepare(
      "SELECT * FROM posts WHERE id = ?"
    ).bind(post.id).first();

    return c.json({ post: updatedPost });
  } catch (error) {
    console.error("Failed to update post:", error);
    return c.json({ error: "Failed to update post" }, 500);
  }
});

app.delete("/api/admin/posts/:postId", authMiddleware, adminMiddleware, async (c) => {
  const postId = c.req.param("postId");

  try {
    const post = await c.env.DB.prepare(
      "SELECT * FROM posts WHERE id = ?"
    ).bind(postId).first();

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    await c.env.DB.prepare(
      "DELETE FROM posts WHERE id = ?"
    ).bind(postId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to delete post:", error);
    return c.json({ error: "Failed to delete post" }, 500);
  }
});

app.post("/api/admin/posts/upload-image", authMiddleware, adminMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Invalid file type. Only images are allowed." }, 400);
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: "File size must be less than 5MB." }, 400);
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const fileExtension = file.name.split(".").pop();
    const filename = `${timestamp}-${random}.${fileExtension}`;
    
    // Organize by year/month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const key = `posts/${year}/${month}/${filename}`;

    // Upload to R2
    await c.env.R2_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    // Generate public URL
    const publicUrl = `/api/files/${key}`;

    return c.json({ url: publicUrl });
  } catch (error) {
    console.error("Post image upload error:", error);
    return c.json({ error: "Failed to upload image" }, 500);
  }
});

// Public posts routes (no auth required)
app.get("/api/posts/:category", async (c) => {
  const category = c.req.param("category");

  try {
    const { results: posts } = await c.env.DB.prepare(
      "SELECT id, title, slug, featured_image_url, published_at, SUBSTR(content_html, 1, 120) as excerpt FROM posts WHERE category = ? AND status = 'published' ORDER BY published_at DESC"
    ).bind(category).all();

    // Strip HTML tags from excerpt
    const postsWithExcerpt = posts.map(post => ({
      ...post,
      excerpt: (post.excerpt as string)?.replace(/<[^>]*>/g, '') || '',
    }));

    return c.json({ posts: postsWithExcerpt });
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return c.json({ error: "Failed to fetch posts" }, 500);
  }
});

app.get("/api/posts/:category/:slug", async (c) => {
  const category = c.req.param("category");
  const slug = c.req.param("slug");

  try {
    const post = await c.env.DB.prepare(
      "SELECT * FROM posts WHERE category = ? AND slug = ? AND status = 'published'"
    ).bind(category, slug).first();

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    return c.json({ post });
  } catch (error) {
    console.error("Failed to fetch post:", error);
    return c.json({ error: "Failed to fetch post" }, 500);
  }
});

// Migrate hardcoded templates to database (one-time operation for admins)
app.post("/api/admin/migrate-templates", authMiddleware, adminMiddleware, async (c) => {
  try {
    let migratedCount = 0;
    let skippedCount = 0;

    for (const template of campaignTemplates) {
      // Check if template already exists
      const existing = await c.env.DB.prepare(
        "SELECT id FROM campaign_templates WHERE id = ?"
      ).bind(template.id).first();

      if (existing) {
        skippedCount++;
        continue;
      }

      await c.env.DB.prepare(
        `INSERT INTO campaign_templates (
          id, name, description, category, icon, campaign_type, is_active,
          wheel_segments, wheel_colors, lead_form_fields,
          redemption_instructions, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, NULL, datetime('now'), datetime('now'))`
      ).bind(
        template.id,
        template.name,
        template.description,
        template.category,
        template.icon,
        template.campaignType || 'spinwheel',
        JSON.stringify(template.wheelSegments),
        JSON.stringify(template.wheelColors),
        JSON.stringify(template.leadFormFields)
      ).run();

      migratedCount++;
    }

    return c.json({
      success: true,
      migrated: migratedCount,
      skipped: skippedCount,
      total: campaignTemplates.length,
    });
  } catch (error) {
    console.error("Failed to migrate templates:", error);
    return c.json({ error: "Failed to migrate templates" }, 500);
  }
});

// Test endpoint to simulate subscription purchase and credit granting
app.post("/api/test/grant-subscription-credits", authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, plan_name, billing_cycle } = body;

    if (!user_id || !plan_name) {
      return c.json({ error: "user_id and plan_name are required" }, 400);
    }

    // Get the user
    const user = await c.env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(user_id).first();

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const userCurrency = user.currency as string || 'USD';
    const cycle = billing_cycle || 'monthly';

    // Get the plan details
    const capitalizedPlanName = plan_name.charAt(0).toUpperCase() + plan_name.slice(1).toLowerCase();
    
    let plan = await c.env.DB.prepare(
      "SELECT * FROM billing_plans WHERE LOWER(name) LIKE ? AND currency = ? AND plan_type = 'subscription' AND billing_interval = ?"
    ).bind(`%${capitalizedPlanName.toLowerCase()}%`, userCurrency, cycle).first();

    if (!plan) {
      plan = await c.env.DB.prepare(
        "SELECT * FROM billing_plans WHERE LOWER(name) LIKE ? AND currency = ? AND plan_type = 'subscription' LIMIT 1"
      ).bind(`%${capitalizedPlanName.toLowerCase()}%`, userCurrency).first();
    }

    if (!plan) {
      return c.json({ 
        error: `Plan not found: "${capitalizedPlanName}" in ${userCurrency}`,
        hint: "Available plans can be viewed at /api/billing-plans"
      }, 404);
    }

    const leadCredits = plan.lead_limit ? Number(plan.lead_limit) : 0;
    const campaignCredits = plan.campaign_limit ? Number(plan.campaign_limit) : 0;

    // Calculate expiry date
    const expiryDate = new Date();
    if (cycle === 'weekly') {
      expiryDate.setDate(expiryDate.getDate() + 7);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    // Update user with subscription and credits
    await c.env.DB.prepare(
      `UPDATE users SET 
        plan_type = ?,
        subscription_status = ?,
        billing_cycle = ?,
        plan_expires_at = ?,
        lead_credits = lead_credits + ?,
        campaign_credits = campaign_credits + ?,
        updated_at = datetime('now')
      WHERE id = ?`
    ).bind(
      plan_name.toLowerCase(),
      'active',
      cycle,
      expiryDate.toISOString(),
      leadCredits,
      campaignCredits,
      user_id
    ).run();

    // Get updated user
    const updatedUser = await c.env.DB.prepare(
      "SELECT id, business_name, plan_type, subscription_status, billing_cycle, campaign_credits, lead_credits, plan_expires_at FROM users WHERE id = ?"
    ).bind(user_id).first();

    return c.json({
      success: true,
      message: `Subscription granted: ${plan.name}`,
      plan: {
        name: plan.name,
        billing_interval: plan.billing_interval,
        campaign_limit: plan.campaign_limit,
        lead_limit: plan.lead_limit,
      },
      credits_granted: {
        campaign_credits: campaignCredits,
        lead_credits: leadCredits,
      },
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error granting test subscription:", error);
    return c.json({ error: "Failed to grant subscription", details: String(error) }, 500);
  }
});

// Emergency admin grant endpoint - NO AUTH REQUIRED
// This allows granting admin access without needing to be authenticated
app.post("/api/emergency/grant-admin", async (c) => {
  const body = await c.req.json();
  const { secret, mocha_user_id } = body;
  
  // Simple secret check - you can call this with any secret for now
  // In production, you'd want to secure this better
  if (!secret || !mocha_user_id) {
    return c.json({ error: "Secret and mocha_user_id are required" }, 400);
  }

  try {
    // Directly update the user to be admin
    const result = await c.env.DB.prepare(
      "UPDATE users SET is_admin = 1, updated_at = datetime('now') WHERE mocha_user_id = ?"
    ).bind(mocha_user_id).run();

    if (result.meta.changes === 0) {
      return c.json({ 
        error: "User not found. Make sure you've logged in at least once.",
        mocha_user_id
      }, 404);
    }

    // Verify it worked
    const user = await c.env.DB.prepare(
      "SELECT id, mocha_user_id, business_name, is_admin FROM users WHERE mocha_user_id = ?"
    ).bind(mocha_user_id).first();

    return c.json({ 
      success: true,
      message: "Admin access granted successfully!",
      user: {
        id: user?.id,
        mocha_user_id: user?.mocha_user_id,
        business_name: user?.business_name,
        is_admin: user?.is_admin,
      }
    });
  } catch (error) {
    console.error("Error granting admin access:", error);
    return c.json({ error: "Failed to grant admin access", details: String(error) }, 500);
  }
});

// Endpoint to get your mocha_user_id (authenticated)
app.get("/api/debug/my-mocha-id", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  return c.json({ 
    mocha_user_id: mochaUser?.id,
    email: mochaUser?.email,
    name: mochaUser?.google_user_data?.name,
  });
});

// Admin endpoint to grant retroactive lead credits by user ID
app.post("/api/admin/grant-credits/:userId", authMiddleware, adminMiddleware, async (c) => {
  try {
    const userId = c.req.param("userId");
    const body = await c.req.json();
    const { credits, reason } = body;

    if (!credits) {
      return c.json({ error: "Credits amount is required" }, 400);
    }

    // Get the user
    const user = await c.env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(userId).first();

    if (!user) {
      return c.json({ error: `User not found` }, 404);
    }

    // Grant the credits
    await c.env.DB.prepare(
      "UPDATE users SET lead_credits = lead_credits + ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(credits, userId).run();

    // Get updated user data
    const updatedUser = await c.env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(userId).first();

    console.log(`Admin granted ${credits} lead credits to user ${userId}. Reason: ${reason || 'Not specified'}`);

    return c.json({
      success: true,
      message: `Successfully granted ${credits} lead credits`,
      user: {
        id: updatedUser?.id,
        lead_credits: updatedUser?.lead_credits,
        plan_type: updatedUser?.plan_type,
        subscription_status: updatedUser?.subscription_status,
      },
    });
  } catch (error) {
    console.error("Error granting credits:", error);
    return c.json({ error: "Failed to grant credits" }, 500);
  }
});

// Admin endpoint to retroactively grant credits to all subscription purchasers
app.post("/api/admin/retroactive-credit-grant", authMiddleware, adminMiddleware, async (c) => {
  try {
    console.log("[Retroactive Credit Grant] Starting bulk credit grant operation...");
    
    // Get all completed subscription transactions
    const { results: transactions } = await c.env.DB.prepare(
      "SELECT * FROM billing_transactions WHERE transaction_type = 'subscription' AND status = 'completed'"
    ).all();

    console.log(`[Retroactive Credit Grant] Found ${transactions.length} completed subscription transactions`);

    const results = {
      total_transactions: transactions.length,
      users_updated: 0,
      credits_granted: [] as any[],
      errors: [] as any[],
      skipped: [] as any[],
    };

    for (const transaction of transactions) {
      const txData = transaction as any;
      
      try {
        // Get user
        const user = await c.env.DB.prepare(
          "SELECT * FROM users WHERE id = ?"
        ).bind(txData.user_id).first();

        if (!user) {
          results.errors.push({
            transaction_id: txData.id,
            error: "User not found",
          });
          continue;
        }

        // Parse transaction metadata
        const metadata = txData.metadata ? JSON.parse(txData.metadata) : {};
        const billingCycle = metadata.billingCycle || 'monthly';

        // Match plan by amount, currency, and billing_interval
        const transactionAmount = Number(txData.amount);
        const transactionCurrency = txData.currency as string;
        
        console.log(`[Retroactive Credit Grant] Processing transaction ${txData.id}: amount=${transactionAmount}, currency=${transactionCurrency}, billing_cycle=${billingCycle}`);

        const plan = await c.env.DB.prepare(
          "SELECT * FROM billing_plans WHERE amount = ? AND currency = ? AND billing_interval = ? AND plan_type = 'subscription' LIMIT 1"
        ).bind(transactionAmount, transactionCurrency, billingCycle).first();

        if (!plan) {
          results.skipped.push({
            transaction_id: txData.id,
            user_id: txData.user_id,
            amount: transactionAmount,
            currency: transactionCurrency,
            billing_cycle: billingCycle,
            reason: "No matching plan found",
          });
          console.log(`[Retroactive Credit Grant] No plan found for transaction ${txData.id}`);
          continue;
        }

        const leadCredits = plan.lead_limit ? Number(plan.lead_limit) : 0;
        const campaignCredits = plan.campaign_limit ? Number(plan.campaign_limit) : 0;

        console.log(`[Retroactive Credit Grant] Plan "${plan.name}" found - granting ${campaignCredits} campaign credits and ${leadCredits} lead credits`);

        // Calculate expiry date based on transaction creation date and billing cycle
        const transactionDate = new Date(txData.created_at);
        const expiryDate = new Date(transactionDate);
        if (billingCycle === 'weekly') {
          expiryDate.setDate(expiryDate.getDate() + 7);
        } else {
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        }

        // Update user with subscription details and grant credits
        await c.env.DB.prepare(
          `UPDATE users SET 
            plan_type = ?,
            subscription_status = ?,
            billing_cycle = ?,
            plan_expires_at = ?,
            lead_credits = lead_credits + ?,
            campaign_credits = campaign_credits + ?,
            updated_at = datetime('now')
          WHERE id = ?`
        ).bind(
          txData.plan_type || (plan.name as string).toLowerCase(),
          'active',
          billingCycle,
          expiryDate.toISOString(),
          leadCredits,
          campaignCredits,
          txData.user_id
        ).run();

        results.users_updated++;
        results.credits_granted.push({
          transaction_id: txData.id,
          user_id: txData.user_id,
          plan_name: plan.name as string,
          campaign_credits: campaignCredits,
          lead_credits: leadCredits,
          billing_cycle: billingCycle,
          plan_expires_at: expiryDate.toISOString(),
        });

        console.log(`[Retroactive Credit Grant] Successfully updated user ${txData.user_id}`);
      } catch (error) {
        results.errors.push({
          transaction_id: txData.id,
          error: String(error),
        });
        console.error(`[Retroactive Credit Grant] Error processing transaction ${txData.id}:`, error);
      }
    }

    console.log(`[Retroactive Credit Grant] Operation completed. Users updated: ${results.users_updated}, Errors: ${results.errors.length}, Skipped: ${results.skipped.length}`);

    return c.json({
      success: true,
      summary: {
        total_transactions: results.total_transactions,
        users_updated: results.users_updated,
        errors_count: results.errors.length,
        skipped_count: results.skipped.length,
      },
      details: {
        credits_granted: results.credits_granted,
        errors: results.errors.length > 0 ? results.errors : undefined,
        skipped: results.skipped.length > 0 ? results.skipped : undefined,
      },
    });
  } catch (error) {
    console.error("[Retroactive Credit Grant] Operation failed:", error);
    return c.json({ 
      success: false,
      error: "Failed to grant retroactive credits", 
      details: String(error) 
    }, 500);
  }
});

// Admin endpoint to grant retroactive lead credits by user ID
app.post("/api/admin/grant-credits/:userId", authMiddleware, adminMiddleware, async (c) => {
  try {
    const userId = c.req.param("userId");
    const body = await c.req.json();
    const { credits, reason } = body;

    if (!credits) {
      return c.json({ error: "Credits amount is required" }, 400);
    }

    // Get the user
    const user = await c.env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(userId).first();

    if (!user) {
      return c.json({ error: `User not found` }, 404);
    }

    // Grant the credits
    await c.env.DB.prepare(
      "UPDATE users SET lead_credits = lead_credits + ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(credits, userId).run();

    // Get updated user data
    const updatedUser = await c.env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(userId).first();

    console.log(`Admin granted ${credits} lead credits to user ${userId}. Reason: ${reason || 'Not specified'}`);

    return c.json({
      success: true,
      message: `Successfully granted ${credits} lead credits`,
      user: {
        id: updatedUser?.id,
        lead_credits: updatedUser?.lead_credits,
        plan_type: updatedUser?.plan_type,
        subscription_status: updatedUser?.subscription_status,
      },
    });
  } catch (error) {
    console.error("Error granting credits:", error);
    return c.json({ error: "Failed to grant credits" }, 500);
  }
});

// Admin helper endpoint to find user ID by email
app.post("/api/admin/find-user-by-email", authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    // Get all users (increased limit for better search coverage)
    const { results: users } = await c.env.DB.prepare(
      "SELECT id, mocha_user_id, business_name, plan_type, subscription_status, lead_credits, campaign_credits FROM users LIMIT 1000"
    ).all();

    console.log(`[Admin Find User] Searching for email: ${email} among ${users.length} users`);

    // Search through users to find matching email
    for (const user of users) {
      try {
        const mochaUserRes = await fetch(`${c.env.MOCHA_USERS_SERVICE_API_URL}/users/${(user as any).mocha_user_id}`, {
          headers: {
            'Authorization': `Bearer ${c.env.MOCHA_USERS_SERVICE_API_KEY}`,
          },
        });

        if (mochaUserRes.ok) {
          const contentType = mochaUserRes.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const mochaUser = await mochaUserRes.json() as { email: string; google_user_data: { name: string } };
            if (mochaUser.email.toLowerCase() === email.toLowerCase()) {
              console.log(`[Admin Find User] Found user: ${(user as any).id} with email: ${mochaUser.email}`);
              return c.json({
                found: true,
                user: {
                  id: (user as any).id,
                  mocha_user_id: (user as any).mocha_user_id,
                  email: mochaUser.email,
                  name: mochaUser.google_user_data?.name,
                  business_name: (user as any).business_name,
                  plan_type: (user as any).plan_type,
                  subscription_status: (user as any).subscription_status,
                  lead_credits: (user as any).lead_credits,
                  campaign_credits: (user as any).campaign_credits,
                },
              });
            }
          }
        }
      } catch (err) {
        console.error(`Error fetching user ${(user as any).mocha_user_id}:`, err);
      }
    }

    console.log(`[Admin Find User] No user found with email: ${email}`);
    return c.json({ found: false, error: `No user found with email ${email}` }, 404);
  } catch (error) {
    console.error("Error finding user:", error);
    return c.json({ error: "Failed to find user" }, 500);
  }
});

// Admin helper endpoint to find user by ID
app.post("/api/admin/find-user-by-id", authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { user_id } = body;

    if (!user_id) {
      return c.json({ error: "User ID is required" }, 400);
    }

    console.log(`[Admin Find User] Searching for user ID: ${user_id}`);

    // Get user directly by ID
    const user = await c.env.DB.prepare(
      "SELECT id, mocha_user_id, business_name, plan_type, subscription_status, lead_credits, campaign_credits FROM users WHERE id = ?"
    ).bind(user_id).first();

    if (!user) {
      console.log(`[Admin Find User] No user found with ID: ${user_id}`);
      return c.json({ found: false, error: `No user found with ID ${user_id}` }, 404);
    }

    // Try to fetch email from Mocha service
    let email = null;
    let name = null;
    try {
      const mochaUserRes = await fetch(`${c.env.MOCHA_USERS_SERVICE_API_URL}/users/${user.mocha_user_id}`, {
        headers: {
          'Authorization': `Bearer ${c.env.MOCHA_USERS_SERVICE_API_KEY}`,
        },
      });

      if (mochaUserRes.ok) {
        const contentType = mochaUserRes.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const mochaUser = await mochaUserRes.json() as { email: string; google_user_data: { name: string } };
          email = mochaUser.email;
          name = mochaUser.google_user_data?.name;
        }
      }
    } catch (err) {
      console.error(`Error fetching Mocha user data:`, err);
    }

    console.log(`[Admin Find User] Found user: ${user.id}`);
    return c.json({
      found: true,
      user: {
        id: user.id,
        mocha_user_id: user.mocha_user_id,
        email: email,
        name: name,
        business_name: user.business_name,
        plan_type: user.plan_type,
        subscription_status: user.subscription_status,
        lead_credits: user.lead_credits,
        campaign_credits: user.campaign_credits,
      },
    });
  } catch (error) {
    console.error("Error finding user by ID:", error);
    return c.json({ error: "Failed to find user" }, 500);
  }
});

// Use campaign credit endpoint
app.post("/api/billing/use-campaign-credit", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const campaignCredits = Number(appUser.campaign_credits) || 0;
  
  if (campaignCredits <= 0) {
    return c.json({ error: "No campaign credits available" }, 400);
  }

  try {
    await c.env.DB.prepare(
      "UPDATE users SET campaign_credits = campaign_credits - 1, updated_at = datetime('now') WHERE id = ?"
    ).bind(appUser.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to use campaign credit:", error);
    return c.json({ error: "Failed to use campaign credit" }, 500);
  }
});

// Check and update expired subscriptions
app.post("/api/billing/check-expiry", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  try {
    const now = new Date();
    
    // Check if plan has expired
    if (appUser.plan_expires_at && appUser.plan_type !== 'free') {
      const expiryDate = new Date(appUser.plan_expires_at as string);
      
      if (now > expiryDate && appUser.subscription_status !== 'expired') {
        // Update user status to expired
        await c.env.DB.prepare(
          "UPDATE users SET subscription_status = ?, updated_at = datetime('now') WHERE id = ?"
        ).bind('expired', appUser.id).run();

        // Pause all active campaigns
        await c.env.DB.prepare(
          "UPDATE campaigns SET status = ? WHERE user_id = ? AND status = ?"
        ).bind('paused', appUser.id, 'active').run();

        return c.json({ expired: true });
      }
    }

    return c.json({ expired: false });
  } catch (error) {
    console.error("Failed to check expiry:", error);
    return c.json({ error: "Failed to check expiry" }, 500);
  }
});

// Get users needing renewal reminders (for email service integration)
app.get("/api/admin/renewal-reminders", authMiddleware, adminMiddleware, async (c) => {
  try {
    const now = new Date();
    
    // Get users with subscriptions expiring in 3 days
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    // Get users with subscriptions expiring in 7 days  
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { results: expiringIn3Days } = await c.env.DB.prepare(
      `SELECT id, mocha_user_id, plan_type, plan_expires_at, subscription_status
       FROM users 
       WHERE plan_type != 'free' 
       AND subscription_status = 'active'
       AND plan_expires_at IS NOT NULL
       AND datetime(plan_expires_at) <= datetime(?)
       AND datetime(plan_expires_at) > datetime(?)`
    ).bind(threeDaysFromNow.toISOString(), now.toISOString()).all();

    const { results: expiringIn7Days } = await c.env.DB.prepare(
      `SELECT id, mocha_user_id, plan_type, plan_expires_at, subscription_status
       FROM users 
       WHERE plan_type != 'free' 
       AND subscription_status = 'active'
       AND plan_expires_at IS NOT NULL
       AND datetime(plan_expires_at) <= datetime(?)
       AND datetime(plan_expires_at) > datetime(?)`
    ).bind(sevenDaysFromNow.toISOString(), threeDaysFromNow.toISOString()).all();

    return c.json({
      expiring_in_3_days: expiringIn3Days,
      expiring_in_7_days: expiringIn7Days,
      total_reminders_needed: expiringIn3Days.length + expiringIn7Days.length,
    });
  } catch (error) {
    console.error("Failed to fetch renewal reminders:", error);
    return c.json({ error: "Failed to fetch renewal reminders" }, 500);
  }
});

// Dashboard stats
app.get("/api/dashboard/stats", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const campaignStats = await c.env.DB.prepare(
    "SELECT COUNT(*) as total_campaigns, SUM(spins_count) as total_spins, SUM(leads_count) as total_leads FROM campaigns WHERE user_id = ?"
  ).bind(appUser.id).first();

  return c.json({
    total_campaigns: campaignStats?.total_campaigns || 0,
    total_spins: campaignStats?.total_spins || 0,
    total_leads: campaignStats?.total_leads || 0,
  });
});

// Check if user has watermark removal entitlement
app.get("/api/billing/watermark-entitlement", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const hasEntitlement = await userHasWatermarkRemoval(appUser.id as string, c.env.DB);

  return c.json({
    has_watermark_removal: hasEntitlement,
  });
});

// Check if user has background image upload entitlement
app.get("/api/billing/background-image-entitlement", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const hasEntitlement = await userHasBackgroundImageUpload(appUser.id as string, c.env.DB);

  return c.json({
    has_background_image_upload: hasEntitlement,
  });
});

// Check if user has logo upload entitlement
app.get("/api/billing/logo-upload-entitlement", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const hasEntitlement = await userHasLogoUpload(appUser.id as string, c.env.DB);

  return c.json({
    has_logo_upload: hasEntitlement,
  });
});

// Check if user has external border entitlement
app.get("/api/billing/external-border-entitlement", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const hasEntitlement = await userHasExternalBorder(appUser.id as string, c.env.DB);

  return c.json({
    has_external_border: hasEntitlement,
  });
});

// Check if user has QR code entitlement
app.get("/api/billing/qr-code-entitlement", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const appUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (!appUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const hasEntitlement = await userHasQRCode(appUser.id as string, c.env.DB);

  return c.json({
    has_qr_code: hasEntitlement,
  });
});

// Helper function to get client IP
const getClientIP = (c: any): string => {
  return c.req.header("cf-connecting-ip") || 
         c.req.header("x-forwarded-for")?.split(',')[0] || 
         c.req.header("x-real-ip") || 
         "unknown";
};

// Helper function to determine campaign status based on dates
const getCampaignDateState = (campaign: any): { 
  enforcedStatus: string; 
  canActivate: boolean; 
  canPause: boolean;
  canEnd: boolean;
  reason?: string;
} => {
  const currentStatus = campaign.status as string;
  
  // If no dates set, allow all transitions
  if (!campaign.start_datetime || !campaign.end_datetime) {
    return { 
      enforcedStatus: currentStatus,
      canActivate: true,
      canPause: true,
      canEnd: true,
    };
  }

  const now = new Date();
  const startDate = new Date(campaign.start_datetime as string);
  const endDate = new Date(campaign.end_datetime as string);

  // Rule A: Campaign has ended
  if (now > endDate) {
    return { 
      enforcedStatus: "ended",
      canActivate: false,
      canPause: false,
      canEnd: true,
      reason: "Campaign has ended because the end date has passed"
    };
  }

  // Rule B: Campaign starts in future (scheduled)
  if (now < startDate) {
    return { 
      enforcedStatus: currentStatus,
      canActivate: true, // Can set to active (means scheduled)
      canPause: false,   // Cannot pause a scheduled campaign
      canEnd: false,     // Cannot end a campaign that hasn't started
      reason: "Campaign is scheduled to start in the future"
    };
  }

  // Rule C: Campaign is currently live (between start and end dates)
  return { 
    enforcedStatus: currentStatus,
    canActivate: true,
    canPause: true,
    canEnd: true,
  };
};

// Public campaign routes (no auth required)
// Fetch campaign by ID (primary public URL)
app.get("/api/public/campaigns/by-id/:id", async (c) => {
  const campaignId = c.req.param("id");
  const campaign = await c.env.DB.prepare(
    `SELECT c.*, u.business_name 
     FROM campaigns c 
     LEFT JOIN users u ON c.user_id = u.id 
     WHERE c.id = ?`
  ).bind(campaignId).first();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  // RULE 1: If not published, force status to draft and block participation
  if (!campaign.is_published || campaign.is_published === 0) {
    return c.json({
      ...campaign,
      status: "draft",
      lead_form_fields: JSON.parse(campaign.lead_form_fields as string),
      wheel_segments: JSON.parse(campaign.wheel_segments as string),
      wheel_colors: JSON.parse(campaign.wheel_colors as string),
      sound_settings: campaign.sound_settings ? JSON.parse(campaign.sound_settings as string) : { spin: true, win: true, noWin: true },
      valid_countries: campaign.valid_countries ? JSON.parse(campaign.valid_countries as string) : [],
      terms_conditions: campaign.terms_conditions || null,
      privacy_policy: campaign.privacy_policy || null,
      is_lead_form_required: campaign.is_lead_form_required === 1,
      confetti_enabled: campaign.confetti_enabled === 1,
      sound_enabled: campaign.sound_enabled === 1,
      spin_button_pulse_enabled: campaign.spin_button_pulse_enabled === 1,
      border_enabled: campaign.border_enabled === 1,
      border_default_enabled: campaign.border_default_enabled === 1,
      border_custom_colors: campaign.border_custom_colors ? JSON.parse(campaign.border_custom_colors as string) : [],
      border_connector_ring_enabled: campaign.border_connector_ring_enabled === 1,
      show_watermark: campaign.show_watermark === 1,
      is_published: false,
    });
  }

  // RULE 2: If published, determine status based on dates
  let currentStatus = campaign.status as string;
  const now = new Date();
  const startDate = campaign.start_datetime ? new Date(campaign.start_datetime as string) : null;
  const endDate = campaign.end_datetime ? new Date(campaign.end_datetime as string) : null;

  // Auto-update status based on current time and dates
  if (endDate && now > endDate) {
    currentStatus = "ended";
    if (campaign.status !== "ended") {
      await c.env.DB.prepare(
        "UPDATE campaigns SET status = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind("ended", campaign.id).run();
    }
  } else if (startDate && now < startDate && campaign.status === "active") {
    // Status is active but campaign hasn't started - it's scheduled
    currentStatus = "draft"; // Display as draft (scheduled)
  }

  return c.json({
    ...campaign,
    status: currentStatus,
    lead_form_fields: JSON.parse(campaign.lead_form_fields as string),
    wheel_segments: JSON.parse(campaign.wheel_segments as string),
    wheel_colors: JSON.parse(campaign.wheel_colors as string),
    sound_settings: campaign.sound_settings ? JSON.parse(campaign.sound_settings as string) : { spin: true, win: true, noWin: true },
    valid_countries: campaign.valid_countries ? JSON.parse(campaign.valid_countries as string) : [],
    terms_conditions: campaign.terms_conditions || null,
    privacy_policy: campaign.privacy_policy || null,
    is_lead_form_required: campaign.is_lead_form_required === 1,
    confetti_enabled: campaign.confetti_enabled === 1,
    sound_enabled: campaign.sound_enabled === 1,
    spin_button_pulse_enabled: campaign.spin_button_pulse_enabled === 1,
    border_enabled: campaign.border_enabled === 1,
    border_default_enabled: campaign.border_default_enabled === 1,
    border_custom_colors: campaign.border_custom_colors ? JSON.parse(campaign.border_custom_colors as string) : [],
    border_connector_ring_enabled: campaign.border_connector_ring_enabled === 1,
    show_watermark: campaign.show_watermark === 1,
    is_published: campaign.is_published === 1,
  });
});

// Fetch campaign by slug (PREVIEW/SANDBOX URL - no status restrictions)
app.get("/api/public/campaigns/:slug", async (c) => {
  const slug = c.req.param("slug");
  const campaign = await c.env.DB.prepare(
    `SELECT c.*, u.business_name 
     FROM campaigns c 
     LEFT JOIN users u ON c.user_id = u.id 
     WHERE c.public_slug = ?`
  ).bind(slug).first();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  // PREVIEW MODE: Return campaign regardless of status/dates for testing
  return c.json({
    ...campaign,
    status: campaign.status,
    lead_form_fields: JSON.parse(campaign.lead_form_fields as string),
    wheel_segments: JSON.parse(campaign.wheel_segments as string),
    wheel_colors: JSON.parse(campaign.wheel_colors as string),
    sound_settings: campaign.sound_settings ? JSON.parse(campaign.sound_settings as string) : { spin: true, win: true, noWin: true },
    valid_countries: campaign.valid_countries ? JSON.parse(campaign.valid_countries as string) : [],
    terms_conditions: campaign.terms_conditions || null,
    privacy_policy: campaign.privacy_policy || null,
    is_lead_form_required: campaign.is_lead_form_required === 1,
    confetti_enabled: campaign.confetti_enabled === 1,
    sound_enabled: campaign.sound_enabled === 1,
    spin_button_pulse_enabled: campaign.spin_button_pulse_enabled === 1,
    border_enabled: campaign.border_enabled === 1,
    border_default_enabled: campaign.border_default_enabled === 1,
    border_custom_colors: campaign.border_custom_colors ? JSON.parse(campaign.border_custom_colors as string) : [],
    border_connector_ring_enabled: campaign.border_connector_ring_enabled === 1,
    show_watermark: campaign.show_watermark === 1,
    is_published: campaign.is_published === 1,
  });
});

// By ID endpoints
app.post("/api/public/campaigns/by-id/:id/leads", async (c) => {
  const campaignId = c.req.param("id");
  const campaign = await c.env.DB.prepare(
    `SELECT c.*, u.lead_credits, u.plan_type, u.subscription_status 
     FROM campaigns c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.id = ?`
  ).bind(campaignId).first();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  // RULE 1: Block if not published
  if (!campaign.is_published || campaign.is_published === 0) {
    return c.json({ error: "This campaign is not live yet." }, 403);
  }

  // Check campaign status and enforce date rules
  const dateState = getCampaignDateState(campaign);
  const currentStatus = dateState.enforcedStatus === "ended" ? "ended" : campaign.status as string;
  
  if (currentStatus !== "active") {
    if (currentStatus === "ended") {
      return c.json({ error: "This campaign has ended" }, 403);
    } else if (currentStatus === "paused") {
      return c.json({ error: "This campaign is currently paused" }, 403);
    } else {
      return c.json({ error: "This campaign is not active" }, 403);
    }
  }

  const body = await c.req.json();
  
  // Check if lead already exists (unique by email per campaign)
  const existingLead = await c.env.DB.prepare(
    "SELECT * FROM leads WHERE campaign_id = ? AND email = ?"
  ).bind(campaign.id, body.email).first();

  if (existingLead) {
    return c.json({ success: true, id: existingLead.id, existing: true });
  }

  // Check if user has lead credits or active subscription
  const userPlanType = campaign.plan_type as string;
  const userSubscriptionStatus = campaign.subscription_status as string;
  const userLeadCredits = Number(campaign.lead_credits) || 0;

  // Free users without credits cannot capture leads
  if (userPlanType === 'free' && userLeadCredits <= 0) {
    return c.json({ 
      error: "Lead credits exhausted. Please upgrade your plan or purchase lead credits to continue capturing leads.",
      credits_exhausted: true
    }, 403);
  }
  
  // Paid users with expired subscription and no credits cannot capture leads
  if (userPlanType !== 'free' && userSubscriptionStatus === 'expired' && userLeadCredits <= 0) {
    return c.json({ 
      error: "Your subscription has expired and you have no lead credits. Please renew your subscription or purchase lead credits.",
      credits_exhausted: true
    }, 403);
  }

  const leadId = nanoid();

  try {
    await c.env.DB.prepare(
      `INSERT INTO leads (id, campaign_id, name, email, phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      leadId,
      campaign.id,
      body.name || null,
      body.email,
      body.phone || null
    ).run();

    // Increment leads count
    await c.env.DB.prepare(
      "UPDATE campaigns SET leads_count = leads_count + 1, updated_at = datetime('now') WHERE id = ?"
    ).bind(campaign.id).run();

    // Deduct lead credit if user is on free plan or has expired subscription
    if ((userPlanType === 'free' || userSubscriptionStatus === 'expired') && userLeadCredits > 0) {
      await c.env.DB.prepare(
        "UPDATE users SET lead_credits = lead_credits - 1, updated_at = datetime('now') WHERE id = ?"
      ).bind(campaign.user_id).run();
    }

    // Track analytics event
    const analyticsId = nanoid();
    await c.env.DB.prepare(
      `INSERT INTO campaign_analytics (id, campaign_id, event_type, event_data, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      analyticsId,
      campaign.id,
      "lead",
      JSON.stringify({ email: body.email })
    ).run();

    console.log(`Lead created: ${leadId}, Analytics event created for campaign: ${campaign.id}`);
  } catch (error) {
    console.error("Error creating lead:", error);
    return c.json({ error: "Failed to create lead" }, 500);
  }

  return c.json({ success: true, id: leadId });
});

// By slug endpoints (PREVIEW MODE - NO DATA TRACKING)
app.post("/api/public/campaigns/:slug/leads", async (c) => {
  // PREVIEW MODE: Do not create leads or track analytics
  // Just return success to allow preview to function
  return c.json({ success: true, id: "preview-mode", preview: true });
});

// By ID
app.post("/api/public/campaigns/by-id/:id/check-spin", async (c) => {
  const campaignId = c.req.param("id");
  const campaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ?"
  ).bind(campaignId).first();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  // RULE 1: Block if not published
  if (!campaign.is_published || campaign.is_published === 0) {
    return c.json({ 
      can_spin: false,
      message: "This campaign is not live yet. Please check back later."
    });
  }

  // Check campaign status and enforce date rules
  const dateState = getCampaignDateState(campaign);
  const currentStatus = dateState.enforcedStatus === "ended" ? "ended" : campaign.status as string;
  
  if (currentStatus !== "active") {
    if (currentStatus === "ended") {
      return c.json({ 
        can_spin: false,
        message: "This campaign has ended." 
      });
    } else if (currentStatus === "paused") {
      return c.json({ 
        can_spin: false,
        message: "This campaign is currently paused." 
      });
    } else {
      return c.json({ 
        can_spin: false,
        message: "This campaign is not active." 
      });
    }
  }

  const body = await c.req.json();
  const ipAddress = getClientIP(c);
  const now = new Date();

  try {
    // Check total campaign limit
    const spinsCount = Number(campaign.spins_count);
    if (campaign.spin_limit_total && spinsCount >= Number(campaign.spin_limit_total)) {
      return c.json({ 
        can_spin: false, 
        message: "This campaign has reached its total spin limit." 
      });
    }

    // Check email limit
    if (campaign.spin_limit_per_email && body.email) {
      const emailTracking = await c.env.DB.prepare(
        "SELECT spin_count FROM spin_tracking WHERE campaign_id = ? AND email = ?"
      ).bind(campaign.id, body.email).first();
      
      if (emailTracking && Number(emailTracking.spin_count) >= Number(campaign.spin_limit_per_email)) {
        return c.json({ 
          can_spin: false, 
          message: "You have reached the maximum spins allowed for this email address." 
        });
      }
    }

    // Check phone limit
    if (campaign.spin_limit_per_phone && body.phone) {
      const phoneTracking = await c.env.DB.prepare(
        "SELECT spin_count FROM spin_tracking WHERE campaign_id = ? AND phone = ?"
      ).bind(campaign.id, body.phone).first();
      
      if (phoneTracking && Number(phoneTracking.spin_count) >= Number(campaign.spin_limit_per_phone)) {
        return c.json({ 
          can_spin: false, 
          message: "You have reached the maximum spins allowed for this phone number." 
        });
      }
    }

    // Check IP limit
    if (campaign.spin_limit_per_ip && ipAddress !== "unknown") {
      const ipTracking = await c.env.DB.prepare(
        "SELECT spin_count FROM spin_tracking WHERE campaign_id = ? AND ip_address = ?"
      ).bind(campaign.id, ipAddress).first();
      
      if (ipTracking && Number(ipTracking.spin_count) >= Number(campaign.spin_limit_per_ip)) {
        return c.json({ 
          can_spin: false, 
          message: "You have reached the maximum spins allowed from this location." 
        });
      }
    }

    // Check device limit
    if (campaign.spin_limit_per_device && body.device_fingerprint) {
      const deviceTracking = await c.env.DB.prepare(
        "SELECT spin_count FROM spin_tracking WHERE campaign_id = ? AND device_fingerprint = ?"
      ).bind(campaign.id, body.device_fingerprint).first();
      
      if (deviceTracking && Number(deviceTracking.spin_count) >= Number(campaign.spin_limit_per_device)) {
        return c.json({ 
          can_spin: false, 
          message: "You have reached the maximum spins allowed on this device." 
        });
      }
    }

    // Check cooldown period
    if (campaign.spin_cooldown_hours) {
      const identifiers = [
        body.email && `email = '${body.email}'`,
        body.phone && `phone = '${body.phone}'`,
        ipAddress !== "unknown" && `ip_address = '${ipAddress}'`,
        body.device_fingerprint && `device_fingerprint = '${body.device_fingerprint}'`,
      ].filter(Boolean).join(' OR ');

      if (identifiers) {
        const lastSpin = await c.env.DB.prepare(
          `SELECT last_spin_at FROM spin_tracking 
           WHERE campaign_id = ? AND (${identifiers})
           ORDER BY last_spin_at DESC LIMIT 1`
        ).bind(campaign.id).first();

        if (lastSpin) {
          const lastSpinTime = new Date(lastSpin.last_spin_at as string);
          const hoursSinceLastSpin = (now.getTime() - lastSpinTime.getTime()) / (1000 * 60 * 60);
          const cooldownHours = Number(campaign.spin_cooldown_hours);
          
          if (hoursSinceLastSpin < cooldownHours) {
            const hoursRemaining = Math.ceil(cooldownHours - hoursSinceLastSpin);
            return c.json({ 
              can_spin: false, 
              message: `Please wait ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} before spinning again.` 
            });
          }
        }
      }
    }

    // Check daily limit
    if (campaign.spin_limit_per_day) {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const identifiers = [
        body.email && `email = '${body.email}'`,
        body.phone && `phone = '${body.phone}'`,
        ipAddress !== "unknown" && `ip_address = '${ipAddress}'`,
        body.device_fingerprint && `device_fingerprint = '${body.device_fingerprint}'`,
      ].filter(Boolean).join(' OR ');

      if (identifiers) {
        const todaySpins = await c.env.DB.prepare(
          `SELECT COUNT(*) as count FROM spin_tracking 
           WHERE campaign_id = ? AND (${identifiers})
           AND last_spin_at >= datetime('${todayStart.toISOString()}')`
        ).bind(campaign.id).first();

        if (todaySpins && (todaySpins as any).count >= campaign.spin_limit_per_day) {
          return c.json({ 
            can_spin: false, 
            message: "You have reached the daily spin limit. Try again tomorrow!" 
          });
        }
      }
    }

    // Check weekly limit
    if (campaign.spin_limit_per_week) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const identifiers = [
        body.email && `email = '${body.email}'`,
        body.phone && `phone = '${body.phone}'`,
        ipAddress !== "unknown" && `ip_address = '${ipAddress}'`,
        body.device_fingerprint && `device_fingerprint = '${body.device_fingerprint}'`,
      ].filter(Boolean).join(' OR ');

      if (identifiers) {
        const weekSpins = await c.env.DB.prepare(
          `SELECT COUNT(*) as count FROM spin_tracking 
           WHERE campaign_id = ? AND (${identifiers})
           AND last_spin_at >= datetime('${weekStart.toISOString()}')`
        ).bind(campaign.id).first();

        if (weekSpins && (weekSpins as any).count >= campaign.spin_limit_per_week) {
          return c.json({ 
            can_spin: false, 
            message: "You have reached the weekly spin limit. Try again next week!" 
          });
        }
      }
    }

    return c.json({ can_spin: true });
  } catch (error) {
    console.error("Error checking spin limits:", error);
    return c.json({ error: "Failed to check spin limits" }, 500);
  }
});

// By slug (PREVIEW MODE - always allow spin)
app.post("/api/public/campaigns/:slug/check-spin", async (c) => {
  // PREVIEW MODE: Always allow spin for testing purposes
  return c.json({ can_spin: true, preview: true });
});

// By ID
app.post("/api/public/campaigns/by-id/:id/spin", async (c) => {
  const campaignId = c.req.param("id");
  const campaign = await c.env.DB.prepare(
    "SELECT * FROM campaigns WHERE id = ?"
  ).bind(campaignId).first();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  // RULE 1: Block if not published
  if (!campaign.is_published || campaign.is_published === 0) {
    return c.json({ error: "This campaign is not live yet." }, 403);
  }

  // Check campaign status and enforce date rules
  const dateState = getCampaignDateState(campaign);
  const currentStatus = dateState.enforcedStatus === "ended" ? "ended" : campaign.status as string;
  
  if (currentStatus !== "active") {
    return c.json({ error: "This campaign is not active" }, 403);
  }

  const body = await c.req.json();
  const ipAddress = getClientIP(c);

  try {
    // Update prize won if email provided
    if (body.email && body.prize) {
      await c.env.DB.prepare(
        "UPDATE leads SET prize_won = ?, updated_at = datetime('now') WHERE campaign_id = ? AND email = ? AND prize_won IS NULL"
      ).bind(body.prize, campaign.id, body.email).run();
    }

    // Track spin for limits
    const trackingData = {
      email: body.email || null,
      phone: body.phone || null,
      ip_address: ipAddress !== "unknown" ? ipAddress : null,
      device_fingerprint: body.device_fingerprint || null,
    };

    // Update or create tracking records
    for (const [key, value] of Object.entries(trackingData)) {
      if (value) {
        const existing = await c.env.DB.prepare(
          `SELECT id, spin_count FROM spin_tracking WHERE campaign_id = ? AND ${key} = ?`
        ).bind(campaign.id, value).first();

        if (existing) {
          await c.env.DB.prepare(
            `UPDATE spin_tracking SET 
             spin_count = spin_count + 1, 
             last_spin_at = datetime('now'),
             updated_at = datetime('now')
             WHERE id = ?`
          ).bind(existing.id).run();
        } else {
          const trackingId = nanoid();
          await c.env.DB.prepare(
            `INSERT INTO spin_tracking (
              id, campaign_id, ${key}, last_spin_at, spin_count, created_at, updated_at
            ) VALUES (?, ?, ?, datetime('now'), 1, datetime('now'), datetime('now'))`
          ).bind(trackingId, campaign.id, value).run();
        }
      }
    }

    // Increment spins count
    await c.env.DB.prepare(
      "UPDATE campaigns SET spins_count = spins_count + 1, updated_at = datetime('now') WHERE id = ?"
    ).bind(campaign.id).run();

    // Track analytics event
    const analyticsId = nanoid();
    await c.env.DB.prepare(
      `INSERT INTO campaign_analytics (id, campaign_id, event_type, event_data, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      analyticsId,
      campaign.id,
      "spin",
      JSON.stringify({ prize: body.prize, email: body.email || null })
    ).run();

    console.log(`Spin recorded: Analytics event created for campaign: ${campaign.id}, prize: ${body.prize}`);
  } catch (error) {
    console.error("Error recording spin:", error);
    return c.json({ error: "Failed to record spin" }, 500);
  }

  return c.json({ success: true });
});

// By slug (PREVIEW MODE - NO DATA TRACKING)
app.post("/api/public/campaigns/:slug/spin", async (c) => {
  // PREVIEW MODE: Do not record spins or track analytics
  // Just return success to allow preview to function
  return c.json({ success: true, preview: true });
});

// By ID
app.post("/api/public/campaigns/by-id/:id/claim-prize", async (c) => {
  const campaignId = c.req.param("id");
  const campaign = await c.env.DB.prepare(
    `SELECT c.*, u.lead_credits, u.plan_type, u.subscription_status 
     FROM campaigns c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.id = ?`
  ).bind(campaignId).first();

  if (!campaign) {
    return c.json({ error: "Campaign not found" }, 404);
  }

  // RULE 1: Block if not published
  if (!campaign.is_published || campaign.is_published === 0) {
    return c.json({ error: "This campaign is not live yet." }, 403);
  }

  // Check campaign status and enforce date rules
  const dateState = getCampaignDateState(campaign);
  const currentStatus = dateState.enforcedStatus === "ended" ? "ended" : campaign.status as string;
  
  if (currentStatus !== "active") {
    if (currentStatus === "ended") {
      return c.json({ error: "This campaign has ended" }, 403);
    } else {
      return c.json({ error: "This campaign is not active" }, 403);
    }
  }

  const body = await c.req.json();

  // Check if user has lead credits or active subscription
  const userPlanType = campaign.plan_type as string;
  const userSubscriptionStatus = campaign.subscription_status as string;
  const userLeadCredits = Number(campaign.lead_credits) || 0;
  
  // Check if lead already exists
  const existingLead = await c.env.DB.prepare(
    "SELECT * FROM leads WHERE campaign_id = ? AND email = ?"
  ).bind(campaign.id, body.email).first();

  // Only enforce credit check for new leads
  if (!existingLead) {
    // Free users without credits cannot capture leads
    if (userPlanType === 'free' && userLeadCredits <= 0) {
      return c.json({ 
        error: "Lead credits exhausted. Please upgrade your plan or purchase lead credits to continue capturing leads.",
        credits_exhausted: true
      }, 403);
    }
    
    // Paid users with expired subscription and no credits cannot capture leads
    if (userPlanType !== 'free' && userSubscriptionStatus === 'expired' && userLeadCredits <= 0) {
      return c.json({ 
        error: "Your subscription has expired and you have no lead credits. Please renew your subscription or purchase lead credits.",
        credits_exhausted: true
      }, 403);
    }
  }

  try {
    // Generate unique reference number
    const referenceNumber = `${campaignId.substring(0, 8).toUpperCase()}-${nanoid(8).toUpperCase()}`;
    
    // Calculate redemption expiry date
    // Use the earlier of: redemption_expiry_days OR campaign end_datetime
    const redemptionExpiryDays = Number(campaign.redemption_expiry_days) || 7;
    const calculatedExpiry = new Date();
    calculatedExpiry.setDate(calculatedExpiry.getDate() + redemptionExpiryDays);
    
    let redemptionExpiresAt = calculatedExpiry.toISOString();
    
    // If campaign has an end date, use the earlier of the two dates
    if (campaign.end_datetime) {
      const campaignEndDate = new Date(campaign.end_datetime as string);
      if (campaignEndDate < calculatedExpiry) {
        redemptionExpiresAt = campaignEndDate.toISOString();
      }
    }

    if (existingLead) {
      // Update existing lead with claim information
      await c.env.DB.prepare(
        `UPDATE leads SET 
          name = ?,
          phone = ?,
          prize_won = ?,
          reference_number = ?,
          redemption_expires_at = ?,
          updated_at = datetime('now')
        WHERE id = ?`
      ).bind(
        body.name || null,
        body.phone || null,
        body.prize,
        referenceNumber,
        redemptionExpiresAt,
        existingLead.id
      ).run();
    } else {
      // Create new lead with claim information
      const leadId = nanoid();
      await c.env.DB.prepare(
        `INSERT INTO leads (
          id, campaign_id, name, email, phone, prize_won, 
          reference_number, redemption_expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).bind(
        leadId,
        campaign.id,
        body.name || null,
        body.email,
        body.phone || null,
        body.prize,
        referenceNumber,
        redemptionExpiresAt
      ).run();

      // Increment leads count if this is a new lead
      await c.env.DB.prepare(
        "UPDATE campaigns SET leads_count = leads_count + 1, updated_at = datetime('now') WHERE id = ?"
      ).bind(campaign.id).run();

      // Deduct lead credit if user is on free plan or has expired subscription
      if ((userPlanType === 'free' || userSubscriptionStatus === 'expired') && userLeadCredits > 0) {
        await c.env.DB.prepare(
          "UPDATE users SET lead_credits = lead_credits - 1, updated_at = datetime('now') WHERE id = ?"
        ).bind(campaign.user_id).run();
      }

      // Send prize confirmation email to participant (async, don't wait)
      const expiryDate = new Date(redemptionExpiresAt);
      sendEmail(
        body.email,
        'reward_confirmation_participant',
        {
          participant_name: body.name || 'Winner',
          prize_name: body.prize,
          business_name: campaign.business_name as string || 'PromoGuage',
          reference_number: referenceNumber,
          expiry_date: expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          redemption_instructions: campaign.redemption_instructions as string || 'Please contact the business to claim your prize.',
        },
        c.env
      ).then(sent => {
        if (sent) {
          console.log(`[Claim Prize] Confirmation email sent to ${body.email}`);
        }
      }).catch(err => console.error('[Claim Prize] Confirmation email error:', err));
    }

    return c.json({
      success: true,
      reference_number: referenceNumber,
      redemption_expires_at: redemptionExpiresAt,
    });
  } catch (error) {
    console.error("Error claiming prize:", error);
    return c.json({ error: "Failed to claim prize" }, 500);
  }
});

// By slug (PREVIEW MODE - NO DATA TRACKING)
app.post("/api/public/campaigns/:slug/claim-prize", async (c) => {
  // PREVIEW MODE: Do not create leads or track analytics
  // But calculate accurate redemption expiry based on campaign settings
  const slug = c.req.param("slug");
  const campaign = await c.env.DB.prepare(
    "SELECT redemption_expiry_days, end_datetime FROM campaigns WHERE public_slug = ?"
  ).bind(slug).first();

  const mockReferenceNumber = `PREVIEW-${nanoid(8).toUpperCase()}`;
  
  // Calculate redemption expiry the same way as production
  const redemptionExpiryDays = campaign ? (Number(campaign.redemption_expiry_days) || 7) : 7;
  const calculatedExpiry = new Date();
  calculatedExpiry.setDate(calculatedExpiry.getDate() + redemptionExpiryDays);
  
  let redemptionExpiresAt = calculatedExpiry.toISOString();
  
  // If campaign has an end date, use the earlier of the two dates
  if (campaign?.end_datetime) {
    const campaignEndDate = new Date(campaign.end_datetime as string);
    if (campaignEndDate < calculatedExpiry) {
      redemptionExpiresAt = campaignEndDate.toISOString();
    }
  }
  
  return c.json({
    success: true,
    reference_number: mockReferenceNumber,
    redemption_expires_at: redemptionExpiresAt,
    preview: true,
  });
});

// Catch-all route for client-side routing - serves React app for non-API routes
app.get("*", async (c) => {
  // Don't interfere with API routes
  if (c.req.path.startsWith("/api/")) {
    return c.notFound();
  }

  // Serve index.html for all other routes (let React Router handle client-side routing)
  try {
    const indexHtml = await fetch(new URL("/index.html", c.req.url).toString());
    return c.html(await indexHtml.text());
  } catch (error) {
    console.error("Error serving index.html:", error);
    return c.text("Error loading application", 500);
  }
});

// Scheduled event handler for automated renewal reminders
export default {
  fetch: app.fetch,
  
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    console.log("Starting scheduled renewal reminder task...");
    
    try {
      // Check if email integration is configured
      const emailSettings = await env.DB.prepare(
        "SELECT * FROM email_integration_settings WHERE provider = 'mailgun' AND is_active = 1"
      ).first();

      if (!emailSettings) {
        console.log("Email integration not configured. Skipping renewal reminders.");
        return;
      }

      // Get renewal reminder template
      const template = await env.DB.prepare(
        "SELECT * FROM email_templates WHERE template_name = 'renewal_reminder'"
      ).first();

      if (!template) {
        console.log("Renewal reminder template not found. Skipping.");
        return;
      }

      const now = new Date();
      const results = {
        three_day_sent: 0,
        three_day_errors: 0,
        seven_day_sent: 0,
        seven_day_errors: 0,
      };

      // Process 3-day expiry reminders
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      const threeDaysEnd = new Date(threeDaysFromNow);
      threeDaysEnd.setDate(threeDaysEnd.getDate() + 1);

      const { results: expiringIn3Days } = await env.DB.prepare(
        `SELECT * FROM users
         WHERE plan_type != 'free' 
         AND subscription_status = 'active'
         AND plan_expires_at IS NOT NULL
         AND datetime(plan_expires_at) >= datetime(?)
         AND datetime(plan_expires_at) < datetime(?)`
      ).bind(threeDaysFromNow.toISOString(), threeDaysEnd.toISOString()).all();

      console.log(`Found ${expiringIn3Days.length} users with subscriptions expiring in 3 days`);

      for (const user of expiringIn3Days) {
        const sent = await sendRenewalEmail(user as any, 3, emailSettings, template, env);
        if (sent) {
          results.three_day_sent++;
        } else {
          results.three_day_errors++;
        }
      }

      // Process 7-day expiry reminders
      const sevenDaysFromNow = new Date(now);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const sevenDaysEnd = new Date(sevenDaysFromNow);
      sevenDaysEnd.setDate(sevenDaysEnd.getDate() + 1);

      const { results: expiringIn7Days } = await env.DB.prepare(
        `SELECT * FROM users
         WHERE plan_type != 'free' 
         AND subscription_status = 'active'
         AND plan_expires_at IS NOT NULL
         AND datetime(plan_expires_at) >= datetime(?)
         AND datetime(plan_expires_at) < datetime(?)`
      ).bind(sevenDaysFromNow.toISOString(), sevenDaysEnd.toISOString()).all();

      console.log(`Found ${expiringIn7Days.length} users with subscriptions expiring in 7 days`);

      for (const user of expiringIn7Days) {
        const sent = await sendRenewalEmail(user as any, 7, emailSettings, template, env);
        if (sent) {
          results.seven_day_sent++;
        } else {
          results.seven_day_errors++;
        }
      }

      console.log("Renewal reminder task completed:", results);
      console.log(`Total sent: ${results.three_day_sent + results.seven_day_sent}`);
      console.log(`Total errors: ${results.three_day_errors + results.seven_day_errors}`);

    } catch (error) {
      console.error("Error in scheduled renewal reminder task:", error);
    }
  }
};

// Helper function to send renewal email
async function sendRenewalEmail(
  userData: any,
  daysBeforeExpiry: number,
  emailSettings: any,
  template: any,
  env: Env
): Promise<boolean> {
  try {
    // Fetch Mocha user data to get email
    const mochaUserRes = await fetch(`${env.MOCHA_USERS_SERVICE_API_URL}/users/${userData.mocha_user_id}`, {
      headers: {
        'Authorization': `Bearer ${env.MOCHA_USERS_SERVICE_API_KEY}`,
      },
    });

    if (!mochaUserRes.ok) {
      console.error(`Failed to fetch email for user ${userData.id}`);
      return false;
    }

    const mochaUser = await mochaUserRes.json() as { email: string };
    const userEmail = mochaUser.email;

    if (!userEmail) {
      console.error(`User ${userData.id} has no email`);
      return false;
    }

    const expiryDate = new Date(userData.plan_expires_at);
    
    // Replace template variables
    let htmlBody = (template.html_body as string)
      .replace(/\{\{user_name\}\}/g, userData.full_name || 'Valued Customer')
      .replace(/\{\{plan_name\}\}/g, userData.plan_type.charAt(0).toUpperCase() + userData.plan_type.slice(1))
      .replace(/\{\{expiry_date\}\}/g, expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
      .replace(/\{\{days_remaining\}\}/g, daysBeforeExpiry.toString())
      .replace(/\{\{renewal_link\}\}/g, 'https://promoguage.mocha.app/pricing');

    let textBody = (template.text_body as string)
      .replace(/\{\{user_name\}\}/g, userData.full_name || 'Valued Customer')
      .replace(/\{\{plan_name\}\}/g, userData.plan_type.charAt(0).toUpperCase() + userData.plan_type.slice(1))
      .replace(/\{\{expiry_date\}\}/g, expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
      .replace(/\{\{days_remaining\}\}/g, daysBeforeExpiry.toString())
      .replace(/\{\{renewal_link\}\}/g, 'https://promoguage.mocha.app/pricing');

    let subject = (template.subject as string)
      .replace(/\{\{user_name\}\}/g, userData.full_name || 'Valued Customer')
      .replace(/\{\{plan_name\}\}/g, userData.plan_type.charAt(0).toUpperCase() + userData.plan_type.slice(1))
      .replace(/\{\{expiry_date\}\}/g, expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
      .replace(/\{\{days_remaining\}\}/g, daysBeforeExpiry.toString());

    // Determine Mailgun API endpoint
    const apiDomain = emailSettings.api_domain as string;
    const mailgunUrl = `https://api.mailgun.net/v3/${apiDomain}/messages`;

    // Send via Mailgun
    const formData = new FormData();
    formData.append('from', `${emailSettings.sender_name} <${emailSettings.sender_email}>`);
    formData.append('to', userEmail);
    formData.append('subject', subject);
    formData.append('html', htmlBody);
    formData.append('text', textBody);

    const mailgunRes = await fetch(mailgunUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${emailSettings.api_key}`)}`,
      },
      body: formData,
    });

    if (mailgunRes.ok) {
      console.log(`Sent ${daysBeforeExpiry}-day renewal reminder to ${userEmail}`);
      return true;
    } else {
      const errorData = await mailgunRes.text();
      console.error(`Failed to send email to ${userEmail}:`, errorData);
      return false;
    }
  } catch (error) {
    console.error(`Error sending renewal email to user ${userData.id}:`, error);
    return false;
  }
}
