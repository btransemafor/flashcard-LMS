import React, { useMemo, useState } from 'react';
import { LayoutGrid, List, Search, Upload } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { ViewId } from '@/App';
import { EmptyState } from '@/components/common/EmptyState';
import { TopicCard } from '@/components/library/TopicCard';
import { TopicDetailDrawer } from '@/components/library/TopicDetailDrawer';
import { buildTopicSummaries } from '@/utils/topicSelectors';

interface LibraryViewProps {
  onStudyTopic: (topic: string | null) => void;
  onNavigate: (view: ViewId) => void;
}

export function LibraryView({ onStudyTopic, onNavigate }: LibraryViewProps) {
  const {
    state: { cards, ui },
    actions: { updateUIPreferences, loadDemoData }
  } = useApp();
  const [search, setSearch] = useState('');
  const [detailTopic, setDetailTopic] = useState<string | null>(null);

  const { status, sort, view } = ui.lastLibraryFilters;

  const summaries = useMemo(() => {
    let list = buildTopicSummaries(cards);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => s.topic.toLowerCase().includes(q));
    }
    if (status === 'due') list = list.filter((s) => s.dueCount > 0);
    if (status === 'new') list = list.filter((s) => s.newCount > 0);
    if (status === 'mastered') list = list.filter((s) => s.masteredCount > 0);

    switch (sort) {
      case 'name':
        list = [...list].sort((a, b) => a.topic.localeCompare(b.topic));
        break;
      case 'due':
        list = [...list].sort((a, b) => b.dueCount - a.dueCount);
        break;
      case 'mastery':
        list = [...list].sort((a, b) => b.progressPercent - a.progressPercent);
        break;
      case 'recent':
      default:
        list = [...list].sort((a, b) => ((a.lastStudied ?? '') < (b.lastStudied ?? '') ? 1 : -1));
    }
    return list;
  }, [cards, search, status, sort]);

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={Upload}
        title="No decks yet"
        description="Import an Excel workbook to populate your library, or try a demo library first."
        primaryAction={{ label: 'Import Excel', onClick: () => onNavigate('import') }}
        secondaryAction={{ label: 'Load demo library', onClick: loadDemoData }}
      />
    );
  }

  const detailSummary = detailTopic ? summaries.find((s) => s.topic === detailTopic) ?? buildTopicSummaries(cards).find((s) => s.topic === detailTopic) : null;
  const detailCards = detailTopic ? cards.filter((c) => c.topic === detailTopic) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <label htmlFor="library-search" className="sr-only">
            Search topics
          </label>
          <input
            id="library-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topics…"
            className="input-field pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => updateUIPreferences({ lastLibraryFilters: { ...ui.lastLibraryFilters, status: e.target.value as typeof status } })}
            className="input-field !w-auto"
          >
            <option value="all">All statuses</option>
            <option value="due">Due</option>
            <option value="new">New</option>
            <option value="mastered">Mastered</option>
          </select>
          <select
            aria-label="Sort topics"
            value={sort}
            onChange={(e) => updateUIPreferences({ lastLibraryFilters: { ...ui.lastLibraryFilters, sort: e.target.value as typeof sort } })}
            className="input-field !w-auto"
          >
            <option value="recent">Recently studied</option>
            <option value="name">Name</option>
            <option value="due">Due count</option>
            <option value="mastery">Mastery</option>
          </select>
          <div className="flex items-center rounded-lg border border-border p-1">
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
              onClick={() => updateUIPreferences({ lastLibraryFilters: { ...ui.lastLibraryFilters, view: 'grid' } })}
              className={`rounded-md p-1.5 ${view === 'grid' ? 'bg-primary-subtle text-primary' : 'text-ink-muted'}`}
            >
              <LayoutGrid size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="List view"
              aria-pressed={view === 'list'}
              onClick={() => updateUIPreferences({ lastLibraryFilters: { ...ui.lastLibraryFilters, view: 'list' } })}
              className={`rounded-md p-1.5 ${view === 'list' ? 'bg-primary-subtle text-primary' : 'text-ink-muted'}`}
            >
              <List size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {summaries.length === 0 ? (
        <EmptyState icon={Search} title="No topics match your filters" description="Try a different search term or clear your filters." />
      ) : (
        <div className={view === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}>
          {summaries.map((summary) => (
            <TopicCard
              key={summary.topic}
              summary={summary}
              view={view}
              onStudy={() => onStudyTopic(summary.topic)}
              onOpenDetail={() => setDetailTopic(summary.topic)}
              onPrint={() => onNavigate('print')}
            />
          ))}
        </div>
      )}

      {detailSummary && (
        <TopicDetailDrawer
          summary={detailSummary}
          cards={detailCards}
          onClose={() => setDetailTopic(null)}
          onStudy={() => {
            setDetailTopic(null);
            onStudyTopic(detailSummary.topic);
          }}
        />
      )}
    </div>
  );
}
