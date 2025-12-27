import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import type { WheelSegment } from "@/shared/types";
import BorderCanvas from "./BorderCanvas";

interface SpinWheelProps {
  segments: WheelSegment[];
  onSpinComplete: (prize: string) => void;
  onSpinClick?: () => void | Promise<void>;
  disabled?: boolean;
  pointerColor?: string;
  logoUrl?: string;
  logoPosition?: string;
  confettiEnabled?: boolean;
  soundEnabled?: boolean;
  soundSettings?: {
    spin: boolean;
    win: boolean;
    noWin: boolean;
  };
  fontFamily?: string;
  fontSize?: number;
  wheelBorderThickness?: number;
  wheelBorderColor?: string;
  pointerStyle?: string;
  spinButtonText?: string;
  spinButtonColor?: string;
  spinButtonBorderRadius?: number;
  spinButtonPulseEnabled?: boolean;
  spinDurationSeconds?: number;
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

export interface SpinWheelHandle {
  triggerSpin: () => void;
}

const SpinWheel = forwardRef<SpinWheelHandle, SpinWheelProps>(({ 
  segments, 
  onSpinComplete,
  onSpinClick,
  disabled,
  pointerColor = "#ef4444",
  logoUrl,
  logoPosition = "center",
  confettiEnabled = true,
  soundEnabled = true,
  soundSettings = { spin: true, win: true, noWin: true },
  fontFamily = "Inter",
  fontSize = 16,
  wheelBorderThickness = 3,
  wheelBorderColor = "#ffffff",
  pointerStyle = "arrow",
  spinButtonText = "SPIN",
  spinButtonColor = "#6366f1",
  spinButtonBorderRadius = 40,
  spinButtonPulseEnabled = true,
  spinDurationSeconds = 5,
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
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [pulsePhase, setPulsePhase] = useState(0);
  const spinTimeTotal = spinDurationSeconds * 1000; // Convert seconds to milliseconds
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Expose spin function to parent component via ref
  useImperativeHandle(ref, () => ({
    triggerSpin: () => {
      spin();
    },
  }));

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
  }, [segments, rotation, logoImage, pointerColor, pulsePhase, fontFamily, fontSize, wheelBorderThickness, wheelBorderColor, pointerStyle, spinButtonText, spinButtonColor, spinButtonBorderRadius, borderEnabled, borderTheme]);

  // Pulse animation for SPIN button
  useEffect(() => {
    if (isSpinning || !spinButtonPulseEnabled) return;

    const animate = () => {
      setPulsePhase((prev) => (prev + 0.08) % (Math.PI * 2));
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSpinning, spinButtonPulseEnabled]);

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
      size = Math.max(12, baseSize * 0.75);
    } else if (textLength > 15) {
      size = Math.max(13, baseSize * 0.85);
    } else if (textLength > 12) {
      size = Math.max(14, baseSize * 0.9);
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
    const radius = Math.min(centerX, centerY) - 25;
    const segmentAngle = (2 * Math.PI) / segments.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw wheel drop shadow
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    // Draw segments
    segments.forEach((segment, index) => {
      const startAngle = index * segmentAngle + rotation;
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
      const textFontSize = getOptimalFontSize(segment.label, fontSize, hasIcon);
      const maxTextWidth = radius * 0.5; // Maximum width for text

      if (hasIcon) {
        // Emoji/icon on top, text below layout - centered in slice
        const emojiSize = Math.floor(fontSize * 1.5);
        const textRadius = radius * 0.65;
        
        // Draw emoji/icon
        ctx.font = `${emojiSize}px ${fontFamily}, sans-serif`;
        ctx.fillText(segment.icon!, textRadius, -10);
        
        // Draw text below emoji
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${textFontSize}px ${fontFamily}, sans-serif`;
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        
        // Wrap text if needed
        const lines = wrapText(ctx, segment.label, maxTextWidth);
        
        // Adjust font size if we have multiple lines
        let finalFontSize = textFontSize;
        if (lines.length === 2) {
          finalFontSize = Math.max(12, textFontSize * 0.95);
        } else if (lines.length === 3) {
          finalFontSize = Math.max(11, textFontSize * 0.9);
        }
        ctx.font = `bold ${finalFontSize}px ${fontFamily}, sans-serif`;
        
        const finalLineHeight = finalFontSize * 1.2;
        
        // Position text below emoji
        lines.forEach((line, i) => {
          const lineY = 15 + (i * finalLineHeight);
          ctx.fillText(line, textRadius, lineY);
        });
      } else {
        // Text only - centered in slice
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${textFontSize}px ${fontFamily}, sans-serif`;
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        
        // Wrap text if needed
        const lines = wrapText(ctx, segment.label, maxTextWidth);
        
        // Adjust font size if we have multiple lines
        let finalFontSize = textFontSize;
        if (lines.length === 2) {
          finalFontSize = Math.max(13, textFontSize * 0.95);
        } else if (lines.length === 3) {
          finalFontSize = Math.max(12, textFontSize * 0.9);
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
      ctx.arc(centerX, centerY, radius + 5, 0, 2 * Math.PI);
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 10;
      ctx.stroke();
    }

    // Draw center circle with pulsing glow
    const pulseValue = Math.sin(pulsePhase) * 0.5 + 0.5; // 0 to 1
    
    // Draw multiple concentric glow rings for a more visible pulse effect
    if (!isSpinning && spinButtonPulseEnabled) {
      // Convert spinButtonColor to RGB for glow effect
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 99, g: 102, b: 241 };
      };
      const rgb = hexToRgb(spinButtonColor);
      
      // Outer glow layer 1
      const outerRadius1 = 40 + pulseValue * 8;
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius1, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.15 + pulseValue * 0.25})`;
      ctx.lineWidth = 6;
      ctx.stroke();
      
      // Outer glow layer 2
      const outerRadius2 = 40 + pulseValue * 4;
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius2, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.25 + pulseValue * 0.35})`;
      ctx.lineWidth = 4;
      ctx.stroke();
      
      // Shadow blur for additional glow
      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.4 + pulseValue * 0.4})`;
      ctx.shadowBlur = 15 + pulseValue * 15;
    }

    // Draw center circle
    const buttonRadius = spinButtonBorderRadius || 40;
    ctx.beginPath();
    ctx.arc(centerX, centerY, buttonRadius, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = spinButtonColor;
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Draw logo in center if available and position is center
    if (logoImage && logoPosition === "center") {
      const logoSize = 60;
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, buttonRadius - 5, 0, 2 * Math.PI);
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
      const baseFontSize = fontSize + 2;
      ctx.font = `bold ${baseFontSize}px ${fontFamily}, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Maximum width for button text (diameter of center circle minus padding)
      const maxButtonTextWidth = (buttonRadius * 2) - 20;
      const lines = wrapText(ctx, spinButtonText, maxButtonTextWidth);
      
