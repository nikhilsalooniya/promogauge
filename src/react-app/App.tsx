import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { AuthProvider } from "@getmocha/users-service/react";
import HomePage from "@/react-app/pages/Home";
import SignupPage from "@/react-app/pages/Signup";
import SignInPage from "@/react-app/pages/SignIn";
import AuthCallbackPage from "@/react-app/pages/AuthCallback";
import ProfileSetupPage from "@/react-app/pages/ProfileSetup";
import DashboardPage from "@/react-app/pages/Dashboard";
import CampaignsPage from "@/react-app/pages/Campaigns";
import CampaignDetailPage from "@/react-app/pages/CampaignDetail";
import CampaignAnalyticsPage from "@/react-app/pages/CampaignAnalyticsPage";
import ProfilePage from "@/react-app/pages/Profile";
import PublicCampaignPage from "@/react-app/pages/PublicCampaign";
import PricingPage from "@/react-app/pages/Pricing";
import BillingSuccessPage from "@/react-app/pages/BillingSuccess";
import BillingCancelPage from "@/react-app/pages/BillingCancel";
import BillingPage from "@/react-app/pages/Billing";
import DashboardBillingPage from "@/react-app/pages/DashboardBilling";
import AdminPage from "@/react-app/pages/Admin";
import AdminUsersPage from "@/react-app/pages/AdminUsers";
import AdminUserDetailPage from "@/react-app/pages/AdminUserDetail";
import AdminCampaignsPage from "@/react-app/pages/AdminCampaigns";
import AdminPaymentGatewaysPage from "@/react-app/pages/AdminPaymentGateways";
import AdminEmailIntegrationPage from "@/react-app/pages/AdminEmailIntegration";
import AdminTemplatesPage from "@/react-app/pages/AdminTemplates";
import AdminTemplateEditorPage from "@/react-app/pages/AdminTemplateEditor";
import AdminTemplateDemoPage from "@/react-app/pages/AdminTemplateDemoPage";
import AdminBillingManagement from "@/react-app/pages/AdminBillingManagement";
import AdminCreditManagement from "@/react-app/pages/AdminCreditManagement";
import AdminHomepageBuilder from "@/react-app/pages/AdminHomepageBuilder";
import AdminPostsPage from "@/react-app/pages/AdminPosts";
import AdminPostEditorPage from "@/react-app/pages/AdminPostEditor";
import UseCasesPage from "@/react-app/pages/UseCases";
import HowItWorksPage from "@/react-app/pages/HowItWorks";
import PostPage from "@/react-app/pages/Post";
import TermsPage from "@/react-app/pages/Terms";
import PrivacyPage from "@/react-app/pages/Privacy";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/profile-setup" element={<ProfileSetupPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
          <Route path="/campaigns/:id/analytics" element={<CampaignAnalyticsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/dashboard/billing" element={<DashboardBillingPage />} />
          <Route path="/billing/success" element={<BillingSuccessPage />} />
          <Route path="/billing/cancel" element={<BillingCancelPage />} />
          <Route path="/c/:slug" element={<PublicCampaignPage />} />
          <Route path="/campaign/:id" element={<PublicCampaignPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
          <Route path="/admin/campaigns" element={<AdminCampaignsPage />} />
          <Route path="/admin/payment-gateways" element={<AdminPaymentGatewaysPage />} />
          <Route path="/admin/email-integration" element={<AdminEmailIntegrationPage />} />
          <Route path="/admin/templates" element={<AdminTemplatesPage />} />
          <Route path="/admin/templates/:id" element={<AdminTemplateEditorPage />} />
          <Route path="/admin/templates/:id/demo" element={<AdminTemplateDemoPage />} />
          <Route path="/admin/billing-management" element={<AdminBillingManagement />} />
          <Route path="/admin/credits" element={<AdminCreditManagement />} />
          <Route path="/admin/homepage-builder" element={<AdminHomepageBuilder />} />
          <Route path="/admin/posts" element={<AdminPostsPage />} />
          <Route path="/admin/posts/new" element={<AdminPostEditorPage />} />
          <Route path="/admin/posts/:slug/edit" element={<AdminPostEditorPage />} />
          <Route path="/use-cases" element={<UseCasesPage />} />
          <Route path="/use-cases/:slug" element={<PostPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/how-it-works/:slug" element={<PostPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
