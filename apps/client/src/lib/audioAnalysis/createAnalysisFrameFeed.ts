import { createBufferFrameFeed } from './bufferFrameFeed';
import { createGraphFrameFeed } from './graphFrameFeed';
import { createMicFrameFeed } from './micFrameFeed';
import { createSampleLibraryFrameFeed } from './sampleLibraryFrameFeed';
import type { AnalysisFrameFeedOptions, AudioFrameFeed } from './types';

export function createAnalysisFrameFeed(options: AnalysisFrameFeedOptions): AudioFrameFeed {
  const { analysisSource, moduleId, bufferSize, smoothingTimeConstant, onStart, onStop, onError } =
    options;

  if (analysisSource === 'graph') {
    return createGraphFrameFeed(options.graphHandleId ?? 'default');
  }

  if (analysisSource === 'sample-library') {
    return createSampleLibraryFrameFeed({
      bufferSize,
      smoothingTimeConstant,
      hopSize: options.hopSize,
      emitIntervalMs: options.emitIntervalMs,
      timestampStepMs: options.timestampStepMs,
      onStart,
      onStop,
      onError,
    });
  }

  return createMicFrameFeed({
    moduleId,
    bufferSize,
    smoothingTimeConstant,
    onStart,
    onStop,
    onError,
  });
}

export { createBufferFrameFeed, createGraphFrameFeed, createMicFrameFeed, createSampleLibraryFrameFeed };
