import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import { Loader2, Search, Gift, ArrowLeft, AlertCircle } from "lucide-react";

export default function AdminCreditManagement() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<"email" | "id">("email");
  const [searchValue, setSearchValue] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [credits, setCredits] = useState(300);
  const [reason, setReason] = useState("");
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantSuccess, setGrantSuccess] = useState<string | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchValue) return;

    setLoading(true);
    setSearchError(null);
    setSearchResult(null);
    setGrantSuccess(null);
    setGrantError(null);

    try {
      const endpoint = searchType === "email" 
        ? "/api/admin/find-user-by-email" 
        : "/api/admin/find-user-by-id";
      
      const body = searchType === "email" 
        ? { email: searchValue }
        : { user_id: searchValue };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.found) {
        setSearchResult(data.user);
      } else {
        setSearchError(data.error || "User not found");
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("Failed to search for user");
    } finally {
      setLoading(false);
    }
  };

  const handleGrantCredits = async () => {
    if (!searchResult?.id) return;

    setGrantLoading(true);
    setGrantError(null);
    setGrantSuccess(null);

    try {
      const res = await fetch(`/api/admin/grant-credits/${searchResult.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits, reason }),
      });

      const data = await res.json();

      if (res.ok) {
        setGrantSuccess(data.message);
        // Update the search result with new credits
        setSearchResult({
          ...searchResult,
          lead_credits: data.user.lead_credits,
        });
      } else {
        setGrantError(data.error || "Failed to grant credits");
      }
    } catch (error) {
      console.error("Grant error:", error);
      setGrantError("Failed to grant credits");
    } finally {
      setGrantLoading(false);
    }
  };

  if (isPending) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate("/admin")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Gift className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manual Credit Grant</h1>
              <p className="text-gray-600 mt-1">Grant lead credits to users manually</p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Find User</h2>
          
          {/* Search Type Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setSearchType("email");
                setSearchValue("");
                setSearchResult(null);
                setSearchError(null);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                searchType === "email"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Search by Email
            </button>
            <button
              onClick={() => {
                setSearchType("id");
                setSearchValue("");
                setSearchResult(null);
                setSearchError(null);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                searchType === "id"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Search by User ID
            </button>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              placeholder={searchType === "email" ? "Enter user email address" : "Enter user ID"}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !searchValue}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>

          {searchError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-900 font-medium">Error</p>
                <p className="text-red-700 text-sm">{searchError}</p>
              </div>
            </div>
          )}
        </div>

        {/* User Details Section */}
        {searchResult && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">User Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">User ID</p>
                <p className="text-lg font-mono text-gray-900 text-sm">{searchResult.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Email</p>
                <p className="text-lg font-semibold text-gray-900">{searchResult.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Business Name</p>
                <p className="text-lg font-semibold text-gray-900">
                  {searchResult.business_name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Plan Type</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {searchResult.plan_type}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Subscription Status</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {searchResult.subscription_status || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Campaign Credits</p>
                <p className="text-lg font-semibold text-indigo-600">
                  {searchResult.campaign_credits || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Current Lead Credits</p>
                <p className="text-lg font-semibold text-purple-600">
                  {searchResult.lead_credits || 0}
                </p>
              </div>
            </div>

            {/* Grant Credits Form */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Grant Lead Credits</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Lead Credits
                  </label>
                  <input
                    type="number"
                    value={credits}
                    onChange={(e) => setCredits(parseInt(e.target.value) || 0)}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Common values: Starter (300), Business (1000), Pro (3000)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Grant
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="e.g., Manual grant for completed Starter subscription - webhook processing issue"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {grantSuccess && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-green-900 font-medium">{grantSuccess}</p>
                    <p className="text-green-700 text-sm mt-1">
                      New total: {searchResult.lead_credits} lead credits
                    </p>
                  </div>
                )}

                {grantError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-red-900 font-medium">Error</p>
                      <p className="text-red-700 text-sm">{grantError}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleGrantCredits}
                  disabled={grantLoading || credits <= 0}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {grantLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Granting Credits...</span>
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5" />
                      <span>Grant {credits} Lead Credits</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 rounded-2xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">How to Use</h3>
          <div className="space-y-2 text-blue-800 text-sm">
            <p>1. Choose to search by email address or user ID</p>
            <p>2. Enter the search value and click "Search"</p>
            <p>3. Review the user's current credit balance and subscription status</p>
            <p>4. Enter the number of lead credits to grant (based on their plan)</p>
            <p>5. Add a reason for the grant (for audit purposes)</p>
            <p>6. Click "Grant Credits" to add the credits to their account</p>
            <p className="pt-2 border-t border-blue-200 mt-3">
              <strong>Note:</strong> User IDs can be found in the Admin Users list or by searching by email first.
              This tool is for manually resolving webhook processing issues or subscription credit discrepancies.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
