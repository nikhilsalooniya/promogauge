import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Loader2, Building2, Briefcase, MapPin, Phone, Sparkles, AlertCircle } from "lucide-react";
import { countries, validatePhoneNumber, formatPhoneWithCountryCode } from "@/react-app/utils/countries";

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    business_name: "",
    industry: "",
    country: "",
    phone: "",
  });
  const [isIndividual, setIsIndividual] = useState(false);
  const [phoneError, setPhoneError] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      checkProfileStatus();
    }
    fetchLogo();
  }, [user]);

  const fetchLogo = async () => {
    try {
      const res = await fetch("/api/homepage-config");
      if (res.ok) {
        const data = await res.json();
        setLogoUrl(data.config?.header?.logo_url || null);
      }
    } catch (error) {
      console.error("Failed to fetch logo:", error);
    }
  };

  const checkProfileStatus = async () => {
    try {
      const res = await fetch("/api/users/me");
      const data = await res.json();
      
      // If profile is already completed, redirect to dashboard
      if (data.appUser?.profile_completed) {
        navigate("/dashboard");
        return;
      }

      // Pre-fill name from Google
      const businessName = data.appUser?.business_name || "";
      setIsIndividual(businessName === "Individual");
      setFormData(prev => ({
        ...prev,
        full_name: user?.google_user_data?.name || "",
        business_name: businessName === "Individual" ? "" : businessName,
        industry: data.appUser?.industry || "",
        country: data.appUser?.country || "",
        phone: data.appUser?.phone || "",
      }));
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    setFormData({ ...formData, phone: value });
    
    if (value && formData.country) {
      const validation = validatePhoneNumber(value, formData.country);
      setPhoneError(validation.message || "");
    } else {
      setPhoneError("");
    }
  };

  const handleCountryChange = (value: string) => {
    setFormData({ ...formData, country: value });
    
    // Re-validate phone if exists
    if (formData.phone) {
      const validation = validatePhoneNumber(formData.phone, value);
      setPhoneError(validation.message || "");
    }
    
    // Note: Currency will be auto-set on the backend based on country selection
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const businessNameValue = isIndividual ? formData.full_name : formData.business_name;
    
    if (!businessNameValue || !formData.industry || !formData.country) {
      alert("Please fill in all required fields");
      return;
    }

    // Validate phone before submission
    if (formData.phone) {
      const validation = validatePhoneNumber(formData.phone, formData.country);
      if (!validation.isValid) {
        setPhoneError(validation.message || "Invalid phone number");
        return;
      }
    }

    setSaving(true);
    try {
      const phoneToSave = formData.phone ? formatPhoneWithCountryCode(formData.phone, formData.country) : "";
      
      await fetch("/api/users/profile-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          business_name: businessNameValue,
          phone: phoneToSave,
        }),
      });
      
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to save profile:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleIndividualToggle = (checked: boolean) => {
    setIsIndividual(checked);
    if (checked) {
      setFormData({ ...formData, business_name: "" });
    }
  };

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 md:p-12">
        {/* Header */}
        <div className="text-center mb-8">
          {logoUrl ? (
            <div className="flex justify-center mb-4">
              <img src={logoUrl} alt="Logo" className="h-12 w-auto max-w-[200px] object-contain" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-9 h-9 text-white" />
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600">Tell us a bit about yourself to get started</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Building2 className="w-4 h-4" />
              <span>Full Name <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              required
            />
          </div>

          {/* Business/Organization Name */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Building2 className="w-4 h-4" />
                <span>Business / Organization Name <span className="text-red-500">*</span></span>
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
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              placeholder={isIndividual ? "Individual" : "Enter your business or organization name"}
              disabled={isIndividual}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:bg-gray-100 disabled:text-gray-500"
              required={!isIndividual}
            />
          </div>

          {/* Industry */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Briefcase className="w-4 h-4" />
              <span>Industry <span className="text-red-500">*</span></span>
            </label>
            <select
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              required
            >
              <option value="">Select your industry</option>
              <option value="advertising_marketing">Advertising & Marketing</option>
              <option value="education">Education</option>
              <option value="media_communications">Media & Communications</option>
              <option value="ngo">NGO / Charity</option>
              <option value="creator">Personal Creator</option>
              <option value="real_estate">Real Estate</option>
              <option value="restaurant">Restaurant</option>
              <option value="retail">Retail</option>
              <option value="salon">Salon / Beauty</option>
              <option value="sports_leisure">Sports & Leisure</option>
              <option value="technology">Technology</option>
              <option value="tours_travel">Tours & Travel</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Country */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4" />
              <span>Country <span className="text-red-500">*</span></span>
            </label>
            <select
              value={formData.country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              required
            >
              <option value="">Select your country</option>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          {/* Phone Number */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4" />
              <span>Phone Number</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder={formData.country ? `${countries.find(c => c.code === formData.country)?.dialCode || ""} 123 456 7890` : "+1 234 567 8900"}
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
                {formData.country 
                  ? `Optional - Will be saved with ${countries.find(c => c.code === formData.country)?.dialCode || ""} country code`
                  : "Optional - Select country first for auto country code"}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-indigo-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save & Continue</span>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-500 mt-6">
          You can update these details anytime from your profile settings
        </p>
      </div>
    </div>
  );
}
