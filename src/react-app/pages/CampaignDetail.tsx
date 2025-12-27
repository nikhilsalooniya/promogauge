import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import WheelPreview from "@/react-app/components/WheelPreview";
import ScratchPreview from "@/react-app/components/ScratchPreview";
import EmojiPicker from "@/react-app/components/EmojiPicker";
import PublishConfirmationModal from "@/react-app/components/PublishConfirmationModal";
import { Loader2, ArrowLeft, ExternalLink, Plus, Trash2, Copy, BarChart3, Settings, Palette, Eye, Upload, X, Calendar, Clock, Globe, ChevronRight, ChevronLeft, Sparkles, Volume2, Check, CheckCircle2, Rocket, Lock } from "lucide-react";

import type { Campaign, WheelSegment, LeadFormField } from "@/shared/types";
import { timezones, formatDateTimeForInput } from "@/react-app/utils/timezones";
import { countries } from "@/react-app/utils/countries";
import { useDebounce } from "@/react-app/hooks/useDebounce";

// Campaign lock state helper
type CampaignLockState = {
  isLocked: boolean;
  canEdit: boolean;
  canUnpublish: boolean;
  canReschedule: boolean;
  lockReason?: string;
  showUpgradeCTA: boolean;
};

function getCampaignLockState(campaign: Campaign | null, appUser: any): CampaignLockState {
  if (!campaign) {
    return {
      isLocked: false,
      canEdit: true,
      canUnpublish: true,
      canReschedule: true,
      showUpgradeCTA: false,
    };
  }

  const paymentType = campaign.campaign_payment_type || "SUBSCRIPTION";
  const now = new Date();
  const startDate = campaign.start_datetime ? new Date(campaign.start_datetime) : null;
  const endDate = campaign.end_datetime ? new Date(campaign.end_datetime) : null;
  const subscriptionStatus = appUser?.subscription_status;
  const subscriptionExpired = subscriptionStatus === "expired" || subscriptionStatus === "canceled";
  
  // PRIORITY RULE: Draft campaigns that have never been published are always editable
  // This takes precedence over all other rules (including end date checks)
  if (campaign.status === 'draft' && !campaign.is_published) {
    return {
      isLocked: false,
      canEdit: true,
      canUnpublish: true,
      canReschedule: true,  // Allow all edits including dates for unpublished drafts
      showUpgradeCTA: false,
    };
  }

  // GLOBAL RULE: Published campaigns that have ended are locked
  if (endDate && now > endDate && campaign.is_published) {
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
        canReschedule: false,
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
    showUpgradeCTA: false,
  };
}

