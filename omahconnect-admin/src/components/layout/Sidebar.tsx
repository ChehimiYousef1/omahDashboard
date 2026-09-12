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
  Infinity as InfinityIcon,
  Mail,
  Bell,
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
  "message-square": MessageSquare,
  flag: Flag,
  "bar-chart-3": BarChart3,
  "code-2": Code2,
  settings: Settings,
};

interface SidebarProps {
  activeId: string;
  onNavigate: (id: string) => void;
}

export function Sidebar({ activeId, onNavigate }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-56 flex-col bg-[#0a192f] text-slate-300">
      <div className="flex items-center gap-2 border-b border-slate-700/50 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
          <InfinityIcon className="h-5 w-5 text-white" />
        </div>
        <span className="text-sm font-bold tracking-wide text-white">
          OMAHCONNECT
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
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
