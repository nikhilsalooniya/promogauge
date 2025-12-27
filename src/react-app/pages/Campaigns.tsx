import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import TemplateDemo from "@/react-app/components/TemplateDemo";
import CampaignTypeSelector from "@/react-app/components/CampaignTypeSelector";
import { Loader2, Plus, TrendingUp, Users, Trash2, Eye, ExternalLink, Edit2, Percent, UtensilsCrossed, Briefcase, Ticket, Dumbbell, Gift, Wand2, AlertCircle, GraduationCap, Film, BarChart3 } from "lucide-react";
import type { Campaign } from "@/shared/types";
import { campaignTemplates, getTemplateCampaignType } from "@/shared/templates";

// Campaign status types
type CampaignStatus = "Draft" | "Scheduled" | "Active" | "Paused" | "Ended";

// Helper function to compute campaign status
function getCampaignStatus(campaign: Campaign): CampaignStatus {
  const now = new Date();
  const isPublished = campaign.is_published ?? false;
  const startDate = campaign.start_datetime ? new Date(campaign.start_datetime) : null;
  const endDate = campaign.end_datetime ? new Date(campaign.end_datetime) : null;
  const campaignStatus = campaign.status;

  // Rule 1: Not published = Draft
  if (!isPublished) {
    return "Draft";
  }

  // Rule 2: Published but before start date = Scheduled
  if (isPublished && startDate && now < startDate) {
    return "Scheduled";
  }

  // Rule 3: Published, between start and end dates
  if (isPublished && startDate && endDate && now >= startDate && now <= endDate) {
    // If campaign is paused, return Paused
    if (campaignStatus === "paused") {
      return "Paused";
    }
    // Otherwise Active
    return "Active";
  }

  // Rule 4: Published and after end date = Ended
  if (isPublished && endDate && now > endDate) {
    return "Ended";
  }

  // Fallback: Draft (shouldn't happen, but safe default)
  return "Draft";
}

// Get status tooltip text
function getStatusTooltip(status: CampaignStatus, campaign: Campaign): string {
  switch (status) {
    case "Draft":
      return "This campaign is not published yet.";
    case "Scheduled":
      if (campaign.start_datetime) {
        const startDate = new Date(campaign.start_datetime).toLocaleDateString();
        return `This campaign will go live on ${startDate}.`;
      }
      return "This campaign is scheduled to go live.";
    case "Active":
      return "This campaign is currently live.";
    case "Paused":
      return "This campaign is temporarily paused.";
    case "Ended":
      return "This campaign has ended.";
  }
}

