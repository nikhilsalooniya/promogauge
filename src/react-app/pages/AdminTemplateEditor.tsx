import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import WheelPreview from "@/react-app/components/WheelPreview";
import ScratchPreview from "@/react-app/components/ScratchPreview";
import EmojiPicker from "@/react-app/components/EmojiPicker";
import { Loader2, ArrowLeft, Plus, Trash2, Save, Eye, Upload, X } from "lucide-react";
import type { WheelSegment, LeadFormField } from "@/shared/types";

interface TemplateData {
  id?: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  campaign_type: "spinwheel" | "scratch";
  is_active: boolean;
  wheel_segments: WheelSegment[];
  wheel_colors: { primary: string; secondary: string };
  pointer_color: string;
  background_color: string;
  background_gradient_enabled: boolean;
  background_gradient_start: string;
  background_gradient_end: string;
  background_gradient_direction: string;
  background_image_url: string | null;
  logo_position: string;
  confetti_enabled: boolean;
  sound_enabled: boolean;
  sound_settings: { spin: boolean; win: boolean; noWin: boolean };
  font_family: string;
  font_size: number;
  wheel_border_thickness: number;
  wheel_border_color: string;
  pointer_style: string;
  spin_button_text: string;
  spin_button_color: string;
  spin_button_border_radius: number;
  spin_button_pulse_enabled: boolean;
  spin_duration_seconds: number;
  border_enabled: boolean;
  border_theme: "default" | "custom" | null;
  border_default_enabled: boolean;
  border_default_color: string;
  border_default_thickness: number;
  border_custom_colors: string[];
  border_bulb_shape: "circle" | "heart" | "star";
  border_bulb_count: number;
  border_bulb_size: number;
  border_blink_speed: "slow" | "medium" | "fast";
  border_connector_ring_enabled: boolean;
  border_connector_ring_color: string;
  border_connector_ring_thickness: number;
  lead_form_fields: LeadFormField[];
  redemption_instructions: string | null;
  scratch_card_shape?: string;
  scratch_mask_style?: string;
  scratch_instructions_title?: string;
  scratch_instructions_subtitle?: string;
}

const defaultTemplate: TemplateData = {
  name: "",
  description: "",
  category: "Custom",
  icon: "Wand2",
  campaign_type: "spinwheel",
  is_active: true,
  wheel_segments: [
    { label: "Prize 1", color: "#6366f1", prize_type: "reward" },
    { label: "Prize 2", color: "#8b5cf6", prize_type: "reward" },
    { label: "Prize 3", color: "#6366f1", prize_type: "reward" },
    { label: "Prize 4", color: "#8b5cf6", prize_type: "reward" },
    { label: "Prize 5", color: "#6366f1", prize_type: "reward" },
    { label: "Prize 6", color: "#8b5cf6", prize_type: "reward" },
  ],
  wheel_colors: { primary: "#6366f1", secondary: "#8b5cf6" },
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
  spin_button_text: "SPIN",
  spin_button_color: "#6366f1",
  spin_button_border_radius: 40,
  spin_button_pulse_enabled: true,
  spin_duration_seconds: 5,
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
  lead_form_fields: [
    { name: "email", label: "Email", type: "email", required: true },
  ],
  redemption_instructions: null,
  scratch_card_shape: "rounded-rectangle",
  scratch_mask_style: "silver",
  scratch_instructions_title: "Scratch to reveal your prize!",
  scratch_instructions_subtitle: "",
};

