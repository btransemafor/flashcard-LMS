import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, primaryAction, secondaryAction }: EmptyStateProps) {
  return (
    <div className="card-surface flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-subtle text-accent">
        <Icon size={26} aria-hidden="true" />
      </div>
      <div className="max-w-sm">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 text-sm text-ink-secondary">{description}</p>
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {primaryAction && (
            <button type="button" className="btn-primary" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button type="button" className="btn-secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
