import { ScanLine, Cpu, ShieldCheck, ArrowRight } from 'lucide-react';

interface Props {
  onStart: () => void;
}

export function PhoneHome({ onStart }: Props) {
  return (
    <div className="flex h-full flex-col bg-ink-950 noise">
      {/* status bar */}
      <StatusBar />

      {/* hero */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
        {/* ambient glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-[38%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,229,199,0.16) 0%, transparent 70%)' }}
        />

        {/* logo mark */}
        <div className="relative mb-7">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-accent/30 bg-ink-850 shadow-glow">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dim">
              <ScanLine size={26} className="text-ink-950" strokeWidth={2.5} />
            </div>
            <div className="absolute -inset-1 rounded-2xl border border-accent/20 animate-pulseRing" />
          </div>
        </div>

        <h1 className="text-[28px] font-semibold tracking-tight text-white">SkillMirror</h1>
        <p className="mt-1.5 text-[13px] font-medium uppercase tracking-[0.18em] text-accent">
          AI Practical Skill Examiner
        </p>
        <p className="mt-4 max-w-[260px] text-[13px] leading-relaxed text-neutralx">
          AI that evaluates what you can <span className="text-gray-200">do</span>, not just
          what you <span className="text-gray-200">know</span>.
        </p>

        {/* feature pills */}
        <div className="mt-8 flex flex-col gap-2.5">
          <FeatureRow icon={Cpu} label="On-device inference" />
          <FeatureRow icon={ScanLine} label="Real-time detection" />
          <FeatureRow icon={ShieldCheck} label="Trainer supervised" />
        </div>
      </div>

      {/* CTA */}
      <div className="px-8 pb-10">
        <button onClick={onStart} className="btn-primary w-full">
          Start Assessment
          <ArrowRight size={17} />
        </button>
        <p className="mt-3 text-center font-mono text-[10px] text-neutralx-dim">
          Prototype simulation · v0.1
        </p>
      </div>
    </div>
  );
}

function FeatureRow({ icon: Icon, label }: { icon: typeof Cpu; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-850/50 px-4 py-2.5">
      <Icon size={15} className="text-accent" />
      <span className="text-[12px] font-medium text-gray-300">{label}</span>
    </div>
  );
}

export function StatusBar() {
  return (
    <div className="flex items-center justify-between px-7 pt-3 pb-1 text-[11px] font-semibold text-gray-200">
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <span className="flex gap-0.5">
          <span className="h-2.5 w-1 rounded-sm bg-gray-200" />
          <span className="h-2.5 w-1 rounded-sm bg-gray-200" />
          <span className="h-2.5 w-1 rounded-sm bg-gray-200" />
          <span className="h-2.5 w-1 rounded-sm bg-gray-500" />
        </span>
        <span className="text-[10px]">5G</span>
        <span className="flex h-2.5 w-5 items-center rounded-[3px] border border-gray-200 px-[1px]">
          <span className="h-1.5 w-3/4 rounded-[1px] bg-gray-200" />
        </span>
      </div>
    </div>
  );
}
