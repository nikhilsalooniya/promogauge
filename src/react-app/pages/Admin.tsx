import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import { Loader2, Users, TrendingUp, Activity, Crown, DollarSign, UserCheck, Mail, Wand2, Gift, Layout, FileText } from "lucide-react";

interface AdminStats {
  total_users: number;
  total_campaigns: number;
  total_spins: number;
  total_leads: number;
  active_subscriptions: number;
  recent_users: number;
  plan_distribution: Array<{ plan_type: string; count: number }>;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      
      if (res.status === 403) {
        setError("You do not have admin access to this page.");
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        setError("Failed to load admin data");
      }
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
      setError("An error occurred while loading admin data");
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

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
            <Crown className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Platform overview and management</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => navigate("/admin/credits")}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Manual Credit Grant</h3>
                <p className="text-gray-600 text-sm">Grant credits to users manually</p>
              </div>
              <Gift className="w-8 h-8 text-purple-600" />
            </div>
          </button>

          <button
            onClick={() => navigate("/admin/users")}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">User Management</h3>
                <p className="text-gray-600 text-sm">View and manage platform users</p>
              </div>
              <Users className="w-8 h-8 text-indigo-600" />
            </div>
          </button>

          <button
            onClick={() => navigate("/admin/campaigns")}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Campaign Oversight</h3>
                <p className="text-gray-600 text-sm">Monitor all campaigns platform-wide</p>
              </div>
              <MegaphoneIcon className="w-8 h-8 text-purple-600" />
            </div>
          </button>

          <button
            onClick={() => navigate("/admin/payment-gateways")}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Payment Gateways</h3>
                <p className="text-gray-600 text-sm">Configure payment integrations</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </button>

          <button
            onClick={() => navigate("/admin/email-integration")}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Email Integration</h3>
                <p className="text-gray-600 text-sm">Configure email service & templates</p>
              </div>
              <MailIcon className="w-8 h-8 text-blue-600" />
            </div>
          </button>

          <button
            onClick={() => navigate("/admin/templates")}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Campaign Templates</h3>
                <p className="text-gray-600 text-sm">Manage pre-built campaign templates</p>
              </div>
              <WandIcon className="w-8 h-8 text-purple-600" />
            </div>
          </button>

          <button
            onClick={() => navigate("/admin/billing-management")}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Billing Management</h3>
                <p className="text-gray-600 text-sm">Manage pricing plans & options</p>
              </div>
              <DollarSign className="w-8 h-8 text-teal-600" />
            </div>
          </button>

          <button
            onClick={() => navigate("/admin/homepage-builder")}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Homepage Builder</h3>
                <p className="text-gray-600 text-sm">Customize homepage content & layout</p>
              </div>
              <LayoutIcon className="w-8 h-8 text-orange-600" />
            </div>
          </button>

          <button
            onClick={() => navigate("/admin/posts")}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Posts Management</h3>
                <p className="text-gray-600 text-sm">Manage Use Cases & How It Works posts</p>
              </div>
              <FileText className="w-8 h-8 text-indigo-600" />
            </div>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Total Users"
            value={stats?.total_users || 0}
            color="indigo"
            subtitle={`${stats?.recent_users || 0} new this week`}
          />
          <StatCard
            icon={<MegaphoneIcon className="w-6 h-6" />}
            label="Total Campaigns"
            value={stats?.total_campaigns || 0}
            color="purple"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Total Spins"
            value={stats?.total_spins || 0}
            color="pink"
          />
          <StatCard
            icon={<Activity className="w-6 h-6" />}
            label="Total Leads"
            value={stats?.total_leads || 0}
            color="blue"
          />
        </div>

        {/* Email Integration Status */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Email Integration Status</h2>
          </div>
          <EmailIntegrationStatus />
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Active Subscriptions</h2>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-2">{stats?.active_subscriptions || 0}</p>
            <p className="text-gray-600">Paying subscribers</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Plan Distribution</h2>
            </div>
            <div className="space-y-3">
              {stats?.plan_distribution.map((plan) => (
                <div key={plan.plan_type} className="flex items-center justify-between">
                  <span className="text-gray-700 capitalize font-medium">{plan.plan_type}</span>
                  <span className="text-gray-900 font-bold">{plan.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Platform Health */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-4">Platform Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-indigo-100 text-sm mb-1">Avg Spins per Campaign</p>
              <p className="text-3xl font-bold">
                {stats?.total_campaigns ? Math.round((stats?.total_spins || 0) / stats.total_campaigns) : 0}
              </p>
            </div>
            <div>
              <p className="text-indigo-100 text-sm mb-1">Avg Leads per Campaign</p>
              <p className="text-3xl font-bold">
                {stats?.total_campaigns ? Math.round((stats?.total_leads || 0) / stats.total_campaigns) : 0}
              </p>
            </div>
            <div>
              <p className="text-indigo-100 text-sm mb-1">Overall Conversion Rate</p>
              <p className="text-3xl font-bold">
                {stats?.total_spins ? ((stats?.total_leads || 0) / stats.total_spins * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  color, 
  subtitle 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  color: string;
  subtitle?: string;
}) {
  const colorClasses = {
    indigo: "from-indigo-600 to-indigo-700",
    purple: "from-purple-600 to-purple-700",
    pink: "from-pink-600 to-pink-700",
    blue: "from-blue-600 to-blue-700",
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-600 text-sm font-medium">{label}</p>
        <div className={`w-10 h-10 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} rounded-lg flex items-center justify-center text-white`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return <Mail className={className} />;
}

function WandIcon({ className }: { className?: string }) {
  return <Wand2 className={className} />;
}

function LayoutIcon({ className }: { className?: string }) {
  return <Layout className={className} />;
}

function EmailIntegrationStatus() {
  const [status, setStatus] = useState<{
    isConfigured: boolean;
    isActive: boolean;
    provider: string;
    mode: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmailStatus();
  }, []);

  const fetchEmailStatus = async () => {
    try {
      // Check sandbox first
      const sandboxRes = await fetch("/api/admin/email-integration/mailgun?sandbox=true");
      const sandboxData = await sandboxRes.json();
      
      // Check live
      const liveRes = await fetch("/api/admin/email-integration/mailgun?sandbox=false");
      const liveData = await liveRes.json();

      // Prefer live if active, otherwise sandbox
      if (liveData.settings?.is_active) {
        setStatus({
          isConfigured: true,
          isActive: true,
          provider: "Mailgun",
          mode: "Live",
        });
      } else if (sandboxData.settings?.is_active) {
        setStatus({
          isConfigured: true,
          isActive: true,
          provider: "Mailgun",
          mode: "Sandbox",
        });
      } else if (liveData.settings || sandboxData.settings) {
        setStatus({
          isConfigured: true,
          isActive: false,
          provider: "Mailgun",
          mode: liveData.settings ? "Live" : "Sandbox",
        });
      } else {
        setStatus({
          isConfigured: false,
          isActive: false,
          provider: "None",
          mode: "N/A",
        });
      }
    } catch (error) {
      console.error("Failed to fetch email status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!status) {
    return (
      <p className="text-gray-600 text-sm">Unable to load email integration status</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700">Provider:</span>
        <span className="text-sm font-semibold text-gray-900">{status.provider}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700">Mode:</span>
        <span className={`text-sm font-semibold ${status.mode === 'Live' ? 'text-green-600' : 'text-orange-600'}`}>
          {status.mode}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700">Status:</span>
        {status.isActive ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
        ) : status.isConfigured ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Inactive
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Not Configured
          </span>
        )}
      </div>
      {!status.isConfigured && (
        <button
          onClick={() => window.location.href = "/admin/email-integration"}
          className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm rounded-lg font-medium hover:shadow-lg transition-all duration-200"
        >
          Configure Email Integration
        </button>
      )}
    </div>
  );
}
