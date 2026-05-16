import { ConfidenceMeter } from './components/ConfidenceMeter';
import { DetectionDetails } from './components/DetectionDetails';
import { DetectionStatus } from './components/DetectionStatus';
import { MicCaptureControls } from './components/MicCaptureControls';
import { useHarmonicDetectorAnalysis } from './useHarmonicDetectorAnalysis';
import { useMicrophoneCaptureActions } from './useMicrophoneCaptureActions';

interface Props {
  readonly showMicControls?: boolean;
  readonly footer?: React.ReactNode;
  readonly onThresholdChange: (value: number) => void;
}

export function HarmonicDetectorLabView({
  showMicControls = true,
  footer,
  onThresholdChange,
}: Props) {
  const {
    live,
    detection,
    confidenceThreshold,
    analysisError,
    captureIsLive,
    captureError,
  } = useHarmonicDetectorAnalysis();
  const { start, stop } = useMicrophoneCaptureActions();

  const isRunning = captureIsLive;
  const analyzing = captureIsLive && live;
  const isDrone = detection?.isDrone ?? false;

  return (
    <div className="flex flex-col gap-4 min-h-0">
      <DetectionStatus
        isDrone={analyzing ? isDrone : false}
        isRunning={isRunning}
        confidence={detection?.confidence ?? 0}
      />
      <ConfidenceMeter
        confidence={detection?.confidence ?? null}
        threshold={confidenceThreshold}
      />
      {showMicControls ? (
        <MicCaptureControls
          isLive={captureIsLive}
          captureError={captureError}
          confidenceThreshold={confidenceThreshold}
          onThresholdChange={onThresholdChange}
          onStart={start}
          onStop={stop}
        />
      ) : null}
      {analysisError != null ? (
        <div className="alert alert-error text-sm py-2" role="alert">
          {analysisError}
        </div>
      ) : null}
      <DetectionDetails
        reasoning={detection?.reasoning}
        fundamentals={detection?.fundamentals}
      />
      {detection?.latencyMs != null ? (
        <p className="text-xs text-base-content/50 font-mono">
          latency {detection.latencyMs.toFixed(1)} ms
        </p>
      ) : null}
      {footer}
    </div>
  );
}
