import React, { useCallback } from 'react';
import { useMediaLibrary } from '@membrana/media-library-service';

import { SamplePlaybackBar } from '../../components/sample-playback/SamplePlaybackBar';
import { downloadBlob, extensionFromMime } from '../../lib/downloadBlob';
import { useSamplePlayback } from '../../lib/useSamplePlayback';

export interface SampleLibraryPlayerPanelProps {
  readonly moduleId: string;
}

export const SampleLibraryPlayerPanel: React.FC<SampleLibraryPlayerPanelProps> = ({
  moduleId: _moduleId,
}) => {
  const playback = useSamplePlayback();
  const { service, snapshot } = useMediaLibrary();

  const selectedSample =
    playback.selectedSampleId != null
      ? Object.values(snapshot.samplesByCollection)
          .flat()
          .find((s) => s.id === playback.selectedSampleId) ?? null
      : null;

  const handleExport = useCallback(async () => {
    if (!selectedSample) return;
    const blob = await service.getSampleBlob(selectedSample.id);
    const ext = extensionFromMime(blob.type);
    downloadBlob(blob, `${selectedSample.title}.${ext}`);
  }, [selectedSample, service]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <SamplePlaybackBar
        playback={playback}
        showExport
        onExport={() => void handleExport()}
      />
      {selectedSample ? (
        <div className="grid grid-cols-2 gap-2 text-xs text-base-content/70">
          <div>
            <span className="text-base-content/50">class:</span> {selectedSample.class}
          </div>
          <div>
            <span className="text-base-content/50">label:</span> {selectedSample.label}
          </div>
          <div>
            <span className="text-base-content/50">источник:</span> {selectedSample.source}
          </div>
          <div className="tabular-nums">
            <span className="text-base-content/50">размер:</span>{' '}
            {(selectedSample.sizeBytes / 1024).toFixed(0)} KB
          </div>
        </div>
      ) : null}
    </div>
  );
};
