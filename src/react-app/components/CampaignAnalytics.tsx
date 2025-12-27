import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, Target, Calendar, UserCheck } from "lucide-react";
import LeadsTable from "./LeadsTable";

interface Lead {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  prize_won: string | null;
  reference_number: string | null;
  redemption_expires_at: string | null;
  is_redeemed: boolean;
  redeemed_at: string | null;
  created_at: string;
}

interface AnalyticsData {
  timeSeriesData: { date: string; spins: number; leads: number }[];
  prizeDistribution: { prize: string; count: number; color: string }[];
  totalStats: {
    total_spins: number;
    total_leads: number;
    conversion_rate: number;
    avg_spins_per_day: number;
  };
}

interface CampaignAnalyticsProps {
  campaignId: string;
  campaignType?: string;
}

export default function CampaignAnalytics({ campaignId, campaignType = 'spinwheel' }: CampaignAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("7d");
  const [activeView, setActiveView] = useState<"overview" | "leads">("overview");

  const isScratchCampaign = campaignType === 'scratch';
  const actionLabel = isScratchCampaign ? 'Scratches' : 'Spins';

  useEffect(() => {
    fetchAnalytics();
    fetchLeads();
  }, [campaignId, timeRange]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/analytics?range=${timeRange}`);
      if (res.ok) {
        const analyticsData = await res.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    setLeadsLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/leads`);
      if (res.ok) {
        const response = await res.json();
        setLeads(response.leads || []);
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLeadsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No analytics data available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Tabs and Time Range */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveView("overview")}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
              activeView === "overview"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveView("leads")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
              activeView === "leads"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Leads</span>
            <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-xs">
              {leads.length}
            </span>
          </button>
        </div>
        
        {activeView === "overview" && (
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            {[
              { label: "7 Days", value: "7d" as const },
              { label: "30 Days", value: "30d" as const },
              { label: "All Time", value: "all" as const },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value)}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                  timeRange === option.value
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Leads View */}
      {activeView === "leads" ? (
        leadsLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <LeadsTable campaignId={campaignId} leads={leads} onRefresh={fetchLeads} />
        )
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label={`Total ${actionLabel}`}
              value={data.totalStats.total_spins}
              color="indigo"
            />
            <StatCard
              icon={<Users className="w-5 h-5" />}
              label="Total Leads"
              value={data.totalStats.total_leads}
              color="purple"
              onClick={() => setActiveView("leads")}
              clickable
            />
            <StatCard
              icon={<Target className="w-5 h-5" />}
              label="Conversion Rate"
              value={`${data.totalStats.conversion_rate.toFixed(1)}%`}
              color="pink"
            />
            <StatCard
              icon={<Calendar className="w-5 h-5" />}
              label={`Avg ${actionLabel}/Day`}
              value={data.totalStats.avg_spins_per_day.toFixed(1)}
              color="blue"
            />
          </div>

          {/* Time Series Chart */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{actionLabel} & Leads Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "8px 12px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="spins"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ fill: "#6366f1", r: 4 }}
                  activeDot={{ r: 6 }}
                  name={actionLabel}
                />
                <Line
                  type="monotone"
                  dataKey="leads"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ fill: "#8b5cf6", r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Leads"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prize Distribution - Conditional rendering based on campaign type */}
            {isScratchCampaign ? (
              <>
                {/* Horizontal Bar Chart for Scratch Campaigns */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 lg:col-span-2">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Prize Distribution</h3>
                  {data.prizeDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart 
                        data={data.prizeDistribution} 
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" stroke="#6b7280" fontSize={12} />
                        <YAxis 
                          type="category" 
                          dataKey="prize" 
                          stroke="#6b7280" 
                          fontSize={12} 
                          width={90}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "8px 12px",
                          }}
                        />
                        <Bar dataKey="count" radius={[0, 8, 8, 0]} name="Wins">
                          {data.prizeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      No prize data yet
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Original Pie and Bar Charts for Spin Wheel Campaigns */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Prize Distribution</h3>
                  {data.prizeDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data.prizeDistribution}
                          dataKey="count"
                          nameKey="prize"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={(entry: any) => `${entry.prize} (${((entry.percent || 0) * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {data.prizeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      No prize data yet
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Prize Wins Breakdown</h3>
                  {data.prizeDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.prizeDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="prize" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "8px 12px",
                          }}
                        />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Wins">
                          {data.prizeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      No prize data yet
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  onClick,
  clickable,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  onClick?: () => void;
  clickable?: boolean;
}) {
  const colorClasses = {
    indigo: "from-indigo-600 to-indigo-700",
    purple: "from-purple-600 to-purple-700",
    pink: "from-pink-600 to-pink-700",
    blue: "from-blue-600 to-blue-700",
  };

  return (
    <div 
      className={`bg-white rounded-xl p-4 shadow-lg border border-gray-100 ${
        clickable ? "cursor-pointer hover:shadow-xl hover:border-indigo-300 transition-all" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div
          className={`w-10 h-10 bg-gradient-to-br ${
            colorClasses[color as keyof typeof colorClasses]
          } rounded-lg flex items-center justify-center text-white`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