export default function CampaignDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isPending } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [originalCampaign, setOriginalCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"general" | "campaign" | "visual">("general");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [uploadingPrizeImage, setUploadingPrizeImage] = useState<number | null>(null);
  const [uploadingPrizeFile, setUploadingPrizeFile] = useState<number | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [businessName, setBusinessName] = useState<string>("");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [copiedPublicUrl, setCopiedPublicUrl] = useState(false);
  const [copiedPreviewUrl, setCopiedPreviewUrl] = useState(false);
  const [showPreviewWarnings, setShowPreviewWarnings] = useState(false);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [appUser, setAppUser] = useState<any>(null);
  const [hasWatermarkRemoval, setHasWatermarkRemoval] = useState(false);
  const [watermarkEntitlementLoading, setWatermarkEntitlementLoading] = useState(true);
  const [hasBackgroundImageUpload, setHasBackgroundImageUpload] = useState(false);
  const [hasLogoUpload, setHasLogoUpload] = useState(false);
  const [hasExternalBorder, setHasExternalBorder] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishAction, setPublishAction] = useState<"publish" | "unpublish">("publish");
  const [publishLoading, setPublishLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  
  // Debounce campaign changes for autosave (1 second delay)
  const debouncedCampaign = useDebounce(campaign, 1000);

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchAllEntitlements();
    }
  }, [user]);

  useEffect(() => {
    if (user && id) {
      fetchCampaign();
    }
  }, [user, id]);

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/users/me");
      const data = await res.json();
      if (data.appUser) {
        setAppUser(data.appUser);
        if (data.appUser.business_name) {
          setBusinessName(data.appUser.business_name === "Individual" ? "" : data.appUser.business_name);
        }
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const fetchAllEntitlements = async () => {
    try {
      // Fetch all entitlements in parallel
      const [watermarkRes, backgroundRes, logoRes, borderRes] = await Promise.all([
        fetch("/api/billing/watermark-entitlement"),
        fetch("/api/billing/background-image-entitlement"),
        fetch("/api/billing/logo-upload-entitlement"),
        fetch("/api/billing/external-border-entitlement"),
      ]);

      if (watermarkRes.ok) {
        const data = await watermarkRes.json();
        setHasWatermarkRemoval(data.has_watermark_removal);
      }

      if (backgroundRes.ok) {
        const data = await backgroundRes.json();
        setHasBackgroundImageUpload(data.has_background_image_upload);
      }

      if (logoRes.ok) {
        const data = await logoRes.json();
        setHasLogoUpload(data.has_logo_upload);
      }

      if (borderRes.ok) {
        const data = await borderRes.json();
        setHasExternalBorder(data.has_external_border);
      }
    } catch (error) {
      console.error("Failed to fetch entitlements:", error);
    } finally {
      setWatermarkEntitlementLoading(false);
    }
  };

  // Autosave when debounced campaign changes
  useEffect(() => {
    // Early exit if campaign data isn't ready
    if (!debouncedCampaign || !originalCampaign) {
      return;
    }

    // Helper to normalize campaign data for comparison
    const normalizeCampaignForComparison = (camp: Campaign) => {
      // Normalize border_theme: "none" (legacy value) should be treated as null
      const normalizedBorderTheme = ((camp.border_theme as any) === "none" || !camp.border_theme) ? null : camp.border_theme;
      
      return {
        name: camp.name,
        wheel_segments: JSON.stringify(camp.wheel_segments),
        wheel_colors: JSON.stringify(camp.wheel_colors),
        pointer_color: camp.pointer_color || null,
        background_color: camp.background_color || null,
        background_gradient_enabled: !!camp.background_gradient_enabled,
        background_gradient_start: camp.background_gradient_start || null,
        background_gradient_end: camp.background_gradient_end || null,
        background_gradient_direction: camp.background_gradient_direction || null,
        font_family: camp.font_family || null,
        font_size: camp.font_size || null,
        wheel_border_thickness: camp.wheel_border_thickness || null,
        wheel_border_color: camp.wheel_border_color || null,
        pointer_style: camp.pointer_style || null,
        spin_button_text: camp.spin_button_text || null,
        spin_button_color: camp.spin_button_color || null,
        spin_button_border_radius: camp.spin_button_border_radius || null,
        spin_button_pulse_enabled: !!camp.spin_button_pulse_enabled,
        background_image_url: camp.background_image_url || null,
        logo_url: camp.logo_url || null,
        logo_position: camp.logo_position || null,
        confetti_enabled: !!camp.confetti_enabled,
        sound_enabled: !!camp.sound_enabled,
        sound_settings: JSON.stringify(camp.sound_settings),
        spin_limit_per_email: camp.spin_limit_per_email || null,
        spin_limit_per_phone: camp.spin_limit_per_phone || null,
        spin_limit_per_ip: camp.spin_limit_per_ip || null,
        spin_limit_per_device: camp.spin_limit_per_device || null,
        spin_limit_per_day: camp.spin_limit_per_day || null,
        spin_limit_per_week: camp.spin_limit_per_week || null,
        spin_limit_total: camp.spin_limit_total || null,
        spin_cooldown_hours: camp.spin_cooldown_hours || null,
        spin_duration_seconds: camp.spin_duration_seconds || null,
        border_enabled: !!camp.border_enabled,
        border_theme: normalizedBorderTheme,
        border_default_enabled: !!camp.border_default_enabled,
        border_default_color: camp.border_default_color || null,
        border_default_thickness: camp.border_default_thickness || null,
        border_custom_colors: JSON.stringify(camp.border_custom_colors || []),
        border_bulb_shape: camp.border_bulb_shape || null,
        border_bulb_count: camp.border_bulb_count || null,
        border_bulb_size: camp.border_bulb_size || null,
        border_blink_speed: camp.border_blink_speed || null,
        border_connector_ring_enabled: !!camp.border_connector_ring_enabled,
        border_connector_ring_color: camp.border_connector_ring_color || null,
        border_connector_ring_thickness: camp.border_connector_ring_thickness || null,
        redemption_instructions: camp.redemption_instructions || null,
        is_lead_form_required: !!camp.is_lead_form_required,
        lead_form_fields: JSON.stringify(camp.lead_form_fields),
        show_watermark: !!camp.show_watermark,
        status: camp.status,
        start_datetime: camp.start_datetime || null,
        end_datetime: camp.end_datetime || null,
        timezone: camp.timezone || "UTC",
        valid_countries: JSON.stringify(camp.valid_countries || []),
        terms_conditions: camp.terms_conditions || null,
        privacy_policy: camp.privacy_policy || null,
        scratch_card_shape: camp.scratch_card_shape || null,
        scratch_mask_style: camp.scratch_mask_style || null,
        scratch_instructions_title: camp.scratch_instructions_title || null,
        scratch_instructions_subtitle: camp.scratch_instructions_subtitle || null,
      };
    };

    // Check if there are actual changes to save
    const currentNormalized = normalizeCampaignForComparison(debouncedCampaign);
    const originalNormalized = normalizeCampaignForComparison(originalCampaign);
    
    const changesExist = JSON.stringify(currentNormalized) !== JSON.stringify(originalNormalized);
    
    if (!changesExist) {
      return;
    }

    console.log("Autosave: Changes detected, saving campaign...");

    const autoSave = async () => {
      setAutoSaveStatus("saving");
      try {
        const res = await fetch(`/api/campaigns/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: debouncedCampaign.name,
            wheel_segments: debouncedCampaign.wheel_segments,
            wheel_colors: debouncedCampaign.wheel_colors,
            pointer_color: debouncedCampaign.pointer_color || null,
            background_color: debouncedCampaign.background_color || null,
            background_gradient_enabled: !!debouncedCampaign.background_gradient_enabled,
            background_gradient_start: debouncedCampaign.background_gradient_start || null,
            background_gradient_end: debouncedCampaign.background_gradient_end || null,
            background_gradient_direction: debouncedCampaign.background_gradient_direction || null,
            font_family: debouncedCampaign.font_family || null,
            font_size: debouncedCampaign.font_size || null,
            wheel_border_thickness: debouncedCampaign.wheel_border_thickness || null,
            wheel_border_color: debouncedCampaign.wheel_border_color || null,
            pointer_style: debouncedCampaign.pointer_style || null,
            spin_button_text: debouncedCampaign.spin_button_text || null,
            spin_button_color: debouncedCampaign.spin_button_color || null,
            spin_button_border_radius: debouncedCampaign.spin_button_border_radius || null,
            spin_button_pulse_enabled: !!debouncedCampaign.spin_button_pulse_enabled,
            background_image_url: debouncedCampaign.background_image_url || null,
            logo_url: debouncedCampaign.logo_url || null,
            logo_position: debouncedCampaign.logo_position || null,
            confetti_enabled: !!debouncedCampaign.confetti_enabled,
            sound_enabled: !!debouncedCampaign.sound_enabled,
            sound_settings: debouncedCampaign.sound_settings,
            spin_limit_per_email: debouncedCampaign.spin_limit_per_email,
            spin_limit_per_phone: debouncedCampaign.spin_limit_per_phone,
            spin_limit_per_ip: debouncedCampaign.spin_limit_per_ip,
            spin_limit_per_device: debouncedCampaign.spin_limit_per_device,
            spin_limit_per_day: debouncedCampaign.spin_limit_per_day,
            spin_limit_per_week: debouncedCampaign.spin_limit_per_week,
            spin_limit_total: debouncedCampaign.spin_limit_total,
            spin_cooldown_hours: debouncedCampaign.spin_cooldown_hours,
            spin_duration_seconds: debouncedCampaign.spin_duration_seconds || null,
            scratch_card_shape: debouncedCampaign.scratch_card_shape || null,
            scratch_mask_style: debouncedCampaign.scratch_mask_style || null,
            scratch_instructions_title: debouncedCampaign.scratch_instructions_title || null,
            scratch_instructions_subtitle: debouncedCampaign.scratch_instructions_subtitle || null,
            border_enabled: !!debouncedCampaign.border_enabled,
            border_theme: ((debouncedCampaign.border_theme as any) === "none" || !debouncedCampaign.border_theme) ? null : (debouncedCampaign.border_theme === "default" || debouncedCampaign.border_theme === "custom" ? debouncedCampaign.border_theme : null),
            border_default_enabled: !!debouncedCampaign.border_default_enabled,
            border_default_color: debouncedCampaign.border_default_color || null,
            border_default_thickness: debouncedCampaign.border_default_thickness || null,
            border_custom_colors: debouncedCampaign.border_custom_colors || null,
            border_bulb_shape: debouncedCampaign.border_bulb_shape || null,
            border_bulb_count: debouncedCampaign.border_bulb_count || null,
            border_bulb_size: debouncedCampaign.border_bulb_size || null,
            border_blink_speed: debouncedCampaign.border_blink_speed || null,
            border_connector_ring_enabled: !!debouncedCampaign.border_connector_ring_enabled,
            border_connector_ring_color: debouncedCampaign.border_connector_ring_color || null,
            border_connector_ring_thickness: debouncedCampaign.border_connector_ring_thickness || null,
            redemption_instructions: debouncedCampaign.redemption_instructions || null,
            is_lead_form_required: !!debouncedCampaign.is_lead_form_required,
            lead_form_fields: debouncedCampaign.lead_form_fields,
            show_watermark: !!debouncedCampaign.show_watermark,
            status: debouncedCampaign.status,
            start_datetime: debouncedCampaign.start_datetime || null,
            end_datetime: debouncedCampaign.end_datetime || null,
            timezone: debouncedCampaign.timezone || "UTC",
            valid_countries: debouncedCampaign.valid_countries || [],
            terms_conditions: debouncedCampaign.terms_conditions || null,
            privacy_policy: debouncedCampaign.privacy_policy || null,
          }),
        });
        
        if (res.ok) {
          const updatedData = await res.json();
          console.log("Autosave: Campaign saved successfully");
          setCampaign(updatedData); // Update current campaign with fresh data from server
          setOriginalCampaign(JSON.parse(JSON.stringify(updatedData))); // Update original after autosave
          setAutoSaveStatus("saved");
          
          // Reset to idle after 2 seconds
          setTimeout(() => {
            setAutoSaveStatus("idle");
          }, 2000);
        } else {
          const errorData = await res.text();
          setAutoSaveStatus("idle");
          console.error("Autosave failed:", res.status, errorData);
        }
      } catch (error) {
        setAutoSaveStatus("idle");
        console.error("Autosave error:", error);
      }
    };

    autoSave();
  }, [debouncedCampaign, id]);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      if (res.ok) {
        const data = await res.json();
        // Normalize border_theme: convert "none" (legacy value) or empty to null for consistency
        if ((data.border_theme as any) === "none" || !data.border_theme) {
          data.border_theme = null;
        }
        // If border is disabled, ensure border_theme is null
        if (!data.border_enabled) {
          data.border_theme = null;
        }
        
        // Auto-update status based on dates (frontend validation)
        const now = new Date();
        if (data.end_datetime) {
          const endDate = new Date(data.end_datetime);
          if (now > endDate && data.status !== "ended") {
            data.status = "ended";
          }
        }
        
        setCampaign(data);
        setOriginalCampaign(JSON.parse(JSON.stringify(data))); // Deep clone
      } else {
        navigate("/campaigns");
      }
    } catch (error) {
      console.error("Failed to fetch campaign:", error);
      navigate("/campaigns");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine campaign date state
  const getCampaignDateState = (): "ended" | "scheduled" | "live" | "unknown" => {
    if (!campaign?.start_datetime || !campaign?.end_datetime) {
      return "unknown";
    }
    
    const now = new Date();
    const startDate = new Date(campaign.start_datetime);
    const endDate = new Date(campaign.end_datetime);
    
    if (now > endDate) {
      return "ended";
    } else if (now < startDate) {
      return "scheduled";
    } else {
      return "live";
    }
  };

  // Get allowed status options based on date state
  const getAllowedStatusOptions = (): string[] => {
    const dateState = getCampaignDateState();
    
    switch (dateState) {
      case "ended":
        return ["ended"]; // Locked to ended
      case "scheduled":
        return ["draft", "active"]; // Active becomes "scheduled"
      case "live":
        return ["draft", "active", "paused"];
      default:
        return ["draft", "active", "paused", "ended"]; // All options if dates not set
    }
  };

  // Get status helper message
  const getStatusHelperMessage = (): string => {
    const dateState = getCampaignDateState();
    
    if (dateState === "ended") {
      return "This campaign has ended because the end date has passed.";
    } else if (dateState === "scheduled" && campaign?.status === "active") {
      return "This campaign will go live automatically on the selected start date.";
    } else if (campaign?.status === "draft") {
      return "Campaign is not visible to the public";
    } else if (campaign?.status === "active") {
      return "Campaign is live and accepting spins";
    } else if (campaign?.status === "paused") {
      return "Campaign is visible but spins are disabled";
    } else if (campaign?.status === "ended") {
      return "Campaign has ended and cannot accept spins";
    }
    
    return "";
  };

  

  const validateRequiredFields = (section: "general" | "campaign" | "visual"): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (section === "general") {
      // 1. Campaign Name (required)
      if (!campaign?.name || campaign.name.trim() === "") {
        errors.push("Campaign Name is required");
      }

      // 2. Timezone (required)
      if (!campaign?.timezone || campaign.timezone.trim() === "") {
        errors.push("Timezone is required");
      }

      // 3. Start Date (required)
      if (!campaign?.start_datetime) {
        errors.push("Start Date & Time is required");
      }

      // 4. End Date (required)
      if (!campaign?.end_datetime) {
        errors.push("End Date & Time is required");
      }

      // 5. Promotion Valid In - at least one country (required)
      if (!campaign?.valid_countries || campaign.valid_countries.length === 0) {
        errors.push("At least one country must be selected for Promotion Valid In");
      }

      // 6. Spin Limit - at least one limit set (required)
      const hasSpinLimit = 
        campaign?.spin_limit_per_email ||
        campaign?.spin_limit_per_phone ||
        campaign?.spin_limit_per_ip ||
        campaign?.spin_limit_per_device ||
        campaign?.spin_limit_per_day ||
        campaign?.spin_limit_per_week ||
        campaign?.spin_limit_total;
      
      if (!hasSpinLimit) {
        errors.push("At least one Spin Limit must be set");
      }
    }

    if (section === "campaign") {
      // 7. Redemption Instructions - either general or at least one per prize (required)
      const hasGeneralRedemption = campaign?.redemption_instructions && campaign.redemption_instructions.trim() !== "";
      const hasPrizeRedemption = campaign?.wheel_segments?.some(
        segment => segment.redemption_instructions && segment.redemption_instructions.trim() !== ""
      );

      if (!hasGeneralRedemption && !hasPrizeRedemption) {
        errors.push("Redemption Instructions are required (either General or per prize)");
      }
    }

    // Visual tab has no required fields currently

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleNextStep = () => {
    // Validate required fields for current tab before allowing navigation
    const validation = validateRequiredFields(activeSection);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      // Scroll to top to show errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Clear errors if validation passes
    setValidationErrors([]);

    // Allow navigation - autosave will handle saving
    if (activeSection === "general") {
      setActiveSection("campaign");
    } else if (activeSection === "campaign") {
      setActiveSection("visual");
    }
  };

  const handlePreviousStep = () => {
    // Clear validation errors when going back
    setValidationErrors([]);
    
    if (activeSection === "campaign") {
      setActiveSection("general");
    } else if (activeSection === "visual") {
      setActiveSection("campaign");
    }
  };

  const addWheelSegment = () => {
    if (!campaign) return;
    const newSegment: WheelSegment = {
      label: "New Prize",
      color: campaign.wheel_segments.length % 2 === 0 ? campaign.wheel_colors.primary : campaign.wheel_colors.secondary,
      prize_type: undefined, // Will be set by user
    };
    setCampaign({
      ...campaign,
      wheel_segments: [...campaign.wheel_segments, newSegment],
    });
  };

  const removeWheelSegment = (index: number) => {
    if (!campaign || campaign.wheel_segments.length <= 3) return;
    setCampaign({
      ...campaign,
      wheel_segments: campaign.wheel_segments.filter((_, i) => i !== index),
    });
  };

  const updateSegmentColor = (index: number, color: string) => {
    if (!campaign) return;
    const newSegments = [...campaign.wheel_segments];
    newSegments[index] = { ...newSegments[index], color };
    setCampaign({ ...campaign, wheel_segments: newSegments });
  };

  const updateSegmentIcon = (index: number, icon: string) => {
    if (!campaign) return;
    const newSegments = [...campaign.wheel_segments];
    newSegments[index] = { ...newSegments[index], icon };
    setCampaign({ ...campaign, wheel_segments: newSegments });
  };

  const addLeadFormField = () => {
    if (!campaign) return;
    const newField: LeadFormField = {
      name: `custom_field_${Date.now()}`,
      label: "New Field",
      type: "text",
      required: false,
    };
    setCampaign({
      ...campaign,
      lead_form_fields: [...campaign.lead_form_fields, newField],
    });
  };

  const removeLeadFormField = (index: number) => {
    if (!campaign || campaign.lead_form_fields.length <= 1) return;
    setCampaign({
      ...campaign,
      lead_form_fields: campaign.lead_form_fields.filter((_, i) => i !== index),
    });
  };

  const copyPublicUrl = async () => {
    const message = `Check out this amazing campaign: ${campaign?.name || 'PromoGauge Campaign'}\n\n${publicUrl}`;
    await navigator.clipboard.writeText(message);
    setCopiedPublicUrl(true);
    setTimeout(() => setCopiedPublicUrl(false), 2000);
  };

  const copyPreviewUrl = async () => {
    const message = `Check out this amazing campaign: ${campaign?.name || 'PromoGauge Campaign'}\n\n${previewUrl}`;
    await navigator.clipboard.writeText(message);
    setCopiedPreviewUrl(true);
    setTimeout(() => setCopiedPreviewUrl(false), 2000);
  };

  // Validation for publishing
  const validateCampaignForPublish = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Campaign name required
    if (!campaign?.name || campaign.name.trim() === "") {
      errors.push("Campaign Name is required");
    }

    // At least one prize required
    if (!campaign?.wheel_segments || campaign.wheel_segments.length < 1) {
      errors.push("At least one prize is required");
    }

    // Start & End date required
    if (!campaign?.start_datetime) {
      errors.push("Start Date & Time is required");
    }
    if (!campaign?.end_datetime) {
      errors.push("End Date & Time is required");
    }

    // Timezone required
    if (!campaign?.timezone) {
      errors.push("Timezone is required");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const canPublish = (): boolean => {
    const validation = validateCampaignForPublish();
    return validation.isValid;
  };

  const handlePublishClick = () => {
    const validation = validateCampaignForPublish();
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setPublishAction("publish");
    setShowPublishModal(true);
  };

  const handleUnpublishClick = () => {
    setPublishAction("unpublish");
    setShowPublishModal(true);
  };

  const handlePublishConfirm = async () => {
    setShowPublishModal(false);
    setPublishLoading(true);

    try {
      const res = await fetch(`/api/campaigns/${id}/${publishAction}`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        // API returns { success: true, campaign: {...} }, so we need to use data.campaign
        const updatedCampaign = data.campaign || data;
        
        // Ensure the campaign has the proper structure
        const campaignData = {
          ...updatedCampaign,
          lead_form_fields: typeof updatedCampaign.lead_form_fields === 'string' 
            ? JSON.parse(updatedCampaign.lead_form_fields) 
            : updatedCampaign.lead_form_fields,
          wheel_segments: typeof updatedCampaign.wheel_segments === 'string'
            ? JSON.parse(updatedCampaign.wheel_segments)
            : updatedCampaign.wheel_segments,
          wheel_colors: typeof updatedCampaign.wheel_colors === 'string'
            ? JSON.parse(updatedCampaign.wheel_colors)
            : updatedCampaign.wheel_colors,
          sound_settings: typeof updatedCampaign.sound_settings === 'string'
            ? JSON.parse(updatedCampaign.sound_settings)
            : updatedCampaign.sound_settings || { spin: true, win: true, noWin: true },
          valid_countries: typeof updatedCampaign.valid_countries === 'string'
            ? JSON.parse(updatedCampaign.valid_countries)
            : updatedCampaign.valid_countries || [],
          border_custom_colors: typeof updatedCampaign.border_custom_colors === 'string'
            ? JSON.parse(updatedCampaign.border_custom_colors)
            : updatedCampaign.border_custom_colors || [],
          border_theme: (updatedCampaign.border_theme as any) === "none" || !updatedCampaign.border_theme 
            ? null 
            : updatedCampaign.border_theme,
        };
        
        setCampaign(campaignData);
        setOriginalCampaign(JSON.parse(JSON.stringify(campaignData)));
        
        // Show success toast
        if (publishAction === "publish") {
          setToastMessage("Campaign published successfully!");
        } else {
          setToastMessage("Campaign unpublished successfully.");
        }
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      } else {
        const errorData = await res.json();
        alert(errorData.error || `Failed to ${publishAction} campaign`);
      }
    } catch (error) {
      console.error(`Failed to ${publishAction} campaign:`, error);
      alert(`Failed to ${publishAction} campaign`);
    } finally {
      setPublishLoading(false);
    }
  };

  const validateCampaignForPreview = (): string[] => {
    const warnings: string[] = [];
    const now = new Date();

    // Check billing status and lead collection capabilities
    if (appUser && campaign?.is_lead_form_required) {
      // Check plan type - Free plan may have limitations
      if (appUser.plan_type === "free") {
        warnings.push("💳 Lead collection on Free plan - Upgrade to Starter or Professional for full lead management features");
      }
      
      // Check lead credits
      if (typeof appUser.lead_credits === 'number') {
        if (appUser.lead_credits === 0) {
          warnings.push("❌ Lead Credits Exhausted - You have 0 lead credits remaining. Leads cannot be collected until you upgrade or purchase more credits");
        } else if (appUser.lead_credits > 0 && appUser.lead_credits <= 10) {
          warnings.push(`⚠️ Low Lead Credits - Only ${appUser.lead_credits} lead credits remaining. Consider upgrading to avoid interruption`);
        }
      }
      
      // Check subscription status
      if (appUser.subscription_status && appUser.subscription_status !== "active") {
        if (appUser.subscription_status === "past_due") {
          warnings.push("💳 Subscription Past Due - Your payment is overdue. Lead collection may be interrupted");
        } else if (appUser.subscription_status === "canceled") {
          warnings.push("❌ Subscription Canceled - Your subscription has been canceled. Lead collection is disabled");
        }
      }
    }

    // Check campaign name
    if (!campaign?.name || campaign.name.trim() === "") {
      warnings.push("❌ Campaign Name is not set");
    }

    // Check campaign status
    if (campaign?.status === "draft") {
      warnings.push("⚠️ Campaign Status is 'Draft' - Campaign will not be visible to public");
    }
    if (campaign?.status === "ended") {
      warnings.push("⚠️ Campaign Status is 'Ended' - Users cannot spin");
    }
    if (campaign?.status === "paused") {
      warnings.push("⚠️ Campaign Status is 'Paused' - Users can view but cannot spin");
    }

    // Check timezone
    if (!campaign?.timezone) {
      warnings.push("❌ Timezone is not set");
    }

    // Check start/end dates
    if (!campaign?.start_datetime) {
      warnings.push("❌ Start Date & Time is not set");
    }
    if (!campaign?.end_datetime) {
      warnings.push("❌ End Date & Time is not set");
    }

    // Check if campaign is outside date range
    if (campaign?.start_datetime && campaign?.end_datetime) {
      const startDate = new Date(campaign.start_datetime);
      const endDate = new Date(campaign.end_datetime);
      
      if (now < startDate) {
        warnings.push("⏰ Campaign has not started yet (starts " + startDate.toLocaleString() + ")");
      }
      if (now > endDate) {
        warnings.push("⏰ Campaign has already ended (ended " + endDate.toLocaleString() + ")");
      }
    }

    // Check countries
    if (!campaign?.valid_countries || campaign.valid_countries.length === 0) {
      warnings.push("❌ No countries selected - At least one country must be selected");
    }

    // Check spin limits
    const hasSpinLimit = 
      campaign?.spin_limit_per_email ||
      campaign?.spin_limit_per_phone ||
      campaign?.spin_limit_per_ip ||
      campaign?.spin_limit_per_device ||
      campaign?.spin_limit_per_day ||
      campaign?.spin_limit_per_week ||
      campaign?.spin_limit_total;
    
    if (!hasSpinLimit) {
      warnings.push("❌ No Spin Limits set - At least one spin limit must be configured");
    }

    // Check redemption instructions
    const hasGeneralRedemption = campaign?.redemption_instructions && campaign.redemption_instructions.trim() !== "";
    const hasPrizeRedemption = campaign?.wheel_segments?.some(
      segment => segment.redemption_instructions && segment.redemption_instructions.trim() !== ""
    );

    if (!hasGeneralRedemption && !hasPrizeRedemption) {
      warnings.push("❌ No Redemption Instructions - Add either general instructions or per-prize instructions");
    }

    // Check wheel prizes
    if (!campaign?.wheel_segments || campaign.wheel_segments.length < 3) {
      warnings.push("❌ Not enough prizes - Minimum 3 prizes required");
    }

    // Check for prizes without prize type
    const prizesWithoutType = campaign?.wheel_segments?.filter(s => !s.prize_type).length || 0;
    if (prizesWithoutType > 0) {
      warnings.push(`⚠️ ${prizesWithoutType} prize(s) missing Prize Type`);
    }

    // Check for coupon prizes without coupon code
    const couponsWithoutCode = campaign?.wheel_segments?.filter(
      s => s.prize_type === "coupon" && (!s.coupon_code || s.coupon_code.trim() === "")
    ).length || 0;
    if (couponsWithoutCode > 0) {
      warnings.push(`⚠️ ${couponsWithoutCode} coupon prize(s) missing Coupon Code`);
    }

    // Check lead form
    if (campaign?.is_lead_form_required && (!campaign?.lead_form_fields || campaign.lead_form_fields.length === 0)) {
      warnings.push("⚠️ Lead Form is required but no fields configured");
    }

    return warnings;
  };

  const previewCampaign = async () => {
    // Wait for autosave to complete if there are pending changes
    if (autoSaveStatus === "saving") {
      // Wait up to 3 seconds for autosave to complete
      const maxWait = 3000;
      const startTime = Date.now();
      
      while (autoSaveStatus === "saving" && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Validate campaign settings
    const warnings = validateCampaignForPreview();
    
    if (warnings.length > 0) {
      // Show warnings modal
      setPreviewWarnings(warnings);
      setShowPreviewWarnings(true);
    } else {
      // No warnings, open preview directly
      window.open(previewUrl, '_blank');
    }
  };

  const handleProceedToPreview = () => {
    setShowPreviewWarnings(false);
    window.open(previewUrl, '_blank');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload an image file (PNG, JPEG, GIF, WebP, or SVG)");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const res = await fetch(`/api/campaigns/${id}/upload-logo`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setCampaign({ ...campaign!, logo_url: data.url });
      } else {
        const error = await res.json();
        alert(error.error || "Failed to upload logo");
      }
    } catch (error) {
      console.error("Logo upload error:", error);
      alert("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setCampaign({ ...campaign!, logo_url: null });
  };

  const handleBackgroundImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload an image file (PNG, JPEG, GIF, WebP, or SVG)");
      return;
    }

    // Validate file size (10MB for backgrounds)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setUploadingBackground(true);
    try {
      const formData = new FormData();
      formData.append("background", file);

      const res = await fetch(`/api/campaigns/${id}/upload-background`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setCampaign({ ...campaign!, background_image_url: data.url });
      } else {
        const error = await res.json();
        alert(error.error || "Failed to upload background image");
      }
    } catch (error) {
      console.error("Background image upload error:", error);
      alert("Failed to upload background image");
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleRemoveBackgroundImage = () => {
    setCampaign({ ...campaign!, background_image_url: null });
  };

  const handlePrizeImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload an image file (PNG, JPEG, GIF, WebP, or SVG)");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploadingPrizeImage(index);
    try {
      const formData = new FormData();
      formData.append("prize_image", file);

      const res = await fetch(`/api/campaigns/${id}/upload-prize-image`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const newSegments = [...campaign!.wheel_segments];
        newSegments[index] = { ...newSegments[index], prize_image_url: data.url };
        setCampaign({ ...campaign!, wheel_segments: newSegments });
      } else {
        const error = await res.json();
        alert(error.error || "Failed to upload prize image");
      }
    } catch (error) {
      console.error("Prize image upload error:", error);
      alert("Failed to upload prize image");
    } finally {
      setUploadingPrizeImage(null);
    }
  };

  const handleRemovePrizeImage = (index: number) => {
    const newSegments = [...campaign!.wheel_segments];
    newSegments[index] = { ...newSegments[index], prize_image_url: undefined };
    setCampaign({ ...campaign!, wheel_segments: newSegments });
  };

  const handlePrizeFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert("File size must be less than 50MB");
      return;
    }

    setUploadingPrizeFile(index);
    try {
      const formData = new FormData();
      formData.append("prize_file", file);

      const res = await fetch(`/api/campaigns/${id}/upload-prize-file`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const newSegments = [...campaign!.wheel_segments];
        newSegments[index] = { 
          ...newSegments[index], 
          prize_file_url: data.url,
          prize_file_name: data.fileName 
        };
        setCampaign({ ...campaign!, wheel_segments: newSegments });
      } else {
        const error = await res.json();
        alert(error.error || "Failed to upload prize file");
      }
    } catch (error) {
      console.error("Prize file upload error:", error);
      alert("Failed to upload prize file");
    } finally {
      setUploadingPrizeFile(null);
    }
  };

  const handleRemovePrizeFile = (index: number) => {
    const newSegments = [...campaign!.wheel_segments];
    newSegments[index] = { 
      ...newSegments[index], 
      prize_file_url: undefined,
      prize_file_name: undefined 
    };
    setCampaign({ ...campaign!, wheel_segments: newSegments });
  };

  

  

  const removeCountry = (countryCode: string) => {
    if (!campaign) return;
    setCampaign({
      ...campaign,
      valid_countries: (campaign.valid_countries || []).filter(c => c !== countryCode),
    });
  };

  const generateSampleTerms = () => {
    if (!campaign) return;
    
    // Helper function to format date
    const formatDate = (dateString: string | null | undefined) => {
      if (!dateString) return "{{CAMPAIGN_START_DATE}}";
      return new Date(dateString).toLocaleDateString("en-US", { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    // Determine spin limit to display
    const getSpinLimit = () => {
      if (campaign.spin_limit_per_email) return `${campaign.spin_limit_per_email}`;
      if (campaign.spin_limit_per_phone) return `${campaign.spin_limit_per_phone}`;
      if (campaign.spin_limit_per_device) return `${campaign.spin_limit_per_device}`;
      if (campaign.spin_limit_per_day) return `${campaign.spin_limit_per_day}`;
      if (campaign.spin_limit_per_week) return `${campaign.spin_limit_per_week}`;
      if (campaign.spin_limit_total) return `${campaign.spin_limit_total}`;
      return "{{SPIN_LIMIT}}";
    };

    // Get country string
    const getCountryString = () => {
      if (campaign.valid_countries && campaign.valid_countries.length > 0) {
        return campaign.valid_countries.map(code => countries.find(c => c.code === code)?.name || code).join(", ");
      }
      return "{{COUNTRY}}";
    };

    const sampleTerms = `Terms & Conditions – ${campaign.name || "{{CAMPAIGN_NAME}}"}
Last updated: ${new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}

These Terms & Conditions ("Terms") govern participation in the ${campaign.name || "{{CAMPAIGN_NAME}}"} promotional campaign ("Campaign"), organized by ${businessName || "{{BUSINESS_NAME}}"} ("Organizer"). By participating, you agree to be bound by these Terms.
________________________________________
1. Eligibility
1.1. The Campaign is open to individuals who meet the participation requirements of the Organizer.
1.2. Participants must reside in ${getCountryString()}, unless otherwise stated.
1.3. Employees, affiliates, or partners of the Organizer may be excluded.
________________________________________
2. Campaign Period
2.1. The Campaign runs from ${formatDate(campaign.start_datetime)} to ${formatDate(campaign.end_datetime)} ("Campaign Period").
2.2. Spins attempted before or after this period will not be valid.
2.3. The Organizer reserves the right to extend, shorten, pause, or cancel the Campaign at any time.
________________________________________
3. How to Participate
3.1. Each participant is allowed up to ${getSpinLimit()} spin(s).
3.2. Participation may require submitting basic information such as name, email, phone number, or responses to custom questions.
3.3. Participants must play through the official Campaign page: ${publicUrl}.
________________________________________
4. Prizes
4.1. Prizes are determined randomly by the Spin-the-Wheel mechanic.
4.2. Available prizes include, but are not limited to: discounts, vouchers, free services, coupons, physical rewards, or "No Win" segments.
4.3. Prize availability is subject to change without prior notice.
________________________________________
5. Prize Claiming & Redemption
5.1. Winners will receive on-screen confirmation plus optional email or WhatsApp notification.
5.2. All prizes must be redeemed before ${formatDate(campaign.end_datetime)}.
5.3. Each prize includes a unique reference code: {{UNIQUE_REWARD_CODE}}.
5.4. Prizes are non-refundable, non-exchangeable, and cannot be sold or transferred.
5.5. Additional redemption instructions may appear on the redemption page.
________________________________________
6. Disqualification & Fraud Prevention
6.1. Invalid emails, invalid phone numbers, duplicate sign-ups, or violation of spin limits may lead to disqualification.
6.2. Anti-fraud rules apply, including but not limited to:
•	IP limits
•	Device limits
•	Email or phone verification
•	Blocking VPN/proxy traffic
6.3. Any attempt to tamper with the wheel or exploit the system will result in automatic ban.
________________________________________
7. Limitation of Liability
7.1. The Organizer is not responsible for:
•	technical issues
•	system downtime
•	inaccurate participant information
•	unavailable prizes
7.2. Participants engage at their own risk.
________________________________________
8. Data Usage
8.1. Personal data collected will be used solely for Campaign administration and communication.
8.2. Data handling follows the Privacy Policy available on the Campaign page.
________________________________________
9. Changes to These Terms
The Organizer reserves the right to amend these Terms at any time. Continued participation constitutes acceptance of updated Terms.
________________________________________
10. Contact Information
For questions or concerns, contact:
${businessName || "{{BUSINESS_NAME}}"}
Email: ${user?.email || "{{BUSINESS_EMAIL}}"}`;

    setCampaign({ ...campaign, terms_conditions: sampleTerms });
  };

  const generateSamplePrivacyPolicy = () => {
    if (!campaign) return;
    
    // Helper function to format date
    const formatDate = (dateString: string | null | undefined) => {
      if (!dateString) return "{{CAMPAIGN_END_DATE}}";
      return new Date(dateString).toLocaleDateString("en-US", { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    const samplePolicy = `Privacy Policy – ${campaign.name || "{{CAMPAIGN_NAME}}"}

Last updated: ${new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}

This Privacy Policy explains how ${businessName || "{{BUSINESS_NAME}}"} ("Organizer", "we", "us") collects, uses, and protects participant data in the ${campaign.name || "{{CAMPAIGN_NAME}}"} Spin-the-Wheel campaign ("Campaign").

1. Information We Collect

We may collect the following information when you participate:

Name

Email address

Phone number

Country or location

Responses to custom questions

Device and browser details

IP address (for fraud prevention)

Spin count per device

Prize outcomes and redemption details

2. How We Use Your Information

Your information may be used for:

Administering the Campaign

Verifying participation and enforcing spin limits

Delivering prizes (email or WhatsApp)

Contacting you about your participation

Providing customer support

Protecting against fraud or abuse

Improving future campaigns

Aggregated analytics

We do not sell or rent your personal information.

3. Legal Basis for Processing

Depending on your country, data may be processed under:

Your consent

Performance of a promotional agreement

Legitimate interest in running marketing activities

Compliance with legal obligations

4. Data Storage & Security

We implement security measures to protect personal data, including:

Encrypted data storage

Restricted access

Anti-fraud monitoring

Secure APIs

Browser-level protections

Data may be stored in secure servers located outside your country, following global compliance standards.

5. Who We Share Data With

Data may be shared with:

Email providers (e.g., Mailgun)

SMS/WhatsApp APIs (optional)

Fraud-prevention tools

Internal staff or contractors

We never share your personal data with third parties for their marketing purposes.

6. Your Rights

Depending on your region, you may have the right to:

Access your information

Request corrections

Request deletion

Withdraw consent

Opt-out of communication

Request data export

Lodge a complaint with your data authority

To exercise rights, contact: ${user?.email || "{{BUSINESS_EMAIL}}"}

7. Data Retention

We retain campaign data until the end of ${formatDate(campaign.end_datetime)} plus a reasonable period for reporting or legal compliance, unless you request deletion earlier.

8. Children's Privacy

The Campaign is not intended for children under 16 unless permitted by local laws and with parental consent.

9. Updates to This Policy

We may update this Privacy Policy from time to time. Continued participation indicates acceptance of updates.

10. Contact Us

If you have questions about this Privacy Policy, contact:
${businessName || "{{BUSINESS_NAME}}"}
Email: ${user?.email || "{{BUSINESS_EMAIL}}"}`;

    setCampaign({ ...campaign, privacy_policy: samplePolicy });
  };

  if (isPending || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return null;
  }

  const publicUrl = `https://promoguage.com/campaign/${campaign.id}`;
  const previewUrl = `${window.location.origin}/c/${campaign.public_slug}`;

  // Get campaign lock state
  const lockState = getCampaignLockState(campaign, appUser);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-3">
          {/* Row 1: Back button + Campaign Name + Autosave status */}
          <div className="flex items-start space-x-2">
            <button
              onClick={() => navigate("/campaigns")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 mt-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words">{campaign.name}</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">Configure your campaign settings</p>
                <div className="flex items-center space-x-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm transition-all duration-200">
                  {autoSaveStatus === "idle" && (
                    <span className="text-gray-500 font-medium">Auto-save enabled</span>
                  )}
                  {autoSaveStatus === "saving" && (
                    <>
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-indigo-600" />
                      <span className="text-indigo-600 font-semibold">Saving...</span>
                    </>
                  )}
                  {autoSaveStatus === "saved" && (
                    <>
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                      <span className="text-green-600 font-semibold">Saved</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate(`/campaigns/${id}/analytics`)}
              className="flex-1 min-w-[120px] sm:flex-none px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-medium sm:font-semibold hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-1.5 text-xs sm:text-sm"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>
            {!campaign.is_published && (
              <button
                onClick={handlePublishClick}
                disabled={!canPublish() || publishLoading}
                className="flex-1 min-w-[120px] sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg sm:rounded-xl font-medium sm:font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all duration-200 flex items-center justify-center space-x-1.5 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={!canPublish() ? "Complete required campaign settings before publishing" : ""}
              >
                {publishLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    <span>Publish</span>
                  </>
                )}
              </button>
            )}
            {campaign.is_published && campaign.status !== "ended" && (
              <button
                onClick={handleUnpublishClick}
                disabled={publishLoading || !lockState.canUnpublish}
                className="flex-1 min-w-[120px] sm:flex-none px-3 sm:px-4 py-2 bg-white border-2 border-red-300 text-red-600 rounded-lg sm:rounded-xl font-medium sm:font-semibold hover:bg-red-50 transition-all duration-200 flex items-center justify-center space-x-1.5 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={!lockState.canUnpublish ? "Unpublishing is disabled for this campaign" : ""}
              >
                {publishLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    <span>Unpublish</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={previewCampaign}
              className="flex-1 min-w-[120px] sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-medium sm:font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center justify-center space-x-1.5 text-xs sm:text-sm"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-hide">
            {[
              { id: "general", label: "General Settings", shortLabel: "General", icon: Settings },
              { id: "campaign", label: "Campaign Settings", shortLabel: "Campaign", icon: Copy },
              { id: "visual", label: "Visual & Sound", shortLabel: "Visual", icon: Palette },
            ].map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as any)}
                  className={`flex-1 px-2 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-4 font-medium sm:font-semibold transition-colors whitespace-nowrap text-xs sm:text-sm lg:text-base ${
                    activeSection === section.id
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{section.label}</span>
                    <span className="sm:hidden">{section.shortLabel}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Lock Banner */}
            {lockState.isLocked && lockState.lockReason && (
              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Lock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-semibold text-orange-800">
                      Campaign Settings Locked
                    </h3>
                    <p className="text-sm text-orange-700 mt-1">
                      {lockState.lockReason}
                    </p>
                    {lockState.showUpgradeCTA && (
                      <div className="mt-3">
                        <a
                          href="/pricing"
                          className="inline-block px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
                        >
                          Upgrade to a subscription to edit campaigns anytime
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <X className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-red-800">
                      Please complete the following required fields:
                    </h3>
                    <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            {/* General Settings */}
            {activeSection === "general" && (
              <div className="space-y-6">
                {/* General Information */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">General Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Campaign Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={campaign.name}
                        onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                        disabled={lockState.isLocked}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                        }`}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Public URL
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={publicUrl}
                          readOnly
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600 text-sm min-w-0"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={copyPublicUrl}
                            className="flex-1 sm:flex-none px-3 sm:px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1"
                            title="Copy URL"
                          >
                            {copiedPublicUrl ? (
                              <>
                                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                                <span className="text-xs font-medium text-green-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-5 h-5 flex-shrink-0" />
                                <span className="text-xs sm:hidden ml-1">Copy</span>
                              </>
                            )}
                          </button>
                          <a
                            href={publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 sm:flex-none px-3 sm:px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-5 h-5 flex-shrink-0" />
                            <span className="text-xs sm:hidden ml-1">Open</span>
                          </a>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preview (Sandbox) URL
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={previewUrl}
                          readOnly
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600 text-sm min-w-0"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={copyPreviewUrl}
                            className="flex-1 sm:flex-none px-3 sm:px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1"
                            title="Copy URL"
                          >
                            {copiedPreviewUrl ? (
                              <>
                                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                                <span className="text-xs font-medium text-green-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-5 h-5 flex-shrink-0" />
                                <span className="text-xs sm:hidden ml-1">Copy</span>
                              </>
                            )}
                          </button>
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 sm:flex-none px-3 sm:px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-5 h-5 flex-shrink-0" />
                            <span className="text-xs sm:hidden ml-1">Open</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Campaign Schedule & Status */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Campaign Schedule & Status</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Campaign Status
                      </label>
                      <select
                        value={campaign.status}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          setCampaign({ ...campaign, status: newStatus });
                        }}
                        disabled={getCampaignDateState() === "ended" || lockState.isLocked}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          getCampaignDateState() === "ended" || lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                        }`}
                      >
                        {getAllowedStatusOptions().map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                      <p className={`text-xs mt-1 ${
                        getCampaignDateState() === "ended" ? 'text-red-600 font-medium' : 'text-gray-500'
                      }`}>
                        {getStatusHelperMessage()}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>Timezone <span className="text-red-500">*</span></span>
                        </div>
                      </label>
                      <select
                        value={campaign.timezone || "UTC"}
                        onChange={(e) => setCampaign({ ...campaign, timezone: e.target.value })}
                        disabled={lockState.isLocked}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                        }`}
                        required
                      >
                        {timezones.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">All start/end times will follow this timezone</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>Start Date & Time <span className="text-red-500">*</span></span>
                        </div>
                      </label>
                      <input
                        type="datetime-local"
                        value={formatDateTimeForInput(campaign.start_datetime || null)}
                        onChange={(e) => {
                          const newStartDate = e.target.value ? new Date(e.target.value).toISOString() : null;
                          
                          // Validate against end date
                          if (newStartDate && campaign.end_datetime) {
                            const startDate = new Date(newStartDate);
                            const endDate = new Date(campaign.end_datetime);
                            if (startDate >= endDate) {
                              alert("Start date must be before end date.");
                              return;
                            }
                          }
                          
                          setCampaign({ ...campaign, start_datetime: newStartDate });
                        }}
                        disabled={lockState.isLocked || !lockState.canReschedule}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          lockState.isLocked || !lockState.canReschedule ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                        }`}
                      />
                      <p className="text-xs text-gray-500 mt-1">Campaign becomes accessible after this time</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>End Date & Time <span className="text-red-500">*</span></span>
                        </div>
                      </label>
                      <input
                        type="datetime-local"
                        value={formatDateTimeForInput(campaign.end_datetime || null)}
                        onChange={(e) => {
                          const newEndDate = e.target.value ? new Date(e.target.value).toISOString() : null;
                          
                          // Validate against start date
                          if (newEndDate && campaign.start_datetime) {
                            const startDate = new Date(campaign.start_datetime);
                            const endDate = new Date(newEndDate);
                            if (endDate <= startDate) {
                              alert("End date must be after start date.");
                              return;
                            }
                          }
                          
                          // If extending end date into the future and status is ended, allow status change
                          const now = new Date();
                          if (newEndDate && campaign.status === "ended") {
                            const newEnd = new Date(newEndDate);
                            if (newEnd > now) {
                              // End date extended into future - unlock status
                              // Don't auto-activate, let user choose
                              // Status dropdown will become enabled automatically via getAllowedStatusOptions
                            }
                          }
                          
                          setCampaign({ ...campaign, end_datetime: newEndDate });
                        }}
                        disabled={lockState.isLocked || !lockState.canReschedule}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          lockState.isLocked || !lockState.canReschedule ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                        }`}
                      />
                      <p className="text-xs text-gray-500 mt-1">Campaign automatically ends after this time</p>
                      {getCampaignDateState() === "ended" && (
                        <p className="text-xs text-blue-600 font-medium mt-2">
                          💡 Tip: Extend the end date to reactivate this campaign
                        </p>
                      )}
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                      <p className="text-sm text-blue-800">
                        <strong>Status Rules:</strong>
                      </p>
                      <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
                        <li>Draft: Campaign is not visible to the public</li>
                        <li>Active: Campaign is live (automatically activates at start date if scheduled)</li>
                        <li>Paused: Campaign visible but spinning is disabled</li>
                        <li>Ended: Campaign has ended (locked when end date passes)</li>
                      </ul>
                      {getCampaignDateState() === "scheduled" && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <p className="text-xs text-blue-800 font-medium">
                            📅 Campaign Scheduled: Will automatically go live on {campaign.start_datetime && new Date(campaign.start_datetime).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {getCampaignDateState() === "ended" && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <p className="text-xs text-blue-800 font-medium">
                            🔒 Campaign Ended: Extend the end date above to unlock status options
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Promotion Valid In */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center space-x-2">
                    <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Promotion Valid In <span className="text-red-500">*</span></span>
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">Select at least one country where this promotion is available.</p>
                  
                  <div className="space-y-4">
                    {/* Country selector */}
                    <div>
                      <select
                        value={selectedCountry}
                        onChange={(e) => {
                          const countryCode = e.target.value;
                          if (countryCode && campaign && !campaign.valid_countries?.includes(countryCode)) {
                            setCampaign({
                              ...campaign,
                              valid_countries: [...(campaign.valid_countries || []), countryCode],
                            });
                          }
                          setSelectedCountry("");
                        }}
                        disabled={lockState.isLocked}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                        }`}
                      >
                        <option value="">Select a country</option>
                        {countries
                          .filter(country => !(campaign.valid_countries || []).includes(country.code))
                          .map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Selected countries display */}
                    {campaign.valid_countries && campaign.valid_countries.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Selected Countries ({campaign.valid_countries.length})
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {campaign.valid_countries.map((countryCode) => {
                            const country = countries.find(c => c.code === countryCode);
                            return (
                              <div
                                key={countryCode}
                                className="flex items-center space-x-2 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg"
                              >
                                <span className="text-sm font-medium">{country?.name || countryCode}</span>
                                <button
                                  onClick={() => removeCountry(countryCode)}
                                  disabled={lockState.isLocked}
                                  className={`transition-colors ${
                                    lockState.isLocked 
                                      ? 'text-gray-400 cursor-not-allowed' 
                                      : 'text-indigo-600 hover:text-indigo-800'
                                  }`}
                                  title={lockState.isLocked ? "Editing is disabled" : "Remove country"}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(!campaign.valid_countries || campaign.valid_countries.length === 0) && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
                        <p className="text-sm text-yellow-800 font-medium">
                          ⚠️ Please select at least one country (required)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scratch/Spin Limits */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                    {campaign.campaign_type === "scratch" ? "Scratch Limits" : "Spin Limits"} <span className="text-red-500">*</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
                    Control how many times users can {campaign.campaign_type === "scratch" ? "scratch" : "spin"}. At least one limit is required.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {campaign.campaign_type === "scratch" ? "Scratches per Email" : "Spins per Email"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={campaign.spin_limit_per_email || ""}
                        onChange={(e) => setCampaign({ ...campaign, spin_limit_per_email: e.target.value ? parseInt(e.target.value) : null })}
                        disabled={lockState.isLocked}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                        }`}
                        placeholder="Unlimited"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {campaign.campaign_type === "scratch" ? "Scratches per Phone Number" : "Spins per Phone Number"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={campaign.spin_limit_per_phone || ""}
                        onChange={(e) => setCampaign({ ...campaign, spin_limit_per_phone: e.target.value ? parseInt(e.target.value) : null })}
                        disabled={lockState.isLocked}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                        }`}
                        placeholder="Unlimited"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {campaign.campaign_type === "scratch" ? "Scratches per IP Address" : "Spins per IP Address"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={campaign.spin_limit_per_ip || ""}
                        onChange={(e) => setCampaign({ ...campaign, spin_limit_per_ip: e.target.value ? parseInt(e.target.value) : null })}
                        disabled={lockState.isLocked}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                        }`}
                        placeholder="Unlimited"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {campaign.campaign_type === "scratch" ? "Scratches per Device" : "Spins per Device"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={campaign.spin_limit_per_device || ""}
                        onChange={(e) => setCampaign({ ...campaign, spin_limit_per_device: e.target.value ? parseInt(e.target.value) : null })}
                        disabled={lockState.isLocked}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                        }`}
                        placeholder="Unlimited"
                      />
                      <p className="text-xs text-gray-500 mt-1">Uses browser fingerprinting + local storage</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {campaign.campaign_type === "scratch" ? "Scratches per Day" : "Spins per Day"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={campaign.spin_limit_per_day || ""}
                        onChange={(e) => setCampaign({ ...campaign, spin_limit_per_day: e.target.value ? parseInt(e.target.value) : null })}
                        disabled={lockState.isLocked}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                        }`}
                        placeholder="Unlimited"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {campaign.campaign_type === "scratch" ? "Scratches per Week" : "Spins per Week"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={campaign.spin_limit_per_week || ""}
                        onChange={(e) => setCampaign({ ...campaign, spin_limit_per_week: e.target.value ? parseInt(e.target.value) : null })}
                        disabled={lockState.isLocked}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                        }`}
                        placeholder="Unlimited"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {campaign.campaign_type === "scratch" ? "Total Scratches for Entire Campaign" : "Total Spins for Entire Campaign"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={campaign.spin_limit_total || ""}
                        onChange={(e) => setCampaign({ ...campaign, spin_limit_total: e.target.value ? parseInt(e.target.value) : null })}
                        disabled={lockState.isLocked}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                        }`}
                        placeholder="Unlimited"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {campaign.campaign_type === "scratch" ? "Cooldown Between Scratches (hours)" : "Cooldown Between Spins (hours)"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={campaign.spin_cooldown_hours || ""}
                        onChange={(e) => setCampaign({ ...campaign, spin_cooldown_hours: e.target.value ? parseInt(e.target.value) : null })}
                        disabled={lockState.isLocked}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                        }`}
                        placeholder="No cooldown"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {campaign.campaign_type === "scratch" 
                          ? "Example: 24 hours = user can scratch once per day" 
                          : "Example: 24 hours = user can spin once per day"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> At least one {campaign.campaign_type === "scratch" ? "scratch" : "spin"} limit must be set. All limits are campaign-specific and apply per user. Multiple limits can be combined for stronger control.
                    </p>
                  </div>
                </div>

                {/* Legal & Compliance */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Legal & Compliance</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">Add optional legal documents that will appear as footer links on your campaign page.</p>
                  
                  <div className="space-y-6">
                    {/* Terms & Conditions */}
                    <div>
                      <label className="flex items-center space-x-2 cursor-pointer mb-3">
                        <input
                          type="checkbox"
                          checked={!!campaign.terms_conditions}
                          onChange={(e) => {
                            setCampaign({ 
                              ...campaign, 
                              terms_conditions: e.target.checked ? "" : null 
                            });
                          }}
                          disabled={lockState.isLocked}
                          className={`w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${
                            lockState.isLocked ? 'cursor-not-allowed opacity-70' : ''
                          }`}
                        />
                        <span className={`text-sm font-semibold text-gray-900 ${
                          lockState.isLocked ? 'opacity-70' : ''
                        }`}>Enable Terms & Conditions</span>
                      </label>
                      {campaign.terms_conditions !== null && campaign.terms_conditions !== undefined && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Terms & Conditions
                          </label>
                          <textarea
                            value={campaign.terms_conditions || ""}
                            onChange={(e) => setCampaign({ ...campaign, terms_conditions: e.target.value })}
                            disabled={lockState.isLocked}
                            className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                            }`}
                            rows={8}
                            placeholder="Enter your terms and conditions here..."
                          />
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-500">Will appear as a clickable link in the footer</p>
                            <button
                              type="button"
                              onClick={generateSampleTerms}
                              disabled={lockState.isLocked}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                lockState.isLocked
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                              }`}
                            >
                              Generate Sample Terms & Conditions
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Privacy Policy */}
                    <div>
                      <label className="flex items-center space-x-2 cursor-pointer mb-3">
                        <input
                          type="checkbox"
                          checked={!!campaign.privacy_policy}
                          onChange={(e) => {
                            setCampaign({ 
                              ...campaign, 
                              privacy_policy: e.target.checked ? "" : null 
                            });
                          }}
                          disabled={lockState.isLocked}
                          className={`w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${
                            lockState.isLocked ? 'cursor-not-allowed opacity-70' : ''
                          }`}
                        />
                        <span className={`text-sm font-semibold text-gray-900 ${
                          lockState.isLocked ? 'opacity-70' : ''
                        }`}>Enable Privacy Policy</span>
                      </label>
                      {campaign.privacy_policy !== null && campaign.privacy_policy !== undefined && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Privacy Policy
                          </label>
                          <textarea
                            value={campaign.privacy_policy || ""}
                            onChange={(e) => setCampaign({ ...campaign, privacy_policy: e.target.value })}
                            disabled={lockState.isLocked}
                            className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                            }`}
                            rows={8}
                            placeholder="Enter your privacy policy here..."
                          />
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-500">Will appear as a clickable link in the footer</p>
                            <button
                              type="button"
                              onClick={generateSamplePrivacyPolicy}
                              disabled={lockState.isLocked}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                lockState.isLocked
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                              }`}
                            >
                              Generate Sample Privacy Policy
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-end">
                  <button
                    onClick={handleNextStep}
                    className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base"
                  >
                    <span>Next Step</span>
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Campaign Settings */}
            {activeSection === "campaign" && (
              <div className="space-y-6">
                {/* Prizes Section */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                    {campaign.campaign_type === "scratch" ? "Scratch Card Prizes" : "Wheel Prizes"}
                  </h2>
                  <div className="space-y-4">
                    {campaign.wheel_segments.map((segment, index) => (
                      <div key={index} className="border border-gray-200 rounded-xl p-4 space-y-3 relative">
                        {/* Delete Button - Top Right */}
                        {campaign.wheel_segments.length > 3 && (
                          <button
                            onClick={() => removeWheelSegment(index)}
                            disabled={lockState.isLocked}
                            className={`absolute top-2 right-2 p-2 rounded-lg transition-colors z-10 ${
                              lockState.isLocked
                                ? 'text-gray-400 cursor-not-allowed opacity-70 bg-gray-100'
                                : 'text-red-600 hover:bg-red-50 bg-white border border-gray-200 hover:border-red-200'
                            }`}
                            title={lockState.isLocked ? "Editing is disabled" : "Delete prize"}
                            aria-label="Delete prize"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}

                        {/* Prize Type Dropdown */}
                        <div className="pr-12">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Prize Type
                          </label>
                          <select
                            value={segment.prize_type || ""}
                            onChange={(e) => {
                              const prizeType = e.target.value as any || undefined;
                              
                              // Map prize types to example labels
                              const prizeTypeExamples: Record<string, string> = {
                                discount: "20% Off",
                                coupon: "10% Off",
                                free_gift: "Free Drink",
                                free_shipping: "Free Delivery",
                                digital_reward: "E-book",
                                hamper: "Food Basket",
                                reward: "Free Event Ticket",
                                no_win: "No Prize",
                                custom: "New Prize",
                              };
                              
                              const newSegments = [...campaign.wheel_segments];
                              newSegments[index] = { 
                                ...segment, 
                                prize_type: prizeType,
                                // Pre-fill label with example based on prize type
                                label: prizeType && prizeTypeExamples[prizeType] 
                                  ? prizeTypeExamples[prizeType] 
                                  : segment.label
                              };
                              setCampaign({ ...campaign, wheel_segments: newSegments });
                            }}
                            disabled={lockState.isLocked}
                            className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                            }`}
                          >
                            <option value="">Select Prize Type</option>
                            <option value="discount">Discount</option>
                            <option value="coupon">Coupon Code</option>
                            <option value="free_gift">Free Gift</option>
                            <option value="free_shipping">Free Shipping</option>
                            <option value="digital_reward">Digital Download Reward</option>
                            <option value="hamper">Hamper</option>
                            <option value="reward">Reward</option>
                            <option value="no_win">No Win / Try Again</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>

                        {/* Prize Details - Only shown after prize type is selected */}
                        {segment.prize_type && (
                          <>
                            {/* Prize Type Label */}
                            <div className="pt-2 border-t border-gray-100">
                              <p className="text-xs font-bold text-gray-700">
                                Prize Type: {
                                  segment.prize_type === "discount" ? "Discount" :
                                  segment.prize_type === "coupon" ? "Coupon Code" :
                                  segment.prize_type === "free_gift" ? "Free Gift" :
                                  segment.prize_type === "free_shipping" ? "Free Shipping" :
                                  segment.prize_type === "digital_reward" ? "Digital Download Reward" :
                                  segment.prize_type === "hamper" ? "Hamper" :
                                  segment.prize_type === "reward" ? "Reward" :
                                  segment.prize_type === "no_win" ? "No Win / Try Again" :
                                  "Custom"
                                }
                              </p>
                            </div>

                            {/* Prize Configuration Fields */}
                            <div className="space-y-3 pr-0 sm:pr-10">
                              {/* Mobile: Stacked layout */}
                              <div className="flex sm:hidden items-center space-x-2">
                                <input
                                  type="color"
                                  value={segment.color}
                                  onChange={(e) => updateSegmentColor(index, e.target.value)}
                                  disabled={lockState.isLocked}
                                  className={`w-10 h-10 rounded-lg border border-gray-300 flex-shrink-0 ${
                                    lockState.isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                                  }`}
                                />
                                <input
                                  type="text"
                                  value={segment.label}
                                  onChange={(e) => {
                                    const newSegments = [...campaign.wheel_segments];
                                    newSegments[index] = { ...segment, label: e.target.value };
                                    setCampaign({ ...campaign, wheel_segments: newSegments });
                                  }}
                                  disabled={lockState.isLocked}
                                  className={`flex-1 min-w-0 px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                                    lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                                  }`}
                                  placeholder="Prize name"
                                />
                                <div className={lockState.isLocked ? 'opacity-70 pointer-events-none' : ''}>
                                  <EmojiPicker
                                    value={segment.icon || ""}
                                    onChange={(emoji) => updateSegmentIcon(index, emoji)}
                                    placeholder="🎁"
                                  />
                                </div>
                              </div>

                              {/* Desktop: Single row layout */}
                              <div className="hidden sm:flex items-center space-x-3">
                                <input
                                  type="color"
                                  value={segment.color}
                                  onChange={(e) => updateSegmentColor(index, e.target.value)}
                                  disabled={lockState.isLocked}
                                  className={`w-10 h-10 rounded-lg border border-gray-300 flex-shrink-0 ${
                                    lockState.isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                                  }`}
                                />
                                <input
                                  type="text"
                                  value={segment.label}
                                  onChange={(e) => {
                                    const newSegments = [...campaign.wheel_segments];
                                    newSegments[index] = { ...segment, label: e.target.value };
                                    setCampaign({ ...campaign, wheel_segments: newSegments });
                                  }}
                                  disabled={lockState.isLocked}
                                  className={`flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                    lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                                  }`}
                                  placeholder="Prize name"
                                />
                                <div className={lockState.isLocked ? 'opacity-70 pointer-events-none' : ''}>
                                  <EmojiPicker
                                    value={segment.icon || ""}
                                    onChange={(emoji) => updateSegmentIcon(index, emoji)}
                                    placeholder="🎁"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Prize Description - Collapsible */}
                            <div>
                              <label className="flex items-center space-x-2 cursor-pointer mb-2">
                                <input
                                  type="checkbox"
                                  checked={!!segment.prize_description}
                                  onChange={(e) => {
                                    const newSegments = [...campaign.wheel_segments];
                                    newSegments[index] = { 
                                      ...segment, 
                                      prize_description: e.target.checked ? "" : undefined 
                                    };
                                    setCampaign({ ...campaign, wheel_segments: newSegments });
                                  }}
                                  disabled={lockState.isLocked}
                                  className={`w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${
                                    lockState.isLocked ? 'cursor-not-allowed opacity-70' : ''
                                  }`}
                                />
                                <span className={`text-xs font-medium text-gray-700 ${
                                  lockState.isLocked ? 'opacity-70' : ''
                                }`}>Add Prize Description</span>
                              </label>
                              {segment.prize_description !== undefined && (
                                <textarea
                                  value={segment.prize_description || ""}
                                  onChange={(e) => {
                                    const newSegments = [...campaign.wheel_segments];
                                    newSegments[index] = { ...segment, prize_description: e.target.value };
                                    setCampaign({ ...campaign, wheel_segments: newSegments });
                                  }}
                                  disabled={lockState.isLocked}
                                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                                    lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                                  }`}
                                  rows={2}
                                  placeholder="Describe this prize..."
                                />
                              )}
                            </div>

                            {/* Redemption Instructions - Collapsible */}
                            <div>
                              <label className="flex items-center space-x-2 cursor-pointer mb-2">
                                <input
                                  type="checkbox"
                                  checked={!!segment.redemption_instructions}
                                  onChange={(e) => {
                                    const newSegments = [...campaign.wheel_segments];
                                    newSegments[index] = { 
                                      ...segment, 
                                      redemption_instructions: e.target.checked ? "" : undefined 
                                    };
                                    setCampaign({ ...campaign, wheel_segments: newSegments });
                                  }}
                                  disabled={lockState.isLocked}
                                  className={`w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${
                                    lockState.isLocked ? 'cursor-not-allowed opacity-70' : ''
                                  }`}
                                />
                                <span className={`text-xs font-medium text-gray-700 ${
                                  lockState.isLocked ? 'opacity-70' : ''
                                }`}>Add Redemption Instructions</span>
                              </label>
                              {segment.redemption_instructions !== undefined && (
                                <textarea
                                  value={segment.redemption_instructions || ""}
                                  onChange={(e) => {
                                    const newSegments = [...campaign.wheel_segments];
                                    newSegments[index] = { ...segment, redemption_instructions: e.target.value };
                                    setCampaign({ ...campaign, wheel_segments: newSegments });
                                  }}
                                  disabled={lockState.isLocked}
                                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                                    lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                                  }`}
                                  rows={2}
                                  placeholder="Specific instructions for this prize"
                                />
                              )}
                            </div>

                            {/* Prize Image Upload for free_gift, reward, hamper */}
                            {(segment.prize_type === "free_gift" || segment.prize_type === "reward" || segment.prize_type === "hamper") && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-2">
                                  Prize Image (optional)
                                </label>
                                
                                <div className="space-y-3">
                                  {segment.prize_image_url && (
                                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                      <div className="w-20 h-20 bg-white rounded-lg border border-gray-300 flex items-center justify-center flex-shrink-0 p-2">
                                        <img 
                                          src={segment.prize_image_url} 
                                          alt="Prize" 
                                          className="max-w-full max-h-full object-contain"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">Current Image</p>
                                        <p className="text-xs text-gray-500 truncate">{segment.prize_image_url}</p>
                                      </div>
                                      <button
                                        onClick={() => handleRemovePrizeImage(index)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                        title="Remove image"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}

                                  <div>
                                    <label className="block w-full cursor-pointer">
                                      <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                                        {uploadingPrizeImage === index ? (
                                          <>
                                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
                                            <span className="text-sm font-medium text-indigo-600">Uploading...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Upload className="w-5 h-5 text-gray-400 mr-2" />
                                            <span className="text-sm font-medium text-gray-600">
                                              Upload Prize Image
                                            </span>
                                          </>
                                        )}
                                      </div>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handlePrizeImageUpload(index, e)}
                                        disabled={uploadingPrizeImage === index}
                                        className="hidden"
                                      />
                                    </label>
                                    <p className="text-xs text-gray-500 mt-1">PNG, JPEG, GIF, WebP, or SVG (max 5MB)</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Prize File Upload for digital_reward */}
                            {segment.prize_type === "digital_reward" && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-2">
                                  Downloadable File (optional)
                                </label>
                                
                                <div className="space-y-3">
                                  {segment.prize_file_url && (
                                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                          {segment.prize_file_name || "Current File"}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">{segment.prize_file_url}</p>
                                      </div>
                                      <button
                                        onClick={() => handleRemovePrizeFile(index)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                        title="Remove file"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}

                                  <div>
                                    <label className="block w-full cursor-pointer">
                                      <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                                        {uploadingPrizeFile === index ? (
                                          <>
                                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
                                            <span className="text-sm font-medium text-indigo-600">Uploading...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Upload className="w-5 h-5 text-gray-400 mr-2" />
                                            <span className="text-sm font-medium text-gray-600">
                                              Upload Downloadable File
                                            </span>
                                          </>
                                        )}
                                      </div>
                                      <input
                                        type="file"
                                        onChange={(e) => handlePrizeFileUpload(index, e)}
                                        disabled={uploadingPrizeFile === index}
                                        className="hidden"
                                      />
                                    </label>
                                    <p className="text-xs text-gray-500 mt-1">Any file type (max 50MB)</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Coupon Code fields for coupon prize type */}
                            {segment.prize_type === "coupon" && (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Coupon Code
                                  </label>
                                  <input
                                    type="text"
                                    value={segment.coupon_code || ""}
                                    onChange={(e) => {
                                      const newSegments = [...campaign.wheel_segments];
                                      newSegments[index] = { ...segment, coupon_code: e.target.value };
                                      setCampaign({ ...campaign, wheel_segments: newSegments });
                                    }}
                                    disabled={lockState.isLocked}
                                    className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
                                      lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                                    }`}
                                    placeholder="e.g., SAVE20"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Website URL (optional)
                                  </label>
                                  <input
                                    type="text"
                                    value={segment.coupon_url || ""}
                                    onChange={(e) => {
                                      const newSegments = [...campaign.wheel_segments];
                                      newSegments[index] = { ...segment, coupon_url: e.target.value };
                                      setCampaign({ ...campaign, wheel_segments: newSegments });
                                    }}
                                    disabled={lockState.isLocked}
                                    className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                      lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                                    }`}
                                    placeholder="https://example.com/shop"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">URL where the coupon can be applied</p>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Message when prize type not selected */}
                        {!segment.prize_type && (
                          <div className="py-4 text-center">
                            <p className="text-sm text-gray-500">Select a prize type to configure this prize</p>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Prize Button - Positioned after all prizes */}
                    <button
                      onClick={addWheelSegment}
                      disabled={lockState.isLocked}
                      className={`w-full px-6 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
                        lockState.isLocked
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-70'
                          : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/50'
                      }`}
                    >
                      <Plus className="w-5 h-5" />
                      <span>Add New Prize</span>
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-3">Minimum 3 prizes required</p>
                </div>

                {/* General Redemption */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">General Redemption <span className="text-red-500">*</span></h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Redemption Instructions
                      </label>
                      <textarea
                        value={campaign.redemption_instructions || ""}
                        onChange={(e) => setCampaign({ ...campaign, redemption_instructions: e.target.value })}
                        disabled={lockState.isLocked}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                        }`}
                        rows={3}
                        placeholder="e.g., Show this at checkout to redeem your prize"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        <span className="font-semibold text-gray-700">Required:</span> Default instructions shown to all winners. Can be overridden per prize. Alternatively, you can add redemption instructions to individual prizes below.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Spin Behavior - Only show for wheel campaigns */}
                {campaign.campaign_type === "spinwheel" && (
                  <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Spin Behavior</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Spin Duration (seconds)
                        </label>
                        <input
                          type="number"
                          min="3"
                          max="10"
                          step="0.5"
                          value={campaign.spin_duration_seconds || 5}
                          onChange={(e) => setCampaign({ ...campaign, spin_duration_seconds: parseFloat(e.target.value) })}
                          disabled={lockState.isLocked}
                          className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                          }`}
                        />
                        <p className="text-xs text-gray-500 mt-1">How long the wheel spins (3-10 seconds). Default: 5 seconds</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lead Form Settings */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Lead Form</h2>
                    <div className="flex items-center space-x-3">
                      {campaign.is_lead_form_required && (
                        <button
                          onClick={addLeadFormField}
                          disabled={lockState.isLocked}
                          className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center space-x-1 text-sm ${
                            lockState.isLocked
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Field</span>
                        </button>
                      )}
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={campaign.is_lead_form_required}
                          onChange={(e) => setCampaign({ ...campaign, is_lead_form_required: e.target.checked })}
                          disabled={lockState.isLocked}
                          className={`w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${
                            lockState.isLocked ? 'cursor-not-allowed opacity-70' : ''
                          }`}
                        />
                        <span className={`text-sm font-medium text-gray-700 ${
                          lockState.isLocked ? 'opacity-70' : ''
                        }`}>Required</span>
                      </label>
                    </div>
                  </div>
                  {campaign.is_lead_form_required && (
                    <>
                      <div className="space-y-3">
                        {campaign.lead_form_fields.map((field, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => {
                                const newFields = [...campaign.lead_form_fields];
                                newFields[index] = { ...field, label: e.target.value };
                                setCampaign({ ...campaign, lead_form_fields: newFields });
                              }}
                              disabled={lockState.isLocked}
                              className={`flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                              }`}
                              placeholder="Field label"
                            />
                            <select
                              value={field.type}
                              onChange={(e) => {
                                const newFields = [...campaign.lead_form_fields];
                                newFields[index] = { ...field, type: e.target.value as "text" | "email" | "tel" };
                                setCampaign({ ...campaign, lead_form_fields: newFields });
                              }}
                              disabled={lockState.isLocked}
                              className={`px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                                lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                              }`}
                            >
                              <option value="text">Text</option>
                              <option value="email">Email</option>
                              <option value="tel">Phone</option>
                            </select>
                            <label className="flex items-center space-x-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => {
                                  const newFields = [...campaign.lead_form_fields];
                                  newFields[index] = { ...field, required: e.target.checked };
                                  setCampaign({ ...campaign, lead_form_fields: newFields });
                                }}
                                disabled={lockState.isLocked}
                                className={`w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${
                                  lockState.isLocked ? 'cursor-not-allowed opacity-70' : ''
                                }`}
                              />
                              <span className={`text-xs text-gray-500 ${
                                lockState.isLocked ? 'opacity-70' : ''
                              }`}>Req</span>
                            </label>
                            {campaign.lead_form_fields.length > 1 && (
                              <button
                                onClick={() => removeLeadFormField(index)}
                                disabled={lockState.isLocked}
                                className={`p-2 rounded-lg transition-colors ${
                                  lockState.isLocked
                                    ? 'text-gray-400 cursor-not-allowed opacity-70'
                                    : 'text-red-600 hover:bg-red-50'
                                }`}
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-3">Minimum 1 field required</p>
                    </>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <button
                    onClick={handlePreviousStep}
                    className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base order-2 sm:order-1"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={handleNextStep}
                    className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base order-1 sm:order-2"
                  >
                    <span>Next Step</span>
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Visual & Sound */}
            {activeSection === "visual" && (
              <div className="space-y-6">
                {/* Appearance Section */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                    {campaign.campaign_type === "scratch" ? "Scratch Card Appearance" : "Wheel Appearance"}
                  </h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Font Style
                        </label>
                        <select
                          value={campaign.font_family || "Inter"}
                          onChange={(e) => setCampaign({ ...campaign, font_family: e.target.value })}
                          disabled={lockState.isLocked}
                          className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                          }`}
                        >
                          <option value="Inter">Inter</option>
                          <option value="Arial">Arial</option>
                          <option value="Helvetica">Helvetica</option>
                          <option value="Georgia">Georgia</option>
                          <option value="Times New Roman">Times New Roman</option>
                          <option value="Courier New">Courier New</option>
                          <option value="Verdana">Verdana</option>
                          <option value="Comic Sans MS">Comic Sans MS</option>
                          <option value="Impact">Impact</option>
                          <option value="Trebuchet MS">Trebuchet MS</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Font Size (px)
                        </label>
                        <input
                          type="number"
                          min="10"
                          max="32"
                          value={campaign.font_size || 16}
                          onChange={(e) => setCampaign({ ...campaign, font_size: parseInt(e.target.value) })}
                          disabled={lockState.isLocked}
                          className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {campaign.campaign_type === "scratch" ? "Border Thickness (px)" : "Border Slice Thickness (px)"}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={campaign.wheel_border_thickness || 3}
                          onChange={(e) => setCampaign({ ...campaign, wheel_border_thickness: parseInt(e.target.value) })}
                          disabled={lockState.isLocked}
                          className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {campaign.campaign_type === "scratch" ? "Font Color" : "Border Slice Color"}
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="color"
                            value={campaign.wheel_border_color || "#ffffff"}
                            onChange={(e) => setCampaign({ ...campaign, wheel_border_color: e.target.value })}
                            disabled={lockState.isLocked}
                            className={`w-14 h-14 rounded-lg border border-gray-300 ${
                              lockState.isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                            }`}
                          />
                          <input
                            type="text"
                            value={campaign.wheel_border_color || "#ffffff"}
                            onChange={(e) => setCampaign({ ...campaign, wheel_border_color: e.target.value })}
                            disabled={lockState.isLocked}
                            className={`flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
                              lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                            }`}
                            placeholder="#ffffff"
                          />
                        </div>
                        {campaign.campaign_type === "scratch" && (
                          <p className="text-xs text-gray-500 mt-1">This color will be applied to the prize name text</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pointer Style
                      </label>
                      <select
                        value={campaign.pointer_style || "arrow"}
                        onChange={(e) => setCampaign({ ...campaign, pointer_style: e.target.value })}
                        disabled={lockState.isLocked}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                        }`}
                      >
                        <option value="arrow">Arrow</option>
                        <option value="triangle">Triangle</option>
                        <option value="circle">Circle</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Scratch Card Appearance - Only for scratch campaigns */}
                {campaign.campaign_type === "scratch" && (
                  <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Scratch Card Appearance</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Card Shape
                        </label>
                        <select
                          value={campaign.scratch_card_shape || "rounded-rectangle"}
                          onChange={(e) => setCampaign({ ...campaign, scratch_card_shape: e.target.value })}
                          disabled={lockState.isLocked}
                          className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                          }`}
                        >
                          <option value="rounded-rectangle">Rounded Rectangle</option>
                          <option value="rectangle">Rectangle</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Scratch Mask Style
                        </label>
                        <select
                          value={campaign.scratch_mask_style || "silver"}
                          onChange={(e) => setCampaign({ ...campaign, scratch_mask_style: e.target.value })}
                          disabled={lockState.isLocked}
                          className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                          }`}
                        >
                          <option value="silver">Silver</option>
                          <option value="gold">Gold</option>
                          <option value="gray">Gray</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Instructions Title
                        </label>
                        <input
                          type="text"
                          value={campaign.scratch_instructions_title || "Scratch to reveal your prize!"}
                          onChange={(e) => setCampaign({ ...campaign, scratch_instructions_title: e.target.value })}
                          disabled={lockState.isLocked}
                          className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                          }`}
                          placeholder="Scratch to reveal your prize!"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Instructions Subtitle (optional)
                        </label>
                        <input
                          type="text"
                          value={campaign.scratch_instructions_subtitle || ""}
                          onChange={(e) => setCampaign({ ...campaign, scratch_instructions_subtitle: e.target.value })}
                          disabled={lockState.isLocked}
                          className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                          }`}
                          placeholder="Good luck!"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Center Button/Instructions Section */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                    {campaign.campaign_type === "scratch" ? "Start Button" : "Center Spin Button"}
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Button Text
                      </label>
                      <input
                        type="text"
                        value={campaign.spin_button_text && campaign.spin_button_text !== "SPIN" ? campaign.spin_button_text : (campaign.campaign_type === "scratch" ? "BEGIN SCRATCHING" : "SPIN")}
                        onChange={(e) => setCampaign({ ...campaign, spin_button_text: e.target.value })}
                        disabled={lockState.isLocked}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                        }`}
                        placeholder={campaign.campaign_type === "scratch" ? "BEGIN SCRATCHING" : "SPIN"}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Button Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={campaign.spin_button_color || "#6366f1"}
                          onChange={(e) => setCampaign({ ...campaign, spin_button_color: e.target.value })}
                          disabled={lockState.isLocked}
                          className={`w-14 h-14 rounded-lg border border-gray-300 ${
                            lockState.isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                          }`}
                        />
                        <input
                          type="text"
                          value={campaign.spin_button_color || "#6366f1"}
                          onChange={(e) => setCampaign({ ...campaign, spin_button_color: e.target.value })}
                          disabled={lockState.isLocked}
                          className={`flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
                            lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                          }`}
                          placeholder="#6366f1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Button Border Radius (px)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={campaign.spin_button_border_radius || 40}
                        onChange={(e) => setCampaign({ ...campaign, spin_button_border_radius: parseInt(e.target.value) })}
                        disabled={lockState.isLocked}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                        }`}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className={`font-semibold text-gray-900 ${lockState.isLocked ? 'opacity-70' : ''}`}>Pulsating Animation</p>
                        <p className={`text-sm text-gray-600 ${lockState.isLocked ? 'opacity-70' : ''}`}>Add a pulse effect to the button</p>
                      </div>
                      <label className={`relative inline-flex items-center ${lockState.isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={campaign.spin_button_pulse_enabled ?? true}
                          onChange={(e) => setCampaign({ ...campaign, spin_button_pulse_enabled: e.target.checked })}
                          disabled={lockState.isLocked}
                          className="sr-only peer"
                        />
                        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 ${
                          lockState.isLocked ? 'opacity-50' : ''
                        }`}></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Background Customization */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Background</h2>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Background Color
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={campaign.background_gradient_enabled ?? false}
                            onChange={(e) => setCampaign({ 
                              ...campaign, 
                              background_gradient_enabled: e.target.checked,
                              background_gradient_start: e.target.checked ? (campaign.background_gradient_start || campaign.background_color || "#6366f1") : undefined,
                              background_gradient_end: e.target.checked ? (campaign.background_gradient_end || "#8b5cf6") : undefined,
                              background_gradient_direction: e.target.checked ? (campaign.background_gradient_direction || "to-bottom") : undefined,
                            })}
                            disabled={lockState.isLocked}
                            className={`w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${
                              lockState.isLocked ? 'cursor-not-allowed opacity-70' : ''
                            }`}
                          />
                          <span className={`text-sm font-medium text-gray-700 ${
                            lockState.isLocked ? 'opacity-70' : ''
                          }`}>Use Gradient</span>
                        </label>
                      </div>
                      
                      {!campaign.background_gradient_enabled ? (
                        <div className="flex items-center space-x-3">
                          <input
                            type="color"
                            value={campaign.background_color || "#ffffff"}
                            onChange={(e) => setCampaign({ ...campaign, background_color: e.target.value })}
                            disabled={lockState.isLocked}
                            className={`w-14 h-14 rounded-lg border border-gray-300 ${
                              lockState.isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                            }`}
                          />
                          <input
                            type="text"
                            value={campaign.background_color || "#ffffff"}
                            onChange={(e) => setCampaign({ ...campaign, background_color: e.target.value })}
                            disabled={lockState.isLocked}
                            className={`flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
                              lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                            }`}
                            placeholder="#ffffff"
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-2">
                              Start Color
                            </label>
                            <div className="flex items-center space-x-3">
                              <input
                                type="color"
                                value={campaign.background_gradient_start || "#6366f1"}
                                onChange={(e) => setCampaign({ ...campaign, background_gradient_start: e.target.value })}
                                disabled={lockState.isLocked}
                                className={`w-14 h-14 rounded-lg border border-gray-300 ${
                                  lockState.isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                                }`}
                              />
                              <input
                                type="text"
                                value={campaign.background_gradient_start || "#6366f1"}
                                onChange={(e) => setCampaign({ ...campaign, background_gradient_start: e.target.value })}
                                disabled={lockState.isLocked}
                                className={`flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
                                  lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                                }`}
                                placeholder="#6366f1"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-2">
                              End Color
                            </label>
                            <div className="flex items-center space-x-3">
                              <input
                                type="color"
                                value={campaign.background_gradient_end || "#8b5cf6"}
                                onChange={(e) => setCampaign({ ...campaign, background_gradient_end: e.target.value })}
                                disabled={lockState.isLocked}
                                className={`w-14 h-14 rounded-lg border border-gray-300 ${
                                  lockState.isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                                }`}
                              />
                              <input
                                type="text"
                                value={campaign.background_gradient_end || "#8b5cf6"}
                                onChange={(e) => setCampaign({ ...campaign, background_gradient_end: e.target.value })}
                                disabled={lockState.isLocked}
                                className={`flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
                                  lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                                }`}
                                placeholder="#8b5cf6"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-2">
                              Gradient Direction
                            </label>
                            <select
                              value={campaign.background_gradient_direction || "to-bottom"}
                              onChange={(e) => setCampaign({ ...campaign, background_gradient_direction: e.target.value })}
                              disabled={lockState.isLocked}
                              className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                              }`}
                            >
                              <option value="to-bottom">Top to Bottom</option>
                              <option value="to-top">Bottom to Top</option>
                              <option value="to-right">Left to Right</option>
                              <option value="to-left">Right to Left</option>
                              <option value="to-bottom-right">Top-Left to Bottom-Right</option>
                              <option value="to-bottom-left">Top-Right to Bottom-Left</option>
                              <option value="to-top-right">Bottom-Left to Top-Right</option>
                              <option value="to-top-left">Bottom-Right to Top-Left</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Background Image
                      </label>
                      
                      {/* Upload Section */}
                      <div className="space-y-3">
                        {campaign.background_image_url && (
                          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="w-20 h-20 bg-white rounded-lg border border-gray-300 flex items-center justify-center flex-shrink-0 p-2">
                              <img 
                                src={campaign.background_image_url} 
                                alt="Background preview" 
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">Current Background</p>
                              <p className="text-xs text-gray-500 truncate">{campaign.background_image_url}</p>
                            </div>
                            <button
                              onClick={handleRemoveBackgroundImage}
                              disabled={lockState.isLocked}
                              className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                                lockState.isLocked
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-red-600 hover:bg-red-50'
                              }`}
                              title={lockState.isLocked ? "Editing is disabled" : "Remove background"}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        <div className="relative group">
                          <label className={`block w-full ${hasBackgroundImageUpload ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                            <div className={`flex items-center justify-center px-4 py-3 border-2 border-dashed rounded-xl transition-colors ${
                              hasBackgroundImageUpload 
                                ? 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50' 
                                : 'border-gray-200 bg-gray-50 opacity-60'
                            }`}>
                              {uploadingBackground ? (
                                <>
                                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
                                  <span className="text-sm font-medium text-indigo-600">Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className={`w-5 h-5 mr-2 ${hasBackgroundImageUpload ? 'text-gray-400' : 'text-gray-300'}`} />
                                  <span className={`text-sm font-medium ${hasBackgroundImageUpload ? 'text-gray-600' : 'text-gray-400'}`}>
                                    Upload Background Image {!hasBackgroundImageUpload && '(Premium)'}
                                  </span>
                                </>
                              )}
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleBackgroundImageUpload}
                              disabled={uploadingBackground || !hasBackgroundImageUpload}
                              className="hidden"
                            />
                          </label>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPEG, GIF, WebP, or SVG (max 10MB)</p>
                          {!hasBackgroundImageUpload && (
                            <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-full p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10 transition-all duration-200">
                              <a href="/dashboard/billing" className="underline hover:text-indigo-300 transition-colors">Upgrade your plan</a> to upload background images.
                            </div>
                          )}
                        </div>

                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                          </div>
                          <div className="relative flex justify-center text-xs">
                            <span className="px-2 bg-white text-gray-500">or use URL</span>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={campaign.background_image_url || ""}
                          onChange={(e) => setCampaign({ ...campaign, background_image_url: e.target.value })}
                          disabled={lockState.isLocked}
                          className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                          }`}
                          placeholder="https://example.com/background.jpg"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Background image will be used instead of background color if set</p>
                    </div>
                  </div>
                </div>

                {/* Branding */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Branding</h2>
                  <div className="space-y-4">
                    {campaign.campaign_type !== "scratch" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pointer Color
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="color"
                            value={campaign.pointer_color || "#ef4444"}
                            onChange={(e) => setCampaign({ ...campaign, pointer_color: e.target.value })}
                            disabled={lockState.isLocked}
                            className={`w-14 h-14 rounded-lg border border-gray-300 ${
                              lockState.isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                            }`}
                          />
                          <input
                            type="text"
                            value={campaign.pointer_color || "#ef4444"}
                            onChange={(e) => setCampaign({ ...campaign, pointer_color: e.target.value })}
                            disabled={lockState.isLocked}
                            className={`flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
                              lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                            }`}
                            placeholder="#ef4444"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Logo
                      </label>
                      
                      {/* Upload Section */}
                      <div className="space-y-3">
                        {campaign.logo_url && (
                          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="w-20 h-20 bg-white rounded-lg border border-gray-300 flex items-center justify-center flex-shrink-0 p-2">
                              <img 
                                src={campaign.logo_url} 
                                alt="Logo preview" 
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">Current Logo</p>
                              <p className="text-xs text-gray-500 truncate">{campaign.logo_url}</p>
                            </div>
                            <button
                              onClick={handleRemoveLogo}
                              disabled={lockState.isLocked}
                              className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                                lockState.isLocked
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-red-600 hover:bg-red-50'
                              }`}
                              title={lockState.isLocked ? "Editing is disabled" : "Remove logo"}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        <div className="relative group">
                          <label className={`block w-full ${hasLogoUpload ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                            <div className={`flex items-center justify-center px-4 py-3 border-2 border-dashed rounded-xl transition-colors ${
                              hasLogoUpload 
                                ? 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50' 
                                : 'border-gray-200 bg-gray-50 opacity-60'
                            }`}>
                              {uploadingLogo ? (
                                <>
                                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
                                  <span className="text-sm font-medium text-indigo-600">Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className={`w-5 h-5 mr-2 ${hasLogoUpload ? 'text-gray-400' : 'text-gray-300'}`} />
                                  <span className={`text-sm font-medium ${hasLogoUpload ? 'text-gray-600' : 'text-gray-400'}`}>
                                    Upload Logo {!hasLogoUpload && '(Premium)'}
                                  </span>
                                </>
                              )}
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              disabled={uploadingLogo || !hasLogoUpload}
                              className="hidden"
                            />
                          </label>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPEG, GIF, WebP, or SVG (max 5MB)</p>
                          {!hasLogoUpload && (
                            <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-full p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10 transition-all duration-200">
                              <a href="/dashboard/billing" className="underline hover:text-indigo-300 transition-colors">Upgrade your plan</a> to upload logos.
                            </div>
                          )}
                        </div>

                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                          </div>
                          <div className="relative flex justify-center text-xs">
                            <span className="px-2 bg-white text-gray-500">or use URL</span>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={campaign.logo_url || ""}
                          onChange={(e) => setCampaign({ ...campaign, logo_url: e.target.value })}
                          disabled={lockState.isLocked}
                          className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                          }`}
                          placeholder="https://example.com/logo.png"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Logo Position
                      </label>
                      <select
                        value={campaign.logo_position || "top"}
                        onChange={(e) => setCampaign({ ...campaign, logo_position: e.target.value })}
                        disabled={lockState.isLocked}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                        }`}
                      >
                        <option value="top">Above Wheel</option>
                        <option value="bottom">Below Wheel</option>
                        <option value="top-left">Top Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="bottom-right">Bottom Right</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Watermark
                      </label>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Show "Powered by PromoGauge" watermark</p>
                          <p className="text-sm text-gray-600">Display branding footer on campaign page</p>
                        </div>
                        {watermarkEntitlementLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                        ) : (
                          <div className="relative group">
                            <label className={`relative inline-flex items-center ${hasWatermarkRemoval ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                              <input
                                type="checkbox"
                                checked={campaign.show_watermark ?? true}
                                onChange={(e) => setCampaign({ ...campaign, show_watermark: e.target.checked })}
                                disabled={!hasWatermarkRemoval}
                                className="sr-only peer"
                              />
                              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 ${!hasWatermarkRemoval ? 'opacity-50' : ''}`}></div>
                            </label>
                            {!hasWatermarkRemoval && (
                              <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10 transition-all duration-200">
                                <a href="/dashboard/billing" className="underline hover:text-indigo-300 transition-colors">Upgrade your plan</a> to remove the PromoGauge watermark.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* External Border */}
                {campaign.campaign_type !== "scratch" && (
                <div className={`bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 ${!hasExternalBorder ? 'relative' : ''}`}>
                  {!hasExternalBorder && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                      <div className="text-center p-6">
                        <p className="text-lg font-semibold text-gray-900 mb-2">Premium Feature</p>
                        <p className="text-sm text-gray-600 mb-4">External borders are available on paid plans</p>
                        <a
                          href="/dashboard/billing"
                          className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
                        >
                          Upgrade Plan
                        </a>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">External Border</h2>
                    <label className={`relative inline-flex items-center ${hasExternalBorder ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                      <input
                        type="checkbox"
                        checked={campaign.border_enabled ?? false}
                        onChange={(e) => setCampaign({ 
                          ...campaign, 
                          border_enabled: e.target.checked,
                          border_theme: e.target.checked ? (campaign.border_theme && (campaign.border_theme as any) !== "none" ? campaign.border_theme : "default") : null
                        })}
                        disabled={!hasExternalBorder}
                        className="sr-only peer"
                      />
                      <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 ${!hasExternalBorder ? 'opacity-50' : ''}`}></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 mb-6">Customize the external border around the wheel</p>
                  
                  {campaign.border_enabled && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Border Theme
                        </label>
                        <select
                          value={(campaign.border_theme && (campaign.border_theme as any) !== "none") ? campaign.border_theme : "default"}
                          onChange={(e) => {
                            const value = e.target.value;
                            setCampaign({ 
                              ...campaign, 
                              border_theme: value === "default" || value === "custom" ? value as any : null
                            });
                          }}
                          disabled={lockState.isLocked}
                          className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                          }`}
                        >
                          <option value="default">Default</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>

                      {campaign.border_theme === "default" && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Border Color
                            </label>
                            <div className="flex items-center space-x-3">
                              <input
                                type="color"
                                value={campaign.border_default_color || "#FFFFFF"}
                                onChange={(e) => setCampaign({ ...campaign, border_default_color: e.target.value })}
                                disabled={lockState.isLocked}
                                className={`w-14 h-14 rounded-lg border border-gray-300 ${
                                  lockState.isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                                }`}
                              />
                              <input
                                type="text"
                                value={campaign.border_default_color || "#FFFFFF"}
                                onChange={(e) => setCampaign({ ...campaign, border_default_color: e.target.value })}
                                disabled={lockState.isLocked}
                                className={`flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
                                  lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                                }`}
                                placeholder="#FFFFFF"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Border Thickness: {campaign.border_default_thickness || 10}px
                            </label>
                            <input
                              type="range"
                              min="4"
                              max="20"
                              value={campaign.border_default_thickness || 10}
                              onChange={(e) => setCampaign({ ...campaign, border_default_thickness: parseInt(e.target.value) })}
                              disabled={lockState.isLocked}
                              className={`w-full ${
                                lockState.isLocked ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            />
                          </div>
                        </>
                      )}

                      {campaign.border_theme === "custom" && (
                        <>
                          <div className="pb-4 border-b border-gray-200 mb-4">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">Default Border</p>
                                <p className="text-xs text-gray-500">Static border circle around the wheel</p>
                              </div>
                              <label className={`relative inline-flex items-center ${lockState.isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                <input
                                  type="checkbox"
                                  checked={campaign.border_default_enabled ?? true}
                                  onChange={(e) => setCampaign({ 
                                    ...campaign, 
                                    border_default_enabled: e.target.checked 
                                  })}
                                  disabled={lockState.isLocked}
                                  className="sr-only peer"
                                />
                                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 ${
                                  lockState.isLocked ? 'opacity-50' : ''
                                }`}></div>
                              </label>
                            </div>

                            {campaign.border_default_enabled && (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Border Color
                                  </label>
                                  <div className="flex items-center space-x-3">
                                    <input
                                      type="color"
                                      value={campaign.border_default_color || "#FFFFFF"}
                                      onChange={(e) => setCampaign({ ...campaign, border_default_color: e.target.value })}
                                      disabled={lockState.isLocked}
                                      className={`w-14 h-14 rounded-lg border border-gray-300 ${
                                        lockState.isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                                      }`}
                                    />
                                    <input
                                      type="text"
                                      value={campaign.border_default_color || "#FFFFFF"}
                                      onChange={(e) => setCampaign({ ...campaign, border_default_color: e.target.value })}
                                      disabled={lockState.isLocked}
                                      className={`flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
                                        lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                                      }`}
                                      placeholder="#FFFFFF"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Border Thickness: {campaign.border_default_thickness || 10}px
                                  </label>
                                  <input
                                    type="range"
                                    min="4"
                                    max="20"
                                    value={campaign.border_default_thickness || 10}
                                    onChange={(e) => setCampaign({ ...campaign, border_default_thickness: parseInt(e.target.value) })}
                                    disabled={lockState.isLocked}
                                    className={`w-full ${
                                      lockState.isLocked ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Custom Colors (max 5)
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {(campaign.border_custom_colors || []).map((color, index) => (
                                <div key={index} className="flex items-center space-x-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                                  <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => {
                                      const newColors = [...(campaign.border_custom_colors || [])];
                                      newColors[index] = e.target.value;
                                      setCampaign({ ...campaign, border_custom_colors: newColors });
                                    }}
                                    disabled={lockState.isLocked}
                                    className={`w-8 h-8 rounded border border-gray-300 ${
                                      lockState.isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                                    }`}
                                  />
                                  <button
                                    onClick={() => {
                                      const newColors = (campaign.border_custom_colors || []).filter((_, i) => i !== index);
                                      setCampaign({ ...campaign, border_custom_colors: newColors });
                                    }}
                                    disabled={lockState.isLocked}
                                    className={lockState.isLocked ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            {(!campaign.border_custom_colors || campaign.border_custom_colors.length < 5) && (
                              <button
                                onClick={() => {
                                  const newColors = [...(campaign.border_custom_colors || []), "#ffffff"];
                                  setCampaign({ ...campaign, border_custom_colors: newColors });
                                }}
                                disabled={lockState.isLocked}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  lockState.isLocked
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                }`}
                              >
                                <Plus className="w-4 h-4 inline mr-1" />
                                Add Color
                              </button>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Bulb Shape
                            </label>
                            <select
                              value={campaign.border_bulb_shape || "circle"}
                              onChange={(e) => setCampaign({ ...campaign, border_bulb_shape: e.target.value as any })}
                              disabled={lockState.isLocked}
                              className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                              }`}
                            >
                              <option value="circle">Circle</option>
                              <option value="heart">Heart</option>
                              <option value="star">Star</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Bulb Count: {campaign.border_bulb_count || 24}
                            </label>
                            <input
                              type="range"
                              min="8"
                              max="40"
                              value={campaign.border_bulb_count || 24}
                              onChange={(e) => setCampaign({ ...campaign, border_bulb_count: parseInt(e.target.value) })}
                              disabled={lockState.isLocked}
                              className={`w-full ${
                                lockState.isLocked ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Bulb Size: {campaign.border_bulb_size || 10}px
                            </label>
                            <input
                              type="range"
                              min="4"
                              max="20"
                              value={campaign.border_bulb_size || 10}
                              onChange={(e) => setCampaign({ ...campaign, border_bulb_size: parseInt(e.target.value) })}
                              disabled={lockState.isLocked}
                              className={`w-full ${
                                lockState.isLocked ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Blink Speed
                            </label>
                            <select
                              value={campaign.border_blink_speed || "medium"}
                              onChange={(e) => setCampaign({ ...campaign, border_blink_speed: e.target.value as any })}
                              disabled={lockState.isLocked}
                              className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                              }`}
                            >
                              <option value="slow">Slow</option>
                              <option value="medium">Medium</option>
                              <option value="fast">Fast</option>
                            </select>
                          </div>

                          <div className="pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">Connector Ring</p>
                                <p className="text-xs text-gray-500">Ring that connects all bulb shapes</p>
                              </div>
                              <label className={`relative inline-flex items-center ${lockState.isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                <input
                                  type="checkbox"
                                  checked={campaign.border_connector_ring_enabled ?? false}
                                  onChange={(e) => setCampaign({ 
                                    ...campaign, 
                                    border_connector_ring_enabled: e.target.checked 
                                  })}
                                  disabled={lockState.isLocked}
                                  className="sr-only peer"
                                />
                                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 ${
                                  lockState.isLocked ? 'opacity-50' : ''
                                }`}></div>
                              </label>
                            </div>

                            {campaign.border_connector_ring_enabled && (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Connector Ring Color
                                  </label>
                                  <div className="flex items-center space-x-3">
                                    <input
                                      type="color"
                                      value={campaign.border_connector_ring_color || "#FFFFFF"}
                                      onChange={(e) => setCampaign({ ...campaign, border_connector_ring_color: e.target.value })}
                                      disabled={lockState.isLocked}
                                      className={`w-14 h-14 rounded-lg border border-gray-300 ${
                                        lockState.isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                                      }`}
                                    />
                                    <input
                                      type="text"
                                      value={campaign.border_connector_ring_color || "#FFFFFF"}
                                      onChange={(e) => setCampaign({ ...campaign, border_connector_ring_color: e.target.value })}
                                      disabled={lockState.isLocked}
                                      className={`flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
                                        lockState.isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                                      }`}
                                      placeholder="#FFFFFF"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Connector Ring Thickness: {campaign.border_connector_ring_thickness || 6}px
                                  </label>
                                  <input
                                    type="range"
                                    min="2"
                                    max="15"
                                    value={campaign.border_connector_ring_thickness || 6}
                                    onChange={(e) => setCampaign({ ...campaign, border_connector_ring_thickness: parseInt(e.target.value) })}
                                    disabled={lockState.isLocked}
                                    className={`w-full ${
                                      lockState.isLocked ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                )}

                {/* Effects & Sound */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Effects & Sound</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                          <Sparkles className={`w-5 h-5 text-purple-600 ${lockState.isLocked ? 'opacity-70' : ''}`} />
                        </div>
                        <div>
                          <p className={`font-semibold text-gray-900 ${lockState.isLocked ? 'opacity-70' : ''}`}>Confetti Animation</p>
                          <p className={`text-sm text-gray-600 ${lockState.isLocked ? 'opacity-70' : ''}`}>Show confetti when user wins</p>
                        </div>
                      </div>
                      <label className={`relative inline-flex items-center ${lockState.isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={campaign.confetti_enabled ?? true}
                          onChange={(e) => setCampaign({ ...campaign, confetti_enabled: e.target.checked })}
                          disabled={lockState.isLocked}
                          className="sr-only peer"
                        />
                        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 ${
                          lockState.isLocked ? 'opacity-50' : ''
                        }`}></div>
                      </label>
                    </div>

                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Volume2 className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Sound Effects</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Sound effects enhance player engagement</p>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div>
                            <p className={`font-medium text-gray-900 text-sm ${lockState.isLocked ? 'opacity-70' : ''}`}>Spin Sound</p>
                            <p className={`text-xs text-gray-600 ${lockState.isLocked ? 'opacity-70' : ''}`}>Play sound when wheel starts spinning</p>
                          </div>
                          <label className={`relative inline-flex items-center ${lockState.isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input
                              type="checkbox"
                              checked={campaign.sound_settings?.spin ?? true}
                              onChange={(e) => setCampaign({ 
                                ...campaign, 
                                sound_settings: {
                                  spin: e.target.checked,
                                  win: campaign.sound_settings?.win ?? true,
                                  noWin: campaign.sound_settings?.noWin ?? true,
                                }
                              })}
                              disabled={lockState.isLocked}
                              className="sr-only peer"
                            />
                            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${
                              lockState.isLocked ? 'opacity-50' : ''
                            }`}></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div>
                            <p className={`font-medium text-gray-900 text-sm ${lockState.isLocked ? 'opacity-70' : ''}`}>Win Sound</p>
                            <p className={`text-xs text-gray-600 ${lockState.isLocked ? 'opacity-70' : ''}`}>Play sound when user wins a prize</p>
                          </div>
                          <label className={`relative inline-flex items-center ${lockState.isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input
                              type="checkbox"
                              checked={campaign.sound_settings?.win ?? true}
                              onChange={(e) => setCampaign({ 
                                ...campaign, 
                                sound_settings: {
                                  spin: campaign.sound_settings?.spin ?? true,
                                  win: e.target.checked,
                                  noWin: campaign.sound_settings?.noWin ?? true,
                                }
                              })}
                              disabled={lockState.isLocked}
                              className="sr-only peer"
                            />
                            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 ${
                              lockState.isLocked ? 'opacity-50' : ''
                            }`}></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                          <div>
                            <p className={`font-medium text-gray-900 text-sm ${lockState.isLocked ? 'opacity-70' : ''}`}>No-Win Sound</p>
                            <p className={`text-xs text-gray-600 ${lockState.isLocked ? 'opacity-70' : ''}`}>Play sound when user gets "No Win"</p>
                          </div>
                          <label className={`relative inline-flex items-center ${lockState.isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input
                              type="checkbox"
                              checked={campaign.sound_settings?.noWin ?? true}
                              onChange={(e) => setCampaign({ 
                                ...campaign, 
                                sound_settings: {
                                  spin: campaign.sound_settings?.spin ?? true,
                                  win: campaign.sound_settings?.win ?? true,
                                  noWin: e.target.checked,
                                }
                              })}
                              disabled={lockState.isLocked}
                              className="sr-only peer"
                            />
                            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600 ${
                              lockState.isLocked ? 'opacity-50' : ''
                            }`}></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-start">
                  <button
                    onClick={handlePreviousStep}
                    className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Back</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6 space-y-4 sm:space-y-6">
              {/* Preview */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                  {campaign.campaign_type === "scratch" ? "Scratch Card Preview" : "Wheel Preview"}
                </h2>
                {campaign.campaign_type === "scratch" ? (
                  <ScratchPreview campaign={campaign} />
                ) : (
                  <WheelPreview 
                  segments={campaign.wheel_segments}
                  pointerColor={campaign.pointer_color || undefined}
                  logoUrl={campaign.logo_url || undefined}
                  logoPosition={campaign.logo_position || undefined}
                  backgroundColor={campaign.background_color || undefined}
                  backgroundGradientEnabled={campaign.background_gradient_enabled}
                  backgroundGradientStart={campaign.background_gradient_start || undefined}
                  backgroundGradientEnd={campaign.background_gradient_end || undefined}
                  backgroundGradientDirection={campaign.background_gradient_direction || undefined}
                  backgroundImageUrl={campaign.background_image_url || undefined}
                  fontFamily={campaign.font_family || undefined}
                  fontSize={campaign.font_size || undefined}
                  wheelBorderThickness={campaign.wheel_border_thickness || undefined}
                  wheelBorderColor={campaign.wheel_border_color || undefined}
                  pointerStyle={campaign.pointer_style || undefined}
                  spinButtonText={campaign.spin_button_text || undefined}
                  spinButtonColor={campaign.spin_button_color || undefined}
                  spinButtonBorderRadius={campaign.spin_button_border_radius || undefined}
                  spinButtonPulseEnabled={campaign.spin_button_pulse_enabled}
                  soundSettings={campaign.sound_settings}
                  borderEnabled={campaign.border_enabled}
                  borderTheme={campaign.border_theme as any}
                  borderDefaultEnabled={campaign.border_default_enabled}
                  borderDefaultColor={campaign.border_default_color}
                  borderDefaultThickness={campaign.border_default_thickness}
                  borderCustomColors={campaign.border_custom_colors}
                  borderBulbShape={campaign.border_bulb_shape as any}
                  borderBulbCount={campaign.border_bulb_count}
                  borderBulbSize={campaign.border_bulb_size}
                  borderBlinkSpeed={campaign.border_blink_speed as any}
                  borderConnectorRingEnabled={campaign.border_connector_ring_enabled}
                  borderConnectorRingColor={campaign.border_connector_ring_color}
                  borderConnectorRingThickness={campaign.border_connector_ring_thickness}
                />
                )}
                
                {/* Preview Campaign Button */}
                <button
                  onClick={previewCampaign}
                  className="w-full mt-3 sm:mt-4 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base"
                >
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Preview Campaign</span>
                </button>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Quick Stats</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    campaign.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {campaign.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{campaign.campaign_type === "scratch" ? "Total Scratches" : "Total Spins"}</span>
                  <span className="text-lg font-bold text-gray-900">{campaign.spins_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Leads</span>
                  <span className="text-lg font-bold text-gray-900">{campaign.leads_count}</span>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-500">
                    Created {new Date(campaign.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {showToast && (
        <div className="fixed top-6 right-6 z-[10000] animate-in slide-in-from-right duration-300">
          <div className="bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="font-semibold">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Publish Confirmation Modal */}
      <PublishConfirmationModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onConfirm={handlePublishConfirm}
        type={publishAction}
      />

      {/* Preview Warnings Modal */}
      {showPreviewWarnings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col transform animate-in zoom-in duration-300">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Campaign Readiness Check</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {previewWarnings.filter(w => w.startsWith("❌")).length} critical issues, {previewWarnings.filter(w => w.startsWith("⚠️")).length} warnings, {previewWarnings.filter(w => w.startsWith("⏰")).length} timing issues
                </p>
              </div>
              <button
                onClick={() => setShowPreviewWarnings(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {previewWarnings.length > 0 ? (
                  <>
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-semibold text-yellow-800">
                            Action Required Before Going Live
                          </h3>
                          <p className="text-xs text-yellow-700 mt-1">
                            The following issues may affect your campaign. Please review and address them before making your campaign public.
                          </p>
                        </div>
                      </div>
                    </div>

                    <ul className="space-y-2">
                      {previewWarnings.map((warning, index) => {
                        const isCritical = warning.startsWith("❌");
                        const isWarning = warning.startsWith("⚠️");
                        
                        return (
                          <li 
                            key={index} 
                            className={`p-3 rounded-lg border-l-4 ${
                              isCritical 
                                ? 'bg-red-50 border-red-500' 
                                : isWarning
                                ? 'bg-yellow-50 border-yellow-500'
                                : 'bg-blue-50 border-blue-500'
                            }`}
                          >
                            <p className={`text-sm font-medium ${
                              isCritical 
                                ? 'text-red-800' 
                                : isWarning
                                ? 'text-yellow-800'
                                : 'text-blue-800'
                            }`}>
                              {warning}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : (
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-semibold text-green-800">
                          Campaign is Ready!
                        </h3>
                        <p className="text-xs text-green-700 mt-1">
                          All required settings are configured. Your campaign is ready to go live.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowPreviewWarnings(false)}
                  className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
                >
                  Fix Issues
                </button>
                <button
                  onClick={handleProceedToPreview}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
                >
                  Preview Anyway
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Preview mode allows you to test your campaign even with issues present
              </p>
            </div>
          </div>
        </div>
      )}
      </DashboardLayout>
  );
}
