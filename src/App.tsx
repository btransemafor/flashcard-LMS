import React, { useCallback, useState } from 'react';
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
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [libraryTopicFilter, setLibraryTopicFilter] = useState<string | null>(null);

  const navigate = useCallback((view: ViewId) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const openTopicInStudy = useCallback((topic: string | null) => {
    setLibraryTopicFilter(topic);
    setActiveView('study');
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
