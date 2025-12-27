import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { exchangeCodeForSessionToken } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await exchangeCodeForSessionToken();
        
        // Check if profile is completed
        const res = await fetch("/api/users/me");
        const data = await res.json();
        
        if (data.appUser?.profile_completed) {
          navigate("/dashboard");
        } else {
          navigate("/profile-setup");
        }
      } catch (error) {
        console.error("Authentication failed:", error);
        navigate("/home");
      }
    };

    handleCallback();
  }, [exchangeCodeForSessionToken, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="animate-spin mb-4">
        <Loader2 className="w-12 h-12 text-indigo-600" />
      </div>
      <p className="text-gray-600 text-lg">Completing sign in...</p>
    </div>
  );
}
