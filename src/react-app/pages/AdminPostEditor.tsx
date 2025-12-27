import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import RichTextEditor from "@/react-app/components/RichTextEditor";
import { Loader2, Save, Eye, Upload, X, ArrowLeft } from "lucide-react";

interface PostData {
  title: string;
  slug: string;
  category: "use_cases" | "how_it_works";
  content_html: string;
  featured_image_url: string;
  status: "draft" | "published";
  seo_title: string;
  seo_description: string;
}

export default function AdminPostEditor() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { user, isPending } = useAuth();
  const isEdit = !!slug;
  
  const [formData, setFormData] = useState<PostData>({
    title: "",
    slug: "",
    category: "use_cases",
    content_html: "",
    featured_image_url: "",
    status: "draft",
    seo_title: "",
    seo_description: "",
  });
  
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (isEdit && user) {
      fetchPost();
    }
  }, [isEdit, user, slug]);

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/admin/posts/${slug}`, {
        credentials: "include",
      });
      
      if (res.status === 403) {
        setError("You do not have admin access to this page.");
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setFormData(data.post);
      } else {
        setError("Failed to load post");
      }
    } catch (error) {
      console.error("Failed to fetch post:", error);
      setError("An error occurred while loading the post");
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: isEdit ? formData.slug : generateSlug(title),
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload an image file (PNG, JPEG, GIF, or WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      const data = new FormData();
      data.append("image", file);

      const res = await fetch("/api/admin/posts/upload-image", {
        method: "POST",
        credentials: "include",
        body: data,
      });

      if (res.ok) {
        const result = await res.json();
        setFormData({ ...formData, featured_image_url: result.url });
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to upload image");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      alert("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (publishNow: boolean = false) => {
    if (!formData.title.trim()) {
      alert("Please enter a title");
      return;
    }

    if (!formData.content_html.trim()) {
      alert("Please enter some content");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        status: publishNow ? "published" : formData.status,
      };

      const res = await fetch(
        isEdit ? `/api/admin/posts/${slug}` : "/api/admin/posts",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        await res.json();
        alert(isEdit ? "Post updated successfully!" : "Post created successfully!");
        navigate("/admin/posts");
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to save post");
      }
    } catch (error) {
      console.error("Failed to save post:", error);
      alert("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    const previewUrl = `/${formData.category.replace("_", "-")}/${formData.slug}`;
    window.open(previewUrl, "_blank");
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate("/admin/posts")}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Back to Posts
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate("/admin/posts")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEdit ? "Edit Post" : "New Post"}
              </h1>
              <p className="text-gray-600">Create engaging content for your audience</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isEdit && formData.status === "published" && (
              <button
                onClick={handlePreview}
                className="px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center space-x-2"
              >
                <Eye className="w-5 h-5" />
                <span>Preview</span>
              </button>
            )}
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-6 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? "Saving..." : "Save Draft"}</span>
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>Publish</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-semibold"
              placeholder="Enter post title..."
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL Slug
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">
                /{formData.category.replace("_", "-")}/
              </span>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: generateSlug(e.target.value) })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                placeholder="post-slug"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Auto-generated from title, but you can customize it</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="use_cases">Use Cases</option>
              <option value="how_it_works">How It Works</option>
            </select>
          </div>

          {/* Featured Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Featured Image
            </label>
            
            <div className="space-y-3">
              {formData.featured_image_url && (
                <div className="relative">
                  <img 
                    src={formData.featured_image_url} 
                    alt="Featured" 
                    className="w-full h-64 object-cover rounded-xl border border-gray-300"
                  />
                  <button
                    onClick={() => setFormData({ ...formData, featured_image_url: "" })}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <label className="block w-full cursor-pointer">
                <div className="flex items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mr-2" />
                      <span className="text-sm font-medium text-indigo-600">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-600">
                        Upload Featured Image (600×400px recommended)
                      </span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-500">or use URL</span>
                </div>
              </div>

              <input
                type="text"
                value={formData.featured_image_url}
                onChange={(e) => setFormData({ ...formData, featured_image_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://example.com/image.jpg"
              />
              <p className="text-xs text-gray-500">PNG, JPEG, GIF, or WebP (max 5MB)</p>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content <span className="text-red-500">*</span>
            </label>
            <RichTextEditor
              content={formData.content_html}
              onChange={(html) => setFormData({ ...formData, content_html: html })}
              placeholder="Write your post content here..."
            />
          </div>

          {/* SEO Section */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SEO Title
                </label>
                <input
                  type="text"
                  value={formData.seo_title}
                  onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Custom title for search engines (defaults to post title)"
                  maxLength={60}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.seo_title.length}/60 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SEO Description
                </label>
                <textarea
                  value={formData.seo_description}
                  onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Brief description for search results"
                  maxLength={160}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.seo_description.length}/160 characters
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
