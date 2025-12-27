import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import { Loader2, ArrowLeft, TrendingUp, Users, Calendar, ExternalLink } from "lucide-react";
import type { Campaign } from "@/shared/types";

interface UserDetail {
  user: any;
  campaigns: Campaign[];
  stats: {
    total_spins: number;
    total_leads: number;
  };
}

export default function AdminUserDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isPending } = useAuth();
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchUserDetail();
    }
  }, [user, id]);

  const fetchUserDetail = async () => {
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      
      if (res.status === 403) {
        setError("You do not have admin access to this page.");
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setUserDetail(data);
      } else {
        setError("Failed to load user details");
      }
    } catch (error) {
      console.error("Failed to fetch user detail:", error);
      setError("An error occurred while loading user details");
    } finally {
      setLoading(false);
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

  if (error || !userDetail) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error || "User not found"}</p>
            <button
              onClick={() => navigate("/admin/users")}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
            >
              Back to Users
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { user: userData, campaigns, stats } = userDetail;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/admin/users")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {userData.business_name || "User Details"}
              </h1>
              <p className="text-gray-600 mt-1">User ID: {userData.mocha_user_id}</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Email</p>
              <p className="text-lg font-semibold text-gray-900">{userData.email || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Plan Type</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {userData.plan_type === 'free' && (userData.campaign_credits > 0 || userData.lead_credits > 0)
                  ? 'Pay-Per-Use'
                  : userData.plan_type}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Subscription Status</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {userData.subscription_status || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Country</p>
              <p className="text-lg font-semibold text-gray-900">{userData.country || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Currency</p>
              <p className="text-lg font-semibold text-gray-900">{userData.currency || "USD"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Campaign Credits</p>
              <p className="text-lg font-semibold text-indigo-600">{userData.campaign_credits || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Lead Credits</p>
              <p className="text-lg font-semibold text-purple-600">{userData.lead_credits || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Joined</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(userData.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Admin Status</p>
              <p className="text-lg font-semibold text-gray-900">
                {userData.is_admin === 1 ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Total Campaigns</p>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center text-white">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{campaigns.length}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Total Spins</p>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center text-white">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total_spins}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Total Leads</p>
              <div className="w-10 h-10 bg-gradient-to-br from-pink-600 to-pink-700 rounded-lg flex items-center justify-center text-white">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total_leads}</p>
          </div>
        </div>

        {/* Campaigns */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">User Campaigns</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {campaigns.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">No campaigns yet</p>
              </div>
            ) : (
              campaigns.map((campaign) => (
                <div key={campaign.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{campaign.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center space-x-1">
                          <TrendingUp className="w-4 h-4" />
                          <span>{campaign.spins_count} spins</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{campaign.leads_count} leads</span>
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          campaign.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {campaign.status}
                        </span>
                      </div>
                    </div>
                    <a
                      href={`https://promoguage.mocha.app/campaign/${campaign.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="View public page"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
