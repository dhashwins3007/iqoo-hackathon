import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Monitor,
  Radio,
  ShieldCheck,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react';
import type { Detection, SessionState } from '@/types';
import { BreadboardWorkspace } from '@/components/BreadboardWorkspace';
import { CheckpointProgress } from '@/components/CheckpointProgress';
import { DetectionDetailsPanel } from '@/components/DetectionDetailsPanel';
import { useClock } from '@/engine/time';

interface Props {
  state: SessionState;
  detections: Detection[];
  cameraActive: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export function TrainerDashboard({ state, detections, cameraActive, videoRef }: Props) {
  const elapsed = useClock(state.startedAt, state.completedAt);
  const verifiedCount = state.checkpoints.filter((c) => c.status === 'VERIFIED').length;
  const total = state.checkpoints.length;
  const progressPct = Math.round((verifiedCount / total) * 100);
  const deviation = state.checkpoints.find((c) => c.status === 'DEVIATION');
  const inProgress = state.checkpoints.find((c) => c.status === 'IN_PROGRESS');
  const current = state.checkpoints.find(
    (c) => c.status === 'IN_PROGRESS' || c.status === 'DEVIATION' || c.status === 'NEEDS_REVIEW'
  );

  const liveStatus = state.phase === 'LIVE'
    ? 'ASSESSMENT IN PROGRESS'
    : state.phase === 'COMPLETE'
    ? 'ASSESSMENT COMPLETE'
    : state.phase === 'SETUP'
    ? 'SETUP PHASE'
    : 'STANDBY';

  const statusColor = deviation
    ? 'text-bad'
    : state.phase === 'COMPLETE'
    ? 'text-ok'
    : state.phase === 'LIVE'
    ? 'text-accent'
    : 'text-neutralx';

  return (
    <div className="min-h-full bg-ink-950 noise">
      {/* top bar */}
      <header className="flex items-center justify-between border-b border-ink-700 px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/30 bg-accent/10">
            <Monitor size={18} className="text-accent" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-wide text-white">
              SKILLMIRROR
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-wider text-neutralx">
              Trainer Console
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Radio size={14} className={state.phase === 'LIVE' ? 'text-ok animate-flicker' : 'text-neutralx'} />
            <span className={`font-mono text-[11px] font-semibold uppercase tracking-wider ${statusColor}`}>
              {liveStatus}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-850 px-3 py-1.5">
            <User size={14} className="text-neutralx" />
            <span className="text-[12px] font-medium text-gray-300">Demo Student</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-5 p-6">
        {/* LEFT: live evidence */}
        <section className="col-span-7 flex flex-col gap-5">
          {/* evidence panel */}
          <div className="rounded-2xl border border-ink-600 bg-ink-850/40 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-accent" />
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-gray-200">
                  Live Evidence Feed
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${state.phase === 'LIVE' ? 'bg-bad animate-pulse' : 'bg-neutralx-dim'}`} />
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutralx">
                  {state.phase === 'LIVE' ? 'Streaming' : 'Idle'}
                </span>
              </div>
            </div>

            <div
              className="relative overflow-hidden rounded-xl border border-ink-600"
              style={{ height: '360px' }}
            >
              <BreadboardWorkspace
                detections={detections}
                highlightLabel={current?.id === 'cp3' || current?.id === 'cp4' ? 'LED' : null}
                dimmed={!!deviation}
                videoRef={videoRef}
                cameraActive={cameraActive}
              />
              {state.phase === 'LIVE' && !deviation && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div
                    className="absolute left-0 right-0 h-px bg-accent/50 animate-scan"
                    style={{ top: 0, boxShadow: '0 0 12px 2px rgba(0,229,199,0.4)' }}
                  />
                </div>
              )}

              {/* overlay HUD */}
              <div className="absolute left-3 top-3 flex flex-col gap-1.5">
                <div className="rounded-md border border-ink-500 bg-ink-950/70 px-2 py-1 backdrop-blur-sm">
                  <span className="font-mono text-[10px] text-gray-300">
                    CAM 01 · WORKSPACE
                  </span>
                </div>
                {detections.length > 0 && (
                  <div className="rounded-md border border-ink-500 bg-ink-950/70 px-2 py-1 backdrop-blur-sm">
                    <span className="font-mono text-[10px] text-accent">
                      {detections.length} OBJECTS TRACKED
                    </span>
                  </div>
                )}
              </div>

              {deviation && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-bad/10 backdrop-blur-[2px] animate-riseIn">
                  <div className="absolute inset-0 border-2 border-bad/60 rounded-xl animate-pulseRing" />
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-bad bg-bad/20 shadow-badglow">
                    <AlertTriangle size={28} className="text-bad" />
                  </div>
                  <p className="mt-4 text-[20px] font-bold uppercase tracking-wider text-bad">
                    Student Deviation
                  </p>
                  <p className="mt-1 text-[13px] text-red-200/80">
                    {deviation.error}
                  </p>
                </div>
              )}
            </div>

            {/* detection legend */}
            <div className="mt-4 flex flex-wrap gap-2">
              <LegendDot color="#00E5C7" label="LED" />
              <LegendDot color="#FFB627" label="RESISTOR" />
              <LegendDot color="#5B6776" label="BREADBOARD" />
              <LegendDot color="#3A8BFF" label="WIRE" />
            </div>

            {/* detection details */}
            <div className="mt-3">
              <DetectionDetailsPanel cameraActive={cameraActive} visionMode={state.visionMode} />
            </div>
          </div>

          {/* alert banner */}
          {deviation ? (
            <div className="flex items-center gap-3 rounded-2xl border border-bad/40 bg-bad/10 px-5 py-4 animate-riseIn">
              <AlertTriangle size={22} className="text-bad" />
              <div>
                <p className="text-[14px] font-bold text-bad">DEVIATION DETECTED</p>
                <p className="text-[12px] text-red-200/80">{deviation.error}</p>
              </div>
            </div>
          ) : inProgress ? (
            <div className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/5 px-5 py-4">
              <span className="h-2.5 w-2.5 rounded-full bg-accent animate-flicker" />
              <div>
                <p className="text-[14px] font-semibold text-accent">MONITORING</p>
                <p className="text-[12px] text-neutralx">
                  Observing checkpoint: {inProgress.name}
                </p>
              </div>
            </div>
          ) : state.phase === 'COMPLETE' ? (
            <div className="flex items-center gap-3 rounded-2xl border border-ok/30 bg-ok/5 px-5 py-4">
              <CheckCircle2 size={22} className="text-ok" />
              <div>
                <p className="text-[14px] font-semibold text-ok">ASSESSMENT COMPLETE</p>
                <p className="text-[12px] text-neutralx">
                  All checkpoints processed. Report ready.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-ink-600 bg-ink-850/40 px-5 py-4">
              <ShieldCheck size={22} className="text-neutralx" />
              <div>
                <p className="text-[14px] font-semibold text-gray-300">STANDBY</p>
                <p className="text-[12px] text-neutralx">
                  Awaiting assessment start from student device.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT: checkpoint + stats */}
        <section className="col-span-5 flex flex-col gap-5">
          {/* session info */}
          <div className="rounded-2xl border border-ink-600 bg-ink-850/40 p-5">
            <div className="grid grid-cols-2 gap-4">
              <InfoCell label="Student" value="Demo Student" />
              <InfoCell label="Procedure" value="LED Circuit" />
              <InfoCell label="Session" value={liveStatus} accent={statusColor} />
              <InfoCell label="Elapsed" value={elapsed} mono />
            </div>
          </div>

          {/* progress */}
          <div className="rounded-2xl border border-ink-600 bg-ink-850/40 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-gray-200">
                Progress
              </h2>
              <span className="font-mono text-[12px] font-semibold text-white">
                {verifiedCount} / {total}
              </span>
            </div>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-ink-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-ok transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <CheckpointProgress checkpoints={state.checkpoints} showLabels />
          </div>

          {/* statistics */}
          <div className="rounded-2xl border border-ink-600 bg-ink-850/40 p-5">
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-gray-200">
              Session Statistics
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Score"
                value={state.result ? `${state.result.finalScore}%` : '—'}
                icon={TrendingUp}
                color={state.result ? 'text-accent' : 'text-neutralx'}
              />
              <StatCard
                label="Deviations"
                value={String(state.timeline.filter((e) => e.type === 'DEVIATION').length)}
                icon={AlertTriangle}
                color="text-bad"
              />
              <StatCard
                label="Corrections"
                value={String(state.timeline.filter((e) => e.type === 'CORRECTED').length)}
                icon={Zap}
                color="text-warn"
              />
              <StatCard
                label="Elapsed"
                value={elapsed}
                icon={Clock}
                color="text-gray-300"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-ink-600 bg-ink-850/60 px-2.5 py-1">
      <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
      <span className="font-mono text-[10px] font-medium text-gray-300">{label}</span>
    </div>
  );
}

function InfoCell({
  label,
  value,
  accent,
  mono,
}: {
  label: string;
  value: string;
  accent?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-wider text-neutralx">{label}</p>
      <p className={`mt-0.5 text-[13px] font-semibold ${accent ?? 'text-white'} ${mono ? 'font-mono' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: typeof TrendingUp;
  color: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-1.5">
        <Icon size={13} className={color} />
        <span className="font-mono text-[9px] uppercase tracking-wider text-neutralx">{label}</span>
      </div>
      <p className="mt-1.5 text-[20px] font-bold text-white">{value}</p>
    </div>
  );
}
