import React, { useEffect } from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { ToastMessage } from '@/types';

const ICONS: Record<ToastMessage['type'], React.ReactNode> = {
  success: <CheckCircle2 size={18} className="text-success" aria-hidden="true" />,
  error: <XCircle size={18} className="text-error" aria-hidden="true" />,
  warning: <AlertTriangle size={18} className="text-warning" aria-hidden="true" />,
  info: <Info size={18} className="text-primary" aria-hidden="true" />
};

const BORDER_CLASSES: Record<ToastMessage['type'], string> = {
  success: 'border-success/30',
  error: 'border-error/30',
  warning: 'border-warning/30',
  info: 'border-primary/30'
};

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`card-surface animate-fade-in flex items-start gap-3 border ${BORDER_CLASSES[toast.type]} p-3.5 pr-3 shadow-popover`}
      role="status"
    >
      <div className="mt-0.5 shrink-0">{ICONS[toast.type]}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-xs text-ink-secondary">{toast.description}</p>}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-md p-1 text-ink-muted hover:bg-surface-secondary hover:text-ink"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastStack() {
  const {
    state: { toasts },
    actions: { removeToast }
  } = useApp();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:bottom-6 sm:right-6 sm:left-auto"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full max-w-sm">
          <ToastItem toast={t} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  );
}