      // Adjust font size if multiple lines
      let buttonFontSize = baseFontSize;
      if (lines.length === 2) {
        buttonFontSize = Math.max(11, baseFontSize * 0.85);
      } else if (lines.length >= 3) {
        buttonFontSize = Math.max(9, baseFontSize * 0.7);
      }
      
      ctx.font = `bold ${buttonFontSize}px ${fontFamily}, sans-serif`;
      const lineHeight = buttonFontSize * 1.1;
      const totalHeight = lines.length * lineHeight;
      const startY = centerY - (totalHeight / 2) + (lineHeight / 2);
      
      lines.forEach((line, i) => {
        ctx.fillText(line, centerX, startY + (i * lineHeight));
      });
    }

    // Draw pointer at top (pointing inward toward center)
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-Math.PI / 2);
    
    // Add shadow to pointer
    ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    
    ctx.beginPath();
    
    if (pointerStyle === "triangle") {
      // Larger triangle with rounded edges - moved upward
      const tipX = radius - 20;
      const baseX = radius + 16;
      const baseY = 24;
      
      ctx.moveTo(tipX, 0);
      ctx.lineTo(baseX - 6, -baseY);
      ctx.quadraticCurveTo(baseX, -baseY, baseX, -baseY + 6);
      ctx.lineTo(baseX, baseY - 6);
      ctx.quadraticCurveTo(baseX, baseY, baseX - 6, baseY);
    } else if (pointerStyle === "circle") {
      ctx.arc(radius, 0, 16, 0, 2 * Math.PI);
    } else {
      // Larger arrow with rounded edges (default) - moved upward
      const tipX = radius - 22;
      const baseX = radius + 16;
      const baseY = 20;
      
      ctx.moveTo(tipX, 0);
      ctx.lineTo(baseX - 5, -baseY);
      ctx.quadraticCurveTo(baseX, -baseY, baseX, -baseY + 5);
      ctx.lineTo(baseX, baseY - 5);
      ctx.quadraticCurveTo(baseX, baseY, baseX - 5, baseY);
    }
    
    ctx.closePath();
    ctx.fillStyle = pointerColor;
    ctx.fill();
    ctx.strokeStyle = wheelBorderColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };

  const playSpinSound = () => {
    if (!soundEnabled || !soundSettings?.spin) return;
    // Create a simple tick sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const playWinSound = () => {
    if (!soundEnabled || !soundSettings?.win) return;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 523.25; // C note
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const playNoWinSound = () => {
    if (!soundEnabled || !soundSettings?.noWin) return;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 200; // Lower frequency for disappointment
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  };

  const triggerConfetti = () => {
    if (!confettiEnabled || !containerRef.current) return;

    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.style.position = 'absolute';
      confetti.style.width = '10px';
      confetti.style.height = '10px';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = '50%';
      confetti.style.top = '50%';
      confetti.style.borderRadius = '50%';
      confetti.style.pointerEvents = 'none';
      confetti.style.zIndex = '1000';
      
      const angle = (Math.PI * 2 * i) / confettiCount;
      const velocity = 5 + Math.random() * 5;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity;
      
      containerRef.current.appendChild(confetti);
      
      let x = 0, y = 0, vy_current = vy;
      const gravity = 0.3;
      const animation = setInterval(() => {
        x += vx;
        y += vy_current;
        vy_current += gravity;
        
        confetti.style.transform = `translate(${x}px, ${y}px)`;
        confetti.style.opacity = String(Math.max(0, 1 - y / 200));
        
        if (y > 200) {
          clearInterval(animation);
          confetti.remove();
        }
      }, 16);
    }
  };

  const spin = async () => {
    if (isSpinning || disabled) return;

    // Call onSpinClick if provided (for pre-spin validation)
    if (onSpinClick) {
      await onSpinClick();
      // If disabled was set during the callback, don't proceed
      if (disabled) return;
    }

    setIsSpinning(true);
    playSpinSound();
    
    const startTime = Date.now();
    const startRotation = rotation;
    
    // Use cryptographically secure random number generator
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const secureRandom = randomArray[0] / (0xFFFFFFFF + 1); // Normalize to 0-1
    
    const spinRotation = secureRandom * 10 + 15; // 15-25 full rotations
    const totalRotation = spinRotation * 2 * Math.PI;

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;

      if (elapsed < spinTimeTotal) {
        const progress = elapsed / spinTimeTotal;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const newRotation = startRotation + totalRotation * easeOut;
        setRotation(newRotation % (2 * Math.PI));
        requestAnimationFrame(animate);
      } else {
        const finalRotation = (startRotation + totalRotation) % (2 * Math.PI);
        setRotation(finalRotation);
        setIsSpinning(false);

        // Calculate winning segment
        // Pointer is at top of the wheel, which is at angle -π/2 in the coordinate system
        const segmentAngle = (2 * Math.PI) / segments.length;
        
        // Normalize the rotation to 0-2π
        const normalizedRotation = ((finalRotation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
        
        // The pointer is at -π/2. Find which segment contains this angle.
        // Segments are drawn from: i * segmentAngle + rotation
        // We need to find i where: i * segmentAngle + rotation <= -π/2 < (i+1) * segmentAngle + rotation
        // Solving for i: i = floor((-π/2 - rotation) / segmentAngle)
        const pointerAngle = -Math.PI / 2;
        let winningIndex = Math.floor((pointerAngle - normalizedRotation) / segmentAngle);
        
        // Handle negative indices and wrap around
        winningIndex = ((winningIndex % segments.length) + segments.length) % segments.length;
        
        setTimeout(() => {
          const winningSegment = segments[winningIndex];
          // Check if it's a no-win prize using prize_type
          const isNoWin = winningSegment.prize_type === "no_win";
          
          // Play appropriate sound
          if (isNoWin) {
            playNoWinSound();
          } else {
            playWinSound();
            // Only trigger confetti for wins, not for no-win prizes
            triggerConfetti();
          }
          
          onSpinComplete(winningSegment.label);
        }, 300);
      }
    };

    animate();
  };

  return (
    <div ref={containerRef} className="relative p-4 md:p-12 flex flex-col items-center">
      {logoUrl && logoPosition === "top" && (
        <div className="flex justify-center mb-2 md:mb-4">
          <img src={logoUrl} alt="Logo" className="h-10 md:h-16 object-contain" />
        </div>
      )}
      
      {logoUrl && logoPosition === "top-left" && (
        <img src={logoUrl} alt="Logo" className="absolute top-2 left-2 md:top-8 md:left-8 h-10 md:h-16 object-contain z-10" />
      )}
      
      {logoUrl && logoPosition === "top-right" && (
        <img src={logoUrl} alt="Logo" className="absolute top-2 right-2 md:top-8 md:right-8 h-10 md:h-16 object-contain z-10" />
      )}
      
      {logoUrl && logoPosition === "bottom-left" && (
        <img src={logoUrl} alt="Logo" className="absolute bottom-2 left-2 md:bottom-8 md:left-8 h-10 md:h-16 object-contain z-10" />
      )}
      
      {logoUrl && logoPosition === "bottom-right" && (
        <img src={logoUrl} alt="Logo" className="absolute bottom-2 right-2 md:bottom-8 md:right-8 h-10 md:h-16 object-contain z-10" />
      )}
      
      <div className="relative">
        <canvas
        ref={canvasRef}
        width={400}
        height={400}
        onClick={spin}
        className={`${isSpinning || disabled ? "cursor-not-allowed" : "cursor-pointer"} transition-opacity ${disabled ? "opacity-50" : ""} w-full max-w-[320px] md:max-w-[400px] h-auto relative`}
        style={{ zIndex: 1 }}
      />
        <BorderCanvas
          enabled={borderEnabled}
          theme={borderTheme}
          defaultEnabled={borderDefaultEnabled}
          defaultColor={borderDefaultColor}
          defaultThickness={borderDefaultThickness}
          customColors={borderCustomColors}
          bulbShape={borderBulbShape}
          bulbCount={borderBulbCount}
          bulbSize={borderBulbSize}
          blinkSpeed={borderBlinkSpeed}
          wheelRadius={175}
          canvasSize={400}
          connectorRingEnabled={borderConnectorRingEnabled}
          connectorRingColor={borderConnectorRingColor}
          connectorRingThickness={borderConnectorRingThickness}
        />
      </div>
      
      {logoUrl && logoPosition === "bottom" && (
        <div className="flex justify-center mt-2 md:mt-4">
          <img src={logoUrl} alt="Logo" className="h-10 md:h-16 object-contain" />
        </div>
      )}
    </div>
  );
});

SpinWheel.displayName = "SpinWheel";

export default SpinWheel;