export default function Campaigns() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [newCampaignName, setNewCampaignName] = useState("");
  const [creating, setCreating] = useState(false);
  const [appUser, setAppUser] = useState<any>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string>("");
  const [dbTemplates, setDbTemplates] = useState<any[]>([]);
  const [showCampaignTypeSelector, setShowCampaignTypeSelector] = useState(false);
  const [selectedCampaignType, setSelectedCampaignType] = useState<"spinwheel" | "scratch">("spinwheel");
  const [campaignTypeFilter, setCampaignTypeFilter] = useState<"all" | "spinwheel" | "scratch">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CampaignStatus>("all");

  // Filter templates by campaign type
  const filteredTemplates = (dbTemplates.length > 0 ? dbTemplates : campaignTemplates).filter(
    (template: any) => {
      // For database templates, check campaign_type field
      if (template.campaign_type) {
        return template.campaign_type === selectedCampaignType;
      }
      // For hardcoded templates, check campaignType or use helper function
      if (template.campaignType) {
        return template.campaignType === selectedCampaignType;
      }
      // Fallback: use the helper function based on template ID
      return getTemplateCampaignType(template.id) === selectedCampaignType;
    }
  );

  // Filter campaigns by type and status
  const filteredCampaigns = campaigns.filter((campaign) => {
    // Filter by campaign type
    if (campaignTypeFilter !== "all" && campaign.campaign_type !== campaignTypeFilter) {
      return false;
    }
    
    // Filter by status
    if (statusFilter !== "all") {
      const campaignStatus = getCampaignStatus(campaign);
      if (campaignStatus !== statusFilter) {
        return false;
      }
    }
    
    return true;
  });

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchCampaigns();
      fetchUserData();
      fetchDbTemplates();
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

  const fetchDbTemplates = async () => {
    try {
      const res = await fetch("/api/admin/templates");
      if (res.ok) {
        const data = await res.json();
        
        // If database is empty, still show hardcoded templates
        if (data.templates.length === 0) {
          setDbTemplates([]);
        } else {
          // Only use database templates if they exist
          setDbTemplates(data.templates.filter((t: any) => t.is_active));
        }
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      // Fallback to hardcoded templates
      setDbTemplates([]);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(data);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const canCreateCampaign = () => {
    if (!appUser) return false;
    
    const campaignCredits = Number(appUser.campaign_credits) || 0;
    
    // ALL users need campaign credits to create campaigns
    return campaignCredits > 0;
  };

  const handleSelectTemplate = (templateId: string, action: 'edit' | 'preview' = 'edit') => {
    setSelectedTemplate(templateId);
    
    if (action === 'preview') {
      // Preview: Show preview modal without creating campaign
      setPreviewTemplateId(templateId);
      setShowTemplateModal(false);
      setShowPreviewModal(true);
    } else {
      // Edit: Check subscription before allowing access to editor
      setShowTemplateModal(false);
      if (!canCreateCampaign()) {
        setShowSubscriptionModal(true);
        return;
      }
      setShowCreateModal(true);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newCampaignName,
          template_id: selectedTemplate || undefined,
          campaign_type: selectedCampaignType,
        }),
      });

      if (res.ok) {
        const campaign = await res.json();
        navigate(`/campaigns/${campaign.id}`);
      } else if (res.status === 403) {
        const errorData = await res.json();
        if (errorData.credits_exhausted) {
          setShowCreateModal(false);
          setShowSubscriptionModal(true);
        } else {
          alert(errorData.error || "Failed to create campaign");
        }
      } else {
        alert("Failed to create campaign");
      }
    } catch (error) {
      console.error("Failed to create campaign:", error);
      alert("An error occurred while creating the campaign");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;

    try {
      await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      setCampaigns(campaigns.filter(c => c.id !== id));
    } catch (error) {
      console.error("Failed to delete campaign:", error);
    }
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

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Create and manage your marketing campaigns</p>
          </div>
          <button
            onClick={() => setShowCampaignTypeSelector(true)}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>New Campaign</span>
          </button>
        </div>

        {/* Campaign Filters */}
        {campaigns.length > 0 && (
          <div className="space-y-4">
            {/* Campaign Type Filter */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-white rounded-lg sm:rounded-xl shadow-md border border-gray-100 p-1">
              <button
                onClick={() => setCampaignTypeFilter("all")}
                className={`px-2 sm:px-4 py-2 rounded-md sm:rounded-lg font-medium transition-all duration-200 text-xs sm:text-base ${
                  campaignTypeFilter === "all"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setCampaignTypeFilter("spinwheel")}
                className={`px-2 sm:px-4 py-2 rounded-md sm:rounded-lg font-medium transition-all duration-200 text-xs sm:text-base ${
                  campaignTypeFilter === "spinwheel"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <span className="hidden sm:inline">Spin the Wheel</span>
                <span className="sm:hidden">Spin</span>
              </button>
              <button
                onClick={() => setCampaignTypeFilter("scratch")}
                className={`px-2 sm:px-4 py-2 rounded-md sm:rounded-lg font-medium transition-all duration-200 text-xs sm:text-base ${
                  campaignTypeFilter === "scratch"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <span className="hidden sm:inline">Scratch & Win</span>
                <span className="sm:hidden">Scratch</span>
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg font-medium transition-all duration-200 text-[11px] sm:text-sm ${
                  statusFilter === "all"
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter("Draft")}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg font-medium transition-all duration-200 text-[11px] sm:text-sm ${
                  statusFilter === "Draft"
                    ? "bg-gray-500 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Draft
              </button>
              <button
                onClick={() => setStatusFilter("Scheduled")}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg font-medium transition-all duration-200 text-[11px] sm:text-sm ${
                  statusFilter === "Scheduled"
                    ? "bg-blue-500 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Scheduled
              </button>
              <button
                onClick={() => setStatusFilter("Active")}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg font-medium transition-all duration-200 text-[11px] sm:text-sm ${
                  statusFilter === "Active"
                    ? "bg-green-500 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter("Paused")}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg font-medium transition-all duration-200 text-[11px] sm:text-sm ${
                  statusFilter === "Paused"
                    ? "bg-orange-500 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Paused
              </button>
              <button
                onClick={() => setStatusFilter("Ended")}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg font-medium transition-all duration-200 text-[11px] sm:text-sm ${
                  statusFilter === "Ended"
                    ? "bg-red-500 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Ended
              </button>
            </div>
          </div>
        )}

        {/* Campaigns Grid */}
        {filteredCampaigns.length === 0 && campaigns.length === 0 ? (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Create Your First Campaign</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">Get started by creating an interactive spin-the-wheel campaign</p>
            <button
              onClick={() => setShowCampaignTypeSelector(true)}
              className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 text-sm sm:text-base"
            >
              Create Campaign
            </button>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No Campaigns Found</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              No {campaignTypeFilter === "spinwheel" ? "Spin the Wheel" : campaignTypeFilter === "scratch" ? "Scratch & Win" : ""} campaigns found{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}. Try a different filter or create a new campaign.
            </p>
            <button
              onClick={() => {
                setCampaignTypeFilter("all");
                setStatusFilter("all");
              }}
              className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 text-sm sm:text-base"
            >
              View All Campaigns
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => {
              const isScratchCampaign = campaign.campaign_type === 'scratch';
              const spinLabel = isScratchCampaign ? 'Scratches' : 'Spins';
              const campaignStatus = getCampaignStatus(campaign);
              const statusTooltip = getStatusTooltip(campaignStatus, campaign);
              
              // Status pill styling
              const getStatusStyle = (status: CampaignStatus) => {
                switch (status) {
                  case "Draft":
                    return "bg-gray-100 text-gray-700 border border-gray-300";
                  case "Scheduled":
                    return "bg-blue-100 text-blue-700 border border-blue-300";
                  case "Active":
                    return "bg-green-500 text-white";
                  case "Paused":
                    return "bg-orange-500 text-white";
                  case "Ended":
                    return "bg-white text-red-600 border-2 border-red-400";
                }
              };
              
              return (
                <div
                  key={campaign.id}
                  className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-200 group relative"
                >
                  {/* Status Pill - Top Right Corner */}
                  <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-10">
                    <div 
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium ${getStatusStyle(campaignStatus)} shadow-sm`}
                      title={statusTooltip}
                    >
                      {campaignStatus}
                    </div>
                  </div>

                  <div className="p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 flex-1 pr-16 sm:pr-20 break-words">{campaign.name}</h3>
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-600 flex items-center space-x-1">
                          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>{spinLabel}</span>
                        </span>
                        <span className="font-semibold text-gray-900">{campaign.spins_count}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-600 flex items-center space-x-1">
                          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>Leads</span>
                        </span>
                        <span className="font-semibold text-gray-900">{campaign.leads_count}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => navigate(`/campaigns/${campaign.id}`)}
                        className="flex-1 px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-medium hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center justify-center space-x-1 text-xs sm:text-sm"
                      >
                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => navigate(`/campaigns/${campaign.id}/analytics`)}
                        className="flex-1 px-3 sm:px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg sm:rounded-xl font-medium hover:bg-indigo-100 transition-colors duration-200 flex items-center justify-center space-x-1 text-xs sm:text-sm"
                      >
                        <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Analytics</span>
                        <span className="sm:hidden">Stats</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        className="px-3 sm:px-4 py-2 bg-red-50 text-red-600 rounded-lg sm:rounded-xl font-medium hover:bg-red-100 transition-colors duration-200"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 pr-2">
                {selectedCampaignType === "scratch" 
                  ? "Choose a Scratch & Win Template"
                  : "Choose a Spin the Wheel Template"}
              </h2>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template: any) => {
                const iconMap: Record<string, any> = {
                  'Percent': Percent,
                  'UtensilsCrossed': UtensilsCrossed,
                  'Briefcase': Briefcase,
                  'Ticket': Ticket,
                  'Dumbbell': Dumbbell,
                  'Gift': Gift,
                  'GraduationCap': GraduationCap,
                  'Film': Film,
                  'Users': Users,
                  'Wand2': Wand2,
                };
                const IconComponent = iconMap[template.icon] || Wand2;
                
                // Handle both snake_case (DB) and camelCase (hardcoded) property names
                const segments = template.wheel_segments || template.wheelSegments || [];

                return (
                  <div
                    key={template.id}
                    className="border-2 border-gray-200 rounded-lg sm:rounded-xl p-4 sm:p-6 hover:border-indigo-500 hover:shadow-lg transition-all duration-200 group"
                  >
                    <div className="flex items-start space-x-2 sm:space-x-3 mb-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 break-words">{template.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{template.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 mt-3 sm:mt-4">
                      {segments.slice(0, 6).map((segment: any, idx: number) => (
                        <div
                          key={idx}
                          className="h-6 sm:h-8 flex-1 rounded"
                          style={{ backgroundColor: segment.color }}
                        />
                      ))}
                    </div>
                    <div className="mt-2 sm:mt-3 flex items-center justify-between">
                      <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase">{template.category}</span>
                      <span className="text-[10px] sm:text-xs text-gray-500">{segments.length} prizes</span>
                    </div>
                    <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0 sm:space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTemplate(template.id, 'preview');
                        }}
                        disabled={creating}
                        className="px-3 sm:px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>Preview</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTemplate(template.id, 'edit');
                        }}
                        disabled={creating}
                        className="px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center justify-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                      >
                        <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Create New Campaign</h2>
            <form onSubmit={handleCreateCampaign}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="e.g., Summer Sale Wheel"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewCampaignName("");
                    setSelectedTemplate("");
                  }}
                  className="px-4 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-medium hover:bg-gray-50 transition-colors duration-200 text-sm sm:text-base order-2 sm:order-1"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newCampaignName.trim()}
                  className="px-4 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base order-1 sm:order-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Campaign</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Campaign Credit Exhausted Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Campaign Limit Reached</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                You've used all your campaign credits. Upgrade your plan to create more campaigns.
              </p>
              {appUser && (
                <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Current Plan:</span>
                    <span className="font-semibold text-gray-900 capitalize">
                      {appUser.plan_type || 'Free'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm mt-2">
                    <span className="text-gray-600">Campaign Credits:</span>
                    <span className="font-semibold text-gray-900">
                      {appUser.campaign_credits || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm mt-2">
                    <span className="text-gray-600">Total Campaigns:</span>
                    <span className="font-semibold text-gray-900">
                      {campaigns.length}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={() => {
                  setShowSubscriptionModal(false);
                  navigate("/dashboard/billing");
                }}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-bold hover:shadow-xl hover:shadow-indigo-500/50 transition-all duration-200 text-sm sm:text-base"
              >
                Upgrade Plan
              </button>
              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="w-full px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Type Selector Modal */}
      {showCampaignTypeSelector && (
        <CampaignTypeSelector
          onClose={() => setShowCampaignTypeSelector(false)}
          onSelectType={(type) => {
            setSelectedCampaignType(type);
            setShowCampaignTypeSelector(false);
            // Always show template modal for both types
            setShowTemplateModal(true);
          }}
        />
      )}

      {/* Preview Modal - Interactive Demo */}
      {showPreviewModal && previewTemplateId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-4 md:p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Template Preview</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {(dbTemplates.length > 0 ? dbTemplates : campaignTemplates).find((t: any) => t.id === previewTemplateId)?.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewTemplateId("");
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            {(() => {
              const previewTemplate = (dbTemplates.length > 0 ? dbTemplates : campaignTemplates)
                .find((t: any) => t.id === previewTemplateId);
              
              // Determine if this is a scratch template
              const isScratchTemplate = previewTemplate?.campaign_type === 'scratch' || 
                                       previewTemplate?.campaignType === 'scratch' ||
                                       (typeof getTemplateCampaignType === 'function' && getTemplateCampaignType(previewTemplateId) === 'scratch');
              
              if (isScratchTemplate) {
                // Use TemplateDemo for scratch templates too - it will handle the full flow
                return (
                  <TemplateDemo
                    segments={previewTemplate?.wheel_segments || previewTemplate?.wheelSegments || []}
                    primaryColor={previewTemplate?.wheel_colors?.primary || previewTemplate?.wheelColors?.primary || "#6366f1"}
                    requiresLeadForm={(previewTemplate?.lead_form_fields?.length || previewTemplate?.leadFormFields?.length || 0) > 0}
                    pointerColor={previewTemplate?.pointer_color || previewTemplate?.pointerColor}
                    backgroundColor={previewTemplate?.background_color || previewTemplate?.backgroundColor}
                    backgroundGradientEnabled={previewTemplate?.background_gradient_enabled ?? previewTemplate?.backgroundGradientEnabled}
                    backgroundGradientStart={previewTemplate?.background_gradient_start || previewTemplate?.backgroundGradientStart}
                    backgroundGradientEnd={previewTemplate?.background_gradient_end || previewTemplate?.backgroundGradientEnd}
                    backgroundGradientDirection={previewTemplate?.background_gradient_direction || previewTemplate?.backgroundGradientDirection}
                    backgroundImageUrl={previewTemplate?.background_image_url || previewTemplate?.backgroundImageUrl}
                    logoPosition={previewTemplate?.logo_position || previewTemplate?.logoPosition}
                    confettiEnabled={previewTemplate?.confetti_enabled ?? previewTemplate?.confettiEnabled}
                    soundEnabled={previewTemplate?.sound_enabled ?? previewTemplate?.soundEnabled}
                    soundSettings={previewTemplate?.sound_settings || previewTemplate?.soundSettings}
                    fontFamily={previewTemplate?.font_family || previewTemplate?.fontFamily}
                    fontSize={previewTemplate?.font_size || previewTemplate?.fontSize}
                    wheelBorderThickness={previewTemplate?.wheel_border_thickness ?? previewTemplate?.wheelBorderThickness}
                    wheelBorderColor={previewTemplate?.wheel_border_color || previewTemplate?.wheelBorderColor}
                    pointerStyle={previewTemplate?.pointer_style || previewTemplate?.pointerStyle}
                    spinButtonText={previewTemplate?.spin_button_text || previewTemplate?.spinButtonText}
                    spinButtonColor={previewTemplate?.spin_button_color || previewTemplate?.spinButtonColor}
                    spinButtonBorderRadius={previewTemplate?.spin_button_border_radius ?? previewTemplate?.spinButtonBorderRadius}
                    spinButtonPulseEnabled={previewTemplate?.spin_button_pulse_enabled ?? previewTemplate?.spinButtonPulseEnabled}
                    spinDurationSeconds={previewTemplate?.spin_duration_seconds ?? previewTemplate?.spinDurationSeconds}
                    borderEnabled={previewTemplate?.border_enabled ?? previewTemplate?.borderEnabled}
                    borderTheme={previewTemplate?.border_theme || previewTemplate?.borderTheme}
                    borderDefaultEnabled={previewTemplate?.border_default_enabled ?? previewTemplate?.borderDefaultEnabled}
                    borderDefaultColor={previewTemplate?.border_default_color || previewTemplate?.borderDefaultColor}
                    borderDefaultThickness={previewTemplate?.border_default_thickness ?? previewTemplate?.borderDefaultThickness}
                    borderCustomColors={previewTemplate?.border_custom_colors || previewTemplate?.borderCustomColors || []}
                    borderBulbShape={previewTemplate?.border_bulb_shape || previewTemplate?.borderBulbShape}
                    borderBulbCount={previewTemplate?.border_bulb_count ?? previewTemplate?.borderBulbCount}
                    borderBulbSize={previewTemplate?.border_bulb_size ?? previewTemplate?.borderBulbSize}
                    borderBlinkSpeed={previewTemplate?.border_blink_speed || previewTemplate?.borderBlinkSpeed}
                    borderConnectorRingEnabled={previewTemplate?.border_connector_ring_enabled ?? previewTemplate?.borderConnectorRingEnabled}
                    borderConnectorRingColor={previewTemplate?.border_connector_ring_color || previewTemplate?.borderConnectorRingColor}
                    borderConnectorRingThickness={previewTemplate?.border_connector_ring_thickness ?? previewTemplate?.borderConnectorRingThickness}
                    campaignType={isScratchTemplate ? 'scratch' : 'spinwheel'}
                    scratchMaskStyle={previewTemplate?.scratch_mask_style || 'silver'}
                    scratchInstructionsTitle={previewTemplate?.scratch_instructions_title}
                    scratchInstructionsSubtitle={previewTemplate?.scratch_instructions_subtitle}
                    scratchCardShape={previewTemplate?.scratch_card_shape || 'rounded-rectangle'}
                    leadFormFields={previewTemplate?.lead_form_fields || previewTemplate?.leadFormFields || []}
                    onBackToTemplates={() => {
                      setShowPreviewModal(false);
                      setPreviewTemplateId("");
                      setShowTemplateModal(true);
                    }}
                    onUseTemplate={() => {
                      setShowPreviewModal(false);
                      handleSelectTemplate(previewTemplateId, 'edit');
                    }}
                  />
                );
              }
              
              return (
                <TemplateDemo
                  segments={previewTemplate?.wheel_segments || previewTemplate?.wheelSegments || []}
                  primaryColor={previewTemplate?.wheel_colors?.primary || previewTemplate?.wheelColors?.primary || "#6366f1"}
                  requiresLeadForm={(previewTemplate?.lead_form_fields?.length || previewTemplate?.leadFormFields?.length || 0) > 0}
                  pointerColor={previewTemplate?.pointer_color || previewTemplate?.pointerColor}
                  backgroundColor={previewTemplate?.background_color || previewTemplate?.backgroundColor}
                  backgroundGradientEnabled={previewTemplate?.background_gradient_enabled ?? previewTemplate?.backgroundGradientEnabled}
                  backgroundGradientStart={previewTemplate?.background_gradient_start || previewTemplate?.backgroundGradientStart}
                  backgroundGradientEnd={previewTemplate?.background_gradient_end || previewTemplate?.backgroundGradientEnd}
                  backgroundGradientDirection={previewTemplate?.background_gradient_direction || previewTemplate?.backgroundGradientDirection}
                  backgroundImageUrl={previewTemplate?.background_image_url || previewTemplate?.backgroundImageUrl}
                  logoPosition={previewTemplate?.logo_position || previewTemplate?.logoPosition}
                  confettiEnabled={previewTemplate?.confetti_enabled ?? previewTemplate?.confettiEnabled}
                  soundEnabled={previewTemplate?.sound_enabled ?? previewTemplate?.soundEnabled}
                  soundSettings={previewTemplate?.sound_settings || previewTemplate?.soundSettings}
                  fontFamily={previewTemplate?.font_family || previewTemplate?.fontFamily}
                  fontSize={previewTemplate?.font_size || previewTemplate?.fontSize}
                  wheelBorderThickness={previewTemplate?.wheel_border_thickness ?? previewTemplate?.wheelBorderThickness}
                  wheelBorderColor={previewTemplate?.wheel_border_color || previewTemplate?.wheelBorderColor}
                  pointerStyle={previewTemplate?.pointer_style || previewTemplate?.pointerStyle}
                  spinButtonText={previewTemplate?.spin_button_text || previewTemplate?.spinButtonText}
                  spinButtonColor={previewTemplate?.spin_button_color || previewTemplate?.spinButtonColor}
                  spinButtonBorderRadius={previewTemplate?.spin_button_border_radius ?? previewTemplate?.spinButtonBorderRadius}
                  spinButtonPulseEnabled={previewTemplate?.spin_button_pulse_enabled ?? previewTemplate?.spinButtonPulseEnabled}
                  spinDurationSeconds={previewTemplate?.spin_duration_seconds ?? previewTemplate?.spinDurationSeconds}
                  borderEnabled={previewTemplate?.border_enabled ?? previewTemplate?.borderEnabled}
                  borderTheme={previewTemplate?.border_theme || previewTemplate?.borderTheme}
                  borderDefaultEnabled={previewTemplate?.border_default_enabled ?? previewTemplate?.borderDefaultEnabled}
                  borderDefaultColor={previewTemplate?.border_default_color || previewTemplate?.borderDefaultColor}
                  borderDefaultThickness={previewTemplate?.border_default_thickness ?? previewTemplate?.borderDefaultThickness}
                  borderCustomColors={previewTemplate?.border_custom_colors || previewTemplate?.borderCustomColors || []}
                  borderBulbShape={previewTemplate?.border_bulb_shape || previewTemplate?.borderBulbShape}
                  borderBulbCount={previewTemplate?.border_bulb_count ?? previewTemplate?.borderBulbCount}
                  borderBulbSize={previewTemplate?.border_bulb_size ?? previewTemplate?.borderBulbSize}
                  borderBlinkSpeed={previewTemplate?.border_blink_speed || previewTemplate?.borderBlinkSpeed}
                  borderConnectorRingEnabled={previewTemplate?.border_connector_ring_enabled ?? previewTemplate?.borderConnectorRingEnabled}
                  borderConnectorRingColor={previewTemplate?.border_connector_ring_color || previewTemplate?.borderConnectorRingColor}
                  borderConnectorRingThickness={previewTemplate?.border_connector_ring_thickness ?? previewTemplate?.borderConnectorRingThickness}
                  leadFormFields={previewTemplate?.lead_form_fields || previewTemplate?.leadFormFields || []}
                  onBackToTemplates={() => {
                    setShowPreviewModal(false);
                    setPreviewTemplateId("");
                    setShowTemplateModal(true);
                  }}
                  onUseTemplate={() => {
                    setShowPreviewModal(false);
                    handleSelectTemplate(previewTemplateId, 'edit');
                  }}
                />
              );
            })()}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0 sm:space-x-3 mt-4 sm:mt-6">
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewTemplateId("");
                  setShowTemplateModal(true);
                }}
                className="px-4 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-medium hover:bg-gray-50 transition-colors duration-200 text-sm sm:text-base order-2 sm:order-1"
              >
                Back to Templates
              </button>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  handleSelectTemplate(previewTemplateId, 'edit');
                }}
                className="px-4 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base order-1 sm:order-2"
              >
                <Edit2 className="w-4 h-4" />
                <span>Use This Template</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
