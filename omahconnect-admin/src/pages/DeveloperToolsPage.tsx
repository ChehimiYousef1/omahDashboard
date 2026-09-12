import { useEffect, useState, useRef, useMemo } from "react";
import { fetchDbSummary, type DbSummary } from "../services/api";
import { Header } from "../components/layout/Header";
import axios from "axios";
import {
  Terminal,
  Database,
  Cpu,
  RefreshCw,
  Play,
  Pause,
  Trash2,
  Send,
  CheckCircle,
  Clock,
  HardDrive,
  Download,
} from "lucide-react";

interface LogItem {
  id: string;
  type: "info" | "warn" | "error";
  message: string;
  timestamp: string;
}

export function DeveloperToolsPage() {
  const [dbSummary, setDbSummary] = useState<DbSummary | null>(null);
  const [loadingDb, setLoadingDb] = useState(true);

  // System Metric State Simulations
  const [cpuUsage, setCpuUsage] = useState(12);
  const [ramUsage, setRamUsage] = useState(256);
  const [responseTime, setResponseTime] = useState(142);
  const [uptime] = useState("1d 4h 12m");

  // Terminal Console State
  const [logs, setLogs] = useState<LogItem[]>(() => [
    {
      id: "1",
      type: "info",
      message:
        "OMAHCONNECT Express API Gateway binding active on PORT 5000.",
      timestamp:
        new Date(Date.now() - 30000).toLocaleTimeString(),
    },
    {
      id: "2",
      type: "info",
      message:
        "Database connection successfully initialized. JSON collections loaded.",
      timestamp:
        new Date(Date.now() - 25000).toLocaleTimeString(),
    },
    {
      id: "3",
      type: "info",
      message:
        "Static client builds served from Vite distribution folder.",
      timestamp:
        new Date(Date.now() - 20000).toLocaleTimeString(),
    },
    {
      id: "4",
      type: "warn",
      message:
        "Memory usage spike detected during bulk email campaign simulation.",
      timestamp:
        new Date(Date.now() - 15000).toLocaleTimeString(),
    },
    {
      id: "5",
      type: "info",
      message:
        "Session auto-verification granted token for SuperAdmin ID admin-1.",
      timestamp:
        new Date(Date.now() - 10000).toLocaleTimeString(),
    },
  ]);
  const [paused, setPaused] = useState(false);
  const [logFilter, setLogFilter] = useState<"all" | "info" | "warn" | "error">("all");
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // API Tester State
  const [apiMethod, setApiMethod] = useState<"GET" | "POST">("GET");
  const [apiEndpoint, setApiEndpoint] = useState("/users");
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  // Load Database Summary
  const loadDbSummary = async () => {
    try {
      setLoadingDb(true);
      const data = await fetchDbSummary();
      setDbSummary(data);
    } catch (err) {
      console.error("Failed to load db summary", err);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    let active = true;

    void fetchDbSummary()
      .then((data) => {
        if (active) {
          setDbSummary(data);
        }
      })
      .catch((err: unknown) => {
        console.error(
          "Failed to load db summary",
          err
        );
      })
      .finally(() => {
        if (active) {
          setLoadingDb(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // System gauges simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage((prev) => Math.max(5, Math.min(85, Math.floor(prev + (Math.random() * 10 - 5)))));
      setRamUsage((prev) => Math.max(220, Math.min(480, Math.floor(prev + (Math.random() * 6 - 3)))));
      setResponseTime((prev) => Math.max(80, Math.min(220, Math.floor(prev + (Math.random() * 20 - 10)))));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Real-time log console simulator
  useEffect(() => {


    const routes = [
      { method: "GET", path: "/api/users", code: "200 OK", type: "info" as const },
      { method: "GET", path: "/api/companies", code: "200 OK", type: "info" as const },
      { method: "GET", path: "/api/companies/jobs", code: "200 OK", type: "info" as const },
      { method: "POST", path: "/api/messages/send", code: "201 Created", type: "info" as const },
      { method: "POST", path: "/api/calls/initiate", code: "200 OK", type: "info" as const },
      { method: "GET", path: "/api/dev/db-summary", code: "304 Not Modified", type: "info" as const },
      { method: "POST", path: "/api/notifications/send", code: "200 OK", type: "info" as const },
    ];

    const warnings = [
      "AI Spam moderation scanned flagged DM. Crypto keyword warning sent.",
      "Opt-out skipped for direct push campaign due to client notification toggle settings.",
      "Recruiter support calling requested connection with mock Vonage SIP trunk.",
    ];

    const interval = setInterval(() => {
      if (paused) return;

      const randomChance = Math.random();
      let newLog: LogItem;

      if (randomChance < 0.6) {
        // HTTP route request log
        const route = routes[Math.floor(Math.random() * routes.length)];
        newLog = {
          id: Date.now().toString(),
          type: route.type,
          message: `${route.method} ${route.path} -> HTTP Status ${route.code}`,
          timestamp: new Date().toLocaleTimeString(),
        };
      } else if (randomChance < 0.9) {
        // Warning log
        const warnMsg = warnings[Math.floor(Math.random() * warnings.length)];
        newLog = {
          id: Date.now().toString(),
          type: "warn",
          message: `[WARN] ${warnMsg}`,
          timestamp: new Date().toLocaleTimeString(),
        };
      } else {
        // Error log
        newLog = {
          id: Date.now().toString(),
          type: "error",
          message: `[ERROR] Failed to connect with Twilio outbound voice API (Simulated connection error)`,
          timestamp: new Date().toLocaleTimeString(),
        };
      }

      setLogs((prev) => [...prev.slice(-49), newLog]); // Keep last 50 logs
    }, 4000);

    return () => clearInterval(interval);
  }, [paused]);

  // Auto scroll terminal to bottom
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Dispatch API Sandbox request
  const handleTestApi = async () => {
    setApiLoading(true);
    setApiResponse(null);
    try {
      const response = await axios({
        method: apiMethod,
        url: `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${apiEndpoint}`,
        withCredentials: true,
      });
      setApiResponse(JSON.stringify(response.data, null, 2));
    } catch (err: unknown) {
      setApiResponse(
        JSON.stringify(
          {
            success: false,
            error:
              axios.isAxiosError(err)
                ? (
                    typeof err.response?.data?.error === "string"
                      ? err.response.data.error
                      : err.message ||
                        "Failed to contact API"
                  )
                : err instanceof Error
                  ? err.message
                  : "Failed to contact API",
            status:
              axios.isAxiosError(err)
                ? err.response?.status
                : undefined,
          },
          null,
          2
        )
      );
    } finally {
      setApiLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (logFilter === "all") return logs;
    return logs.filter((log) => log.type === logFilter);
  }, [logs, logFilter]);

  const simulateBackupDownload = () => {
    const jsonStr = JSON.stringify(dbSummary, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omahconnect_db_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert("Backup simulation completed. JSON collection details downloaded.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header title="Developer Operations Console" />

      {/* Description */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 -mt-3 pb-2 border-b border-slate-100">
        <p className="text-sm text-slate-500">
          Monitor host performance, review database schemas, execute live sandbox API queries, and audit system events.
        </p>
        <div className="flex items-center gap-1.5 shrink-0 text-blue-600 font-semibold text-xs">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          SANDBOX SYSTEM OPERATIONAL
        </div>
      </div>

      {/* Performance Health Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CPU UTILIZATION</p>
            <Cpu className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{cpuUsage}%</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                cpuUsage > 75 ? "bg-rose-500" : cpuUsage > 50 ? "bg-amber-500" : "bg-blue-500"
              }`}
              style={{ width: `${cpuUsage}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">MEMORY USAGE</p>
            <HardDrive className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{ramUsage} MB</p>
          <p className="mt-2 text-[10px] text-slate-405">Allocated heap size: 2.04 GB limit</p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">GATEWAY RESPONSE</p>
            <Clock className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{responseTime} ms</p>
          <p className="mt-2 text-[10px] text-emerald-600 font-semibold">&bull; Under 250ms target</p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">SERVER UPTIME</p>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{uptime}</p>
          <p className="mt-2 text-[10px] text-slate-455">API process online, port 5000 active</p>
        </div>
      </div>

      {/* Two Column Section (Terminal Console & DB Inspector/API Tester) */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Monospace log Terminal console */}
        <div className="rounded-xl border border-slate-100 bg-slate-900 p-5 shadow-lg flex flex-col h-[520px]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2 text-white">
              <Terminal className="h-4 w-4 text-blue-400" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider">Host Event Stream</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={logFilter}
                onChange={(e) =>
                  setLogFilter(
                    e.target.value as
                      | "all"
                      | "info"
                      | "warn"
                      | "error"
                  )
                }
                className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] font-mono text-slate-400 focus:outline-none focus:border-blue-500"
              >
                <option value="all">ALL LOGS</option>
                <option value="info">INFO ONLY</option>
                <option value="warn">WARNINGS</option>
                <option value="error">ERRORS</option>
              </select>
              <button
                type="button"
                onClick={() => setPaused(!paused)}
                className="rounded border border-slate-800 bg-slate-950 p-1 text-slate-400 hover:text-white"
                title={paused ? "Resume Stream" : "Pause Stream"}
              >
                {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="rounded border border-slate-800 bg-slate-950 p-1 text-slate-400 hover:text-red-400"
                title="Clear Logs"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto font-mono text-[10px] leading-relaxed space-y-1.5 pr-2 custom-scrollbar bg-slate-950 rounded-lg p-3 border border-slate-850">
            {filteredLogs.length === 0 ? (
              <div className="py-24 text-center text-slate-600 font-mono">Stream is clear. No matching logs.</div>
            ) : (
              filteredLogs.map((log: LogItem) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 ${
                    log.type === "error"
                      ? "text-rose-400"
                      : log.type === "warn"
                      ? "text-amber-400"
                      : "text-slate-300"
                  }`}
                >
                  <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
            <div ref={consoleBottomRef} />
          </div>
        </div>

        {/* Database Collections inspector & API Sandbox tester */}
        <div className="space-y-6">
          {/* Collection inspect counts */}
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-slate-800 text-xs">JSON Schema Inspector</span>
              </div>
              <button
                type="button"
                onClick={loadDbSummary}
                className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-50"
                title="Sync database metadata"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingDb ? "animate-spin" : ""}`} />
              </button>
            </div>

            {loadingDb && !dbSummary ? (
              <div className="py-6 text-center text-slate-455 text-xs">Querying database schema...</div>
            ) : dbSummary ? (
              <div className="grid gap-2 grid-cols-2 text-[11px] text-slate-600 font-semibold">
                {[
                  { label: "Users Collection", key: "users" },
                  { label: "Feed Posts", key: "posts" },
                  { label: "Company Registry", key: "companies" },
                  { label: "Job Positions", key: "jobs" },
                  { label: "Applications Log", key: "applications" },
                  { label: "User Flags & Reports", key: "reports" },
                  { label: "DM Conversations", key: "conversations" },
                  { label: "CRM Dialer logs", key: "calls" },
                  { label: "Sent Email campaigns", key: "emails" },
                  { label: "Notifications Log", key: "notifications" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="font-bold text-slate-850 font-mono">{String(
                      (
                        dbSummary as unknown as
                          Record<string, unknown>
                      )[item.key] ?? 0
                    )}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={simulateBackupDownload}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-500 border border-blue-100 rounded-lg px-3 py-1.5 hover:bg-blue-50"
              >
                <Download className="h-3 w-3" /> Backup collections
              </button>
            </div>
          </div>

          {/* Sandbox API Tester */}
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Send className="h-4 w-4 text-violet-500" />
              <span className="font-bold text-slate-800 text-xs">Sandbox REST API Tester</span>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={apiMethod}
                  onChange={(e) =>
                    setApiMethod(
                      e.target.value as
                        | "GET"
                        | "POST"
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 font-bold focus:outline-none"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
                <select
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
                >
                  <option value="/users">/users</option>
                  <option value="/companies">/companies</option>
                  <option value="/companies/jobs">/companies/jobs</option>
                  <option value="/applications">/applications</option>
                  <option value="/companies/reports">/companies/reports</option>
                  <option value="/dev/db-summary">/dev/db-summary</option>
                </select>
                <button
                  type="button"
                  onClick={handleTestApi}
                  disabled={apiLoading}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-550 shadow-sm"
                >
                  {apiLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Send"}
                </button>
              </div>

              {/* JSON preview */}
              <div className="h-48 overflow-y-auto rounded-lg bg-slate-900 text-[10px] font-mono text-emerald-450 p-3 border border-slate-950">
                {apiResponse ? (
                  <pre className="whitespace-pre-wrap">{apiResponse}</pre>
                ) : (
                  <div className="py-16 text-center text-slate-500">JSON response payload will render here.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
