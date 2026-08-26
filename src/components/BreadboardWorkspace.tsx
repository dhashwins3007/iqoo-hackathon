import type { Detection, DetectionLabel } from '@/types';

// ───────────────────────────────────────────────────────────────────────────
// WorkspaceView
//
// Renders either:
//   • a live <video> camera feed (vision mode), or
//   • the static SVG breadboard mock (demo mode)
//
// The detection overlay is drawn on top in both cases — identical contract.
//
// FUTURE INTEGRATION: the video element is replaced by a CameraX preview
// surface on-device. The overlay layer stays identical.
// ───────────────────────────────────────────────────────────────────────────

const LABEL_COLORS: Record<DetectionLabel, string> = {
  LED: '#00E5C7',
  RESISTOR: '#FFB627',
  BREADBOARD: '#5B6776',
  WIRE: '#3A8BFF',
};

interface Props {
  detections: Detection[];
  highlightLabel?: DetectionLabel | null;
  dimmed?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement>;
  cameraActive?: boolean;
}

export function BreadboardWorkspace({ detections, highlightLabel, dimmed, videoRef, cameraActive }: Props) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-ink-950">
      {cameraActive ? (
        <>
          {/* live camera feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* subtle dark overlay for contrast with overlay boxes */}
          <div className="pointer-events-none absolute inset-0 bg-ink-950/20" />
        </>
      ) : (
        <>
          {/* camera vignette */}
          <div className="absolute inset-0 grid-bg opacity-60" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 80% at 50% 40%, transparent 40%, rgba(0,0,0,0.55) 100%)',
            }}
          />
          {/* breadboard SVG */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 h-full w-full"
          >
            <defs>
              <linearGradient id="bb-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a2b3a" />
                <stop offset="100%" stopColor="#0f1a24" />
              </linearGradient>
            </defs>
            <rect x="8" y="28" width="84" height="50" rx="2" fill="url(#bb-grad)" stroke="#2a3a4a" strokeWidth="0.4" />
            <line x1="10" y1="33" x2="90" y2="33" stroke="#b23a3a" strokeWidth="0.5" opacity="0.7" />
            <line x1="10" y1="36" x2="90" y2="36" stroke="#3a8b3a" strokeWidth="0.5" opacity="0.7" />
            <line x1="10" y1="70" x2="90" y2="70" stroke="#3a8b3a" strokeWidth="0.5" opacity="0.7" />
            <line x1="10" y1="73" x2="90" y2="73" stroke="#b23a3a" strokeWidth="0.5" opacity="0.7" />
            {Array.from({ length: 30 }).map((_, i) => (
              <g key={i}>
                <circle cx={10 + i * 2.7} cy={42} r={0.5} fill="#2a3a4a" />
                <circle cx={10 + i * 2.7} cy={46} r={0.5} fill="#2a3a4a" />
                <circle cx={10 + i * 2.7} cy={50} r={0.5} fill="#2a3a4a" />
                <circle cx={10 + i * 2.7} cy={54} r={0.5} fill="#2a3a4a" />
                <circle cx={10 + i * 2.7} cy={58} r={0.5} fill="#2a3a4a" />
                <circle cx={10 + i * 2.7} cy={62} r={0.5} fill="#2a3a4a" />
              </g>
            ))}
            <line x1="10" y1="48" x2="90" y2="48" stroke="#0a1218" strokeWidth="0.8" />
            <line x1="10" y1="60" x2="90" y2="60" stroke="#0a1218" strokeWidth="0.8" />
            {/* resistor */}
            <g>
              <rect x="22" y="49" width="26" height="6" rx="1" fill="#c9a66b" stroke="#8a6f3f" strokeWidth="0.3" />
              <rect x="27" y="49" width="2" height="6" fill="#3a3a3a" />
              <rect x="32" y="49" width="2" height="6" fill="#8a2a2a" />
              <rect x="37" y="49" width="2" height="6" fill="#2a6a2a" />
              <line x1="18" y1="52" x2="22" y2="52" stroke="#b0b0b0" strokeWidth="0.6" />
              <line x1="48" y1="52" x2="52" y2="52" stroke="#b0b0b0" strokeWidth="0.6" />
            </g>
            {/* LED */}
            <g>
              <line x1="60" y1="40" x2="60" y2="46" stroke="#b0b0b0" strokeWidth="0.5" />
              <line x1="64" y1="40" x2="64" y2="48" stroke="#b0b0b0" strokeWidth="0.5" />
              <circle cx="62" cy="37" r="4" fill="#1a3a3a" stroke="#00e5c7" strokeWidth="0.4" />
              <circle cx="62" cy="37" r="1.6" fill="#00e5c7" opacity="0.5" />
              <line x1="58.5" y1="37" x2="60" y2="37" stroke="#00e5c7" strokeWidth="0.4" />
            </g>
            {/* wires */}
            <path d="M 30 42 Q 40 30 52 42" fill="none" stroke="#e85d3a" strokeWidth="0.8" opacity="0.85" />
            <path d="M 60 62 Q 70 54 82 62" fill="none" stroke="#3a8bff" strokeWidth="0.8" opacity="0.85" />
          </svg>
        </>
      )}

      {/* dim overlay when deviation */}
      {dimmed && (
        <div className="absolute inset-0 bg-bad/5 transition-opacity duration-500" />
      )}

      {/* detection overlay */}
      <DetectionOverlay detections={detections} highlightLabel={highlightLabel} />
    </div>
  );
}

function DetectionOverlay({
  detections,
  highlightLabel,
}: {
  detections: Detection[];
  highlightLabel?: DetectionLabel | null;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {detections.map((d) => {
        const color = LABEL_COLORS[d.label];
        const isHi = highlightLabel === d.label;
        return (
          <div
            key={d.id}
            className="cv-box transition-all duration-300 ease-out"
            style={{
              left: `${d.bbox.x * 100}%`,
              top: `${d.bbox.y * 100}%`,
              width: `${d.bbox.w * 100}%`,
              height: `${d.bbox.h * 100}%`,
              borderColor: color,
              opacity: isHi ? 1 : 0.85,
              boxShadow: isHi ? `0 0 16px -2px ${color}66` : 'none',
            }}
          >
            <span
              className="absolute -top-5 left-0 whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wide"
              style={{ background: color, color: '#06080b' }}
            >
              {d.label} {Math.round(d.confidence * 100)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
