import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AssessmentResult,
  Checkpoint,
  CheckpointStatus,
  Detection,
  SessionState,
  TimelineEvent,
} from '@/types';
import {
  CHECKPOINT_DEFS,
  createInitialCheckpoints,
  detectionAdapter,
  STEP_AUTO_ADVANCE_MS,
  VERIFIED_HOLD_MS,
} from '@/engine/mockData';
import { evaluateCheckpoint } from '@/engine/visionDetector';

// ───────────────────────────────────────────────────────────────────────────
// Checkpoint Engine
//
// Two modes:
//   • SCRIPTED (Demo Mode): detections come from MockDetectionAdapter and
//     checkpoints auto-verify on a timer. The "Inject Demo Fault" button
//     forces a deviation at cp4 for reliable demo testing.
//   • VISION (Camera Mode): detections come from the real in-browser vision
//     detector. The engine polls the latest detections and evaluates each
//     checkpoint deterministically from what the camera actually sees.
//     Correction is automatic — when the camera view satisfies the expected
//     state, the checkpoint transitions back to VERIFIED without a button.
//
// In production, the VISION path is fed by CameraX → on-device Mobile Vision
// Model → Detection Adapter. The engine contract is unchanged.
// ───────────────────────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  cp4: 'LED orientation appears incorrect — anode/cathode reversed.',
};

let eventCounter = 0;
const uid = (p: string) => `${p}-${++eventCounter}`;

function pushEvent(
  timeline: TimelineEvent[],
  label: string,
  type: TimelineEvent['type'],
  timestamp: number
): TimelineEvent[] {
  return [...timeline, { id: uid('ev'), label, type, timestamp }];
}

function computeResult(state: SessionState): AssessmentResult {
  const total = state.checkpoints.length;
  const verifiedFirstPass = state.checkpoints.filter(
    (c) => c.status === 'VERIFIED' && c.correctionTime === null
  ).length;
  const verifiedFinal = state.checkpoints.filter((c) => c.status === 'VERIFIED').length;
  const deviations = state.timeline.filter((e) => e.type === 'DEVIATION').length;
  const corrections = state.timeline.filter((e) => e.type === 'CORRECTED').length;
  const completionTimeMs = state.completedAt && state.startedAt ? state.completedAt - state.startedAt : 0;

  let score = 100 - deviations * 8 + corrections * 3;
  if (score > 97) score = 97;
  if (score < 60) score = 60;
  score = Math.round(score);

  let status: AssessmentResult['status'] = 'PASSED';
  if (score < 70) status = 'NEEDS_REVIEW';
  if (score < 60) status = 'FAILED';

  return {
    procedureName: state.procedureName,
    checkpointsTotal: total,
    checkpointsVerifiedFirstPass: verifiedFirstPass,
    checkpointsVerifiedFinal: verifiedFinal,
    deviations,
    corrections,
    finalScore: score,
    completionTimeMs,
    status,
    timeline: state.timeline,
  };
}

export interface AssessmentEngine {
  state: SessionState;
  detections: Detection[];
  setVisionMode: (on: boolean) => void;
  /** Feed live camera detections into the engine (vision mode only). */
  feedVisionDetections: (d: Detection[]) => void;
  startSetup: () => void;
  beginAssessment: () => void;
  advanceToNext: () => void;
  injectDemoFault: () => void;
  correctMistake: () => void;
  finishAssessment: () => void;
  reset: () => void;
}

