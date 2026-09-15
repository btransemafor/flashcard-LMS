import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  X,
  Flame,
  Trophy,
  PartyPopper,
  Sparkles,
  ThumbsUp,
  Clock,
  Target,
  Shuffle,
  Repeat,
  History,
  RotateCcw,
  ListChecks,
  Eye,
  Trash2
} from 'lucide-react';
import type { Card } from '@/types';
import { generateQuizQuestions } from '@/services/quizService';
import { randomIdFragment } from '@/utils/normalize';
import { addQuizSession, updateQuizSession, getQuizSession, listQuizSessions, deleteQuizSession } from '@/services/databaseService';
import { applyRating } from '@/services/sm2Service';
import { putCard } from '@/services/databaseService';

interface QuizPanelProps {
  cards: Card[];
  onClose: () => void;
  initialSessionId?: string | null;
}

type QuizDirection = 'mixed' | 'term-to-definition' | 'definition-to-term';
type QuizSource = 'all' | 'due' | 'new' | 'difficult';

interface QuizAnswerOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  prompt: string;
  direction: Exclude<QuizDirection, 'mixed'>;
  answers: QuizAnswerOption[];
  correctAnswerId: string;
  sourceCardId: string;
}

interface QuizResponse {
  questionId: string;
  selectedAnswerId: string;
  correctAnswerId: string;
  isCorrect: boolean;
  answeredAt: string;
  responseTimeMs: number;
  attemptNumber: number;
}

interface QuizConfig {
  topicIds: string[];
  direction: QuizDirection;
  source: QuizSource;
  questionCount: number;
  shuffleQuestions: boolean;
  prioritizeDifficult: boolean;
  retryIncorrectAtEnd: boolean;
  updateProgress: boolean;
}

interface QuizSession {
  id: string;
  datasetId: string;
  startedAt: string;
  endedAt: string | null;
  questions: QuizQuestion[];
  responses: QuizResponse[];
  currentIndex: number;
  config: QuizConfig;
  status: 'in-progress' | 'completed';
}

/** One reviewable question entry — built for EVERY answered question, correct or not. */
interface ReviewItem {
  questionId: string;
  prompt: string;
  direction: Exclude<QuizDirection, 'mixed'>;
  allAnswers: QuizAnswerOption[];
  selectedAnswerId: string;
  selectedText: string;
  correctAnswerId: string;
  correctText: string;
  isCorrect: boolean;
  responseTimeMs: number;
}

interface QuizSummary {
  total: number;
  correct: number;
  review: ReviewItem[];
  durationSeconds: number;
}

type ReviewFilter = 'all' | 'correct' | 'incorrect';

const DEFAULT_CONFIG: QuizConfig = {
  topicIds: [],
  direction: 'mixed',
  source: 'all',
  questionCount: 5,
  shuffleQuestions: true,
  prioritizeDifficult: false,
  retryIncorrectAtEnd: false,
  updateProgress: false
};

/** Tiered, upbeat performance messaging — the "praise" system shown on the results screen. */
function getPerformanceTier(percent: number) {
  if (percent === 100) {
    return {
      icon: Trophy,
      iconClasses: 'bg-warning-subtle text-warning',
      headline: 'Perfect score!',
      subtext: "Every single answer was spot on. That's mastery in action.",
      confetti: true
    };
  }
  if (percent >= 80) {
    return {
      icon: PartyPopper,
      iconClasses: 'bg-success-subtle text-success',
      headline: 'Excellent work!',
      subtext: "You're clearly retaining this material. Keep the momentum going.",
      confetti: true
    };
  }
  if (percent >= 60) {
    return {
      icon: ThumbsUp,
      iconClasses: 'bg-primary-subtle text-primary',
      headline: 'Solid effort!',
      subtext: "You're most of the way there — a bit more review and this will stick for good.",
      confetti: false
    };
  }
  return {
    icon: Sparkles,
    iconClasses: 'bg-accent-subtle text-accent',
    headline: 'Good start!',
    subtext: 'Every quiz is practice. Review the ones you missed and try again — progress compounds.',
    confetti: false
  };
}

