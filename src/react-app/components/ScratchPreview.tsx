import type { Campaign } from "@/shared/types";

interface ScratchPreviewProps {
  campaign: Campaign;
}

export default function ScratchPreview({ campaign }: ScratchPreviewProps) {
  // Extract appearance settings from campaign
  const scratchMaskStyle = campaign.scratch_mask_style || "silver";
  const backgroundColor = campaign.background_color || "#ffffff";
  const backgroundImageUrl = campaign.background_image_url;
  const backgroundGradientEnabled = campaign.background_gradient_enabled;
  const backgroundGradientStart = campaign.background_gradient_start;
  const backgroundGradientEnd = campaign.background_gradient_end;
  const backgroundGradientDirection = campaign.background_gradient_direction;
  const fontSize = campaign.font_size || 28;
  const borderTheme = campaign.border_theme;
  const fontColor = campaign.wheel_border_color || "#ffffff";

  // Mask textures - using CSS gradients as fallback
  const maskTextures: Record<string, string> = {
    silver: "linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 50%, #a8a8a8 100%)",
    gold: "linear-gradient(135deg, #FFD700 0%, #FFED4E 50%, #FFA500 100%)",
    gray: "linear-gradient(135deg, #4a4a4a 0%, #6b6b6b 50%, #2c2c2c 100%)",
  };

  const borderRadius = "16px";

  // Get preview prize (first segment with content)
  const previewSegment = campaign.wheel_segments?.[0];
  const prizePreviewImage = previewSegment?.prize_image_url;
  const prizePreviewText = previewSegment?.label || "Your Prize";

  // Background style
  const getBackgroundStyle = (): React.CSSProperties => {
    if (backgroundImageUrl) {
      return {
        backgroundColor: backgroundColor, // Fallback color under image
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    
    if (backgroundGradientEnabled && backgroundGradientStart && backgroundGradientEnd) {
      const cssDirection = backgroundGradientDirection?.replace(/-/g, ' ') || 'to bottom';
      return {
        background: `linear-gradient(${cssDirection}, ${backgroundGradientStart}, ${backgroundGradientEnd})`,
      };
    }
    
    return {
      backgroundColor: backgroundColor,
    };
  };

  return (
    <div
      className="relative flex items-center justify-center w-full h-[300px] p-4"
      style={{
        borderRadius: "12px",
        boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
        ...getBackgroundStyle()
      }}
    >
      {/* Main Scratch Card Container */}
      <div
        className="relative w-[240px] h-[240px] mx-auto overflow-hidden"
        style={{
          borderRadius,
          backgroundColor: "white",
          boxShadow: "0 8px 20px rgba(0,0,0,0.15)"
        }}
      >
        {/* Prize Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          {prizePreviewImage ? (
            <img
              src={prizePreviewImage}
              alt="Prize"
              className="w-32 h-32 object-contain mb-4"
            />
          ) : (
            <span
              className="block"
              style={{
                fontSize: `${fontSize}px`,
                color: fontColor,
                fontWeight: "bold",
                maxWidth: "80%",
                lineHeight: "1.2"
              }}
            >
              {prizePreviewText}
            </span>
          )}
        </div>

        {/* Scratch Mask Layer (Preview Mode) */}
        <div
          className="absolute inset-0 opacity-80 pointer-events-none"
          style={{
            background: maskTextures[scratchMaskStyle] || maskTextures.silver,
            borderRadius
          }}
        ></div>

        {/* Border Theme Overlay */}
        {borderTheme && borderTheme !== "default" && borderTheme !== "custom" && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              borderRadius,
              backgroundImage: `url(${borderTheme})`,
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat"
            }}
          ></div>
        )}
      </div>
    </div>
  );
}
