import type { MembraneCatalogSample } from '@/api/sampleLibrary';
import { SamplePlaybackBar } from '@/components/sample-playback/SamplePlaybackBar';
import { formatBytes } from '@/lib/formatBytes';
import type { SamplePlaybackSnapshot } from '@/lib/sampleLibraryPlaybackHub';
import type { MediaSample } from '@membrana/media-library-service';

export interface SampleLibraryPlayerPanelProps {
  readonly playback: SamplePlaybackSnapshot;
  readonly selectedSample: MediaSample | MembraneCatalogSample | null;
  readonly onExport?: () => void;
}

export function SampleLibraryPlayerPanel({
  playback,
  selectedSample,
  onExport,
}: SampleLibraryPlayerPanelProps) {
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <SamplePlaybackBar
        playback={playback}
        showExport={Boolean(onExport)}
        onExport={onExport}
      />
      {selectedSample ? (
        <div className="grid grid-cols-1 gap-2 text-xs text-base-content/70 sm:grid-cols-2">
          <div className="min-w-0 truncate">
            <span className="text-base-content/50">class:</span> {selectedSample.class}
          </div>
          <div className="min-w-0 truncate">
            <span className="text-base-content/50">label:</span> {selectedSample.label}
          </div>
          {'source' in selectedSample ? (
            <div className="min-w-0 truncate">
              <span className="text-base-content/50">источник:</span> {selectedSample.source}
            </div>
          ) : (
            <div className="min-w-0 truncate">
              <span className="text-base-content/50">источник:</span> catalog
            </div>
          )}
          <div className="tabular-nums">
            <span className="text-base-content/50">размер:</span>{' '}
            {formatBytes(selectedSample.sizeBytes)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
