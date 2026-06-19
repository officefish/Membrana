import { logger } from '@membrana/core';
import type { ScenarioRuntimeHost } from '@membrana/device-board';

import { createScenarioMicJournalBridge } from './scenarioMicJournalBridge';

/** Host-порты scenario runtime: mic → chunk → trends FFT → LiveJournal (H2c). */
export function createScenarioRuntimeHost(): ScenarioRuntimeHost {
  const bridge = createScenarioMicJournalBridge();

  return {
    enumerateMicrophones: () => bridge.enumerateMicrophones(),
    selectMicrophone: () => bridge.selectMicrophone(),
    startStream: () => bridge.startStream(),
    stopStream: () => bridge.stopStream(),
    writeJournal: (event) => bridge.writeJournal(event),
    recordChunk: (options) => bridge.recordChunk(options),
    trendsFftDetect: () => bridge.trendsFftDetect(),
    evaluateSoundLevel: () => bridge.evaluateSoundLevel(),
    watchConnection: (handlers) => bridge.watchConnection(handlers),
    log: (message, context) => {
      logger.info(`[device-board] ${message}`, context);
    },
  };
}
