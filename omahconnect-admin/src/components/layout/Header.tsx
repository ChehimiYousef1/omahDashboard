import {
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  Calendar,
  X,
  BookOpen,
  Shield,
  Sparkles,
  UserRound,
  Mail,
  LogOut,
  Info
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { fetchCurrentUser, logoutCurrentUser, type User } from "../../services/api";

export function Header({ title = "OMAHCONNECT Admin Dashboard" }: { title?: string }) {
  const [user, setUser] = useState<User | null>(null);

  // Overlays State
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState("May 12 – Jun 11, 2025");

  // Notifications State
  const [notifications, setNotifications] = useState([
    { id: 1, text: "🚨 New Flag: Bruce Wayne reported a job post as Scam.", time: "2 min ago", unread: true },
    { id: 2, text: "📢 Outbox Success: Platform Maintenance Alert dispatched.", time: "1 hour ago", unread: true },
    { id: 3, text: "🏢 Verification Queue: TechCorp submitted documentation.", time: "3 hours ago", unread: true },
    { id: 4, text: "⚠️ AI Warning: Automated block triggered for ID usr-89.", time: "5 hours ago", unread: true },
    { id: 5, text: "📝 Job Post Audit: 4 new internship positions pending review.", time: "1 day ago", unread: false },
  ]);

  const notifRef = useRef<HTMLDivElement | null>(null);
  const helpRef = useRef<HTMLDivElement | null>(null);
  const dateRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch((err) => console.error("Failed to fetch user:", err));
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setShowHelpMenu(false);
      }
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
        setShowDateMenu(false);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(
          event.target as Node
        )
      ) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => n.unread).length;

  const isSuperAdmin =
    user?.role
      ?.trim()
      .toLowerCase() ===
    "super admin";


  const usesOmahProfileLogo =
    isSuperAdmin ||
    user?.consoleAccess ===
      "applicants_calendar";

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const handleToggleRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: !n.unread } : n));
  };

  const handleLogout = async () => {
    if (logoutBusy) {
      return;
    }

    setLogoutBusy(true);
    setProfileError("");

    try {
      await logoutCurrentUser();

      /*
       * Reload after the server clears the HttpOnly auth cookie.
       * App.tsx will then fail /auth/me and render LoginPage.
       */
      window.location.reload();
    } catch (error) {
      console.error(
        "Failed to logout:",
        error
      );

      setProfileError(
        "Unable to sign out. Please try again."
      );

      setLogoutBusy(false);
    }
  };

  return (
    <header className="mb-6 relative">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-xl font-bold text-slate-900">
          {title}
        </h1>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          {/* Search */}
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search users, companies, jobs..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Notifications Trigger */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setShowHelpMenu(false);
                setShowDateMenu(false);
                setShowProfileMenu(false);
              }}
              className={`relative rounded-lg p-2 transition-all ${
                showNotifMenu ? "bg-slate-100 text-blue-600" : "text-slate-500 hover:bg-slate-100"
              }`}
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-150 rounded-xl shadow-xl z-50 p-4 space-y-3 text-xs text-slate-700 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-800">Alerts Dispatch History</span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-550 transition"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleToggleRead(n.id)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                        n.unread
                          ? "bg-blue-50/20 border-blue-100 font-semibold"
                          : "bg-slate-50/30 border-slate-100 text-slate-500"
                      }`}
                    >
                      <p className="line-clamp-2">{n.text}</p>
                      <span className="block text-[9px] text-slate-400 mt-1">{n.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Help Trigger */}
          <div className="relative" ref={helpRef}>
            <button
              type="button"
              onClick={() => {
                setShowHelpMenu(!showHelpMenu);
                setShowNotifMenu(false);
                setShowDateMenu(false);
                setShowProfileMenu(false);
              }}
              className={`rounded-lg p-2 transition-all ${
                showHelpMenu ? "bg-slate-100 text-blue-600" : "text-slate-500 hover:bg-slate-100"
              }`}
              aria-label="Help"
            >
              <HelpCircle className="h-5 w-5" />
            </button>

            {/* Help Overlay Panel */}
            {showHelpMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 text-white border border-slate-800 rounded-xl shadow-xl z-50 p-4 space-y-3.5 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide text-blue-400">
                    <BookOpen className="h-4 w-4" />
                    <span>Quick Operations Guide</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHelpMenu(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
                <div className="space-y-3 text-[11px] leading-relaxed text-slate-350">
                  <div className="flex gap-2">
                    <Shield className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
                    <p>
                      <strong>Verifications:</strong> Go to the <em>Companies</em> tab to approve business documents in the Verification Queue.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Sparkles className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <p>
                      <strong>AI Moderation:</strong> Under <em>Communications</em>, view DMs containing auto-flags for crypto/spam topics.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Info className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                    <p>
                      <strong>Developer Tools:</strong> Monitor system CPU/Memory loads, or test queries inside the sandbox executor.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Account / Profile Menu */}
          <div
            className="relative"
            ref={profileRef}
          >
            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(
                  previous =>
                    !previous
                );

                setShowNotifMenu(false);
                setShowHelpMenu(false);
                setShowDateMenu(false);
                setProfileError("");
              }}
              className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-left transition-all ${
                showProfileMenu
                  ? "border-blue-300 bg-blue-50/30 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
              aria-label="Open account menu"
              aria-haspopup="menu"
              aria-expanded={
                showProfileMenu
              }
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={
                    user.name
                      ? `${user.name} profile`
                      : "Profile"
                  }
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200"
                />
              ) : usesOmahProfileLogo ? (
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                  <img
                    src="/branding/omah-logo.svg"
                    alt="OMAH account"
                    className="h-full w-full object-contain p-1.5"
                  />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                  {user?.name
                    ? user.name
                        .substring(
                          0,
                          2
                        )
                        .toUpperCase()
                    : "AD"}
                </div>
              )}

              <div className="min-w-0 text-left">
                <p className="max-w-40 truncate text-sm font-semibold text-slate-900">
                  {user?.name ||
                    "Admin"}
                </p>

                <p className="max-w-40 truncate text-xs text-slate-500">
                  {user?.role ||
                    "Administrator"}
                </p>
              </div>

              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${
                  showProfileMenu
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {showProfileMenu && (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-fade-in"
              >
                <div className="border-b border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center gap-3">
                    {user?.avatar ? (
                      <img
                        src={
                          user.avatar
                        }
                        alt={
                          user.name
                            ? `${user.name} profile`
                            : "Profile"
                        }
                        className="h-11 w-11 rounded-full object-cover ring-2 ring-white shadow-sm"
                      />
                    ) : usesOmahProfileLogo ? (
                      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200 shadow-sm">
                        <img
                          src="/branding/omah-logo.svg"
                          alt="OMAH account"
                          className="h-full w-full object-contain p-2"
                        />
                      </div>
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                        {user?.name
                          ? user.name
                              .substring(
                                0,
                                2
                              )
                              .toUpperCase()
                          : "AD"}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {user?.name ||
                          "Administrator"}
                      </p>

                      <p className="truncate text-xs font-medium text-blue-600">
                        {user?.role ||
                          "Administrator"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Signed in account
                  </p>

                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Email
                      </p>

                      <p className="truncate text-xs font-medium text-slate-700">
                        {user?.email ||
                          "Not available"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Account role
                      </p>

                      <p className="truncate text-xs font-medium text-slate-700">
                        {user?.role ||
                          "Not available"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                    <p className="text-[10px] font-semibold text-emerald-700">
                      Authenticated session
                    </p>

                    <p className="mt-0.5 text-[10px] leading-relaxed text-emerald-600">
                      You are securely signed in to the OMAH administration console.
                    </p>
                  </div>

                  {profileError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-medium text-red-600"
                    >
                      {profileError}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 p-2">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      void handleLogout();
                    }}
                    disabled={
                      logoutBusy
                    }
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" />

                    <span>
                      {logoutBusy
                        ? "Signing out..."
                        : "Logout"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Picker Button Trigger */}
      <div className="mt-3 flex justify-end" ref={dateRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowDateMenu(!showDateMenu);
              setShowNotifMenu(false);
              setShowHelpMenu(false);
              setShowProfileMenu(false);
            }}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all ${
              showDateMenu
                ? "bg-slate-100 border-blue-300 text-blue-600"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>{selectedDateRange}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {/* Date Picker Dropdown list */}
          {showDateMenu && (
            <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 text-xs text-slate-700 animate-fade-in">
              {[
                "May 12 – Jun 11, 2025",
                "Last 7 Days",
                "Last 30 Days",
                "This Month",
                "All Time"
              ].map((range) => (
                <div
                  key={range}
                  onClick={() => {
                    setSelectedDateRange(range);
                    setShowDateMenu(false);
                  }}
                  className={`px-4 py-2 hover:bg-slate-50 cursor-pointer font-medium transition ${
                    selectedDateRange === range ? "text-blue-600 bg-blue-50/20 font-bold" : ""
                  }`}
                >
                  {range}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
