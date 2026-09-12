import { useEffect, useMemo, useState } from "react";
import { fetchCompanyJobs, toggleJobFeature, updateJobStatus, type Job } from "../services/api";
import { Header } from "../components/layout/Header";
import { Search, Star, Eye, Briefcase, AlertCircle, X } from "lucide-react";

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [featuredFilter, setFeaturedFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const uniqueCategories = useMemo(() => {
    const cats = new Set(jobs.map((j) => j.category).filter(Boolean));
    return ["All", ...Array.from(cats)];
  }, [jobs]);

  // Selected Job for Quick View Modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  useEffect(() => {
    let active = true;

    void fetchCompanyJobs()
      .then((data) => {
        if (active) {
          setJobs(data);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load jobs directory"
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);


  const handleToggleFeature = async (id: string) => {
    try {
      await toggleJobFeature(id);
      // Update local state
      setJobs((prev) =>
        prev.map((j) => (j.id === id ? { ...j, isFeatured: !j.isFeatured } : j))
      );
    } catch {
      alert("Failed to toggle featured status");
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === "active" ? "expired" : "active";
      await updateJobStatus(id, nextStatus);
      setJobs((prev) =>
        prev.map((j) => (j.id === id ? { ...j, status: nextStatus } : j))
      );
    } catch {
      alert("Failed to toggle listing status");
    }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesQuery =
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "All" || job.type === typeFilter;
      const matchesStatus = statusFilter === "All" || job.status === statusFilter;
      const matchesFeatured =
        featuredFilter === "All" ||
        (featuredFilter === "Featured" && job.isFeatured === true) ||
        (featuredFilter === "Standard" && job.isFeatured !== true);
      const matchesCategory = categoryFilter === "All" || job.category === categoryFilter;
      return matchesQuery && matchesType && matchesStatus && matchesFeatured && matchesCategory;
    });
  }, [jobs, searchQuery, typeFilter, statusFilter, featuredFilter, categoryFilter]);

  if (loading && jobs.length === 0) {
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
        <p className="mt-3 font-semibold">Error Loading Jobs & Internships</p>
        <p className="mt-1 text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header title="Jobs & Internships Directory" />

      {/* Description */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 -mt-3 pb-2 border-b border-slate-100">
        <p className="text-sm text-slate-500">
          Review, star/feature, and moderate employment and internship listings across all registered employers.
        </p>
        <div className="flex items-center gap-1.5 shrink-0 text-emerald-600 font-semibold text-xs animate-pulse">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          ACTIVE LISTINGS MODERATED
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search job title, company, location..."
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
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Internship">Internship</option>
            <option value="Contract">Contract</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
          <select
            value={featuredFilter}
            onChange={(e) => setFeaturedFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="All">All Visibility</option>
            <option value="Featured">Featured Only</option>
            <option value="Standard">Standard Only</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="All">All Categories</option>
            {uniqueCategories.filter(cat => cat !== "All").map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-450">
              <th className="px-5 py-3.5">Job Title</th>
              <th className="px-5 py-3.5">Company</th>
              <th className="px-5 py-3.5">Category</th>
              <th className="px-5 py-3.5">Type</th>
              <th className="px-5 py-3.5">Location</th>
              <th className="px-5 py-3.5 text-center">Applicants</th>
              <th className="px-5 py-3.5 text-center">Featured</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  No jobs match the filters.
                </td>
              </tr>
            ) : (
              filteredJobs.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4 font-semibold text-slate-800">{j.title}</td>
                  <td className="px-5 py-4 font-semibold text-blue-600">{j.companyName}</td>
                  <td className="px-5 py-4 text-slate-650">{j.category}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      j.type === "Internship"
                        ? "bg-purple-50 text-purple-700"
                        : "bg-blue-50 text-blue-700"
                    }`}>
                      {j.type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{j.location}</td>
                  <td className="px-5 py-4 text-center text-slate-800 font-bold">{j.applicantCount}</td>
                  <td className="px-5 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleFeature(j.id)}
                      className="text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      <Star className={`h-4.5 w-4.5 ${j.isFeatured ? "fill-amber-400 text-amber-500" : ""}`} />
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      j.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {j.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedJob(j)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                        title="View Details"
                      >
                        <Eye className="h-4.5 w-4.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(j.id, j.status)}
                        className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-all ${
                          j.status === "active"
                            ? "border border-rose-200 text-rose-600 hover:bg-rose-50"
                            : "border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        {j.status === "active" ? "Expire" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* JOB DETAILS QUICK VIEW MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-slate-800">Job Specification</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-650">
              <div>
                <h2 className="text-base font-bold text-slate-900">{selectedJob.title}</h2>
                <p className="font-semibold text-blue-600 mt-0.5">{selectedJob.companyName} &bull; {selectedJob.location}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div><span className="text-slate-400">Category:</span> {selectedJob.category}</div>
                <div><span className="text-slate-400">Type:</span> {selectedJob.type}</div>
                <div><span className="text-slate-400">Status:</span> <span className="capitalize font-semibold">{selectedJob.status}</span></div>
                <div><span className="text-slate-400">Date Posted:</span> {selectedJob.postedDate}</div>
              </div>

              <div>
                <h4 className="font-bold text-slate-850 mb-1">Job Description</h4>
                <p className="leading-relaxed text-slate-600 bg-slate-50/35 border border-slate-150 p-3 rounded-lg">
                  {selectedJob.description}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs font-bold pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  handleToggleStatus(selectedJob.id, selectedJob.status);
                  setSelectedJob(null);
                }}
                className={`rounded-lg px-3 py-1.5 text-white ${
                  selectedJob.status === "active" ? "bg-rose-600 hover:bg-rose-550" : "bg-emerald-600 hover:bg-emerald-550"
                }`}
              >
                {selectedJob.status === "active" ? "Expire Listing" : "Activate Listing"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-650 hover:bg-slate-50"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
