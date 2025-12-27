import { useNavigate } from "react-router";
import { XCircle, ArrowLeft } from "lucide-react";

export default function BillingCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-12 h-12 text-gray-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Payment Cancelled
        </h1>
        
        <p className="text-gray-600 mb-8">
          Your payment was cancelled. No charges have been made to your account.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate("/pricing")}
            className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-indigo-500/50 transition-all duration-200"
          >
            Try Again
          </button>
          
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full px-6 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
