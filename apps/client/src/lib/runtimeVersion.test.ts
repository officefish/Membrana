import { describe, expect, it, vi } from 'vitest';
import {
  CLIENT_RUNTIME_PROTOCOL_VERSION,
  computeVersionIndicator,
  fetchServerRuntime,
  parseServerHealth,
} from './runtimeVersion';

describe('parseServerHealth', () => {
  it('разбирает валидный /health', () => {
    expect(parseServerHealth({ status: 'ok', version: '1.2.3', protocolVersion: 1 })).toEqual({
      version: '1.2.3',
      protocolVersion: 1,
    });
  });

  it('возвращает null при неверной форме', () => {
    expect(parseServerHealth(null)).toBeNull();
    expect(parseServerHealth({ version: '1.0.0' })).toBeNull();
    expect(parseServerHealth({ protocolVersion: 1 })).toBeNull();
    expect(parseServerHealth({ version: 1, protocolVersion: '1' })).toBeNull();
  });
});

describe('computeVersionIndicator', () => {
  const client = CLIENT_RUNTIME_PROTOCOL_VERSION;

  it('unknown когда сервер недоступен', () => {
    const ind = computeVersionIndicator('0.1.0', null, client);
    expect(ind.state).toBe('unknown');
    expect(ind.tone).toBe('neutral');
    expect(ind.label).toBe('v0.1.0');
  });

  it('ok при совпадении версий протокола', () => {
    const ind = computeVersionIndicator('0.1.0', { version: '1.0.0', protocolVersion: client }, client);
    expect(ind.state).toBe('ok');
    expect(ind.tone).toBe('success');
  });

  it('update-available когда сервер новее', () => {
    const ind = computeVersionIndicator('0.1.0', { version: '2.0.0', protocolVersion: client + 1 }, client);
    expect(ind.state).toBe('update-available');
    expect(ind.tone).toBe('warning');
    expect(ind.label).toBe('Доступно обновление');
  });

  it('server-outdated когда клиент новее', () => {
    const ind = computeVersionIndicator('0.1.0', { version: '0.9.0', protocolVersion: client }, client + 1);
    expect(ind.state).toBe('server-outdated');
    expect(ind.tone).toBe('error');
  });
});

describe('fetchServerRuntime', () => {
  it('возвращает данные при 200', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ status: 'ok', version: '1.0.0', protocolVersion: 1 }),
    })) as unknown as typeof fetch;
    const info = await fetchServerRuntime('https://cabinet.membrana.space/', fetchImpl);
    expect(info).toEqual({ version: '1.0.0', protocolVersion: 1 });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://cabinet.membrana.space/health',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('возвращает null при не-200', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    expect(await fetchServerRuntime('https://x', fetchImpl)).toBeNull();
  });

  it('возвращает null при сетевой ошибке', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network');
    }) as unknown as typeof fetch;
    expect(await fetchServerRuntime('https://x', fetchImpl)).toBeNull();
  });
});