export default function AdminTemplateEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isPending } = useAuth();
  const [template, setTemplate] = useState<TemplateData>(defaultTemplate);
  const [originalTemplate, setOriginalTemplate] = useState<TemplateData>(defaultTemplate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreviewButton, setShowPreviewButton] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [uploadingPrizeImage, setUploadingPrizeImage] = useState<number | null>(null);
  const [uploadingPrizeFile, setUploadingPrizeFile] = useState<number | null>(null);
  const isNewTemplate = id === "new";

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user && !isNewTemplate) {
      fetchTemplate();
    } else if (user && isNewTemplate) {
      setLoading(false);
    }
  }, [user, id, isNewTemplate]);

  // Detect changes immediately when template is edited (not debounced)
  useEffect(() => {
    if (!saving && !isNewTemplate && showPreviewButton) {
      const hasChanges = JSON.stringify(template) !== JSON.stringify(originalTemplate);
      if (hasChanges) {
        console.log("Template changes detected, reverting to Save button");
        setShowPreviewButton(false);
      }
    }
  }, [template, originalTemplate, saving, isNewTemplate, showPreviewButton]);

  const fetchTemplate = async () => {
    try {
      const res = await fetch(`/api/admin/templates/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTemplate(data.template);
        setOriginalTemplate(data.template);
        setShowPreviewButton(true);
      } else {
        navigate("/admin/templates");
      }
    } catch (error) {
      console.error("Failed to fetch template:", error);
      navigate("/admin/templates");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template.name.trim()) {
      alert("Please enter a template name");
      return;
    }

    if (template.wheel_segments.length < 3) {
      alert("Template must have at least 3 wheel prizes");
      return;
    }

    setSaving(true);
    try {
      const url = isNewTemplate ? "/api/admin/templates" : `/api/admin/templates/${id}`;
      const method = isNewTemplate ? "POST" : "PATCH";

      console.log("Saving template with data:", template);
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Template saved successfully:", data.template);
        
        if (isNewTemplate) {
          navigate(`/admin/templates/${data.template.id}`);
        } else {
          // Update both template and originalTemplate to match saved state
          setTemplate(data.template);
          setOriginalTemplate(data.template);
          setShowPreviewButton(true);
          console.log("Button switched to Preview Template mode");
        }
      } else {
        const errorText = await res.text();
        console.error("Save failed:", errorText);
        alert("Failed to save template");
      }
    } catch (error) {
      console.error("Failed to save template:", error);
      alert("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewTemplate = () => {
    if (id) {
      window.open(`/admin/templates/${id}/demo`, '_blank');
    }
  };

  const addWheelSegment = () => {
    const newSegment: WheelSegment = {
      label: "New Prize",
      color: template.wheel_segments.length % 2 === 0 ? template.wheel_colors.primary : template.wheel_colors.secondary,
      prize_type: "reward",
    };
    setTemplate({
      ...template,
      wheel_segments: [...template.wheel_segments, newSegment],
    });
  };

  const removeWheelSegment = (index: number) => {
    if (template.wheel_segments.length <= 3) return;
    setTemplate({
      ...template,
      wheel_segments: template.wheel_segments.filter((_, i) => i !== index),
    });
  };

  const updateSegmentColor = (index: number, color: string) => {
    const newSegments = [...template.wheel_segments];
    newSegments[index] = { ...newSegments[index], color };
    setTemplate({ ...template, wheel_segments: newSegments });
  };

  const updateSegmentIcon = (index: number, icon: string) => {
    const newSegments = [...template.wheel_segments];
    newSegments[index] = { ...newSegments[index], icon };
    setTemplate({ ...template, wheel_segments: newSegments });
  };

  const addLeadFormField = () => {
    const newField: LeadFormField = {
      name: `custom_field_${Date.now()}`,
      label: "New Field",
      type: "text",
      required: false,
    };
    setTemplate({
      ...template,
      lead_form_fields: [...template.lead_form_fields, newField],
    });
  };

  const removeLeadFormField = (index: number) => {
    if (template.lead_form_fields.length <= 1) return;
    setTemplate({
      ...template,
      lead_form_fields: template.lead_form_fields.filter((_, i) => i !== index),
    });
  };

  const handleBackgroundImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isNewTemplate) return;

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload an image file (PNG, JPEG, GIF, WebP, or SVG)");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setUploadingBackground(true);
    try {
      const formData = new FormData();
      formData.append("background", file);

      const res = await fetch(`/api/admin/templates/${id}/upload-background`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setTemplate({ ...template, background_image_url: data.url });
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
    setTemplate({ ...template, background_image_url: null });
  };

  const handlePrizeImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isNewTemplate) return;

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

      const res = await fetch(`/api/admin/templates/${id}/upload-prize-image`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const newSegments = [...template.wheel_segments];
        newSegments[index] = { ...newSegments[index], prize_image_url: data.url };
        setTemplate({ ...template, wheel_segments: newSegments });
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
    const newSegments = [...template.wheel_segments];
    newSegments[index] = { ...newSegments[index], prize_image_url: undefined };
    setTemplate({ ...template, wheel_segments: newSegments });
  };

  const handlePrizeFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isNewTemplate) return;

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert("File size must be less than 50MB");
      return;
    }

    setUploadingPrizeFile(index);
    try {
      const formData = new FormData();
      formData.append("prize_file", file);

      const res = await fetch(`/api/admin/templates/${id}/upload-prize-file`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const newSegments = [...template.wheel_segments];
        newSegments[index] = { 
          ...newSegments[index], 
          prize_file_url: data.url,
          prize_file_name: data.fileName 
        };
        setTemplate({ ...template, wheel_segments: newSegments });
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
    const newSegments = [...template.wheel_segments];
    newSegments[index] = { 
      ...newSegments[index], 
      prize_file_url: undefined,
      prize_file_name: undefined 
    };
    setTemplate({ ...template, wheel_segments: newSegments });
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

  const isScratchTemplate = template.campaign_type === "scratch";

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/admin/templates")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isNewTemplate ? "Create Template" : "Edit Template"}
              </h1>
              <p className="text-gray-600 mt-1">Configure template settings</p>
            </div>
          </div>
          {showPreviewButton && id && !isNewTemplate ? (
            <button
              onClick={handlePreviewTemplate}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
            >
              <Eye className="w-5 h-5" />
              <span>Preview Template</span>
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Template</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={template.name}
                    onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Retail Sale Template"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={template.description}
                    onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={2}
                    placeholder="Brief description of the template"
                  />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Type *
                    </label>
                    <select
                      value={template.campaign_type}
                      onChange={(e) => setTemplate({ ...template, campaign_type: e.target.value as "spinwheel" | "scratch" })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="spinwheel">Spin the Wheel</option>
                      <option value="scratch">Scratch & Win</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={template.category}
                      onChange={(e) => setTemplate({ ...template, category: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Retail">Retail</option>
                      <option value="Food & Beverage">Food & Beverage</option>
                      <option value="Services">Services</option>
                      <option value="Events">Events</option>
                      <option value="Health & Fitness">Health & Fitness</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Education">Education</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Giveaway">Giveaway</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icon *
                    </label>
                    <select
                      value={template.icon}
                      onChange={(e) => setTemplate({ ...template, icon: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Percent">Percent</option>
                      <option value="UtensilsCrossed">Utensils Crossed</option>
                      <option value="Briefcase">Briefcase</option>
                      <option value="Ticket">Ticket</option>
                      <option value="Dumbbell">Dumbbell</option>
                      <option value="Gift">Gift</option>
                      <option value="GraduationCap">Graduation Cap</option>
                      <option value="Film">Film</option>
                      <option value="Users">Users</option>
                      <option value="Wand2">Wand</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-gray-900">Active Status</p>
                    <p className="text-sm text-gray-600">Make this template available to users</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template.is_active}
                      onChange={(e) => setTemplate({ ...template, is_active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Prizes */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {isScratchTemplate ? "Scratch Card Prizes" : "Wheel Prizes"}
              </h2>
              <div className="space-y-4">
                {template.wheel_segments.map((segment, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <input
                        type="color"
                        value={segment.color}
                        onChange={(e) => updateSegmentColor(index, e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300 flex-shrink-0"
                      />
                      <input
                        type="text"
                        value={segment.label}
                        onChange={(e) => {
                          const newSegments = [...template.wheel_segments];
                          newSegments[index] = { ...segment, label: e.target.value };
                          setTemplate({ ...template, wheel_segments: newSegments });
                        }}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Prize name"
                      />
                      <EmojiPicker
                        value={segment.icon || ""}
                        onChange={(emoji) => updateSegmentIcon(index, emoji)}
                        placeholder="🎁"
                      />
                      {template.wheel_segments.length > 3 && (
                        <button
                          onClick={() => removeWheelSegment(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Prize Type
                      </label>
                      <select
                        value={segment.prize_type || ""}
                        onChange={(e) => {
                          const newSegments = [...template.wheel_segments];
                          newSegments[index] = { ...segment, prize_type: e.target.value as any || undefined };
                          setTemplate({ ...template, wheel_segments: newSegments });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      >
                        <option value="">Select Prize Type</option>
                        <option value="discount">Discount</option>
                        <option value="coupon">Coupon Code</option>
                        <option value="free_gift">Free Gift</option>
                        <option value="free_shipping">Free Shipping</option>
                        <option value="digital_reward">Digital Download</option>
                        <option value="hamper">Hamper</option>
                        <option value="reward">Reward</option>
                        <option value="no_win">No Win</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    {/* Prize Description - Collapsible */}
                    {segment.prize_type && (
                      <div>
                        <label className="flex items-center space-x-2 cursor-pointer mb-2">
                          <input
                            type="checkbox"
                            checked={!!segment.prize_description}
                            onChange={(e) => {
                              const newSegments = [...template.wheel_segments];
                              newSegments[index] = { 
                                ...segment, 
                                prize_description: e.target.checked ? "" : undefined 
                              };
                              setTemplate({ ...template, wheel_segments: newSegments });
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-medium text-gray-700">Add Prize Description</span>
                        </label>
                        {segment.prize_description !== undefined && (
                          <textarea
                            value={segment.prize_description || ""}
                            onChange={(e) => {
                              const newSegments = [...template.wheel_segments];
                              newSegments[index] = { ...segment, prize_description: e.target.value };
                              setTemplate({ ...template, wheel_segments: newSegments });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            rows={2}
                            placeholder="Describe this prize..."
                          />
                        )}
                      </div>
                    )}

                    {/* Redemption Instructions - Collapsible */}
                    {segment.prize_type && (
                      <div>
                        <label className="flex items-center space-x-2 cursor-pointer mb-2">
                          <input
                            type="checkbox"
                            checked={!!segment.redemption_instructions}
                            onChange={(e) => {
                              const newSegments = [...template.wheel_segments];
                              newSegments[index] = { 
                                ...segment, 
                                redemption_instructions: e.target.checked ? "" : undefined 
                              };
                              setTemplate({ ...template, wheel_segments: newSegments });
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-medium text-gray-700">Add Redemption Instructions</span>
                        </label>
                        {segment.redemption_instructions !== undefined && (
                          <textarea
                            value={segment.redemption_instructions || ""}
                            onChange={(e) => {
                              const newSegments = [...template.wheel_segments];
                              newSegments[index] = { ...segment, redemption_instructions: e.target.value };
                              setTemplate({ ...template, wheel_segments: newSegments });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            rows={2}
                            placeholder="Specific instructions for this prize"
                          />
                        )}
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
                              const newSegments = [...template.wheel_segments];
                              newSegments[index] = { ...segment, coupon_code: e.target.value };
                              setTemplate({ ...template, wheel_segments: newSegments });
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
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
                              const newSegments = [...template.wheel_segments];
                              newSegments[index] = { ...segment, coupon_url: e.target.value };
                              setTemplate({ ...template, wheel_segments: newSegments });
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="https://example.com/shop"
                          />
                          <p className="text-xs text-gray-500 mt-1">URL where the coupon can be applied</p>
                        </div>
                      </div>
                    )}

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

                          {!isNewTemplate && (
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
                          )}

                          {isNewTemplate && (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
                              <p className="text-sm text-yellow-800 font-medium">
                                Save the template first to upload prize images
                              </p>
                            </div>
                          )}

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
                            value={segment.prize_image_url || ""}
                            onChange={(e) => {
                              const newSegments = [...template.wheel_segments];
                              newSegments[index] = { ...segment, prize_image_url: e.target.value || undefined };
                              setTemplate({ ...template, wheel_segments: newSegments });
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="https://example.com/prize-image.jpg"
                          />
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

                          {!isNewTemplate && (
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
                          )}

                          {isNewTemplate && (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
                              <p className="text-sm text-yellow-800 font-medium">
                                Save the template first to upload prize files
                              </p>
                            </div>
                          )}

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
                            value={segment.prize_file_url || ""}
                            onChange={(e) => {
                              const newSegments = [...template.wheel_segments];
                              newSegments[index] = { 
                                ...segment, 
                                prize_file_url: e.target.value || undefined,
                                prize_file_name: e.target.value ? (segment.prize_file_name || "Download") : undefined
                              };
                              setTemplate({ ...template, wheel_segments: newSegments });
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="https://example.com/download.pdf"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <button
                  onClick={addWheelSegment}
                  className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Prize</span>
                </button>
              </div>
            </div>

            {/* Lead Form Fields */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Lead Form Fields</h2>
                <button
                  onClick={addLeadFormField}
                  className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors flex items-center space-x-1 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Field</span>
                </button>
              </div>
              <div className="space-y-3">
                {template.lead_form_fields.map((field, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => {
                        const newFields = [...template.lead_form_fields];
                        newFields[index] = { ...field, label: e.target.value };
                        setTemplate({ ...template, lead_form_fields: newFields });
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Field label"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => {
                        const newFields = [...template.lead_form_fields];
                        newFields[index] = { ...field, type: e.target.value as "text" | "email" | "tel" };
                        setTemplate({ ...template, lead_form_fields: newFields });
                      }}
                      className="px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
                          const newFields = [...template.lead_form_fields];
                          newFields[index] = { ...field, required: e.target.checked };
                          setTemplate({ ...template, lead_form_fields: newFields });
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-gray-500">Req</span>
                    </label>
                    {template.lead_form_fields.length > 1 && (
                      <button
                        onClick={() => removeLeadFormField(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Redemption Instructions */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Default Redemption Instructions</h2>
              <textarea
                value={template.redemption_instructions || ""}
                onChange={(e) => setTemplate({ ...template, redemption_instructions: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="e.g., Show this at checkout to redeem your prize"
              />
            </div>

            {/* Appearance Settings - Different for Scratch vs Wheel */}
            {isScratchTemplate ? (
              <>
                {/* Scratch Card Appearance */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Scratch Card Appearance</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Card Shape
                      </label>
                      <select
                        value={template.scratch_card_shape || "rounded-rectangle"}
                        onChange={(e) => setTemplate({ ...template, scratch_card_shape: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        value={template.scratch_mask_style || "silver"}
                        onChange={(e) => setTemplate({ ...template, scratch_mask_style: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        value={template.scratch_instructions_title || "Scratch to reveal your prize!"}
                        onChange={(e) => setTemplate({ ...template, scratch_instructions_title: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Scratch to reveal your prize!"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instructions Subtitle (optional)
                      </label>
                      <input
                        type="text"
                        value={template.scratch_instructions_subtitle || ""}
                        onChange={(e) => setTemplate({ ...template, scratch_instructions_subtitle: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Good luck!"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Font Style
                        </label>
                        <select
                          value={template.font_family}
                          onChange={(e) => setTemplate({ ...template, font_family: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                          max="48"
                          value={template.font_size}
                          onChange={(e) => setTemplate({ ...template, font_size: parseInt(e.target.value) })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Font Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={template.wheel_border_color}
                          onChange={(e) => setTemplate({ ...template, wheel_border_color: e.target.value })}
                          className="w-14 h-14 rounded-lg cursor-pointer border border-gray-300"
                        />
                        <input
                          type="text"
                          value={template.wheel_border_color}
                          onChange={(e) => setTemplate({ ...template, wheel_border_color: e.target.value })}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Wheel Appearance */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Wheel Appearance</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Font Style
                        </label>
                        <select
                          value={template.font_family}
                          onChange={(e) => setTemplate({ ...template, font_family: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                          value={template.font_size}
                          onChange={(e) => setTemplate({ ...template, font_size: parseInt(e.target.value) })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Border Thickness (px)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={template.wheel_border_thickness}
                          onChange={(e) => setTemplate({ ...template, wheel_border_thickness: parseInt(e.target.value) })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Border Color
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="color"
                            value={template.wheel_border_color}
                            onChange={(e) => setTemplate({ ...template, wheel_border_color: e.target.value })}
                            className="w-14 h-14 rounded-lg cursor-pointer border border-gray-300"
                          />
                          <input
                            type="text"
                            value={template.wheel_border_color}
                            onChange={(e) => setTemplate({ ...template, wheel_border_color: e.target.value })}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pointer Style
                      </label>
                      <select
                        value={template.pointer_style}
                        onChange={(e) => setTemplate({ ...template, pointer_style: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="arrow">Arrow</option>
                        <option value="triangle">Triangle</option>
                        <option value="circle">Circle</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pointer Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={template.pointer_color}
                          onChange={(e) => setTemplate({ ...template, pointer_color: e.target.value })}
                          className="w-14 h-14 rounded-lg cursor-pointer border border-gray-300"
                        />
                        <input
                          type="text"
                          value={template.pointer_color}
                          onChange={(e) => setTemplate({ ...template, pointer_color: e.target.value })}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                          placeholder="#ef4444"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Center Button */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {isScratchTemplate ? "Start Button" : "Center Spin Button"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={template.spin_button_text}
                    onChange={(e) => setTemplate({ ...template, spin_button_text: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={isScratchTemplate ? "BEGIN SCRATCHING" : "SPIN"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Button Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={template.spin_button_color}
                      onChange={(e) => setTemplate({ ...template, spin_button_color: e.target.value })}
                      className="w-14 h-14 rounded-lg cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={template.spin_button_color}
                      onChange={(e) => setTemplate({ ...template, spin_button_color: e.target.value })}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
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
                    value={template.spin_button_border_radius}
                    onChange={(e) => setTemplate({ ...template, spin_button_border_radius: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-gray-900">Pulsating Animation</p>
                    <p className="text-sm text-gray-600">Add a pulse effect to the button</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template.spin_button_pulse_enabled}
                      onChange={(e) => setTemplate({ ...template, spin_button_pulse_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Background Customization */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Background</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Background Color
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={template.background_gradient_enabled}
                        onChange={(e) => setTemplate({ 
                          ...template, 
                          background_gradient_enabled: e.target.checked,
                          background_gradient_start: e.target.checked ? (template.background_gradient_start || template.background_color || "#6366f1") : template.background_gradient_start,
                          background_gradient_end: e.target.checked ? (template.background_gradient_end || "#8b5cf6") : template.background_gradient_end,
                        })}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Use Gradient</span>
                    </label>
                  </div>
                  
                  {!template.background_gradient_enabled ? (
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={template.background_color}
                        onChange={(e) => setTemplate({ ...template, background_color: e.target.value })}
                        className="w-14 h-14 rounded-lg cursor-pointer border border-gray-300"
                      />
                      <input
                        type="text"
                        value={template.background_color}
                        onChange={(e) => setTemplate({ ...template, background_color: e.target.value })}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
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
                            value={template.background_gradient_start}
                            onChange={(e) => setTemplate({ ...template, background_gradient_start: e.target.value })}
                            className="w-14 h-14 rounded-lg cursor-pointer border border-gray-300"
                          />
                          <input
                            type="text"
                            value={template.background_gradient_start}
                            onChange={(e) => setTemplate({ ...template, background_gradient_start: e.target.value })}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
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
                            value={template.background_gradient_end}
                            onChange={(e) => setTemplate({ ...template, background_gradient_end: e.target.value })}
                            className="w-14 h-14 rounded-lg cursor-pointer border border-gray-300"
                          />
                          <input
                            type="text"
                            value={template.background_gradient_end}
                            onChange={(e) => setTemplate({ ...template, background_gradient_end: e.target.value })}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                            placeholder="#8b5cf6"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          Gradient Direction
                        </label>
                        <select
                          value={template.background_gradient_direction}
                          onChange={(e) => setTemplate({ ...template, background_gradient_direction: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    {template.background_image_url && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="w-20 h-20 bg-white rounded-lg border border-gray-300 flex items-center justify-center flex-shrink-0 p-2">
                          <img 
                            src={template.background_image_url} 
                            alt="Background preview" 
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">Current Background</p>
                          <p className="text-xs text-gray-500 truncate">{template.background_image_url}</p>
                        </div>
                        <button
                          onClick={handleRemoveBackgroundImage}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                          title="Remove background"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {!isNewTemplate && (
                      <div>
                        <label className="block w-full cursor-pointer">
                          <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                            {uploadingBackground ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
                                <span className="text-sm font-medium text-indigo-600">Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-5 h-5 text-gray-400 mr-2" />
                                <span className="text-sm font-medium text-gray-600">
                                  Upload Background Image
                                </span>
                              </>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBackgroundImageUpload}
                            disabled={uploadingBackground}
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPEG, GIF, WebP, or SVG (max 10MB)</p>
                      </div>
                    )}

                    {isNewTemplate && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
                        <p className="text-sm text-yellow-800 font-medium">
                          Save the template first to upload a background image
                        </p>
                      </div>
                    )}

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
                      value={template.background_image_url || ""}
                      onChange={(e) => setTemplate({ ...template, background_image_url: e.target.value || null })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://example.com/background.jpg"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Background image will be used instead of background color if set</p>
                </div>
              </div>
            </div>

            {/* Logo Settings */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Logo Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo Position
                  </label>
                  <select
                    value={template.logo_position}
                    onChange={(e) => setTemplate({ ...template, logo_position: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="center">Center of Wheel</option>
                    <option value="top">Above Wheel</option>
                    <option value="bottom">Below Wheel</option>
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Effects & Sound */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Effects & Sound</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-gray-900">Confetti Animation</p>
                    <p className="text-sm text-gray-600">Show confetti when user wins</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template.confetti_enabled}
                      onChange={(e) => setTemplate({ ...template, confetti_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {isScratchTemplate ? "Scratch Sound" : "Spin Sound"}
                      </p>
                      <p className="text-xs text-gray-600">
                        {isScratchTemplate ? "Play sound when scratching" : "Play sound when wheel starts spinning"}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={template.sound_settings.spin}
                        onChange={(e) => setTemplate({ 
                          ...template, 
                          sound_settings: {
                            ...template.sound_settings,
                            spin: e.target.checked,
                          }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Win Sound</p>
                      <p className="text-xs text-gray-600">Play sound when user wins a prize</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={template.sound_settings.win}
                        onChange={(e) => setTemplate({ 
                          ...template, 
                          sound_settings: {
                            ...template.sound_settings,
                            win: e.target.checked,
                          }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">No-Win Sound</p>
                      <p className="text-xs text-gray-600">Play sound when user gets "No Win"</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={template.sound_settings.noWin}
                        onChange={(e) => setTemplate({ 
                          ...template, 
                          sound_settings: {
                            ...template.sound_settings,
                            noWin: e.target.checked,
                          }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>
                </div>

                {!isScratchTemplate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Spin Duration (seconds)
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="10"
                      step="0.5"
                      value={template.spin_duration_seconds}
                      onChange={(e) => setTemplate({ ...template, spin_duration_seconds: parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">How long the wheel spins (3-10 seconds)</p>
                  </div>
                )}
              </div>
            </div>

            {/* External Border - Only for Wheel templates */}
            {!isScratchTemplate && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">External Border</h2>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template.border_enabled}
                      onChange={(e) => setTemplate({ 
                        ...template, 
                        border_enabled: e.target.checked,
                        border_theme: e.target.checked ? (template.border_theme || "default") : null
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                
                {template.border_enabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Border Theme
                      </label>
                      <select
                        value={template.border_theme || "default"}
                        onChange={(e) => setTemplate({ 
                          ...template, 
                          border_theme: e.target.value as "default" | "custom"
                        })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="default">Default</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    {template.border_theme === "default" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Border Color
                          </label>
                          <div className="flex items-center space-x-3">
                            <input
                              type="color"
                              value={template.border_default_color}
                              onChange={(e) => setTemplate({ ...template, border_default_color: e.target.value })}
                              className="w-14 h-14 rounded-lg cursor-pointer border border-gray-300"
                            />
                            <input
                              type="text"
                              value={template.border_default_color}
                              onChange={(e) => setTemplate({ ...template, border_default_color: e.target.value })}
                              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                              placeholder="#FFFFFF"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Border Thickness: {template.border_default_thickness}px
                          </label>
                          <input
                            type="range"
                            min="4"
                            max="20"
                            value={template.border_default_thickness}
                            onChange={(e) => setTemplate({ ...template, border_default_thickness: parseInt(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                      </>
                    )}

                    {template.border_theme === "custom" && (
                      <>
                        <div className="pb-4 border-b border-gray-200 mb-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Default Border</p>
                              <p className="text-xs text-gray-500">Static border circle around the wheel</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={template.border_default_enabled}
                                onChange={(e) => setTemplate({ 
                                  ...template, 
                                  border_default_enabled: e.target.checked 
                                })}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>

                          {template.border_default_enabled && (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Border Color
                                </label>
                                <div className="flex items-center space-x-3">
                                  <input
                                    type="color"
                                    value={template.border_default_color}
                                    onChange={(e) => setTemplate({ ...template, border_default_color: e.target.value })}
                                    className="w-14 h-14 rounded-lg cursor-pointer border border-gray-300"
                                  />
                                  <input
                                    type="text"
                                    value={template.border_default_color}
                                    onChange={(e) => setTemplate({ ...template, border_default_color: e.target.value })}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                    placeholder="#FFFFFF"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Border Thickness: {template.border_default_thickness}px
                                </label>
                                <input
                                  type="range"
                                  min="4"
                                  max="20"
                                  value={template.border_default_thickness}
                                  onChange={(e) => setTemplate({ ...template, border_default_thickness: parseInt(e.target.value) })}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Custom Colors (max 5)
                          </label>
                          <div className="space-y-2">
                            {template.border_custom_colors.map((color, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <input
                                  type="color"
                                  value={color}
                                  onChange={(e) => {
                                    const newColors = [...template.border_custom_colors];
                                    newColors[index] = e.target.value;
                                    setTemplate({ ...template, border_custom_colors: newColors });
                                  }}
                                  className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300"
                                />
                                <input
                                  type="text"
                                  value={color}
                                  onChange={(e) => {
                                    const newColors = [...template.border_custom_colors];
                                    newColors[index] = e.target.value;
                                    setTemplate({ ...template, border_custom_colors: newColors });
                                  }}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                                  placeholder="#FFFFFF"
                                />
                                <button
                                  onClick={() => {
                                    const newColors = template.border_custom_colors.filter((_, i) => i !== index);
                                    setTemplate({ ...template, border_custom_colors: newColors });
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            {template.border_custom_colors.length < 5 && (
                              <button
                                onClick={() => {
                                  setTemplate({ 
                                    ...template, 
                                    border_custom_colors: [...template.border_custom_colors, "#FFFFFF"] 
                                  });
                                }}
                                className="w-full px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors flex items-center justify-center space-x-1 text-sm"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Add Color</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bulb Shape
                          </label>
                          <select
                            value={template.border_bulb_shape}
                            onChange={(e) => setTemplate({ ...template, border_bulb_shape: e.target.value as "circle" | "heart" | "star" })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="circle">Circle</option>
                            <option value="heart">Heart</option>
                            <option value="star">Star</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bulb Count: {template.border_bulb_count}
                          </label>
                          <input
                            type="range"
                            min="8"
                            max="40"
                            value={template.border_bulb_count}
                            onChange={(e) => setTemplate({ ...template, border_bulb_count: parseInt(e.target.value) })}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bulb Size: {template.border_bulb_size}px
                          </label>
                          <input
                            type="range"
                            min="4"
                            max="20"
                            value={template.border_bulb_size}
                            onChange={(e) => setTemplate({ ...template, border_bulb_size: parseInt(e.target.value) })}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Blink Speed
                          </label>
                          <select
                            value={template.border_blink_speed}
                            onChange={(e) => setTemplate({ ...template, border_blink_speed: e.target.value as "slow" | "medium" | "fast" })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={template.border_connector_ring_enabled}
                                onChange={(e) => setTemplate({ 
                                  ...template, 
                                  border_connector_ring_enabled: e.target.checked 
                                })}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>

                          {template.border_connector_ring_enabled && (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Connector Ring Color
                                </label>
                                <div className="flex items-center space-x-3">
                                  <input
                                    type="color"
                                    value={template.border_connector_ring_color}
                                    onChange={(e) => setTemplate({ ...template, border_connector_ring_color: e.target.value })}
                                    className="w-14 h-14 rounded-lg cursor-pointer border border-gray-300"
                                  />
                                  <input
                                    type="text"
                                    value={template.border_connector_ring_color}
                                    onChange={(e) => setTemplate({ ...template, border_connector_ring_color: e.target.value })}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                    placeholder="#FFFFFF"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Connector Ring Thickness: {template.border_connector_ring_thickness}px
                                </label>
                                <input
                                  type="range"
                                  min="2"
                                  max="15"
                                  value={template.border_connector_ring_thickness}
                                  onChange={(e) => setTemplate({ ...template, border_connector_ring_thickness: parseInt(e.target.value) })}
                                  className="w-full"
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
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {isScratchTemplate ? "Scratch Card Preview" : "Template Preview"}
                </h2>
                {isScratchTemplate ? (
                  <ScratchPreview 
                    campaign={{
                      ...template,
                      id: template.id || "",
                      user_id: "",
                      public_slug: "",
                      template_id: null,
                      timezone: "UTC",
                      status: "active",
                      spins_count: 0,
                      leads_count: 0,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      is_lead_form_required: true,
                      logo_url: null,
                      cover_image_url: null,
                    }}
                  />
                ) : (
                  <WheelPreview 
                    segments={template.wheel_segments}
                    pointerColor={template.pointer_color}
                    backgroundColor={template.background_color}
                    backgroundGradientEnabled={template.background_gradient_enabled}
                    backgroundGradientStart={template.background_gradient_start}
                    backgroundGradientEnd={template.background_gradient_end}
                    backgroundGradientDirection={template.background_gradient_direction}
                    fontFamily={template.font_family}
                    fontSize={template.font_size}
                    wheelBorderThickness={template.wheel_border_thickness}
                    wheelBorderColor={template.wheel_border_color}
                    pointerStyle={template.pointer_style}
                    spinButtonText={template.spin_button_text}
                    spinButtonColor={template.spin_button_color}
                    spinButtonBorderRadius={template.spin_button_border_radius}
                    spinButtonPulseEnabled={template.spin_button_pulse_enabled}
                    soundSettings={template.sound_settings}
                    borderEnabled={template.border_enabled}
                    borderTheme={template.border_theme as any}
                    borderDefaultEnabled={template.border_default_enabled}
                    borderDefaultColor={template.border_default_color}
                    borderDefaultThickness={template.border_default_thickness}
                    borderCustomColors={template.border_custom_colors}
                    borderBulbShape={template.border_bulb_shape}
                    borderBulbCount={template.border_bulb_count}
                    borderBulbSize={template.border_bulb_size}
                    borderBlinkSpeed={template.border_blink_speed}
                    borderConnectorRingEnabled={template.border_connector_ring_enabled}
                    borderConnectorRingColor={template.border_connector_ring_color}
                    borderConnectorRingThickness={template.border_connector_ring_thickness}
                  />
                )}
                
                {id && (
                  <button
                    onClick={handlePreviewTemplate}
                    className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Eye className="w-5 h-5" />
                    <span>Preview Template</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
