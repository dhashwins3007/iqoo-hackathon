import { useEffect, useState } from 'react';
import { Smartphone, Monitor, FileBarChart, ScanLine } from 'lucide-react';
import { useAssessmentEngine } from '@/engine/useAssessmentEngine';
import { useCameraVision } from '@/engine/useCameraVision';
import { PhoneShell } from '@/components/PhoneShell';
import { TrainerDashboard } from '@/components/TrainerDashboard';
import { PhoneAssessment } from '@/components/PhoneAssessment';

type View = 'live' | 'trainer' | 'report';

export default function App() {
  const engine = useAssessmentEngine();
  const [view, setView] = useState<View>('live');
  const camera = useCameraVision(engine.state.visionMode);

  // When camera is active, enable vision mode and feed detections to the engine.
  useEffect(() => {
    engine.setVisionMode(camera.isLive);
  }, [camera.isLive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Feed live detections into the engine whenever they update (vision mode).
  useEffect(() => {
    if (camera.isLive) {
      engine.feedVisionDetections(camera.detections);
    }
  }, [camera.detections, camera.isLive]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUseCamera = async () => {
    await camera.start();
  };

  const handleStopCamera = () => {
    camera.stop();
    engine.setVisionMode(false);
  };

  const handleReset = () => {
    camera.stop();
    engine.reset();
  };

  const navItems: { id: View; label: string; icon: typeof Smartphone }[] = [
    { id: 'live', label: 'Live Demo', icon: Smartphone },
    { id: 'trainer', label: 'Trainer Console', icon: Monitor },
    { id: 'report', label: 'Assessment Report', icon: FileBarChart },
  ];

  return (
    <div className="min-h-screen bg-ink-950 text-gray-100">
      {/* top nav */}
      <nav className="sticky top-0 z-40 border-b border-ink-700 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-dim">
              <ScanLine size={17} className="text-ink-950" strokeWidth={2.5} />
            </div>
            <span className="text-[14px] font-bold tracking-wide text-white">SKILLMIRROR</span>
            <span className="ml-1 hidden font-mono text-[10px] uppercase tracking-wider text-neutralx sm:inline">
              · Prototype
            </span>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-ink-700 bg-ink-850/60 p-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-[12px] font-medium transition-all duration-200 ${
                    active
                      ? 'bg-accent text-ink-950 shadow-glow'
                      : 'text-neutralx hover:text-gray-200'
                  }`}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* views */}
      {view === 'live' && (
        <div className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4 py-10">
          {/* ambient backdrop */}
          <div
            className="pointer-events-none fixed inset-0 opacity-40"
            style={{
              background:
                'radial-gradient(60% 50% at 50% 30%, rgba(0,229,199,0.06) 0%, transparent 70%)',
            }}
          />
          <div className="relative">
            <PhoneShell
              state={engine.state}
              detections={engine.detections}
              cameraStatus={camera.status}
              videoRef={camera.videoRef}
              onUseCamera={handleUseCamera}
              onStopCamera={handleStopCamera}
              onStart={engine.startSetup}
              onBegin={engine.beginAssessment}
              onBack={engine.reset}
              onInjectDemoFault={engine.injectDemoFault}
              onCorrectMistake={engine.correctMistake}
              onReset={handleReset}
              onViewEvidence={() => setView('report')}
            />
            {/* side caption */}
            <div className="absolute -right-[230px] top-1/2 hidden -translate-y-1/2 xl:block">
              <div className="w-[200px] space-y-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
                    Phone App
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-neutralx">
                    The learner's device runs the assessment — observing the
                    workspace, verifying checkpoints, and flagging deviations in
                    real time.
                  </p>
                </div>
                <div className="rounded-xl border border-ink-700 bg-ink-850/50 p-3">
                  <p className="font-mono text-[9px] uppercase tracking-wider text-neutralx">
                    Try it
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-300">
                    Tap <span className="text-accent">Use Camera</span> for real
                    vision detection, or stay in Demo Mode and tap{" "}
                    <span className="text-bad">Inject Demo Fault</span> at Step 4.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'trainer' && (
        <div className="mx-auto max-w-[1440px]">
          <TrainerDashboard
            state={engine.state}
            detections={engine.detections}
            cameraActive={camera.isLive}
            videoRef={camera.videoRef}
          />
        </div>
      )}

      {view === 'report' && (
        <div className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4 py-10">
          <div className="phone-frame noise">
            <div className="phone-notch" />
            <div className="flex h-full w-full flex-col">
              {engine.state.result ? (
                <PhoneAssessment
                  state={engine.state}
                  onReset={handleReset}
                  onViewEvidence={() => setView('trainer')}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                  <FileBarChart size={40} className="text-neutralx-dim" />
                  <p className="mt-4 text-[15px] font-semibold text-gray-300">
                    No assessment yet
                  </p>
                  <p className="mt-2 text-[12px] text-neutralx">
                    Complete an assessment to view the report here.
                  </p>
                  <button
                    onClick={() => setView('live')}
                    className="btn-ghost mt-6"
                  >
                    Go to Live Demo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
