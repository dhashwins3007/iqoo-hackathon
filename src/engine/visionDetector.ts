import type { Detection, DetectionLabel } from '@/types';

// ───────────────────────────────────────────────────────────────────────────
// VisionDetector — lightweight in-browser computer vision.
//
// This module performs REAL detection on a camera frame using:
//   • HSV color segmentation per target class
//   • connected-component labeling (flood fill)
//   • shape/size heuristics (aspect ratio, area, fill ratio)
//   • spatial relationship checks (LED must be on breadboard, etc.)
//
// No pretrained model, no backend, no random/fake numbers. Every confidence
// value returned is derived from pixel statistics of the actual camera frame.
//
// FUTURE INTEGRATION: on a real iQOO device this module is replaced by a
// Mobile Vision Model (TFLite/ONNX) running on the NPU via CameraX. The
// Detection[] contract stays identical, so the checkpoint engine and UI do
// not change.
// ───────────────────────────────────────────────────────────────────────────

export interface VisionConfig {
  /** Downsample width for processing — keeps it fast on a phone. */
  processWidth: number;
  /** Minimum blob area as a fraction of frame pixels. */
  minAreaFrac: number;
  /** Maximum blob area as a fraction of frame pixels. */
  maxAreaFrac: number;
}

const DEFAULT_CONFIG: VisionConfig = {
  processWidth: 160,
  minAreaFrac: 0.004,
  maxAreaFrac: 0.6,
};

// Per-label HSV ranges. [hMin,hMax, sMin,sMax, vMin,vMax] in 0..255 / 0..180(OpenCV-ish).
// Hue is in degrees mapped to 0..180 (OpenCV convention) for simplicity.
interface HsvRange {
  hMin: number; hMax: number;
  sMin: number; sMax: number;
  vMin: number; vMax: number;
}

const RANGES: Record<DetectionLabel, HsvRange[]> = {
  // Breadboard: neutral tan/white/dark plastic — low saturation, mid value.
  BREADBOARD: [
    { hMin: 0, hMax: 180, sMin: 0, sMax: 70, vMin: 60, vMax: 200 },
  ],
  // Resistor: beige/tan body — warm low-sat.
  RESISTOR: [
    { hMin: 15, hMax: 40, sMin: 40, sMax: 140, vMin: 90, vMax: 220 },
  ],
  // LED bulb: bright cyan/teal/green OR red — high saturation, high value.
  LED: [
    { hMin: 75, hMax: 130, sMin: 90, sMax: 255, vMin: 90, vMax: 255 },
    { hMin: 0, hMax: 15, sMin: 90, sMax: 255, vMin: 90, vMax: 255 },
  ],
  // Wires: saturated red, blue, orange, yellow.
  WIRE: [
    { hMin: 0, hMax: 12, sMin: 120, sMax: 255, vMin: 100, vMax: 255 },   // red
    { hMin: 100, hMax: 135, sMin: 120, sMax: 255, vMin: 100, vMax: 255 }, // blue
    { hMin: 15, hMax: 30, sMin: 150, sMax: 255, vMin: 120, vMax: 255 },   // orange
    { hMin: 25, hMax: 40, sMin: 150, sMax: 255, vMin: 140, vMax: 255 },   // yellow
  ],
};

interface Blob {
  x: number; y: number; w: number; h: number;
  area: number;
  fillRatio: number;
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  // Map to OpenCV-ish: h 0..180, s 0..255, v 0..255
  return [Math.round(h / 2), Math.round(s * 255), Math.round(v * 255)];
}

function inRange(h: number, s: number, v: number, r: HsvRange): boolean {
  const hOk = r.hMin <= r.hMax ? h >= r.hMin && h <= r.hMax : h >= r.hMin || h <= r.hMax;
  return hOk && s >= r.sMin && s <= r.sMax && v >= r.vMin && v <= r.vMax;
}

// Connected-component labeling via iterative flood fill on a Uint8 mask.
function labelBlobs(mask: Uint8Array, w: number, h: number, minArea: number, maxArea: number): Blob[] {
  const visited = new Uint8Array(w * h);
  const blobs: Blob[] = [];
  const stack: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (mask[i] === 0 || visited[i]) continue;
    let area = 0, minX = w, minY = h, maxX = 0, maxY = 0;
    stack.push(i);
    while (stack.length) {
      const p = stack.pop()!;
      if (visited[p] || mask[p] === 0) continue;
      visited[p] = 1;
      area++;
      const x = p % w, y = (p / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
      if (y > 0) stack.push(p - w);
      if (y < h - 1) stack.push(p + w);
    }
    if (area < minArea || area > maxArea) continue;
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    const fillRatio = area / (bw * bh);
    blobs.push({ x: minX, y: minY, w: bw, h: bh, area, fillRatio });
  }
  return blobs;
}

