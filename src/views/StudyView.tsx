import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { ViewId } from '@/App';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Flashcard } from '@/components/study/Flashcard';
import { RatingControls } from '@/components/study/RatingControls';
import { SessionProgress } from '@/components/study/SessionProgress';
import { SessionSummary } from '@/components/study/SessionSummary';
import { countByStatus } from '@/utils/cardStatus';
import type { Rating } from '@/types';

interface StudyViewProps {
  topicFilter: string | null;
  onExitTopicFilter: () => void;
  onNavigate: (view: ViewId) => void;
}

export function StudyView({ topicFilter, onExitTopicFilter, onNavigate }: StudyViewProps) {
  const {
    state: { cards, activeSession, dataset, ui },
    actions: { startSession, revealCard, rateCard, endSession, dismissSessionSummary, saveProgress, exportExcel }
  } = useApp();

  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const startedForTopic = useRef<string | null>(null);

  useEffect(() => {
    if (topicFilter && !activeSession && startedForTopic.current !== topicFilter) {
      startedForTopic.current = topicFilter;
      startSession({ topic: topicFilter });
    }
  }, [topicFilter, activeSession, startSession]);

  const requestEndSession = () => {
    if (ui.confirmBeforeEndingSession) {
      setConfirmEndOpen(true);
    } else {
      endSession();
    }
  };

  useEffect(() => {
    if (!activeSession || activeSession.endedAt) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (!activeSession.revealed) revealCard();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        requestEndSession();
        return;
      }
      if (!activeSession.revealed) return;
      const map: Record<string, Rating> = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' };
      const rating = map[e.key];
      if (rating) {
        e.preventDefault();
        rateCard(rating);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession, revealCard, rateCard]);

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Nothing to study yet"
        description="Import a workbook to add flashcards to your library."
        primaryAction={{ label: 'Import Excel', onClick: () => onNavigate('import') }}
      />
    );
  }

  if (activeSession?.endedAt) {
    return (
      <SessionSummary
        session={activeSession}
        isDirty={Boolean(dataset?.isDirty)}
        onSaveProgress={saveProgress}
        onExportExcel={exportExcel}
        onBackToDashboard={() => {
          dismissSessionSummary();
          onExitTopicFilter();
          onNavigate('dashboard');
        }}
      />
    );
  }

  if (!activeSession) {
    const stats = countByStatus(cards);
    return (
      <div className="mx-auto max-w-md text-center">
        <EmptyState
          icon={CheckCircle2}
          title={stats.due > 0 ? `${stats.due} cards are ready for review` : 'No cards are due'}
          description={
            stats.due > 0
              ? 'Start a session to review new and due cards using spaced repetition.'
              : 'No cards are due. Explore your library or learn something new.'
          }
          primaryAction={{
            label: topicFilter ? `Study ${topicFilter}` : 'Start studying',
            onClick: () => startSession(topicFilter ? { topic: topicFilter } : undefined)
          }}
          secondaryAction={{ label: 'Browse library', onClick: () => onNavigate('library') }}
        />
      </div>
    );
  }

  if (activeSession.queue.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="All caught up"
        description="No cards are due right now. Great job staying on top of your reviews."
        primaryAction={{ label: 'Back to dashboard', onClick: () => { dismissSessionSummary(); onNavigate('dashboard'); } }}
      />
    );
  }

  const currentCard = activeSession.queue[activeSession.currentIndex];

  if (!currentCard) {
    endSession();
    return null;
  }

  return (
    <div>
      <SessionProgress
        topicLabel={topicFilter ?? currentCard.topic}
        current={activeSession.currentIndex}
        total={activeSession.queue.length}
        isDirty={Boolean(dataset?.isDirty)}
        onEnd={requestEndSession}
      />

      <Flashcard card={currentCard} revealed={activeSession.revealed} onReveal={revealCard} />

      <div className="mt-6">
        <RatingControls disabled={!activeSession.revealed} onRate={rateCard} />
      </div>

      {ui.showKeyboardShortcuts && (
        <p className="mt-4 text-center text-xs text-ink-muted">
          Space to reveal · 1 Again · 2 Hard · 3 Good · 4 Easy · Esc to end session
        </p>
      )}

      <ConfirmDialog
        open={confirmEndOpen}
        title="End this study session?"
        description="Your progress so far will be saved locally. You can review the summary right after."
        confirmLabel="End session"
        onConfirm={() => {
          setConfirmEndOpen(false);
          endSession();
        }}
        onCancel={() => setConfirmEndOpen(false)}
      />
    </div>
  );
}
