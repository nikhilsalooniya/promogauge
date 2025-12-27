import { useState, useEffect } from "react";
import { useAuth } from "@getmocha/users-service/react";
import { Sparkles, Check, Loader2 } from "lucide-react";

interface HomepageConfig {
  header: {
    logo_url: string | null;
  };
  signup_page?: {
    headline: string;
    benefits: Array<{ icon: string; text: string }>;
    tagline: string;
    form_heading: string;
    form_subheading: string;
    terms_conditions: string | null;
    privacy_policy: string | null;
  };
}

export default function Signup() {
  const { redirectToLogin, isPending } = useAuth();
  const [agreed, setAgreed] = useState(true);
  const [config, setConfig] = useState<HomepageConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/homepage-config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch (error) {
      console.error("Failed to fetch homepage config:", error);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleGoogleSignup = () => {
    if (!agreed) {
      alert("Please agree to the Terms & Conditions to continue");
      return;
    }
    redirectToLogin();
  };

  if (isPending || loadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Get signup page config or use defaults
  const signupConfig = config?.signup_page || {
    headline: "Create Engaging\nCampaigns in Minutes",
    benefits: [
      { icon: "⚡", text: "Build Spin-the-Wheel campaigns fast" },
      { icon: "👥", text: "Publish via link, QR, WhatsApp" },
      { icon: "📊", text: "Track spins & leads easily" },
      { icon: "✓", text: "Use templates — no design skills needed" }
    ],
    tagline: "Trusted by SMEs, creators, schools & organizations.",
    form_heading: "Create Your Account",
    form_subheading: "Get started with your free account today",
    terms_conditions: null,
    privacy_policy: null
  };

  // Split headline by \n for multi-line display - handle both \n and \\n formats
  const headline = signupConfig?.headline || "Create Engaging\nCampaigns in Minutes";
  const headlineLines = headline.includes('\\n') 
    ? headline.split('\\n') 
    : headline.split('\n');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex">
      {/* Left Side - Marketing Content */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 to-purple-600 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          {/* Headline */}
          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
            {headlineLines.map((line, idx) => (
              <span key={idx}>
                {line}
                {idx < headlineLines.length - 1 && <br />}
              </span>
            ))}
          </h1>

          {/* Benefits */}
          <div className="space-y-4 mb-12">
            {signupConfig.benefits.map((benefit, idx) => (
              <BenefitItem
                key={idx}
                icon={<span className="text-xl">{benefit.icon}</span>}
                text={benefit.text}
              />
            ))}
          </div>

          {/* Tagline */}
          <p className="text-indigo-100 text-lg">
            {signupConfig.tagline}
          </p>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <a href="/home" className="flex items-center justify-center space-x-2 mb-8 hover:opacity-80 transition-opacity cursor-pointer">
            {config?.header.logo_url ? (
              <img src={config.header.logo_url} alt="Logo" className="h-10 w-auto" />
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
          </a>

          {/* Form Header */}
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              {signupConfig.form_heading}
            </h2>
            <p className="text-gray-600">{signupConfig.form_subheading}</p>
          </div>

          {/* Google Signup */}
          <button
            onClick={handleGoogleSignup}
            className="w-full px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center space-x-3 mb-6 shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Terms & Conditions */}
          <div className="mb-6">
            <label className="flex items-start space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                I agree to the{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 font-medium hover:text-indigo-700 underline"
                >
                  Terms & Conditions
                </a>
                {" and "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 font-medium hover:text-indigo-700 underline"
                >
                  Privacy Policy
                </a>
              </span>
            </label>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <a
              href="/signin"
              className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
            >
              Sign In
            </a>
          </p>

          {/* Mobile Benefits */}
          <div className="lg:hidden mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">What you'll get:</p>
            <div className="space-y-3">
              <MobileBenefitItem text="Build campaigns in minutes" />
              <MobileBenefitItem text="Track performance analytics" />
              <MobileBenefitItem text="Share via QR & WhatsApp" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BenefitItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center space-x-3 text-white">
      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <p className="text-lg font-medium">{text}</p>
    </div>
  );
}

function MobileBenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-center space-x-2">
      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
      <p className="text-sm text-gray-600">{text}</p>
    </div>
  );
}
