import { useEffect, useRef, useState } from "react";
import type { WheelSegment } from "@/shared/types";
import BorderCanvas from "./BorderCanvas";

interface WheelPreviewProps {
  segments: WheelSegment[];
  pointerColor?: string;
  logoUrl?: string;
  logoPosition?: string;
  backgroundColor?: string;
  backgroundGradientEnabled?: boolean;
  backgroundGradientStart?: string;
  backgroundGradientEnd?: string;
  backgroundGradientDirection?: string;
  backgroundImageUrl?: string;
  fontFamily?: string;
  fontSize?: number;
  wheelBorderThickness?: number;
  wheelBorderColor?: string;
  pointerStyle?: string;
  spinButtonText?: string;
  spinButtonColor?: string;
  spinButtonBorderRadius?: number;
  spinButtonPulseEnabled?: boolean;
  soundSettings?: {
    spin: boolean;
    win: boolean;
    noWin: boolean;
  };
  borderEnabled?: boolean;
  borderTheme?: "default" | "custom";
  borderDefaultEnabled?: boolean;
  borderDefaultColor?: string;
  borderDefaultThickness?: number;
  borderCustomColors?: string[];
  borderBulbShape?: "circle" | "heart" | "star";
  borderBulbCount?: number;
  borderBulbSize?: number;
  borderBlinkSpeed?: "slow" | "medium" | "fast";
  borderConnectorRingEnabled?: boolean;
  borderConnectorRingColor?: string;
  borderConnectorRingThickness?: number;
}

