import { useEffect, useRef } from "react";

interface BorderCanvasProps {
  enabled: boolean;
  theme: "default" | "custom";
  defaultEnabled?: boolean;
  defaultColor?: string;
  defaultThickness?: number;
  customColors?: string[];
  bulbShape: "circle" | "heart" | "star";
  bulbCount: number;
  bulbSize: number;
  blinkSpeed: "slow" | "medium" | "fast";
  wheelRadius: number;
  canvasSize?: number;
  spacing?: number;
  connectorRingEnabled?: boolean;
  connectorRingColor?: string;
  connectorRingThickness?: number;
}

const BLINK_SPEEDS = {
  slow: 800,
  medium: 500,
  fast: 300,
};

export default function BorderCanvas({
  enabled,
  theme,
  defaultEnabled = true,
  defaultColor = "#FFFFFF",
  defaultThickness = 10,
  customColors,
  bulbShape,
  bulbCount,
  bulbSize,
  blinkSpeed,
  wheelRadius,
  canvasSize = 400,
  spacing = 20,
  connectorRingEnabled = false,
  connectorRingColor = "#FFFFFF",
  connectorRingThickness = 6,
}: BorderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const blinkIntervalRef = useRef<number | null>(null);
  const colorIndexRef = useRef(0);

  useEffect(() => {
    if (!enabled || !canvasRef.current) {
      // Clear canvas and stop animation
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (blinkIntervalRef.current !== null) {
        clearInterval(blinkIntervalRef.current);
        blinkIntervalRef.current = null;
      }
      return;
    }

    // Handle theme === "default" - legacy mode where only default border is shown
    if (theme === "default") {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Draw static border circle
      if (defaultEnabled) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, wheelRadius + (defaultThickness / 2), 0, 2 * Math.PI);
        ctx.strokeStyle = defaultColor;
        ctx.lineWidth = defaultThickness;
        ctx.stroke();
      }
      
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get colors based on theme or custom
    let colors: string[];
    let shape: "circle" | "heart" | "star";
    let effectiveBulbSize: number;
    let effectiveBulbCount: number;
    let effectiveBlinkSpeed: number;

    // Use custom theme values
    colors = customColors && customColors.length > 0 ? customColors : ["#ffffff"];
    shape = bulbShape;
    effectiveBulbSize = bulbSize;
    effectiveBulbCount = bulbCount;
    effectiveBlinkSpeed = BLINK_SPEEDS[blinkSpeed];

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    // Position bulbs with spacing around the wheel border
    const borderRadius = wheelRadius + spacing;

    const drawBulb = (x: number, y: number, color: string, size: number, bulbShape: "circle" | "heart" | "star") => {
      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 0.8;

      if (bulbShape === "circle") {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      } else if (bulbShape === "heart") {
        // Draw heart shape using simplified bezier curves
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x - size, y - size, x - size * 1.5, y + size / 2, x, y + size);
        ctx.bezierCurveTo(x + size * 1.5, y + size / 2, x + size, y - size, x, y);
        ctx.fill();
      } else if (bulbShape === "star") {
        // Draw star shape using angle-based approach
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle1 = (18 + 72 * i) * Math.PI / 180;
          const angle2 = (54 + 72 * i) * Math.PI / 180;
          
          ctx.lineTo(
            x + size * Math.cos(angle1),
            y - size * Math.sin(angle1)
          );
          ctx.lineTo(
            x + (size / 2) * Math.cos(angle2),
            y - (size / 2) * Math.sin(angle2)
          );
        }
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw default border first (underneath everything) if enabled
      if (defaultEnabled) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, wheelRadius + (defaultThickness / 2), 0, 2 * Math.PI);
        ctx.strokeStyle = defaultColor;
        ctx.lineWidth = defaultThickness;
        ctx.stroke();
      }

      // Draw connector ring second (underneath the bulbs) if enabled
      if (connectorRingEnabled) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, borderRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = connectorRingColor;
        ctx.lineWidth = connectorRingThickness;
        ctx.stroke();
      }

      // Draw bulbs around the circle (on top of connector ring)
      for (let i = 0; i < effectiveBulbCount; i++) {
        const angle = (i / effectiveBulbCount) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * borderRadius;
        const y = centerY + Math.sin(angle) * borderRadius;
        
        // Alternate colors based on blink pattern
        const colorIndex = (i + colorIndexRef.current) % colors.length;
        const color = colors[colorIndex];
        
        drawBulb(x, y, color, effectiveBulbSize, shape);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    // Start animation
    render();

    // Setup blink interval
    blinkIntervalRef.current = window.setInterval(() => {
      colorIndexRef.current = (colorIndexRef.current + 1) % colors.length;
    }, effectiveBlinkSpeed);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (blinkIntervalRef.current !== null) {
        clearInterval(blinkIntervalRef.current);
        blinkIntervalRef.current = null;
      }
    };
  }, [enabled, theme, defaultEnabled, defaultColor, defaultThickness, customColors, bulbShape, bulbCount, bulbSize, blinkSpeed, wheelRadius, connectorRingEnabled, connectorRingColor, connectorRingThickness]);

  if (!enabled) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize}
      height={canvasSize}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
