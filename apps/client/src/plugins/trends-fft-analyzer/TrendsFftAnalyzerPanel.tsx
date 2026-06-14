import React, { useState } from 'react';

import { TrendsFftFullscreen } from './TrendsFftFullscreen';
import { TrendsFftLabView } from './TrendsFftLabView';

export interface TrendsFftAnalyzerPanelProps {
  readonly moduleId: string;
}

export const TrendsFftAnalyzerPanel: React.FC<TrendsFftAnalyzerPanelProps> = ({
  moduleId,
}) => {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  return (
    <>
      <div className="card card-bordered bg-base-100 shadow-sm">
        <div className="card-body gap-3 p-4">
          <TrendsFftLabView
            moduleId={moduleId}
            layout="panel"
            footer={
              <button
                type="button"
                className="btn btn-outline btn-sm w-full min-h-10 mt-1"
                onClick={() => setFullscreenOpen(true)}
              >
                На весь экран
              </button>
            }
          />
        </div>
      </div>
      {fullscreenOpen ? (
        <TrendsFftFullscreen
          moduleId={moduleId}
          onClose={() => setFullscreenOpen(false)}
        />
      ) : null}
    </>
  );
};
