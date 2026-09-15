import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-secondary" role="status" aria-live="polite">
      <Loader2 className="animate-spin" size={28} aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
