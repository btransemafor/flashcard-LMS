import React from 'react';
import { useApp } from '@/store/AppContext';

function ToggleRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3.5">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-ink-secondary">{description}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-surface-secondary border border-border-strong relative transition-colors duration-200 checked:bg-primary checked:border-primary before:absolute before:left-0.5 before:top-0.5 before:h-3.5 before:w-3.5 before:rounded-full before:bg-white before:transition-transform before:duration-200 checked:before:translate-x-4"
        aria-label={label}
      />
    </label>
  );
}

export function SettingsView() {
  const {
    state: { ui },
    actions: { updateUIPreferences }
  } = useApp();

  return (
    <div className="max-w-2xl space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">Study</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3.5">
            <span className="text-sm font-medium text-ink">New cards per session</span>
            <input
              type="number"
              min={1}
              max={100}
              value={ui.newCardsPerSession}
              onChange={(e) => updateUIPreferences({ newCardsPerSession: Math.max(1, Number(e.target.value) || 1) })}
              className="input-field !w-24 text-center"
            />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3.5">
            <span className="text-sm font-medium text-ink">Review cards per session</span>
            <input
              type="number"
              min={1}
              max={200}
              value={ui.reviewCardsPerSession}
              onChange={(e) => updateUIPreferences({ reviewCardsPerSession: Math.max(1, Number(e.target.value) || 1) })}
              className="input-field !w-24 text-center"
            />
          </label>
          <ToggleRow label="Shuffle cards" description="Randomize order within each session" checked={ui.shuffleCards} onChange={(v) => updateUIPreferences({ shuffleCards: v })} />
          <ToggleRow label="Show keyboard shortcuts" description="Display the shortcut hint bar during study" checked={ui.showKeyboardShortcuts} onChange={(v) => updateUIPreferences({ showKeyboardShortcuts: v })} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">Appearance</h2>
        <div className="space-y-3">
          <ToggleRow label="Reduced motion" description="Minimize animations across the app" checked={ui.reducedMotion} onChange={(v) => updateUIPreferences({ reducedMotion: v })} />
          <ToggleRow label="Compact density" description="Tighter spacing for smaller screens" checked={ui.compactDensity} onChange={(v) => updateUIPreferences({ compactDensity: v })} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">Data</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3.5">
            <span className="text-sm font-medium text-ink">Date format</span>
            <select
              value={ui.dateFormat}
              onChange={(e) => updateUIPreferences({ dateFormat: e.target.value })}
              className="input-field !w-auto"
            >
              <option value="dd/MM/yyyy">DD/MM/YYYY</option>
              <option value="MM/dd/yyyy">MM/DD/YYYY</option>
              <option value="yyyy-MM-dd">YYYY-MM-DD</option>
            </select>
          </label>
          <ToggleRow
            label="Confirm before ending session"
            checked={ui.confirmBeforeEndingSession}
            onChange={(v) => updateUIPreferences({ confirmBeforeEndingSession: v })}
          />
          <ToggleRow
            label="Confirm before clearing data"
            checked={ui.confirmBeforeClearingData}
            onChange={(v) => updateUIPreferences({ confirmBeforeClearingData: v })}
          />
        </div>
      </section>

      <p className="text-xs text-ink-muted">
        Your learning data stays in this browser and in files you choose. Nothing is uploaded to a server.
      </p>
    </div>
  );
}
