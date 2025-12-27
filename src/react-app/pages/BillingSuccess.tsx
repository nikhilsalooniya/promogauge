import { useEffect } from "react";
import { useNavigate } from "react-router";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function BillingSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/dashboard");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Payment Successful!
        </h1>
        
        <p className="text-gray-600 mb-8">
          Your subscription has been activated. You now have access to all premium features.
        </p>

        <button
          onClick={() => navigate("/dashboard")}
          className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-indigo-500/50 transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <span>Go to Dashboard</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="text-sm text-gray-500 mt-6">
          Redirecting automatically in 5 seconds...
        </p>
      </div>
    </div>
  );
}
