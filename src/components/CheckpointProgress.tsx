import { Check, AlertTriangle, CircleDot, Loader2, MinusCircle } from 'lucide-react';
import type { Checkpoint } from '@/types';

const STATUS_STYLES: Record<
  Checkpoint['status'],
  { color: string; bg: string; icon: typeof Check; label: string }
> = {
  VERIFIED: { color: 'text-ok', bg: 'bg-ok/15 border-ok/40', icon: Check, label: 'Verified' },
  DEVIATION: { color: 'text-bad', bg: 'bg-bad/15 border-bad/40', icon: AlertTriangle, label: 'Deviation' },
  NEEDS_REVIEW: { color: 'text-warn', bg: 'bg-warn/15 border-warn/40', icon: MinusCircle, label: 'Review' },
  IN_PROGRESS: { color: 'text-accent', bg: 'bg-accent/10 border-accent/40', icon: Loader2, label: 'Scanning' },
  PENDING: { color: 'text-neutralx', bg: 'bg-ink-800 border-ink-600', icon: CircleDot, label: 'Pending' },
};

interface Props {
  checkpoints: Checkpoint[];
  compact?: boolean;
  showLabels?: boolean;
}

export function CheckpointProgress({ checkpoints, compact, showLabels }: Props) {
  return (
    <div className={compact ? 'flex flex-wrap gap-1.5' : 'flex flex-col gap-2'}>
      {checkpoints.map((cp, i) => {
        const s = STATUS_STYLES[cp.status];
        const Icon = s.icon;
        const spinning = cp.status === 'IN_PROGRESS';
        if (compact) {
          return (
            <div
              key={cp.id}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${s.bg} ${s.color}`}
            >
              <Icon size={12} className={spinning ? 'animate-spin' : ''} />
              <span>{cp.shortName}</span>
            </div>
          );
        }
        return (
          <div
            key={cp.id}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-300 ${s.bg}`}
          >
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${s.color} bg-ink-950/40`}>
              <Icon size={15} className={spinning ? 'animate-spin' : ''} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-gray-100">
                  {showLabels ? cp.name : cp.shortName}
                </span>
                <span className={`font-mono text-[10px] uppercase tracking-wider ${s.color}`}>
                  {s.label}
                </span>
              </div>
              {cp.confidence > 0 && (
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink-700">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${cp.confidence}%`, background: 'currentColor' }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-neutralx">{cp.confidence}%</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
