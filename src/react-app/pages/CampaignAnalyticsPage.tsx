import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import CampaignAnalytics from "@/react-app/components/CampaignAnalytics";
import QRCodeGenerator from "@/react-app/components/QRCodeGenerator";
import SocialShare from "@/react-app/components/SocialShare";
import { Loader2, ArrowLeft, QrCode, Share2 } from "lucide-react";
import type { Campaign } from "@/shared/types";

export default function CampaignAnalyticsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isPending } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"analytics" | "qr" | "share">("analytics");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [hasQRCode, setHasQRCode] = useState(false);

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchCampaign();
      fetchQREntitlement();
    }
  }, [user, id]);

  const fetchQREntitlement = async () => {
    try {
      const res = await fetch("/api/billing/qr-code-entitlement");
      if (res.ok) {
        const data = await res.json();
        setHasQRCode(data.has_qr_code);
      }
    } catch (error) {
      console.error("Failed to fetch QR code entitlement:", error);
    }
  };

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCampaign(data);
      } else {
        navigate("/campaigns");
      }
    } catch (error) {
      console.error("Failed to fetch campaign:", error);
      navigate("/campaigns");
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

  if (!campaign) {
    return null;
  }

  const publicUrl = `https://promoguage.mocha.app/campaign/${campaign.id}`;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/campaigns/${id}`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
              <p className="text-gray-600 mt-1">Analytics & Sharing</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "analytics"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span>Analytics</span>
              </div>
            </button>
            {hasQRCode && (
              <button
                onClick={() => setActiveTab("qr")}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  activeTab === "qr"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <QrCode className="w-4 h-4" />
                  <span>QR Code</span>
                </div>
              </button>
            )}
            <button
              onClick={() => setActiveTab("share")}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "share"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </div>
            </button>
          </div>

          <div className="p-6">
            {activeTab === "analytics" && (
              <CampaignAnalytics 
                campaignId={campaign.id} 
                campaignType={campaign.campaign_type || 'spinwheel'}
              />
            )}

            {activeTab === "qr" && hasQRCode && (
              <div className="max-w-md mx-auto space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">QR Code</h2>
                  <p className="text-gray-600">
                    Download or copy this QR code to share your campaign offline
                  </p>
                </div>
                <QRCodeGenerator url={publicUrl} campaignName={campaign.name} />
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 text-center">
                    Print this QR code on flyers, posters, or business cards to let people
                    easily access your campaign
                  </p>
                </div>
              </div>
            )}

            {activeTab === "share" && (
              <div className="max-w-md mx-auto space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Share Campaign</h2>
                  <p className="text-gray-600">
                    Share your campaign on social media to reach more people
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign URL
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={publicUrl}
                      readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-600 text-sm"
                    />
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(publicUrl);
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      }}
                      className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                        copiedUrl 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {copiedUrl ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <SocialShare
                  url={publicUrl}
                  title={campaign.name}
                  description="Spin the wheel and win amazing prizes!"
                />

                <div className="bg-indigo-50 rounded-xl p-4 mt-6">
                  <h3 className="font-semibold text-indigo-900 mb-2">Sharing Tips</h3>
                  <ul className="space-y-2 text-sm text-indigo-800">
                    <li>• Share during peak hours for maximum engagement</li>
                    <li>• Add eye-catching images to your social posts</li>
                    <li>• Use relevant hashtags to reach a wider audience</li>
                    <li>• Encourage people to share with their networks</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
