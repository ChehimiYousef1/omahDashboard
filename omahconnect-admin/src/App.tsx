import { useEffect, useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { DashboardPage } from "./pages/DashboardPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { PostsPage } from "./pages/PostsPage";
import { UsersPage } from "./pages/UsersPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { EmailsPage } from "./pages/EmailsPage";
import { CommunicationsPage } from "./pages/CommunicationsPage";
import { CompaniesPage } from "./pages/CompaniesPage";
import { JobsPage } from "./pages/JobsPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { DeveloperToolsPage } from "./pages/DeveloperToolsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { DialerModal } from "./components/calling/DialerModal";
import { fetchCurrentUser, type User } from "./services/api";
import { LoginPage } from "./pages/LoginPage";

const pageConfig: Record<
  string,
  { title: string; description: string }
> = {
  dashboard: { title: "Dashboard", description: "Platform metrics overview" },
  posts: { title: "Posts", description: "Moderate platform posts" },
  users: {
    title: "Users",
    description:
      "Search, view, verify, suspend, contact, and manage platform users.",
  },
  emails: {
    title: "Campaign Outreach Hub",
    description: "Draft, deploy, and manage email newsletters, recruiter updates, and bulk system notifications.",
  },
  communications: {
    title: "Communications Hub",
    description: "Manage direct messaging sessions, review auto-moderation AI flags, and broadcast notifications.",
  },
  companies: {
    title: "Companies",
    description: "Manage employer profiles, verifications, and company listings.",
  },
  jobs: {
    title: "Jobs & Internships",
    description: "Review and moderate job postings and internship listings.",
  },
  applications: {
    title: "Applicants",
    description: "View and manage all applicants synced from the Google Sheet.",
  },
  reports: {
    title: "Reports",
    description: "Generate and export platform reports and analytics.",
  },
  analytics: {
    title: "Analytics",
    description: "Deep-dive analytics for users, engagement, and growth trends.",
  },
  developer: {
    title: "Developer Tools",
    description:
      "Monitor API, server, database, logs, errors, and uptime metrics.",
  },
  settings: {
    title: "Settings & Permissions",
    description:
      "Manage admin accounts, roles, permissions, 2FA, SSO, and audit logs.",
  },
};

function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [emailTargetUserId, setEmailTargetUserId] = useState<string | null>(null);
  const [emailCampaignType, setEmailCampaignType] = useState<string | null>(null);
  const [emailRecipientType, setEmailRecipientType] = useState<"direct" | "applicant" | "bulk">("direct");

  // Calling states
  const [callingUser, setCallingUser] = useState<User | null>(null);
  const [callingType, setCallingType] = useState<'Standard Call' | 'Emergency Call' | 'Recruiter Support Call'>('Standard Call');

  // Authenticate user on load
  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await fetchCurrentUser();
        setCurrentUser(user);
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, []);

  const handleTriggerEmail = (recipientId: string, campaignType: string, recipientType: "direct" | "applicant" | "bulk" = "direct") => {
    setEmailTargetUserId(recipientId);
    setEmailCampaignType(campaignType);
    setEmailRecipientType(recipientType);
    setActiveNav("emails");
  };

  const handleClearEmailState = () => {
    setEmailTargetUserId(null);
    setEmailCampaignType(null);
    setEmailRecipientType("direct");
  };

  const handleInitiateCall = (user: User, type: 'Standard Call' | 'Emergency Call' | 'Recruiter Support Call') => {
    setCallingUser(user);
    setCallingType(type);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-sm font-semibold text-slate-400">Loading administrative console...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onSuccess={setCurrentUser} />;
  }

  const config = pageConfig[activeNav] || { title: "Admin Console", description: "" };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activeId={activeNav} onNavigate={setActiveNav} />

      <main className="ml-56 flex-1 p-6 lg:p-8">
        {activeNav === "dashboard" ? (
          <DashboardPage />
        ) : activeNav === "posts" ? (
          <PostsPage />
        ) : activeNav === "users" ? (
          <UsersPage onTriggerEmail={handleTriggerEmail} onInitiateCall={handleInitiateCall} />
        ) : activeNav === "analytics" ? (
          <AnalyticsPage />
        ) : activeNav === "emails" ? (
          <EmailsPage
            initialTargetUserId={emailTargetUserId}
            initialCampaignType={emailCampaignType}
            initialRecipientType={emailRecipientType}
            onClearInitialState={handleClearEmailState}
          />
        ) : activeNav === "communications" ? (
          <CommunicationsPage />
        ) : activeNav === "companies" ? (
          <CompaniesPage onTriggerEmail={handleTriggerEmail} onInitiateCall={handleInitiateCall} />
        ) : activeNav === "jobs" ? (
          <JobsPage />
        ) : activeNav === "applications" ? (
          <ApplicationsPage onTriggerEmail={handleTriggerEmail} />
        ) : activeNav === "reports" ? (
          <ReportsPage />
        ) : activeNav === "developer" && import.meta.env.DEV ? (
          <DeveloperToolsPage />
        ) : activeNav === "settings" ? (
          <SettingsPage />
        ) : (
          <>
            <h1 className="mb-6 text-xl font-bold text-slate-900">
              OMAHCONNECT Admin Dashboard
            </h1>
            <PlaceholderPage
              title={config.title}
              description={config.description}
            />
          </>
        )}
      </main>

      {/* Dialer Overlay */}
      {callingUser && (
        <DialerModal
          user={callingUser}
          callType={callingType}
          onClose={() => setCallingUser(null)}
        />
      )}
    </div>
  );
}

export default App;
