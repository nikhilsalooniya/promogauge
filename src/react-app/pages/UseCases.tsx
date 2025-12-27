import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, ArrowRight } from "lucide-react";

interface Post {
  id: string;
  title: string;
  slug: string;
  featured_image_url: string;
  excerpt: string;
  published_at: string;
}

export default function UseCases() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [logo, setLogo] = useState<string>("");

  useEffect(() => {
    fetchPosts();
    fetchLogo();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts/use_cases");
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogo = async () => {
    try {
      const res = await fetch("/api/homepage-config");
      if (res.ok) {
        const data = await res.json();
        setLogo(data.config?.header?.logo_url || "");
      }
    } catch (error) {
      console.error("Failed to fetch logo:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/home" className="flex items-center">
            {logo ? (
              <img src={logo} alt="Logo" className="h-10 max-w-[180px] object-contain" />
            ) : (
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                PromoGauge
              </span>
            )}
          </a>
          <nav className="flex items-center space-x-6">
            <a href="/home" className="text-gray-700 hover:text-indigo-600 transition-colors">
              Home
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Use Cases</h1>
          <p className="text-xl text-indigo-100 max-w-3xl">
            Discover how businesses and organizations use PromoGauge to create engaging campaigns
          </p>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        {posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-lg">No posts yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
                onClick={() => navigate(`/use-cases/${post.slug}`)}
              >
                {post.featured_image_url && (
                  <div className="w-full h-48 bg-gray-200">
                    <img
                      src={post.featured_image_url}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {new Date(post.published_at).toLocaleDateString()}
                    </span>
                    <button className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-1">
                      <span>Read more</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            © {new Date().getFullYear()} PromoGauge. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
