import { useState } from 'react';

import { HarmonicDetectorFullscreen } from './HarmonicDetectorFullscreen';
import { HarmonicDetectorLabView } from './HarmonicDetectorLabView';
import { useHarmonicThreshold } from './useHarmonicThreshold';

interface Props {
  readonly moduleId: string;
}

export function HarmonicDetectorVizPanel({ moduleId }: Props) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const { setConfidenceThreshold } = useHarmonicThreshold(moduleId);

  return (
    <>
      <div className="rounded-box border border-base-300 bg-base-200/30 p-4">
        <p className="text-xs uppercase tracking-wide text-base-content/50 mb-3">
          Гармонический детектор
        </p>
        <HarmonicDetectorLabView
          compact
          onThresholdChange={setConfidenceThreshold}
          footer={
            <button
              type="button"
              className="btn btn-outline btn-sm w-full mt-1"
              onClick={() => setFullscreenOpen(true)}
            >
              На весь экран
            </button>
          }
        />
      </div>
      {fullscreenOpen ? (
        <HarmonicDetectorFullscreen
          moduleId={moduleId}
          onClose={() => setFullscreenOpen(false)}
        />
      ) : null}
    </>
  );
}
