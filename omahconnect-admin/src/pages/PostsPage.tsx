import { useEffect, useMemo, useState } from "react";
import { fetchPosts, type Post } from "../services/api";
import { Header } from "../components/layout/Header";
import { Search, Eye, Calendar, Globe, Lock, AlertCircle, X } from "lucide-react";

export function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [visibilityFilter, setVisibilityFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");

  // Selected Post for Modal
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    async function loadPosts() {
      try {
        const data = await fetchPosts();
        setPosts(data);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load posts"
        );
      } finally {
        setLoading(false);
      }
    }
    loadPosts();
  }, []);

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesQuery =
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "All" || post.postType === typeFilter;
      const matchesVis = visibilityFilter === "All" || post.visibility === visibilityFilter;
      const matchesRole = roleFilter === "All" || post.author_role?.toLowerCase() === roleFilter.toLowerCase();
      
      const postDate = new Date(post.created_at);
      const now = new Date();
      let matchesDate = true;
      if (dateFilter === "24h") {
        matchesDate = now.getTime() - postDate.getTime() <= 24 * 60 * 60 * 1000;
      } else if (dateFilter === "7d") {
        matchesDate = now.getTime() - postDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
      } else if (dateFilter === "30d") {
        matchesDate = now.getTime() - postDate.getTime() <= 30 * 24 * 60 * 60 * 1000;
      }

      return matchesQuery && matchesType && matchesVis && matchesRole && matchesDate;
    });
  }, [posts, searchQuery, typeFilter, visibilityFilter, roleFilter, dateFilter]);

  const handleDeletePost = (id: number) => {
    if (window.confirm("Are you sure you want to remove this post from the platform?")) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      alert("Post removed successfully (simulation).");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50 p-12 text-center text-red-600">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <p className="mt-3 font-semibold">Error Loading Posts</p>
        <p className="mt-1 text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <Header title="Platform Post Management" />

      {/* Description & Sync Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 -mt-3 pb-2 border-b border-slate-100">
        <p className="text-sm text-slate-500">
          Moderate community feed contributions, verify visibility settings, and review attachments in tabular layout.
        </p>
        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto text-emerald-600 font-semibold text-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          FEED ONLINE
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search posts or authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-4 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="All">All Types</option>
            <option value="general">General</option>
            <option value="job">Job</option>
            <option value="internship">Internship</option>
          </select>
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="All">All Visibilities</option>
            <option value="public">Public</option>
            <option value="connections">Connections</option>
            <option value="private">Private</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="All">All Author Roles</option>
            <option value="User">User</option>
            <option value="Recruiter">Recruiter</option>
            <option value="Employer">Employer</option>
            <option value="Admin">Admin</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="All">All Time</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Posts Table */}
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-450">
              <th className="px-5 py-3.5">Author</th>
              <th className="px-5 py-3.5">Post Title</th>
              <th className="px-5 py-3.5">Description Summary</th>
              <th className="px-5 py-3.5">Post Type</th>
              <th className="px-5 py-3.5">Visibility</th>
              <th className="px-5 py-3.5">Date Posted</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredPosts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No platform posts matched the criteria.
                </td>
              </tr>
            ) : (
              filteredPosts.map((post) => (
                <tr key={post.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {post.author_avatar ? (
                        <img
                          src={post.author_avatar}
                          alt="Avatar"
                          className="h-8 w-8 rounded-full object-cover border border-slate-100"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-600 text-xs">
                          {post.author_name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-slate-800">{post.author_name}</span>
                        <span className="block text-[10px] text-slate-400">{post.author_role}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-800 truncate max-w-[150px]">{post.title}</td>
                  <td className="px-5 py-4 text-slate-500 truncate max-w-[200px]">{post.description}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                      post.postType === "job"
                        ? "bg-blue-50 text-blue-700"
                        : post.postType === "internship"
                        ? "bg-purple-50 text-purple-700"
                        : "bg-slate-50 text-slate-600"
                    }`}>
                      {post.postType.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      {post.visibility === "public" ? (
                        <Globe className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Lock className="h-3 w-3 text-slate-400" />
                      )}
                      <span className="capitalize">{post.visibility}</span>
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedPost(post)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post.id)}
                        className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                        title="Moderate Post"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* POST DETAILS DIALOG */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                {selectedPost.author_avatar ? (
                  <img
                    src={selectedPost.author_avatar}
                    alt="Avatar"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                    {selectedPost.author_name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-800">{selectedPost.author_name}</h3>
                  <p className="text-[10px] text-slate-405">{selectedPost.author_role}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">{selectedPost.postType}</span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  {selectedPost.visibility === "public" ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {selectedPost.visibility}
                </span>
                <span>•</span>
                <span>{new Date(selectedPost.created_at).toLocaleDateString()}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900">{selectedPost.title}</h2>
              <p className="text-xs text-slate-650 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-200/50">
                {selectedPost.description}
              </p>

              {selectedPost.attachments && selectedPost.attachments.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-slate-200 mt-2">
                  <img
                    src={
                      typeof selectedPost.attachments[0] === "string"
                        ? selectedPost.attachments[0]
                        : selectedPost.attachments[0].url || selectedPost.attachments[0].src || ""
                    }
                    alt="Attachment"
                    className="max-h-56 w-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 text-xs font-bold pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDeletePost(selectedPost.id)}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-550"
              >
                Delete Post
              </button>
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
