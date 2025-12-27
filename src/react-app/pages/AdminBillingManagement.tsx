import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import { Loader2, DollarSign, Plus, Edit2, Trash2, Save, X, CreditCard, Package, Users, ArrowUp, ArrowDown } from "lucide-react";

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
  remove_watermark?: boolean;
  allow_background_image?: boolean;
  allow_logo_upload?: boolean;
  allow_external_border?: boolean;
  allow_qr_code?: boolean;
}

export default function AdminBillingManagement() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'KES'>('USD');
  const [selectedType, setSelectedType] = useState<'subscription' | 'campaign' | 'leads'>('subscription');

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

  useEffect(() => {
    if (!loading) {
      fetchPlans();
    }
  }, [loading, selectedCurrency, selectedType]);

  const checkAdminAccess = async () => {
    try {
      const res = await fetch("/api/users/me");
      const data = await res.json();
      
      if (data.appUser?.is_admin !== 1) {
        setError("You do not have admin access to this page.");
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to check admin access:", error);
      setError("Failed to verify admin access");
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch(`/api/admin/billing-plans?currency=${selectedCurrency}&type=${selectedType}`);
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (error) {
      console.error("Failed to fetch billing plans:", error);
    }
  };

  const handleCreate = () => {
    const newPlan: BillingPlan = {
      id: '',
      plan_type: selectedType,
      name: '',
      description: null,
      currency: selectedCurrency,
      amount: 0,
      billing_interval: selectedType === 'subscription' ? 'monthly' : null,
      campaign_limit: selectedType === 'subscription' ? 1 : (selectedType === 'campaign' ? 1 : null),
      lead_limit: selectedType === 'leads' ? 100 : null,
      features: [],
      is_active: true,
      display_order: plans.length,
      is_popular: false,
      remove_watermark: false,
      allow_background_image: false,
      allow_logo_upload: false,
      allow_external_border: false,
      allow_qr_code: false,
    };
    setEditingPlan(newPlan);
    setIsCreating(true);
  };

  const handleEdit = (plan: BillingPlan) => {
    setEditingPlan({ ...plan });
    setIsCreating(false);
  };

  const handleCancel = () => {
    setEditingPlan(null);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!editingPlan) return;

    setSaving(true);
    try {
      const url = isCreating ? '/api/admin/billing-plans' : `/api/admin/billing-plans/${editingPlan.id}`;
      const method = isCreating ? 'POST' : 'PATCH';

      console.log('Saving plan:', editingPlan.name, 'Currency:', editingPlan.currency);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPlan),
      });

      if (res.ok) {
        // If editing a KES plan, sync changes to USD plan
        if (editingPlan.currency === 'KES' && !isCreating) {
          console.log('Attempting to sync KES plan to USD...');
          const syncResult = await syncToOtherCurrency(editingPlan);
          if (syncResult.success) {
            console.log('✓ Successfully synced to USD plan:', syncResult.message);
            alert(`✓ Plan saved and synced to USD successfully!\n${syncResult.message}`);
          } else {
            console.warn('⚠ Sync issue:', syncResult.message);
            alert(`Plan saved but sync issue: ${syncResult.message}`);
          }
        } else {
          alert('Plan saved successfully!');
        }
        
        // Refresh the current view
        await fetchPlans();
        handleCancel();
      } else {
        alert('Failed to save billing plan');
      }
    } catch (error) {
      console.error('Failed to save billing plan:', error);
      alert('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const syncToOtherCurrency = async (kesPlan: BillingPlan): Promise<{ success: boolean; message: string }> => {
    try {
      // Conversion rate: 100 KES = 1 USD
      const CONVERSION_RATE = 100;
      
      console.log('Fetching USD plans for type:', kesPlan.plan_type);
      
      // Fetch all USD plans of the same type
      const res = await fetch(`/api/admin/billing-plans?currency=USD&type=${kesPlan.plan_type}`);
      if (!res.ok) {
        const errorMsg = 'Failed to fetch USD plans for syncing';
        console.error(errorMsg);
        return { success: false, message: errorMsg };
      }
      
      const data = await res.json();
      const usdPlans = data.plans || [];
      
      console.log(`Found ${usdPlans.length} USD plans:`, usdPlans.map((p: BillingPlan) => p.name));
      console.log('Looking for match for KES plan:', kesPlan.name);
      
      // Find matching USD plan by name (exact match, case-insensitive)
      const matchingUsdPlan = usdPlans.find((plan: BillingPlan) => {
        const kesBaseName = kesPlan.name.toLowerCase().trim();
        const usdBaseName = plan.name.toLowerCase().trim();
        const matches = kesBaseName === usdBaseName;
        console.log(`Comparing: "${kesBaseName}" vs "${usdBaseName}" = ${matches}`);
        return matches;
      });
      
      if (!matchingUsdPlan) {
        const errorMsg = `No matching USD plan found for: "${kesPlan.name}". Available USD plans: ${usdPlans.map((p: BillingPlan) => `"${p.name}"`).join(', ')}`;
        console.warn(errorMsg);
        return { success: false, message: errorMsg };
      }
      
      console.log('Found matching USD plan:', matchingUsdPlan.name, 'ID:', matchingUsdPlan.id);
      
      // Sync all properties except ID and currency, converting amount
      const convertedAmount = Math.round((kesPlan.amount / CONVERSION_RATE) * 100) / 100;
      const syncedData = {
        name: kesPlan.name,
        description: kesPlan.description,
        amount: convertedAmount,
        billing_interval: kesPlan.billing_interval,
        campaign_limit: kesPlan.campaign_limit,
        lead_limit: kesPlan.lead_limit,
        features: kesPlan.features,
        is_active: kesPlan.is_active,
        display_order: kesPlan.display_order,
        is_popular: kesPlan.is_popular,
      };
      
      console.log('Syncing data to USD plan:', syncedData);
      console.log(`Amount conversion: KES ${kesPlan.amount} → USD ${convertedAmount}`);
      
      const updateRes = await fetch(`/api/admin/billing-plans/${matchingUsdPlan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncedData),
      });
      
      if (!updateRes.ok) {
        const errorMsg = 'Failed to update USD plan - server error';
        console.error(errorMsg, await updateRes.text());
        return { success: false, message: errorMsg };
      }
      
      const successMsg = `Synced "${kesPlan.name}" from KES ${kesPlan.amount} to USD ${convertedAmount}`;
      console.log('✓', successMsg);
      return { success: true, message: successMsg };
    } catch (error) {
      const errorMsg = `Error syncing to USD: ${error}`;
      console.error(errorMsg);
      return { success: false, message: errorMsg };
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this billing plan?')) return;

    try {
      const res = await fetch(`/api/admin/billing-plans/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchPlans();
      } else {
        alert('Failed to delete billing plan');
      }
    } catch (error) {
      console.error('Failed to delete billing plan:', error);
      alert('An error occurred while deleting');
    }
  };

  const handleMoveUp = async (plan: BillingPlan) => {
    if (plan.display_order === 0) return;

    try {
      await fetch(`/api/admin/billing-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: plan.display_order - 1 }),
      });
      await fetchPlans();
    } catch (error) {
      console.error('Failed to reorder:', error);
    }
  };

  const handleMoveDown = async (plan: BillingPlan) => {
    if (plan.display_order === plans.length - 1) return;

    try {
      await fetch(`/api/admin/billing-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: plan.display_order + 1 }),
      });
      await fetchPlans();
    } catch (error) {
      console.error('Failed to reorder:', error);
    }
  };

  const addFeature = () => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: [...editingPlan.features, ''],
    });
  };

  const updateFeature = (index: number, value: string) => {
    if (!editingPlan) return;
    const newFeatures = [...editingPlan.features];
    newFeatures[index] = value;
    setEditingPlan({
      ...editingPlan,
      features: newFeatures,
    });
  };

  const removeFeature = (index: number) => {
    if (!editingPlan) return;
    const newFeatures = editingPlan.features.filter((_, i) => i !== index);
    setEditingPlan({
      ...editingPlan,
      features: newFeatures,
    });
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

  const getIcon = (type: string) => {
    switch (type) {
      case 'subscription':
        return CreditCard;
      case 'campaign':
        return Package;
      case 'leads':
        return Users;
      default:
        return DollarSign;
    }
  };

  const Icon = getIcon(selectedType);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Billing Management</h1>
              <p className="text-gray-600 mt-1">Manage subscription plans and pay-per options</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/admin")}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Back to Admin
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Plan Type</label>
              <div className="grid grid-cols-3 gap-2">
                {['subscription', 'campaign', 'leads'].map((type) => {
                  const TypeIcon = getIcon(type);
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type as any)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        selectedType === type
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <TypeIcon className="w-5 h-5 text-indigo-600" />
                        <span className="font-medium text-sm capitalize">{type}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
              <div className="grid grid-cols-2 gap-2">
                {['USD', 'KES'].map((currency) => (
                  <button
                    key={currency}
                    onClick={() => setSelectedCurrency(currency as any)}
                    className={`p-3 rounded-xl border-2 text-center font-semibold transition-all ${
                      selectedCurrency === currency
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {currency} ({currency === 'USD' ? '$' : 'KSh'})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Add New Button */}
        <div className="flex justify-end">
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add New {selectedType === 'subscription' ? 'Plan' : 'Option'}</span>
          </button>
        </div>

        {/* Plans List */}
        <div className="space-y-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl shadow-lg border-2 p-6 ${
                plan.is_popular ? 'border-indigo-500' : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Icon className="w-6 h-6 text-indigo-600" />
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    {plan.is_popular && (
                      <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold">
                        POPULAR
                      </span>
                    )}
                    {!plan.is_active && (
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
                        INACTIVE
                      </span>
                    )}
                  </div>
                  
                  {plan.description && (
                    <p className="text-gray-600 mb-3">{plan.description}</p>
                  )}

                  <div className="flex items-center space-x-4 mb-3">
                    <span className="text-3xl font-bold text-gray-900">
                      {plan.currency === 'KES' ? 'KSh' : '$'}{plan.amount}
                    </span>
                    {plan.billing_interval && (
                      <span className="text-gray-600">/ {plan.billing_interval}</span>
                    )}
                    {plan.campaign_limit && (
                      <span className="text-sm text-gray-600">
                        • {plan.campaign_limit} campaign{plan.campaign_limit > 1 ? 's' : ''}
                      </span>
                    )}
                    {plan.lead_limit && (
                      <span className="text-sm text-gray-600">
                        • {plan.lead_limit} leads
                      </span>
                    )}
                  </div>

                  {plan.features.length > 0 && (
                    <ul className="space-y-1">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-gray-700">• {feature}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleMoveUp(plan)}
                    disabled={plan.display_order === 0}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(plan)}
                    disabled={plan.display_order === plans.length - 1}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(plan)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {plans.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No {selectedType} plans found for {selectedCurrency}</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit/Create Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {isCreating ? 'Create New' : 'Edit'} {selectedType === 'subscription' ? 'Plan' : 'Option'}
              </h2>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Starter Plan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={editingPlan.description || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                  <input
                    type="number"
                    value={editingPlan.amount}
                    onChange={(e) => setEditingPlan({ ...editingPlan, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                    step="0.01"
                  />
                </div>

                {selectedType === 'subscription' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Billing Interval</label>
                    <select
                      value={editingPlan.billing_interval || 'monthly'}
                      onChange={(e) => setEditingPlan({ ...editingPlan, billing_interval: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}
              </div>

              {(selectedType === 'subscription' || selectedType === 'campaign') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Limit</label>
                  <input
                    type="number"
                    value={editingPlan.campaign_limit || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, campaign_limit: parseInt(e.target.value) || null })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="1"
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              )}

              {(selectedType === 'subscription' || selectedType === 'campaign' || selectedType === 'leads') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lead Credits</label>
                  <input
                    type="number"
                    value={editingPlan.lead_limit || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, lead_limit: parseInt(e.target.value) || null })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="1"
                    placeholder={selectedType === 'leads' ? 'Required' : 'Leave empty for unlimited'}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
                <div className="space-y-2">
                  {editingPlan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => updateFeature(idx, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Feature description"
                      />
                      <button
                        onClick={() => removeFeature(idx)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addFeature}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                  >
                    + Add Feature
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingPlan.is_active}
                    onChange={(e) => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingPlan.is_popular}
                    onChange={(e) => setEditingPlan({ ...editingPlan, is_popular: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Mark as Popular</span>
                </label>
              </div>

              <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-xl">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Feature Entitlements</h4>
                
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={!!(editingPlan as any).remove_watermark}
                      onChange={(e) => setEditingPlan({ ...editingPlan, remove_watermark: e.target.checked } as any)}
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Remove "Powered by PromoGauge" watermark</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-7">Allows users to hide the PromoGauge watermark on their campaigns</p>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={!!(editingPlan as any).allow_background_image}
                      onChange={(e) => setEditingPlan({ ...editingPlan, allow_background_image: e.target.checked } as any)}
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Allow background image upload</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-7">Enables users to upload custom background images for their campaigns</p>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={!!(editingPlan as any).allow_logo_upload}
                      onChange={(e) => setEditingPlan({ ...editingPlan, allow_logo_upload: e.target.checked } as any)}
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Allow logo upload</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-7">Enables users to upload custom logos for their campaigns</p>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={!!(editingPlan as any).allow_external_border}
                      onChange={(e) => setEditingPlan({ ...editingPlan, allow_external_border: e.target.checked } as any)}
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Allow external border customization</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-7">Enables users to customize external borders with themes, colors, and animations</p>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={!!(editingPlan as any).allow_qr_code}
                      onChange={(e) => setEditingPlan({ ...editingPlan, allow_qr_code: e.target.checked } as any)}
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Allow QR code generation</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-7">Enables users to generate and display QR codes for their campaigns</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editingPlan.name || editingPlan.amount <= 0}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
