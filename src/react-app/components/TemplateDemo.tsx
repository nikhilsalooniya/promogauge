import { useState, useRef, useEffect } from "react";
import SpinWheel, { type SpinWheelHandle } from "./SpinWheel";
import ScratchCard, { type ScratchCardHandle } from "./ScratchCard";
import { Trophy, Mail, Phone, User, CheckCircle2, Clock, Copy, Share2 } from "lucide-react";
import type { WheelSegment } from "@/shared/types";

interface TemplateDemoProps {
  segments: WheelSegment[];
  primaryColor: string;
  requiresLeadForm?: boolean;
  onBackToTemplates?: () => void;
  onUseTemplate?: () => void;
  onSpinTrigger?: (callback: () => void) => void;
  pointerColor?: string;
  backgroundColor?: string;
  backgroundGradientEnabled?: boolean;
  backgroundGradientStart?: string;
  backgroundGradientEnd?: string;
  backgroundGradientDirection?: string;
  backgroundImageUrl?: string | null;
  logoPosition?: string;
  confettiEnabled?: boolean;
  soundEnabled?: boolean;
  soundSettings?: { spin: boolean; win: boolean; noWin: boolean };
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
  borderTheme?: "default" | "custom" | null;
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
  redemptionExpiryDays?: number;
  endDatetime?: string | null;
  campaignType?: "spinwheel" | "scratch";
  scratchMaskStyle?: string;
  scratchInstructionsTitle?: string;
  scratchInstructionsSubtitle?: string;
  scratchCardShape?: string;
  leadFormFields?: any[];
}

type DemoStep = "wheel" | "congratulations" | "claim" | "redemption" | "thankyou";