export function useAssessmentEngine(): AssessmentEngine {
  const [state, setState] = useState<SessionState>(() => ({
    phase: 'IDLE',
    procedureName: 'LED Circuit Assembly',
    checkpoints: createInitialCheckpoints(),
    timeline: [],
    startedAt: null,
    completedAt: null,
    result: null,
    visionMode: false,
  }));

  const [detections, setDetections] = useState<Detection[]>([]);
  const timers = useRef<number[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const visionDetectionsRef = useRef<Detection[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  const after = (ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  // Keep displayed detections in sync with the current checkpoint + status (scripted mode).
  useEffect(() => {
    if (state.visionMode) return; // vision mode sets detections via feedVisionDetections
    const current = state.checkpoints.find((c) => c.status === 'IN_PROGRESS' || c.status === 'DEVIATION');
    if (!current || state.phase !== 'LIVE') {
      if (state.phase !== 'LIVE') setDetections([]);
      return;
    }
    const variant = current.status === 'DEVIATION' ? 'deviation' : 'nominal';
    setDetections(detectionAdapter.getDetections(current.id, variant));
  }, [state.checkpoints, state.phase, state.visionMode]);

  const updateCheckpoint = (id: string, patch: Partial<Checkpoint>) => {
    setState((s) => ({
      ...s,
      checkpoints: s.checkpoints.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };

  const setVisionMode = useCallback((on: boolean) => {
    setState((s) => ({ ...s, visionMode: on }));
  }, []);

  const feedVisionDetections = useCallback((d: Detection[]) => {
    visionDetectionsRef.current = d;
    if (stateRef.current.visionMode && stateRef.current.phase === 'LIVE') {
      setDetections(d);
      evaluateCurrentFromVision();
    }
  }, []);

  // ── Vision-driven checkpoint evaluation ──────────────────────────────
  const evaluateCurrentFromVision = () => {
    const s = stateRef.current;
    if (!s.visionMode || s.phase !== 'LIVE') return;
    const current = s.checkpoints.find(
      (c) => c.status === 'IN_PROGRESS' || c.status === 'DEVIATION' || c.status === 'NEEDS_REVIEW'
    );
    if (!current) return;
    const verdict = evaluateCheckpoint(current.id, visionDetectionsRef.current);

    if (current.status === 'IN_PROGRESS') {
      if (verdict.status === 'VERIFIED') {
        verifyCheckpoint(current.id, verdict.confidence);
      } else if (verdict.status === 'DEVIATION') {
        flagDeviation(current.id, verdict.error ?? 'Deviation detected.');
      } else if (verdict.status === 'NEEDS_REVIEW') {
        updateCheckpoint(current.id, {
          status: 'NEEDS_REVIEW',
          error: verdict.error,
          confidence: Math.round(verdict.confidence * 100),
        });
      }
    } else if (current.status === 'DEVIATION') {
      // Auto-correct: when camera view satisfies expected state, transition to VERIFIED.
      if (verdict.status === 'VERIFIED') {
        autoCorrect(current.id, verdict.confidence);
      } else if (verdict.status === 'NEEDS_REVIEW') {
        updateCheckpoint(current.id, {
          status: 'NEEDS_REVIEW',
          error: verdict.error,
          confidence: Math.round(verdict.confidence * 100),
        });
      }
    } else if (current.status === 'NEEDS_REVIEW') {
      if (verdict.status === 'VERIFIED') {
        verifyCheckpoint(current.id, verdict.confidence);
      } else if (verdict.status === 'DEVIATION') {
        flagDeviation(current.id, verdict.error ?? 'Deviation detected.');
      }
    }
  };

  const startSetup = useCallback(() => {
    clearTimers();
    setState((s) => ({ ...s, phase: 'SETUP' }));
  }, []);

  const beginAssessment = useCallback(() => {
    clearTimers();
    const now = Date.now();
    setState((s) => ({
      ...s,
      phase: 'LIVE',
      startedAt: now,
      timeline: pushEvent(s.timeline, 'Assessment started', 'STARTED', now),
      checkpoints: createInitialCheckpoints(),
      result: null,
    }));
    after(450, () => advanceToNext());
  }, []);

  const advanceToNext = useCallback(() => {
    setState((s) => {
      if (s.phase !== 'LIVE') return s;
      const next = s.checkpoints.find((c) => c.status === 'PENDING');
      if (!next) return s;
      return {
        ...s,
        checkpoints: s.checkpoints.map((c) =>
          c.id === next.id ? { ...c, status: 'IN_PROGRESS' as CheckpointStatus } : c
        ),
      };
    });
    if (!stateRef.current.visionMode) {
      // Scripted mode: auto-verify after observation window, except cp4 (waits for fault injection).
      after(STEP_AUTO_ADVANCE_MS, () => {
        const current = stateRef.current.checkpoints.find((c) => c.status === 'IN_PROGRESS');
        if (!current) return;
        if (current.id === 'cp4') return; // wait for Inject Demo Fault
        verifyCheckpoint(current.id);
      });
    }
    // Vision mode: evaluation happens via feedVisionDetections polling.
  }, []);

  const verifyCheckpoint = (id: string, confidence?: number) => {
    const now = Date.now();
    const cp = stateRef.current.checkpoints.find((c) => c.id === id);
    if (!cp) return;
    const conf = confidence ?? (detectionAdapter.getDetections(id, 'nominal').length
      ? Math.round(Math.max(...detectionAdapter.getDetections(id, 'nominal').map((d) => d.confidence)) * 100)
      : 95);
    updateCheckpoint(id, { status: 'VERIFIED', confidence: conf, timestamp: now });
    setState((s) => ({ ...s, timeline: pushEvent(s.timeline, `${cp.shortName} verified`, 'VERIFIED', now) }));
    after(VERIFIED_HOLD_MS, () => {
      const remaining = stateRef.current.checkpoints.filter((c) => c.status === 'PENDING');
      if (remaining.length === 0) finishAssessment();
      else advanceToNext();
    });
  };

  const flagDeviation = (id: string, error: string) => {
    const now = Date.now();
    const cp = stateRef.current.checkpoints.find((c) => c.id === id);
    if (!cp) return;
    updateCheckpoint(id, { status: 'DEVIATION', error });
    setState((s) => ({ ...s, timeline: pushEvent(s.timeline, `${cp.shortName} deviation`, 'DEVIATION', now) }));
  };

  const autoCorrect = (id: string, confidence: number) => {
    const now = Date.now();
    const cp = stateRef.current.checkpoints.find((c) => c.id === id);
    if (!cp) return;
    const deviationEvent = [...stateRef.current.timeline]
      .reverse()
      .find((e) => e.type === 'DEVIATION' && e.label.includes(cp.shortName));
    const correctionMs = deviationEvent ? now - deviationEvent.timestamp : 0;
    updateCheckpoint(id, { status: 'VERIFIED', error: null, confidence: Math.round(confidence * 100), timestamp: now, correctionTime: correctionMs });
    setState((s) => ({ ...s, timeline: pushEvent(s.timeline, `${cp.shortName} corrected`, 'CORRECTED', now) }));
    after(VERIFIED_HOLD_MS, () => {
      const remaining = stateRef.current.checkpoints.filter((c) => c.status === 'PENDING');
      if (remaining.length === 0) finishAssessment();
      else advanceToNext();
    });
  };

  const injectDemoFault = useCallback(() => {
    const current = stateRef.current.checkpoints.find((c) => c.status === 'IN_PROGRESS');
    if (!current) return;
    flagDeviation(current.id, ERROR_MESSAGES[current.id] ?? 'Deviation detected.');
  }, []);

  const correctMistake = useCallback(() => {
    const current = stateRef.current.checkpoints.find((c) => c.status === 'DEVIATION');
    if (!current) return;
    const now = Date.now();
    const deviationEvent = [...stateRef.current.timeline]
      .reverse()
      .find((e) => e.type === 'DEVIATION' && e.label.includes(current.shortName));
    const correctionMs = deviationEvent ? now - deviationEvent.timestamp : 0;
    updateCheckpoint(current.id, { status: 'NEEDS_REVIEW', error: null });
    after(650, () => {
      const verifyNow = Date.now();
      const conf = detectionAdapter.getDetections(current.id, 'nominal');
      const topConf = conf.length ? Math.round(Math.max(...conf.map((d) => d.confidence)) * 100) : 95;
      updateCheckpoint(current.id, { status: 'VERIFIED', confidence: topConf, timestamp: verifyNow, correctionTime: correctionMs });
      setState((s) => ({ ...s, timeline: pushEvent(s.timeline, `${current.shortName} corrected`, 'CORRECTED', verifyNow) }));
      after(VERIFIED_HOLD_MS, () => {
        const remaining = stateRef.current.checkpoints.filter((c) => c.status === 'PENDING');
        if (remaining.length === 0) finishAssessment();
        else advanceToNext();
      });
    });
  }, []);

  const finishAssessment = useCallback(() => {
    const now = Date.now();
    setState((s) => {
      if (s.phase !== 'LIVE') return s;
      const completed = { ...s, phase: 'COMPLETE' as const, completedAt: now, timeline: pushEvent(s.timeline, 'Circuit completed', 'COMPLETED', now) };
      return { ...completed, result: computeResult(completed) };
    });
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    eventCounter = 0;
    setState({
      phase: 'IDLE',
      procedureName: 'LED Circuit Assembly',
      checkpoints: createInitialCheckpoints(),
      timeline: [],
      startedAt: null,
      completedAt: null,
      result: null,
      visionMode: stateRef.current.visionMode,
    });
    setDetections([]);
  }, []);

  useEffect(() => () => clearTimers(), []);

  return {
    state,
    detections,
    setVisionMode,
    feedVisionDetections,
    startSetup,
    beginAssessment,
    advanceToNext,
    injectDemoFault,
    correctMistake,
    finishAssessment,
    reset,
  };
}

export { CHECKPOINT_DEFS };
