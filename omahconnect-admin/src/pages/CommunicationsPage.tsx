import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  fetchUsers,
  fetchNotifications,
  sendNotification,
  resendNotification,
  toggleNotificationPermissions,
  fetchConversations,
  sendMessage,
  flagConversation,
  type User,
  type NotificationRecord,
  type Conversation
} from "../services/api";
import { Header } from "../components/layout/Header";
import {
  MessageSquare,
  Send,
  AlertTriangle,
  ShieldCheck,
  Flag,
  Shield,
  UserX,
  CheckCircle,
  ShieldAlert,
  Bell,
  CheckCircle2,
  RefreshCw,
  Mail,
  Smartphone,
  Globe,
  History as HistoryIcon,
  UserCheck
} from "lucide-react";

function apiErrorMessage(
  error: unknown,
  fallback: string
) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response =
      (
        error as {
          response?: {
            data?: {
              error?: unknown;
            };
          };
        }
      ).response;

    if (
      typeof response?.data?.error ===
      "string"
    ) {
      return response.data.error;
    }
  }

  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}

type Tab = "dms" | "broadcasts" | "opt-ins";

export function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("dms");
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  // Loading & Action States
  const [loading, setLoading] = useState(true);
  const [composerLoading, setComposerLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Feedback States
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // DM Input State
  const [inputText, setInputText] = useState("");

  // Broadcast Form States
  const [recipientType, setRecipientType] = useState<"direct" | "bulk">("bulk");
  const [recipientId, setRecipientId] = useState("");
  const [recipientGroup, setRecipientGroup] = useState<"all" | "students" | "professionals" | "verified" | "unverified">("all");
  const [channel, setChannel] = useState<"push" | "email" | "in-app">("push");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Load communication records after mount.
  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const [
          usersData,
          notifsData,
          convsData,
        ] = await Promise.all([
          fetchUsers(),
          fetchNotifications(),
          fetchConversations(),
        ]);

        if (!active) {
          return;
        }

        setUsers(usersData);
        setNotifications(notifsData);
        setConversations(convsData);

        if (convsData.length > 0) {
          setSelectedConvId(
            (current) =>
              current ??
              convsData[0].id
          );
        }
      } catch (err: unknown) {
        if (active) {
          setError(
            apiErrorMessage(
              err,
              "Failed to synchronize communication logs."
            )
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      active = false;
    };
  }, []);

  // Selected active DM conversation
  const activeConv = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId) || null;
  }, [conversations, selectedConvId]);

  // Scroll to bottom on conversation change
  useEffect(() => {
    if (activeTab === "dms") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeConv?.messages, activeTab]);

  // Handle DM Dispatch
  const handleSendDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConv || sendingMessage) return;

    setError(null);
    setSendingMessage(true);
    const textToSend = inputText;
    setInputText("");

    try {
      const res = await sendMessage(activeConv.userId, textToSend, "admin-1");
      if (res.success) {
        // Refresh conversations
        const updatedConvs = await fetchConversations();
        setConversations(updatedConvs);
        if (res.spamWarningTriggered) {
          alert("⚠️ Auto Moderation Triggered: Message contains blacklisted words and was flagged. An auto-warning warning was dispatched.");
        }
      }
    } catch (err: unknown) {
      setError(
        apiErrorMessage(
          err,
          "Failed to post message reply."
        )
      );
    } finally {
      setSendingMessage(false);
    }
  };

  // Flag DM Conversation Toggle
  const handleToggleFlagConv = async () => {
    if (!activeConv) return;
    try {
      const res = await flagConversation(activeConv.id, !activeConv.isFlagged);
      if (res.success) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConv.id ? { ...c, isFlagged: res.conversation.isFlagged } : c))
        );
      }
    } catch {
      setError("Failed to toggle flag on conversation.");
    }
  };

  // Simulate User Spam message
  const handleSimulateUserSpam = async () => {
    if (!activeConv) return;
    setSendingMessage(true);
    try {
      await sendMessage(activeConv.userId, "Get free bitcoin now! Just sign up on my crypto scam page buy cryptocurrency today!", activeConv.userId);
      const updatedConvs = await fetchConversations();
      setConversations(updatedConvs);
    } catch {
      setError("Failed to simulate user spam message.");
    } finally {
      setSendingMessage(false);
    }
  };

  // Dispatch Broadcast Notification Alert
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setComposerLoading(true);

    if (recipientType === "direct" && !recipientId) {
      setError("Please select a target recipient user.");
      setComposerLoading(false);
      return;
    }

    if (!broadcastTitle || !broadcastMessage) {
      setError("Please fill in the title and message content fields.");
      setComposerLoading(false);
      return;
    }

    try {
      const res = await sendNotification({
        recipientType,
        recipientId: recipientType === "direct" ? recipientId : undefined,
        recipientGroup: recipientType === "bulk" ? recipientGroup : undefined,
        title: broadcastTitle,
        message: broadcastMessage,
        channel
      });

      if (res.success) {
        setSuccess(res.message);
        setBroadcastTitle("");
        setBroadcastMessage("");
        // Refresh notifications
        const updatedNotifs = await fetchNotifications();
        setNotifications(updatedNotifs);
      }
    } catch (err: unknown) {
      setError(
        apiErrorMessage(
          err,
          "Failed to dispatch broadcast campaign."
        )
      );
    } finally {
      setComposerLoading(false);
    }
  };

  // Resend Broadcast Notification Campaign
  const handleResendBroadcast = async (id: number) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await resendNotification(id);
      if (res.success) {
        setSuccess(`Notification campaign resent. (New log ID: ${res.notificationRecord.id})`);
        const updatedNotifs = await fetchNotifications();
        setNotifications(updatedNotifs);
      }
    } catch (err: unknown) {
      setError(
        apiErrorMessage(
          err,
          "Failed to resend notification campaign."
        )
      );
    }
  };

  // Toggle user permissions Opt-In
  const handleToggleOptInPermission = async (user: User, field: "push" | "email" | "inApp") => {
    const currentVal = user.notificationPermissions ? user.notificationPermissions[field] : true;
    const newVal = !currentVal;

    // Optimistic Update
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === user.id) {
          return {
            ...u,
            notificationPermissions: {
              push: u.notificationPermissions?.push ?? true,
              email: u.notificationPermissions?.email ?? true,
              inApp: u.notificationPermissions?.inApp ?? true,
              [field]: newVal
            }
          };
        }
        return u;
      })
    );

    try {
      await toggleNotificationPermissions(user.id, { [field]: newVal });
    } catch (err: unknown) {
      console.error("Failed to update opt-in state", err);
      // Revert optimistic update
      const updatedUsers = await fetchUsers();
      setUsers(updatedUsers);
    }
  };

  const spamCount = useMemo(() => {
    if (!activeConv) return 0;
    return activeConv.messages.filter((m) => m.isSpam).length;
  }, [activeConv]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <Header title="Communications Center" />

      {/* Description & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 -mt-3 pb-2 border-b border-slate-100">
        <p className="text-sm text-slate-500">
          Manage user DMs, dispatch broadcast alerts, monitor AI spam filtration rules, and configure recipient opt-in settings.
        </p>
        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto text-blue-650 font-bold text-xs">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          COMMUNICATIONS ENGINE ACTIVE
        </div>
      </div>

      {/* Premium Segmented Tabs */}
      <div className="flex border-b border-slate-100 pb-px gap-1">
        <button
          type="button"
          onClick={() => {
            setActiveTab("dms");
            setError(null);
            setSuccess(null);
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px rounded-t-lg ${
            activeTab === "dms"
              ? "border-blue-600 bg-blue-50/20 text-blue-650"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/50"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Direct Messages & Moderation
          {conversations.some((c) => c.isFlagged) && (
            <span className="h-2 w-2 rounded-full bg-rose-500" title="Flagged conversations active" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("broadcasts");
            setError(null);
            setSuccess(null);
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px rounded-t-lg ${
            activeTab === "broadcasts"
              ? "border-blue-600 bg-blue-50/20 text-blue-650"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/50"
          }`}
        >
          <Bell className="h-4 w-4" />
          Broadcast Alerts Center
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("opt-ins");
            setError(null);
            setSuccess(null);
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px rounded-t-lg ${
            activeTab === "opt-ins"
              ? "border-blue-600 bg-blue-50/20 text-blue-650"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/50"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Delivery Opt-In Registry
        </button>
      </div>

      {/* Shared Feedback Banners */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-650 flex items-center gap-2 animate-fade-in">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-250 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Tab Contents */}
      <div className="min-h-[550px]">
        {/* TAB 1: DIRECT MESSAGES */}
        {activeTab === "dms" && (
          <div className="grid gap-4 grid-cols-1 xl:grid-cols-[290px_1fr_290px] xl:h-[720px]">
            {/* DM List */}
            <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col h-[280px] xl:h-full overflow-hidden">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Conversations</h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {conversations.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">No active chats found.</div>
                ) : (
                  conversations.map((c) => {
                    const lastMsg = c.messages[c.messages.length - 1];
                    const isSelected = c.id === selectedConvId;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedConvId(c.id)}
                        className={`rounded-xl p-3 cursor-pointer border transition-all duration-200 flex flex-col gap-1.5 ${
                          isSelected
                            ? "bg-blue-50/30 border-blue-200 shadow-sm"
                            : "bg-slate-50/20 border-slate-100/50 hover:bg-slate-50 hover:border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {c.userAvatar ? (
                              <img src={c.userAvatar} alt={c.userName} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                {c.userName.split(" ").map((n) => n[0]).join("")}
                              </div>
                            )}
                            <span className="font-bold text-slate-800 text-xs truncate max-w-[120px]">{c.userName}</span>
                          </div>
                          {c.isFlagged && (
                            <span className="bg-red-50 text-red-650 border border-red-100 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse">
                              <Flag className="w-2.5 h-2.5" />
                              Flag
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-1">
                          {lastMsg ? `${lastMsg.senderName}: ${lastMsg.text}` : "No messages yet"}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Active DM Chat Area */}
            <section className="rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col h-[580px] xl:h-full overflow-hidden">
              {activeConv ? (
                <>
                  {/* Chat Header */}
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                    <div className="flex items-center gap-3">
                      {activeConv.userAvatar ? (
                        <img src={activeConv.userAvatar} alt={activeConv.userName} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                          {activeConv.userName.split(" ").map((n) => n[0]).join("")}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">{activeConv.userName}</h4>
                        <p className="text-[9px] text-slate-400">Direct Message session</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSimulateUserSpam}
                      disabled={sendingMessage}
                      className="rounded-xl border border-amber-250 bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700 hover:bg-amber-100 transition flex items-center gap-1.5"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Simulate Spam
                    </button>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-slate-50/10 custom-scrollbar">
                    {activeConv.messages.map((m) => {
                      const isAdmin = m.senderId === "admin-1";
                      const isSys = m.senderId === "system" || m.warningSent;

                      if (isSys) {
                        return (
                          <div key={m.id} className="flex justify-center my-2 animate-fade-in">
                            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 max-w-md text-[11px] text-amber-900 leading-relaxed font-semibold flex items-start gap-2 shadow-sm">
                              <Shield className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                              <span>{m.text}</span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={m.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"} animate-fade-in`}>
                          <div
                            className={`max-w-md rounded-2xl p-3.5 flex flex-col gap-1 shadow-sm ${
                              isAdmin
                                ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-none"
                                : m.isSpam
                                ? "bg-red-50 border border-red-100 text-red-950 rounded-bl-none"
                                : "bg-white border border-slate-100 text-slate-800 rounded-bl-none"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[9px] font-extrabold uppercase opacity-60">{m.senderName}</span>
                              <span className="text-[9px] opacity-40">
                                {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed break-words font-medium">{m.text}</p>
                            {m.isSpam && (
                              <div className="flex items-center gap-1 mt-1 text-[8px] font-bold text-red-650">
                                <ShieldAlert className="h-2.5 w-2.5 animate-pulse" />
                                <span>Flagged by AI Spam Moderation</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="p-4 border-t border-slate-100 bg-white">
                    <form onSubmit={handleSendDM} className="flex items-center gap-3">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type a support reply... (Type 'crypto scam' to test auto AI warning)"
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                      <button
                        type="submit"
                        disabled={sendingMessage || !inputText.trim()}
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-550 transition disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-6">
                  <MessageSquare className="h-12 w-12 mb-3 opacity-30 text-blue-500" />
                  <span>Select a conversation thread to initiate message responses and moderate alerts.</span>
                </div>
              )}
            </section>

            {/* Moderation Details */}
            <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col justify-between h-auto xl:h-full overflow-hidden">
              {activeConv ? (
                <div className="space-y-6">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Moderator Board</h3>

                  <div className="rounded-xl border border-slate-100 p-4 bg-slate-50/20 text-center space-y-3">
                    <div className="mx-auto w-10 h-10 bg-blue-50 text-blue-650 rounded-full flex items-center justify-center border border-blue-100">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{activeConv.userName}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Target DM recipient</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Flag Toggle checkbox */}
                    <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3 bg-white hover:bg-slate-50 transition duration-150">
                      <div className="flex items-center gap-2">
                        <Flag className={`h-4 w-4 ${activeConv.isFlagged ? "text-red-500 fill-red-500" : "text-slate-400"}`} />
                        <span className="text-xs font-bold text-slate-700">Flag conversation</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={activeConv.isFlagged}
                        onChange={handleToggleFlagConv}
                        className="h-4 w-4 text-blue-600 border-slate-350 rounded focus:ring-blue-500"
                      />
                    </div>

                    <div className="rounded-xl border border-slate-100 p-3 bg-white space-y-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Spam Metrics</span>
                      <div className="flex justify-between items-center text-xs text-slate-650">
                        <span>AI Flagged Messages</span>
                        <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                          spamCount > 0 ? "bg-red-50 text-red-750 border border-red-100" : "bg-slate-100 text-slate-500"
                        }`}>
                          {spamCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Restrict Accounts Quick Controls */}
                  <div className="space-y-2 pt-4 border-t border-slate-100/70">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Quick Controls</span>
                    <button
                      type="button"
                      onClick={() => alert(`Simulated user account restriction applied to ${activeConv.userName}.`)}
                      className="w-full flex items-center justify-between rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-2 text-xs font-bold text-red-700 transition"
                    >
                      <span>Restrict User Account</span>
                      <UserX className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => alert("All message warnings and flags cleared.")}
                      className="w-full flex items-center justify-between rounded-xl border border-emerald-255 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700 transition"
                    >
                      <span>Clear All Flags</span>
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-xs text-center p-3">
                  No conversation inspected.
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: BROADCAST CAMPAIGNS */}
        {activeTab === "broadcasts" && (
          <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
            {/* Broadcast Composer */}
            <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                  <Bell className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Compose Broadcast Campaign</h3>
              </div>

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Recipient Target Selection */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Recipient Target
                    </label>
                    <select
                      value={recipientType}
                      onChange={(e) => setRecipientType(e.target.value as "direct" | "bulk")}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
                    >
                      <option value="bulk">Bulk Group (Broadcast)</option>
                      <option value="direct">Direct User (Private Alert)</option>
                    </select>
                  </div>

                  {/* Recipient Target options */}
                  {recipientType === "direct" ? (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Select Recipient User
                      </label>
                      <select
                        value={recipientId}
                        onChange={(e) => setRecipientId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
                      >
                        <option value="">-- Choose Target User --</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Select User Group
                      </label>
                      <select
                        value={recipientGroup}
                        onChange={(e) => setRecipientGroup(
                            e.target.value as
                              | "all"
                              | "students"
                              | "professionals"
                              | "verified"
                              | "unverified"
                          )}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
                      >
                        <option value="all">All Registered Members</option>
                        <option value="students">Students Only</option>
                        <option value="professionals">Professionals Only</option>
                        <option value="verified">Verified Accounts Only</option>
                        <option value="unverified">Unverified Accounts Only</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Delivery Channels */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Delivery Channel
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setChannel("push")}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2.5 border text-xs font-bold transition-all duration-300 ${
                        channel === "push"
                          ? "bg-blue-600 border-blue-500 text-white shadow-sm"
                          : "bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Smartphone className="h-4 w-4" />
                      Push Alert
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannel("email")}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2.5 border text-xs font-bold transition-all duration-300 ${
                        channel === "email"
                          ? "bg-blue-600 border-blue-500 text-white shadow-sm"
                          : "bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Mail className="h-4 w-4" />
                      Email Digest
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannel("in-app")}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2.5 border text-xs font-bold transition-all duration-300 ${
                        channel === "in-app"
                          ? "bg-blue-600 border-blue-500 text-white shadow-sm"
                          : "bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Globe className="h-4 w-4" />
                      In-App
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Notification Title
                  </label>
                  <input
                    type="text"
                    required
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. Scheduled Network Operations"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Message Body */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Notification Message Body
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Describe announcement details..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={composerLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-xs font-bold text-white hover:opacity-95 shadow-md shadow-blue-500/10 active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  {composerLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <span>Dispatch Campaign Broadcaster</span>
                      <Send className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </form>
            </section>

            {/* Broadcast Outbox Logs */}
            <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between h-[600px] overflow-hidden">
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-3 shrink-0">
                  <div className="p-2 bg-purple-50 text-purple-500 rounded-lg">
                    <HistoryIcon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">Outbox Registry</h3>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">No dispatched campaigns registered.</div>
                  ) : (
                    notifications
                      .slice()
                      .reverse()
                      .map((n) => (
                        <div
                          key={n.id}
                          className="rounded-xl border border-slate-100 bg-slate-50/30 p-4 space-y-2 hover:bg-slate-50/50 hover:shadow-sm transition-all duration-200"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                                n.channel === "push"
                                  ? "bg-blue-50 text-blue-600 border border-blue-100"
                                  : n.channel === "email"
                                  ? "bg-amber-50 text-amber-600 border border-amber-100"
                                  : "bg-purple-50 text-purple-600 border border-purple-100"
                              }`}
                            >
                              {n.channel === "push" && <Smartphone className="h-2 w-2" />}
                              {n.channel === "email" && <Mail className="h-2 w-2" />}
                              {n.channel === "in-app" && <Globe className="h-2 w-2" />}
                              {n.channel}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(n.sentAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 line-clamp-1">{n.title}</p>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic font-mono">"{n.message}"</p>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-100/70 pt-2 mt-2">
                            <div className="text-[9px] text-slate-400 font-medium">
                              <strong>Delivered:</strong> {n.recipientCount} member{n.recipientCount > 1 ? "s" : ""}
                              {n.optOutCount > 0 && ` (${n.optOutCount} opt-out skips)`}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleResendBroadcast(n.id)}
                              className="flex items-center gap-1 text-[9px] font-bold text-blue-600 hover:text-blue-550 transition-colors"
                            >
                              <RefreshCw className="h-2.5 w-2.5 animate-hover-spin" />
                              <span>Resend</span>
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: OPT-IN REGISTRY */}
        {activeTab === "opt-ins" && (
          <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">User Delivery Permissions</h3>
              <p className="text-xs text-slate-400 mt-0.5">Toggle channel delivery access per user.</p>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="min-w-full text-left text-xs bg-white">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4 text-center">Push Alerts</th>
                    <th className="py-3 px-4 text-center">Email Digests</th>
                    <th className="py-3 px-4 text-center">In-App Notifications</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const pushOn = u.notificationPermissions?.push !== false;
                    const emailOn = u.notificationPermissions?.email !== false;
                    const inAppOn = u.notificationPermissions?.inApp !== false;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition duration-150">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">{u.name}</p>
                          <p className="text-[10px] text-slate-400">{u.email}</p>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleOptInPermission(u, "push")}
                            className={`rounded-full px-3 py-1 font-bold text-[9px] uppercase tracking-wider transition ${
                              pushOn
                                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                                : "bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200"
                            }`}
                          >
                            {pushOn ? "Active" : "Opt-out"}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleOptInPermission(u, "email")}
                            className={`rounded-full px-3 py-1 font-bold text-[9px] uppercase tracking-wider transition ${
                              emailOn
                                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                                : "bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200"
                            }`}
                          >
                            {emailOn ? "Active" : "Opt-out"}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleOptInPermission(u, "inApp")}
                            className={`rounded-full px-3 py-1 font-bold text-[9px] uppercase tracking-wider transition ${
                              inAppOn
                                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                                : "bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200"
                            }`}
                          >
                            {inAppOn ? "Active" : "Opt-out"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