function confidenceFromStats(area: number, totalPx: number, fillRatio: number, aspect: number): number {
  // Confidence heuristics: reward moderate area fraction, good fill, sensible aspect.
  const areaFrac = area / totalPx;
  let c = 0.5;
  // Area sweet spot 0.5%..25%
  if (areaFrac > 0.005 && areaFrac < 0.25) c += 0.2;
  if (areaFrac > 0.01 && areaFrac < 0.15) c += 0.1;
  // Fill ratio — compact shapes score higher for LED/breadboard; wires are sparse.
  if (fillRatio > 0.35) c += 0.1;
  if (fillRatio > 0.55) c += 0.05;
  // Aspect sanity 0.2..6
  if (aspect > 0.2 && aspect < 6) c += 0.1;
  return Math.min(0.99, Math.max(0.4, c));
}

function aspectOf(b: Blob): number {
  return b.w / Math.max(1, b.h);
}

/**
 * Run vision detection on a single video frame.
 * @param video source video element
 * @param canvasScratch scratch canvas (reused to avoid GC)
 * @returns detections in normalized 0..1 coordinates, or empty array if no frame
 */
export function detectFrame(
  video: HTMLVideoElement,
  canvasScratch: HTMLCanvasElement,
  config: VisionConfig = DEFAULT_CONFIG
): Detection[] {
  if (video.readyState < 2 || video.videoWidth === 0) return [];
  const vw = video.videoWidth, vh = video.videoHeight;
  const scale = config.processWidth / vw;
  const pw = Math.max(1, Math.round(vw * scale));
  const ph = Math.max(1, Math.round(vh * scale));
  canvasScratch.width = pw;
  canvasScratch.height = ph;
  const ctx = canvasScratch.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(video, 0, 0, pw, ph);
  const img = ctx.getImageData(0, 0, pw, ph);
  const data = img.data;
  const totalPx = pw * ph;
  const minArea = Math.max(8, Math.round(totalPx * config.minAreaFrac));
  const maxArea = Math.round(totalPx * config.maxAreaFrac);

  const detections: Detection[] = [];

  for (const label of Object.keys(RANGES) as DetectionLabel[]) {
    const mask = new Uint8Array(totalPx);
    const ranges = RANGES[label];
    for (let p = 0, i = 0; p < totalPx; p++, i += 4) {
      const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);
      for (const r of ranges) {
        if (inRange(h, s, v, r)) { mask[p] = 1; break; }
      }
    }
    const blobs = labelBlobs(mask, pw, ph, minArea, maxArea);
    // Heuristics per label
    for (const b of blobs) {
      const aspect = aspectOf(b);
      if (label === 'BREADBOARD') {
        if (aspect < 0.8 || aspect > 4) continue;
        if (b.fillRatio < 0.25) continue;
      } else if (label === 'RESISTOR') {
        if (aspect < 1.5 || aspect > 8) continue;
      } else if (label === 'LED') {
        if (aspect < 0.4 || aspect > 3) continue;
        if (b.area > totalPx * 0.1) continue;
      } else if (label === 'WIRE') {
        if (aspect < 2) continue;
        if (b.fillRatio > 0.6) continue;
      }
      const conf = confidenceFromStats(b.area, totalPx, b.fillRatio, aspect);
      detections.push({
        id: `cam-${label}-${detections.length}`,
        label,
        confidence: conf,
        bbox: { x: b.x / pw, y: b.y / ph, w: b.w / pw, h: b.h / ph },
      });
    }
    // Keep best per label (highest confidence) to avoid duplicates
  }
  // Deduplicate: keep highest-confidence detection per label.
  const best: Record<string, Detection> = {};
  for (const d of detections) {
    if (!best[d.label] || d.confidence > best[d.label].confidence) best[d.label] = d;
  }
  return Object.values(best).sort((a, b) => b.confidence - a.confidence);
}

/**
 * Checkpoint evaluation against live detections.
 * Returns a verdict for the current checkpoint based on what the camera sees.
 */
export interface CheckpointVerdict {
  status: 'VERIFIED' | 'DEVIATION' | 'NEEDS_REVIEW' | 'PENDING';
  confidence: number;
  error: string | null;
  detected: Detection[];
}

