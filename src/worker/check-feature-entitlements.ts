type D1Database = any;

/**
 * Check if user has entitlement to upload background images
 */
export async function userHasBackgroundImageUpload(userId: string, db: D1Database): Promise<boolean> {
  try {
    // Get user's current plan
    const user = await db.prepare(
      "SELECT plan_type, currency, subscription_status, plan_expires_at, has_global_premium_borders, premium_unlock_expiry FROM users WHERE id = ?"
    ).bind(userId).first();

    if (!user) {
      return false;
    }

    // Check if user has global premium borders (which includes all premium features)
    if (user.has_global_premium_borders === 1) {
      // Check if premium unlock has not expired
      if (user.premium_unlock_expiry) {
        const expiryDate = new Date(user.premium_unlock_expiry as string);
        if (new Date() <= expiryDate) {
          return true;
        }
      }
    }

    // Free users don't have access to background image upload
    if (user.plan_type === 'free') {
      return false;
    }

    // Check if user has active subscription
    if (user.subscription_status !== 'active') {
      return false;
    }

    // Check if subscription has expired
    if (user.plan_expires_at) {
      const expiryDate = new Date(user.plan_expires_at as string);
      if (new Date() > expiryDate) {
        return false;
      }
    }

    // Get the user's billing plan to check feature flags
    // Match by plan name AND currency to get the correct plan
    const userCurrency = user.currency as string || 'USD';
    const plan = await db.prepare(
      "SELECT allow_background_image FROM billing_plans WHERE plan_type = 'subscription' AND name LIKE ? AND currency = ? AND is_active = 1 LIMIT 1"
    ).bind(`%${(user.plan_type as string).charAt(0).toUpperCase() + (user.plan_type as string).slice(1)}%`, userCurrency).first();

    return plan?.allow_background_image === 1;
  } catch (error) {
    console.error("Error checking background image entitlement:", error);
    return false;
  }
}

/**
 * Check if user has entitlement to upload logos
 */
export async function userHasLogoUpload(userId: string, db: D1Database): Promise<boolean> {
  try {
    // Get user's current plan
    const user = await db.prepare(
      "SELECT plan_type, currency, subscription_status, plan_expires_at, has_global_premium_borders, premium_unlock_expiry FROM users WHERE id = ?"
    ).bind(userId).first();

    if (!user) {
      return false;
    }

    // Check if user has global premium borders (which includes all premium features)
    if (user.has_global_premium_borders === 1) {
      // Check if premium unlock has not expired
      if (user.premium_unlock_expiry) {
        const expiryDate = new Date(user.premium_unlock_expiry as string);
        if (new Date() <= expiryDate) {
          return true;
        }
      }
    }

    // Free users don't have access to logo upload
    if (user.plan_type === 'free') {
      return false;
    }

    // Check if user has active subscription
    if (user.subscription_status !== 'active') {
      return false;
    }

    // Check if subscription has expired
    if (user.plan_expires_at) {
      const expiryDate = new Date(user.plan_expires_at as string);
      if (new Date() > expiryDate) {
        return false;
      }
    }

    // Get the user's billing plan to check feature flags
    // Match by plan name AND currency to get the correct plan
    const userCurrency = user.currency as string || 'USD';
    const plan = await db.prepare(
      "SELECT allow_logo_upload FROM billing_plans WHERE plan_type = 'subscription' AND name LIKE ? AND currency = ? AND is_active = 1 LIMIT 1"
    ).bind(`%${(user.plan_type as string).charAt(0).toUpperCase() + (user.plan_type as string).slice(1)}%`, userCurrency).first();

    return plan?.allow_logo_upload === 1;
  } catch (error) {
    console.error("Error checking logo upload entitlement:", error);
    return false;
  }
}

/**
 * Check if user has entitlement to use external borders
 */
export async function userHasExternalBorder(userId: string, db: D1Database): Promise<boolean> {
  try {
    // Get user's current plan
    const user = await db.prepare(
      "SELECT plan_type, currency, subscription_status, plan_expires_at, has_global_premium_borders, premium_unlock_expiry FROM users WHERE id = ?"
    ).bind(userId).first();

    if (!user) {
      return false;
    }

    // Check if user has global premium borders (which includes all premium features)
    if (user.has_global_premium_borders === 1) {
      // Check if premium unlock has not expired
      if (user.premium_unlock_expiry) {
        const expiryDate = new Date(user.premium_unlock_expiry as string);
        if (new Date() <= expiryDate) {
          return true;
        }
      }
    }

    // Free users don't have access to external borders
    if (user.plan_type === 'free') {
      return false;
    }

    // Check if user has active subscription
    if (user.subscription_status !== 'active') {
      return false;
    }

    // Check if subscription has expired
    if (user.plan_expires_at) {
      const expiryDate = new Date(user.plan_expires_at as string);
      if (new Date() > expiryDate) {
        return false;
      }
    }

    // Get the user's billing plan to check feature flags
    // Match by plan name AND currency to get the correct plan
    const userCurrency = user.currency as string || 'USD';
    const plan = await db.prepare(
      "SELECT allow_external_border FROM billing_plans WHERE plan_type = 'subscription' AND name LIKE ? AND currency = ? AND is_active = 1 LIMIT 1"
    ).bind(`%${(user.plan_type as string).charAt(0).toUpperCase() + (user.plan_type as string).slice(1)}%`, userCurrency).first();

    return plan?.allow_external_border === 1;
  } catch (error) {
    console.error("Error checking external border entitlement:", error);
    return false;
  }
}

/**
 * Check if user has entitlement to access QR codes
 */
export async function userHasQRCode(userId: string, db: D1Database): Promise<boolean> {
  try {
    // Get user's current plan
    const user = await db.prepare(
      "SELECT plan_type, currency, subscription_status, plan_expires_at, has_global_premium_borders, premium_unlock_expiry FROM users WHERE id = ?"
    ).bind(userId).first();

    if (!user) {
      return false;
    }

    // Check if user has global premium borders (which includes all premium features)
    if (user.has_global_premium_borders === 1) {
      // Check if premium unlock has not expired
      if (user.premium_unlock_expiry) {
        const expiryDate = new Date(user.premium_unlock_expiry as string);
        if (new Date() <= expiryDate) {
          return true;
        }
      }
    }

    // Free users don't have access to QR codes
    if (user.plan_type === 'free') {
      return false;
    }

    // Check if user has active subscription
    if (user.subscription_status !== 'active') {
      return false;
    }

    // Check if subscription has expired
    if (user.plan_expires_at) {
      const expiryDate = new Date(user.plan_expires_at as string);
      if (new Date() > expiryDate) {
        return false;
      }
    }

    // Get the user's billing plan to check feature flags
    // Match by plan name AND currency to get the correct plan
    const userCurrency = user.currency as string || 'USD';
    const plan = await db.prepare(
      "SELECT allow_qr_code FROM billing_plans WHERE plan_type = 'subscription' AND name LIKE ? AND currency = ? AND is_active = 1 LIMIT 1"
    ).bind(`%${(user.plan_type as string).charAt(0).toUpperCase() + (user.plan_type as string).slice(1)}%`, userCurrency).first();

    return plan?.allow_qr_code === 1;
  } catch (error) {
    console.error("Error checking QR code entitlement:", error);
    return false;
  }
}
