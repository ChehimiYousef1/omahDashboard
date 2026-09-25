import type { LucideIcon } from "lucide-react";
import {
  Users,
  Building2,
  Briefcase,
  FileText,
  Activity,
  Percent,
  Calendar,
  MessageSquare,
} from "lucide-react";

export interface KpiCard {
  label: string;
  value: string;
  change: string;
  period: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

export const kpiCards: KpiCard[] = [
  {
    label: "Registered members",
    value: "125,430",
    change: "+12.4%",
    period: "May 12 - Jun 11, 2025",
    icon: Users,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    label: "Weekly active users",
    value: "78,982",
    change: "+8.7%",
    period: "May 12 - Jun 11, 2025",
    icon: Activity,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-650",
  },
  {
    label: "Monthly retention rate (%)",
    value: "84.2%",
    change: "+2.1%",
    period: "May 12 - Jun 11, 2025",
    icon: Percent,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    label: "Live event attendees (total)",
    value: "9,842",
    change: "+15.3%",
    period: "May 12 - Jun 11, 2025",
    icon: Calendar,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  {
    label: "Q&A threads posted",
    value: "1,204",
    change: "+8.9%",
    period: "May 12 - Jun 11, 2025",
    icon: MessageSquare,
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
  },
  {
    label: "Companies",
    value: "3,210",
    change: "+6.1%",
    period: "May 12 - Jun 11, 2025",
    icon: Building2,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    label: "Open Jobs",
    value: "2,487",
    change: "+9.8%",
    period: "May 12 - Jun 11, 2025",
    icon: Briefcase,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
  {
    label: "Applicants",
    value: "18,763",
    change: "+10.2%",
    period: "May 12 - Jun 11, 2025",
    icon: FileText,
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
  },
];

export const userGrowthData = [
  { date: "May 12", total: 118000, active: 72000 },
  { date: "May 19", total: 120500, active: 74500 },
  { date: "May 26", total: 122800, active: 76200 },
  { date: "Jun 2", total: 124200, active: 77500 },
  { date: "Jun 9", total: 125430, active: 78982 },
];

export const engagementData = [
  { week: "W1", likes: 4200, comments: 1800, shares: 920 },
  { week: "W2", likes: 5100, comments: 2100, shares: 1100 },
  { week: "W3", likes: 4800, comments: 1950, shares: 1050 },
  { week: "W4", likes: 5600, comments: 2300, shares: 1280 },
];

export const pipelineStages = [
  { stage: "Applied", count: 8763, percent: 46.7, change: "+8.2%", color: "bg-blue-500" },
  { stage: "Reviewed", count: 5231, percent: 27.9, change: "+5.1%", color: "bg-indigo-500" },
  { stage: "Interview", count: 2194, percent: 11.7, change: "+3.4%", color: "bg-violet-500" },
  { stage: "Hired", count: 1575, percent: 8.4, change: "+2.8%", color: "bg-emerald-500" },
];

export const recentUsers = [
  {
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    role: "User",
    status: "Active" as const,
    company: "—",
    lastActive: "2 min ago",
    avatar: "SJ",
  },
  {
    name: "Michael Chen",
    email: "m.chen@techcorp.com",
    role: "Recruiter",
    status: "Active" as const,
    company: "TechCorp",
    lastActive: "15 min ago",
    avatar: "MC",
  },
  {
    name: "Emily Davis",
    email: "emily@startup.io",
    role: "Employer",
    status: "Active" as const,
    company: "StartupIO",
    lastActive: "1 hr ago",
    avatar: "ED",
  },
  {
    name: "James Wilson",
    email: "j.wilson@mail.com",
    role: "User",
    status: "Inactive" as const,
    company: "—",
    lastActive: "3 days ago",
    avatar: "JW",
  },
];

export const communications = [
  {
    title: "Platform Maintenance",
    description: "Scheduled maintenance on Jun 15, 2025 from 2–4 AM UTC.",
    time: "2 hours ago",
    icon: "wrench" as const,
  },
  {
    title: "New Feature Release",
    description: "Job matching algorithm v2.0 is now live for all users.",
    time: "1 day ago",
    icon: "sparkles" as const,
  },
  {
    title: "Community Guidelines Update",
    description: "Updated policies for professional conduct on the platform.",
    time: "3 days ago",
    icon: "book" as const,
  },
];

export const moderationItems = [
  { label: "Flagged Users", count: 12, color: "text-red-600", bg: "bg-red-50" },
  { label: "Reported Posts", count: 23, color: "text-orange-600", bg: "bg-orange-50" },
  { label: "Suspicious Activity", count: 7, color: "text-amber-600", bg: "bg-amber-50" },
];

export const systemHealth = [
  { label: "API Status", value: "Operational", status: "healthy" as const },
  { label: "Server Health", value: "Healthy", status: "healthy" as const },
  { label: "Database Status", value: "Healthy", status: "healthy" as const },
  { label: "Error Count", value: "7", status: "warning" as const },
  { label: "Uptime", value: "99.98%", status: "healthy" as const },
];

export const settingsSummary = [
  { label: "Admin Users", value: "8" },
  { label: "Roles", value: "6" },
  { label: "Permissions", value: "48" },
  { label: "SSO", value: "Enabled" },
  { label: "2FA Enforcement", value: "Enabled" },
];

export const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { id: "users", label: "Users", icon: "users" },
  { id: "emails", label: "Campaign Outreach", icon: "mail" },
  { id: "communications", label: "Communications", icon: "message-square" },
  { id: "companies", label: "Companies", icon: "building-2" },
  { id: "posts", label: "Posts", icon: "message-square" },
  { id: "jobs", label: "Jobs & Internships", icon: "briefcase" },
  { id: "applications", label: "Applicants", icon: "file-text" },
  { id: "calendar", label: "Calendar", icon: "calendar-days" },
  { id: "reports", label: "Reports", icon: "flag" },
  { id: "analytics", label: "Analytics", icon: "bar-chart-3" },
  ...(import.meta.env.DEV
    ? [
        {
          id: "developer",
          label: "Developer Tools",
          icon: "code-2",
        },
      ]
    : []),
  { id: "settings", label: "Settings", icon: "settings" },
];
