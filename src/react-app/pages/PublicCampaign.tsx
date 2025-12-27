import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Loader2, Trophy, Mail, X, Share2, CheckCircle2, Clock, Copy, Phone, MapPin, Edit } from "lucide-react";
import SpinWheel, { type SpinWheelHandle } from "@/react-app/components/SpinWheel";
import ScratchCard, { type ScratchCardHandle } from "@/react-app/components/ScratchCard";
import type { Campaign } from "@/shared/types";

type FlowStep = "leadform" | "wheel" | "congratulations" | "claim" | "redemption" | "thankyou";

export default function PublicCampaign() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<FlowStep>("leadform");
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [prize, setPrize] = useState<string | null>(null);
  const [prizeSegment, setPrizeSegment] = useState<any>(null);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>("");
  const [canPlayAgain, setCanPlayAgain] = useState(false);
  const [campaignStatusMessage, setCampaignStatusMessage] = useState<string | null>(null);
  const [isCampaignAccessible, setIsCampaignAccessible] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [redemptionExpiresAt, setRedemptionExpiresAt] = useState<string>("");
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [leadFormError, setLeadFormError] = useState<string | null>(null);
  const [leadFormSubmitting, setLeadFormSubmitting] = useState(false);
  const wheelRef = useRef<SpinWheelHandle>(null);
  const scratchRef = useRef<ScratchCardHandle>(null);
  
  // Detect if this is preview mode (using slug route)
  const isPreviewMode = !!slug && !id;

  useEffect(() => {
    // Generate device fingerprint
    const generateFingerprint = () => {
      const nav = navigator as any;
      const screen = window.screen;
      const fingerprint = [
        nav.userAgent,
        nav.language,
        screen.colorDepth,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset(),
        !!window.sessionStorage,
        !!window.localStorage,
      ].join('|');
      
      let hash = 0;
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(36);
    };
    
    setDeviceFingerprint(generateFingerprint());
  }, []);

  useEffect(() => {
    if (slug || id) {
      fetchCampaign();
    }
  }, [slug, id]);

  // Check ownership whenever user or campaign changes
  useEffect(() => {
    const checkOwnership = async () => {
      if (user && campaign) {
        try {
          const userRes = await fetch("/api/users/me");
          if (userRes.ok) {
            const userData = await userRes.json();
            setIsOwner(campaign.user_id === userData.appUser?.id);
          }
        } catch (error) {
          console.error("Failed to check ownership:", error);
        }
      } else {
        setIsOwner(false);
      }
    };

    checkOwnership();
  }, [user, campaign]);

  useEffect(() => {
    if (redemptionExpiresAt) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(redemptionExpiresAt).getTime();
        const distance = expiry - now;

        if (distance < 0) {
          clearInterval(interval);
          setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        } else {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          setTimeRemaining({ days, hours, minutes, seconds });
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [redemptionExpiresAt]);

  const fetchCampaign = async () => {
    try {
      // Use ID if available, otherwise use slug (for preview mode)
      const endpoint = id ? `/api/public/campaigns/by-id/${id}` : `/api/public/campaigns/${slug}`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setCampaign(data);
        
        // Check if current user owns this campaign
        if (user) {
          const userRes = await fetch("/api/users/me");
          if (userRes.ok) {
            const userData = await userRes.json();
            setIsOwner(data.user_id === userData.appUser?.id);
          }
        }
        
        // PREVIEW MODE: Skip all status/date checks and always allow access
        if (isPreviewMode) {
          setIsCampaignAccessible(true);
          setCampaignStatusMessage(null);
          setCurrentStep(data.is_lead_form_required ? "leadform" : "wheel");
        } else {
          // PRODUCTION MODE: Enforce status and date checks
          const now = new Date();
          let accessible = true;
          let message = null;

          if (data.status === "draft") {
            accessible = false;
            message = "This campaign is not yet available.";
          } else if (data.status === "ended") {
            accessible = false;
            message = "This campaign has ended.";
          } else if (data.status === "paused") {
            accessible = true;
            message = "This campaign is temporarily paused.";
          } else if (data.status === "active") {
            if (data.start_datetime) {
              const startDate = new Date(data.start_datetime);
              if (now < startDate) {
                accessible = false;
                message = "This campaign has not started yet.";
              }
            }
            if (data.end_datetime) {
              const endDate = new Date(data.end_datetime);
              if (now > endDate) {
                accessible = false;
                message = "This campaign has ended.";
              }
            }
          }

          setIsCampaignAccessible(accessible);
          setCampaignStatusMessage(message);

          // Start at lead form if required, otherwise wheel
          if (accessible) {
            setCurrentStep(data.is_lead_form_required ? "leadform" : "wheel");
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch campaign:", error);
    } finally {
      setLoading(false);
    }
  };

  

  const handleSpinClick = async () => {
    if (hasSpun) return;

    if (!campaign) return;
    
    // PREVIEW MODE: Skip all validations
    if (isPreviewMode) {
      return; // Allow spin to proceed
    }
    
    // PRODUCTION MODE: Enforce validations
    const now = new Date();
    
    if (campaign.status === "draft") {
      setSpinError("This campaign is not yet available.");
      setHasSpun(true);
      return;
    }
    if (campaign.status === "ended") {
      setSpinError("This campaign has ended.");
      setHasSpun(true);
      return;
    }
    if (campaign.status === "paused") {
      setSpinError("This campaign is temporarily paused.");
      setHasSpun(true);
      return;
    }
    
    if (campaign.status === "active") {
      if (campaign.start_datetime) {
        const startDate = new Date(campaign.start_datetime);
        if (now < startDate) {
          setSpinError("This campaign has not started yet.");
          setHasSpun(true);
          return;
        }
      }
      if (campaign.end_datetime) {
        const endDate = new Date(campaign.end_datetime);
        if (now > endDate) {
          setSpinError("This campaign has ended.");
          setHasSpun(true);
          return;
        }
      }
    }

    try {
      const checkIdentifier = id || slug;
      const checkEndpoint = id ? `/api/public/campaigns/by-id/${checkIdentifier}/check-spin` : `/api/public/campaigns/${checkIdentifier}/check-spin`;
      const checkRes = await fetch(checkEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          device_fingerprint: deviceFingerprint,
        }),
      });

      const checkData = await checkRes.json();
      
      if (!checkData.can_spin) {
        setSpinError(checkData.message || "You have reached the spin limit for this campaign.");
        setHasSpun(true);
        return;
      }
    } catch (error) {
      console.error("Error checking spin limits:", error);
      setSpinError("An error occurred. Please try again.");
      setHasSpun(true);
    }
  };

  const handleSpinComplete = async (wonPrize: string) => {
    setPrize(wonPrize);
    
    if (campaign) {
      const segment = campaign.wheel_segments.find(s => s.label === wonPrize);
      setPrizeSegment(segment);
    }
    
    setHasSpun(true);

    try {
      if (campaign) {
        const spinIdentifier = id || slug;
        const spinEndpoint = id ? `/api/public/campaigns/by-id/${spinIdentifier}/spin` : `/api/public/campaigns/${spinIdentifier}/spin`;
        await fetch(spinEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            prize: wonPrize,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            device_fingerprint: deviceFingerprint,
          }),
        });
        
        const checkIdentifier = id || slug;
        const checkEndpoint = id ? `/api/public/campaigns/by-id/${checkIdentifier}/check-spin` : `/api/public/campaigns/${checkIdentifier}/check-spin`;
        const canPlayResponse = await fetch(checkEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            device_fingerprint: deviceFingerprint,
          }),
        });
        
        const canPlayData = await canPlayResponse.json();
        setCanPlayAgain(canPlayData.can_spin || false);
      }
    } catch (error) {
      console.error("Error recording spin:", error);
    }

    setCurrentStep("congratulations");
  };

  const handleClaimPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign || !prize) return;

    setSubmitting(true);
    setClaimError(null);
    try {
      const claimIdentifier = id || slug;
      const claimEndpoint = id ? `/api/public/campaigns/by-id/${claimIdentifier}/claim-prize` : `/api/public/campaigns/${claimIdentifier}/claim-prize`;
      const res = await fetch(claimEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          prize: prize,
          device_fingerprint: deviceFingerprint,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReferenceNumber(data.reference_number);
        setRedemptionExpiresAt(data.redemption_expires_at);
        setCurrentStep("redemption");
      } else {
        const errorData = await res.json();
        setClaimError(errorData.error || "Failed to claim prize. Please try again.");
      }
    } catch (error) {
      console.error("Failed to claim prize:", error);
      setClaimError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlayAgain = () => {
    setHasSpun(false);
    setPrize(null);
    setPrizeSegment(null);
    setSpinError(null);
    setAcceptTerms(false);
    setAcceptPrivacy(false);
    setFormData({ name: "", email: "", phone: "" });
    setCurrentStep(campaign?.is_lead_form_required ? "leadform" : "wheel");
  };

  const handleShareWhatsApp = () => {
    if (!campaign || !prize || !referenceNumber) return;
    
    // Build the comprehensive prize proof message
    let message = `🎉 I just won a prize on the PromoGauge campaign!\n\n`;
    
    // Winner Information (at the top)
    message += `*WINNER INFORMATION*\n`;
    if (formData.name) {
      message += `*Name:* ${formData.name}\n`;
    }
    if (formData.email) {
      message += `*Email:* ${formData.email}\n`;
    }
    if (formData.phone) {
      message += `*Phone:* ${formData.phone}\n`;
    }
    message += `\n`;
    
    // Prize details
    message += `*PRIZE DETAILS*\n`;
    message += `*Prize:* ${prize}\n`;
    if (prizeSegment?.prize_description) {
      message += `*Description:* ${prizeSegment.prize_description}\n`;
    }
    
    // Digital Download Link (if available)
    if (prizeSegment?.prize_type === "digital_reward" && prizeSegment?.prize_file_url) {
      const fullDownloadUrl = prizeSegment.prize_file_url.startsWith('http') 
        ? prizeSegment.prize_file_url 
        : `${window.location.origin}${prizeSegment.prize_file_url}`;
      message += `*Download Link:* ${fullDownloadUrl}\n`;
    }
    
    // Coupon Code and URL (if available)
    if (prizeSegment?.coupon_code) {
      message += `*Coupon Code:* ${prizeSegment.coupon_code}\n`;
    }
    if (prizeSegment?.coupon_url) {
      message += `*Apply Coupon Here:* ${prizeSegment.coupon_url}\n`;
    }
    
    // Calculate and show expiry
    if (redemptionExpiresAt) {
      const now = new Date().getTime();
      const expiry = new Date(redemptionExpiresAt).getTime();
      const daysRemaining = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining > 0) {
        message += `*Expires in:* ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}\n`;
      } else {
        message += `*Expires in:* Less than 1 day\n`;
      }
    }
    
    message += `*Reference Code:* ${referenceNumber}\n\n`;
    
    // Campaign details
    message += `*CAMPAIGN DETAILS*\n`;
    message += `*Campaign:* ${campaign.name}\n`;
    if (campaign.business_name) {
      message += `*Business:* ${campaign.business_name}\n`;
    }
    message += `*Campaign ID:* ${campaign.id}\n\n`;
    
    // Redemption instructions
    const instructions = prizeSegment?.redemption_instructions || campaign.redemption_instructions;
    if (instructions) {
      message += `*How to redeem:*\n${instructions}\n\n`;
    }
    
    // Redemption page link
    message += `*Campaign link:* ${window.location.href}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareSocial = (platform: string) => {
    if (!campaign) return;
    
    const url = window.location.href;
    const text = `Check out this amazing campaign: ${campaign.name}`;
    
    let shareUrl = '';
    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'instagram':
        // Instagram doesn't support direct sharing via URL
        alert('Please share this campaign on Instagram manually!');
        return;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  // Smart text color detection for footer
  const getFooterTextColor = (bgColor?: string | null, bgImage?: string | null): string => {
    // If there's a background image, use white text with shadow for better visibility
    if (bgImage) {
      return '#ffffff';
    }
    
    // If no background color, use default gray
    if (!bgColor) {
      return '#6b7280'; // gray-500
    }
    
    // Parse hex color and calculate luminance
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark backgrounds, dark gray for light backgrounds
    return luminance > 0.5 ? '#374151' : '#ffffff'; // gray-700 or white
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Campaign Not Found</h1>
          <p className="text-gray-600">This campaign may have been removed or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  if (campaign.status === "draft" && !isPreviewMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">This campaign is not live yet.</h1>
          <p className="text-gray-600">Please check back later.</p>
          {!campaign.is_published && (
            <p className="text-sm text-gray-500 mt-4">The campaign owner is still preparing this experience.</p>
          )}
        </div>
      </div>
    );
  }

  const getBackgroundStyle = (): React.CSSProperties => {
    if (campaign.background_image_url) {
      return {
        backgroundColor: campaign.background_color || '#ffffff', // Fallback color under image
        backgroundImage: `url(${campaign.background_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      };
    }
    
    if (campaign.background_gradient_enabled && campaign.background_gradient_start && campaign.background_gradient_end) {
      // Convert direction format from "to-bottom" to "to bottom" for CSS
      const cssDirection = campaign.background_gradient_direction?.replace(/-/g, ' ') || 'to bottom';
      return {
        background: `linear-gradient(${cssDirection}, ${campaign.background_gradient_start}, ${campaign.background_gradient_end})`,
        backgroundAttachment: 'fixed',
      };
    }
    
    return {
      backgroundColor: campaign.background_color || '#ffffff',
      backgroundAttachment: 'fixed',
    };
  };

  const backgroundStyle = getBackgroundStyle();

  // Check if the prize is a "No Win" type based on prize_type field
  const isNoWin = prizeSegment?.prize_type === "no_win";
  const isWin = prize && !isNoWin;

  return (
    <div className="min-h-screen" style={backgroundStyle}>
      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="bg-yellow-500 text-white py-2 px-4 text-center font-semibold text-sm sticky top-0 z-50 shadow-lg">
          🔒 PREVIEW MODE - This is for testing only. No data is being tracked or saved.
        </div>
      )}
      
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 md:py-6">
          <div className="flex items-center justify-center">
            <h1 className="text-xl md:text-3xl font-bold text-gray-900 text-center">{campaign.name}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 md:py-12">
        {/* Lead Form (shown first if required) */}
        {currentStep === "leadform" && (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 md:p-12">
            <div className="text-center mb-8">
              {campaign.logo_url && (
                <img 
                  src={campaign.logo_url} 
                  alt="Logo" 
                  className="h-12 md:h-16 max-w-[200px] md:max-w-[280px] mx-auto mb-4 object-contain" 
                  loading="lazy"
                />
              )}
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Enter Your Details</h2>
              <p className="text-gray-600 mb-2">Campaign: {campaign.name}</p>
              <p className="text-sm text-gray-500">Fill in your information to spin the wheel</p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              
              // Skip limit check in preview mode
              if (isPreviewMode) {
                setCurrentStep("wheel");
                return;
              }
              
              setLeadFormSubmitting(true);
              setLeadFormError(null);
              
              try {
                // Check spin limits BEFORE allowing access to wheel
                const checkIdentifier = id || slug;
                const checkEndpoint = id ? `/api/public/campaigns/by-id/${checkIdentifier}/check-spin` : `/api/public/campaigns/${checkIdentifier}/check-spin`;
                const checkRes = await fetch(checkEndpoint, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email: formData.email || undefined,
                    phone: formData.phone || undefined,
                    device_fingerprint: deviceFingerprint,
                  }),
                });

                const checkData = await checkRes.json();
                
                if (!checkData.can_spin) {
                  setLeadFormError(checkData.message || "You have reached the spin limit for this campaign.");
                  setLeadFormSubmitting(false);
                  return;
                }
                
                // Limits OK - proceed to wheel
                setCurrentStep("wheel");
              } catch (error) {
                console.error("Error checking spin limits:", error);
                setLeadFormError("An error occurred while checking eligibility. Please try again.");
              } finally {
                setLeadFormSubmitting(false);
              }
            }} className="space-y-4 max-w-md mx-auto">
              {leadFormError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800 text-center">
                    {leadFormError}
                  </p>
                </div>
              )}
              
              {campaign.lead_form_fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={field.type}
                    value={formData[field.name as keyof typeof formData] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    required={field.required}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={`Enter your ${field.label.toLowerCase()}`}
                  />
                </div>
              ))}

              {campaign.terms_conditions && (
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    required
                    className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    I accept the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-indigo-600 hover:text-indigo-700 underline"
                    >
                      Terms & Conditions
                    </button>
                  </span>
                </label>
              )}

              {campaign.privacy_policy && (
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptPrivacy}
                    onChange={(e) => setAcceptPrivacy(e.target.checked)}
                    required
                    className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    I accept the{' '}
                    <button
                      type="button"
                      onClick={() => setShowPrivacyModal(true)}
                      className="text-indigo-600 hover:text-indigo-700 underline"
                    >
                      Privacy Policy
                    </button>
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={leadFormSubmitting}
                className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-indigo-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {leadFormSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <span>{campaign.campaign_type === "scratch" ? "Continue to Scratch" : "Continue to Spin"}</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Wheel/Scratch */}
        {currentStep === "wheel" && (
          <div className="space-y-8">
            {campaignStatusMessage && (
              <div className={`rounded-2xl shadow-lg border p-6 text-center ${
                campaign.status === "ended" 
                  ? "bg-red-50 border-red-200" 
                  : campaign.status === "paused"
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-blue-50 border-blue-200"
              }`}>
                <p className={`text-lg font-semibold ${
                  campaign.status === "ended" 
                    ? "text-red-900" 
                    : campaign.status === "paused"
                    ? "text-yellow-900"
                    : "text-blue-900"
                }`}>
                  {campaignStatusMessage}
                </p>
              </div>
            )}

            <div className="flex flex-col items-center w-full">
              {campaign.logo_url && campaign.logo_position === "top" && (
                <div className="flex justify-center mb-2 md:mb-4">
                  <img 
                    src={campaign.logo_url} 
                    alt="Logo" 
                    className="max-h-10 md:max-h-14 max-w-[180px] md:max-w-[240px] object-contain" 
                    loading="lazy"
                  />
                </div>
              )}

              <div className="relative w-full flex justify-center">
                {campaign.logo_url && campaign.logo_position === "top-left" && (
                  <img 
                    src={campaign.logo_url} 
                    alt="Logo" 
                    className="absolute top-0 left-0 md:-left-40 max-h-8 md:max-h-12 max-w-[100px] md:max-w-[140px] object-contain z-10" 
                    loading="lazy"
                  />
                )}
                
                {campaign.logo_url && campaign.logo_position === "top-right" && (
                  <img 
                    src={campaign.logo_url} 
                    alt="Logo" 
                    className="absolute top-0 right-0 md:-right-40 max-h-8 md:max-h-12 max-w-[100px] md:max-w-[140px] object-contain z-10" 
                    loading="lazy"
                  />
                )}
                
                {campaign.logo_url && campaign.logo_position === "bottom-left" && (
                  <img 
                    src={campaign.logo_url} 
                    alt="Logo" 
                    className="absolute bottom-0 left-0 md:-left-40 max-h-8 md:max-h-12 max-w-[100px] md:max-w-[140px] object-contain z-10" 
                    loading="lazy"
                  />
                )}
                
                {campaign.logo_url && campaign.logo_position === "bottom-right" && (
                  <img 
                    src={campaign.logo_url} 
                    alt="Logo" 
                    className="absolute bottom-0 right-0 md:-right-40 max-h-8 md:max-h-12 max-w-[100px] md:max-w-[140px] object-contain z-10" 
                    loading="lazy"
                  />
                )}

                {campaign.campaign_type === "scratch" ? (
                  <ScratchCard
                    ref={scratchRef}
                    segments={campaign.wheel_segments}
                    onScratchComplete={handleSpinComplete}
                    onScratchStart={handleSpinClick}
                    disabled={isPreviewMode ? hasSpun : (hasSpun || !isCampaignAccessible || campaign.status !== "active")}
                    cardShape={campaign.scratch_card_shape || "rounded-rectangle"}
                    scratchMaskStyle={campaign.scratch_mask_style || "silver"}
                    scratchInstructionsTitle={campaign.scratch_instructions_title || "Scratch to reveal your prize!"}
                    scratchInstructionsSubtitle={campaign.scratch_instructions_subtitle || undefined}
                    buttonText={(campaign.spin_button_text && campaign.spin_button_text !== "SPIN") ? campaign.spin_button_text : "BEGIN SCRATCHING"}
                    buttonColor={campaign.spin_button_color || "#6366f1"}
                    backgroundColor={campaign.background_color || "#ffffff"}
                    logoUrl={campaign.logo_position === "center" ? campaign.logo_url || undefined : undefined}
                    confettiEnabled={campaign.confetti_enabled}
                    soundEnabled={campaign.sound_enabled}
                    borderEnabled={campaign.border_enabled}
                    fontColor={campaign.wheel_border_color || "#ffffff"}
                  />
                ) : (
                  <SpinWheel
                  ref={wheelRef}
                  segments={campaign.wheel_segments}
                  onSpinComplete={handleSpinComplete}
                  onSpinClick={handleSpinClick}
                  disabled={isPreviewMode ? hasSpun : (hasSpun || !isCampaignAccessible || campaign.status !== "active")}
                  pointerColor={campaign.pointer_color || undefined}
                  logoUrl={campaign.logo_position === "center" ? campaign.logo_url || undefined : undefined}
                  logoPosition={campaign.logo_position || undefined}
                  confettiEnabled={campaign.confetti_enabled}
                  soundEnabled={campaign.sound_enabled}
                  soundSettings={campaign.sound_settings}
                  fontFamily={campaign.font_family || undefined}
                  fontSize={campaign.font_size || undefined}
                  wheelBorderThickness={campaign.wheel_border_thickness || undefined}
                  wheelBorderColor={campaign.wheel_border_color || undefined}
                  pointerStyle={campaign.pointer_style || undefined}
                  spinButtonText={campaign.spin_button_text || undefined}
                  spinButtonColor={campaign.spin_button_color || undefined}
                  spinButtonBorderRadius={campaign.spin_button_border_radius || undefined}
                  spinButtonPulseEnabled={campaign.spin_button_pulse_enabled}
                  spinDurationSeconds={campaign.spin_duration_seconds || 5}
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
              </div>

              {campaign.logo_url && campaign.logo_position === "bottom" && (
                <div className="flex justify-center mt-2 md:mt-4">
                  <img 
                    src={campaign.logo_url} 
                    alt="Logo" 
                    className="max-h-10 md:max-h-14 max-w-[180px] md:max-w-[240px] object-contain" 
                    loading="lazy"
                  />
                </div>
              )}

              {hasSpun && spinError && (
                <div className="mt-8 text-center">
                  <p className="text-gray-500 text-sm">{spinError}</p>
                </div>
              )}
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-lg border border-gray-200 p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {(campaign.start_datetime || campaign.end_datetime) && (
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">Campaign Period</h3>
                      <p className="text-sm text-gray-600">
                        {campaign.start_datetime && campaign.end_datetime ? (
                          <>Valid from {new Date(campaign.start_datetime).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} to {new Date(campaign.end_datetime).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                        ) : campaign.start_datetime ? (
                          <>Starts {new Date(campaign.start_datetime).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                        ) : (
                          <>Ends {new Date(campaign.end_datetime!).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {campaign.timezone && campaign.timezone !== 'UTC' && (
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">Timezone</h3>
                      <p className="text-sm text-gray-600">{campaign.timezone}</p>
                    </div>
                  </div>
                )}

                {campaign.valid_countries && campaign.valid_countries.length > 0 && (
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">Valid in Countries</h3>
                      <p className="text-sm text-gray-600">
                        {campaign.valid_countries.slice(0, 3).join(', ')}
                        {campaign.valid_countries.length > 3 && ` and ${campaign.valid_countries.length - 3} more`}
                      </p>
                    </div>
                  </div>
                )}

                {(campaign.spin_limit_per_email || campaign.spin_limit_per_phone || campaign.spin_limit_per_device || campaign.spin_limit_per_ip || campaign.spin_limit_per_day || campaign.spin_limit_per_week || campaign.spin_limit_total) && (
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">Spin Limits</h3>
                      <p className="text-sm text-gray-600">
                        {[
                          campaign.spin_limit_per_email && `${campaign.spin_limit_per_email} ${campaign.spin_limit_per_email === 1 ? 'spin' : 'spins'} per person`,
                          campaign.spin_limit_per_day && `${campaign.spin_limit_per_day} per day`,
                          campaign.spin_limit_per_week && `${campaign.spin_limit_per_week} per week`,
                          !campaign.spin_limit_per_email && !campaign.spin_limit_per_day && !campaign.spin_limit_per_week && campaign.spin_limit_total && `Limited to ${campaign.spin_limit_total} total spins`
                        ].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Congratulations Modal */}
        {currentStep === "congratulations" && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col transform animate-in zoom-in duration-300">
              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-8">
                <div className="text-center">
                  <div className={`w-20 h-20 bg-gradient-to-br ${isNoWin ? 'from-gray-400 to-gray-500' : 'from-yellow-400 to-orange-500'} rounded-full flex items-center justify-center mx-auto mb-4 ${isNoWin ? '' : 'animate-bounce'}`}>
                    <Trophy className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    {isNoWin ? "Sorry!" : "Congratulations!"}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {isNoWin ? "No win this time." : "You won:"}
                  </p>
                  {!isNoWin && (
                    <>
                      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 mb-6">
                        <p className="text-2xl font-bold mb-2">{prize}</p>
                        {prizeSegment?.prize_description && (
                          <p className="text-sm opacity-90 mt-2">{prizeSegment.prize_description}</p>
                        )}
                      </div>
                      {campaign.is_lead_form_required && formData.name && (
                        <div className="bg-gray-50 rounded-xl p-4 mb-4">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Winner:</span> {formData.name}
                          </p>
                          {formData.email && (
                            <p className="text-sm text-gray-700 mt-1">
                              <span className="font-medium">Email:</span> {formData.email}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {!isNoWin && prizeSegment?.prize_image_url && (
                    <div className="mb-6">
                      <img 
                        src={prizeSegment.prize_image_url} 
                        alt={prize || "Prize"}
                        className="max-w-full h-auto max-h-64 mx-auto rounded-xl shadow-lg object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed CTA Buttons */}
              <div className="border-t border-gray-200 p-6 bg-white rounded-b-3xl">
                <div className="space-y-3">
                  {isWin && (
                    <button
                      onClick={async () => {
                        if (campaign.is_lead_form_required && formData.email) {
                          // Lead already collected, go directly to redemption
                          try {
                            const claimIdentifier = id || slug;
                            const claimEndpoint = id ? `/api/public/campaigns/by-id/${claimIdentifier}/claim-prize` : `/api/public/campaigns/${claimIdentifier}/claim-prize`;
                            const res = await fetch(claimEndpoint, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                ...formData,
                                prize: prize,
                                device_fingerprint: deviceFingerprint,
                              }),
                            });

                            if (res.ok) {
                              const data = await res.json();
                              setReferenceNumber(data.reference_number);
                              setRedemptionExpiresAt(data.redemption_expires_at);
                              setCurrentStep("redemption");
                            } else {
                              const errorData = await res.json();
                              setClaimError(errorData.error || "Failed to claim prize. Please try again.");
                              setCurrentStep("claim");
                            }
                          } catch (error) {
                            console.error("Failed to claim prize:", error);
                            setClaimError("An unexpected error occurred. Please try again.");
                            setCurrentStep("claim");
                          }
                        } else {
                          setCurrentStep("thankyou");
                        }
                      }}
                      className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
                    >
                      Claim Your Prize
                    </button>
                  )}
                  {canPlayAgain && !isNoWin && (
                    <button
                      onClick={handlePlayAgain}
                      className="w-full px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
                    >
                      Play Again
                    </button>
                  )}
                  {isNoWin && (
                    <>
                      {canPlayAgain && (
                        <button
                          onClick={handlePlayAgain}
                          className="w-full px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
                        >
                          Play Again
                        </button>
                      )}
                      <button
                        onClick={() => setCurrentStep("thankyou")}
                        className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
                      >
                        Close
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Claim Page */}
        {currentStep === "claim" && isWin && (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 md:p-12">
            <div className="text-center mb-8">
              {campaign.logo_url && (
                <img 
                  src={campaign.logo_url} 
                  alt="Logo" 
                  className="h-12 md:h-16 max-w-[200px] md:max-w-[280px] mx-auto mb-4 object-contain" 
                  loading="lazy"
                />
              )}
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Claim Your Prize</h2>
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-4 mt-4 mb-6 inline-block">
                <p className="text-2xl font-bold">{prize}</p>
                {prizeSegment?.prize_description && (
                  <p className="text-sm opacity-90 mt-1">{prizeSegment.prize_description}</p>
                )}
              </div>
              {prizeSegment?.prize_image_url && (
                <div className="mb-6">
                  <img 
                    src={prizeSegment.prize_image_url} 
                    alt={prize || "Prize"}
                    className="max-w-full h-auto max-h-48 mx-auto rounded-xl shadow-lg object-contain"
                  />
                </div>
              )}
              <p className="text-gray-600 mb-2">Campaign: {campaign.name}</p>
              <p className="text-sm text-gray-500">Fill the form to claim your prize</p>
            </div>

            <form onSubmit={handleClaimPrize} className="space-y-4 max-w-md mx-auto">
              {claimError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800">
                    {claimError.includes("upgrade your plan") ? (
                      <>
                        Lead credits exhausted. Please{' '}
                        <a 
                          href="/dashboard/billing" 
                          className="underline font-semibold hover:text-red-900"
                        >
                          upgrade your plan
                        </a>
                        {' '}or purchase lead credits to continue capturing leads.
                      </>
                    ) : claimError.includes("renew your subscription") ? (
                      <>
                        Your subscription has expired and you have no lead credits. Please{' '}
                        <a 
                          href="/dashboard/billing" 
                          className="underline font-semibold hover:text-red-900"
                        >
                          renew your subscription
                        </a>
                        {' '}or purchase lead credits.
                      </>
                    ) : (
                      claimError
                    )}
                  </p>
                </div>
              )}
              
              {campaign.lead_form_fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={field.type}
                    value={formData[field.name as keyof typeof formData] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    required={field.required}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={`Enter your ${field.label.toLowerCase()}`}
                  />
                </div>
              ))}

              {campaign.terms_conditions && (
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    required
                    className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    I accept the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-indigo-600 hover:text-indigo-700 underline"
                    >
                      Terms & Conditions
                    </button>
                  </span>
                </label>
              )}

              {campaign.privacy_policy && (
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptPrivacy}
                    onChange={(e) => setAcceptPrivacy(e.target.checked)}
                    required
                    className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    I accept the{' '}
                    <button
                      type="button"
                      onClick={() => setShowPrivacyModal(true)}
                      className="text-indigo-600 hover:text-indigo-700 underline"
                    >
                      Privacy Policy
                    </button>
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-indigo-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit & Claim Prize</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step 5: Redemption Page */}
        {currentStep === "redemption" && isWin && (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 md:p-12">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Prize Claimed Successfully!</h2>
            </div>

            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Winner Information */}
              {campaign.show_winner_info && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Winner Information</h3>
                  <div className="space-y-2">
                    {campaign.lead_form_fields.map((field) => {
                      const value = formData[field.name as keyof typeof formData];
                      if (value) {
                        return (
                          <p key={field.name} className="text-sm text-gray-700">
                            <span className="font-medium">{field.label}:</span> {value}
                          </p>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}

              {/* Prize Details */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Prize Details</h3>
                <p className="text-2xl font-bold text-indigo-600 mb-2">{prize}</p>
                {prizeSegment?.prize_description && (
                  <p className="text-sm text-gray-700 mb-4">{prizeSegment.prize_description}</p>
                )}
                {prizeSegment?.prize_image_url && (
                  <img 
                    src={prizeSegment.prize_image_url} 
                    alt={prize || "Prize"}
                    className="max-w-full h-auto max-h-48 rounded-xl shadow-lg object-contain mx-auto mt-4"
                  />
                )}
              </div>

              {/* Coupon Code Section */}
              {prizeSegment?.coupon_code && (
                <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                    <Trophy className="w-5 h-5 mr-2 text-green-600" />
                    Your Coupon Code
                  </h3>
                  <div className="bg-white rounded-lg p-4 border border-green-200 mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <code className="text-xl font-bold text-gray-900 break-all">{prizeSegment.coupon_code}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(prizeSegment.coupon_code!);
                          setCopiedCoupon(true);
                          setTimeout(() => setCopiedCoupon(false), 2000);
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 flex-shrink-0"
                      >
                        <Copy className="w-4 h-4" />
                        <span>{copiedCoupon ? "Copied!" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                  {prizeSegment.coupon_url && (
                    <a
                      href={prizeSegment.coupon_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <span>Apply Coupon Now</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              )}

              {/* Digital Download Section */}
              {prizeSegment?.prize_file_url && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                    <Trophy className="w-5 h-5 mr-2 text-blue-600" />
                    Download Your Prize
                  </h3>
                  {prizeSegment.prize_file_name && (
                    <p className="text-sm text-blue-800 mb-4">
                      File: <span className="font-medium">{prizeSegment.prize_file_name}</span>
                    </p>
                  )}
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(prizeSegment.prize_file_url!);
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = prizeSegment.prize_file_name || 'download';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error('Download failed:', error);
                        alert('Download failed. Please try again.');
                      }
                    }}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download Now</span>
                  </button>
                </div>
              )}

              {/* Reference Number */}
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-yellow-600" />
                  Unique Reference Number
                </h3>
                <div className="bg-white rounded-lg p-4 border border-yellow-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <code className="text-xl font-bold text-gray-900 break-all">{referenceNumber}</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(referenceNumber);
                        setCopiedRef(true);
                        setTimeout(() => setCopiedRef(false), 2000);
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center space-x-2 flex-shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                      <span>{copiedRef ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Campaign Details */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Campaign Details</h3>
                <div className="space-y-2">
                  {campaign.business_name && (
                    <p className="text-sm text-gray-700"><span className="font-medium">Business/Organization:</span> {campaign.business_name}</p>
                  )}
                  <p className="text-sm text-gray-700"><span className="font-medium">Campaign:</span> {campaign.name}</p>
                  <p className="text-sm text-gray-700"><span className="font-medium">Campaign ID:</span> {campaign.id}</p>
                </div>
              </div>

              {/* Redemption Countdown - Only show if expiry date exists and is in the future */}
              {redemptionExpiresAt && new Date(redemptionExpiresAt).getTime() > new Date().getTime() && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Redemption Expires In
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-3xl font-bold text-red-600">{timeRemaining.days}</p>
                      <p className="text-xs text-gray-600 mt-1">Days</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-3xl font-bold text-red-600">{timeRemaining.hours}</p>
                      <p className="text-xs text-gray-600 mt-1">Hours</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-3xl font-bold text-red-600">{timeRemaining.minutes}</p>
                      <p className="text-xs text-gray-600 mt-1">Minutes</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-3xl font-bold text-red-600">{timeRemaining.seconds}</p>
                      <p className="text-xs text-gray-600 mt-1">Seconds</p>
                    </div>
                  </div>
                  <p className="text-sm text-red-800 mt-4 text-center">
                    Expires on {new Date(redemptionExpiresAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}

              {/* Redemption Instructions */}
              {(prizeSegment?.redemption_instructions || campaign.redemption_instructions) && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Redeem</h3>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">
                    {prizeSegment?.redemption_instructions || campaign.redemption_instructions}
                  </p>
                </div>
              )}

              {/* Contact Information */}
              {campaign.show_contact_info && (campaign.contact_phone || campaign.contact_email || campaign.contact_address) && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="space-y-2">
                    {campaign.contact_phone && (
                      <p className="text-sm text-gray-700 flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-gray-500" />
                        {campaign.contact_phone}
                      </p>
                    )}
                    {campaign.contact_email && (
                      <p className="text-sm text-gray-700 flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-gray-500" />
                        {campaign.contact_email}
                      </p>
                    )}
                    {campaign.contact_address && (
                      <p className="text-sm text-gray-700 flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                        {campaign.contact_address}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleShareWhatsApp}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Share2 className="w-5 h-5" />
                  <span>Save Proof on WhatsApp</span>
                </button>
                <button
                  onClick={() => setCurrentStep("thankyou")}
                  className="w-full px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Thank You Page */}
        {currentStep === "thankyou" && (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 md:p-12">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Thank You for Playing!</h2>
              <p className="text-gray-600 mb-6">We hope you enjoyed the experience</p>
            </div>

            <div className="max-w-md mx-auto space-y-6">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 text-center">
                <p className="text-lg font-semibold text-gray-900 mb-2">Invite your friends to try their luck!</p>
                <p className="text-sm text-gray-600">Share this campaign and spread the excitement</p>
              </div>

              {/* Social Sharing Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleShareSocial('whatsapp')}
                  className="flex flex-col items-center justify-center space-y-2 px-4 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  <span className="font-medium text-sm">WhatsApp</span>
                </button>
                <button
                  onClick={() => handleShareSocial('facebook')}
                  className="flex flex-col items-center justify-center space-y-2 px-4 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="font-medium text-sm">Facebook</span>
                </button>
                <button
                  onClick={() => handleShareSocial('instagram')}
                  className="flex flex-col items-center justify-center space-y-2 px-4 py-4 bg-gradient-to-br from-purple-600 to-pink-500 text-white rounded-lg hover:opacity-90 transition-all"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                  </svg>
                  <span className="font-medium text-sm">Instagram</span>
                </button>
                <button
                  onClick={() => handleShareSocial('twitter')}
                  className="flex flex-col items-center justify-center space-y-2 px-4 py-4 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-all"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                  <span className="font-medium text-sm">Twitter</span>
                </button>
              </div>

              {/* Business Social Handles */}
              {(campaign.facebook_url || campaign.instagram_url || campaign.twitter_url || campaign.whatsapp_number) && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 text-center">Follow Us</h3>
                  <div className="flex justify-center space-x-4">
                    {campaign.whatsapp_number && (
                      <a
                        href={`https://wa.me/${campaign.whatsapp_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition-all"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                      </a>
                    )}
                    {campaign.facebook_url && (
                      <a
                        href={campaign.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </a>
                    )}
                    {campaign.instagram_url && (
                      <a
                        href={campaign.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-gradient-to-br from-purple-600 to-pink-500 text-white rounded-full hover:opacity-90 transition-all"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                        </svg>
                      </a>
                    )}
                    {campaign.twitter_url && (
                      <a
                        href={campaign.twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-sky-500 text-white rounded-full hover:bg-sky-600 transition-all"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Floating Edit Button - Only visible to campaign owner */}
      {isOwner && campaign && currentStep === "wheel" && (
        <button
          onClick={() => navigate(`/campaigns/${campaign.id}`)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-indigo-500/50 hover:scale-110 transition-all duration-300 flex items-center justify-center z-[100] group"
          aria-label="Edit campaign"
        >
          <Edit className="w-6 h-6 md:w-7 md:h-7" />
          <span className="absolute right-full mr-2 md:mr-3 px-2 md:px-3 py-1.5 md:py-2 bg-gray-900 text-white text-xs md:text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden md:block">
            Edit Campaign
          </span>
        </button>
      )}
      {isOwner && campaign && currentStep !== "wheel" && (
        <button
          onClick={() => navigate(`/campaigns/${campaign.id}`)}
          className="fixed bottom-6 right-4 md:bottom-6 md:right-6 w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-indigo-500/50 hover:scale-110 transition-all duration-300 flex items-center justify-center z-[100] group"
          aria-label="Edit campaign"
        >
          <Edit className="w-6 h-6 md:w-7 md:h-7" />
          <span className="absolute right-full mr-2 md:mr-3 px-2 md:px-3 py-1.5 md:py-2 bg-gray-900 text-white text-xs md:text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden md:block">
            Edit Campaign
          </span>
        </button>
      )}

      <footer className="border-t border-gray-200 mt-20 relative z-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {(campaign.terms_conditions || campaign.privacy_policy) && (
            <div className="flex flex-wrap justify-center gap-4 mb-4">
              {campaign.terms_conditions && (
                <button
                  onClick={() => setShowTermsModal(true)}
                  className="text-sm text-gray-600 hover:text-indigo-600 underline transition-colors"
                >
                  Terms & Conditions
                </button>
              )}
              {campaign.privacy_policy && (
                <button
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-sm text-gray-600 hover:text-indigo-600 underline transition-colors"
                >
                  Privacy Policy
                </button>
              )}
            </div>
          )}
          
          {(campaign.show_watermark ?? true) && (
            <p 
              className="text-sm text-center transition-colors duration-200"
              style={{
                color: getFooterTextColor(campaign.background_color, campaign.background_image_url)
              }}
            >
              Powered by <a 
                href="https://promoguage.mocha.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
              >
                PromoGauge
              </a>
            </p>
          )}
        </div>
      </footer>

      {/* Terms & Conditions Modal */}
      {showTermsModal && campaign.terms_conditions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col transform animate-in zoom-in duration-300">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">Terms & Conditions</h3>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
                  {campaign.terms_conditions}
                </pre>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowTermsModal(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && campaign.privacy_policy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col transform animate-in zoom-in duration-300">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">Privacy Policy</h3>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
                  {campaign.privacy_policy}
                </pre>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
}
