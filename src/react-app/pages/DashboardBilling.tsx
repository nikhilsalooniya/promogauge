import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import { 
  Loader2, CreditCard, CheckCircle, XCircle, Clock, 
  Download, DollarSign, Zap, Crown, Package, Users, AlertCircle, ChevronDown, ChevronUp 
} from "lucide-react";

interface Gateway {
  gateway_name: string;
  is_active: boolean;
  display_name?: string;
}

interface Transaction {
  id: string;
  transaction_type: string;
  gateway_name: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  plan_type?: string;
}

interface BillingPlan {
  id: string;
  plan_type: string;
  name: string;
  description: string | null;
  currency: string;
  amount: number;
  billing_interval: string | null;
  campaign_limit: number | null;
  lead_limit: number | null;
  features: string[];
  is_active: boolean;
  display_order: number;
  is_popular: boolean;
}

export default function DashboardBilling() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const [appUser, setAppUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeGateways, setActiveGateways] = useState<Gateway[]>([]);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [processingGateway, setProcessingGateway] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'weekly' | 'monthly'>('monthly');
  
  // Billing plans from database
  const [subscriptionPlans, setSubscriptionPlans] = useState<BillingPlan[]>([]);
  const [allSubscriptionPlans, setAllSubscriptionPlans] = useState<BillingPlan[]>([]);
  const [campaignPlans, setCampaignPlans] = useState<BillingPlan[]>([]);
  const [leadPlans, setLeadPlans] = useState<BillingPlan[]>([]);
  
  // Expandable state for pay-per options
  const [expandedCampaignPlans, setExpandedCampaignPlans] = useState<Set<string>>(new Set());
  const [expandedLeadPlans, setExpandedLeadPlans] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (appUser) {
      fetchBillingPlans();
    }
  }, [appUser, billingCycle]);

  const fetchData = async () => {
    try {
      const [userRes, transactionsRes, gatewaysRes] = await Promise.all([
        fetch("/api/users/me"),
        fetch("/api/billing/transactions"),
        fetch("/api/billing/active-gateways"),
      ]);

      const userData = await userRes.json();
      const transactionsData = await transactionsRes.json();
      const gatewaysData = await gatewaysRes.json();

      setAppUser(userData.appUser);
      setTransactions(transactionsData.transactions || []);
      setActiveGateways(gatewaysData.gateways || []);
      setBillingCycle(userData.appUser?.billing_cycle || 'monthly');
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingPlans = async () => {
    const currency = appUser?.currency || 'USD';
    
    try {
      const [subscriptionRes, campaignRes, leadRes] = await Promise.all([
        fetch(`/api/billing-plans?currency=${currency}&type=subscription`),
        fetch(`/api/billing-plans?currency=${currency}&type=campaign`),
        fetch(`/api/billing-plans?currency=${currency}&type=leads`),
      ]);

      const subscriptionData = await subscriptionRes.json();
      const campaignData = await campaignRes.json();
      const leadData = await leadRes.json();

      // Store all subscription plans for toggle visibility check
      setAllSubscriptionPlans(subscriptionData.plans || []);

      // Filter subscription plans by billing cycle for display
      const filteredSubscriptions = (subscriptionData.plans || []).filter(
        (plan: BillingPlan) => plan.billing_interval === billingCycle
      );

      setSubscriptionPlans(filteredSubscriptions);
      setCampaignPlans(campaignData.plans || []);
      setLeadPlans(leadData.plans || []);
    } catch (error) {
      console.error("Failed to fetch billing plans:", error);
    }
  };

  const currency = appUser?.currency || 'USD';

  const handlePurchase = (type: string, details: any) => {
    if (activeGateways.length === 0) {
      alert('No payment gateways are currently available. Please contact support.');
      return;
    }

    setSelectedPurchase({ type, ...details });
    setShowGatewayModal(true);
  };

  const handleGatewaySelection = async (gateway: Gateway) => {
    setProcessingGateway(gateway.gateway_name);
    try {
      const res = await fetch('/api/billing/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway: gateway.gateway_name,
          amount: selectedPurchase.amount,
          currency,
          description: selectedPurchase.description,
          planType: selectedPurchase.planType,
          purchaseType: selectedPurchase.type,
          billingCycle: selectedPurchase.billingCycle,
          credits: selectedPurchase.credits,
          leads: selectedPurchase.leads,
        }),
      });

      const data = await res.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        alert('Failed to initiate payment. Please try again.');
      }
    } catch (error) {
      console.error('Payment initiation failed:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setProcessingGateway(null);
      setShowGatewayModal(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700',
      cancelled: 'bg-gray-100 text-gray-700',
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const getRenewalDate = () => {
    if (!appUser?.plan_expires_at) return 'N/A';
    const date = new Date(appUser.plan_expires_at);
    return date.toLocaleDateString();
  };

  const getGatewayDisplayName = (gateway: Gateway) => {
    // Use custom display name if set
    if (gateway.display_name) {
      return gateway.display_name;
    }
    // Fallback to default naming
    if (gateway.gateway_name.toLowerCase() === 'paystack') {
      return 'Secure Card/Mobile Payment';
    }
    return gateway.gateway_name.charAt(0).toUpperCase() + gateway.gateway_name.slice(1);
  };

  const toggleCampaignPlan = (planId: string) => {
    const newSet = new Set(expandedCampaignPlans);
    if (newSet.has(planId)) {
      newSet.delete(planId);
    } else {
      newSet.add(planId);
    }
    setExpandedCampaignPlans(newSet);
  };

  const toggleLeadPlan = (planId: string) => {
    const newSet = new Set(expandedLeadPlans);
    if (newSet.has(planId)) {
      newSet.delete(planId);
    } else {
      newSet.add(planId);
    }
    setExpandedLeadPlans(newSet);
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

  const currentPlanStatus = appUser?.subscription_status || 'inactive';
  const hasActivePlan = currentPlanStatus === 'active' && appUser?.plan_type !== 'free';

  // Check if weekly plans are available in ALL plans (not just filtered ones)
  const hasWeeklyPlans = allSubscriptionPlans.some(plan => plan.billing_interval === 'weekly');

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Billing Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your subscription and purchases</p>
        </div>

        {/* Subscription Expired Banner */}
        {appUser?.plan_type !== 'free' && currentPlanStatus === 'expired' && (
          <div className="bg-red-50 border border-red-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex items-start space-x-2 sm:space-x-3">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-red-900 mb-1">Your subscription expired</h3>
                <p className="text-sm sm:text-base text-red-800 mb-3 sm:mb-4">Renew your plan to continue running campaigns.</p>
                <button
                  onClick={() => document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-red-600 text-white rounded-lg sm:rounded-xl font-semibold hover:bg-red-700 transition-colors text-sm sm:text-base"
                >
                  Renew Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Current Subscription Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Current Subscription</h2>
              <div className={`flex items-center space-x-1.5 px-2 sm:px-3 py-1 rounded-full ${getStatusBadge(currentPlanStatus)}`}>
                {currentPlanStatus === 'active' ? (
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : currentPlanStatus === 'expired' ? (
                  <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                <span className="text-xs sm:text-sm font-medium capitalize">{currentPlanStatus}</span>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between py-2 sm:py-3 border-b border-gray-100">
                <span className="text-sm sm:text-base text-gray-600">Plan Type</span>
                <div className="text-right">
                  <span className="text-sm sm:text-base font-semibold text-gray-900 capitalize">
                    {appUser?.plan_type === 'free' 
                      ? (appUser?.campaign_credits > 0 || appUser?.lead_credits > 0)
                        ? 'Pay-Per-Use'
                        : 'Free'
                      : appUser?.plan_type || 'Free'}
                  </span>
                  {appUser?.plan_type === 'free' && (appUser?.campaign_credits > 0 || appUser?.lead_credits > 0) && (
                    <p className="text-[10px] sm:text-xs text-indigo-600 mt-0.5">
                      {appUser?.campaign_credits > 0 && `${appUser.campaign_credits} campaign${appUser.campaign_credits !== 1 ? 's' : ''}`}
                      {appUser?.campaign_credits > 0 && appUser?.lead_credits > 0 && ', '}
                      {appUser?.lead_credits > 0 && `${appUser.lead_credits} lead${appUser.lead_credits !== 1 ? 's' : ''}`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between py-2 sm:py-3 border-b border-gray-100">
                <span className="text-sm sm:text-base text-gray-600">Billing Cycle</span>
                <span className="text-sm sm:text-base font-semibold text-gray-900 capitalize">
                  {appUser?.billing_cycle || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 sm:py-3 border-b border-gray-100">
                <span className="text-sm sm:text-base text-gray-600">{hasActivePlan ? 'Renews On' : 'Expires On'}</span>
                <span className="text-sm sm:text-base font-semibold text-gray-900">{getRenewalDate()}</span>
              </div>
              {appUser?.stripe_customer_id && (
                <div className="flex items-center justify-between py-2 sm:py-3">
                  <span className="text-sm sm:text-base text-gray-600">Payment Method</span>
                  <span className="text-sm sm:text-base text-indigo-600 font-medium">Card on file</span>
                </div>
              )}
            </div>
          </div>

          {/* Usage Summary */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Usage Summary</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Campaign Credits</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {appUser?.campaign_credits || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (appUser?.campaign_credits || 0) * 20)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Lead Credits</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {appUser?.lead_credits || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${Math.min(100, ((appUser?.lead_credits || 0) / 500) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Plans */}
        <div id="plans-section" className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Subscription Plans</h2>
            {hasWeeklyPlans && (
              <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-medium text-xs sm:text-sm transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('weekly')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-medium text-xs sm:text-sm transition-all ${
                    billingCycle === 'weekly'
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Weekly
                </button>
              </div>
            )}
          </div>

          {subscriptionPlans.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <CreditCard className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-gray-500">No subscription plans available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {subscriptionPlans.map((plan) => {
                const Icon = plan.name.toLowerCase().includes('starter') ? Zap : 
                            plan.name.toLowerCase().includes('business') ? Package : Crown;
                const isCurrentPlan = appUser?.plan_type?.toLowerCase() === plan.name.toLowerCase();

                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl sm:rounded-2xl border-2 p-4 sm:p-6 transition-all ${
                      plan.is_popular
                        ? 'border-indigo-500 shadow-lg md:scale-105'
                        : 'border-gray-200'
                    }`}
                  >
                    {plan.is_popular && (
                      <div className="mb-3 sm:mb-4">
                        <span className="bg-indigo-100 text-indigo-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold">
                          MOST POPULAR
                        </span>
                      </div>
                    )}

                    <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <h3 className="text-base sm:text-xl font-bold text-gray-900">{plan.name}</h3>
                    </div>

                    {plan.description && (
                      <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">{plan.description}</p>
                    )}

                    <div className="mb-4 sm:mb-6">
                      <span className="text-2xl sm:text-4xl font-bold text-gray-900">
                        {currency === 'KES' ? 'KSh' : '$'}{plan.amount}
                      </span>
                      <span className="text-sm sm:text-base text-gray-600">/{plan.billing_interval === 'weekly' ? 'week' : 'month'}</span>
                    </div>

                    <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() =>
                        handlePurchase('subscription', {
                          planType: plan.name.toLowerCase(),
                          amount: plan.amount,
                          description: `${plan.name} Plan - ${plan.billing_interval}`,
                          billingCycle: plan.billing_interval,
                        })
                      }
                      disabled={isCurrentPlan && currentPlanStatus === 'active'}
                      className={`w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all text-sm sm:text-base ${
                        isCurrentPlan && currentPlanStatus === 'active'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : plan.is_popular
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {isCurrentPlan && currentPlanStatus === 'active' ? 'Current Plan' : 'Subscribe'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pay-Per Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Pay-Per-Campaign */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-gray-900">Pay-Per-Campaign</h3>
            </div>
            <p className="text-xs sm:text-base text-gray-600 mb-3 sm:mb-4">
              Purchase individual campaign credits without a subscription
            </p>
            
            {campaignPlans.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-gray-500">No campaign options available</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {campaignPlans.map((plan) => {
                  const isExpanded = expandedCampaignPlans.has(plan.id);
                  return (
                    <div key={plan.id} className="border-2 border-gray-200 rounded-lg sm:rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleCampaignPlan(plan.id)}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-50 transition-all text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                            )}
                            <span className="text-sm sm:text-base font-semibold text-gray-900 truncate">{plan.name}</span>
                          </div>
                          <span className="text-sm sm:text-base font-bold text-indigo-600 flex-shrink-0">
                            {currency === 'KES' ? 'KSh' : '$'}{plan.amount}
                          </span>
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t border-gray-200 bg-gray-50">
                          {plan.description && (
                            <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">{plan.description}</p>
                          )}
                          
                          {plan.campaign_limit && (
                            <div className="mb-2 sm:mb-3">
                              <span className="text-xs sm:text-sm font-medium text-gray-700">
                                Campaign Credits: {plan.campaign_limit}
                              </span>
                            </div>
                          )}
                          
                          {plan.features.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Features:</p>
                              <ul className="space-y-1">
                                {plan.features.map((feature, idx) => (
                                  <li key={idx} className="flex items-start space-x-1.5 sm:space-x-2">
                                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-xs sm:text-sm text-gray-600">{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          <button
                            onClick={() =>
                              handlePurchase('campaign', {
                                planType: 'pay_per_campaign',
                                amount: plan.amount,
                                description: plan.name,
                                credits: plan.campaign_limit,
                              })
                            }
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-sm sm:text-base"
                          >
                            Purchase
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pay-Per-Lead */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-gray-900">Pay-Per-Lead</h3>
            </div>
            <p className="text-xs sm:text-base text-gray-600 mb-3 sm:mb-4">
              Top up your lead capture capacity
            </p>
            
            {leadPlans.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-gray-500">No lead options available</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {leadPlans.map((plan) => {
                  const isExpanded = expandedLeadPlans.has(plan.id);
                  return (
                    <div key={plan.id} className="border-2 border-gray-200 rounded-lg sm:rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleLeadPlan(plan.id)}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-50 transition-all text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                            )}
                            <span className="text-sm sm:text-base font-semibold text-gray-900 truncate">{plan.name}</span>
                          </div>
                          <span className="text-sm sm:text-base font-bold text-green-600 flex-shrink-0">
                            {currency === 'KES' ? 'KSh' : '$'}{plan.amount}
                          </span>
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t border-gray-200 bg-gray-50">
                          {plan.description && (
                            <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">{plan.description}</p>
                          )}
                          
                          {plan.lead_limit && (
                            <div className="mb-2 sm:mb-3">
                              <span className="text-xs sm:text-sm font-medium text-gray-700">
                                Lead Credits: {plan.lead_limit}
                              </span>
                            </div>
                          )}
                          
                          {plan.features.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Features:</p>
                              <ul className="space-y-1">
                                {plan.features.map((feature, idx) => (
                                  <li key={idx} className="flex items-start space-x-1.5 sm:space-x-2">
                                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-xs sm:text-sm text-gray-600">{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          <button
                            onClick={() =>
                              handlePurchase('leads', {
                                planType: 'pay_per_lead',
                                amount: plan.amount,
                                description: plan.name,
                                leads: plan.lead_limit,
                              })
                            }
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm sm:text-base"
                          >
                            Purchase
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Transaction History</h2>
            <button className="flex items-center justify-center sm:justify-start space-x-2 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base">
              <Download className="w-4 h-4" />
              <span className="font-medium">Export</span>
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <DollarSign className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-gray-500">No transactions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Date</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Type</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 hidden sm:table-cell">Gateway</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Amount</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                          {new Date(tx.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: window.innerWidth < 640 ? '2-digit' : 'numeric'
                          })}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 capitalize">
                          <span className="hidden sm:inline">{tx.transaction_type.replace('_', ' ')}</span>
                          <span className="sm:hidden">{tx.transaction_type === 'subscription' ? 'Sub' : tx.transaction_type}</span>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 capitalize hidden sm:table-cell">
                          {tx.gateway_name}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                          {tx.currency === 'KES' ? 'KSh' : '$'}{tx.amount.toFixed(0)}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${getStatusBadge(tx.status)}`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gateway Selection Modal */}
      {showGatewayModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Select Payment Method</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Choose how you'd like to pay for {selectedPurchase?.description}
            </p>

            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
              {activeGateways.map((gateway) => (
                <button
                  key={gateway.gateway_name}
                  onClick={() => handleGatewaySelection(gateway)}
                  disabled={processingGateway !== null}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 border-2 border-gray-200 rounded-lg sm:rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 flex-shrink-0" />
                    <span className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                      {getGatewayDisplayName(gateway)}
                    </span>
                  </div>
                  {processingGateway === gateway.gateway_name && <Loader2 className="w-5 h-5 animate-spin text-indigo-600 flex-shrink-0" />}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowGatewayModal(false)}
              disabled={processingGateway !== null}
              className="w-full px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
