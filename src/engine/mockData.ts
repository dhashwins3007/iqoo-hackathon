import type { Checkpoint, Detection, DetectionAdapter } from '@/types';

// ───────────────────────────────────────────────────────────────────────────
// CHECKPOINT DEFINITIONS
// ───────────────────────────────────────────────────────────────────────────

export const CHECKPOINT_DEFS: Omit<
  Checkpoint,
  'status' | 'confidence' | 'timestamp' | 'error' | 'correctionTime'
>[] = [
  { id: 'cp1', name: 'Component Identification', shortName: 'Components' },
  { id: 'cp2', name: 'Resistor Placement', shortName: 'Resistor' },
  { id: 'cp3', name: 'LED Placement', shortName: 'LED' },
  { id: 'cp4', name: 'LED Orientation', shortName: 'LED Orientation' },
  { id: 'cp5', name: 'Wiring', shortName: 'Wiring' },
  { id: 'cp6', name: 'Circuit Completion', shortName: 'Completion' },
];

export function createInitialCheckpoints(): Checkpoint[] {
  return CHECKPOINT_DEFS.map((d) => ({
    ...d,
    status: 'PENDING',
    confidence: 0,
    timestamp: null,
    error: null,
    correctionTime: null,
  }));
}

// ───────────────────────────────────────────────────────────────────────────
// MOCK DETECTION DATA
//
// Realistic bounding boxes laid out over the breadboard workspace.
// Coordinates are normalized 0..1 relative to the camera frame.
//
// FUTURE INTEGRATION: replace these static detections with frames streamed
// from CameraX → on-device Mobile Vision Model → Detection Adapter.
// ───────────────────────────────────────────────────────────────────────────

const NOMINAL_DETECTIONS: Record<string, Detection[]> = {
  cp1: [
    { id: 'd-bb', label: 'BREADBOARD', confidence: 0.97, bbox: { x: 0.08, y: 0.28, w: 0.84, h: 0.5 } },
    { id: 'd-led', label: 'LED', confidence: 0.94, bbox: { x: 0.58, y: 0.34, w: 0.13, h: 0.22 } },
    { id: 'd-res', label: 'RESISTOR', confidence: 0.91, bbox: { x: 0.22, y: 0.55, w: 0.26, h: 0.1 } },
    { id: 'd-wire1', label: 'WIRE', confidence: 0.88, bbox: { x: 0.3, y: 0.4, w: 0.4, h: 0.05 } },
  ],
  cp2: [
    { id: 'd-bb', label: 'BREADBOARD', confidence: 0.97, bbox: { x: 0.08, y: 0.28, w: 0.84, h: 0.5 } },
    { id: 'd-res', label: 'RESISTOR', confidence: 0.95, bbox: { x: 0.22, y: 0.5, w: 0.26, h: 0.1 } },
  ],
  cp3: [
    { id: 'd-bb', label: 'BREADBOARD', confidence: 0.97, bbox: { x: 0.08, y: 0.28, w: 0.84, h: 0.5 } },
    { id: 'd-led', label: 'LED', confidence: 0.94, bbox: { x: 0.58, y: 0.34, w: 0.13, h: 0.22 } },
    { id: 'd-res', label: 'RESISTOR', confidence: 0.92, bbox: { x: 0.22, y: 0.5, w: 0.26, h: 0.1 } },
  ],
  cp4: [
    { id: 'd-bb', label: 'BREADBOARD', confidence: 0.97, bbox: { x: 0.08, y: 0.28, w: 0.84, h: 0.5 } },
    { id: 'd-led', label: 'LED', confidence: 0.94, bbox: { x: 0.58, y: 0.34, w: 0.13, h: 0.22 } },
    { id: 'd-res', label: 'RESISTOR', confidence: 0.92, bbox: { x: 0.22, y: 0.5, w: 0.26, h: 0.1 } },
    { id: 'd-wire1', label: 'WIRE', confidence: 0.88, bbox: { x: 0.3, y: 0.4, w: 0.4, h: 0.05 } },
  ],
  cp5: [
    { id: 'd-bb', label: 'BREADBOARD', confidence: 0.97, bbox: { x: 0.08, y: 0.28, w: 0.84, h: 0.5 } },
    { id: 'd-led', label: 'LED', confidence: 0.94, bbox: { x: 0.58, y: 0.34, w: 0.13, h: 0.22 } },
    { id: 'd-res', label: 'RESISTOR', confidence: 0.92, bbox: { x: 0.22, y: 0.5, w: 0.26, h: 0.1 } },
    { id: 'd-wire1', label: 'WIRE', confidence: 0.93, bbox: { x: 0.3, y: 0.4, w: 0.4, h: 0.05 } },
    { id: 'd-wire2', label: 'WIRE', confidence: 0.9, bbox: { x: 0.6, y: 0.6, w: 0.22, h: 0.05 } },
  ],
  cp6: [
    { id: 'd-bb', label: 'BREADBOARD', confidence: 0.97, bbox: { x: 0.08, y: 0.28, w: 0.84, h: 0.5 } },
    { id: 'd-led', label: 'LED', confidence: 0.96, bbox: { x: 0.58, y: 0.34, w: 0.13, h: 0.22 } },
    { id: 'd-res', label: 'RESISTOR', confidence: 0.95, bbox: { x: 0.22, y: 0.5, w: 0.26, h: 0.1 } },
    { id: 'd-wire1', label: 'WIRE', confidence: 0.94, bbox: { x: 0.3, y: 0.4, w: 0.4, h: 0.05 } },
    { id: 'd-wire2', label: 'WIRE', confidence: 0.92, bbox: { x: 0.6, y: 0.6, w: 0.22, h: 0.05 } },
  ],
};

// Deviation variant for cp4 — LED box shifts/rotates to signal wrong orientation.
const DEVIATION_DETECTIONS: Record<string, Detection[]> = {
  cp4: [
    { id: 'd-bb', label: 'BREADBOARD', confidence: 0.97, bbox: { x: 0.08, y: 0.28, w: 0.84, h: 0.5 } },
    { id: 'd-led', label: 'LED', confidence: 0.71, bbox: { x: 0.56, y: 0.3, w: 0.16, h: 0.28 } },
    { id: 'd-res', label: 'RESISTOR', confidence: 0.92, bbox: { x: 0.22, y: 0.5, w: 0.26, h: 0.1 } },
    { id: 'd-wire1', label: 'WIRE', confidence: 0.86, bbox: { x: 0.3, y: 0.4, w: 0.4, h: 0.05 } },
  ],
};

export class MockDetectionAdapter implements DetectionAdapter {
  readonly isLive = false;

  getDetections(
    checkpointId: string,
    variant: 'nominal' | 'deviation'
  ): Detection[] {
    if (variant === 'deviation') {
      return DEVIATION_DETECTIONS[checkpointId] ?? NOMINAL_DETECTIONS[checkpointId] ?? [];
    }
    return NOMINAL_DETECTIONS[checkpointId] ?? [];
  }
}

export const detectionAdapter: DetectionAdapter = new MockDetectionAdapter();

// ───────────────────────────────────────────────────────────────────────────
// TIMING / SCORE CONSTANTS
// ───────────────────────────────────────────────────────────────────────────

export const STEP_AUTO_ADVANCE_MS = 1700;
export const VERIFIED_HOLD_MS = 1100;
