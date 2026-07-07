import { useSyncExternalStore } from 'react';

import { neuralDroneAnalyzerState } from './neuralDroneAnalyzerState';
import type { NeuralDroneSnapshot } from './types';

export function useNeuralDroneAnalyzer(): NeuralDroneSnapshot {
  return useSyncExternalStore(
    neuralDroneAnalyzerState.subscribe,
    neuralDroneAnalyzerState.getSnapshot,
  );
}
