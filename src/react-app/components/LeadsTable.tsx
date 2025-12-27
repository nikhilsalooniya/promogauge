import { useState } from "react";
import { Check, X, Download, Search, Filter, Calendar } from "lucide-react";

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

interface LeadsTableProps {
  campaignId: string;
  leads: Lead[];
  onRefresh: () => void;
}

export default function LeadsTable({ campaignId, leads, onRefresh }: LeadsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "redeemed">("all");
  const [updatingLeads, setUpdatingLeads] = useState<Set<string>>(new Set());

  const handleToggleRedeemed = async (leadId: string, currentStatus: boolean) => {
    setUpdatingLeads(prev => new Set(prev).add(leadId));

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/leads/${leadId}/redeem`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_redeemed: !currentStatus }),
      });

      if (res.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error("Failed to update lead status:", error);
    } finally {
      setUpdatingLeads(prev => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
    }
  };

  const exportToCSV = () => {
    const headers = ["Name", "Email", "Phone", "Prize Won", "Reference Number", "Status", "Created At", "Redeemed At", "Expires At"];
    const rows = filteredLeads.map(lead => [
      lead.name || "",
      lead.email,
      lead.phone || "",
      lead.prize_won || "",
      lead.reference_number || "",
      lead.is_redeemed ? "Redeemed" : "Pending",
      new Date(lead.created_at).toLocaleString(),
      lead.redeemed_at ? new Date(lead.redeemed_at).toLocaleString() : "",
      lead.redemption_expires_at ? new Date(lead.redemption_expires_at).toLocaleString() : "",
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      (lead.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.phone?.includes(searchTerm)) ||
      (lead.prize_won?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = 
      filterStatus === "all" ||
      (filterStatus === "redeemed" && lead.is_redeemed) ||
      (filterStatus === "pending" && !lead.is_redeemed);

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: leads.length,
    redeemed: leads.filter(l => l.is_redeemed).length,
    pending: leads.filter(l => !l.is_redeemed).length,
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
          <p className="text-gray-600 text-sm font-medium mb-1">Total Leads</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
          <p className="text-gray-600 text-sm font-medium mb-1">Redeemed</p>
          <p className="text-2xl font-bold text-green-600">{stats.redeemed}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
          <p className="text-gray-600 text-sm font-medium mb-1">Pending</p>
          <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, prize, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="redeemed">Redeemed</option>
            </select>
          </div>

          <button
            onClick={exportToCSV}
            disabled={filteredLeads.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Prize</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Expires</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm || filterStatus !== "all" ? "No leads found matching your filters" : "No leads captured yet"}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isExpired = lead.redemption_expires_at && new Date(lead.redemption_expires_at) < new Date();
                  const isUpdating = updatingLeads.has(lead.id);

                  return (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900">{lead.name || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{lead.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lead.phone || "—"}</td>
                      <td className="px-4 py-3 text-sm">
                        {lead.prize_won ? (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                            {lead.prize_won}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">
                        {lead.reference_number || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {lead.redemption_expires_at ? (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className={isExpired ? "text-red-600 font-medium" : "text-gray-600"}>
                              {new Date(lead.redemption_expires_at).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {lead.is_redeemed ? (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <Check className="w-3 h-3 mr-1" />
                            Redeemed
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            <X className="w-3 h-3 mr-1" />
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleToggleRedeemed(lead.id, lead.is_redeemed)}
                          disabled={isUpdating}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            lead.is_redeemed
                              ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              : "bg-green-600 text-white hover:bg-green-700"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isUpdating ? "..." : lead.is_redeemed ? "Unredeemed" : "Mark Redeemed"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredLeads.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          Showing {filteredLeads.length} of {leads.length} leads
        </div>
      )}
    </div>
  );
}
