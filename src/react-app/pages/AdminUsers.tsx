import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import { Loader2, Search, ChevronLeft, ChevronRight, Eye, Shield, ShieldOff, Trash2 } from "lucide-react";

interface User {
  id: string;
  mocha_user_id: string;
  email: string | null;
  business_name: string | null;
  plan_type: string;
  subscription_status: string | null;
  campaign_count: number;
  campaign_credits: number;
  lead_credits: number;
  is_admin: number;
  created_at: string;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user, page]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?page=${page}&limit=${limit}`);
      
      if (res.status === 403) {
        setError("You do not have admin access to this page.");
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotal(data.total);
      } else {
        setError("Failed to load users");
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setError("An error occurred while loading users");
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/admin/users/${userId}/admin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_admin: !currentStatus }),
      });
      
      await fetchUsers();
    } catch (error) {
      console.error("Failed to update admin status:", error);
    }
  };

  const handleDeleteUser = async (userId: string, businessName: string | null) => {
    if (!confirm(`Are you sure you want to delete user "${businessName || userId}"? This will also delete all their campaigns and leads. This action cannot be undone.`)) {
      return;
    }

    setDeletingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("An error occurred while deleting the user");
    } finally {
      setDeletingUserId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.mocha_user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage platform users and permissions</p>
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
              placeholder="Search by email, business name, or user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Subscription</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Credits</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Campaigns</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Joined</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.business_name || "No business name"}
                        </p>
                        {user.email && (
                          <p className="text-sm text-gray-600">{user.email}</p>
                        )}
                        <p className="text-xs text-gray-400">{user.mocha_user_id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.plan_type === "free" 
                          ? "bg-gray-100 text-gray-700"
                          : user.plan_type === "starter"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}>
                        {user.plan_type === "free" && (user.campaign_credits > 0 || user.lead_credits > 0)
                          ? "Pay-Per-Use"
                          : user.plan_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3 text-xs">
                        <span className="text-indigo-600 font-medium">
                          C: {user.campaign_credits || 0}
                        </span>
                        <span className="text-purple-600 font-medium">
                          L: {user.lead_credits || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{user.campaign_count}</td>
                    <td className="px-6 py-4">
                      {user.is_admin === 1 ? (
                        <span className="flex items-center space-x-1 text-yellow-600">
                          <Shield className="w-4 h-4" />
                          <span className="text-xs font-medium">Admin</span>
                        </span>
                      ) : user.subscription_status ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.subscription_status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {user.subscription_status}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleAdminStatus(user.id, user.is_admin === 1)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.is_admin === 1
                              ? "text-yellow-600 hover:bg-yellow-50"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                          title={user.is_admin === 1 ? "Remove admin" : "Make admin"}
                        >
                          {user.is_admin === 1 ? (
                            <ShieldOff className="w-4 h-4" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.business_name)}
                          disabled={deletingUserId === user.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete user"
                        >
                          {deletingUserId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
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
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} users
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
