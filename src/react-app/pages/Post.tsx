import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Loader2, ArrowLeft, Share2, Facebook, Twitter, Linkedin } from "lucide-react";

interface Post {
  id: string;
  title: string;
  slug: string;
  category: string;
  content_html: string;
  featured_image_url: string;
  published_at: string;
  seo_title: string;
  seo_description: string;
}

export default function Post() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [logo, setLogo] = useState<string>("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchPost();
      fetchLogo();
    }
  }, [slug]);

  const fetchPost = async () => {
    try {
      const category = window.location.pathname.startsWith("/use-cases") ? "use_cases" : "how_it_works";
      const res = await fetch(`/api/posts/${category}/${slug}`);
      
      if (res.ok) {
        const data = await res.json();
        setPost(data.post);
        
        // Set SEO metadata
        if (data.post.seo_title) {
          document.title = data.post.seo_title;
        } else {
          document.title = data.post.title;
        }
        
        if (data.post.seo_description) {
          const metaDescription = document.querySelector('meta[name="description"]');
          if (metaDescription) {
            metaDescription.setAttribute('content', data.post.seo_description);
          } else {
            const meta = document.createElement('meta');
            meta.name = 'description';
            meta.content = data.post.seo_description;
            document.head.appendChild(meta);
          }
        }
      } else if (res.status === 404) {
        setNotFound(true);
      }
    } catch (error) {
      console.error("Failed to fetch post:", error);
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

  const shareOnSocial = (platform: string) => {
    const url = window.location.href;
    const title = post?.title || "";
    
    let shareUrl = "";
    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-gray-50">
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
          </div>
        </header>
        
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-600 mb-8">The post you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const categoryPath = post.category === "use_cases" ? "/use-cases" : "/how-it-works";
  const categoryName = post.category === "use_cases" ? "Use Cases" : "How It Works";

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
            <a href={categoryPath} className="text-gray-700 hover:text-indigo-600 transition-colors">
              {categoryName}
            </a>
          </nav>
        </div>
      </header>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-4 py-10">
        {/* Back Link */}
        <button
          onClick={() => navigate(categoryPath)}
          className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {categoryName}</span>
        </button>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          {post.title}
        </h1>

        {/* Metadata */}
        <div className="flex items-center space-x-4 text-gray-600 mb-8">
          <span>{new Date(post.published_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>

        {/* Featured Image */}
        {post.featured_image_url && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img
              src={post.featured_image_url}
              alt={post.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div 
          className="prose prose-indigo max-w-none mb-12 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:mb-3 prose-p:leading-relaxed prose-ul:list-disc prose-ul:ml-6 prose-ul:my-3 prose-ol:list-decimal prose-ol:ml-6 prose-ol:my-3 prose-li:mb-1 prose-li:leading-relaxed prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-img:rounded-lg"
          dangerouslySetInnerHTML={{ __html: post.content_html }}
        />

        {/* Social Share */}
        <div className="border-t border-gray-200 pt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Share this article</h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => shareOnSocial("facebook")}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              aria-label="Share on Facebook"
            >
              <Facebook className="w-5 h-5" />
            </button>
            <button
              onClick={() => shareOnSocial("twitter")}
              className="p-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
              aria-label="Share on Twitter"
            >
              <Twitter className="w-5 h-5" />
            </button>
            <button
              onClick={() => shareOnSocial("linkedin")}
              className="p-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
              aria-label="Share on LinkedIn"
            >
              <Linkedin className="w-5 h-5" />
            </button>
            <button
              onClick={copyLink}
              className="p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              aria-label="Copy link"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </article>

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
