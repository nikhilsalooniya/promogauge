import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import TemplateDemo from "@/react-app/components/TemplateDemo";
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

export default function AdminTemplateDemoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchTemplate();
    } else {
      navigate("/admin/templates");
    }
  }, [id]);

  const fetchTemplate = async () => {
    try {
      const res = await fetch(`/api/admin/templates/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTemplate(data.template);
      } else {
        console.error("Failed to fetch template for demo");
        navigate("/admin/templates");
      }
    } catch (error) {
      console.error("Error fetching template for demo:", error);
      navigate("/admin/templates");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-700">
        <p>Template not found or could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 md:p-8">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-6">
          Template Demo: {template.name}
        </h1>
        <TemplateDemo
          segments={template.wheel_segments}
          primaryColor={template.wheel_colors.primary}
          requiresLeadForm={template.lead_form_fields.length > 0}
          onBackToTemplates={() => navigate("/admin/templates")}
          onUseTemplate={() => navigate(`/admin/templates/${id}`)}
          pointerColor={template.pointer_color}
          backgroundColor={template.background_color}
          backgroundGradientEnabled={template.background_gradient_enabled}
          backgroundGradientStart={template.background_gradient_start}
          backgroundGradientEnd={template.background_gradient_end}
          backgroundGradientDirection={template.background_gradient_direction}
          backgroundImageUrl={template.background_image_url}
          logoPosition={template.logo_position}
          confettiEnabled={template.confetti_enabled}
          soundEnabled={template.sound_enabled}
          soundSettings={template.sound_settings}
          fontFamily={template.font_family}
          fontSize={template.font_size}
          wheelBorderThickness={template.wheel_border_thickness}
          wheelBorderColor={template.wheel_border_color}
          pointerStyle={template.pointer_style}
          spinButtonText={template.spin_button_text}
          spinButtonColor={template.spin_button_color}
          spinButtonBorderRadius={template.spin_button_border_radius}
          spinButtonPulseEnabled={template.spin_button_pulse_enabled}
          spinDurationSeconds={template.spin_duration_seconds}
          borderEnabled={template.border_enabled}
          borderTheme={template.border_theme}
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
          redemptionExpiryDays={7}
          endDatetime={null}
          campaignType={template.campaign_type}
          scratchCardShape={template.scratch_card_shape}
          scratchMaskStyle={template.scratch_mask_style}
          scratchInstructionsTitle={template.scratch_instructions_title}
          scratchInstructionsSubtitle={template.scratch_instructions_subtitle}
          leadFormFields={template.lead_form_fields}
        />
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 italic mb-4">
            This is an interactive demo of your template. No data is saved.
          </p>
          <button
            onClick={() => navigate(`/admin/templates/${id}`)}
            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
          >
            Back to Editor
          </button>
        </div>
      </div>
    </div>
  );
}
