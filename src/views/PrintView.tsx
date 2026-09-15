import React, { useMemo, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { ViewId } from '@/App';
import { EmptyState } from '@/components/common/EmptyState';
import { FileWarning } from 'lucide-react';

interface PrintViewProps {
  onNavigate: (view: ViewId) => void;
}

export function PrintView({ onNavigate }: PrintViewProps) {
  const {
    state: { cards }
  } = useApp();
  const [includeAnswers, setIncludeAnswers] = useState(true);

  const byTopic = useMemo(() => {
    const map = new Map<string, typeof cards>();
    for (const card of cards) {
      const key = card.topic || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(card);
    }
    return Array.from(map.entries());
  }, [cards]);

  if (cards.length === 0) {
    return (
      <div className="p-6">
        <EmptyState icon={FileWarning} title="Nothing to print" description="Import a workbook first to generate a printable flashcard set." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 print:p-0">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <button type="button" className="btn-ghost" onClick={() => onNavigate('library')}>
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </button>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={includeAnswers} onChange={(e) => setIncludeAnswers(e.target.checked)} className="h-4 w-4 accent-primary" />
          Print answers on the same page
        </label>
        <button type="button" className="btn-primary" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" /> Print
        </button>
      </div>

      <div className="mx-auto max-w-3xl space-y-8 print:space-y-4">
        {byTopic.map(([topic, topicCards]) => (
          <section key={topic}>
            <h2 className="mb-3 text-lg font-semibold text-black print:text-base">{topic}</h2>
            <div className="space-y-4 print:space-y-3">
              {topicCards.map((card) => (
                <article key={card.id} className="print-page rounded-lg border border-gray-300 p-4">
                  <p className="text-base font-semibold text-black">{card.term}</p>
                  {includeAnswers && (
                    <>
                      <p className="mt-2 whitespace-pre-line text-sm text-gray-800">{card.definition}</p>
                      {card.example && <p className="mt-1 whitespace-pre-line text-xs italic text-gray-600">Example: {card.example}</p>}
                    </>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
