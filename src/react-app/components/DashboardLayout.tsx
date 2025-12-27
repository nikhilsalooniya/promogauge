import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { LayoutDashboard, Megaphone, User, LogOut, Sparkles, Menu, X, CreditCard, Crown } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const res = await fetch("/api/users/me");
        const data = await res.json();
        setIsAdmin(data.appUser?.is_admin === 1);
      } catch (error) {
        console.error("Failed to check admin status:", error);
      }
    };

    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  useEffect(() => {
    const fetchHomepageLogo = async () => {
      try {
        const res = await fetch("/api/homepage-config");
        if (res.ok) {
          const data = await res.json();
          if (data.config?.header?.logo_url) {
            setLogoUrl(data.config.header.logo_url);
          }
        }
      } catch (error) {
        console.error("Failed to fetch homepage logo:", error);
      }
    };

    fetchHomepageLogo();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Campaigns", path: "/campaigns", icon: Megaphone },
    { name: "Billing", path: "/dashboard/billing", icon: CreditCard },
    { name: "Profile", path: "/profile", icon: User },
  ];

  const adminNavItems = isAdmin ? [
    { name: "Admin", path: "/admin", icon: Crown },
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <Link to="/home" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-10 w-auto" />
                ) : (
                  <>
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hidden sm:block">
                      PromoGuage
                    </span>
                  </>
                )}
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.google_user_data.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:block mt-[73px] lg:mt-0
        `}>
          <nav className="p-4 space-y-2">
            {[...navItems, ...adminNavItems].map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/50' 
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