export default function WheelPreview({ 
  segments, 
  pointerColor = "#ef4444", 
  logoUrl, 
  logoPosition = "center",
  backgroundColor = "#ffffff",
  backgroundGradientEnabled = false,
  backgroundGradientStart = "#6366f1",
  backgroundGradientEnd = "#8b5cf6",
  backgroundGradientDirection = "to-bottom",
  backgroundImageUrl,
  fontFamily = "Inter",
  fontSize = 16,
  wheelBorderThickness = 3,
  wheelBorderColor = "#ffffff",
  pointerStyle = "arrow",
  spinButtonText = "SPIN",
  spinButtonColor = "#6366f1",
  spinButtonBorderRadius = 40,
  borderEnabled = false,
  borderTheme = "default",
  borderDefaultEnabled = true,
  borderDefaultColor = "#FFFFFF",
  borderDefaultThickness = 10,
  borderCustomColors = [],
  borderBulbShape = "circle",
  borderBulbCount = 24,
  borderBulbSize = 10,
  borderBlinkSpeed = "medium",
  borderConnectorRingEnabled = false,
  borderConnectorRingColor = "#FFFFFF",
  borderConnectorRingThickness = 6,
}: WheelPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (logoUrl) {
      const img = new Image();
      // Don't set crossOrigin for same-origin images
      if (logoUrl.startsWith('http') && !logoUrl.startsWith(window.location.origin)) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => setLogoImage(img);
      img.onerror = () => {
        console.error('Failed to load logo image:', logoUrl);
        setLogoImage(null);
      };
      img.src = logoUrl;
    } else {
      setLogoImage(null);
    }
  }, [logoUrl]);

  useEffect(() => {
    drawWheel();
  }, [segments, pointerColor, logoImage, backgroundColor, backgroundImageUrl, fontFamily, fontSize, wheelBorderThickness, wheelBorderColor, pointerStyle, spinButtonText, spinButtonColor, spinButtonBorderRadius, borderEnabled, borderTheme]);

  // Helper function to calculate optimal font size based on text length
  const getOptimalFontSize = (text: string, baseSize: number, hasIcon: boolean): number => {
    const textLength = text.length;
    let size = baseSize;

    if (hasIcon) {
      // Slightly smaller when there's an icon
      size = baseSize * 0.95;
    }

    // Auto-scale based on text length
    if (textLength > 20) {
      size = Math.max(8, baseSize * 0.75);
    } else if (textLength > 15) {
      size = Math.max(9, baseSize * 0.85);
    } else if (textLength > 12) {
      size = Math.max(10, baseSize * 0.9);
    }

    return Math.floor(size);
  };

  // Helper function to wrap text into multiple lines
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }

    // Limit to 3 lines maximum
    return lines.slice(0, 3);
  };

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 18;
    const segmentAngle = (2 * Math.PI) / segments.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw wheel drop shadow
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    // Draw segments
    segments.forEach((segment, index) => {
      const startAngle = index * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;

      // Draw segment
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineTo(centerX, centerY);
      ctx.fillStyle = segment.color;
      ctx.fill();
      ctx.strokeStyle = wheelBorderColor;
      ctx.lineWidth = wheelBorderThickness;
      ctx.stroke();

      // Draw icon and text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      const hasIcon = !!segment.icon;
      const scaledBaseFontSize = Math.floor(fontSize * 0.625); // Scale down for preview
      const textFontSize = getOptimalFontSize(segment.label, scaledBaseFontSize, hasIcon);
      const maxTextWidth = radius * 0.5;

      if (hasIcon) {
        // Emoji/icon on top, text below layout - centered in slice
        const emojiSize = Math.floor(fontSize * 0.9);
        const textRadius = radius * 0.65;
        
        // Draw emoji/icon
        ctx.font = `${emojiSize}px ${fontFamily}, sans-serif`;
        ctx.fillText(segment.icon!, textRadius, -6);
        
        // Draw text below emoji
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${textFontSize}px ${fontFamily}, sans-serif`;
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 3;
        
        // Wrap text if needed
        const lines = wrapText(ctx, segment.label, maxTextWidth);
        
        // Adjust font size if we have multiple lines
        let finalFontSize = textFontSize;
        if (lines.length === 2) {
          finalFontSize = Math.max(8, textFontSize * 0.95);
        } else if (lines.length === 3) {
          finalFontSize = Math.max(7, textFontSize * 0.9);
        }
        ctx.font = `bold ${finalFontSize}px ${fontFamily}, sans-serif`;
        
        const finalLineHeight = finalFontSize * 1.2;
        
        // Position text below emoji
        lines.forEach((line, i) => {
          const lineY = 9 + (i * finalLineHeight);
          ctx.fillText(line, textRadius, lineY);
        });
      } else {
        // Text only - centered in slice
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${textFontSize}px ${fontFamily}, sans-serif`;
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 3;
        
        // Wrap text if needed
        const lines = wrapText(ctx, segment.label, maxTextWidth);
        
        // Adjust font size if we have multiple lines
        let finalFontSize = textFontSize;
        if (lines.length === 2) {
          finalFontSize = Math.max(9, textFontSize * 0.95);
        } else if (lines.length === 3) {
          finalFontSize = Math.max(8, textFontSize * 0.9);
        }
        ctx.font = `bold ${finalFontSize}px ${fontFamily}, sans-serif`;
        
        const lineHeight = finalFontSize * 1.2;
        const totalTextHeight = lines.length * lineHeight;
        const textRadius = radius * 0.65;
        
        // Center text vertically
        lines.forEach((line, i) => {
          const lineY = -(totalTextHeight / 2) + (i * lineHeight) + (lineHeight / 2);
          ctx.fillText(line, textRadius, lineY);
        });
      }
      
      ctx.restore();
    });

    // Draw external white border around wheel (only if external border is not enabled)
    if (!borderEnabled) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 3, 0, 2 * Math.PI);
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 6;
      ctx.stroke();
    }

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = spinButtonColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw logo in center if available and position is center
    if (logoImage && logoPosition === "center") {
      const logoSize = 40;
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, 22, 0, 2 * Math.PI);
      ctx.clip();
      ctx.drawImage(
        logoImage,
        centerX - logoSize / 2,
        centerY - logoSize / 2,
        logoSize,
        logoSize
      );
      ctx.restore();
    } else {
      // Draw spin button text with wrapping support
      ctx.fillStyle = spinButtonColor;
      const baseFontSize = Math.floor(fontSize * 0.75);
      ctx.font = `bold ${baseFontSize}px ${fontFamily}, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Maximum width for button text (diameter of center circle minus padding)
      const maxButtonTextWidth = 40;
      const lines = wrapText(ctx, spinButtonText, maxButtonTextWidth);
      
      // Adjust font size if multiple lines
      let buttonFontSize = baseFontSize;
      if (lines.length === 2) {
        buttonFontSize = Math.max(7, baseFontSize * 0.85);
      } else if (lines.length >= 3) {
        buttonFontSize = Math.max(6, baseFontSize * 0.7);
      }
      
      ctx.font = `bold ${buttonFontSize}px ${fontFamily}, sans-serif`;
      const lineHeight = buttonFontSize * 1.1;
      const totalHeight = lines.length * lineHeight;
      const startY = centerY - (totalHeight / 2) + (lineHeight / 2);
      
      lines.forEach((line, i) => {
        ctx.fillText(line, centerX, startY + (i * lineHeight));
      });
    }

    // Draw pointer at top
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-Math.PI / 2);
    
    // Add shadow to pointer
    ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1.5;
    
    ctx.beginPath();
    
    if (pointerStyle === "triangle") {
      // Larger triangle with rounded edges - moved upward
      const tipX = radius - 10;
      const baseX = radius + 10;
      const baseY = 16;
      
      ctx.moveTo(tipX, 0);
      ctx.lineTo(baseX - 4, -baseY);
      ctx.quadraticCurveTo(baseX, -baseY, baseX, -baseY + 4);
      ctx.lineTo(baseX, baseY - 4);
      ctx.quadraticCurveTo(baseX, baseY, baseX - 4, baseY);
    } else if (pointerStyle === "circle") {
      ctx.arc(radius - 2, 0, 10, 0, 2 * Math.PI);
    } else {
      // Larger arrow with rounded edges (default) - moved upward
      const tipX = radius - 12;
      const baseX = radius + 10;
      const baseY = 13;
      
      ctx.moveTo(tipX, 0);
      ctx.lineTo(baseX - 3, -baseY);
      ctx.quadraticCurveTo(baseX, -baseY, baseX, -baseY + 3);
      ctx.lineTo(baseX, baseY - 3);
      ctx.quadraticCurveTo(baseX, baseY, baseX - 3, baseY);
    }
    
    ctx.closePath();
    ctx.fillStyle = pointerColor;
    ctx.fill();
    ctx.strokeStyle = wheelBorderColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };

  const getBackgroundStyle = (): React.CSSProperties => {
    if (backgroundImageUrl) {
      return {
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: '1rem',
        padding: '1rem',
      };
    }
    
    if (backgroundGradientEnabled && backgroundGradientStart && backgroundGradientEnd) {
      // Convert direction format from "to-bottom" to "to bottom" for CSS
      const cssDirection = backgroundGradientDirection?.replace(/-/g, ' ') || 'to bottom';
      return {
        background: `linear-gradient(${cssDirection}, ${backgroundGradientStart}, ${backgroundGradientEnd})`,
        borderRadius: '1rem',
        padding: '1rem',
      };
    }
    
    return {
      backgroundColor: backgroundColor || '#ffffff',
      borderRadius: '1rem',
      padding: '1rem',
    };
  };

  const containerStyle = getBackgroundStyle();

  return (
    <div className="relative flex flex-col items-center justify-center p-8" style={containerStyle}>
      {logoUrl && logoPosition === "top" && (
        <div className="mb-2">
          <img src={logoUrl} alt="Logo" className="max-h-10 max-w-[8rem] object-contain" />
        </div>
      )}
      
      {logoUrl && logoPosition === "top-left" && (
        <img src={logoUrl} alt="Logo" className="absolute top-2 left-2 max-h-8 max-w-[6rem] object-contain z-10" />
      )}
      
      {logoUrl && logoPosition === "top-right" && (
        <img src={logoUrl} alt="Logo" className="absolute top-2 right-2 max-h-8 max-w-[6rem] object-contain z-10" />
      )}
      
      {logoUrl && logoPosition === "bottom-left" && (
        <img src={logoUrl} alt="Logo" className="absolute bottom-2 left-2 max-h-8 max-w-[6rem] object-contain z-10" />
      )}
      
      {logoUrl && logoPosition === "bottom-right" && (
        <img src={logoUrl} alt="Logo" className="absolute bottom-2 right-2 max-h-8 max-w-[6rem] object-contain z-10" />
      )}
      
      <div className="relative" style={{ width: '250px', height: '250px' }}>
        <canvas ref={canvasRef} width={250} height={250} style={{ position: "relative", zIndex: 1 }} />
        <BorderCanvas
          enabled={borderEnabled}
          theme={borderTheme}
          defaultEnabled={borderDefaultEnabled}
          defaultColor={borderDefaultColor}
          defaultThickness={borderDefaultThickness ? borderDefaultThickness * 0.625 : 6.25}
          customColors={borderCustomColors}
          bulbShape={borderBulbShape}
          bulbCount={borderBulbCount}
          bulbSize={borderBulbSize * 0.625}
          blinkSpeed={borderBlinkSpeed}
          wheelRadius={107}
          canvasSize={250}
          spacing={12.5}
          connectorRingEnabled={borderConnectorRingEnabled}
          connectorRingColor={borderConnectorRingColor}
          connectorRingThickness={borderConnectorRingThickness ? borderConnectorRingThickness * 0.625 : 3.75}
        />
      </div>
      
      {logoUrl && logoPosition === "bottom" && (
        <div className="mt-2">
          <img src={logoUrl} alt="Logo" className="max-h-10 max-w-[8rem] object-contain" />
        </div>
      )}
    </div>
  );
}
