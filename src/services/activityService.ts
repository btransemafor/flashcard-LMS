import type { ActivityDay, Card } from '@/types';
import { getAllActivity, upsertActivity } from '@/services/databaseService';
import { toLocalDateKey, todayKey, daysUntil } from '@/utils/date';
import { addDays, subDays, parseISO } from 'date-fns';

export interface ActivityDelta {
  reviews: number;
  correct: number;
  wrong: number;
  studyMinutes: number;
}

/** Adds today's session results into the activity log (creating today's row if needed). */
export async function recordActivity(delta: ActivityDelta, date: Date = new Date()): Promise<ActivityDay> {
  const key = toLocalDateKey(date);
  const existing = (await getAllActivity()).find((a) => a.date === key);
  const merged: ActivityDay = {
    date: key,
    reviews: (existing?.reviews ?? 0) + delta.reviews,
    correct: (existing?.correct ?? 0) + delta.correct,
    wrong: (existing?.wrong ?? 0) + delta.wrong,
    studyMinutes: (existing?.studyMinutes ?? 0) + delta.studyMinutes
  };
  await upsertActivity(merged);
  return merged;
}

/** Computes current and longest streaks (consecutive local-calendar days with at least one review). */
export function computeStreaks(activity: ActivityDay[], referenceDate: Date = new Date()): { current: number; longest: number } {
  const daySet = new Set(activity.filter((a) => a.reviews > 0).map((a) => a.date));
  if (daySet.size === 0) return { current: 0, longest: 0 };

  // Current streak: walk backwards from today while days are present.
  let current = 0;
  let cursor = referenceDate;
  const todayStr = toLocalDateKey(referenceDate);
  if (!daySet.has(todayStr)) {
    // Allow the streak to still "count" as of yesterday (user hasn't studied yet today).
    cursor = subDays(referenceDate, 1);
  }
  while (daySet.has(toLocalDateKey(cursor))) {
    current++;
    cursor = subDays(cursor, 1);
  }

  // Longest streak: scan all known days chronologically.
  const sortedDays = Array.from(daySet).sort();
  let longest = 0;
  let running = 0;
  let prevDate: Date | null = null;
  for (const d of sortedDays) {
    const parsed = parseISO(d);
    if (prevDate && toLocalDateKey(addDays(prevDate, 1)) === d) {
      running++;
    } else {
      running = 1;
    }
    longest = Math.max(longest, running);
    prevDate = parsed;
  }

  return { current, longest };
}

/** Builds a contiguous list of the last N days (oldest first) for heatmap rendering. */
export function buildHeatmapSeries(activity: ActivityDay[], days = 182, referenceDate: Date = new Date()) {
  const byDate = new Map(activity.map((a) => [a.date, a]));
  const series: { date: string; reviews: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(referenceDate, i);
    const key = toLocalDateKey(d);
    series.push({ date: key, reviews: byDate.get(key)?.reviews ?? 0 });
  }
  return series;
}

/** Builds the last 7 days of activity (oldest first) for the weekly bar chart. */
export function buildWeeklySeries(activity: ActivityDay[], referenceDate: Date = new Date()) {
  return buildHeatmapSeries(activity, 7, referenceDate);
}

/** Groups due cards by their next-review day for the next N days (including today, which means "due now"). */
export function buildUpcomingReviews(cards: Card[], days = 7, referenceDate: Date = new Date()) {
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    buckets.set(toLocalDateKey(addDays(referenceDate, i)), 0);
  }
  for (const card of cards) {
    if (!card.progress.nextReview) continue;
    const until = daysUntil(card.progress.nextReview, referenceDate);
    if (until === null || until < 0 || until >= days) continue;
    const key = toLocalDateKey(addDays(referenceDate, until));
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

export { todayKey };
