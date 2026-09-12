import { useEffect, useState, useMemo } from "react";
import { fetchUsers, type User } from "../services/api";
import { Header } from "../components/layout/Header";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Users, UserCheck, ShieldCheck, UserX, BarChart3, TrendingUp, Compass, Award } from "lucide-react";

interface TooltipEntry {
  name?: string;
  value?: string | number;
  stroke?: string;
  fill?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white/95 p-3 shadow-xl backdrop-blur-md text-[11px]">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        {payload.map((entry, index: number) => (
          <p key={index} className="font-semibold" style={{ color: entry.stroke || entry.fill }}>
            {entry.name}: <span className="font-extrabold text-slate-950">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function AnalyticsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchUsers();
        setUsers(data);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load user analytics data"
        );
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const stats = useMemo(() => {
    if (users.length === 0) return null;

    const total = users.length;
    const active = users.filter(u => u.status === 'Active').length;
    const verified = users.filter(u => u.isVerified).length;
    const pending = users.filter(u => u.status === 'Pending').length;
    const suspended = users.filter(u => u.status === 'Suspended').length;

    // 1. Gender breakdown
    const genderMap: Record<string, number> = {};
    users.forEach(u => {
      const g = u.gender || 'Unknown';
      genderMap[g] = (genderMap[g] || 0) + 1;
    });
    const genderData = Object.entries(genderMap).map(([name, value]) => ({ name, value }));

    // 2. Student vs Professional
    let students = 0;
    let professionals = 0;
    users.forEach(u => {
      if (u.isStudent) students++;
      else professionals++;
    });
    const occupationData = [
      { name: "Students", value: students },
      { name: "Professionals", value: professionals }
    ];

    // 3. Country breakdown (Top 5)
    const countryMap: Record<string, number> = {};
    users.forEach(u => {
      const c = u.country || 'Unknown';
      countryMap[c] = (countryMap[c] || 0) + 1;
    });
    const countryData = Object.entries(countryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 4. City breakdown (Top 5)
    const cityMap: Record<string, number> = {};
    users.forEach(u => {
      const c = u.city || 'Unknown';
      cityMap[c] = (cityMap[c] || 0) + 1;
    });
    const cityData = Object.entries(cityMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 5. Profession breakdown (Top 5)
    const professionMap: Record<string, number> = {};
    users.forEach(u => {
      const p = u.profession || 'Unknown';
      professionMap[p] = (professionMap[p] || 0) + 1;
    });
    const professionData = Object.entries(professionMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 6. Active vs Inactive (status) & Verified vs Unverified
    const statusBreakdown = [
      { name: "Active", value: active },
      { name: "Inactive", value: total - active }
    ];
    const verificationBreakdown = [
      { name: "Verified", value: verified },
      { name: "Unverified", value: total - verified }
    ];

    // 7. Monthly growth (joinedDate: YYYY-MM-DD)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const growthMap: Record<string, number> = {};
    users.forEach(u => {
      if (u.joinedDate) {
        const monthNum = parseInt(u.joinedDate.split('-')[1], 10) - 1;
        if (monthNum >= 0 && monthNum < 12) {
          const monthName = months[monthNum];
          growthMap[monthName] = (growthMap[monthName] || 0) + 1;
        }
      }
    });

    // Make cumulative signups
    let runningTotal = 0;
    const growthData = months
      .map(m => {
        const signups = growthMap[m] || 0;
        runningTotal += signups;
        return { name: m, "New Signups": signups, "Total Users": runningTotal };
      })
      .filter(d => d["Total Users"] > 0); // Only show months that have data

    // 8. Key Insights calculations:
    // Most active user group (Top combination of profession and country)
    const cohortMap: Record<string, number> = {};
    users.forEach(u => {
      if (u.profession && u.country) {
        const key = `${u.profession}s in ${u.country}`;
        cohortMap[key] = (cohortMap[key] || 0) + 1;
      }
    });
    const topCohort = Object.entries(cohortMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "Students in US";

    // Most common industry/profession
    const topProfession = professionData[0]?.name || "Software Engineering";

    // Most engaged demographic (Group with highest average trust score)
    // Let's compare Student vs Professional trust score
    const studentTrust = users.filter(u => u.isStudent);
    const profTrust = users.filter(u => !u.isStudent);
    const avgStudent = studentTrust.reduce((sum, u) => sum + (u.trustScore || 0), 0) / (studentTrust.length || 1);
    const avgProf = profTrust.reduce((sum, u) => sum + (u.trustScore || 0), 0) / (profTrust.length || 1);
    const topDemographic = avgStudent > avgProf
      ? `Students (Avg Trust Score: ${avgStudent.toFixed(0)}%)`
      : `Professionals (Avg Trust Score: ${avgProf.toFixed(0)}%)`;

    return {
      total,
      active,
      verified,
      pending,
      suspended,
      genderData,
      occupationData,
      countryData,
      cityData,
      professionData,
      statusBreakdown,
      verificationBreakdown,
      growthData,
      topCohort,
      topProfession,
      topDemographic
    };
  }, [users]);

  // Colors for charts
  const COLORS = ["#0ea5e9", "#c084fc", "#f43f5e", "#10b981", "#f59e0b"];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50 p-12 text-center text-red-600">
        <p className="font-semibold">Error Loading Analytics</p>
        <p className="mt-2 text-sm text-red-500">{error || "No data available"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <Header title="User Distribution Analytics" />

      {/* Description & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 -mt-3 pb-2">
        <p className="text-sm text-slate-500">
          Real-time visual breakdowns and engagement cohorts computed directly from active platform users.
        </p>
        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Database Stream</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Users</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            Registered accounts across all regions
          </div>
        </div>

        {/* Active Users */}
        <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Users</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.active}</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {(stats.active / stats.total * 100).toFixed(0)}% platform engagement rate
          </div>
        </div>

        {/* Verified Accounts */}
        <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Verified Accounts</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.verified}</p>
            </div>
            <div className="p-3 bg-sky-50 text-sky-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-sky-600 font-semibold flex items-center gap-1">
            <span>🛡️ {(stats.verified / stats.total * 100).toFixed(0)}% verification rate</span>
          </div>
        </div>

        {/* Flagged/Suspended */}
        <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Flagged/Suspended</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.suspended}</p>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <UserX className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            Accounts suspended for compliance
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Monthly Signup Growth Trend */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Monthly Signup Growth</h2>
              <p className="text-xs text-slate-400">Total registered user curve and monthly signups</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-slate-500" />
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="Total Users" stroke="#0ea5e9" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="New Signups" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Demographic Distribution */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Demographic Distribution</h2>
            <p className="text-xs text-slate-400">Gender and student status breakdowns</p>
          </div>
          <div className="grid grid-cols-2 gap-4 h-60">
            {/* Gender Pie Chart */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-500 mb-2">Gender</span>
              <div className="h-36 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={45}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.genderData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 text-[10px] space-y-1 w-full flex flex-col items-start px-2">
                {stats.genderData.map((d, i) => (
                  <span key={d.name} className="flex items-center gap-1.5 text-slate-600 truncate max-w-full font-medium">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {d.name}: {d.value}
                  </span>
                ))}
              </div>
            </div>

            {/* Student vs Professional Donut Chart */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-500 mb-2">Career Stage</span>
              <div className="h-36 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.occupationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={45}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.occupationData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 text-[10px] space-y-1 w-full flex flex-col items-start px-2">
                {stats.occupationData.map((d, i) => (
                  <span key={d.name} className="flex items-center gap-1.5 text-slate-600 truncate max-w-full font-medium">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: COLORS[(i + 3) % COLORS.length] }} />
                    {d.name}: {d.value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Location & Profession Breakdowns */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Country Breakdown */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-900">Geographic: Top Countries</h2>
            <p className="text-xs text-slate-400">Top registered users by nationality</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.countryData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#475569", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* City Breakdown */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-900">Geographic: Top Cities</h2>
            <p className="text-xs text-slate-400">Top user concentrations by metro area</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.cityData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#475569", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Professions & Stacked Status */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 md:col-span-2 xl:col-span-1">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Top Professions</h2>
            <p className="text-xs text-slate-400">Top specialized industries</p>
          </div>
          <div className="space-y-4 pt-2">
            {stats.professionData.map((d, index) => (
              <div key={d.name} className="flex flex-col space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>{d.name}</span>
                  <span className="text-slate-400">{d.value} ({((d.value / stats.total) * 100).toFixed(0)}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(d.value / stats.total) * 100}%`,
                      backgroundColor: COLORS[index % COLORS.length]
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Management Insights & Demographics */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Most Active Cohort */}
        <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between h-44">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500/20" />
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Active Cohorts</p>
              <h3 className="text-sm font-semibold text-slate-800">Most Active User Group</h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-500 rounded-lg group-hover:rotate-12 transition-transform duration-300">
              <Compass className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xl font-bold text-slate-800">{stats.topCohort}</p>
            <p className="mt-1 text-[11px] text-slate-400">Highest registration and activity volumes across regional sectors.</p>
          </div>
        </div>

        {/* Most Common Industry */}
        <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between h-44">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500/20" />
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Market Shares</p>
              <h3 className="text-sm font-semibold text-slate-800">Most Common Industries</h3>
            </div>
            <div className="p-2 bg-purple-50 text-purple-500 rounded-lg group-hover:rotate-12 transition-transform duration-300">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xl font-bold text-slate-800">{stats.topProfession}</p>
            <p className="mt-1 text-[11px] text-slate-400">Leading field based on user profiles and specialized credentials.</p>
          </div>
        </div>

        {/* Most Engaged Demographics */}
        <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between h-44">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500/20" />
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Engagement</p>
              <h3 className="text-sm font-semibold text-slate-800">Most Engaged Demographic</h3>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg group-hover:rotate-12 transition-transform duration-300">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-bold text-slate-800 truncate">{stats.topDemographic}</p>
            <p className="mt-1 text-[11px] text-slate-400">Based on trust score aggregates and regular connection frequencies.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
