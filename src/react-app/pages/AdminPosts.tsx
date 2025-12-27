import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import { Loader2, Plus, Edit, Trash2, Eye, FileText, ArrowLeft } from "lucide-react";

interface Post {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: string;
  published_at: string | null;
  created_at: string;
}

export default function AdminPosts() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/admin/posts", {
        credentials: "include",
      });

      if (res.status === 403) {
        setError("You do not have admin access to this page.");
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
      } else {
        setError("Failed to load posts");
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      setError("An error occurred while loading posts");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setPosts(posts.filter((p) => p.id !== postId));
      } else {
        alert("Failed to delete post");
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
      alert("An error occurred while deleting the post");
    }
  };

  const filteredPosts = posts.filter((post) => {
    if (filter === "all") return true;
    if (filter === "use_cases") return post.category === "use_cases";
    if (filter === "how_it_works") return post.category === "how_it_works";
    if (filter === "draft") return post.status === "draft";
    if (filter === "published") return post.status === "published";
    return true;
  });

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
              onClick={() => navigate("/admin")}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Back to Admin
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Posts Management</h1>
              <p className="text-gray-600">Manage Use Cases & How It Works content</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate("/admin")}
              className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:shadow-md transition-all flex items-center space-x-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Admin</span>
            </button>
            <button
              onClick={() => navigate("/admin/posts/new")}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>New Post</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Posts
            </button>
            <button
              onClick={() => setFilter("use_cases")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "use_cases"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Use Cases
            </button>
            <button
              onClick={() => setFilter("how_it_works")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "how_it_works"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              How It Works
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setFilter("published")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "published"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Published
            </button>
            <button
              onClick={() => setFilter("draft")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "draft"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Drafts
            </button>
          </div>
        </div>

        {/* Posts Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first post to get started
              </p>
              <button
                onClick={() => navigate("/admin/posts/new")}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Create Post
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Title
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Published
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPosts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{post.title}</div>
                        <div className="text-sm text-gray-500">/{post.category.replace("_", "-")}/{post.slug}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {post.category === "use_cases" ? "Use Cases" : "How It Works"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {post.status === "published" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {post.published_at
                          ? new Date(post.published_at).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          {post.status === "published" && (
                            <button
                              onClick={() =>
                                window.open(
                                  `/${post.category.replace("_", "-")}/${post.slug}`,
                                  "_blank"
                                )
                              }
                              className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="View Post"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/admin/posts/${post.slug}/edit`)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Post"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Post"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
