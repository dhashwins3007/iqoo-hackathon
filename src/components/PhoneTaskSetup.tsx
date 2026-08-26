import { ArrowLeft, CircuitBoard, Play, Check } from 'lucide-react';
import { StatusBar } from '@/components/PhoneHome';
import { CHECKPOINT_DEFS } from '@/engine/mockData';

interface Props {
  onBack: () => void;
  onBegin: () => void;
}

export function PhoneTaskSetup({ onBack, onBegin }: Props) {
  return (
    <div className="flex h-full flex-col bg-ink-950 noise">
      <StatusBar />

      {/* header */}
      <div className="flex items-center gap-3 px-5 pt-2 pb-4">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-600 bg-ink-800 text-gray-300 transition-colors hover:text-white"
        >
          <ArrowLeft size={17} />
        </button>
        <span className="text-[13px] font-medium text-neutralx">Task Setup</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {/* procedure card */}
        <div className="rounded-2xl border border-ink-600 bg-ink-850/60 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
              <CircuitBoard size={20} className="text-accent" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-neutralx">Procedure</p>
              <h2 className="text-[17px] font-semibold text-white">LED Circuit Assembly</h2>
            </div>
          </div>
        </div>

        {/* checkpoints */}
        <p className="mt-6 mb-3 text-[11px] font-medium uppercase tracking-wider text-neutralx">
          Checkpoints · {CHECKPOINT_DEFS.length}
        </p>
        <div className="flex flex-col gap-2">
          {CHECKPOINT_DEFS.map((cp, i) => (
            <div
              key={cp.id}
              className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-850/40 px-4 py-3 animate-riseIn"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-800 font-mono text-[12px] font-semibold text-accent">
                {i + 1}
              </span>
              <span className="flex-1 text-[13px] font-medium text-gray-200">{cp.name}</span>
              <Check size={15} className="text-neutralx-dim" />
            </div>
          ))}
        </div>

        {/* info note */}
        <div className="mt-5 rounded-xl border border-ink-700 bg-ink-850/40 p-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent animate-flicker" />
            <p className="text-[11px] leading-relaxed text-neutralx">
              The on-device vision model will verify each checkpoint in real time.
              Keep the workspace centered in frame.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-8 pt-2">
        <button onClick={onBegin} className="btn-primary w-full">
          <Play size={16} fill="currentColor" />
          Begin Assessment
        </button>
      </div>
    </div>
  );
}
