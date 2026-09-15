import React, { useMemo } from 'react';
import { BarChart3, Clock, Flame, GraduationCap, Layers, Sparkles, Target } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { StatCard } from '@/components/common/StatCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import { ReviewChart } from '@/components/dashboard/ReviewChart';
import { countByStatus, isMasteredCard, isNewCard, isLearningCard } from '@/utils/cardStatus';
import { buildHeatmapSeries, buildUpcomingReviews, buildWeeklySeries, computeStreaks } from '@/services/activityService';
import { formatDisplayDate } from '@/utils/date';

export function ProgressView() {
  const {
    state: { cards, studySessions, activity }
  } = useApp();

  const stats = useMemo(() => countByStatus(cards), [cards]);
  const streaks = useMemo(() => computeStreaks(activity), [activity]);
  const weeklySeries = useMemo(() => buildWeeklySeries(activity), [activity]);
  const heatmapSeries = useMemo(() => buildHeatmapSeries(activity), [activity]);
  const upcoming = useMemo(() => buildUpcomingReviews(cards, 7), [cards]);

  const totalReviewed = studySessions.reduce((sum, s) => sum + s.reviewed, 0);
  const totalCorrect = studySessions.reduce((sum, s) => sum + s.correct, 0);
  const totalWrong = studySessions.reduce((sum, s) => sum + s.wrong, 0);
  const accuracy = totalReviewed > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong || 1)) * 100) : 0;
  const totalStudyMinutes = Math.round(studySessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60);

  const byTopic = useMemo(() => {
    const map = new Map<string, { total: number; mastered: number; learning: number; brandNew: number; correct: number; wrong: number }>();
    for (const card of cards) {
      const key = card.topic || 'General';
      if (!map.has(key)) map.set(key, { total: 0, mastered: 0, learning: 0, brandNew: 0, correct: 0, wrong: 0 });
      const entry = map.get(key)!;
      entry.total++;
      if (isMasteredCard(card)) entry.mastered++;
      else if (isLearningCard(card)) entry.learning++;
      if (isNewCard(card)) entry.brandNew++;
      entry.correct += card.progress.correct;
      entry.wrong += card.progress.wrong;
    }
    return Array.from(map.entries()).map(([topic, v]) => ({
      topic,
      ...v,
      accuracy: v.correct + v.wrong > 0 ? Math.round((v.correct / (v.correct + v.wrong)) * 100) : null
    }));
  }, [cards]);

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No progress yet"
        description="Import a workbook and complete a study session to see your progress here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Reviews logged" value={totalReviewed} icon={Layers} tone="primary" />
        <StatCard label="Accuracy" value={`${accuracy}%`} icon={Target} tone="success" />
        <StatCard label="Study time" value={`${totalStudyMinutes}m`} icon={Clock} tone="accent" />
        <StatCard label="Current streak" value={`${streaks.current}d`} icon={Flame} tone="warning" hint={`Longest: ${streaks.longest}d`} />
      </section>

      <section className="grid grid-cols-3 gap-4">
        <div className="card-surface p-4 text-center">
          <GraduationCap size={18} className="mx-auto mb-1 text-success" aria-hidden="true" />
          <p className="text-lg font-semibold text-ink">{stats.mastered}</p>
          <p className="text-xs text-ink-secondary">Mastered</p>
        </div>
        <div className="card-surface p-4 text-center">
          <BarChart3 size={18} className="mx-auto mb-1 text-accent" aria-hidden="true" />
          <p className="text-lg font-semibold text-ink">{cards.length - stats.mastered - stats.brandNew}</p>
          <p className="text-xs text-ink-secondary">Learning</p>
        </div>
        <div className="card-surface p-4 text-center">
          <Sparkles size={18} className="mx-auto mb-1 text-primary" aria-hidden="true" />
          <p className="text-lg font-semibold text-ink">{stats.brandNew}</p>
          <p className="text-xs text-ink-secondary">New</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-ink">Reviews by day</h3>
          <ReviewChart series={weeklySeries} />
        </section>
        <section className="card-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-ink">Study heatmap</h3>
          <ActivityHeatmap series={heatmapSeries} />
        </section>
      </div>

      <section className="card-surface p-5">
        <h3 className="mb-4 text-sm font-semibold text-ink">Performance by topic</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">Topic</th>
                <th className="py-2 pr-3 font-medium">Mastered</th>
                <th className="py-2 pr-3 font-medium">Learning</th>
                <th className="py-2 pr-3 font-medium">New</th>
                <th className="py-2 pr-3 font-medium">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {byTopic.map((row) => (
                <tr key={row.topic} className="border-t border-border">
                  <td className="py-2 pr-3 font-medium text-ink">{row.topic}</td>
                  <td className="py-2 pr-3 text-ink-secondary">{row.mastered}</td>
                  <td className="py-2 pr-3 text-ink-secondary">{row.learning}</td>
                  <td className="py-2 pr-3 text-ink-secondary">{row.brandNew}</td>
                  <td className="py-2 pr-3 text-ink-secondary">{row.accuracy === null ? '—' : `${row.accuracy}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card-surface p-5">
        <h3 className="mb-4 text-sm font-semibold text-ink">Upcoming reviews (next 7 days)</h3>
        <div className="grid grid-cols-7 gap-2 text-center">
          {upcoming.map((day) => (
            <div key={day.date} className="rounded-lg border border-border p-2">
              <p className="text-[10px] text-ink-muted">{formatDisplayDate(new Date(day.date).toISOString(), 'dd/MM')}</p>
              <p className="mt-1 text-sm font-semibold text-ink">{day.count}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
