import { useCallback, useEffect, useRef, useState } from 'react';
import type { Detection } from '@/types';
import { detectFrame } from '@/engine/visionDetector';

// ───────────────────────────────────────────────────────────────────────────
// useCameraVision
//
// Manages the browser camera (getUserMedia), runs the VisionDetector on a
// requestAnimationFrame loop, and exposes live detections.
//
// FUTURE INTEGRATION: on a real iQOO device, replace getUserMedia with a
// CameraX preview surface and replace detectFrame() with an on-device
// Mobile Vision Model call. The Detection[] output contract is identical.
// ───────────────────────────────────────────────────────────────────────────

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'unavailable'
  | 'error';

export interface CameraVision {
  status: CameraStatus;
  detections: Detection[];
  start: () => Promise<void>;
  stop: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  isLive: boolean;
}

export function useCameraVision(enabled: boolean): CameraVision {
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [detections, setDetections] = useState<Detection[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDetectRef = useRef<number>(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setDetections([]);
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable');
      return;
    }
    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatus('active');
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setStatus('denied');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setStatus('unavailable');
      } else {
        setStatus('error');
      }
    }
  }, []);

  // Detection loop — only runs while active and enabled.
  useEffect(() => {
    if (status !== 'active' || !enabled) return;
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');

    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);
      // Throttle to ~12 fps for processing
      if (ts - lastDetectRef.current < 80) return;
      lastDetectRef.current = ts;
      if (!videoRef.current || !enabledRef.current) return;
      const dets = detectFrame(videoRef.current, canvasRef.current!);
      setDetections(dets);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [status, enabled]);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  return {
    status,
    detections,
    start,
    stop,
    videoRef,
    isLive: status === 'active',
  };
}
