import { Award, CheckCircle2, AlertTriangle, RotateCcw, FileText, TrendingUp } from 'lucide-react';
import type { SessionState } from '@/types';
import { StatusBar } from '@/components/PhoneHome';
import { formatClock, formatTimeOfDay } from '@/engine/time';

interface Props {
  state: SessionState;
  onReset: () => void;
  onViewEvidence: () => void;
}

export function PhoneAssessment({ state, onReset, onViewEvidence }: Props) {
  const r = state.result;
  if (!r) return null;

  const statusColor =
    r.status === 'PASSED' ? 'text-ok' : r.status === 'NEEDS_REVIEW' ? 'text-warn' : 'text-bad';
  const statusBg =
    r.status === 'PASSED' ? 'bg-ok/10 border-ok/30' : r.status === 'NEEDS_REVIEW' ? 'bg-warn/10 border-warn/30' : 'bg-bad/10 border-bad/30';

  return (
    <div className="flex h-full flex-col bg-ink-950 noise">
      <StatusBar />

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {/* header */}
        <div className="flex flex-col items-center pt-2 pb-5 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ok/30 bg-ok/10 shadow-okglow">
            <Award size={26} className="text-ok" />
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-neutralx">Skill Assessment</p>
          <h1 className="mt-1 text-[20px] font-semibold text-white">{r.procedureName}</h1>
          <div className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${statusBg}`}>
            <span className={`text-[12px] font-bold uppercase tracking-wider ${statusColor}`}>
              {r.status === 'PASSED' ? 'Passed' : r.status === 'NEEDS_REVIEW' ? 'Needs Review' : 'Failed'}
            </span>
          </div>
        </div>

        {/* score ring */}
        <div className="flex justify-center py-2">
          <ScoreRing score={r.finalScore} />
        </div>

        {/* stats grid */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <StatTile label="Verified" value={`${r.checkpointsVerifiedFinal} / ${r.checkpointsTotal}`} icon={CheckCircle2} color="text-ok" />
          <StatTile label="Deviations" value={String(r.deviations)} icon={AlertTriangle} color="text-bad" />
          <StatTile label="Corrections" value={String(r.corrections)} icon={TrendingUp} color="text-accent" />
          <StatTile label="Time" value={formatClock(r.completionTimeMs)} icon={FileText} color="text-gray-300" />
        </div>

        {/* first pass note */}
        <div className="mt-3 rounded-xl border border-ink-700 bg-ink-850/40 px-4 py-3">
          <p className="text-[11px] leading-relaxed text-neutralx">
            <span className="text-gray-200">{r.checkpointsVerifiedFirstPass}</span> of{' '}
            {r.checkpointsTotal} checkpoints verified on first pass.
            {r.deviations > 0 && (
              <>
                {' '}
                <span className="text-bad">{r.deviations} deviation</span> corrected during assessment.
              </>
            )}
          </p>
        </div>

        {/* timeline */}
        <p className="mt-6 mb-3 text-[11px] font-medium uppercase tracking-wider text-neutralx">
          Evidence Timeline
        </p>
        <div className="relative pl-5">
          <div className="absolute left-[7px] top-1 bottom-1 w-px bg-ink-600" />
          {r.timeline.map((ev, i) => (
            <TimelineRow key={ev.id} ev={ev} delay={i * 40} />
          ))}
        </div>
      </div>

      {/* actions */}
      <div className="px-5 pb-8 pt-2 flex flex-col gap-2.5">
        <button onClick={onViewEvidence} className="btn-ghost w-full">
          <FileText size={16} />
          View Evidence
        </button>
        <button onClick={onReset} className="btn-primary w-full">
          <RotateCcw size={16} />
          New Assessment
        </button>
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative h-36 w-36">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#161D28" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00E5C7" />
            <stop offset="100%" stopColor="#2BE58A" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[34px] font-bold text-white">{score}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-neutralx">Score</span>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: typeof CheckCircle2;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-600 bg-ink-850/60 p-3.5">
      <div className="flex items-center gap-1.5">
        <Icon size={13} className={color} />
        <span className="font-mono text-[9px] uppercase tracking-wider text-neutralx">{label}</span>
      </div>
      <p className="mt-1.5 text-[18px] font-semibold text-white">{value}</p>
    </div>
  );
}

function TimelineRow({
  ev,
  delay,
}: {
  ev: { type: string; label: string; timestamp: number };
  delay: number;
}) {
  const color =
    ev.type === 'VERIFIED' || ev.type === 'COMPLETED'
      ? 'bg-ok'
      : ev.type === 'DEVIATION'
      ? 'bg-bad'
      : ev.type === 'CORRECTED'
      ? 'bg-accent'
      : 'bg-neutralx';
  const textColor =
    ev.type === 'VERIFIED' || ev.type === 'COMPLETED'
      ? 'text-ok'
      : ev.type === 'DEVIATION'
      ? 'text-bad'
      : ev.type === 'CORRECTED'
      ? 'text-accent'
      : 'text-neutralx';
  return (
    <div
      className="relative mb-3.5 animate-slideUp"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute -left-[18px] top-1 h-3 w-3 rounded-full border-2 border-ink-950 ${color}`} />
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-[12px] font-medium ${textColor}`}>{ev.label}</span>
        <span className="font-mono text-[10px] text-neutralx">{formatTimeOfDay(ev.timestamp)}</span>
      </div>
    </div>
  );
}
