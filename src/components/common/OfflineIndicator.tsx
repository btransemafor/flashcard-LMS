import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function OfflineIndicator({ online }: { online: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs text-ink-secondary">
      {online ? (
        <Wifi size={14} className="text-success" aria-hidden="true" />
      ) : (
        <WifiOff size={14} className="text-warning" aria-hidden="true" />
      )}
      <span>{online ? 'Online' : 'Offline'}</span>
    </div>
  );
}
