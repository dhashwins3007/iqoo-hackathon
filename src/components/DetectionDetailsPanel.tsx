import { useState } from 'react';
import { ChevronDown, ChevronRight, Cpu, Camera, Server, Eye, ListChecks } from 'lucide-react';

interface Props {
  cameraActive: boolean;
  visionMode: boolean;
}

// Collapsible technical indicator panel. Shows the real runtime configuration.
// Does NOT claim NPU/Qualcomm acceleration — only what is actually running.
export function DetectionDetailsPanel({ cameraActive, visionMode }: Props) {
  const [open, setOpen] = useState(false);

  const rows = [
    { icon: Camera, label: 'Input', value: cameraActive ? 'Camera' : 'Scripted mock' },
    { icon: Cpu, label: 'Inference', value: visionMode ? 'Local / Browser' : 'None (mock)' },
    { icon: Server, label: 'Backend', value: 'None' },
    { icon: Eye, label: 'Detection', value: visionMode ? (cameraActive ? 'Active' : 'Idle') : 'Scripted' },
    { icon: ListChecks, label: 'Checkpoint engine', value: 'Active' },
  ];

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850/40">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="font-mono text-[10px] uppercase tracking-wider text-neutralx">
          Detection Details
        </span>
        {open ? <ChevronDown size={14} className="text-neutralx" /> : <ChevronRight size={14} className="text-neutralx" />}
      </button>
      {open && (
        <div className="border-t border-ink-700 px-4 py-3">
          <div className="flex flex-col gap-2">
            {rows.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={12} className="text-neutralx" />
                    <span className="font-mono text-[10px] text-neutralx">{r.label}</span>
                  </div>
                  <span className="font-mono text-[10px] font-semibold text-gray-200">{r.value}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 font-mono text-[9px] leading-relaxed text-neutralx-dim">
            No NPU / Qualcomm acceleration claimed. Vision runs via in-browser
            color segmentation + contour heuristics.
          </p>
        </div>
      )}
    </div>
  );
}
