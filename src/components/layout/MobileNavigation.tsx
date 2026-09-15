import React from 'react';
import { LayoutDashboard, Library, GraduationCap, LineChart, Settings } from 'lucide-react';
import type { ViewId } from '@/App';

const NAV_ITEMS: { id: ViewId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'study', label: 'Study', icon: GraduationCap },
  { id: 'progress', label: 'Progress', icon: LineChart },
  { id: 'settings', label: 'Settings', icon: Settings }
];

interface MobileNavigationProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
}

export function MobileNavigation({ activeView, onNavigate }: MobileNavigationProps) {
  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-surface lg:hidden"
      aria-label="Main navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] font-medium transition-colors duration-200 ${
              isActive ? 'text-primary' : 'text-ink-muted'
            }`}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
