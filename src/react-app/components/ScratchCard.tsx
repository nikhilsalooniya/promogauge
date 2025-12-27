import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import type { WheelSegment } from "@/shared/types";

interface ScratchCardProps {
  segments: WheelSegment[];
  onScratchComplete: (prize: string) => void;
  onScratchStart?: () => void | Promise<void>;
  disabled?: boolean;
  cardShape?: string;
  scratchMaskStyle?: string;
  scratchInstructionsTitle?: string;
  scratchInstructionsSubtitle?: string;
  buttonText?: string;
  buttonColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
  confettiEnabled?: boolean;
  soundEnabled?: boolean;
  borderEnabled?: boolean;
  fontColor?: string;
}

export interface ScratchCardHandle {
  triggerScratch: () => void;
}

const ScratchCard = forwardRef<ScratchCardHandle, ScratchCardProps>(({
  segments,
  onScratchComplete,
  onScratchStart,
  disabled,
  cardShape = "rounded-rectangle",
  scratchMaskStyle = "silver",
  scratchInstructionsTitle = "Scratch to reveal your prize!",
  scratchInstructionsSubtitle,
  buttonText = "Continue",
  buttonColor = "#6366f1",
  backgroundColor = "#ffffff",
  logoUrl,
  confettiEnabled = true,
  soundEnabled = true,
  fontColor = "#ffffff",
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const demoCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [wonPrize, setWonPrize] = useState<WheelSegment | null>(null);
  const isMouseDownRef = useRef(false);
  const scratchSoundRef = useRef<HTMLAudioElement | null>(null);
  const winSoundRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);

  useImperativeHandle(ref, () => ({
    triggerScratch: () => {
      handleStartScratch();
    },
  }));

  // Animate the instruction card with realistic scratching
  useEffect(() => {
    if (!hasStarted && !disabled) {
      const canvas = demoCanvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      // Draw initial mask once
      drawInitialDemoMask(ctx);
      
      let startTime: number | null = null;
      let lastProgress = 0;
      
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const duration = 4000; // 4 second animation
        let progress = (elapsed % duration) / duration;
        
        // Reset canvas when animation loops
        if (progress < lastProgress) {
          drawInitialDemoMask(ctx);
        }
        lastProgress = progress;
        
        setAnimationProgress(progress);
        
        // Progressively erase the mask
        eraseDemoMask(ctx, progress);
        
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [hasStarted, disabled, scratchMaskStyle]);

  const drawInitialDemoMask = (ctx: CanvasRenderingContext2D) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw the scratch mask
    let gradient;
    if (scratchMaskStyle === "silver") {
      gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#c0c0c0");
      gradient.addColorStop(0.5, "#e8e8e8");
      gradient.addColorStop(1, "#a8a8a8");
    } else if (scratchMaskStyle === "gold") {
      gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#B8A88A");
      gradient.addColorStop(0.5, "#D4C4A8");
      gradient.addColorStop(1, "#A89878");
    } else if (scratchMaskStyle === "gray") {
      gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#B0B0B0");
      gradient.addColorStop(0.5, "#C8C8C8");
      gradient.addColorStop(1, "#9A9A9A");
    } else {
      gradient = "#cccccc";
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add texture overlay
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
      ctx.fillRect(
        Math.random() * width,
        Math.random() * height,
        2,
        2
      );
    }
    ctx.globalAlpha = 1;
  };

  const eraseDemoMask = (ctx: CanvasRenderingContext2D, progress: number) => {
    if (progress === 0) return;
    
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    ctx.globalCompositeOperation = "destination-out";
    
    // Create zigzag scratch path from top to bottom
    const scratchLength = progress * 1.2; // Go slightly beyond to complete
    const rows = 8; // Number of zigzag rows
    const rowHeight = height / rows;
    
    for (let row = 0; row < rows; row++) {
      const rowProgress = Math.max(0, Math.min(1, (scratchLength - (row / rows)) * rows));
      
      if (rowProgress > 0) {
        const y = row * rowHeight + rowHeight / 2;
        const isLeftToRight = row % 2 === 0;
        
        const startX = isLeftToRight ? 0 : width;
        const endX = isLeftToRight ? width : 0;
        const currentX = startX + (endX - startX) * rowProgress;
        
        // Draw scratch stroke continuously
        const prevProgress = Math.max(0, rowProgress - 0.05);
        const prevX = startX + (endX - startX) * prevProgress;
        
        ctx.beginPath();
        ctx.moveTo(prevX, y);
        ctx.lineTo(currentX, y);
        ctx.lineWidth = 50;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }
    
    ctx.globalCompositeOperation = "source-over";
  };

  useEffect(() => {
    if (hasStarted && wonPrize) {
      drawScratchMask();
    }
  }, [hasStarted, wonPrize, scratchMaskStyle]);

  useEffect(() => {
    // Initialize sound effects
    if (soundEnabled) {
      // Create scratch sound (white noise simulation)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a buffer for scratch sound
      const sampleRate = audioContext.sampleRate;
      const duration = 0.1;
      const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate white noise
      for (let i = 0; i < buffer.length; i++) {
        data[i] = Math.random() * 0.15 - 0.075; // Quieter scratch sound
      }
      
      // Store for later use
      scratchSoundRef.current = new Audio();
      scratchSoundRef.current.volume = 0.3;
      
      // Win sound (short positive chime)
      winSoundRef.current = new Audio();
      winSoundRef.current.volume = 0.5;
    }
  }, [soundEnabled]);

  const selectRandomPrize = (): WheelSegment => {
    // Use cryptographically secure random number generator
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const secureRandom = randomArray[0] / (0xFFFFFFFF + 1);
    
    const randomIndex = Math.floor(secureRandom * segments.length);
    return segments[randomIndex];
  };

  const handleStartScratch = async () => {
    if (disabled || hasStarted) return;

    if (onScratchStart) {
      await onScratchStart();
      if (disabled) return;
    }

    // Pre-select prize before revealing
    const prize = selectRandomPrize();
    setWonPrize(prize);
    setHasStarted(true);
    setIsScratching(true);
  };

  const drawScratchMask = () => {
    const canvas = canvasRef.current;
    if (!canvas || !wonPrize) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Create gradient or solid mask based on style
    let gradient;
    if (scratchMaskStyle === "silver") {
      gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "#c0c0c0");
      gradient.addColorStop(0.5, "#e8e8e8");
      gradient.addColorStop(1, "#a8a8a8");
    } else if (scratchMaskStyle === "gold") {
      gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "#B8A88A");
      gradient.addColorStop(0.5, "#D4C4A8");
      gradient.addColorStop(1, "#A89878");
    } else if (scratchMaskStyle === "gray") {
      gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "#B0B0B0");
      gradient.addColorStop(0.5, "#C8C8C8");
      gradient.addColorStop(1, "#9A9A9A");
    } else {
      gradient = "#cccccc";
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add texture overlay
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
      ctx.fillRect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        2,
        2
      );
    }
    ctx.globalAlpha = 1;
  };

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !isScratching) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Play scratch sound effect
    if (soundEnabled && Math.random() > 0.7) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 200 + Math.random() * 100;
        oscillator.type = 'sawtooth';
        
        gainNode.gain.setValueAtTime(0.03, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.05);
      } catch (error) {
        // Silently fail if audio context is not available
      }
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (x - rect.left) * scaleX;
    const canvasY = (y - rect.top) * scaleY;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 30, 0, 2 * Math.PI);
    ctx.fill();

    // Calculate scratch progress
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;
    
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 128) transparentPixels++;
    }
    
    const progress = (transparentPixels / (pixels.length / 4)) * 100;
    setScratchProgress(progress);

    if (progress > 60 && wonPrize) {
      setIsScratching(false);
      
      // Play win or no-win sound
      if (soundEnabled) {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          if (wonPrize.prize_type === "no_win") {
            // Sad trombone effect
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
            oscillator.type = 'sawtooth';
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
          } else {
            // Victory chime
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            
            // Add second note
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.15); // E5
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.45);
            
            osc2.start(audioContext.currentTime + 0.15);
            osc2.stop(audioContext.currentTime + 0.45);
          }
        } catch (error) {
          // Silently fail if audio context is not available
        }
      }
      
      if (confettiEnabled && wonPrize.prize_type !== "no_win") {
        triggerConfetti();
      }
      setTimeout(() => {
        onScratchComplete(wonPrize.label);
      }, 300);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isMouseDownRef.current = true;
    scratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isMouseDownRef.current) {
      scratch(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isMouseDownRef.current = true;
    const touch = e.touches[0];
    scratch(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (isMouseDownRef.current) {
      const touch = e.touches[0];
      scratch(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isMouseDownRef.current = false;
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

  const borderRadius = cardShape === "rounded-rectangle" ? "16px" : "8px";

  // Calculate finger position for zigzag scratch animation
  const getFingerPosition = (progress: number) => {
    const rows = 8;
    const cardSize = 240;
    const rowHeight = cardSize / rows;
    
    const totalProgress = progress * 1.2;
    const currentRow = Math.floor(totalProgress * rows);
    const rowProgress = (totalProgress * rows) % 1;
    
    if (currentRow >= rows) {
      return null; // Animation complete
    }
    
    const y = currentRow * rowHeight + rowHeight / 2;
    const isLeftToRight = currentRow % 2 === 0;
    
    const startX = isLeftToRight ? 0 : cardSize;
    const endX = isLeftToRight ? cardSize : 0;
    const x = startX + (endX - startX) * rowProgress;
    
    return { x, y };
  };

  const fingerPos = getFingerPosition(animationProgress);

  return (
    <>
      {!hasStarted ? (
        <div 
          ref={containerRef} 
          className="relative p-4 md:p-12 flex flex-col items-center"
        >
          {logoUrl && (
            <div className="flex justify-center mb-4">
              <img src={logoUrl} alt="Logo" className="h-12 md:h-16 object-contain" />
            </div>
          )}
          
          <div className="flex flex-col items-center space-y-6 max-w-md">
            {/* Instruction Card with Animation */}
            <div 
              className="w-full max-w-sm rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 relative overflow-hidden bg-white"
              style={{ 
                borderRadius: "24px",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5"></div>
              
              {/* Animated Demo Scratch Card */}
              <div className="relative z-10 w-60 h-60 mb-6">
                {/* Background with Prize */}
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    backgroundColor: segments[0]?.color || "#FFD700",
                    borderRadius: "16px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                  }}
                >
                  {/* Demo Gift Icon */}
                  <div className="text-center">
                    <div className="text-6xl mb-2">🎁</div>
                    <div className="text-xl font-bold text-gray-800">Prize</div>
                  </div>
                </div>
                
                {/* Animated Scratch Mask using Canvas */}
                <canvas
                  ref={demoCanvasRef}
                  width={240}
                  height={240}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{
                    borderRadius: "16px"
                  }}
                />
                
                {/* Animated Finger Pointer */}
                {fingerPos && (
                  <div 
                    className="absolute pointer-events-none z-20"
                    style={{
                      left: `${fingerPos.x}px`,
                      top: `${fingerPos.y}px`,
                      transform: `translate(-50%, -50%)`,
                      transition: 'all 0.05s linear',
                    }}
                  >
                    <div className="text-4xl drop-shadow-lg filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">👆</div>
                  </div>
                )}
              </div>
              
              {/* Instructions */}
              <div className="relative z-10 text-center space-y-4">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {scratchInstructionsTitle}
                </h2>
                {scratchInstructionsSubtitle && (
                  <p className="text-gray-600">{scratchInstructionsSubtitle}</p>
                )}
                <button
                  onClick={handleStartScratch}
                  disabled={disabled}
                  className="px-8 py-4 rounded-full font-bold text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: buttonColor }}
                >
                  {buttonText}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div 
          ref={containerRef} 
          className="relative p-4 md:p-12 flex flex-col items-center"
        >
          {logoUrl && (
            <div className="flex justify-center mb-4">
              <img src={logoUrl} alt="Logo" className="h-12 md:h-16 object-contain" />
            </div>
          )}
          
          <div 
            className="w-full max-w-sm rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 relative overflow-hidden bg-white"
            style={{ 
              borderRadius: "24px",
            }}
          >
            {/* Larger Scratch Card - 240x240 */}
            <div 
              className="w-60 h-60 rounded-2xl shadow-2xl flex items-center justify-center relative overflow-hidden"
              style={{ 
                backgroundColor: wonPrize?.color || backgroundColor,
                borderRadius,
              }}
            >
              {wonPrize && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-3">
                  {wonPrize.prize_image_url && (
                    <img 
                      src={wonPrize.prize_image_url} 
                      alt={wonPrize.label}
                      className="max-w-[140px] max-h-[140px] object-contain"
                    />
                  )}
                  {wonPrize.icon && !wonPrize.prize_image_url && (
                    <span className="text-7xl">{wonPrize.icon}</span>
                  )}
                  <h3 className="text-2xl font-bold text-center leading-tight" style={{ color: fontColor }}>
                    {wonPrize.label}
                  </h3>
                  {/* Note: Prize description is intentionally NOT shown here */}
                </div>
              )}
              
              <canvas
                ref={canvasRef}
                width={240}
                height={240}
                className="absolute inset-0 w-full h-full cursor-pointer"
                style={{ borderRadius }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
            </div>
            
            {isScratching && scratchProgress < 60 && (
              <div className="mt-4 text-center">
                <div className="w-full max-w-md h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${Math.min(scratchProgress, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Keep scratching... {Math.floor(scratchProgress)}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});

ScratchCard.displayName = "ScratchCard";

export default ScratchCard;
