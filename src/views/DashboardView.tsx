import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { BookOpen, Flame, GraduationCap, Layers, Sparkles, Upload } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { ViewId } from '@/App';
import { StatCard } from '@/components/common/StatCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import { ReviewChart } from '@/components/dashboard/ReviewChart';
import { countByStatus, isNewCard } from '@/utils/cardStatus';
import { buildTopicSummaries } from '@/utils/topicSelectors';
import { buildHeatmapSeries, buildWeeklySeries, computeStreaks } from '@/services/activityService';
import { formatDisplayDate } from '@/utils/date';

interface DashboardViewProps {
  onNavigate: (view: ViewId) => void;
  onStudyTopic: (topic: string | null) => void;
}

export function DashboardView({ onNavigate, onStudyTopic }: DashboardViewProps) {
  const {
    state: { cards, activity },
    actions: { loadDemoData, startSession }
  } = useApp();

  const stats = useMemo(() => countByStatus(cards), [cards]);
  const streaks = useMemo(() => computeStreaks(activity), [activity]);
  const topics = useMemo(() => buildTopicSummaries(cards).sort((a, b) => (a.lastStudied && b.lastStudied ? (a.lastStudied < b.lastStudied ? 1 : -1) : b.dueCount - a.dueCount)), [cards]);
  const weeklySeries = useMemo(() => buildWeeklySeries(activity), [activity]);
  const heatmapSeries = useMemo(() => buildHeatmapSeries(activity), [activity]);

  const newCards = cards.filter((c) => isNewCard(c));
  const learningCards = cards.filter((c) => !isNewCard(c) && stats.due > 0 && c.progress.repetitions > 0);
  const dueForReview = cards.filter((c) => !isNewCard(c));

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Your learning playground is empty"
        description="Import an Excel workbook with your flashcards, or explore a demo library to see how everything works."
        primaryAction={{ label: 'Import Excel', onClick: () => onNavigate('import') }}
        secondaryAction={{ label: 'Load demo library', onClick: loadDemoData }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-secondary">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>

      <section className="card-surface overflow-hidden bg-primary-subtle/40 p-8">
        <h2 className="text-2xl font-semibold text-ink">Your learning playground</h2>
        <p className="mt-2 max-w-lg text-sm text-ink-secondary">
          {stats.due > 0
            ? `${stats.due} cards are ready for review. Small, steady sessions beat cramming — let's keep your streak alive.`
            : 'No cards are due right now. Explore your library or get ahead on new material.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              startSession();
              onNavigate('study');
            }}
            disabled={stats.due === 0}
          >
            Start today's review
          </button>
          <button type="button" className="btn-secondary" onClick={() => onNavigate('library')}>
            Explore library
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Due today" value={stats.due} icon={Layers} tone="primary" />
        <StatCard label="Learned" value={stats.learned} icon={BookOpen} tone="accent" />
        <StatCard label="Mastered" value={stats.mastered} icon={GraduationCap} tone="success" />
        <StatCard label="Current streak" value={`${streaks.current} day${streaks.current === 1 ? '' : 's'}`} icon={Flame} tone="warning" />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card-surface p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Continue learning</h3>
            <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => onNavigate('library')}>
              View all
            </button>
          </div>
          <ul className="space-y-3">
            {topics.slice(0, 5).map((topic) => (
              <li key={topic.topic} className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{topic.topic}</p>
                  <div className="mt-1.5 h-1.5 w-full max-w-[220px] rounded-full bg-surface-secondary">
                    <div
                      className="h-1.5 rounded-full bg-primary transition-all duration-200"
                      style={{ width: `${topic.progressPercent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {topic.dueCount} cards left · Last studied {topic.lastStudied ? formatDisplayDate(topic.lastStudied) : 'never'}
                  </p>
                </div>
                <button type="button" className="btn-secondary !min-h-[36px] shrink-0" onClick={() => onStudyTopic(topic.topic)}>
                  Continue
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-ink">Today's queue</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-primary-subtle px-3.5 py-2.5 text-sm">
              <span className="text-ink">New cards</span>
              <span className="font-semibold text-primary">{newCards.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-accent-subtle px-3.5 py-2.5 text-sm">
              <span className="text-ink">Learning cards</span>
              <span className="font-semibold text-accent">{learningCards.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-secondary px-3.5 py-2.5 text-sm">
              <span className="text-ink">Review cards</span>
              <span className="font-semibold text-ink-secondary">{dueForReview.length}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-ink">Weekly activity</h3>
          <ReviewChart series={weeklySeries} />
        </section>
        <section className="card-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-ink">Study heatmap</h3>
          <ActivityHeatmap series={heatmapSeries} />
        </section>
      </div>

      <div className="flex justify-center">
        <button type="button" className="btn-ghost text-xs" onClick={() => onNavigate('import')}>
          <Upload size={14} aria-hidden="true" /> Import another workbook
        </button>
      </div>
    </div>
  );
}
