import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Sparkles, Check, Zap, Crown, Loader2, Globe, Package, ShoppingCart, Users, X, CreditCard } from "lucide-react";

interface Plan {
  id: string;
  plan_type: string;
  name: string;
  description: string;
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

type TabType = 'subscription' | 'campaign' | 'leads';

export default function Pricing() {
  const navigate = useNavigate();
  const { user, isPending, redirectToLogin } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'USD' | 'KES'>('USD');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'weekly'>('monthly');
  const [detectedCountry, setDetectedCountry] = useState<string>('');
  const [subscriptionPlans, setSubscriptionPlans] = useState<Plan[]>([]);
  const [campaignPlans, setCampaignPlans] = useState<Plan[]>([]);
  const [leadPlans, setLeadPlans] = useState<Plan[]>([]);
  const [hasWeeklyPlans, setHasWeeklyPlans] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('subscription');
  const [logo, setLogo] = useState<string | null>(null);
  
  // Payment gateway modal states
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [processingGateway, setProcessingGateway] = useState<string | null>(null);
  const [activeGateways, setActiveGateways] = useState<any[]>([]);

  useEffect(() => {
    if (isPending) {
      setLoading(true);
      return;
    }
    
    if (user) {
      fetchUserPlan();
    } else {
      detectCountry();
    }
  }, [user, isPending]);

  useEffect(() => {
    if (currency) {
      fetchAllPlans();
    }
  }, [currency]);

  useEffect(() => {
    fetchActiveGateways();
  }, []);

  useEffect(() => {
    fetchHomepageConfig();
  }, []);

  const fetchHomepageConfig = async () => {
    try {
      const res = await fetch("/api/homepage-config");
      if (res.ok) {
        const data = await res.json();
        if (data.config?.header?.logo_url) {
          setLogo(data.config.header.logo_url);
        }
      }
    } catch (error) {
      console.error("Failed to fetch homepage config:", error);
    }
  };

  const fetchActiveGateways = async () => {
    try {
      const res = await fetch("/api/billing/active-gateways");
      if (res.ok) {
        const data = await res.json();
        setActiveGateways(data.gateways || []);
      }
    } catch (error) {
      console.error("Failed to fetch active gateways:", error);
    }
  };

  const detectCountry = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const res = await fetch('https://ipapi.co/json/', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error('Failed to detect country');
      }
      
      const data = await res.json();
      
      setDetectedCountry(data.country_name || '');
      
      if (data.country_code === 'KE') {
        setCurrency('KES');
      } else {
        setCurrency('USD');
      }
    } catch (error) {
      console.error('Failed to detect country:', error);
      setCurrency('USD');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPlan = async () => {
    try {
      const res = await fetch("/api/users/me");
      const data = await res.json();
      setCurrentPlan(data.appUser?.plan_type || "free");
      
      if (data.appUser?.currency) {
        setCurrency(data.appUser.currency);
        setLoading(false);
      } else if (data.appUser?.country) {
        const derivedCurrency = data.appUser.country === 'KE' ? 'KES' : 'USD';
        setCurrency(derivedCurrency);
        setLoading(false);
      } else {
        await detectCountry();
      }
    } catch (error) {
      console.error("Failed to fetch user plan:", error);
      setCurrency('USD');
      setLoading(false);
    }
  };

  const fetchAllPlans = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Fetch all plan types
      const [subscriptionRes, campaignRes, leadRes] = await Promise.all([
        fetch(`/api/billing-plans?currency=${currency}&type=subscription`, { signal: controller.signal }),
        fetch(`/api/billing-plans?currency=${currency}&type=campaign`, { signal: controller.signal }),
        fetch(`/api/billing-plans?currency=${currency}&type=leads`, { signal: controller.signal })
      ]);
      
      clearTimeout(timeoutId);
      
      if (subscriptionRes.ok) {
        const data = await subscriptionRes.json();
        console.log('[Pricing] Subscription plans fetched:', data.plans);
        if (data.plans) {
          setSubscriptionPlans(data.plans);
          const weeklyExists = data.plans.some((p: Plan) => p.billing_interval === 'weekly');
          setHasWeeklyPlans(weeklyExists);
          if (!weeklyExists && billingCycle === 'weekly') {
            setBillingCycle('monthly');
          }
        }
      }
      
      if (campaignRes.ok) {
        const data = await campaignRes.json();
        console.log('[Pricing] Campaign plans fetched:', data.plans);
        if (data.plans) {
          setCampaignPlans(data.plans);
        }
      }
      
      if (leadRes.ok) {
        const data = await leadRes.json();
        console.log('[Pricing] Lead plans fetched:', data.plans);
        if (data.plans) {
          setLeadPlans(data.plans);
        }
      }
    } catch (error) {
      console.error("Failed to fetch plans:", error);
      setSubscriptionPlans([]);
      setCampaignPlans([]);
      setLeadPlans([]);
    }
  };

  const handleSelectPlan = (plan: Plan, planCategory: 'subscription' | 'campaign' | 'leads') => {
    if (!user) {
      redirectToLogin();
      return;
    }

    if (plan.plan_type === "free") {
      navigate("/dashboard");
      return;
    }

    if (activeGateways.length === 0) {
      alert('No payment gateways are currently available. Please contact support.');
      return;
    }

    // Prepare purchase details for modal
    const purchaseDetails: any = {
      type: planCategory,
      planType: plan.plan_type,
      amount: plan.amount,
      description: plan.name,
    };

    if (planCategory === 'subscription') {
      purchaseDetails.billingCycle = plan.billing_interval || 'monthly';
    } else if (planCategory === 'campaign') {
      purchaseDetails.credits = plan.campaign_limit;
    } else if (planCategory === 'leads') {
      purchaseDetails.leads = plan.lead_limit;
    }

    setSelectedPurchase(purchaseDetails);
    setShowGatewayModal(true);
  };

  const handleGatewaySelection = async (gateway: any) => {
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

  const getGatewayDisplayName = (gatewayName: string) => {
    if (gatewayName.toLowerCase() === 'paystack') {
      return 'Secure Card/Mobile Payment';
    }
    return gatewayName;
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'free':
        return Sparkles;
      case 'starter':
        return Zap;
      case 'business':
        return Package;
      case 'pro':
        return Crown;
      default:
        return Package;
    }
  };

  const displayedSubscriptionPlans = subscriptionPlans.filter(plan => {
    // All subscription plans should be filtered by billing_interval
    // No need to check for 'free' plan type since they're all 'subscription' type
    return plan.billing_interval === billingCycle;
  });

  console.log('[Pricing] State - subscriptionPlans:', subscriptionPlans.length);
  console.log('[Pricing] State - campaignPlans:', campaignPlans.length);
  console.log('[Pricing] State - leadPlans:', leadPlans.length);
  console.log('[Pricing] State - displayedSubscriptionPlans:', displayedSubscriptionPlans.length);
  console.log('[Pricing] State - billingCycle:', billingCycle);
  console.log('[Pricing] State - activeTab:', activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  const hasAnyPlans = displayedSubscriptionPlans.length > 0 || campaignPlans.length > 0 || leadPlans.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(user ? "/dashboard" : "/home")}
              className="flex items-center space-x-2"
            >
              {logo ? (
                <img 
                  src={logo} 
                  alt="PromoGuage" 
                  className="h-10 max-w-[180px] object-contain"
                />
              ) : (
                <>
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    PromoGuage
                  </span>
                </>
              )}
            </button>
            {user ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={redirectToLogin}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 leading-tight">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Simple Pricing
            </span>
            <br />
            <span className="text-gray-900">For Every Business</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-6 max-w-2xl mx-auto">
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>
          
          {/* Currency & Location Info */}
          <div className="flex flex-col items-center space-y-3 mb-8">
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                  currency === 'USD'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                USD ($)
              </button>
              <button
                onClick={() => setCurrency('KES')}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                  currency === 'KES'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                KES (KSh)
              </button>
            </div>

            {detectedCountry && (
              <p className="text-sm text-gray-500 flex items-center space-x-1">
                <Globe className="w-4 h-4" />
                <span>Detected location: {detectedCountry}</span>
              </p>
            )}

            {user && (
              <p className="text-sm text-gray-500">
                Current plan: <span className="font-semibold capitalize">{currentPlan}</span>
              </p>
            )}
          </div>

          {/* Tab Navigation */}
          {hasAnyPlans && (
            <div className="flex justify-center">
              <div className="inline-flex items-center bg-gray-100 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setActiveTab('subscription')}
                  className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    activeTab === 'subscription'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Subscription Plans
                </button>
                <button
                  onClick={() => setActiveTab('campaign')}
                  className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    activeTab === 'campaign'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Pay-Per-Campaign
                </button>
                <button
                  onClick={() => setActiveTab('leads')}
                  className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    activeTab === 'leads'
                      ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Pay-Per-Lead
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Plans Content */}
      {hasAnyPlans ? (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {/* Subscription Plans Tab */}
          {activeTab === 'subscription' && displayedSubscriptionPlans.length > 0 && (
            <div>
              {/* Subscription Disclaimer */}
              <div className="max-w-3xl mx-auto mb-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">Publish and edit campaigns anytime</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">Pause, resume, or reschedule campaigns</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">Multiple campaigns per period</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">Full control while subscription is active</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">Editing disabled when subscription expires</p>
                  </div>
                </div>
              </div>

              <div className="text-center mb-8">
                <p className="text-gray-600 mb-4">Monthly or weekly recurring subscriptions</p>
                
                {hasWeeklyPlans && (
                  <div className="flex items-center justify-center">
                    <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                          billingCycle === 'monthly'
                            ? 'bg-white text-gray-900 shadow'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setBillingCycle('weekly')}
                        className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                          billingCycle === 'weekly'
                            ? 'bg-white text-gray-900 shadow'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Weekly
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
                  {displayedSubscriptionPlans.map((plan) => {
                    const isCurrentPlan = currentPlan === plan.plan_type;
                    const Icon = getPlanIcon(plan.plan_type);

                    return (
                      <div
                        key={plan.id}
                        className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-200 hover:shadow-xl ${
                          plan.is_popular 
                            ? "border-indigo-500 transform lg:scale-105" 
                            : "border-gray-200"
                        }`}
                      >
                        {plan.is_popular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                              Most Popular
                            </span>
                          </div>
                        )}

                        <div className="p-6">
                          <div className="flex items-center justify-center mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              plan.plan_type === "free" 
                                ? "bg-gray-100" 
                                : "bg-gradient-to-br from-indigo-600 to-purple-600"
                            }`}>
                              <Icon className={`w-6 h-6 ${plan.plan_type === "free" ? "text-gray-600" : "text-white"}`} />
                            </div>
                          </div>

                          <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">{plan.name}</h3>
                          {plan.description && (
                            <p className="text-sm text-gray-500 mb-4 text-center min-h-[40px]">{plan.description}</p>
                          )}
                          
                          <div className="mb-6 text-center">
                            <span className="text-4xl font-bold text-gray-900">
                              {currency === 'KES' ? 'KSh' : '$'}{plan.amount}
                            </span>
                            <span className="text-gray-600 text-sm ml-1">
                              /{plan.billing_interval || 'month'}
                            </span>
                          </div>

                          <button
                            onClick={() => handleSelectPlan(plan, 'subscription')}
                            disabled={isCurrentPlan}
                            className={`w-full px-6 py-3 rounded-xl font-bold text-base transition-all duration-200 mb-6 ${
                              isCurrentPlan
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : plan.is_popular
                                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/50"
                                : "bg-gray-900 text-white hover:bg-gray-800"
                            }`}
                          >
                            {isCurrentPlan ? (
                              "Current Plan"
                            ) : (
                              plan.plan_type === "free" ? "Get Started" : "Subscribe Now"
                            )}
                          </button>

                          <div className="space-y-3">
                            {plan.features.map((feature, index) => (
                              <div key={index} className="flex items-start space-x-2">
                                <div className="flex-shrink-0 mt-0.5">
                                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-green-600" />
                                  </div>
                                </div>
                                <span className="text-sm text-gray-600">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Pay-Per-Campaign Tab */}
          {activeTab === 'campaign' && campaignPlans.length > 0 && (
            <div>
              {/* Pay-Per-Campaign Disclaimer */}
              <div className="max-w-3xl mx-auto mb-8 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">One-time campaign payment</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">Edit before campaign starts</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">No edits or unpublish after campaign goes live</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">No rescheduling after publish</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">Campaign runs for up to 30 days</p>
                  </div>
                </div>
              </div>

              <div className="text-center mb-8">
                <p className="text-gray-600">One-time purchase for campaign credits</p>
              </div>

              <div className="flex justify-center">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
                  {campaignPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="relative bg-white rounded-2xl shadow-lg border-2 border-gray-200 transition-all duration-200 hover:shadow-xl"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-center mb-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                            <ShoppingCart className="w-6 h-6 text-white" />
                          </div>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">{plan.name}</h3>
                        {plan.description && (
                          <p className="text-sm text-gray-500 mb-4 text-center">{plan.description}</p>
                        )}
                        
                        <div className="mb-6 text-center">
                          <span className="text-4xl font-bold text-gray-900">
                            {currency === 'KES' ? 'KSh' : '$'}{plan.amount}
                          </span>
                          <p className="text-sm text-gray-600 mt-1">
                            {plan.campaign_limit} {plan.campaign_limit === 1 ? 'Campaign' : 'Campaigns'}
                          </p>
                        </div>

                        <button
                          onClick={() => handleSelectPlan(plan, 'campaign')}
                          className="w-full px-6 py-3 rounded-xl font-bold text-base bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-200 mb-6"
                        >
                          Purchase Now
                        </button>

                        <div className="space-y-3">
                          {plan.features.map((feature, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <div className="flex-shrink-0 mt-0.5">
                                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-green-600" />
                                </div>
                              </div>
                              <span className="text-sm text-gray-600">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pay-Per-Lead Tab */}
          {activeTab === 'leads' && leadPlans.length > 0 && (
            <div>
              <div className="text-center mb-8">
                <p className="text-gray-600">One-time purchase for lead credits</p>
              </div>

              <div className="flex justify-center">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
                  {leadPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="relative bg-white rounded-2xl shadow-lg border-2 border-gray-200 transition-all duration-200 hover:shadow-xl"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-center mb-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">{plan.name}</h3>
                        {plan.description && (
                          <p className="text-sm text-gray-500 mb-4 text-center">{plan.description}</p>
                        )}
                        
                        <div className="mb-6 text-center">
                          <span className="text-4xl font-bold text-gray-900">
                            {currency === 'KES' ? 'KSh' : '$'}{plan.amount}
                          </span>
                          <p className="text-sm text-gray-600 mt-1">
                            {plan.lead_limit} {plan.lead_limit === 1 ? 'Lead' : 'Leads'}
                          </p>
                        </div>

                        <button
                          onClick={() => handleSelectPlan(plan, 'leads')}
                          className="w-full px-6 py-3 rounded-xl font-bold text-base bg-gradient-to-r from-green-600 to-teal-600 text-white hover:shadow-lg hover:shadow-green-500/50 transition-all duration-200 mb-6"
                        >
                          Purchase Now
                        </button>

                        <div className="space-y-3">
                          {plan.features.map((feature, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <div className="flex-shrink-0 mt-0.5">
                                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-green-600" />
                                </div>
                              </div>
                              <span className="text-sm text-gray-600">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No Plans Message for Active Tab */}
          {((activeTab === 'subscription' && displayedSubscriptionPlans.length === 0) ||
            (activeTab === 'campaign' && campaignPlans.length === 0) ||
            (activeTab === 'leads' && leadPlans.length === 0)) && (
            <div className="text-center py-12">
              <p className="text-gray-500">No plans available for this category in the selected currency.</p>
              <p className="text-sm text-gray-400 mt-2">Please try switching currencies or contact support.</p>
            </div>
          )}
        </section>
      ) : (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="text-center py-12">
            <p className="text-gray-500">No plans available for the selected currency.</p>
            <p className="text-sm text-gray-400 mt-2">Please try switching currencies or contact support.</p>
          </div>
        </section>
      )}

      {/* Global Pricing Note */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Important Information</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              • Campaign access and editing permissions depend on your selected plan.
            </p>
            <p>
              • Active campaigns continue running even if your subscription expires.
            </p>
            <p>
              • Pay-per-campaign purchases lock campaigns after they go live to ensure campaign integrity.
            </p>
            <p>
              • Subscription plans provide full flexibility to edit campaigns anytime while active.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Sales */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Need a custom plan for your enterprise?
          </p>
          <button className="px-8 py-3 bg-white text-gray-900 border-2 border-gray-300 rounded-xl font-semibold hover:border-indigo-500 hover:text-indigo-600 transition-all duration-200">
            Contact Sales
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-500">
            © 2025 PromoGuage. All rights reserved.
          </p>
        </div>
      </footer>

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
                      {getGatewayDisplayName(gateway.gateway_name)}
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
    </div>
  );
}
