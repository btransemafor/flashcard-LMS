import React from 'react';
import {
  LayoutDashboard,
  Library,
  GraduationCap,
  LineChart,
  DatabaseBackup,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet
} from 'lucide-react';
import type { ViewId } from '@/App';
import { useApp } from '@/store/AppContext';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import { SaveStatus } from '@/components/common/SaveStatus';

const NAV_ITEMS: { id: ViewId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'library', label: 'My Library', icon: Library },
  { id: 'study', label: 'Study', icon: GraduationCap },
  { id: 'progress', label: 'Progress', icon: LineChart },
  { id: 'backup', label: 'Data & Backup', icon: DatabaseBackup },
  { id: 'settings', label: 'Settings', icon: Settings }
];

interface SidebarProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const {
    state: { dataset, online, ui },
    actions: { updateUIPreferences }
  } = useApp();

  const collapsed = ui.sidebarCollapsed;

  return (
    <aside
      className={`hidden lg:flex lg:flex-col shrink-0 border-r border-border bg-surface transition-all duration-200 ${collapsed ? 'w-[76px]' : 'w-[240px]'}`}
    >
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white font-semibold">
          LP
        </div>
        {!collapsed && <span className="text-sm font-semibold text-ink">Learning Playground</span>}
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                isActive ? 'bg-primary-subtle text-primary' : 'text-ink-secondary hover:bg-surface-secondary hover:text-ink'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} aria-hidden="true" className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-4 space-y-3">
        <button
          type="button"
          onClick={() => updateUIPreferences({ sidebarCollapsed: !collapsed })}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink-muted hover:bg-surface-secondary hover:text-ink"
        >
          {collapsed ? <ChevronsRight size={16} aria-hidden="true" /> : <ChevronsLeft size={16} aria-hidden="true" />}
          {!collapsed && <span>Collapse</span>}
        </button>

        {!collapsed && (
          <div className="space-y-2 rounded-lg bg-surface-secondary px-3 py-3">
            <OfflineIndicator online={online} />
            <div className="flex items-center gap-2 text-xs text-ink-secondary">
              <FileSpreadsheet size={14} aria-hidden="true" className="shrink-0" />
              <span className="truncate">{dataset?.sourceFileName ?? 'No file linked'}</span>
            </div>
            <SaveStatus dataset={dataset} />
          </div>
        )}
      </div>
    </aside>
  );
}
