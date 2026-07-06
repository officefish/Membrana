import { afterEach, describe, expect, it } from 'vitest';

import {
  getNeuralDroneController,
  neuralDroneAnalyzerState,
  registerNeuralDroneController,
} from './neuralDroneAnalyzerState';
import { resolveNeuralDroneAnalyzerConfig, defaultNeuralDroneAnalyzerConfig } from './types';

afterEach(() => {
  neuralDroneAnalyzerState.reset();
  registerNeuralDroneController(null);
});

describe('neuralDroneAnalyzerState', () => {
  it('идёт по фазам: model-loading → idle → analyzing → ready', () => {
    neuralDroneAnalyzerState.beginModelLoading();
    expect(neuralDroneAnalyzerState.getSnapshot().status).toBe('model-loading');

    neuralDroneAnalyzerState.finishModelLoading();
    expect(neuralDroneAnalyzerState.getSnapshot().status).toBe('idle');
    expect(neuralDroneAnalyzerState.getSnapshot().modelReady).toBe(true);

    neuralDroneAnalyzerState.beginAnalysis('s1', 'Дрон 1');
    expect(neuralDroneAnalyzerState.getSnapshot().status).toBe('analyzing');
    expect(neuralDroneAnalyzerState.getSnapshot().analyzedSampleTitle).toBe('Дрон 1');

    neuralDroneAnalyzerState.finishAnalysis({
      isDrone: true,
      confidence: 0.7,
      latencyMs: 42,
    });
    const snap = neuralDroneAnalyzerState.getSnapshot();
    expect(snap.status).toBe('ready');
    expect(snap.lastResult?.isDrone).toBe(true);
  });

  it('ошибка анализа сохраняет сообщение', () => {
    neuralDroneAnalyzerState.beginAnalysis('s1', null);
    neuralDroneAnalyzerState.failAnalysis('декодирование упало');
    const snap = neuralDroneAnalyzerState.getSnapshot();
    expect(snap.status).toBe('error');
    expect(snap.errorMessage).toBe('декодирование упало');
  });

  it('провал прогрева — отдельный статус model-error, не error', () => {
    neuralDroneAnalyzerState.beginModelLoading();
    neuralDroneAnalyzerState.failModelLoading('нет сети до бандла');
    const snap = neuralDroneAnalyzerState.getSnapshot();
    expect(snap.status).toBe('model-error');
    expect(snap.modelReady).toBe(false);
    expect(snap.errorMessage).toBe('нет сети до бандла');
  });

  it('уведомляет подписчиков и отдаёт стабильный snapshot между изменениями', () => {
    let notified = 0;
    const unsub = neuralDroneAnalyzerState.subscribe(() => {
      notified += 1;
    });
    const before = neuralDroneAnalyzerState.getSnapshot();
    expect(neuralDroneAnalyzerState.getSnapshot()).toBe(before);
    neuralDroneAnalyzerState.beginModelLoading();
    expect(notified).toBe(1);
    expect(neuralDroneAnalyzerState.getSnapshot()).not.toBe(before);
    unsub();
  });

  it('контроллер регистрируется и снимается', () => {
    const controller = { analyzeSelectedSample: () => undefined };
    registerNeuralDroneController(controller);
    expect(getNeuralDroneController()).toBe(controller);
    registerNeuralDroneController(null);
    expect(getNeuralDroneController()).toBeNull();
  });
});

describe('resolveNeuralDroneAnalyzerConfig', () => {
  it('дефолты при пустом входе', () => {
    expect(resolveNeuralDroneAnalyzerConfig(undefined)).toEqual(defaultNeuralDroneAnalyzerConfig);
  });

  it('порог клампится в [0,1], мусор → дефолт', () => {
    expect(resolveNeuralDroneAnalyzerConfig({ droneScoreThreshold: 5 }).droneScoreThreshold).toBe(1);
    expect(resolveNeuralDroneAnalyzerConfig({ droneScoreThreshold: -1 }).droneScoreThreshold).toBe(0);
    expect(
      resolveNeuralDroneAnalyzerConfig({ droneScoreThreshold: Number.NaN }).droneScoreThreshold,
    ).toBe(defaultNeuralDroneAnalyzerConfig.droneScoreThreshold);
  });

  it('autoAnalyzeOnEnd только boolean', () => {
    expect(
      resolveNeuralDroneAnalyzerConfig({ autoAnalyzeOnEnd: false }).autoAnalyzeOnEnd,
    ).toBe(false);
    expect(
      resolveNeuralDroneAnalyzerConfig({ autoAnalyzeOnEnd: 'yes' as never }).autoAnalyzeOnEnd,
    ).toBe(defaultNeuralDroneAnalyzerConfig.autoAnalyzeOnEnd);
  });
});
