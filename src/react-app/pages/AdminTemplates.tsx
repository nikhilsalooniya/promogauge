import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import { Loader2, Plus, Edit2, Trash2, Eye, Copy, Wand2, Percent, UtensilsCrossed, Briefcase, Ticket, Dumbbell, Gift, GraduationCap, Film, Users } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  thumbnail_url: string | null;
  is_active: boolean;
  wheel_segments: any[];
  created_at: string;
}

export default function AdminTemplates() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"spinwheel" | "scratch">("spinwheel");

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/admin/templates");
      
      if (res.status === 403) {
        setError("You do not have admin access to this page.");
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        
        // Auto-migrate hardcoded templates if database is empty
        if (data.templates.length === 0) {
          console.log("No templates found in database. Migrating hardcoded templates...");
          const migrateRes = await fetch("/api/admin/migrate-templates", {
            method: "POST",
          });
          
          if (migrateRes.ok) {
            const migrateData = await migrateRes.json();
            console.log(`Migration successful: ${migrateData.migrated} templates migrated, ${migrateData.skipped} skipped`);
            
            // Re-fetch templates after migration
            const refreshRes = await fetch("/api/admin/templates");
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              setTemplates(refreshData.templates);
            }
          } else {
            console.error("Failed to migrate templates");
            setTemplates(data.templates);
          }
        } else {
          setTemplates(data.templates);
        }
      } else {
        setError("Failed to load templates");
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      setError("An error occurred while loading templates");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (templateId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (res.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to toggle template status:", error);
    }
  };

  const handleDuplicate = async (templateId: string) => {
    try {
      const res = await fetch(`/api/admin/templates/${templateId}/duplicate`, {
        method: "POST",
      });

      if (res.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to duplicate template:", error);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const res = await fetch(`/api/admin/templates/${templateId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  const iconMap: Record<string, any> = {
    'Percent': Percent,
    'UtensilsCrossed': UtensilsCrossed,
    'Briefcase': Briefcase,
    'Ticket': Ticket,
    'Dumbbell': Dumbbell,
    'Gift': Gift,
    'GraduationCap': GraduationCap,
    'Film': Film,
    'Users': Users,
    'Wand2': Wand2,
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
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
            >
              Back to Admin Dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Filter templates by active tab
  const filteredTemplates = templates.filter(template => {
    // Check campaign_type field if it exists
    if ((template as any).campaign_type) {
      return (template as any).campaign_type === activeTab;
    }
    // Fallback: use template ID to determine type
    const scratchIds = ['christmas-scratch', 'instant-discount-scratch', 'free-gift-scratch', 'back-to-school-scratch', 'instant-coupon-scratch'];
    const isScratch = scratchIds.includes(template.id);
    return (isScratch && activeTab === 'scratch') || (!isScratch && activeTab === 'spinwheel');
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Campaign Templates</h1>
            <p className="text-gray-600 mt-1">Manage pre-built templates for users</p>
          </div>
          <button
            onClick={() => navigate("/admin/templates/new")}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create Template</span>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="flex">
            <button
              onClick={() => setActiveTab("spinwheel")}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "spinwheel"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v10l8 4" />
                </svg>
                <span>Spin the Wheel Templates</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("scratch")}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "scratch"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3l14 9-14 9V3z" />
                </svg>
                <span>Scratch & Win Templates</span>
              </div>
            </button>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const IconComponent = iconMap[template.icon] || Wand2;

            return (
              <div
                key={template.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 truncate">{template.name}</h3>
                      <p className="text-sm text-gray-600 truncate">{template.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mb-4">
                    {template.wheel_segments.slice(0, 6).map((segment: any, idx: number) => (
                      <div
                        key={idx}
                        className="h-8 flex-1 rounded"
                        style={{ backgroundColor: segment.color }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-medium text-gray-500 uppercase">{template.category}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${template.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {template.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigate(`/admin/templates/${template.id}`)}
                      className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDuplicate(template.id)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(template.id, template.is_active)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      title={template.is_active ? "Hide" : "Activate"}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Wand2 className="w-10 h-10 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No {activeTab === "spinwheel" ? "Spin the Wheel" : "Scratch & Win"} Templates Yet</h3>
            <p className="text-gray-600 mb-6">Create your first {activeTab === "spinwheel" ? "spin wheel" : "scratch card"} template to get started</p>
            <button
              onClick={() => navigate("/admin/templates/new")}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
            >
              Create Template
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
