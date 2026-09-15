import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'primary' | 'success' | 'warning' | 'accent';
  hint?: string;
}

const TONE_CLASSES: Record<NonNullable<StatCardProps['tone']>, string> = {
  primary: 'bg-primary-subtle text-primary',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  accent: 'bg-accent-subtle text-accent'
};

export function StatCard({ label, value, icon: Icon, tone = 'primary', hint }: StatCardProps) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-secondary">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONE_CLASSES[tone]}`}>
          <Icon size={16} aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
