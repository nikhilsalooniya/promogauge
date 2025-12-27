import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import { Loader2, CreditCard, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";

export default function Billing() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const [appUser, setAppUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [managingBilling, setManagingBilling] = useState(false);

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/users/me");
      const data = await res.json();
      setAppUser(data.appUser);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setManagingBilling(true);
    try {
      const res = await fetch("/api/billing/create-portal-session", {
        method: "POST",
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to open billing portal:", error);
    } finally {
      setManagingBilling(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "past_due":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "canceled":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "past_due":
        return "bg-yellow-100 text-yellow-700";
      case "canceled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
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

  const planDetails = {
    free: {
      name: "Free",
      price: "$0",
      features: ["1 active campaign", "Up to 100 spins/month", "Basic analytics"],
    },
    starter: {
      name: "Starter",
      price: "$29",
      features: ["5 active campaigns", "Up to 2,000 spins/month", "Advanced analytics"],
    },
    professional: {
      name: "Professional",
      price: "$99",
      features: ["Unlimited campaigns", "Unlimited spins", "Full analytics suite"],
    },
  };

  const currentPlan = planDetails[appUser?.plan_type as keyof typeof planDetails] || planDetails.free;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600 mt-1">Manage your subscription and billing information</p>
        </div>

        {/* Current Plan */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Current Plan</h2>
              <p className="text-gray-600">You are currently on the {currentPlan.name} plan</p>
            </div>
            {appUser?.subscription_status && (
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getStatusColor(appUser.subscription_status)}`}>
                {getStatusIcon(appUser.subscription_status)}
                <span className="text-sm font-medium capitalize">{appUser.subscription_status}</span>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mb-6">
            <div className="flex items-baseline space-x-2 mb-4">
              <span className="text-4xl font-bold text-gray-900">{currentPlan.price}</span>
              <span className="text-gray-600">/month</span>
            </div>
            <ul className="space-y-2">
              {currentPlan.features.map((feature, index) => (
                <li key={index} className="flex items-center space-x-2 text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate("/pricing")}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
            >
              {appUser?.plan_type === "free" ? "Upgrade Plan" : "Change Plan"}
            </button>
            {appUser?.stripe_customer_id && (
              <button
                onClick={handleManageBilling}
                disabled={managingBilling}
                className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {managingBilling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Manage Billing</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Billing Information */}
        {appUser?.stripe_customer_id && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Information</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">Payment Method</span>
                </div>
                <button
                  onClick={handleManageBilling}
                  className="text-indigo-600 font-medium hover:text-indigo-700"
                >
                  Update
                </button>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">Billing History</span>
                </div>
                <button
                  onClick={handleManageBilling}
                  className="text-indigo-600 font-medium hover:text-indigo-700"
                >
                  View
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="bg-blue-50 rounded-2xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
          <p className="text-blue-800 text-sm mb-4">
            If you have any questions about billing or need to make changes to your subscription, 
            please contact our support team.
          </p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Contact Support
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
