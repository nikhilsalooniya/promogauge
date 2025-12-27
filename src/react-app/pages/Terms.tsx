import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export default function Terms() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
    try {
      const res = await fetch("/api/homepage-config");
      if (res.ok) {
        const data = await res.json();
        setLogoUrl(data.config?.header?.logo_url);
      }
    } catch (error) {
      console.error("Failed to fetch homepage config:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate("/home")} className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-10 w-auto max-w-[180px] object-contain" />
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
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate("/home")}
                className="px-4 py-2.5 text-gray-700 font-semibold hover:text-indigo-600 transition-all duration-200 hidden sm:block"
              >
                Home
              </button>
              <button
                onClick={() => navigate("/pricing")}
                className="px-4 py-2.5 text-gray-700 font-semibold hover:text-indigo-600 transition-all duration-200 hidden sm:block"
              >
                Pricing
              </button>
              {user ? (
                <button
                  onClick={() => navigate("/dashboard")}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
                >
                  Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/signin")}
                    className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigate("/signup")}
                    className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-200"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* Hero Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-6 text-gray-900">Terms & Conditions</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            These Terms govern your use of PromoGuage's campaign creation tools including Spin the Wheel, Scratch & Win, and all promotional experiences.
          </p>
        </div>

        {/* Legal Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing PromoGuage you agree to these Terms and all applicable laws. If you do not agree, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. About PromoGuage</h2>
            <p className="text-gray-700 leading-relaxed">
              PromoGuage is a platform that allows users to create interactive promotional campaigns such as Spin the Wheel and Scratch & Win, generate leads, and send automated reward messages.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>You must provide accurate signup information.</li>
              <li>You are responsible for maintaining the confidentiality of your account.</li>
              <li>Users must not impersonate others or submit fraudulent data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Campaign Content</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Users are responsible for all content they create including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Campaign names</li>
              <li>Prize descriptions</li>
              <li>Uploaded images</li>
              <li>Terms & Conditions they attach to campaigns</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              PromoGuage is not responsible for disputes between campaign creators and participants.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Prizes & Fulfillment</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Campaign creators agree to honor prizes revealed to participants unless:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>The prize inventory is exhausted</li>
              <li>The campaign has expired</li>
              <li>Fraud or abuse is detected</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              PromoGuage only facilitates delivery of reward messages, not the physical fulfillment of prizes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Billing & Payments</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Users may subscribe to plans, purchase credits, or buy campaign add-ons.</li>
              <li>All payments are handled by third-party payment processors (Paystack, Stripe, etc).</li>
              <li>Plans renew automatically unless cancelled.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Prohibited Uses</h2>
            <p className="text-gray-700 leading-relaxed mb-3">Users shall not:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Run illegal lotteries or gambling</li>
              <li>Use PromoGuage for misleading promotions</li>
              <li>Attempt to manipulate campaign outcomes</li>
              <li>Distribute malware or harmful content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Intellectual Property</h2>
            <p className="text-gray-700 leading-relaxed">
              All platform features, designs, and code belong to PromoGuage. Users retain ownership of their uploaded content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed mb-3">PromoGuage is not liable for:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Lost revenue</li>
              <li>Misconfigured campaigns</li>
              <li>User mistakes</li>
              <li>Fulfillment or delivery failures</li>
              <li>Fraudulent entries</li>
              <li>Downtime</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Termination</h2>
            <p className="text-gray-700 leading-relaxed">
              We may suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update these Terms at any time. Continued use of PromoGuage constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact</h2>
            <p className="text-gray-700 leading-relaxed">
              For questions: <a href="mailto:support@promoguage.com" className="text-indigo-600 hover:text-indigo-700 font-medium">support@promoguage.com</a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12 bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate("/home")} className="text-gray-600 hover:text-indigo-600 transition-colors">
                    Home
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate("/pricing")} className="text-gray-600 hover:text-indigo-600 transition-colors">
                    Pricing
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate("/terms")} className="text-gray-600 hover:text-indigo-600 transition-colors">
                    Terms & Conditions
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate("/privacy")} className="text-gray-600 hover:text-indigo-600 transition-colors">
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Follow Us</h3>
              <div className="flex justify-center md:justify-start space-x-4">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-indigo-600 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-indigo-600 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-indigo-600 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="text-center text-gray-500 pt-8 border-t border-gray-200">
            <p className="text-sm">© 2025 PromoGuage. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
