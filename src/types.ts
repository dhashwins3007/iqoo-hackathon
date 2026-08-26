// ───────────────────────────────────────────────────────────────────────────
// Core domain types for the SkillMirror assessment engine.
//
// Architecture (top → bottom):
//   UI  →  Assessment State  →  Checkpoint Engine  →  Detection Adapter
//
// The Detection Adapter is an interface so the prototype simulation can be
// swapped for a real on-device vision pipeline:
//
//   CameraX  →  Mobile Vision Model (TFLite/ONNX)  →  Detection Adapter  →  Engine
// ───────────────────────────────────────────────────────────────────────────

export type CheckpointStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'VERIFIED'
  | 'DEVIATION'
  | 'NEEDS_REVIEW';

export type DetectionLabel = 'LED' | 'RESISTOR' | 'BREADBOARD' | 'WIRE';

export interface Detection {
  id: string;
  label: DetectionLabel;
  confidence: number;
  /** Bounding box in normalized 0..1 coordinates relative to the workspace frame. */
  bbox: { x: number; y: number; w: number; h: number };
}

export interface Checkpoint {
  id: string;
  name: string;
  shortName: string;
  status: CheckpointStatus;
  confidence: number;
  timestamp: number | null;
  error: string | null;
  correctionTime: number | null;
}

export interface TimelineEvent {
  id: string;
  label: string;
  type: 'VERIFIED' | 'DEVIATION' | 'CORRECTED' | 'STARTED' | 'COMPLETED';
  timestamp: number;
}

export interface AssessmentResult {
  procedureName: string;
  checkpointsTotal: number;
  checkpointsVerifiedFirstPass: number;
  checkpointsVerifiedFinal: number;
  deviations: number;
  corrections: number;
  finalScore: number;
  completionTimeMs: number;
  status: 'PASSED' | 'NEEDS_REVIEW' | 'FAILED';
  timeline: TimelineEvent[];
}

export type AssessmentPhase =
  | 'IDLE'
  | 'SETUP'
  | 'LIVE'
  | 'ASSESSMENT'
  | 'COMPLETE';

export interface SessionState {
  phase: AssessmentPhase;
  procedureName: string;
  checkpoints: Checkpoint[];
  timeline: TimelineEvent[];
  startedAt: number | null;
  completedAt: number | null;
  result: AssessmentResult | null;
  /** Whether the current assessment is camera-driven (true) or scripted demo (false). */
  visionMode: boolean;
}

// ───────────────────────────────────────────────────────────────────────────
// Detection Adapter interface.
//
// In production this is implemented by a bridge to CameraX + an on-device
// object-detection model running on the iQOO NPU. The prototype ships a
// simulated implementation (MockDetectionAdapter) that returns scripted
// detections per checkpoint. Replacing the adapter is the only change
// needed to move from simulation to real vision inference.
// ───────────────────────────────────────────────────────────────────────────

export interface DetectionAdapter {
  /** Returns the detections observed for the current checkpoint context. */
  getDetections(checkpointId: string, variant: 'nominal' | 'deviation'): Detection[];
  /** Whether the adapter is a live camera source or a simulation. */
  readonly isLive: boolean;
}
