import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { 
  Sparkles, Loader2, X, ShoppingBag, Utensils, Dumbbell, 
  Calendar, Heart, GraduationCap, Briefcase, CirclePlay, Menu 
} from "lucide-react";
import SignInModal from "@/react-app/components/SignInModal";
import TemplateDemo from "@/react-app/components/TemplateDemo";
import { campaignTemplates, getTemplateCampaignType } from "@/shared/templates";

interface HomepageConfig {
  order: string[];
  header: {
    visible: boolean;
    logo_url: string | null;
    menu_links: Array<{ label: string; url: string }>;
  };
  hero: {
    visible: boolean;
    title: string;
    subtitle: string;
    image_url: string;
    cta_buttons: Array<{ label: string; url: string }>;
  };
  campaign_types?: {
    visible: boolean | number;
    title: string;
    subtitle: string;
    spin_wheel_enabled: boolean | number;
    scratch_card_enabled: boolean | number;
    scratch_template_id: string;
  };
  how_it_works: {
    visible: boolean;
    steps: Array<{ title: string; description: string }>;
    illustration_url: string;
    video_url: string;
  };
  benefits: {
    visible: boolean;
    items: Array<{ title: string; description: string; image_url: string }>;
  };
  use_cases: {
    visible: boolean;
    items: Array<{ title: string; icon: string }>;
  };
  cta: {
    visible: boolean;
    title: string;
    subtitle: string;
    button: { label: string; url: string };
  };
  footer: {
    visible: boolean;
    columns: Array<{
      title: string;
      links?: Array<{ label: string; url: string }>;
      social_links?: Array<{ icon: string; label: string; url: string }>;
    }>;
    copyright: string;
  };
  show_use_cases_menu?: boolean;
  show_how_it_works_menu?: boolean;
}

