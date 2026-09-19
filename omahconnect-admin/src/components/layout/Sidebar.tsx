import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  FileText,
  MessageSquare,
  Flag,
  BarChart3,
  Code2,
  Settings,
  Mail,
  Bell,
  CalendarDays,
} from "lucide-react";
import { navItems } from "../../data/mockData";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "layout-dashboard": LayoutDashboard,
  users: Users,
  mail: Mail,
  bell: Bell,
  "building-2": Building2,
  briefcase: Briefcase,
  "file-text": FileText,
  "calendar-days": CalendarDays,
  "message-square": MessageSquare,
  flag: Flag,
  "bar-chart-3": BarChart3,
  "code-2": Code2,
  settings: Settings,
};

interface SidebarProps {
  activeId: string;

  onNavigate:
    (id: string) =>
      void;

  visibleIds?:
    readonly string[];
}

export function Sidebar({
  activeId,
  onNavigate,
  visibleIds,
}: SidebarProps) {
  const visibleItems =
    visibleIds
      ? navItems.filter(
          item =>
            visibleIds.includes(
              item.id
            )
        )
      : navItems;

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-56 flex-col bg-[#0a192f] text-slate-300">
      <div className="flex min-h-[73px] items-center border-b border-slate-700/50 px-4 py-4">
        <img
          src="/branding/omah-logo.svg"
          alt="OMAHCONNECT"
          className="h-8 w-auto max-w-[180px] object-contain object-left brightness-0 invert"
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = activeId === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  <span className="truncate text-left">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
