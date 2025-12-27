import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import { Loader2, TrendingUp, Users, Sparkles, Plus } from "lucide-react";
import type { Campaign } from "@/shared/types";

interface DashboardStats {
  total_campaigns: number;
  total_spins: number;
  total_leads: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !user) {
      console.log("Dashboard: No user, redirecting to home", { isPending, user });
      navigate("/signin");
    } else if (user) {
      console.log("Dashboard: User authenticated", { user: user.id });
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [statsRes, campaignsRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/campaigns"),
      ]);

      const statsData = await statsRes.json();
      const campaignsData = await campaignsRes.json();

      setStats(statsData);
      setCampaigns(campaignsData.slice(0, 5));
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
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

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.google_user_data.given_name || user?.google_user_data.name}!
          </h1>
          <p className="text-gray-600">Here's what's happening with your campaigns</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={<Megaphone className="w-6 h-6" />}
            label="Total Campaigns"
            value={stats?.total_campaigns || 0}
            color="indigo"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Total Spins"
            value={stats?.total_spins || 0}
            color="purple"
          />
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Total Leads"
            value={stats?.total_leads || 0}
            color="pink"
          />
        </div>

        {/* Recent Campaigns */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Recent Campaigns</h2>
            <button
              onClick={() => navigate("/campaigns")}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Campaign</span>
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {campaigns.length === 0 ? (
              <div className="p-12 text-center">
                <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No campaigns yet</p>
                <button
                  onClick={() => navigate("/campaigns")}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
                >
                  Create Your First Campaign
                </button>
              </div>
            ) : (
              campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                >
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
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        campaign.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {campaign.status}
                      </span>
                    </div>
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

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colorClasses = {
    indigo: "from-indigo-600 to-indigo-700",
    purple: "from-purple-600 to-purple-700",
    pink: "from-pink-600 to-pink-700",
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
        <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} rounded-xl flex items-center justify-center text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function Megaphone({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );
}
