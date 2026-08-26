import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, Zap, RotateCcw, Camera, CameraOff, Video, Wrench } from 'lucide-react';
import type { SessionState, Detection } from '@/types';
import { BreadboardWorkspace } from '@/components/BreadboardWorkspace';
import { CheckpointProgress } from '@/components/CheckpointProgress';
import { DetectionDetailsPanel } from '@/components/DetectionDetailsPanel';
import { StatusBar } from '@/components/PhoneHome';
import { useClock } from '@/engine/time';
import type { CameraStatus } from '@/engine/useCameraVision';

interface Props {
  state: SessionState;
  detections: Detection[];
  cameraStatus: CameraStatus;
  videoRef: React.RefObject<HTMLVideoElement>;
  onUseCamera: () => void;
  onStopCamera: () => void;
  onInjectDemoFault: () => void;
  onCorrectMistake: () => void;
  onReset: () => void;
}

export function PhoneLiveAssessment({
  state,
  detections,
  cameraStatus,
  videoRef,
  onUseCamera,
  onStopCamera,
  onInjectDemoFault,
  onCorrectMistake,
  onReset,
}: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const current = state.checkpoints.find(
    (c) => c.status === 'IN_PROGRESS' || c.status === 'DEVIATION' || c.status === 'NEEDS_REVIEW'
  );
  const currentIndex = current
    ? state.checkpoints.findIndex((c) => c.id === current.id) + 1
    : state.checkpoints.filter((c) => c.status === 'VERIFIED').length;
  const total = state.checkpoints.length;
  const elapsed = useClock(state.startedAt, state.completedAt);
  const isDeviation = current?.status === 'DEVIATION';
  const isReview = current?.status === 'NEEDS_REVIEW';
  const verifiedCount = state.checkpoints.filter((c) => c.status === 'VERIFIED').length;
  const isWaitingForFault = current?.id === 'cp4' && current.status === 'IN_PROGRESS' && !state.visionMode;
  const cameraActive = cameraStatus === 'active';
  const cameraDenied = cameraStatus === 'denied' || cameraStatus === 'unavailable' || cameraStatus === 'error';

  return (
    <div className="flex h-full flex-col bg-ink-950">
      <StatusBar />

      {/* top bar: step counter + timer */}
      <div className="flex items-center justify-between px-5 pt-1 pb-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutralx">Step</p>
          <p className="text-[15px] font-semibold text-white">
            {currentIndex} <span className="text-neutralx">/ {total}</span>
          </p>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-bad animate-pulse" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-bad">REC</span>
          </div>
          <p className="mt-0.5 font-mono text-[13px] font-semibold text-gray-200">{elapsed}</p>
        </div>
        <button
          onClick={onReset}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-600 bg-ink-800 text-neutralx transition-colors hover:text-white"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* progress dots */}
      <div className="px-5 pb-3">
        <div className="flex gap-1.5">
          {state.checkpoints.map((cp) => (
            <div
              key={cp.id}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                cp.status === 'VERIFIED'
                  ? 'bg-ok'
                  : cp.status === 'DEVIATION'
                  ? 'bg-bad'
                  : cp.status === 'NEEDS_REVIEW'
                  ? 'bg-warn'
                  : cp.status === 'IN_PROGRESS'
                  ? 'bg-accent animate-flicker'
                  : 'bg-ink-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* camera workspace */}
      <div className="relative mx-4 overflow-hidden rounded-2xl border border-ink-600" style={{ height: '300px' }}>
        <BreadboardWorkspace
          detections={detections}
          highlightLabel={current?.id === 'cp3' || current?.id === 'cp4' ? 'LED' : current?.id === 'cp2' ? 'RESISTOR' : null}
          dimmed={isDeviation}
          videoRef={videoRef}
          cameraActive={cameraActive}
        />

        {/* scan line */}
        {!isDeviation && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-0 right-0 h-px bg-accent/60 animate-scan" style={{ top: 0, boxShadow: '0 0 12px 2px rgba(0,229,199,0.5)' }} />
          </div>
        )}

        {/* live badge */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg border border-ink-500 bg-ink-950/70 px-2.5 py-1 backdrop-blur-sm">
          <Eye size={12} className={cameraActive ? 'text-accent' : 'text-neutralx'} />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-200">
            {cameraActive ? 'Tracking' : detections.length > 0 ? 'Tracking' : 'Idle'}
          </span>
        </div>

        {/* object count */}
        <div className="absolute right-3 top-3 rounded-lg border border-ink-500 bg-ink-950/70 px-2.5 py-1 backdrop-blur-sm">
          <span className="font-mono text-[10px] font-semibold text-gray-200">
            {detections.length} OBJ
          </span>
        </div>

        {/* camera permission denied notice */}
        {cameraDenied && state.visionMode && (
          <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] font-medium text-warn">Camera unavailable — using Demo Mode fallback.</p>
          </div>
        )}

        {/* deviation overlay */}
        {isDeviation && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bad/10 backdrop-blur-[2px] animate-riseIn">
            <div className="absolute inset-0 border-2 border-bad/60 rounded-2xl animate-pulseRing" />
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-bad bg-bad/20 shadow-badglow">
              <AlertTriangle size={26} className="text-bad" />
            </div>
            <p className="mt-3 text-[18px] font-bold uppercase tracking-wider text-bad">
              Deviation Detected
            </p>
            <p className="mt-1 max-w-[220px] text-center text-[12px] text-red-200/80">
              {current?.error}
            </p>
            {state.visionMode && (
              <p className="mt-2 max-w-[220px] text-center text-[10px] text-red-200/60">
                Adjust the workspace to match the expected placement to auto-correct.
              </p>
            )}
          </div>
        )}

        {/* review flash */}
        {isReview && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-warn/10 backdrop-blur-[1px] animate-riseIn">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-warn bg-warn/20">
              <Zap size={22} className="text-warn" />
            </div>
            <p className="mt-2.5 text-[14px] font-semibold uppercase tracking-wider text-warn">
              Needs Human Review
            </p>
            <p className="mt-1 max-w-[200px] text-center text-[10px] text-warn/70">
              {current?.error}
            </p>
          </div>
        )}
      </div>

      {/* vision engine status bar */}
      <div className="mx-4 mt-3 flex items-center justify-between rounded-lg border border-ink-700 bg-ink-850/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <Video size={12} className="text-neutralx" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-neutralx">Vision Engine</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${cameraActive ? 'bg-ok animate-flicker' : 'bg-neutralx-dim'}`} />
          <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${cameraActive ? 'text-ok' : 'text-neutralx'}`}>
            {cameraActive ? 'Camera Active' : state.visionMode ? 'Awaiting Camera' : 'Demo Mode'}
          </span>
        </div>
      </div>

      {/* current checkpoint label */}
      <div className="px-5 pt-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-neutralx">Current Checkpoint</p>
        <div className="mt-1 flex items-center gap-2">
          {current ? (
            <>
              <span
                className={`h-2 w-2 rounded-full ${
                  isDeviation ? 'bg-bad animate-pulse' : isReview ? 'bg-warn' : 'bg-accent animate-flicker'
                }`}
              />
              <h2 className="text-[16px] font-semibold text-white">{current.name}</h2>
            </>
          ) : (
            <h2 className="text-[16px] font-semibold text-neutralx">All checkpoints complete</h2>
          )}
        </div>
      </div>

      {/* checkpoint list (compact) */}
      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-1">
        <CheckpointProgress checkpoints={state.checkpoints} compact />
      </div>

      {/* detection details (collapsible) */}
      <div className="px-5 pb-1">
        <DetectionDetailsPanel cameraActive={cameraActive} visionMode={state.visionMode} />
      </div>

      {/* action area */}
      <div className="px-5 pb-5 pt-2 space-y-2">
        {/* camera toggle */}
        {!cameraActive ? (
          <button onClick={onUseCamera} className="btn-ghost w-full">
            <Camera size={16} />
            Use Camera
          </button>
        ) : (
          <button onClick={onStopCamera} className="btn-ghost w-full">
            <CameraOff size={16} />
            Stop Camera
          </button>
        )}

        {/* deviation correction or fault injection */}
        {isDeviation ? (
          state.visionMode ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-bad/30 bg-bad/5 px-4 py-3.5">
              <span className="h-2 w-2 rounded-full bg-bad animate-pulse" />
              <span className="text-[12px] font-medium text-red-200/80">Adjust workspace to auto-correct…</span>
            </div>
          ) : (
            <button onClick={onCorrectMistake} className="btn-primary w-full">
              <CheckCircle2 size={18} />
              Correct Mistake
            </button>
          )
        ) : isWaitingForFault ? (
          <button onClick={onInjectDemoFault} className="btn-bad w-full">
            <Wrench size={16} />
            Inject Demo Fault
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-ink-600 bg-ink-850/40 px-4 py-3.5">
            {verifiedCount === total ? (
              <>
                <CheckCircle2 size={16} className="text-ok" />
                <span className="text-[13px] font-medium text-gray-300">Finalizing assessment…</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-accent animate-flicker" />
                <span className="text-[13px] font-medium text-neutralx">
                  {state.visionMode ? 'Observing camera feed…' : 'Observing workspace…'}
                </span>
              </>
            )}
          </div>
        )}

        {/* fault injection label */}
        {isWaitingForFault && (
          <p className="text-center font-mono text-[9px] leading-relaxed text-neutralx-dim">
            Demo fault injection — used to reliably test deviation handling.
          </p>
        )}
        <p className="text-center font-mono text-[9px] text-neutralx-dim">
          {state.visionMode && cameraActive
            ? 'Prototype · live in-browser vision detection'
            : 'Prototype simulation · detection layer is scripted'}
        </p>
      </div>
    </div>
  );
}
