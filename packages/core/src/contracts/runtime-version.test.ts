import { describe, expect, it } from 'vitest';
import {
  RUNTIME_PROTOCOL_VERSION,
  evaluateRuntimeCompatibility,
} from './runtime-version.js';

describe('evaluateRuntimeCompatibility', () => {
  it('совместимо при равных версиях', () => {
    const r = evaluateRuntimeCompatibility(2, 2);
    expect(r.compatible).toBe(true);
    expect(r.updateAvailable).toBe(false);
    expect(r.serverOutdated).toBe(false);
    expect(r.known).toBe(true);
  });

  it('updateAvailable когда сервер новее клиента', () => {
    const r = evaluateRuntimeCompatibility(3, 2);
    expect(r.compatible).toBe(false);
    expect(r.updateAvailable).toBe(true);
    expect(r.serverOutdated).toBe(false);
  });

  it('serverOutdated когда клиент новее сервера', () => {
    const r = evaluateRuntimeCompatibility(1, 2);
    expect(r.compatible).toBe(false);
    expect(r.updateAvailable).toBe(false);
    expect(r.serverOutdated).toBe(true);
  });

  it('known=false при невалидной версии сервера', () => {
    for (const bad of [0, -1, NaN, 1.5]) {
      const r = evaluateRuntimeCompatibility(bad as number, 1);
      expect(r.known).toBe(false);
      expect(r.compatible).toBe(false);
      expect(r.updateAvailable).toBe(false);
      expect(r.serverOutdated).toBe(false);
    }
  });

  it('по умолчанию сверяет с RUNTIME_PROTOCOL_VERSION клиента', () => {
    const r = evaluateRuntimeCompatibility(RUNTIME_PROTOCOL_VERSION);
    expect(r.clientVersion).toBe(RUNTIME_PROTOCOL_VERSION);
    expect(r.compatible).toBe(true);
  });
});
