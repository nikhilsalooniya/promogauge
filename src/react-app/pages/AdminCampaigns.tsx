import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import { Loader2, Search, ChevronLeft, ChevronRight, ExternalLink, TrendingUp, Users } from "lucide-react";

interface CampaignWithUser {
  id: string;
  name: string;
  public_slug: string;
  status: string;
  spins_count: number;
  leads_count: number;
  business_name: string | null;
  plan_type: string;
  created_at: string;
}

export default function AdminCampaigns() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const limit = 20;

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user, page]);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`/api/admin/campaigns?page=${page}&limit=${limit}`);
      
      if (res.status === 403) {
        setError("You do not have admin access to this page.");
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns);
        setTotal(data.total);
      } else {
        setError("Failed to load campaigns");
      }
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
      setError("An error occurred while loading campaigns");
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(total / limit);

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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Campaign Oversight</h1>
            <p className="text-gray-600 mt-1">Monitor all campaigns across the platform</p>
          </div>
          <button
            onClick={() => navigate("/admin")}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Back to Admin
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by campaign name or business..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Campaign</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Owner</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Plan</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Spins</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Leads</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Created</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{campaign.name}</p>
                      <p className="text-sm text-gray-500">{campaign.public_slug}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{campaign.business_name || "No business name"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        campaign.plan_type === "free" 
                          ? "bg-gray-100 text-gray-700"
                          : campaign.plan_type === "starter"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}>
                        {campaign.plan_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1 text-gray-900">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        <span>{campaign.spins_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1 text-gray-900">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{campaign.leads_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        campaign.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <a
                          href={`https://promoguage.mocha.app/campaign/${campaign.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View public page"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} campaigns
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 text-sm font-medium text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
