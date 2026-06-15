import type { MembraneCatalogSample } from '@/api/sampleLibrary';
import { SampleLibraryPlayerPanel } from '@/components/sample-library/SampleLibraryPlayerPanel';
import type { SamplePlaybackSnapshot } from '@membrana/sample-playback-service';
import type { MediaSample } from '@membrana/media-library-service';

export interface CabinetSamplePlayerSectionProps {
  readonly playback: SamplePlaybackSnapshot;
  readonly selectedSample: MediaSample | MembraneCatalogSample | null;
  readonly onExport?: () => void;
}

/** Плеер коллекции cabinet: сразу под шапкой, одна колонка (без compact-bar над таблицей). */
export function CabinetSamplePlayerSection({
  playback,
  selectedSample,
  onExport,
}: CabinetSamplePlayerSectionProps) {
  return (
    <div
      className="card border border-base-300 bg-base-200/30 shadow-sm"
      role="region"
      aria-label="Плеер сэмпла"
    >
      <div className="card-body gap-3 p-4">
        <h3 className="card-title text-sm font-semibold">Плеер сэмпла</h3>
        <SampleLibraryPlayerPanel
          playback={playback}
          selectedSample={selectedSample}
          onExport={onExport}
        />
      </div>
    </div>
  );
}
