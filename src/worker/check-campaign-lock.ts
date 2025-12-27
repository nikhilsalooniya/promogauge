// Helper functions to determine campaign lock state based on payment type and dates

export type CampaignLockState = {
  isLocked: boolean;
  canEdit: boolean;
  canUnpublish: boolean;
  canReschedule: boolean;
  lockReason?: string;
  showUpgradeCTA: boolean;
};

export function getCampaignLockState(campaign: any, user: any): CampaignLockState {
  const paymentType = campaign.campaign_payment_type || "SUBSCRIPTION";
  const now = new Date();
  const startDate = campaign.start_datetime ? new Date(campaign.start_datetime) : null;
  const endDate = campaign.end_datetime ? new Date(campaign.end_datetime) : null;
  const subscriptionStatus = user.subscription_status;
  const subscriptionExpired = subscriptionStatus === "expired" || subscriptionStatus === "canceled";
  
  // GLOBAL RULE: Ended campaigns are always locked
  if (endDate && now > endDate) {
    return {
      isLocked: true,
      canEdit: false,
      canUnpublish: false,
      canReschedule: false,
      lockReason: "Campaign has ended",
      showUpgradeCTA: false,
    };
  }

  // PAY-PER-CAMPAIGN RULES
  if (paymentType === "PAY_PER_CAMPAIGN") {
    // Before start date: allow editing but not rescheduling beyond original period
    if (startDate && now < startDate) {
      return {
        isLocked: false,
        canEdit: true,
        canUnpublish: true,
        canReschedule: false, // Cannot reschedule beyond original campaign period
        lockReason: undefined,
        showUpgradeCTA: true,
      };
    }
    
    // At or after start date: lock everything
    if (startDate && now >= startDate) {
      return {
        isLocked: true,
        canEdit: false,
        canUnpublish: false,
        canReschedule: false,
        lockReason: "This is a Pay-Per-Campaign. Changes are locked once the campaign goes live.",
        showUpgradeCTA: true,
      };
    }
  }

  // SUBSCRIPTION RULES
  if (paymentType === "SUBSCRIPTION") {
    // Active subscription: full access
    if (!subscriptionExpired) {
      return {
        isLocked: false,
        canEdit: true,
        canUnpublish: true,
        canReschedule: true,
        lockReason: undefined,
        showUpgradeCTA: false,
      };
    }
    
    // Expired subscription: read-only mode
    return {
      isLocked: true,
      canEdit: false,
      canUnpublish: false,
      canReschedule: false,
      lockReason: "Your subscription has expired. Renew to edit or publish campaigns.",
      showUpgradeCTA: true,
    };
  }

  // Default: allow all actions
  return {
    isLocked: false,
    canEdit: true,
    canUnpublish: true,
    canReschedule: true,
    lockReason: undefined,
    showUpgradeCTA: false,
  };
}