/** Short, varied encouragement shown right after each answer. Never discouraging on a miss. */
function getInlineFeedback(isCorrect: boolean, streak: number): string {
  if (isCorrect) {
    if (streak >= 5) return `Unstoppable! ${streak} in a row 🔥`;
    if (streak >= 3) return `On fire — ${streak} in a row!`;
    const messages = ['Nice!', 'Correct!', "That's it!", 'Great recall!'];
    return messages[streak % messages.length];
  }
  const messages = ["Close — you'll get the next one.", 'No worries, keep going.', "That one's tricky — noted for review."];
  return messages[Math.floor(Math.random() * messages.length)];
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function QuizPanel({ cards, onClose, initialSessionId }: QuizPanelProps) {
  const [started, setStarted] = useState(false);
  const [config, setConfig] = useState<QuizConfig>({ ...DEFAULT_CONFIG });
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const [summary, setSummary] = useState<QuizSummary | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [inlineFeedback, setInlineFeedback] = useState<string | null>(null);
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [startedAtIso, setStartedAtIso] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  const liveRef = useRef<HTMLDivElement | null>(null);
  const questionStartRef = useRef<number>(Date.now());
  const retriedQuestionIdsRef = useRef<Set<string>>(new Set());
  /**
   * Canonical, in-memory list of every response given this session. This is the single
   * source of truth for building the end-of-quiz review — it is updated synchronously
   * the instant an answer is selected, so it can never be "stale" the way a fresh
   * IndexedDB read could be if a write from the very last answer hadn't finished yet.
   */
  const responsesRef = useRef<QuizResponse[]>([]);
  /** Serializes all IndexedDB writes for the active session so they can never race each other. */
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());
  const enqueuePersist = useCallback((task: () => Promise<void>) => {
    persistQueueRef.current = persistQueueRef.current.then(task).catch(() => undefined);
    return persistQueueRef.current;
  }, []);

  const datasetId = cards[0]?.datasetId ?? 'unknown';

  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [currentIndex, started]);

  const resetLocalState = () => {
    setCurrentIndex(0);
    setSelectedAnswerId(null);
    setAnswered(false);
    setCorrectCount(0);
    setStreak(0);
    setInlineFeedback(null);
    setFinished(false);
    setSummary(null);
    setReviewFilter('all');
    setExpandedReviewId(null);
    retriedQuestionIdsRef.current = new Set();
    responsesRef.current = [];
  };

  const start = () => {
    const qs = generateQuizQuestions(cards, config) as QuizQuestion[];
    resetLocalState();
    setQuestions(qs);
    setStarted(true);
    const newSessionId = `quiz-${randomIdFragment()}`;
    const nowIso = new Date().toISOString();
    setStartedAtIso(nowIso);
    const session: QuizSession = {
      id: newSessionId,
      datasetId,
      startedAt: nowIso,
      endedAt: null,
      questions: qs,
      responses: [],
      currentIndex: 0,
      config,
      status: 'in-progress'
    };
    setSessionId(newSessionId);
    void addQuizSession(session);
  };

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const rows = (await listQuizSessions(datasetId)) as QuizSession[];
        if (mounted) setSessions(rows.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1)));
      } catch {
        /* saved-session list is a convenience feature; failures are non-fatal */
      }
    })();
    return () => {
      mounted = false;
    };
  }, [datasetId]);

  const resumeSession = useCallback(async (id: string) => {
    const s = (await getQuizSession(id)) as QuizSession | undefined;
    if (!s) return;
    responsesRef.current = s.responses || [];
    setQuestions(s.questions || []);
    setStarted(true);
    setSessionId(s.id);
    setStartedAtIso(s.startedAt);
    setCurrentIndex(s.currentIndex || 0);
    const correct = (s.responses || []).filter((r) => r.isCorrect).length;
    setCorrectCount(correct);
    setFinished(false);
    setSummary(null);
    setSelectedAnswerId(null);
    setAnswered(false);
  }, []);

  useEffect(() => {
    if (!started && initialSessionId) {
      void resumeSession(initialSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSessionId]);

  const copyShareLink = async (id?: string | null) => {
    if (!id) return;
    try {
      const url = new URL(window.location.href);
      url.pathname = '/study';
      url.searchParams.set('quiz', id);
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // best-effort — ignore failures
    }
  };

  const current = questions[currentIndex];
  const progressPercent = questions.length > 0 ? Math.round((currentIndex / questions.length) * 100) : 0;

  /**
   * Builds the full review list (every answered question, correct or not) directly from
   * in-memory state — never from a fresh IndexedDB read, which could race with the write
   * of the very last answer and silently omit it (the bug this fixes).
   */
  const buildReviewFromResponses = (responses: QuizResponse[], qs: QuizQuestion[]): ReviewItem[] => {
    return responses.map((r) => {
      const q = qs.find((qq) => qq.id === r.questionId);
      const correctAnswer = q?.answers?.find((a) => a.id === r.correctAnswerId);
      const selected = q?.answers?.find((a) => a.id === r.selectedAnswerId);
      return {
        questionId: r.questionId,
        prompt: q?.prompt ?? 'Question',
        direction: q?.direction ?? 'term-to-definition',
        allAnswers: q?.answers ?? [],
        selectedAnswerId: r.selectedAnswerId,
        selectedText: selected?.text ?? '—',
        correctAnswerId: r.correctAnswerId,
        correctText: correctAnswer?.text ?? '—',
        isCorrect: r.isCorrect,
        responseTimeMs: r.responseTimeMs
      };
    });
  };

  /**
   * Opens a previously COMPLETED session in read-only "results" mode — reusing the exact
   * same summary screen shown right after finishing a quiz, rebuilt from the session's
   * saved questions + responses. This does not resume answering; use `resumeSession` for
   * sessions that are still in-progress.
   */
  const viewSession = useCallback(async (id: string) => {
    const s = (await getQuizSession(id)) as QuizSession | undefined;
    if (!s) return;
    const savedQuestions = s.questions || [];
    const savedResponses = s.responses || [];
    const review = buildReviewFromResponses(savedResponses, savedQuestions);
    const correct = savedResponses.filter((r) => r.isCorrect).length;
    const durationSeconds = s.endedAt
      ? Math.max(1, Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000))
      : 0;

    setQuestions(savedQuestions);
    setSessionId(s.id);
    setStartedAtIso(s.startedAt);
    setStarted(true);
    setFinished(true);
    setCorrectCount(correct);
    setSummary({ total: savedQuestions.length, correct, review, durationSeconds });
    setReviewFilter('all');
    setExpandedReviewId(null);
  }, []);

  /** Deletes a saved session (in-progress or completed) after the user confirms inline. */
  const deleteSession = useCallback(
    async (id: string) => {
      try {
        await deleteQuizSession(id);
      } catch {
        /* best-effort — the row is still removed from view below */
      }
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setConfirmDeleteId(null);
      if (sessionId === id) {
        // The session currently open (resumed or being viewed) was just deleted — back out to setup.
        resetLocalState();
        setQuestions([]);
        setStarted(false);
        setSessionId(null);
      }
    },
    [sessionId]
  );

  const finishQuiz = useCallback(() => {
    setFinished(true);

    // Build the summary from the synchronously-updated in-memory responses list.
    // This is guaranteed to include every answer, including the one that was just
    // given for the final question, with no dependency on IndexedDB read timing.
    const total = questions.length;
    const correct = responsesRef.current.filter((r) => r.isCorrect).length;
    const review = buildReviewFromResponses(responsesRef.current, questions);
    const durationSeconds = startedAtIso ? Math.max(1, Math.round((Date.now() - new Date(startedAtIso).getTime()) / 1000)) : 0;
    setSummary({ total, correct, review, durationSeconds });

    // Persist the final "completed" state in the background. Queued so it always runs
    // AFTER any still-pending response write for this same session finishes.
    enqueuePersist(async () => {
      if (!sessionId) return;
      const s = (await getQuizSession(sessionId)) as QuizSession | undefined;
      if (!s) return;
      s.endedAt = new Date().toISOString();
      s.status = 'completed';
      s.responses = responsesRef.current;
      await updateQuizSession(s);
    });
  }, [sessionId, startedAtIso, questions, enqueuePersist]);

  const selectAnswer = useCallback(
    (answerId: string) => {
      if (!current || answered) return;
      setSelectedAnswerId(answerId);
      setAnswered(true);

      const isCorrect = current.correctAnswerId === answerId;
      const nextStreak = isCorrect ? streak + 1 : 0;
      setStreak(nextStreak);
      setInlineFeedback(getInlineFeedback(isCorrect, nextStreak));
      if (isCorrect) setCorrectCount((c) => c + 1);

      if (liveRef.current) {
        liveRef.current.textContent = isCorrect ? 'Correct answer' : 'Incorrect answer';
      }

      const responseTimeMs = Date.now() - questionStartRef.current;
      const resp: QuizResponse = {
        questionId: current.id,
        selectedAnswerId: answerId,
        correctAnswerId: current.correctAnswerId,
        isCorrect,
        answeredAt: new Date().toISOString(),
        responseTimeMs,
        attemptNumber: retriedQuestionIdsRef.current.has(current.id) ? 2 : 1
      };

      // Update the in-memory response list synchronously — this is what the end-of-quiz
      // review reads from, so it can never miss the answer we just gave, even on the
      // very last question (see buildReviewFromResponses / finishQuiz above).
      responsesRef.current = [...responsesRef.current, resp];

      // Persist to IndexedDB in the background, queued so overlapping answers (or the
      // final "mark completed" write in finishQuiz) never race and overwrite each other.
      enqueuePersist(async () => {
        if (!sessionId) return;
        const session = (await getQuizSession(sessionId)) as QuizSession | undefined;
        if (!session) return;
        session.responses = [...(session.responses || []), resp];
        session.currentIndex = currentIndex;
        await updateQuizSession(session);
      });

      if (config.updateProgress) {
        try {
          const card = cards.find((c) => c.id === current.sourceCardId);
          if (card) {
            const newProgress = applyRating(card.progress, isCorrect ? 'good' : 'again');
            void putCard({ ...card, progress: newProgress });
          }
        } catch {
          /* SM-2 sync failure should never block quiz flow */
        }
      }

      const isLastQuestion = currentIndex >= questions.length - 1;
      if (isLastQuestion) {
        if (config.retryIncorrectAtEnd && !isCorrect && !retriedQuestionIdsRef.current.has(current.id)) {
          retriedQuestionIdsRef.current.add(current.id);
          setQuestions((prev) => [...prev, { ...current, id: `${current.id}-retry-${randomIdFragment()}` }]);
        } else {
          finishQuiz();
        }
      }
    },
    [answered, current, streak, sessionId, currentIndex, questions.length, config.updateProgress, config.retryIncorrectAtEnd, cards, finishQuiz, enqueuePersist]
  );

  const nextQuestion = () => {
    setSelectedAnswerId(null);
    setAnswered(false);
    setInlineFeedback(null);
    setCurrentIndex((i) => Math.min(i + 1, questions.length - 1));
  };

  useEffect(() => {
    if (!started || !current || finished) return;
    const handler = (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts when modifier keys are down (copy/paste, browser shortcuts)
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      const idxKeys = ['1', '2', '3', '4'];
      const letterKeys = ['a', 'b', 'c', 'd'];
      let idx = -1;
      if (idxKeys.includes(key)) idx = idxKeys.indexOf(key);
      if (letterKeys.includes(key)) idx = letterKeys.indexOf(key);
      if (idx >= 0 && current.answers[idx]) {
        e.preventDefault();
        selectAnswer(current.answers[idx].id);
        return;
      }
      if (key === 'enter' && answered && currentIndex < questions.length - 1) {
        e.preventDefault();
        nextQuestion();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [started, current, finished, selectAnswer, answered, currentIndex, questions.length]);

  const answerLetters = ['A', 'B', 'C', 'D'];
  const tier = summary ? getPerformanceTier(Math.round((summary.correct / Math.max(1, summary.total)) * 100)) : null;
  const showConfetti = tier?.confetti && !prefersReducedMotion();

  const filteredReview = useMemo(() => {
    if (!summary) return [];
    if (reviewFilter === 'correct') return summary.review.filter((r) => r.isCorrect);
    if (reviewFilter === 'incorrect') return summary.review.filter((r) => !r.isCorrect);
    return summary.review;
  }, [summary, reviewFilter]);

  const incorrectCount = summary ? summary.review.filter((r) => !r.isCorrect).length : 0;

  return (
    <div className="card-surface p-5 sm:p-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subtle text-primary">
            <Brain size={18} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ink">Quiz yourself</h3>
            <p className="text-xs text-ink-secondary">Multiple-choice practice, generated from your cards</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sessionId && (
            <button
              type="button"
              className="btn-ghost !h-9 !px-3"
              onClick={() => void copyShareLink(sessionId)}
              title={copied ? 'Link copied!' : 'Copy share link'}
            >
              <History size={16} aria-hidden="true" />
              <span className="sr-only">Copy share link</span>
            </button>
          )}
          <button
            type="button"
            aria-label="Close quiz"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary transition-colors duration-200 hover:bg-surface-secondary hover:text-ink"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {!started && (
        <div className="mt-5 animate-fade-in">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 rounded-lg border border-border px-3.5 py-3">
              <span className="text-xs font-medium text-ink-secondary">Number of questions</span>
              <input
                type="number"
                min={1}
                max={200}
                value={config.questionCount}
                onChange={(e) => setConfig((c) => ({ ...c, questionCount: Math.max(1, Number(e.target.value) || 1) }))}
                className="input-field !py-1.5"
              />
            </label>

            <label className="flex flex-col gap-1.5 rounded-lg border border-border px-3.5 py-3">
              <span className="text-xs font-medium text-ink-secondary">Direction</span>
              <select
                value={config.direction}
                onChange={(e) => setConfig((c) => ({ ...c, direction: e.target.value as QuizDirection }))}
                className="input-field !py-1.5"
              >
                <option value="mixed">Mixed</option>
                <option value="term-to-definition">Term → Definition</option>
                <option value="definition-to-term">Definition → Term</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5 rounded-lg border border-border px-3.5 py-3">
              <span className="text-xs font-medium text-ink-secondary">Source</span>
              <select
                value={config.source}
                onChange={(e) => setConfig((c) => ({ ...c, source: e.target.value as QuizSource }))}
                className="input-field !py-1.5"
              >
                <option value="all">All cards</option>
                <option value="due">Due</option>
                <option value="new">New</option>
                <option value="difficult">Difficult</option>
              </select>
            </label>

            <div className="flex flex-col gap-2 rounded-lg border border-border px-3.5 py-3">
              <span className="text-xs font-medium text-ink-secondary">Options</span>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={config.shuffleQuestions}
                  onChange={(e) => setConfig((c) => ({ ...c, shuffleQuestions: e.target.checked }))}
                  className="h-4 w-4 accent-primary"
                />
                <Shuffle size={14} className="text-ink-muted" aria-hidden="true" />
                Shuffle questions
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={config.retryIncorrectAtEnd}
                  onChange={(e) => setConfig((c) => ({ ...c, retryIncorrectAtEnd: e.target.checked }))}
                  className="h-4 w-4 accent-primary"
                />
                <Repeat size={14} className="text-ink-muted" aria-hidden="true" />
                Retry missed questions at the end
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={config.updateProgress}
                  onChange={(e) => setConfig((c) => ({ ...c, updateProgress: e.target.checked }))}
                  className="h-4 w-4 accent-primary"
                />
                <Target size={14} className="text-ink-muted" aria-hidden="true" />
                Update spaced-repetition progress
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button className="btn-primary" onClick={start} type="button">
              <Sparkles size={16} aria-hidden="true" />
              Start quiz
            </button>
            <button className="btn-ghost" onClick={() => setConfig({ ...DEFAULT_CONFIG })} type="button">
              <RotateCcw size={15} aria-hidden="true" />
              Reset options
            </button>
          </div>

          {sessions.length > 0 && (
            <div className="mt-6 border-t border-border pt-5">
              <div className="mb-3 flex items-center gap-2">
                <History size={15} className="text-ink-muted" aria-hidden="true" />
                <h4 className="text-sm font-semibold text-ink">Saved sessions</h4>
              </div>
              <ul className="space-y-2">
                {sessions.map((s) => {
                  const total = s.questions?.length ?? 0;
                  const answeredCount = s.responses?.length ?? 0;
                  const correctCountForSession = (s.responses ?? []).filter((r) => r.isCorrect).length;
                  const isConfirmingDelete = confirmDeleteId === s.id;
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">
                          {s.status === 'completed' ? 'Completed' : 'In progress'} · {total} question{total === 1 ? '' : 's'}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {new Date(s.startedAt).toLocaleString()} · {answeredCount}/{total} answered
                          {s.status === 'completed' && ` · ${correctCountForSession}/${total} correct`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {isConfirmingDelete ? (
                          <>
                            <span className="hidden text-xs text-ink-secondary sm:inline">Delete this session?</span>
                            <button
                              className="btn-danger !min-h-[36px] !px-3"
                              onClick={() => void deleteSession(s.id)}
                              type="button"
                            >
                              Delete
                            </button>
                            <button
                              className="btn-ghost !min-h-[36px] !px-3"
                              onClick={() => setConfirmDeleteId(null)}
                              type="button"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {s.status === 'completed' ? (
                              <button className="btn-secondary !min-h-[36px]" onClick={() => void viewSession(s.id)} type="button">
                                <Eye size={14} aria-hidden="true" />
                                View
                              </button>
                            ) : (
                              <button className="btn-secondary !min-h-[36px]" onClick={() => void resumeSession(s.id)} type="button">
                                Resume
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label="Delete session"
                              onClick={() => setConfirmDeleteId(s.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary transition-colors duration-200 hover:bg-error-subtle hover:text-error"
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {started && (
        <div className="mt-5">
          {questions.length === 0 && (
            <p className="rounded-lg border border-warning/30 bg-warning-subtle px-4 py-3 text-sm text-warning">
              No questions could be generated from the current filters. Try a broader source or fewer restrictions.
            </p>
          )}

          {questions.length > 0 && !finished && current && (
            <div className="animate-fade-in">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="badge-primary">
                    {current.direction === 'term-to-definition' ? 'Term → Definition' : 'Definition → Term'}
                  </span>
                  <p className="mt-2 whitespace-pre-line break-words text-base font-semibold text-ink">{current.prompt}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-xs font-medium text-ink-muted">
                    {currentIndex + 1} / {questions.length}
                  </span>
                  {streak >= 2 && (
                    <span className="badge-warning">
                      <Flame size={12} aria-hidden="true" /> {streak}
                    </span>
                  )}
                </div>
              </div>

              <div
                className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Quiz progress"
              >
                <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${progressPercent}%` }} />
              </div>

              <div role="list" className="grid gap-2.5">
                {current.answers.map((a, idx) => {
                  const isSelected = selectedAnswerId === a.id;
                  const isCorrectAnswer = a.id === current.correctAnswerId;
                  const showCorrect = answered && isCorrectAnswer;
                  const showIncorrect = answered && isSelected && !isCorrectAnswer;

                  let classes =
                    'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors duration-200 min-h-[48px]';
                  if (showCorrect) classes += ' border-success bg-success-subtle text-ink';
                  else if (showIncorrect) classes += ' border-error bg-error-subtle text-ink';
                  else if (answered) classes += ' border-border text-ink-secondary opacity-60';
                  else classes += ' border-border bg-surface text-ink hover:border-primary/50 hover:bg-primary-subtle/40';

                  return (
                    <button key={a.id} role="listitem" type="button" className={classes} onClick={() => selectAnswer(a.id)} disabled={answered}>
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          showCorrect
                            ? 'bg-success text-white'
                            : showIncorrect
                              ? 'bg-error text-white'
                              : 'bg-surface-secondary text-ink-secondary'
                        }`}
                      >
                        {answerLetters[idx] ?? idx + 1}
                      </span>
                      <span className="flex-1">{a.text}</span>
                      {showCorrect && <CheckCircle2 size={16} className="shrink-0 text-success" aria-hidden="true" />}
                      {showIncorrect && <XCircle size={16} className="shrink-0 text-error" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>

              {answered && inlineFeedback && (
                <p className={`mt-3 animate-fade-in text-sm font-medium ${selectedAnswerId === current.correctAnswerId ? 'text-success' : 'text-ink-secondary'}`}>
                  {inlineFeedback}
                </p>
              )}

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs font-medium text-ink-muted">
                  Score: {correctCount}/{currentIndex + (answered ? 1 : 0)}
                </span>
                <div className="flex items-center gap-2">
                  {answered && currentIndex < questions.length - 1 && (
                    <button className="btn-primary !min-h-[40px]" onClick={nextQuestion} type="button">
                      Next
                      <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  )}
                  <button className="btn-ghost !min-h-[40px]" onClick={onClose} type="button">
                    Close
                  </button>
                </div>
              </div>

              <p className="mt-3 text-center text-xs text-ink-muted">Press 1–4 or A–D to answer · Enter for next question</p>
              <div ref={liveRef} className="sr-only" aria-live="polite" />
            </div>
          )}

          {finished && (
            <div className="relative animate-fade-in overflow-hidden">
              {showConfetti && <ConfettiBurst />}

              <div className="relative flex flex-col items-center pt-2 text-center">
                {tier && (
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full ${tier.iconClasses}`}>
                    <tier.icon size={30} aria-hidden="true" />
                  </div>
                )}
                <h4 className="mt-4 text-xl font-semibold text-ink">{tier?.headline ?? 'Quiz complete'}</h4>
                <p className="mt-1.5 max-w-sm text-sm text-ink-secondary">{tier?.subtext}</p>

                <div className="mt-6 flex items-center gap-3">
                  <ScoreRing percent={Math.round(((summary?.correct ?? correctCount) / Math.max(1, summary?.total ?? questions.length)) * 100)} />
                  <div className="text-left">
                    <p className="text-2xl font-semibold text-ink">
                      {summary?.correct ?? correctCount}
                      <span className="text-base font-normal text-ink-muted"> / {summary?.total ?? questions.length}</span>
                    </p>
                    <p className="text-xs text-ink-secondary">correct answers</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="card-surface p-3 text-center">
                  <CheckCircle2 size={16} className="mx-auto mb-1 text-success" aria-hidden="true" />
                  <p className="text-lg font-semibold text-ink">{summary?.correct ?? correctCount}</p>
                  <p className="text-xs text-ink-secondary">Correct</p>
                </div>
                <div className="card-surface p-3 text-center">
                  <XCircle size={16} className="mx-auto mb-1 text-error" aria-hidden="true" />
                  <p className="text-lg font-semibold text-ink">{(summary?.total ?? questions.length) - (summary?.correct ?? correctCount)}</p>
                  <p className="text-xs text-ink-secondary">Missed</p>
                </div>
                <div className="card-surface p-3 text-center col-span-2 sm:col-span-1">
                  <Clock size={16} className="mx-auto mb-1 text-accent" aria-hidden="true" />
                  <p className="text-lg font-semibold text-ink">{summary ? `${summary.durationSeconds}s` : '—'}</p>
                  <p className="text-xs text-ink-secondary">Time spent</p>
                </div>
              </div>

              {/* ---- Full answer review: every question, correct or not ---- */}
              {summary && summary.review.length > 0 && (
                <div className="mt-6">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ListChecks size={16} className="text-ink-muted" aria-hidden="true" />
                      <h5 className="text-sm font-semibold text-ink">Review your answers</h5>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg border border-border p-1" role="group" aria-label="Filter review list">
                      {(
                        [
                          { id: 'all' as const, label: `All (${summary.review.length})` },
                          { id: 'incorrect' as const, label: `Missed (${incorrectCount})` },
                          { id: 'correct' as const, label: `Correct (${summary.review.length - incorrectCount})` }
                        ]
                      ).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          aria-pressed={reviewFilter === f.id}
                          onClick={() => setReviewFilter(f.id)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-200 ${
                            reviewFilter === f.id ? 'bg-primary-subtle text-primary' : 'text-ink-muted hover:text-ink'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredReview.length === 0 ? (
                    <p className="rounded-lg border border-border px-3.5 py-3 text-sm text-ink-secondary">
                      {reviewFilter === 'incorrect' ? 'Nothing here — you got every question right! 🎉' : 'No questions match this filter.'}
                    </p>
                  ) : (
                    <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                      {filteredReview.map((item, i) => {
                        const itemKey = `${item.questionId}-${i}`;
                        const isExpanded = expandedReviewId === itemKey;
                        return (
                          <li
                            key={itemKey}
                            className={`rounded-lg border px-3.5 py-3 ${item.isCorrect ? 'border-success/30 bg-success-subtle/40' : 'border-error/30 bg-error-subtle/40'}`}
                          >
                            <button
                              type="button"
                              className="flex w-full items-start justify-between gap-3 text-left"
                              onClick={() => setExpandedReviewId(isExpanded ? null : itemKey)}
                              aria-expanded={isExpanded}
                            >
                              <div className="flex min-w-0 items-start gap-2.5">
                                <span
                                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                                    item.isCorrect ? 'bg-success text-white' : 'bg-error text-white'
                                  }`}
                                >
                                  {item.isCorrect ? <CheckCircle2 size={13} aria-hidden="true" /> : <XCircle size={13} aria-hidden="true" />}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-ink">{item.prompt}</p>
                                  <p className="mt-0.5 text-xs text-ink-secondary">
                                    {item.direction === 'term-to-definition' ? 'Term → Definition' : 'Definition → Term'}
                                    {!item.isCorrect && (
                                      <span className="ml-2 text-error">
                                        Your answer: <span className="font-medium">{item.selectedText}</span>
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <ChevronDown
                                size={16}
                                className={`mt-0.5 shrink-0 text-ink-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                aria-hidden="true"
                              />
                            </button>

                            {isExpanded && (
                              <div className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
                                {item.allAnswers.map((a) => {
                                  const isThisCorrect = a.id === item.correctAnswerId;
                                  const isThisSelected = a.id === item.selectedAnswerId;
                                  return (
                                    <div
                                      key={a.id}
                                      className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs ${
                                        isThisCorrect
                                          ? 'bg-success-subtle text-ink'
                                          : isThisSelected
                                            ? 'bg-error-subtle text-ink'
                                            : 'text-ink-secondary'
                                      }`}
                                    >
                                      {isThisCorrect && <CheckCircle2 size={12} className="shrink-0 text-success" aria-hidden="true" />}
                                      {isThisSelected && !isThisCorrect && <XCircle size={12} className="shrink-0 text-error" aria-hidden="true" />}
                                      <span>{a.text}</span>
                                      {isThisSelected && <span className="ml-auto text-[10px] font-medium text-ink-muted">Your answer</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  className="btn-secondary flex-1"
                  onClick={() => {
                    resetLocalState();
                    setQuestions([]);
                    setStarted(false);
                    setSessionId(null);
                  }}
                  type="button"
                >
                  <RotateCcw size={16} aria-hidden="true" />
                  Try again
                </button>
                <button className="btn-primary flex-1" onClick={onClose} type="button">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreRing({ percent }: { percent: number }) {
  const size = 64;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;
  const color = clamped >= 80 ? '#31866F' : clamped >= 60 ? '#3157E5' : '#B7791F';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E4E6EA" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 400ms ease' }}
        />
      </svg>
      <span className="absolute text-sm font-semibold text-ink">{clamped}%</span>
    </div>
  );
}

/** Lightweight, CSS-only celebration burst for high scores. No external animation library required. */
function ConfettiBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        delay: `${(i % 8) * 45}ms`,
        color: ['#3157E5', '#8A91E8', '#31866F', '#B7791F'][i % 4]
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-24 overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 h-2 w-2 rounded-sm opacity-80"
          style={{
            left: p.left,
            backgroundColor: p.color,
            animation: `confetti-fall 900ms ease-out ${p.delay} forwards`
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-8px) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(72px) rotate(180deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default QuizPanel;

