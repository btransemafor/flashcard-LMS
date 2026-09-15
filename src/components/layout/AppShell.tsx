import React from 'react';
import type { ViewId } from '@/App';
import { Sidebar } from './Sidebar';
import { MobileNavigation } from './MobileNavigation';
import { Topbar } from './Topbar';
import { ToastStack } from '@/components/common/ToastProvider';
import { useApp } from '@/store/AppContext';

const VIEW_TITLES: Record<ViewId, string> = {
  dashboard: 'Overview',
  library: 'My Library',
  study: 'Study Session',
  import: 'Import & Data Preview',
  progress: 'Progress',
  settings: 'Settings',
  backup: 'Data & Backup',
  print: 'Print Flashcards'
};

interface AppShellProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  children: React.ReactNode;
}

export function AppShell({ activeView, onNavigate, children }: AppShellProps) {
  const {
    state: { ui }
  } = useApp();

  const isPrintView = activeView === 'print';
  const isStudyView = activeView === 'study';

  return (
    <div className={`flex min-h-screen bg-bg-warm ${ui.reducedMotion ? 'reduced-motion' : ''} ${ui.compactDensity ? 'compact-density' : ''}`}>
      {!isPrintView && <Sidebar activeView={activeView} onNavigate={onNavigate} />}
      <div className="flex min-h-screen flex-1 flex-col">
        {!isPrintView && <Topbar title={VIEW_TITLES[activeView]} onNavigate={onNavigate} />}
        <main className={`flex-1 ${isPrintView ? '' : 'px-4 py-6 pb-24 sm:px-6 lg:pb-6'}`}>
          <div className={isPrintView ? '' : 'mx-auto max-w-6xl'}>{children}</div>
        </main>
        {!isPrintView && !isStudyView && <MobileNavigation activeView={activeView} onNavigate={onNavigate} />}
      </div>
      {!isPrintView && <ToastStack />}
    </div>
  );
}
