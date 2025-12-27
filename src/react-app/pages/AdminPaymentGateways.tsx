import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import { Loader2, Eye, EyeOff, Save, CreditCard, Key, Shield } from "lucide-react";

const GATEWAYS = [
  {
    name: "stripe",
    displayName: "Stripe",
    icon: "💳",
    description: "Accept payments via credit cards, Apple Pay, and Google Pay",
    fields: [
      { key: "api_key", label: "Publishable Key", type: "text" as const },
      { key: "api_secret", label: "Secret Key", type: "password" as const },
      { key: "webhook_secret", label: "Webhook Secret", type: "password" as const },
    ],
  },
  {
    name: "paystack",
    displayName: "Paystack",
    icon: "🇳🇬",
    description: "Accept payments across Africa with local payment methods",
    fields: [
      { key: "api_key", label: "Public Key", type: "text" as const },
      { key: "api_secret", label: "Secret Key", type: "password" as const },
    ],
  },
  {
    name: "paypal",
    displayName: "PayPal",
    icon: "💰",
    description: "Accept payments via PayPal accounts and credit/debit cards",
    fields: [
      { key: "api_key", label: "Client ID", type: "text" as const },
      { key: "api_secret", label: "Secret Key", type: "password" as const },
      { key: "webhook_secret", label: "Webhook ID (Optional)", type: "password" as const },
    ],
  },
];

export default function AdminPaymentGateways() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<string>("stripe");
  const [isSandbox, setIsSandbox] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<{
    api_key: string;
    api_secret: string;
    webhook_secret: string;
    is_active: boolean;
  }>({
    api_key: "",
    api_secret: "",
    webhook_secret: "",
    is_active: true,
  });

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

  useEffect(() => {
    if (user && !loading) {
      fetchGatewaySettings();
    }
  }, [user, selectedGateway, isSandbox, loading]);

  const checkAdminAccess = async () => {
    try {
      const res = await fetch("/api/users/me");
      const data = await res.json();
      
      if (data.appUser?.is_admin !== 1) {
        setError("You do not have admin access to this page.");
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to check admin access:", error);
      setError("Failed to verify admin access");
      setLoading(false);
    }
  };

  const fetchGatewaySettings = async () => {
    try {
      const res = await fetch(
        `/api/admin/payment-gateways/${selectedGateway}?sandbox=${isSandbox}`
      );
      
      if (res.ok) {
        const data = await res.json();
        if (data.gateway) {
          setFormData({
            api_key: data.gateway.api_key || "",
            api_secret: data.gateway.api_secret || "",
            webhook_secret: data.gateway.webhook_secret || "",
            is_active: data.gateway.is_active,
          });
        } else {
          setFormData({
            api_key: "",
            api_secret: "",
            webhook_secret: "",
            is_active: true,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch gateway settings:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/payment-gateways/${selectedGateway}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          is_sandbox: isSandbox,
        }),
      });

      if (res.ok) {
        alert("Payment gateway settings saved successfully");
      } else {
        alert("Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save gateway settings:", error);
      alert("An error occurred while saving settings");
    } finally {
      setSaving(false);
    }
  };

  const toggleKeyVisibility = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const currentGateway = GATEWAYS.find(g => g.name === selectedGateway);

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
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
            >
              Back to Admin Dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <CreditCard className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payment Gateway Settings</h1>
              <p className="text-gray-600 mt-1">Configure payment processor API keys and settings</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/admin")}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Back to Admin
          </button>
        </div>

        {/* Gateway Selection */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Select Payment Gateway</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {GATEWAYS.map((gateway) => (
              <button
                key={gateway.name}
                onClick={() => setSelectedGateway(gateway.name)}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  selectedGateway === gateway.name
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-3xl">{gateway.icon}</span>
                  <h3 className="text-lg font-bold text-gray-900">{gateway.displayName}</h3>
                </div>
                <p className="text-sm text-gray-600">{gateway.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Environment Toggle */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Environment Mode</h2>
              <p className="text-gray-600 text-sm">
                Switch between sandbox (test) and live (production) API keys
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsSandbox(true)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  isSandbox
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>Sandbox</span>
                </div>
              </button>
              <button
                onClick={() => setIsSandbox(false)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  !isSandbox
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4" />
                  <span>Live</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* API Keys Form */}
        {currentGateway && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {currentGateway.displayName} {isSandbox ? "Sandbox" : "Live"} Keys
                </h2>
                <p className="text-gray-600 text-sm">
                  Enter your API credentials to enable payment processing
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
            </div>

            <div className="space-y-4">
              {currentGateway.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys[field.key] ? "text" : field.type}
                      value={(formData as any)[field.key]}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.key]: e.target.value })
                      }
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {field.type === "password" && (
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility(field.key)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
                      >
                        {showKeys[field.key] ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <p className="mb-1">
                  ⚠️ These keys will override environment variables in the application
                </p>
                <p>Make sure to test in sandbox mode before going live</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Documentation */}
        <div className="bg-blue-50 rounded-2xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions</h3>
          <div className="space-y-2 text-blue-800 text-sm">
            <p>1. Create an account with your chosen payment gateway</p>
            <p>2. Navigate to the API settings in your gateway dashboard</p>
            <p>3. Generate and copy your API keys (start with sandbox keys for testing)</p>
            <p>4. Paste the keys in the form above and save</p>
            <p>5. Test your integration thoroughly before switching to live mode</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