export default function TemplateDemo({ 
  segments, 
  primaryColor, 
  requiresLeadForm = true, 
  onBackToTemplates, 
  onUseTemplate,
  onSpinTrigger,
  pointerColor = "#ef4444",
  backgroundColor = "#ffffff",
  backgroundGradientEnabled = false,
  backgroundGradientStart = "#6366f1",
  backgroundGradientEnd = "#8b5cf6",
  backgroundGradientDirection = "to-bottom",
  backgroundImageUrl = null,
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
  spinButtonColor,
  spinButtonBorderRadius = 40,
  spinButtonPulseEnabled = true,
  spinDurationSeconds = 5,
  borderEnabled = false,
  borderTheme = null,
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
  redemptionExpiryDays = 7,
  endDatetime = null,
  campaignType = "spinwheel",
  scratchMaskStyle = "silver",
  scratchInstructionsTitle = "Scratch to reveal your prize!",
  scratchInstructionsSubtitle,
  scratchCardShape = "rounded-rectangle",
  leadFormFields = [],
}: TemplateDemoProps) {
  const wheelRef = useRef<SpinWheelHandle>(null);
  const scratchRef = useRef<ScratchCardHandle>(null);
  const [currentStep, setCurrentStep] = useState<DemoStep>("wheel");
  const [hasSpun, setHasSpun] = useState(false);
  const [prize, setPrize] = useState<string | null>(null);
  const [prizeSegment, setPrizeSegment] = useState<WheelSegment | null>(null);
  const [formData, setFormData] = useState({ name: "John Doe", email: "john@example.com", phone: "+1234567890" });
  const [referenceNumber] = useState("DEMO-" + Math.random().toString(36).substr(2, 9).toUpperCase());
  const [redemptionExpiresAt, setRedemptionExpiresAt] = useState<string>("");
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // Expose spin trigger to parent
  useEffect(() => {
    if (onSpinTrigger && wheelRef.current) {
      onSpinTrigger(() => {
        if (wheelRef.current && currentStep === "wheel" && !hasSpun) {
          wheelRef.current.triggerSpin();
        }
      });
    }
  }, [onSpinTrigger, currentStep, hasSpun]);

  // Calculate redemption expiry date based on campaign settings
  useEffect(() => {
    if (currentStep === "redemption") {
      // Calculate expiry the same way the backend does
      const calculatedExpiry = new Date();
      calculatedExpiry.setDate(calculatedExpiry.getDate() + redemptionExpiryDays);
      
      let expiryDate = calculatedExpiry;
      
      // If campaign has an end date, use the earlier of the two dates
      if (endDatetime) {
        const campaignEndDate = new Date(endDatetime);
        if (campaignEndDate < calculatedExpiry) {
          expiryDate = campaignEndDate;
        }
      }
      
      setRedemptionExpiresAt(expiryDate.toISOString());
    }
  }, [currentStep, redemptionExpiryDays, endDatetime]);

  // Countdown timer - accurately calculates from redemption expiry
  useEffect(() => {
    if (currentStep === "redemption" && redemptionExpiresAt) {
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
  }, [currentStep, redemptionExpiresAt]);

  const handleSpinComplete = (wonPrize: string) => {
    setPrize(wonPrize);
    
    const segment = segments.find(s => s.label === wonPrize);
    setPrizeSegment(segment || null);
    
    setHasSpun(true);
    setCurrentStep("congratulations");
  };

  const handleScratchComplete = (wonPrize: string) => {
    setPrize(wonPrize);
    
    const segment = segments.find(s => s.label === wonPrize);
    setPrizeSegment(segment || null);
    
    setHasSpun(true);
    setCurrentStep("congratulations");
  };

  const handlePlayAgain = () => {
    setHasSpun(false);
    setPrize(null);
    setPrizeSegment(null);
    setCurrentStep("wheel");
    setRedemptionExpiresAt("");
    setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  };

  const handleClaimPrize = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep("redemption");
  };

  const isNoWin = prizeSegment?.prize_type === "no_win";
  const isWin = prize && !isNoWin;

  return (
    <div className="relative">
      {/* Wheel/Scratch Step */}
      {currentStep === "wheel" && (
        <div className="space-y-4 md:space-y-6">
          <div className="text-center mb-3 md:mb-4">
            <div className="inline-block px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full mb-2">
              <p className="text-xs md:text-sm font-semibold text-indigo-700">Interactive Demo</p>
            </div>
            <p className="text-xs md:text-sm text-gray-600 px-4">
              {campaignType === "scratch" 
                ? "Try scratching the card to see the complete flow!" 
                : "Try spinning the wheel to see the complete flow!"}
            </p>
          </div>

          <div 
            className="rounded-xl p-4 md:p-8"
            style={{
              background: backgroundImageUrl 
                ? `url(${backgroundImageUrl})` 
                : backgroundGradientEnabled 
                  ? `linear-gradient(${backgroundGradientDirection.replace(/-/g, ' ')}, ${backgroundGradientStart}, ${backgroundGradientEnd})`
                  : backgroundColor,
              backgroundSize: backgroundImageUrl ? 'cover' : 'auto',
              backgroundPosition: backgroundImageUrl ? 'center' : 'initial',
            }}
          >
            {campaignType === "scratch" ? (
              <ScratchCard
                ref={scratchRef}
                segments={segments}
                onScratchComplete={handleScratchComplete}
                disabled={hasSpun}
                cardShape={scratchCardShape}
                scratchMaskStyle={scratchMaskStyle}
                scratchInstructionsTitle={scratchInstructionsTitle}
                scratchInstructionsSubtitle={scratchInstructionsSubtitle}
                buttonText={spinButtonText && spinButtonText !== "SPIN" ? spinButtonText : "BEGIN SCRATCHING"}
                buttonColor={spinButtonColor || primaryColor}
                backgroundColor={backgroundColor}
                confettiEnabled={confettiEnabled}
                soundEnabled={soundEnabled}
                borderEnabled={borderEnabled}
                fontColor={wheelBorderColor}
              />
            ) : (
              <SpinWheel
                ref={wheelRef}
                segments={segments}
                onSpinComplete={handleSpinComplete}
                disabled={hasSpun}
                pointerColor={pointerColor}
                logoPosition={logoPosition}
                confettiEnabled={confettiEnabled}
                soundEnabled={soundEnabled}
                soundSettings={soundSettings}
                fontFamily={fontFamily}
                fontSize={fontSize}
                wheelBorderThickness={wheelBorderThickness}
                wheelBorderColor={wheelBorderColor}
                pointerStyle={pointerStyle}
                spinButtonText={spinButtonText}
                spinButtonColor={spinButtonColor || primaryColor}
                spinButtonBorderRadius={spinButtonBorderRadius}
                spinButtonPulseEnabled={spinButtonPulseEnabled}
                spinDurationSeconds={spinDurationSeconds}
                borderEnabled={borderEnabled}
                borderTheme={borderTheme as any}
                borderDefaultEnabled={borderDefaultEnabled}
                borderDefaultColor={borderDefaultColor}
                borderDefaultThickness={borderDefaultThickness}
                borderCustomColors={borderCustomColors}
                borderBulbShape={borderBulbShape}
                borderBulbCount={borderBulbCount}
                borderBulbSize={borderBulbSize}
                borderBlinkSpeed={borderBlinkSpeed}
                borderConnectorRingEnabled={borderConnectorRingEnabled}
                borderConnectorRingColor={borderConnectorRingColor}
                borderConnectorRingThickness={borderConnectorRingThickness}
              />
            )}
          </div>
        </div>
      )}

      {/* Congratulations Step */}
      {currentStep === "congratulations" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-xl w-full p-6 md:p-8 transform animate-in zoom-in duration-300 my-8 max-h-[85vh] overflow-y-auto">
            <div className="text-center">
              <div className={`w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br ${isNoWin ? 'from-gray-400 to-gray-500' : 'from-yellow-400 to-orange-500'} rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 ${isNoWin ? '' : 'animate-bounce'}`}>
                <Trophy className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {isNoWin ? "Sorry!" : "Congratulations!"}
              </h3>
              <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
                {isNoWin ? "No win this time." : "You won:"}
              </p>
              {!isNoWin && (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl md:rounded-2xl p-4 md:p-6 mb-4 md:mb-6">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    {prizeSegment?.icon && <span className="text-2xl md:text-3xl">{prizeSegment.icon}</span>}
                    <p className="text-xl md:text-2xl font-bold">{prize}</p>
                  </div>
                  {prizeSegment?.prize_description && (
                    <p className="text-xs md:text-sm opacity-90 mt-2">{prizeSegment.prize_description}</p>
                  )}
                </div>
              )}

              {!isNoWin && prizeSegment?.prize_image_url && (
                <div className="mb-4 md:mb-6">
                  <img 
                    src={prizeSegment.prize_image_url} 
                    alt={prize || "Prize"}
                    className="max-w-full h-auto max-h-40 md:max-h-48 mx-auto rounded-xl shadow-lg object-contain"
                  />
                </div>
              )}

              {!isNoWin && prizeSegment?.redemption_instructions && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg md:rounded-xl p-3 md:p-4 mb-4 md:mb-6 text-left">
                  <h4 className="text-xs md:text-sm font-semibold text-blue-900 mb-2">How to Redeem</h4>
                  <p className="text-xs md:text-sm text-blue-800 whitespace-pre-wrap">
                    {prizeSegment.redemption_instructions}
                  </p>
                </div>
              )}

              {!isNoWin && prizeSegment?.coupon_code && (
                <div className="bg-green-50 border border-green-200 rounded-lg md:rounded-xl p-3 md:p-4 mb-4 md:mb-6">
                  <h4 className="text-xs md:text-sm font-semibold text-green-900 mb-2">Coupon Code</h4>
                  <div className="bg-white rounded-lg p-2 md:p-3 border border-green-300">
                    <code className="text-base md:text-lg font-bold text-gray-900">{prizeSegment.coupon_code}</code>
                  </div>
                </div>
              )}

              <div className="space-y-2 md:space-y-3">
                {isWin && requiresLeadForm && (
                  <button
                    onClick={() => setCurrentStep("claim")}
                    className="w-full px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-sm md:text-base hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
                  >
                    Claim Your Prize
                  </button>
                )}
                {isWin && !requiresLeadForm && (
                  <button
                    onClick={() => setCurrentStep("thankyou")}
                    className="w-full px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-sm md:text-base hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
                  >
                    Continue
                  </button>
                )}
                <button
                  onClick={handlePlayAgain}
                  className="w-full px-4 md:px-6 py-2.5 md:py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold text-sm md:text-base hover:bg-gray-50 transition-all duration-200"
                >
                  {isNoWin ? "Try Again" : "Spin Again"}
                </button>
                
                <div className="pt-3 md:pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 italic">
                    This is a demo. No data is saved.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Claim Form Step */}
      {currentStep === "claim" && isWin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-xl w-full p-6 md:p-8 my-8 max-h-[85vh] overflow-y-auto">
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Claim Your Prize</h2>
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl md:rounded-2xl p-3 md:p-4 mt-4 mb-4 md:mb-6 inline-block">
                <p className="text-lg md:text-2xl font-bold">{prize}</p>
                {prizeSegment?.prize_description && (
                  <p className="text-xs md:text-sm opacity-90 mt-1">{prizeSegment.prize_description}</p>
                )}
              </div>
              <p className="text-xs md:text-sm text-gray-500">Fill the form to claim your prize</p>
            </div>

            <form onSubmit={handleClaimPrize} className="space-y-3 md:space-y-4">
              {leadFormFields && leadFormFields.length > 0 ? (
                leadFormFields.map((field: any) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      {field.name === 'name' && <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />}
                      {field.name === 'email' && <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />}
                      {field.name === 'phone' && <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />}
                      <input
                        type={field.type || "text"}
                        value={formData[field.name as keyof typeof formData] || ""}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        className={`w-full ${field.name === 'name' || field.name === 'email' || field.name === 'phone' ? 'pl-10' : 'pl-4'} pr-4 py-2.5 md:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm md:text-base`}
                        placeholder={`Enter your ${field.label.toLowerCase()}`}
                        readOnly
                      />
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 md:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm md:text-base"
                        placeholder="Enter your name"
                        readOnly
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 md:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm md:text-base"
                        placeholder="Enter your email"
                        readOnly
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 md:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm md:text-base"
                        placeholder="Enter your phone"
                        readOnly
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center space-x-3 md:space-y-0 pt-2">
                <button
                  type="button"
                  onClick={handlePlayAgain}
                  className="flex-1 px-4 py-2.5 md:py-3 border border-gray-300 text-gray-700 rounded-xl font-medium text-sm md:text-base hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 md:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm md:text-base hover:shadow-xl hover:shadow-indigo-500/50 transition-all duration-200"
                >
                  Claim Prize
                </button>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 italic text-center">
                  This is a demo. No data is saved.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Redemption Page Step */}
      {currentStep === "redemption" && isWin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-3xl w-full p-6 md:p-8 my-8 max-h-[85vh] overflow-y-auto">
            <div className="text-center mb-6 md:mb-8">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Prize Claimed Successfully!</h2>
            </div>

            <div className="space-y-4 md:space-y-6">
              {/* Prize Details */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Prize Details</h3>
                <p className="text-xl md:text-2xl font-bold text-indigo-600 mb-2">{prize}</p>
                {prizeSegment?.prize_description && (
                  <p className="text-xs md:text-sm text-gray-700">{prizeSegment.prize_description}</p>
                )}
              </div>

              {/* Coupon Code */}
              {prizeSegment?.coupon_code && (
                <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-green-900 mb-3 flex items-center">
                    <Trophy className="w-4 h-4 md:w-5 md:h-5 mr-2 text-green-600" />
                    Your Coupon Code
                  </h3>
                  <div className="flex items-center justify-between bg-white rounded-lg p-3 md:p-4 border border-green-200 mb-3 md:mb-4">
                    <code className="text-lg md:text-xl font-bold text-gray-900">{prizeSegment.coupon_code}</code>
                    <button
                      onClick={() => {
                        setCopiedCoupon(true);
                        setTimeout(() => setCopiedCoupon(false), 2000);
                      }}
                      className="px-3 md:px-4 py-2 bg-green-600 text-white text-xs md:text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <Copy className="w-3 h-3 md:w-4 md:h-4" />
                      <span>{copiedCoupon ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Reference Number */}
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Trophy className="w-4 h-4 md:w-5 md:h-5 mr-2 text-yellow-600" />
                  Reference Number
                </h3>
                <div className="flex items-center justify-between bg-white rounded-lg p-3 md:p-4 border border-yellow-200">
                  <code className="text-base md:text-xl font-bold text-gray-900">{referenceNumber}</code>
                  <button
                    onClick={() => {
                      setCopiedRef(true);
                      setTimeout(() => setCopiedRef(false), 2000);
                    }}
                    className="px-3 md:px-4 py-2 bg-yellow-600 text-white text-xs md:text-sm rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2"
                  >
                    <Copy className="w-3 h-3 md:w-4 md:h-4" />
                    <span>{copiedRef ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>

              {/* Redemption Timer - Only show if expiry date exists and is in the future */}
              {redemptionExpiresAt && new Date(redemptionExpiresAt).getTime() > new Date().getTime() && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-red-900 mb-3 flex items-center">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    Redemption Expires In
                  </h3>
                  <div className="grid grid-cols-4 gap-2 md:gap-3">
                    <div className="bg-white rounded-lg p-2 md:p-3 text-center">
                      <p className="text-2xl md:text-3xl font-bold text-red-600">{timeRemaining.days}</p>
                      <p className="text-xs text-gray-600 mt-1">Days</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 md:p-3 text-center">
                      <p className="text-2xl md:text-3xl font-bold text-red-600">{timeRemaining.hours}</p>
                      <p className="text-xs text-gray-600 mt-1">Hours</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 md:p-3 text-center">
                      <p className="text-2xl md:text-3xl font-bold text-red-600">{timeRemaining.minutes}</p>
                      <p className="text-xs text-gray-600 mt-1">Minutes</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 md:p-3 text-center">
                      <p className="text-2xl md:text-3xl font-bold text-red-600">{timeRemaining.seconds}</p>
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
              {prizeSegment?.redemption_instructions && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-blue-900 mb-3">How to Redeem</h3>
                  <p className="text-xs md:text-sm text-blue-800 whitespace-pre-wrap">
                    {prizeSegment.redemption_instructions}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 md:space-y-3">
                <button
                  onClick={() => {}}
                  className="w-full px-4 md:px-6 py-2.5 md:py-3 bg-green-600 text-white rounded-xl font-semibold text-sm md:text-base hover:bg-green-700 hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                  <span>Save Proof on WhatsApp</span>
                </button>
                <button
                  onClick={() => setCurrentStep("thankyou")}
                  className="w-full px-4 md:px-6 py-2.5 md:py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold text-sm md:text-base hover:bg-gray-50 transition-all duration-200"
                >
                  Continue
                </button>
                
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 italic text-center">
                    This is a demo. No data is saved.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thank You Page Step */}
      {currentStep === "thankyou" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-xl w-full p-6 md:p-8 my-8 max-h-[85vh] overflow-y-auto">
            <div className="text-center mb-6 md:mb-8">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Trophy className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Thank You for Playing!</h2>
              <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">We hope you enjoyed the experience</p>
            </div>

            <div className="space-y-4 md:space-y-6">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 md:p-6 text-center">
                <p className="text-base md:text-lg font-semibold text-gray-900 mb-2">Invite your friends to try their luck!</p>
                <p className="text-xs md:text-sm text-gray-600">Share this campaign and spread the excitement</p>
              </div>

              {/* Social Sharing Buttons */}
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <button className="flex flex-col items-center justify-center space-y-2 px-3 md:px-4 py-3 md:py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all">
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  <span className="font-medium text-xs md:text-sm">WhatsApp</span>
                </button>
                <button className="flex flex-col items-center justify-center space-y-2 px-3 md:px-4 py-3 md:py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="font-medium text-xs md:text-sm">Facebook</span>
                </button>
                <button className="flex flex-col items-center justify-center space-y-2 px-3 md:px-4 py-3 md:py-4 bg-gradient-to-br from-purple-600 to-pink-500 text-white rounded-lg hover:opacity-90 transition-all">
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                  </svg>
                  <span className="font-medium text-xs md:text-sm">Instagram</span>
                </button>
                <button className="flex flex-col items-center justify-center space-y-2 px-3 md:px-4 py-3 md:py-4 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-all">
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                  <span className="font-medium text-xs md:text-sm">Twitter</span>
                </button>
              </div>

              <div className="space-y-2 md:space-y-3">
                <button
                  onClick={handlePlayAgain}
                  className="w-full px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-sm md:text-base hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
                >
                  Try Again
                </button>
                
                {(onBackToTemplates || onUseTemplate) && (
                  <>
                    <div className="flex items-center space-x-2 md:space-x-3">
                      {onBackToTemplates && (
                        <button
                          onClick={onBackToTemplates}
                          className="flex-1 px-4 py-2.5 md:py-3 border border-gray-300 text-gray-700 rounded-xl font-medium text-sm md:text-base hover:bg-gray-50 transition-colors duration-200"
                        >
                          Back to Templates
                        </button>
                      )}
                      {onUseTemplate && (
                        <button
                          onClick={onUseTemplate}
                          className="flex-1 px-4 py-2.5 md:py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl font-semibold text-sm md:text-base hover:bg-indigo-50 transition-all duration-200"
                        >
                          Use This Template
                        </button>
                      )}
                    </div>
                  </>
                )}
                
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 italic text-center">
                    This is a demo. No data is saved.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
