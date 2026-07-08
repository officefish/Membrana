import { describe, expect, it } from 'vitest';

import { createMicProximityAlarmPlugin } from './micProximityAlarmPlugin';
import {
  MIC_PROXIMITY_ALARM_PLUGIN_ID,
  defaultMicProximityAlarmConfig,
  resolveMicProximityAlarmConfig,
} from './types';

describe('resolveMicProximityAlarmConfig', () => {
  it('пустой/битый вход → дефолты', () => {
    expect(resolveMicProximityAlarmConfig(undefined)).toEqual(defaultMicProximityAlarmConfig);
    expect(resolveMicProximityAlarmConfig('nope')).toEqual(defaultMicProximityAlarmConfig);
  });

  it('валидные поля пробрасываются, вне диапазона — клампятся', () => {
    const cfg = resolveMicProximityAlarmConfig({
      scoreThreshold: 0.7,
      windowSize: 8,
      approachRatio: 0.2,
      recedeRatio: 0.25,
    });
    expect(cfg).toEqual({
      scoreThreshold: 0.7,
      windowSize: 8,
      approachRatio: 0.2,
      recedeRatio: 0.25,
    });

    const clamped = resolveMicProximityAlarmConfig({
      scoreThreshold: 5,
      windowSize: 1000,
      approachRatio: -1,
      recedeRatio: 9,
    });
    expect(clamped.scoreThreshold).toBe(1);
    expect(clamped.windowSize).toBe(64);
    expect(clamped.approachRatio).toBe(0.01);
    expect(clamped.recedeRatio).toBe(1);
  });

  it('пропущенный recedeRatio → дефолт (симметрия с approach)', () => {
    const cfg = resolveMicProximityAlarmConfig({ approachRatio: 0.3 });
    expect(cfg.approachRatio).toBe(0.3);
    expect(cfg.recedeRatio).toBe(defaultMicProximityAlarmConfig.recedeRatio);
  });
});

describe('createMicProximityAlarmPlugin', () => {
  it('фабрика отдаёт плагин с корректным id, неактивный по умолчанию', () => {
    const plugin = createMicProximityAlarmPlugin();
    expect(plugin.id).toBe(MIC_PROXIMITY_ALARM_PLUGIN_ID);
    expect(plugin.active).toBe(false);
    expect(plugin.config).toEqual(defaultMicProximityAlarmConfig);
    expect(typeof plugin.install).toBe('function');
  });
});
