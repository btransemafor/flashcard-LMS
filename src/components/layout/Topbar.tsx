import React, { useMemo, useState } from 'react';
import { Search, Upload, PlayCircle } from 'lucide-react';
import type { ViewId } from '@/App';
import { useApp } from '@/store/AppContext';

interface TopbarProps {
  title: string;
  onNavigate: (view: ViewId) => void;
}

export function Topbar({ title, onNavigate }: TopbarProps) {
  const {
    state: { cards },
    actions: { startSession }
  } = useApp();
  const [query, setQuery] = useState('');

  const hasCards = useMemo(() => cards.length > 0, [cards]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate('library');
  };

  const handleStartReview = () => {
    startSession();
    onNavigate('study');
  };

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-bg-warm/95 backdrop-blur-0 px-4 py-3 sm:px-6">
      <h1 className="mr-auto text-lg font-semibold text-ink">{title}</h1>

      <form onSubmit={handleSearchSubmit} className="relative hidden min-w-[220px] flex-1 max-w-xs md:block" role="search">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
        <label htmlFor="global-search" className="sr-only">
          Search your library
        </label>
        <input
          id="global-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics or terms…"
          className="input-field pl-9"
        />
      </form>

      <button type="button" className="btn-secondary" onClick={() => onNavigate('import')}>
        <Upload size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Import Excel</span>
      </button>

      <button type="button" className="btn-primary" onClick={handleStartReview} disabled={!hasCards}>
        <PlayCircle size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Start Review</span>
      </button>
    </header>
  );
}
