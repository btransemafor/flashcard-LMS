import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useApp } from '@/store/AppContext';
import { DashboardView } from '@/views/DashboardView';
import { LibraryView } from '@/views/LibraryView';
import { StudyView } from '@/views/StudyView';
import { ImportView } from '@/views/ImportView';
import { ProgressView } from '@/views/ProgressView';
import { SettingsView } from '@/views/SettingsView';
import { BackupView } from '@/views/BackupView';
import { PrintView } from '@/views/PrintView';

export type ViewId = 'dashboard' | 'library' | 'study' | 'import' | 'progress' | 'settings' | 'backup' | 'print';

export default function App() {
  const {
    state: { bootstrapped, dbError }
  } = useApp();
  const [activeView, setActiveView] = useState<ViewId>(() => {
    const p = window.location.pathname.replace(/^\//, '');
    switch (p) {
      case 'library':
        return 'library';
      case 'study':
        return 'study';
      case 'import':
        return 'import';
      case 'progress':
        return 'progress';
      case 'settings':
        return 'settings';
      case 'backup':
        return 'backup';
      case 'print':
        return 'print';
      case '':
      case 'dashboard':
      default:
        return 'dashboard';
    }
  });
  const [libraryTopicFilter, setLibraryTopicFilter] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('topic') ?? null;
  });

  const viewToPath = useCallback((view: ViewId, opts?: { topic?: string }) => {
    switch (view) {
      case 'dashboard':
        return '/';
      case 'study':
        if (opts?.topic) return `/study?topic=${encodeURIComponent(opts.topic)}`;
        return '/study';
      default:
        return `/${view}`;
    }
  }, []);

  const navigate = useCallback((view: ViewId, opts?: { topic?: string }) => {
    const path = viewToPath(view, opts);
    window.history.pushState({}, '', path);
    setActiveView(view);
    setLibraryTopicFilter(opts?.topic ?? null);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [viewToPath]);

  useEffect(() => {
    const onPop = () => {
      const p = window.location.pathname.replace(/^\//, '');
      const params = new URLSearchParams(window.location.search);
      const topic = params.get('topic');
      switch (p) {
        case 'library':
          setActiveView('library');
          setLibraryTopicFilter(null);
          break;
        case 'study':
          setActiveView('study');
          setLibraryTopicFilter(topic ?? null);
          break;
        case 'import':
          setActiveView('import');
          break;
        case 'progress':
          setActiveView('progress');
          break;
        case 'settings':
          setActiveView('settings');
          break;
        case 'backup':
          setActiveView('backup');
          break;
        case 'print':
          setActiveView('print');
          break;
        case '':
        case 'dashboard':
        default:
          setActiveView('dashboard');
          setLibraryTopicFilter(null);
          break;
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openTopicInStudy = useCallback((topic: string | null) => {
    setLibraryTopicFilter(topic);
    navigate('study');
  }, []);

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-warm">
        <LoadingSpinner label="Loading Learning Playground…" />
      </div>
    );
  }

  return (
    <AppShell activeView={activeView} onNavigate={navigate}>
      {dbError && (
        <div className="mb-4 rounded-lg border border-warning/40 bg-warning-subtle px-4 py-3 text-sm text-warning">
          {dbError}
        </div>
      )}
      {activeView === 'dashboard' && <DashboardView onNavigate={navigate} onStudyTopic={openTopicInStudy} />}
      {activeView === 'library' && <LibraryView onStudyTopic={openTopicInStudy} onNavigate={navigate} />}
      {activeView === 'study' && (
        <StudyView topicFilter={libraryTopicFilter} onExitTopicFilter={() => setLibraryTopicFilter(null)} onNavigate={navigate} />
      )}
      {activeView === 'import' && <ImportView onNavigate={navigate} />}
      {activeView === 'progress' && <ProgressView />}
      {activeView === 'settings' && <SettingsView />}
      {activeView === 'backup' && <BackupView onNavigate={navigate} />}
      {activeView === 'print' && <PrintView onNavigate={navigate} />}
    </AppShell>
  );
}