export function evaluateCheckpoint(
  checkpointId: string,
  detections: Detection[]
): CheckpointVerdict {
  const has = (l: DetectionLabel) => detections.find((d) => d.label === l);
  const bb = has('BREADBOARD');
  const res = has('RESISTOR');
  const led = has('LED');
  const wire = has('WIRE');

  const lowConf = (d?: Detection) => d && d.confidence < 0.5;

  switch (checkpointId) {
    case 'cp1': {
      // Workspace detected
      if (!bb) return { status: 'PENDING', confidence: 0, error: null, detected: detections };
      if (lowConf(bb)) return { status: 'NEEDS_REVIEW', confidence: bb.confidence, error: 'Workspace partially visible — needs human review.', detected: detections };
      return { status: 'VERIFIED', confidence: bb.confidence, error: null, detected: detections };
    }
    case 'cp2': {
      if (!bb) return { status: 'PENDING', confidence: 0, error: null, detected: detections };
      if (!res) return { status: 'PENDING', confidence: bb.confidence, error: null, detected: detections };
      // Resistor should be within breadboard bbox horizontally
      const inside = res.bbox.x > bb.bbox.x && res.bbox.x + res.bbox.w < bb.bbox.x + bb.bbox.w;
      if (!inside) return { status: 'DEVIATION', confidence: res.confidence, error: 'Resistor detected outside breadboard region.', detected: detections };
      if (lowConf(res)) return { status: 'NEEDS_REVIEW', confidence: res.confidence, error: 'Resistor detection low confidence — needs human review.', detected: detections };
      return { status: 'VERIFIED', confidence: res.confidence, error: null, detected: detections };
    }
    case 'cp3': {
      if (!bb || !res) return { status: 'PENDING', confidence: 0, error: null, detected: detections };
      if (!led) return { status: 'PENDING', confidence: res.confidence, error: null, detected: detections };
      const inside = led.bbox.x > bb.bbox.x && led.bbox.x + led.bbox.w < bb.bbox.x + bb.bbox.w;
      if (!inside) return { status: 'DEVIATION', confidence: led.confidence, error: 'LED detected outside breadboard region.', detected: detections };
      if (lowConf(led)) return { status: 'NEEDS_REVIEW', confidence: led.confidence, error: 'LED detection low confidence — needs human review.', detected: detections };
      return { status: 'VERIFIED', confidence: led.confidence, error: null, detected: detections };
    }
    case 'cp4': {
      // LED orientation: heuristic — LED bulb aspect ratio near 1 (round) = correct,
      // elongated/tilted = deviation. Also LED must be above resistor (spatial).
      if (!led) return { status: 'PENDING', confidence: 0, error: null, detected: detections };
      const ledAspect = led.bbox.w / led.bbox.h;
      const round = ledAspect > 0.7 && ledAspect < 1.4;
      if (res && led.bbox.y + led.bbox.h > res.bbox.y) {
        return { status: 'DEVIATION', confidence: led.confidence, error: 'LED placement overlaps resistor — orientation appears incorrect.', detected: detections };
      }
      if (!round) {
        return { status: 'DEVIATION', confidence: led.confidence, error: 'LED orientation does not match expected placement — bulb appears tilted/elongated.', detected: detections };
      }
      if (lowConf(led)) return { status: 'NEEDS_REVIEW', confidence: led.confidence, error: 'LED orientation unclear — needs human review.', detected: detections };
      return { status: 'VERIFIED', confidence: led.confidence, error: null, detected: detections };
    }
    case 'cp5': {
      if (!bb || !led) return { status: 'PENDING', confidence: 0, error: null, detected: detections };
      if (!wire) return { status: 'PENDING', confidence: led.confidence, error: null, detected: detections };
      if (lowConf(wire)) return { status: 'NEEDS_REVIEW', confidence: wire.confidence, error: 'Wire detection low confidence — needs human review.', detected: detections };
      return { status: 'VERIFIED', confidence: wire.confidence, error: null, detected: detections };
    }
    case 'cp6': {
      if (!bb || !res || !led || !wire) return { status: 'PENDING', confidence: 0, error: null, detected: detections };
      const minConf = Math.min(bb.confidence, res.confidence, led.confidence, wire.confidence);
      if (minConf < 0.5) return { status: 'NEEDS_REVIEW', confidence: minConf, error: 'Circuit completion uncertain — needs human review.', detected: detections };
      return { status: 'VERIFIED', confidence: minConf, error: null, detected: detections };
    }
    default:
      return { status: 'PENDING', confidence: 0, error: null, detected: detections };
  }
}
