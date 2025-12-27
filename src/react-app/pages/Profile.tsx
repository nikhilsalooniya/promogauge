import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import { Loader2, Save, User as UserIcon, Building2, MapPin, DollarSign, Phone, AlertCircle } from "lucide-react";
import { countries, validatePhoneNumber, formatPhoneWithCountryCode } from "@/react-app/utils/countries";

export default function Profile() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const [appUser, setAppUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isIndividual, setIsIndividual] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string>("");

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/users/me");
      const data = await res.json();
      setAppUser(data.appUser);
      const businessNameValue = data.appUser.business_name || "";
      setIsIndividual(businessNameValue === "Individual");
      setBusinessName(businessNameValue === "Individual" ? "" : businessNameValue);
      setCountry(data.appUser.country || "");
      setCurrency(data.appUser.currency || "USD");
      setPhone(data.appUser.phone || "");
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    
    if (value && country) {
      const validation = validatePhoneNumber(value, country);
      setPhoneError(validation.message || "");
    } else {
      setPhoneError("");
    }
  };

  const handleCountryChange = (value: string) => {
    setCountry(value);
    
    // Auto-update currency based on country: Kenya → KES, others → USD
    const newCurrency = value === 'KE' ? 'KES' : 'USD';
    setCurrency(newCurrency);
    
    // Re-validate phone if exists
    if (phone) {
      const validation = validatePhoneNumber(phone, value);
      setPhoneError(validation.message || "");
    }
  };

  const handleSave = async () => {
    // Validate phone before saving
    if (phone) {
      const validation = validatePhoneNumber(phone, country);
      if (!validation.isValid) {
        setPhoneError(validation.message || "Invalid phone number");
        return;
      }
    }

    setSaving(true);
    try {
      const phoneToSave = phone ? formatPhoneWithCountryCode(phone, country) : "";
      
      await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: isIndividual ? "Individual" : businessName,
          country,
          currency,
          phone: phoneToSave,
        }),
      });
      await fetchUserData();
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleIndividualToggle = (checked: boolean) => {
    setIsIndividual(checked);
    if (checked) {
      setBusinessName("");
    }
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

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-600 mt-1">Manage your account information</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>

        {/* Account Information */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Account Information</h2>
          <div className="space-y-6">
            <div className="flex items-start space-x-4 pb-6 border-b border-gray-100">
              {user?.google_user_data.picture ? (
                <img
                  src={user.google_user_data.picture}
                  alt="Profile"
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-white" />
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900 text-lg">{user?.google_user_data.name}</p>
                <p className="text-gray-600">{user?.email}</p>
                <p className="text-sm text-gray-500 mt-1">Signed in with Google</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <Building2 className="w-4 h-4" />
                  <span>Business / Organization Name</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isIndividual}
                    onChange={(e) => handleIndividualToggle(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Individual</span>
                </label>
              </div>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={isIndividual ? "Individual" : "Enter your business name"}
                disabled={isIndividual}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>Country</span>
                </label>
                <select
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select your country</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Preferred Currency</span>
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="KES">KES (KSh)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4" />
                <span>Phone Number</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder={country ? `${countries.find(c => c.code === country)?.dialCode || ""} 123 456 7890` : "+1 234 567 8900"}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  phoneError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
                }`}
              />
              {phoneError ? (
                <p className="text-xs text-red-600 mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{phoneError}</span>
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  {country 
                    ? `Will be saved with ${countries.find(c => c.code === country)?.dialCode || ""} country code`
                    : "Select country first for auto country code"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Plan Information */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Subscription & Credits</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <p className="text-lg font-semibold text-gray-900 capitalize">{appUser?.plan_type || "Free"} Subscription</p>
                <p className="text-sm text-gray-600">
                  {appUser?.plan_type === "free" ? "No recurring subscription" : "Active subscription"}
                </p>
                {appUser?.subscription_status && (
                  <p className="text-xs text-gray-500 mt-1">
                    Status: <span className="capitalize">{appUser.subscription_status}</span>
                  </p>
                )}
                {appUser?.plan_type === "free" && (appUser?.campaign_credits > 0 || appUser?.lead_credits > 0) && (
                  <p className="text-xs text-indigo-600 mt-1 font-medium">
                    + Credits purchased separately
                  </p>
                )}
              </div>
              <button 
                onClick={() => navigate("/pricing")}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
              >
                {appUser?.plan_type === "free" ? "Upgrade Plan" : "Manage Plan"}
              </button>
            </div>
            
            {/* Credits Display */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4">
                <p className="text-sm text-indigo-600 font-medium mb-1">Campaign Credits</p>
                <p className="text-2xl font-bold text-indigo-900">{appUser?.campaign_credits || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                <p className="text-sm text-purple-600 font-medium mb-1">Lead Credits</p>
                <p className="text-2xl font-bold text-purple-900">{appUser?.lead_credits || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
