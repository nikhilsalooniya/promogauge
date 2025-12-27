import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import { 
  Loader2, Save, Eye, Menu, ChevronDown, ChevronUp, Plus, X, 
  EyeOff, GripVertical, Settings, Layout, Upload
} from "lucide-react";

interface HomepageConfig {
  order: string[];
  header: any;
  hero: any;
  how_it_works: any;
  benefits: any;
  use_cases: any;
  cta: any;
  footer: any;
  signup_page?: any;
  show_use_cases_menu?: boolean;
  show_how_it_works_menu?: boolean;
}

export default function AdminHomepageBuilder() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const [config, setConfig] = useState<HomepageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"homepage" | "signup">("homepage");

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchConfig();
    }
  }, [user]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/homepage-config", {
        credentials: "include",
      });
      
      if (res.status === 403) {
        setError("You do not have admin access to this page.");
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      } else {
        setError("Failed to load homepage configuration");
      }
    } catch (error) {
      console.error("Failed to fetch homepage config:", error);
      setError("An error occurred while loading homepage configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const res = await fetch("/api/admin/homepage-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ config }),
      });

      if (res.ok) {
        alert("Homepage configuration saved successfully!");
      } else {
        alert("Failed to save homepage configuration");
      }
    } catch (error) {
      console.error("Failed to save config:", error);
      alert("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (section: string, updates: any) => {
    if (!config) return;
    setConfig({
      ...config,
      [section]: { ...config[section as keyof HomepageConfig], ...updates },
    });
  };

  const toggleSectionVisibility = (section: string) => {
    if (!config) return;
    const sectionData = config[section as keyof HomepageConfig];
    updateSection(section, { visible: !sectionData.visible });
  };

  const moveSection = (section: string, direction: "up" | "down") => {
    if (!config) return;
    const currentIndex = config.order.indexOf(section);
    if (currentIndex === -1) return;
    
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= config.order.length) return;

    const newOrder = [...config.order];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
    setConfig({ ...config, order: newOrder });
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

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate("/admin")}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Back to Admin Dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!config) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">No configuration found</p>
        </div>
      </DashboardLayout>
    );
  }

  const sectionNames: Record<string, string> = {
    header: "Header",
    hero: "Hero Section",
    campaign_types: "Campaign Types",
    how_it_works: "How It Works",
    benefits: "Benefits",
    use_cases: "Use Cases",
    cta: "Call to Action",
    footer: "Footer",
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Layout className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Page Builder</h1>
              <p className="text-gray-600">Customize your homepage and signup page</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center space-x-2"
            >
              {previewMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              <span>{previewMode ? "Hide Preview" : "Show Preview"}</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>{saving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("homepage")}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "homepage"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Homepage Sections
            </button>
            <button
              onClick={() => setActiveTab("signup")}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "signup"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Signup Page
            </button>
          </div>
        </div>

        {/* Menu Visibility Settings */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Navigation Menu Settings</h2>
          <p className="text-sm text-gray-600 mb-4">Control which menu items appear in the navigation bar</p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-semibold text-gray-900">Show "Use Cases" in Menu</p>
                <p className="text-sm text-gray-600">Display Use Cases link in navigation</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.show_use_cases_menu ?? false}
                  onChange={(e) => setConfig({ ...config, show_use_cases_menu: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-semibold text-gray-900">Show "How It Works" in Menu</p>
                <p className="text-sm text-gray-600">Display How It Works link in navigation</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.show_how_it_works_menu ?? false}
                  onChange={(e) => setConfig({ ...config, show_how_it_works_menu: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Sections List */}
        {activeTab === "homepage" && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <h2 className="text-xl font-bold text-gray-900">Homepage Sections</h2>
            <p className="text-sm text-gray-600 mt-1">Drag to reorder, click to edit</p>
          </div>

          <div className="divide-y divide-gray-200">
            {config.order.map((section, index) => {
              const sectionData = config[section as keyof HomepageConfig];
              const isExpanded = expandedSection === section;
              
              return (
                <div key={section} className="bg-white hover:bg-gray-50 transition-colors">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                      
                      <button
                        onClick={() => setExpandedSection(isExpanded ? null : section)}
                        className="flex items-center space-x-3 flex-1 text-left"
                      >
                        <Menu className="w-5 h-5 text-gray-600" />
                        <span className="font-semibold text-gray-900">{sectionNames[section]}</span>
                      </button>

                      <button
                        onClick={() => toggleSectionVisibility(section)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          sectionData?.visible
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {sectionData?.visible ? "Visible" : "Hidden"}
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => moveSection(section, "up")}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                      >
                        <ChevronUp className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => moveSection(section, "down")}
                        disabled={index === config.order.length - 1}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setExpandedSection(isExpanded ? null : section)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-6 bg-gray-50 border-t border-gray-200">
                      <SectionEditor
                        section={section}
                        data={sectionData}
                        onUpdate={(updates) => updateSection(section, updates)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Signup Page Editor */}
        {activeTab === "signup" && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <h2 className="text-xl font-bold text-gray-900">Signup Page Customization</h2>
              <p className="text-sm text-gray-600 mt-1">Customize the content and legal documents for your signup page</p>
            </div>

            <div className="p-6">
              <SignupPageEditor
                data={config.signup_page || {
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
                  terms_conditions: "",
                  privacy_policy: ""
                }}
                onUpdate={(updates) => updateSection('signup_page', updates)}
              />
            </div>
          </div>
        )}

        {/* Preview Link */}
        {previewMode && (
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-6 text-center">
            <p className="text-indigo-900 font-semibold mb-3">Preview your changes on the homepage</p>
            <a
              href="/home"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all"
            >
              <Eye className="w-5 h-5" />
              <span>Open Homepage Preview</span>
            </a>
            <p className="text-xs text-indigo-600 mt-3">Save your changes first to see them reflected</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function SectionEditor({ section, data, onUpdate }: { section: string; data: any; onUpdate: (updates: any) => void }) {
  switch (section) {
    case "header":
      return <HeaderEditor data={data} onUpdate={onUpdate} />;
    case "hero":
      return <HeroEditor data={data} onUpdate={onUpdate} />;
    case "campaign_types":
      return <CampaignTypesEditor data={data} onUpdate={onUpdate} />;
    case "how_it_works":
      return <HowItWorksEditor data={data} onUpdate={onUpdate} />;
    case "benefits":
      return <BenefitsEditor data={data} onUpdate={onUpdate} />;
    case "use_cases":
      return <UseCasesEditor data={data} onUpdate={onUpdate} />;
    case "cta":
      return <CTAEditor data={data} onUpdate={onUpdate} />;
    case "footer":
      return <FooterEditor data={data} onUpdate={onUpdate} />;
    default:
      return <div>Unknown section</div>;
  }
}

function HeaderEditor({ data, onUpdate }: { data: any; onUpdate: (updates: any) => void }) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const res = await fetch("/api/admin/homepage-logo/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onUpdate({ logo_url: data.url });
      } else {
        const error = await res.json();
        alert(error.error || "Failed to upload logo");
      }
    } catch (error) {
      console.error("Logo upload error:", error);
      alert("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    onUpdate({ logo_url: null });
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - favicons are typically ico, png, or svg
    const allowedTypes = ["image/x-icon", "image/vnd.microsoft.icon", "image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a favicon file (ICO, PNG, JPG, or SVG)");
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("File size must be less than 2MB");
      return;
    }

    setUploadingFavicon(true);
    try {
      const formData = new FormData();
      formData.append("favicon", file);

      const res = await fetch("/api/admin/homepage-favicon/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onUpdate({ favicon_url: data.url });
        
        // Immediately update the favicon in the browser
        const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.setAttribute('rel', 'shortcut icon');
        link.setAttribute('href', data.url);
        document.head.appendChild(link);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to upload favicon");
      }
    } catch (error) {
      console.error("Favicon upload error:", error);
      alert("Failed to upload favicon");
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleRemoveFavicon = () => {
    onUpdate({ favicon_url: null });
  };

  return (
    <div className="space-y-6">
      {/* Favicon Upload Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Favicon</label>
        <p className="text-xs text-gray-500 mb-3">Upload a custom favicon for your domain. This will replace the default Mocha favicon.</p>
        
        <div className="space-y-3">
          {data.favicon_url && (
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="w-16 h-16 bg-white rounded-lg border border-gray-300 flex items-center justify-center flex-shrink-0 p-2">
                <img 
                  src={data.favicon_url} 
                  alt="Favicon preview" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">Current Favicon</p>
                <p className="text-xs text-gray-500 truncate">{data.favicon_url}</p>
              </div>
              <button
                onClick={handleRemoveFavicon}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                title="Remove favicon"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div>
            <label className="block w-full cursor-pointer">
              <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                {uploadingFavicon ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
                    <span className="text-sm font-medium text-indigo-600">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-600">
                      Upload Favicon
                    </span>
                  </>
                )}
              </div>
              <input
                type="file"
                accept=".ico,.png,.jpg,.jpeg,.svg,image/x-icon,image/png,image/jpeg,image/svg+xml"
                onChange={handleFaviconUpload}
                disabled={uploadingFavicon}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 mt-1">ICO, PNG, JPG, or SVG (max 2MB). Recommended: 32x32px or 64x64px</p>
          </div>

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
            value={data.favicon_url || ""}
            onChange={(e) => onUpdate({ favicon_url: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="https://example.com/favicon.ico"
          />
        </div>
      </div>

      {/* Logo Upload Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
        
        {/* Upload Section */}
        <div className="space-y-3">
          {data.logo_url && (
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="w-20 h-20 bg-white rounded-lg border border-gray-300 flex items-center justify-center flex-shrink-0 p-2">
                <img 
                  src={data.logo_url} 
                  alt="Logo preview" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">Current Logo</p>
                <p className="text-xs text-gray-500 truncate">{data.logo_url}</p>
              </div>
              <button
                onClick={handleRemoveLogo}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                title="Remove logo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div>
            <label className="block w-full cursor-pointer">
              <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                {uploadingLogo ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
                    <span className="text-sm font-medium text-indigo-600">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-600">
                      Upload Logo
                    </span>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 mt-1">PNG, JPEG, GIF, WebP, or SVG (max 5MB)</p>
          </div>

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
            value={data.logo_url || ""}
            onChange={(e) => onUpdate({ logo_url: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="https://example.com/logo.png"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Menu Links</label>
        {data.menu_links?.map((link: any, index: number) => (
          <div key={index} className="flex items-center space-x-2 mb-2">
            <input
              type="text"
              value={link.label}
              onChange={(e) => {
                const newLinks = [...data.menu_links];
                newLinks[index].label = e.target.value;
                onUpdate({ menu_links: newLinks });
              }}
              placeholder="Label"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="text"
              value={link.url}
              onChange={(e) => {
                const newLinks = [...data.menu_links];
                newLinks[index].url = e.target.value;
                onUpdate({ menu_links: newLinks });
              }}
              placeholder="URL"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={() => {
                const newLinks = data.menu_links.filter((_: any, i: number) => i !== index);
                onUpdate({ menu_links: newLinks });
              }}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => {
            const newLinks = [...(data.menu_links || []), { label: "New Link", url: "/" }];
            onUpdate({ menu_links: newLinks });
          }}
          className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Link</span>
        </button>
      </div>
    </div>
  );
}

function HeroEditor({ data, onUpdate }: { data: any; onUpdate: (updates: any) => void }) {
  const [uploadingHeroImage, setUploadingHeroImage] = useState(false);

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload an image file (PNG, JPEG, GIF, or WebP)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setUploadingHeroImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/admin/homepage-how-it-works-image/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        const responseData = await res.json();
        onUpdate({ hero_image_url: responseData.url });
      } else {
        const error = await res.json();
        alert(error.error || "Failed to upload image");
      }
    } catch (error) {
      console.error("Hero image upload error:", error);
      alert("Failed to upload image");
    } finally {
      setUploadingHeroImage(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
        <textarea
          value={data.title || ""}
          onChange={(e) => onUpdate({ title: e.target.value })}
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
        <textarea
          value={data.subtitle || ""}
          onChange={(e) => onUpdate({ subtitle: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Hero Image</label>
        <p className="text-xs text-gray-500 mb-3">Static image displayed on the right side of the hero section. Recommended dimensions: 500x600px for optimal display.</p>
        
        <div className="space-y-3">
          {data.hero_image_url && (
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="w-24 h-16 bg-white rounded-lg border border-gray-300 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img 
                  src={data.hero_image_url} 
                  alt="Hero image preview" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Current Hero Image</p>
                <p className="text-xs text-gray-500 truncate">{data.hero_image_url}</p>
                <p className="text-xs text-amber-600 mt-1">💡 For best results, use images at 500x600px</p>
              </div>
              <button
                onClick={() => onUpdate({ hero_image_url: "" })}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div>
            <label className="block w-full cursor-pointer">
              <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                {uploadingHeroImage ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
                    <span className="text-sm font-medium text-indigo-600">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Upload Hero Image</span>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleHeroImageUpload}
                disabled={uploadingHeroImage}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 mt-1">PNG, JPEG, GIF, or WebP (max 10MB)</p>
          </div>

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
            value={data.hero_image_url || ""}
            onChange={(e) => onUpdate({ hero_image_url: e.target.value })}
            placeholder="https://example.com/hero-image.jpg"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">CTA Buttons</label>
        {data.cta_buttons?.map((button: any, index: number) => (
          <div key={index} className="flex items-center space-x-2 mb-2">
            <input
              type="text"
              value={button.label}
              onChange={(e) => {
                const newButtons = [...data.cta_buttons];
                newButtons[index].label = e.target.value;
                onUpdate({ cta_buttons: newButtons });
              }}
              placeholder="Label"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="text"
              value={button.url}
              onChange={(e) => {
                const newButtons = [...data.cta_buttons];
                newButtons[index].url = e.target.value;
                onUpdate({ cta_buttons: newButtons });
              }}
              placeholder="URL"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={() => {
                const newButtons = data.cta_buttons.filter((_: any, i: number) => i !== index);
                onUpdate({ cta_buttons: newButtons });
              }}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignTypesEditor({ data, onUpdate }: { data: any; onUpdate: (updates: any) => void }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/admin/templates", {
        credentials: "include",
      });
      if (res.ok) {
        const responseData = await res.json();
        const scratchTemplates = responseData.templates.filter(
          (t: any) => (t.campaign_type === 'scratchcard' || t.campaignType === 'scratchcard')
        );
        setTemplates(scratchTemplates);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Section Title</label>
        <input
          type="text"
          value={data.title || "Campaign Types"}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Section Subtitle</label>
        <input
          type="text"
          value={data.subtitle || "Choose how you want to engage your audience"}
          onChange={(e) => onUpdate({ subtitle: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Campaign Type Cards</h4>
        
        <div className="space-y-4">
          {/* Spin the Wheel Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-semibold text-gray-900">Spin the Wheel Card</p>
              <p className="text-sm text-gray-600">Show interactive Spin the Wheel demo</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={data.spin_wheel_enabled !== false}
                onChange={(e) => onUpdate({ spin_wheel_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Scratch & Win Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-semibold text-gray-900">Scratch & Win Card</p>
              <p className="text-sm text-gray-600">Show interactive Scratch & Win demo</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={data.scratch_card_enabled !== false}
                onChange={(e) => onUpdate({ scratch_card_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Scratch Template Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scratch Demo Template
            </label>
            <p className="text-xs text-gray-500 mb-2">Select which scratch template to use for the demo</p>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              </div>
            ) : (
              <select
                value={data.scratch_template_id || "christmas-scratch"}
                onChange={(e) => onUpdate({ scratch_template_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
                {templates.length === 0 && (
                  <option value="christmas-scratch">Christmas Scratch Card (Default)</option>
                )}
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HowItWorksEditor({ data, onUpdate }: { data: any; onUpdate: (updates: any) => void }) {
  const [uploadingIllustration, setUploadingIllustration] = useState(false);

  const handleIllustrationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload an image file (PNG, JPEG, GIF, or WebP)");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setUploadingIllustration(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/admin/homepage-how-it-works-image/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        const responseData = await res.json();
        onUpdate({ illustration_url: responseData.url });
      } else {
        const error = await res.json();
        alert(error.error || "Failed to upload image");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      alert("Failed to upload image");
    } finally {
      setUploadingIllustration(false);
    }
  };

  const handleRemoveIllustration = () => {
    onUpdate({ illustration_url: "" });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Steps</label>
        {data.steps?.map((step: any, index: number) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-700">Step {index + 1}</span>
              <button
                onClick={() => {
                  const newSteps = data.steps.filter((_: any, i: number) => i !== index);
                  onUpdate({ steps: newSteps });
                }}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={step.title}
              onChange={(e) => {
                const newSteps = [...data.steps];
                newSteps[index].title = e.target.value;
                onUpdate({ steps: newSteps });
              }}
              placeholder="Title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
            />
            <textarea
              value={step.description}
              onChange={(e) => {
                const newSteps = [...data.steps];
                newSteps[index].description = e.target.value;
                onUpdate({ steps: newSteps });
              }}
              placeholder="Description"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        ))}
        <button
          onClick={() => {
            const newSteps = [...(data.steps || []), { title: "New Step", description: "Step description", image_url: "" }];
            onUpdate({ steps: newSteps });
          }}
          className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Step</span>
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Illustration URL</label>
        
        {/* Image Upload Section */}
        <div className="space-y-3">
          {data.illustration_url && (
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="w-24 h-16 bg-white rounded-lg border border-gray-300 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img 
                  src={data.illustration_url} 
                  alt="Illustration preview" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Current Illustration</p>
                <p className="text-xs text-gray-500 truncate">{data.illustration_url}</p>
                <p className="text-xs text-gray-400 mt-1">Recommended: 600x400px for uniform display</p>
              </div>
              <button
                onClick={handleRemoveIllustration}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                title="Remove illustration"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div>
            <label className="block w-full cursor-pointer">
              <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                {uploadingIllustration ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
                    <span className="text-sm font-medium text-indigo-600">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-600">
                      Upload Illustration
                    </span>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleIllustrationUpload}
                disabled={uploadingIllustration}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 mt-1">PNG, JPEG, GIF, or WebP (max 10MB). Recommended size: 600x400px</p>
          </div>

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
            value={data.illustration_url || ""}
            onChange={(e) => onUpdate({ illustration_url: e.target.value })}
            placeholder="https://example.com/image.jpg (600x400px recommended)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Video URL (YouTube)</label>
        <input
          type="text"
          value={data.video_url || ""}
          onChange={(e) => onUpdate({ video_url: e.target.value })}
          placeholder="YouTube URL or embed code (e.g., https://www.youtube.com/watch?v=... or full iframe embed)"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-1">
          Accepts YouTube watch URLs, embed URLs, or full iframe embed code. Video takes precedence over illustration when both are set.
        </p>
      </div>
    </div>
  );
}

function BenefitsEditor({ data, onUpdate }: { data: any; onUpdate: (updates: any) => void }) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload an image file (PNG, JPEG, GIF, or WebP)");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setUploadingIndex(index);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/admin/homepage-benefit-image/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        const responseData = await res.json();
        const newItems = [...data.items];
        newItems[index].image_url = responseData.url;
        onUpdate({ items: newItems });
      } else {
        const error = await res.json();
        alert(error.error || "Failed to upload image");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      alert("Failed to upload image");
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newItems = [...data.items];
    newItems[index].image_url = "";
    onUpdate({ items: newItems });
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">Benefits</label>
      {data.items?.map((item: any, index: number) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-700">Benefit {index + 1}</span>
            <button
              onClick={() => {
                const newItems = data.items.filter((_: any, i: number) => i !== index);
                onUpdate({ items: newItems });
              }}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={item.title}
            onChange={(e) => {
              const newItems = [...data.items];
              newItems[index].title = e.target.value;
              onUpdate({ items: newItems });
            }}
            placeholder="Title"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
          />
          <textarea
            value={item.description}
            onChange={(e) => {
              const newItems = [...data.items];
              newItems[index].description = e.target.value;
              onUpdate({ items: newItems });
            }}
            placeholder="Description"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
          />

          {/* Image Upload Section */}
          <div className="space-y-3">
            <label className="block text-xs font-medium text-gray-600">Benefit Image</label>
            
            {item.image_url && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="w-24 h-16 bg-white rounded-lg border border-gray-300 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img 
                    src={item.image_url} 
                    alt="Benefit preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Current Image</p>
                  <p className="text-xs text-gray-500 truncate">{item.image_url}</p>
                  <p className="text-xs text-gray-400 mt-1">Recommended: 600x400px for uniform display</p>
                </div>
                <button
                  onClick={() => handleRemoveImage(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div>
              <label className="block w-full cursor-pointer">
                <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                  {uploadingIndex === index ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
                      <span className="text-sm font-medium text-indigo-600">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-600">
                        Upload Image
                      </span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, index)}
                  disabled={uploadingIndex === index}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">PNG, JPEG, GIF, or WebP (max 10MB). Recommended size: 600x400px</p>
            </div>

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
              value={item.image_url || ""}
              onChange={(e) => {
                const newItems = [...data.items];
                newItems[index].image_url = e.target.value;
                onUpdate({ items: newItems });
              }}
              placeholder="https://example.com/image.jpg (600x400px recommended)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      ))}
      <button
        onClick={() => {
          const newItems = [...(data.items || []), { title: "New Benefit", description: "Description", image_url: "" }];
          onUpdate({ items: newItems });
        }}
        className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200 flex items-center space-x-2"
      >
        <Plus className="w-4 h-4" />
        <span>Add Benefit</span>
      </button>
    </div>
  );
}

function UseCasesEditor({ data, onUpdate }: { data: any; onUpdate: (updates: any) => void }) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">Use Cases</label>
      {data.items?.map((item: any, index: number) => (
        <div key={index} className="flex items-center space-x-2 mb-2">
          <input
            type="text"
            value={item.title}
            onChange={(e) => {
              const newItems = [...data.items];
              newItems[index].title = e.target.value;
              onUpdate({ items: newItems });
            }}
            placeholder="Title"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            value={item.icon}
            onChange={(e) => {
              const newItems = [...data.items];
              newItems[index].icon = e.target.value;
              onUpdate({ items: newItems });
            }}
            placeholder="Icon name"
            className="w-40 px-3 py-2 border border-gray-300 rounded-lg"
          />
          <button
            onClick={() => {
              const newItems = data.items.filter((_: any, i: number) => i !== index);
              onUpdate({ items: newItems });
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ))}
      <button
        onClick={() => {
          const newItems = [...(data.items || []), { title: "New Use Case", icon: "briefcase" }];
          onUpdate({ items: newItems });
        }}
        className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200 flex items-center space-x-2"
      >
        <Plus className="w-4 h-4" />
        <span>Add Use Case</span>
      </button>
    </div>
  );
}

function CTAEditor({ data, onUpdate }: { data: any; onUpdate: (updates: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
        <input
          type="text"
          value={data.title || ""}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
        <textarea
          value={data.subtitle || ""}
          onChange={(e) => onUpdate({ subtitle: e.target.value })}
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Button</label>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={data.button?.label || ""}
            onChange={(e) => onUpdate({ button: { ...data.button, label: e.target.value } })}
            placeholder="Button Label"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            value={data.button?.url || ""}
            onChange={(e) => onUpdate({ button: { ...data.button, url: e.target.value } })}
            placeholder="Button URL"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}

function SignupPageEditor({ data, onUpdate }: { data: any; onUpdate: (updates: any) => void }) {
  return (
    <div className="space-y-6">
      {/* Left Side Content */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Left Side Content</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Headline
            </label>
            <textarea
              value={data.headline || ""}
              onChange={(e) => onUpdate({ headline: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Create Engaging\nCampaigns in Minutes"
            />
            <p className="text-xs text-gray-500 mt-1">Use \n for line breaks</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Benefits List
            </label>
            {data.benefits?.map((benefit: any, index: number) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={benefit.icon}
                  onChange={(e) => {
                    const newBenefits = [...data.benefits];
                    newBenefits[index].icon = e.target.value;
                    onUpdate({ benefits: newBenefits });
                  }}
                  placeholder="Icon/Emoji"
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={benefit.text}
                  onChange={(e) => {
                    const newBenefits = [...data.benefits];
                    newBenefits[index].text = e.target.value;
                    onUpdate({ benefits: newBenefits });
                  }}
                  placeholder="Benefit text"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={() => {
                    const newBenefits = data.benefits.filter((_: any, i: number) => i !== index);
                    onUpdate({ benefits: newBenefits });
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newBenefits = [...(data.benefits || []), { icon: "✓", text: "New benefit" }];
                onUpdate({ benefits: newBenefits });
              }}
              className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Benefit</span>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tagline
            </label>
            <input
              type="text"
              value={data.tagline || ""}
              onChange={(e) => onUpdate({ tagline: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Trusted by SMEs, creators, schools & organizations."
            />
          </div>
        </div>
      </div>

      {/* Right Side Form Content */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Form Section</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Form Heading
            </label>
            <input
              type="text"
              value={data.form_heading || ""}
              onChange={(e) => onUpdate({ form_heading: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Create Your Account"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Form Subheading
            </label>
            <input
              type="text"
              value={data.form_subheading || ""}
              onChange={(e) => onUpdate({ form_subheading: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Get started with your free account today"
            />
          </div>
        </div>
      </div>

      {/* Legal Documents */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Legal Documents</h3>
        <p className="text-sm text-gray-600 mb-4">Add links to your Terms & Conditions and Privacy Policy pages.</p>
        
        <div className="space-y-4">
          {/* Terms & Conditions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Terms & Conditions Link
            </label>
            <input
              type="text"
              value={data.terms_conditions || "/terms"}
              onChange={(e) => onUpdate({ terms_conditions: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="/terms"
            />
            <p className="text-xs text-gray-500 mt-1">URL to your Terms & Conditions page</p>
          </div>

          {/* Privacy Policy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Privacy Policy Link
            </label>
            <input
              type="text"
              value={data.privacy_policy || "/privacy"}
              onChange={(e) => onUpdate({ privacy_policy: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="/privacy"
            />
            <p className="text-xs text-gray-500 mt-1">URL to your Privacy Policy page</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FooterEditor({ data, onUpdate }: { data: any; onUpdate: (updates: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Footer Columns</label>
        {data.columns?.map((column: any, colIndex: number) => (
          <div key={colIndex} className="border border-gray-200 rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <input
                type="text"
                value={column.title}
                onChange={(e) => {
                  const newColumns = [...data.columns];
                  newColumns[colIndex].title = e.target.value;
                  onUpdate({ columns: newColumns });
                }}
                placeholder="Column Title"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg mr-2 font-semibold"
              />
              <button
                onClick={() => {
                  const newColumns = data.columns.filter((_: any, i: number) => i !== colIndex);
                  onUpdate({ columns: newColumns });
                }}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {column.links?.map((link: any, linkIndex: number) => (
              <div key={linkIndex} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => {
                    const newColumns = [...data.columns];
                    newColumns[colIndex].links[linkIndex].label = e.target.value;
                    onUpdate({ columns: newColumns });
                  }}
                  placeholder="Label"
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="text"
                  value={link.url}
                  onChange={(e) => {
                    const newColumns = [...data.columns];
                    newColumns[colIndex].links[linkIndex].url = e.target.value;
                    onUpdate({ columns: newColumns });
                  }}
                  placeholder="URL"
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            ))}

            {column.social_links?.map((link: any, linkIndex: number) => (
              <div key={linkIndex} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={link.icon}
                  onChange={(e) => {
                    const newColumns = [...data.columns];
                    newColumns[colIndex].social_links[linkIndex].icon = e.target.value;
                    onUpdate({ columns: newColumns });
                  }}
                  placeholder="Icon"
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => {
                    const newColumns = [...data.columns];
                    newColumns[colIndex].social_links[linkIndex].label = e.target.value;
                    onUpdate({ columns: newColumns });
                  }}
                  placeholder="Label"
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="text"
                  value={link.url}
                  onChange={(e) => {
                    const newColumns = [...data.columns];
                    newColumns[colIndex].social_links[linkIndex].url = e.target.value;
                    onUpdate({ columns: newColumns });
                  }}
                  placeholder="URL"
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Copyright Text</label>
        <input
          type="text"
          value={data.copyright || ""}
          onChange={(e) => onUpdate({ copyright: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>
    </div>
  );
}