// Campaign Type Selection Modal
function CampaignTypeModal({ isOpen, onClose, onSelectType }: {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: 'spinwheel' | 'scratchcard') => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Choose Campaign Type</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Spin the Wheel */}
          <button
            onClick={() => onSelectType('spinwheel')}
            className="group border-2 border-gray-200 rounded-2xl p-8 hover:border-indigo-500 hover:shadow-lg transition-all text-center"
          >
            <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-200 transition-colors">
              <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Spin the Wheel</h3>
            <p className="text-sm text-gray-600">
              Create an interactive spinning wheel campaign with multiple prize segments
            </p>
            <div className="mt-6">
              <span className="text-indigo-600 font-semibold group-hover:underline">
                Continue →
              </span>
            </div>
          </button>

          {/* Scratch & Win */}
          <button
            onClick={() => onSelectType('scratchcard')}
            className="group border-2 border-gray-200 rounded-2xl p-8 hover:border-purple-500 hover:shadow-lg transition-all text-center"
          >
            <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
              <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3l14 9-14 9V3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8l4 4-4 4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Scratch & Win</h3>
            <p className="text-sm text-gray-600">
              Create a scratch card campaign with surprise prizes revealed by scratching
            </p>
            <div className="mt-6">
              <span className="text-purple-600 font-semibold group-hover:underline">
                Continue →
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// Template Selection Modal
function TemplateSelectionModal({ isOpen, onClose, onSelectTemplate, onPreviewTemplate, campaignType }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSelectTemplate: (templateId: string) => void;
  onPreviewTemplate: (templateId: string) => void;
  campaignType: 'spinwheel' | 'scratchcard' | 'scratch';
}) {
  const [dbTemplates, setDbTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchDbTemplates();
    }
  }, [isOpen]);

  const fetchDbTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/templates");
      if (res.ok) {
        const data = await res.json();
        setDbTemplates(data.templates.filter((t: any) => t.is_active));
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const allTemplates = dbTemplates.length > 0 ? dbTemplates : campaignTemplates;
  
  // Filter templates by campaign type
  const templatesToDisplay = allTemplates.filter((template: any) => {
    if (template.campaign_type) {
      return template.campaign_type === campaignType;
    }
    if (template.campaignType) {
      return template.campaignType === campaignType;
    }
    return getTemplateCampaignType(template.id) === campaignType;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {campaignType === 'scratch' || campaignType === 'scratchcard'
              ? 'Choose a Scratch & Win Template'
              : 'Choose a Spin the Wheel Template'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templatesToDisplay.map((template: any) => {
              const segments = template.wheel_segments || template.wheelSegments || [];
              return (
                <div key={template.id} className="border-2 border-gray-200 rounded-xl p-6 hover:border-indigo-500 hover:shadow-lg transition-all">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                  <div className="flex items-center space-x-1 mb-4">
                    {segments.slice(0, 6).map((segment: any, idx: number) => (
                      <div key={idx} className="h-8 flex-1 rounded" style={{ backgroundColor: segment.color }} />
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onPreviewTemplate(template.id)}
                      className="flex-1 px-4 py-2 bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-all"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => onSelectTemplate(template.id)}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                    >
                      Use This Template
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isPending, fetchUser } = useAuth();
  
  // Force re-fetch user on mount to ensure auth state is fresh
  useEffect(() => {
    fetchUser();
  }, []);
  
  // Debug auth state
  useEffect(() => {
    console.log('[HOME AUTH DEBUG]', {
      user: user ? { id: user.id, email: user.email } : null,
      isPending,
      pathname: window.location.pathname,
      timestamp: new Date().toISOString()
    });
  }, [user, isPending]);
  const [config, setConfig] = useState<HomepageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showCampaignTypeModal, setShowCampaignTypeModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoToPlay, setVideoToPlay] = useState<string | null>(null);
  const [selectedCampaignType, setSelectedCampaignType] = useState<'spinwheel' | 'scratch'>('spinwheel');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [appUser, setAppUser] = useState<any>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/users/me");
      const data = await res.json();
      setAppUser(data.appUser);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const canCreateCampaign = () => {
    if (!appUser) return false;
    const campaignCredits = Number(appUser.campaign_credits) || 0;
    return campaignCredits > 0;
  };

  const fetchConfig = async () => {
    try {
      // Add cache-busting timestamp and force no-cache
      const cacheBust = new Date().getTime();
      const res = await fetch(`/api/homepage-config?_=${cacheBust}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('[HOMEPAGE] Config loaded, timestamp:', data._timestamp);
        console.log('[HOMEPAGE] Debug info:', data._debug);
        console.log('[HOMEPAGE] campaign_types in config:', 'campaign_types' in (data.config || {}));
        console.log('[HOMEPAGE] campaign_types value:', data.config?.campaign_types);
        console.log('[HOMEPAGE] Order array:', data.config?.order);
        console.log('[HOMEPAGE] All config keys:', Object.keys(data.config || {}));
        setConfig(data.config);
      }
    } catch (error) {
      console.error("Failed to fetch homepage config:", error);
    } finally {
      setLoading(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Unable to load homepage configuration</p>
      </div>
    );
  }

  const handleSelectCampaignType = (type: 'spinwheel' | 'scratchcard') => {
    // Use 'scratch' instead of 'scratchcard' to match template data
    const normalizedType = type === 'scratchcard' ? 'scratch' : type;
    setSelectedCampaignType(normalizedType as 'spinwheel' | 'scratch');
    setShowCampaignTypeModal(false);
    setShowTemplateModal(true);
  };

  const handleSelectTemplate = () => {
    setShowTemplateModal(false);
    
    // Check if user is logged in
    if (!user) {
      navigate("/signup");
      return;
    }
    
    // Check if user has campaign credits
    if (!canCreateCampaign()) {
      setShowSubscriptionModal(true);
      return;
    }
    
    // User is logged in and has credits, redirect to campaigns to create
    navigate("/campaigns");
  };

  const handlePreviewTemplate = async (templateId: string) => {
    setLoadingPreview(true);
    setShowPreviewModal(true);
    setShowTemplateModal(false);
    
    try {
      // Try to fetch from database first
      const res = await fetch(`/api/admin/templates/${templateId}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewTemplate(data.template);
      } else {
        // Fallback to hardcoded templates
        const template = campaignTemplates.find(t => t.id === templateId);
        if (template) {
          // Convert to the format expected by TemplateDemo
          setPreviewTemplate({
            ...template,
            wheel_segments: template.wheelSegments,
            wheel_colors: template.wheelColors,
            campaign_type: template.campaignType,
            pointer_color: "#ef4444",
            background_color: "#ffffff",
            background_gradient_enabled: false,
            background_gradient_start: "#6366f1",
            background_gradient_end: "#8b5cf6",
            background_gradient_direction: "to-bottom",
            background_image_url: null,
            logo_position: "center",
            confetti_enabled: true,
            sound_enabled: true,
            sound_settings: { spin: true, win: true, noWin: true },
            font_family: "Inter",
            font_size: 16,
            wheel_border_thickness: 3,
            wheel_border_color: "#ffffff",
            pointer_style: "arrow",
            spin_button_text: template.campaignType === "scratch" ? "SCRATCH" : "SPIN",
            spin_button_color: template.wheelColors.primary,
            spin_button_border_radius: 40,
            spin_button_pulse_enabled: true,
            spin_duration_seconds: 5,
            scratch_card_shape: "rounded-rectangle",
            scratch_mask_style: "silver",
            scratch_instructions_title: "Scratch to reveal your prize!",
            scratch_instructions_subtitle: "",
            border_enabled: false,
            border_theme: null,
            border_default_enabled: true,
            border_default_color: "#FFFFFF",
            border_default_thickness: 10,
            border_custom_colors: [],
            border_bulb_shape: "circle",
            border_bulb_count: 24,
            border_bulb_size: 10,
            border_blink_speed: "medium",
            border_connector_ring_enabled: false,
            border_connector_ring_color: "#FFFFFF",
            border_connector_ring_thickness: 6,
            lead_form_fields: template.leadFormFields || [],
            redemption_instructions: null,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch template for preview:", error);
      // Fallback to hardcoded templates
      const template = campaignTemplates.find(t => t.id === templateId);
      if (template) {
        setPreviewTemplate({
          ...template,
          wheel_segments: template.wheelSegments,
          wheel_colors: template.wheelColors,
          campaign_type: template.campaignType,
          pointer_color: "#ef4444",
          background_color: "#ffffff",
          background_gradient_enabled: false,
          background_gradient_start: "#6366f1",
          background_gradient_end: "#8b5cf6",
          background_gradient_direction: "to-bottom",
          background_image_url: null,
          logo_position: "center",
          confetti_enabled: true,
          sound_enabled: true,
          sound_settings: { spin: true, win: true, noWin: true },
          font_family: "Inter",
          font_size: 16,
          wheel_border_thickness: 3,
          wheel_border_color: "#ffffff",
          pointer_style: "arrow",
          spin_button_text: template.campaignType === "scratch" ? "SCRATCH" : "SPIN",
          spin_button_color: template.wheelColors.primary,
          spin_button_border_radius: 40,
          spin_button_pulse_enabled: true,
          spin_duration_seconds: 5,
          scratch_card_shape: "rounded-rectangle",
          scratch_mask_style: "silver",
          scratch_instructions_title: "Scratch to reveal your prize!",
          scratch_instructions_subtitle: "",
          border_enabled: false,
          border_theme: null,
          border_default_enabled: true,
          border_default_color: "#FFFFFF",
          border_default_thickness: 10,
          border_custom_colors: [],
          border_bulb_shape: "circle",
          border_bulb_count: 24,
          border_bulb_size: 10,
          border_blink_speed: "medium",
          border_connector_ring_enabled: false,
          border_connector_ring_color: "#FFFFFF",
          border_connector_ring_thickness: 6,
          lead_form_fields: template.leadFormFields || [],
          redemption_instructions: null,
        });
      }
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setPreviewTemplate(null);
    setShowTemplateModal(true);
  };

  // Map icon names to actual icon components
  const iconComponents: Record<string, any> = {
    "shopping-bag": ShoppingBag,
    "utensils": Utensils,
    "dumbbell": Dumbbell,
    "calendar": Calendar,
    "heart": Heart,
    "graduation-cap": GraduationCap,
    "briefcase": Briefcase,
  };

  // Map use cases to templates
  const useCaseToTemplate: Record<string, string> = {
    "Online Shops (IG & WhatsApp)": "retail-sale",
    "Restaurants & Cafés": "restaurant-promo",
    "Gyms & Fitness Coaches": "gym-membership",
    "Events & Exhibitions": "event-registration",
    "Educational Games": "educational-games",
    "Agencies & Freelancers": "service-lead-gen",
    "NGOs & Awareness Campaigns": "giveaway",
  };

  const handleUseCaseClick = async (title: string) => {
    const templateId = useCaseToTemplate[title];
    if (templateId) {
      await handlePreviewTemplate(templateId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      {config.header.visible && (
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-[100]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <button onClick={() => navigate("/home")} className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                {config.header.logo_url ? (
                  <img src={config.header.logo_url} alt="Logo" className="h-10 w-auto max-w-[180px] object-contain" />
                ) : (
                  <>
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      PromoGuage
                    </span>
                  </>
                )}
              </button>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-3 relative z-50">
                {config.header.menu_links?.map((link, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(link.url)}
                    className="px-4 py-2.5 text-gray-700 font-semibold hover:text-indigo-600 transition-all duration-200 hidden sm:block relative z-50"
                  >
                    {link.label}
                  </button>
                ))}
                {config.show_use_cases_menu && (
                  <button
                    onClick={() => navigate("/use-cases")}
                    className="px-4 py-2.5 text-gray-700 font-semibold hover:text-indigo-600 transition-all duration-200 hidden sm:block relative z-50"
                  >
                    Use Cases
                  </button>
                )}
                {config.show_how_it_works_menu && (
                  <button
                    onClick={() => navigate("/how-it-works")}
                    className="px-4 py-2.5 text-gray-700 font-semibold hover:text-indigo-600 transition-all duration-200 hidden sm:block relative z-50"
                  >
                    How It Works
                  </button>
                )}
                {user ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Dashboard button clicked, navigating...');
                      navigate("/dashboard");
                    }}
                    className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 relative z-50 pointer-events-auto"
                  >
                    Go to Dashboard
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setShowSignInModal(true)}
                      className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 relative z-50"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => navigate("/signup")}
                      className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 relative z-50"
                    >
                      Get Started
                    </button>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative z-50"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

            {/* Mobile Navigation Menu */}
            {showMobileMenu && (
              <div className="md:hidden mt-4 pb-4 space-y-2 border-t border-gray-200 pt-4">
                {config.header.menu_links?.map((link, idx) => {
                  const isActive = location.pathname === link.url;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        navigate(link.url);
                        setShowMobileMenu(false);
                      }}
                      className={`block w-full text-left px-4 py-2.5 font-semibold rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border-l-4 border-indigo-600"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {link.label}
                    </button>
                  );
                })}
                {config.show_use_cases_menu && (
                  <button
                    onClick={() => {
                      navigate("/use-cases");
                      setShowMobileMenu(false);
                    }}
                    className={`block w-full text-left px-4 py-2.5 font-semibold rounded-lg transition-all duration-200 ${
                      location.pathname === "/use-cases"
                        ? "bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border-l-4 border-indigo-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Use Cases
                  </button>
                )}
                {config.show_how_it_works_menu && (
                  <button
                    onClick={() => {
                      navigate("/how-it-works");
                      setShowMobileMenu(false);
                    }}
                    className={`block w-full text-left px-4 py-2.5 font-semibold rounded-lg transition-all duration-200 ${
                      location.pathname === "/how-it-works"
                        ? "bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border-l-4 border-indigo-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    How It Works
                  </button>
                )}
                {user ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMobileMenu(false);
                      navigate("/dashboard");
                    }}
                    className="block w-full text-left px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
                  >
                    Go to Dashboard
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setShowSignInModal(true);
                        setShowMobileMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => {
                        navigate("/signup");
                        setShowMobileMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
                    >
                      Get Started
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </header>
      )}

      {/* Dynamic sections based on config order */}
      {config.order.map((sectionKey) => {
        const section = config[sectionKey as keyof HomepageConfig];
        
        // Temporary debug logging
        if (sectionKey === 'campaign_types') {
          console.log('[RENDER DEBUG]', {
            sectionKey,
            sectionExists: !!section,
            sectionType: typeof section,
            hasVisible: section && typeof section === 'object' && 'visible' in section,
            visibleValue: section && typeof section === 'object' && 'visible' in section ? (section as any).visible : 'N/A',
            section: section
          });
        }
        
        // Check if section exists and has visible property
        if (!section || typeof section !== 'object' || !('visible' in section)) {
          if (sectionKey === 'campaign_types') {
            console.log('[RENDER DEBUG] Early return - section check failed');
          }
          return null;
        }
        
        // Handle visibility - database returns integers (0/1) but TypeScript expects booleans
        // Convert to boolean for consistent checking
        const isVisible = Boolean(section.visible);
        if (!isVisible) {
          if (sectionKey === 'campaign_types') {
            console.log('[RENDER DEBUG] Early return - not visible', isVisible);
          }
          return null;
        }
        
        if (sectionKey === 'campaign_types') {
          console.log('[RENDER DEBUG] Passed all checks, about to enter switch');
        }

        switch (sectionKey) {
          case 'campaign_types':
            // Find templates - use fallback if specific template not found
            const spinDemoTemplate = campaignTemplates.find(t => t.id === "mega-giveaway") 
              || campaignTemplates.find(t => t.campaignType === "spinwheel") 
              || campaignTemplates[0];
            const scratchTemplateId = (section as any).scratch_template_id || "christmas-scratch";
            const scratchDemoTemplate = campaignTemplates.find(t => t.id === scratchTemplateId)
              || campaignTemplates.find(t => t.campaignType === "scratch");
            
            // Safety check - don't render if no templates available at all
            if (!spinDemoTemplate) {
              return null;
            }
            
            return (
              <section key="campaign_types" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    {(section as any).title || "Campaign Types"}
                  </h2>
                  <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                    {(section as any).subtitle || "Choose how you want to engage your audience"}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {/* Spin the Wheel Card */}
                  {(section as any).spin_wheel_enabled !== false && (
                    <button
                      onClick={() => {
                        setSelectedCampaignType('spinwheel');
                        setShowTemplateModal(true);
                      }}
                      className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 group p-8 text-center cursor-pointer"
                    >
                      <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth="2" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
                        </svg>
                      </div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-3">Spin the Wheel</h3>
                      <p className="text-gray-600 mb-6">
                        Create an interactive spinning wheel campaign with multiple prize segments
                      </p>
                      <span className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold group-hover:shadow-lg transition-all">
                        View Templates
                      </span>
                    </button>
                  )}

                  {/* Scratch & Win Card */}
                  {(section as any).scratch_card_enabled !== false && scratchDemoTemplate && (
                    <button
                      onClick={() => {
                        setSelectedCampaignType('scratch');
                        setShowTemplateModal(true);
                      }}
                      className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 group p-8 text-center cursor-pointer"
                    >
                      <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3l14 9-14 9V3z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8l4 4-4 4" />
                        </svg>
                      </div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-3">Scratch & Win</h3>
                      <p className="text-gray-600 mb-6">
                        Create a scratch card campaign with surprise prizes revealed by scratching
                      </p>
                      <span className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold group-hover:shadow-lg transition-all">
                        View Templates
                      </span>
                    </button>
                  )}
                </div>
              </section>
            );

          case 'hero':
            return (
              <section key="hero" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-12 md:pb-16">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
                  <div className="flex-1 text-center md:text-left space-y-6">
                    <h1 
                      className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-gray-900"
                      dangerouslySetInnerHTML={{ __html: config.hero.title }}
                    />
                    <p className="text-lg md:text-xl text-gray-600 max-w-xl mx-auto md:mx-0 leading-relaxed">
                      {config.hero.subtitle}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 pt-4">
                      {config.hero.cta_buttons?.map((btn, idx) => {
                        // For the primary CTA button (first button), customize based on auth state
                        const isPrimaryCTA = idx === 0;
                        const buttonLabel = isPrimaryCTA && user ? "Create a Campaign" : btn.label;
                        const buttonAction = () => {
                          if (isPrimaryCTA && user) {
                            navigate("/campaigns");
                          } else if (btn.url === '#template-modal') {
                            setShowCampaignTypeModal(true);
                          } else {
                            navigate(btn.url);
                          }
                        };

                        return (
                          <button
                            key={idx}
                            onClick={buttonAction}
                            className={idx === 0 
                              ? "w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-indigo-500/50 transition-all duration-200 transform hover:scale-105"
                              : "w-full sm:w-auto px-8 py-4 bg-white text-indigo-600 border-2 border-indigo-200 rounded-2xl font-bold text-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200"
                            }
                          >
                            {buttonLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {(config.hero as any).hero_image_url && (
                    <div className="flex-1 relative flex justify-center items-center">
                      <div className="relative z-10">
                        <img 
                          src={(config.hero as any).hero_image_url} 
                          alt="PromoGuage" 
                          className="w-[500px] h-[600px] object-cover rounded-3xl shadow-2xl"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );

          case 'how_it_works':
            // Extract YouTube video ID from video_url (handles iframe embeds and direct URLs)
            const extractYouTubeId = (url: string) => {
              if (!url) return null;
              
              // Match iframe src YouTube embed URL
              const iframeMatch = url.match(/src=["']https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
              if (iframeMatch) return iframeMatch[1];
              
              // Match standard YouTube URL
              const urlMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
              if (urlMatch) return urlMatch[1];
              
              return null;
            };
            
            const videoId = extractYouTubeId(config.how_it_works.video_url || '');
            const hasVideo = !!videoId;
            const illustrationUrl = config.how_it_works.illustration_url;
            
            const handleVideoClick = () => {
              if (videoId) {
                setVideoToPlay(videoId);
                setShowVideoModal(true);
              }
            };
            
            return (
              <section key="how_it_works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    How to Create a Campaign
                  </h2>
                  <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                    It's simple! Follow these easy steps to launch your interactive promotion in minutes.
                  </p>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                  <div className="flex-1 space-y-8">
                    {config.how_it_works.steps?.map((step, idx) => (
                      <div key={idx} className="flex items-start space-x-4">
                        <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                          {idx + 1}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                          <p className="text-gray-600 mt-1">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {illustrationUrl && (
                    <div className="flex-1">
                      {hasVideo ? (
                        <button 
                          onClick={handleVideoClick}
                          className="block relative group rounded-xl shadow-md overflow-hidden w-full cursor-pointer"
                        >
                          <img 
                            src={illustrationUrl} 
                            alt="How it works" 
                            className="w-full h-auto transition-transform duration-300 group-hover:scale-105" 
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-all duration-200">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                              <CirclePlay className="w-12 h-12 text-indigo-600" strokeWidth={2} />
                            </div>
                          </div>
                        </button>
                      ) : (
                        <img src={illustrationUrl} alt="How it works" className="w-full h-auto rounded-xl shadow-md" />
                      )}
                    </div>
                  )}
                </div>
                
                {/* Learn More Button */}
                <div className="text-center mt-12">
                  <button
                    onClick={() => navigate("/how-it-works")}
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-indigo-500/50 transition-all duration-200 transform hover:scale-105"
                  >
                    Learn More
                  </button>
                </div>
              </section>
            );

          case 'benefits':
            return (
              <section key="benefits" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 space-y-12">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Why PromoGuage is the Right Choice
                  </h2>
                  <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                    Discover the powerful advantages of using interactive campaigns for your business.
                  </p>
                </div>
                {config.benefits.items?.map((item, idx) => (
                  <div key={idx} className={`flex flex-col ${idx % 2 ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 md:gap-12 p-6 md:p-8 rounded-2xl bg-white shadow-lg border border-gray-100`}>
                    <div className="flex-1 text-center md:text-left space-y-4">
                      <h3 className="text-2xl font-bold text-gray-900">{item.title}</h3>
                      <p className="text-lg text-gray-600 leading-relaxed">{item.description}</p>
                    </div>
                    {item.image_url && (
                      <div className="flex-1">
                        <img src={item.image_url} alt={item.title} className="w-full h-auto rounded-xl shadow-md" />
                      </div>
                    )}
                  </div>
                ))}
              </section>
            );

          case 'use_cases':
            return (
              <section key="use_cases" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Popular Use Cases
                  </h2>
                  <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                    See how various businesses are using PromoGuage to achieve their marketing goals.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {config.use_cases.items?.map((useCase, idx) => {
                    const IconComponent = iconComponents[useCase.icon] || Briefcase;
                    const hasTemplate = !!useCaseToTemplate[useCase.title];
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => hasTemplate && handleUseCaseClick(useCase.title)}
                        disabled={!hasTemplate}
                        className={`bg-white rounded-2xl p-6 shadow-lg transition-all duration-200 border border-gray-100 text-center space-y-3 ${
                          hasTemplate 
                            ? 'hover:shadow-xl hover:border-indigo-300 hover:scale-105 cursor-pointer' 
                            : 'opacity-75 cursor-not-allowed'
                        }`}
                      >
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto">
                          <IconComponent className="w-7 h-7 text-indigo-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{useCase.title}</h3>
                        {hasTemplate && (
                          <p className="text-xs text-indigo-600 font-medium">Click to preview</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );

          case 'cta':
            return (
              <section key="cta" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-8 md:p-12 text-center shadow-2xl">
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    {config.cta.title}
                  </h2>
                  <p className="text-lg md:text-xl text-indigo-100 mb-8">
                    {config.cta.subtitle}
                  </p>
                  <button
                    onClick={() => navigate(config.cta.button.url)}
                    className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold text-lg hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
                  >
                    {config.cta.button.label}
                  </button>
                </div>
              </section>
            );

          case 'footer':
            return (
              <footer key="footer" className="border-t border-gray-200 mt-12 md:mt-20 bg-gray-50 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left mb-8">
                    {config.footer.columns?.map((column, idx) => (
                      <div key={idx}>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">{column.title}</h3>
                        {column.links && (
                          <ul className="space-y-2">
                            {column.links.map((link, linkIdx) => (
                              <li key={linkIdx}>
                                <button onClick={() => navigate(link.url)} className="text-gray-600 hover:text-indigo-600 transition-colors">
                                  {link.label}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        {column.social_links && (
                          <div className="flex justify-center md:justify-start space-x-4">
                            {column.social_links.map((social, socialIdx) => (
                              <a 
                                key={socialIdx}
                                href={social.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-gray-500 hover:text-indigo-600 transition-colors"
                                aria-label={social.label}
                              >
                                {social.icon}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-center text-gray-500 pt-8 border-t border-gray-200">
                    <p className="text-sm">{config.footer.copyright}</p>
                  </div>
                </div>
              </footer>
            );

          default:
            return null;
        }
      })}

      {/* Modals */}
      <SignInModal isOpen={showSignInModal} onClose={() => setShowSignInModal(false)} />
      <CampaignTypeModal
        isOpen={showCampaignTypeModal}
        onClose={() => setShowCampaignTypeModal(false)}
        onSelectType={handleSelectCampaignType}
      />
      <TemplateSelectionModal 
        isOpen={showTemplateModal} 
        onClose={() => setShowTemplateModal(false)} 
        onSelectTemplate={handleSelectTemplate}
        onPreviewTemplate={handlePreviewTemplate}
        campaignType={selectedCampaignType}
      />
      
      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 md:p-8 my-8 max-h-[90vh] overflow-y-auto">
            {loadingPreview ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
              </div>
            ) : previewTemplate ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {previewTemplate.name}
                  </h2>
                  <button 
                    onClick={handleClosePreview}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-6">{previewTemplate.description}</p>
                
                <TemplateDemo
                  segments={previewTemplate.wheel_segments}
                  primaryColor={previewTemplate.wheel_colors?.primary || "#6366f1"}
                  requiresLeadForm={previewTemplate.lead_form_fields?.length > 0}
                  onBackToTemplates={handleClosePreview}
                  onUseTemplate={() => {
                    setShowPreviewModal(false);
                    
                    // Check if user is logged in
                    if (!user) {
                      navigate("/signup");
                      return;
                    }
                    
                    // Check if user has campaign credits
                    if (!canCreateCampaign()) {
                      setShowSubscriptionModal(true);
                      return;
                    }
                    
                    // User is logged in and has credits, redirect to campaigns to create
                    navigate("/campaigns");
                  }}
                  campaignType={previewTemplate.campaign_type || previewTemplate.campaignType || "spinwheel"}
                  scratchCardShape={previewTemplate.scratch_card_shape}
                  scratchMaskStyle={previewTemplate.scratch_mask_style}
                  scratchInstructionsTitle={previewTemplate.scratch_instructions_title}
                  scratchInstructionsSubtitle={previewTemplate.scratch_instructions_subtitle}
                  pointerColor={previewTemplate.pointer_color}
                  backgroundColor={previewTemplate.background_color}
                  backgroundGradientEnabled={previewTemplate.background_gradient_enabled}
                  backgroundGradientStart={previewTemplate.background_gradient_start}
                  backgroundGradientEnd={previewTemplate.background_gradient_end}
                  backgroundGradientDirection={previewTemplate.background_gradient_direction}
                  backgroundImageUrl={previewTemplate.background_image_url}
                  logoPosition={previewTemplate.logo_position}
                  confettiEnabled={previewTemplate.confetti_enabled}
                  soundEnabled={previewTemplate.sound_enabled}
                  soundSettings={previewTemplate.sound_settings}
                  fontFamily={previewTemplate.font_family}
                  fontSize={previewTemplate.font_size}
                  wheelBorderThickness={previewTemplate.wheel_border_thickness}
                  wheelBorderColor={previewTemplate.wheel_border_color}
                  pointerStyle={previewTemplate.pointer_style}
                  spinButtonText={previewTemplate.spin_button_text}
                  spinButtonColor={previewTemplate.spin_button_color}
                  spinButtonBorderRadius={previewTemplate.spin_button_border_radius}
                  spinButtonPulseEnabled={previewTemplate.spin_button_pulse_enabled}
                  spinDurationSeconds={previewTemplate.spin_duration_seconds}
                  borderEnabled={previewTemplate.border_enabled}
                  borderTheme={previewTemplate.border_theme}
                  borderDefaultEnabled={previewTemplate.border_default_enabled}
                  borderDefaultColor={previewTemplate.border_default_color}
                  borderDefaultThickness={previewTemplate.border_default_thickness}
                  borderCustomColors={previewTemplate.border_custom_colors}
                  borderBulbShape={previewTemplate.border_bulb_shape}
                  borderBulbCount={previewTemplate.border_bulb_count}
                  borderBulbSize={previewTemplate.border_bulb_size}
                  borderBlinkSpeed={previewTemplate.border_blink_speed}
                  borderConnectorRingEnabled={previewTemplate.border_connector_ring_enabled}
                  borderConnectorRingColor={previewTemplate.border_connector_ring_color}
                  borderConnectorRingThickness={previewTemplate.border_connector_ring_thickness}
                  redemptionExpiryDays={7}
                  endDatetime={null}
                />
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">Unable to load template preview</p>
                <button
                  onClick={handleClosePreview}
                  className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Back to Templates
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign Limit Reached</h2>
              <p className="text-gray-600 mb-4">
                You've used all your campaign credits. Upgrade your plan to create more campaigns.
              </p>
              {appUser && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Current Plan:</span>
                    <span className="font-semibold text-gray-900 capitalize">
                      {appUser.plan_type || 'Free'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-600">Campaign Credits:</span>
                    <span className="font-semibold text-gray-900">
                      {appUser.campaign_credits || 0}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowSubscriptionModal(false);
                  navigate("/dashboard/billing");
                }}
                className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-indigo-500/50 transition-all duration-200"
              >
                Upgrade Plan
              </button>
              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {showVideoModal && videoToPlay && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
          onClick={() => {
            setShowVideoModal(false);
            setVideoToPlay(null);
          }}
        >
          <div className="w-full max-w-4xl relative" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => {
                setShowVideoModal(false);
                setVideoToPlay(null);
              }}
              className="absolute -top-12 right-0 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close video"
            >
              <X className="w-8 h-8" />
            </button>
            <div className="relative pt-[56.25%] bg-black rounded-lg overflow-hidden shadow-2xl">
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${videoToPlay}?autoplay=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
