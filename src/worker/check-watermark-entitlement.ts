// Helper function to check if user has watermark removal entitlement
export async function userHasWatermarkRemoval(userId: string, db: D1Database): Promise<boolean> {
  try {
    // Get user's current plan
    const user = await db.prepare(
      "SELECT plan_type, subscription_status FROM users WHERE id = ?"
    ).bind(userId).first();

    if (!user) {
      return false;
    }

    // Check if user has active subscription with watermark removal
    if (user.plan_type !== 'free' && user.subscription_status === 'active') {
      // Get user's currency and billing cycle to match exact plan
      const userDetails = await db.prepare(
        "SELECT currency, billing_cycle FROM users WHERE id = ?"
      ).bind(userId).first();

      const currency = userDetails?.currency || 'USD';
      const billingCycle = userDetails?.billing_cycle || 'monthly';

      const activePlan = await db.prepare(
        "SELECT remove_watermark FROM billing_plans WHERE LOWER(name) LIKE ? AND plan_type = 'subscription' AND billing_interval = ? AND currency = ? AND is_active = 1 LIMIT 1"
      ).bind(`%${(user.plan_type as string).toLowerCase()}%`, billingCycle, currency).first();

      if (activePlan && activePlan.remove_watermark === 1) {
        return true;
      }
    }

    // Check if user has purchased credits with watermark removal
    // Get all completed transactions for this user
    const { results: transactions } = await db.prepare(
      "SELECT * FROM billing_transactions WHERE user_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 100"
    ).bind(userId).all();

    for (const transaction of transactions) {
      const txData = transaction as any;
      const metadata = txData.metadata ? JSON.parse(txData.metadata) : {};

      // For campaign or lead purchases, check if the plan includes watermark removal
      if (txData.transaction_type === 'campaign') {
        const campaignPlan = await db.prepare(
          "SELECT remove_watermark FROM billing_plans WHERE campaign_limit = ? AND currency = ? AND plan_type = 'campaign'"
        ).bind(metadata.credits || 1, txData.currency).first();

        if (campaignPlan && campaignPlan.remove_watermark === 1) {
          return true;
        }
      } else if (txData.transaction_type === 'leads') {
        const leadPlan = await db.prepare(
          "SELECT remove_watermark FROM billing_plans WHERE lead_limit = ? AND currency = ? AND plan_type = 'leads'"
        ).bind(metadata.leads || 100, txData.currency).first();

        if (leadPlan && leadPlan.remove_watermark === 1) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking watermark entitlement:", error);
    return false;
  }
}
