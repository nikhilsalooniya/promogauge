import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import { Loader2, Eye, EyeOff, Save, Mail, Shield, Key, FileText } from "lucide-react";

const EMAIL_PROVIDERS = [
  {
    name: "mailgun",
    displayName: "Mailgun",
    icon: "📧",
    description: "Powerful email delivery service with detailed analytics",
    fields: [
      { key: "api_key", label: "API Key", type: "password" as const },
      { key: "api_domain", label: "Domain", type: "text" as const },
      { key: "sender_email", label: "Sender Email", type: "email" as const },
      { key: "sender_name", label: "Sender Name", type: "text" as const },
    ],
  },
];

interface EmailTemplate {
  id: string;
  template_name: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  variables: string | string[];
}

export default function AdminEmailIntegration() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("mailgun");
  const [isSandbox, setIsSandbox] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"integration" | "templates">("integration");
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [installingTemplates, setInstallingTemplates] = useState(false);

  const [formData, setFormData] = useState<{
    api_key: string;
    api_domain: string;
    sender_email: string;
    sender_name: string;
    is_active: boolean;
  }>({
    api_key: "",
    api_domain: "",
    sender_email: "",
    sender_name: "",
    is_active: false,
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
      fetchEmailSettings();
      fetchAllEmailTemplates();
    }
  }, [user, selectedProvider, isSandbox, loading]);

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

  const fetchEmailSettings = async () => {
    try {
      const res = await fetch(
        `/api/admin/email-integration/${selectedProvider}?sandbox=${isSandbox}`
      );
      
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setFormData({
            api_key: data.settings.api_key || "",
            api_domain: data.settings.api_domain || "",
            sender_email: data.settings.sender_email || "",
            sender_name: data.settings.sender_name || "",
            is_active: data.settings.is_active,
          });
        } else {
          setFormData({
            api_key: "",
            api_domain: "",
            sender_email: "",
            sender_name: "",
            is_active: false,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch email settings:", error);
    }
  };

  const fetchAllEmailTemplates = async () => {
    try {
      const res = await fetch("/api/admin/email-templates");
      
      if (res.ok) {
        const data = await res.json();
        setEmailTemplates(data.templates || []);
        if (data.templates && data.templates.length > 0 && !selectedTemplate) {
          setSelectedTemplate(data.templates[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch email templates:", error);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      alert("Please enter a test email address");
      return;
    }

    setTestEmailSending(true);
    try {
      const res = await fetch("/api/admin/send-test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          provider: selectedProvider,
          is_sandbox: isSandbox,
        }),
      });

      if (res.ok) {
        alert("Test email sent successfully! Check your inbox.");
      } else {
        const error = await res.json();
        alert(`Failed to send test email: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to send test email:", error);
      alert("An error occurred while sending test email");
    } finally {
      setTestEmailSending(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/email-integration/${selectedProvider}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          is_sandbox: isSandbox,
        }),
      });

      if (res.ok) {
        alert("Email integration settings saved successfully");
      } else {
        alert("Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save email settings:", error);
      alert("An error occurred while saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateUpdate = async () => {
    if (!selectedTemplate) return;
    
    setTemplateSaving(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${selectedTemplate.template_name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: selectedTemplate.subject,
          html_body: selectedTemplate.html_body,
          text_body: selectedTemplate.text_body,
        }),
      });

      if (res.ok) {
        alert("Email template updated successfully");
        fetchAllEmailTemplates();
      } else {
        alert("Failed to update template");
      }
    } catch (error) {
      console.error("Failed to update email template:", error);
      alert("An error occurred while updating template");
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleInstallTemplates = async () => {
    if (!confirm("This will install/update all email templates. Continue?")) {
      return;
    }

    setInstallingTemplates(true);
    try {
      const res = await fetch("/api/admin/install-email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Successfully installed ${data.installed} new templates and updated ${data.updated} existing templates.`);
        fetchAllEmailTemplates();
      } else {
        const error = await res.json();
        alert(`Failed to install templates: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to install email templates:", error);
      alert("An error occurred while installing templates");
    } finally {
      setInstallingTemplates(false);
    }
  };

  const toggleKeyVisibility = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const currentProvider = EMAIL_PROVIDERS.find(p => p.name === selectedProvider);

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
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Email Integration & Notifications</h1>
              <p className="text-gray-600 mt-1">Configure email service and manage notification templates</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/admin")}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Back to Admin
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab("integration")}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                activeTab === "integration"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Key className="w-5 h-5" />
                <span>Integration Settings</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                activeTab === "templates"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Email Templates</span>
              </div>
            </button>
          </div>
        </div>

        {/* Integration Settings Tab */}
        {activeTab === "integration" && (
          <>
            {/* Provider Selection */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Select Email Provider</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EMAIL_PROVIDERS.map((provider) => (
                  <button
                    key={provider.name}
                    onClick={() => setSelectedProvider(provider.name)}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      selectedProvider === provider.name
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-3xl">{provider.icon}</span>
                      <h3 className="text-lg font-bold text-gray-900">{provider.displayName}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{provider.description}</p>
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
            {currentProvider && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                      {currentProvider.displayName} {isSandbox ? "Sandbox" : "Live"} Settings
                    </h2>
                    <p className="text-gray-600 text-sm">
                      Enter your API credentials to enable email delivery
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
                  {currentProvider.fields.map((field) => (
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

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-gray-600">
                      <p className="mb-1">
                        ⚠️ Make sure to verify your sender email/domain with Mailgun
                      </p>
                      <p>Test in sandbox mode before activating live mode</p>
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

                  {/* Test Email Section */}
                  {formData.is_active && formData.api_key && formData.api_domain && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Send Test Email</h3>
                      <div className="flex items-center space-x-3">
                        <input
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="Enter email address to test"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                        <button
                          onClick={handleSendTestEmail}
                          disabled={testEmailSending || !testEmail}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {testEmailSending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4" />
                              <span>Send Test</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Documentation */}
            <div className="bg-blue-50 rounded-2xl p-6">
              <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions</h3>
              <div className="space-y-2 text-blue-800 text-sm">
                <p>1. Create a Mailgun account at mailgun.com</p>
                <p>2. Add and verify your sending domain</p>
                <p>3. Navigate to API Security section to get your API key</p>
                <p>4. Copy the API key and domain, paste them above</p>
                <p>5. Configure sender email and name</p>
                <p>6. Test with sandbox mode before activating live mode</p>
              </div>
            </div>
          </>
        )}

        {/* Email Templates Tab */}
        {activeTab === "templates" && (
          <div className="space-y-6">
            {/* Install Templates Button */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Install Email Templates</h3>
                  <p className="text-gray-600 text-sm">
                    Install or update all default email templates (welcome emails, receipts, prize confirmations, etc.)
                  </p>
                </div>
                <button
                  onClick={handleInstallTemplates}
                  disabled={installingTemplates}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {installingTemplates ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Installing...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      <span>Install Email Templates</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Template Selector */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Select Email Template</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {emailTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      selectedTemplate?.id === template.id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <h3 className="font-bold text-gray-900 mb-1">
                      {template.template_name.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{template.subject}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Template Editor */}
            {selectedTemplate && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {selectedTemplate.template_name.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </h2>
                <p className="text-gray-600 text-sm mb-6">
                  Available variables: {Array.isArray(selectedTemplate.variables) ? selectedTemplate.variables.join(", ") : selectedTemplate.variables}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Subject
                    </label>
                    <input
                      type="text"
                      value={selectedTemplate.subject}
                      onChange={(e) =>
                        setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })
                      }
                      placeholder="Enter email subject"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      HTML Body
                    </label>
                    <textarea
                      value={selectedTemplate.html_body}
                      onChange={(e) =>
                        setSelectedTemplate({ ...selectedTemplate, html_body: e.target.value })
                      }
                      rows={12}
                      placeholder="Enter HTML email body"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plain Text Body (Optional)
                    </label>
                    <textarea
                      value={selectedTemplate.text_body || ""}
                      onChange={(e) =>
                        setSelectedTemplate({ ...selectedTemplate, text_body: e.target.value })
                      }
                      rows={8}
                      placeholder="Enter plain text email body"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <p className="mb-1">Use double curly braces for variables: {`{{variable_name}}`}</p>
                    <p>Templates are used for automated system notifications</p>
                  </div>
                  <button
                    onClick={handleTemplateUpdate}
                    disabled={templateSaving}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {templateSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Update Template</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Preview Section */}
            {selectedTemplate && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Template Preview</h3>
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="mb-4 pb-4 border-b border-gray-300">
                    <p className="text-sm text-gray-600 mb-1">Subject:</p>
                    <p className="font-semibold text-gray-900">{selectedTemplate.subject}</p>
                  </div>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedTemplate.html_body }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
