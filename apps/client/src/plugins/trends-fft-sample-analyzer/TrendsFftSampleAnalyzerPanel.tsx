import React from 'react';

import { TrendsFftLabView } from '../trends-fft-analyzer/TrendsFftLabView';

export interface TrendsFftSampleAnalyzerPanelProps {
  readonly moduleId: string;
}

export const TrendsFftSampleAnalyzerPanel: React.FC<TrendsFftSampleAnalyzerPanelProps> = ({
  moduleId,
}) => (
  <div className="card card-bordered bg-base-100 shadow-sm">
    <div className="card-body gap-3 p-4">
      <TrendsFftLabView moduleId={moduleId} variant="sample-library" layout="panel" />
    </div>
  </div>
);
