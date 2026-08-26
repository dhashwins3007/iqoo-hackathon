import type { SessionState, Detection } from '@/types';
import { PhoneHome } from '@/components/PhoneHome';
import { PhoneTaskSetup } from '@/components/PhoneTaskSetup';
import { PhoneLiveAssessment } from '@/components/PhoneLiveAssessment';
import { PhoneAssessment } from '@/components/PhoneAssessment';
import type { CameraStatus } from '@/engine/useCameraVision';

interface Props {
  state: SessionState;
  detections: Detection[];
  cameraStatus: CameraStatus;
  videoRef: React.RefObject<HTMLVideoElement>;
  onUseCamera: () => void;
  onStopCamera: () => void;
  onStart: () => void;
  onBegin: () => void;
  onBack: () => void;
  onInjectDemoFault: () => void;
  onCorrectMistake: () => void;
  onReset: () => void;
  onViewEvidence: () => void;
}

export function PhoneShell({
  state,
  detections,
  cameraStatus,
  videoRef,
  onUseCamera,
  onStopCamera,
  onStart,
  onBegin,
  onBack,
  onInjectDemoFault,
  onCorrectMistake,
  onReset,
  onViewEvidence,
}: Props) {
  return (
    <div className="phone-frame noise">
      <div className="phone-notch" />
      <div className="flex h-full w-full flex-col">
        {state.phase === 'IDLE' && <PhoneHome onStart={onStart} />}
        {state.phase === 'SETUP' && <PhoneTaskSetup onBack={onBack} onBegin={onBegin} />}
        {state.phase === 'LIVE' && (
          <PhoneLiveAssessment
            state={state}
            detections={detections}
            cameraStatus={cameraStatus}
            videoRef={videoRef}
            onUseCamera={onUseCamera}
            onStopCamera={onStopCamera}
            onInjectDemoFault={onInjectDemoFault}
            onCorrectMistake={onCorrectMistake}
            onReset={onReset}
          />
        )}
        {(state.phase === 'COMPLETE' || state.phase === 'ASSESSMENT') && (
          <PhoneAssessment state={state} onReset={onReset} onViewEvidence={onViewEvidence} />
        )}
      </div>
    </div>
  );
}
