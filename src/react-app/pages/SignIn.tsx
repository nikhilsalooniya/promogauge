import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Sparkles, Loader2 } from "lucide-react";
import SignInModal from "@/react-app/components/SignInModal";

interface HomepageConfig {
  order: string[];
  header: {
    visible: boolean;
    logo_url: string | null;
    menu_links: Array<{ label: string; url: string }>;
  };
  hero: {
    visible: boolean;
    title: string;
    subtitle: string;
    image_url: string;
    cta_buttons: Array<{ label: string; url: string }>;
  };
  how_it_works: {
    visible: boolean;
    steps: Array<{ title: string; description: string }>;
    illustration_url: string;
    video_url: string;
  };
  benefits: {
    visible: boolean;
    items: Array<{ title: string; description: string; image_url: string }>;
  };
  use_cases: {
    visible: boolean;
    items: Array<{ title: string; icon: string }>;
  };
  cta: {
    visible: boolean;
    title: string;
    subtitle: string;
    button: { label: string; url: string };
  };
  footer: {
    visible: boolean;
    columns: Array<{
      title: string;
      links?: Array<{ label: string; url: string }>;
      social_links?: Array<{ icon: string; label: string; url: string }>;
    }>;
    copyright: string;
  };
}

export default function SignIn() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const [config, setConfig] = useState<HomepageConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
      return;
    }
    fetchConfig();
  }, [user, navigate]);

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
      setLoading(false);
    }
  };

  const handleClose = () => {
    navigate("/home");
  };

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Unable to load configuration</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Blurred background content */}
      <div className="blur-sm pointer-events-none select-none">
        {/* Header */}
        {config.header.visible && (
          <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {config.header.logo_url ? (
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
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Hero section */}
        {config.hero.visible && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-12 md:pb-16">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
              <div className="flex-1 text-center md:text-left space-y-6">
                <h1 
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-gray-900"
                  dangerouslySetInnerHTML={{ __html: config.hero.title }}
                />
                <p className="text-lg md:text-xl text-gray-600 max-w-xl mx-auto md:mx-0 leading-relaxed">
                  {config.hero.subtitle}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Sign In Modal */}
      <SignInModal isOpen={true} onClose={handleClose} />
    </div>
  );
}
