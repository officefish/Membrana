/**
 * Зубы возобновления сценария при старте Студии (ADR-0033 PR-2a). Красные на стволе 041d423a: модуля нет.
 * Порчи: не снимать отметку на остановке → сознательно остановленный сценарий возобновится (красный);
 * запускать при жёстком захвате → красный; включать при признаке null/«неизвестен» → красный;
 * без сети не брать последнее известное значение признака → дежурство не возобновится (красный);
 * при неизвестном захвате НЕ запускать → дежурство встанет после рестарта под захватом (красный).
 *
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runAutoResumeOnStart, type AutoResumeDeps } from './autoResumeOnStart';
import { decideAutoResume } from './decide';
import { clearRunMark, createRunMarkTracker, readLastKnownFlag, readRunMark, setRunMark } from './runMark';

// Хранилище в памяти (образец `runtimeModePersistence.test.ts`): localStorage jsdom в этой среде неполный.
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k: string) => data.get(k) ?? null,
    key: (i: number) => [...data.keys()][i] ?? null,
    removeItem: (k: string) => void data.delete(k),
    setItem: (k: string, v: string) => void data.set(k, String(v)),
  };
}

beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));
afterEach(() => vi.unstubAllGlobals());

describe('decideAutoResume — таблица решений', () => {
  const base = { enabled: true, paired: true, wasRunning: true, capture: 'none' } as const;
  it('шёл + включено + сопряжён + без захвата → запуск', () => {
    expect(decideAutoResume(base)).toEqual({ action: 'run' });
  });
  it('не шёл / выключено / признак неизвестен → молчаливый пропуск', () => {
    expect(decideAutoResume({ ...base, wasRunning: false })).toEqual({ action: 'skip', reason: 'not_running', silent: true });
    expect(decideAutoResume({ ...base, enabled: false })).toEqual({ action: 'skip', reason: 'disabled', silent: true });
    expect(decideAutoResume({ ...base, enabled: null })).toEqual({ action: 'skip', reason: 'disabled', silent: true });
  });
  it('не сопряжён / жёсткий захват → пропуск с честной строкой', () => {
    expect(decideAutoResume({ ...base, paired: false })).toMatchObject({ reason: 'not_paired', silent: false });
    expect(decideAutoResume({ ...base, capture: 'hard' })).toMatchObject({ reason: 'hard_capture', silent: false });
  });
  it('мягкий захват и НЕИЗВЕСТНЫЙ захват (после рестарта узел снимка не получает) → запуск', () => {
    expect(decideAutoResume({ ...base, capture: 'soft' })).toEqual({ action: 'run' });
    expect(decideAutoResume({ ...base, capture: 'unknown' })).toEqual({ action: 'run' });
  });
});

describe('отметка «шёл»', () => {
  it('ставится на переходе в «идёт», снимается на любом переходе в «стоит»; пустой старт не снимает', () => {
    setRunMark('d-1', 'прошлый запуск');
    const track = createRunMarkTracker(() => 'd-1', () => 't');
    track({ isRunning: false });
    expect(readRunMark('d-1')).toBe(true);
    track({ isRunning: true });
    expect(readRunMark('d-1')).toBe(true);
    track({ isRunning: false });
    expect(readRunMark('d-1')).toBe(false);
  });
  it('без отметки — «не шёл»; отметка по прибору, чужой прибор не задевает', () => {
    setRunMark('d-1', 't');
    expect(readRunMark('d-2')).toBe(false);
    clearRunMark('d-1');
    expect(readRunMark('d-1')).toBe(false);
  });
});

function deps(over: Partial<AutoResumeDeps> = {}): AutoResumeDeps {
  return {
    deviceId: 'd-1',
    paired: true,
    readRunMark: () => true,
    fetchFlag: async () => true,
    readLastKnownFlag,
    writeLastKnownFlag: (id, v) => localStorage.setItem(`membrana.scenarioAutoResume.lastKnownFlag.${id}`, String(v)),
    waitConnected: async () => true,
    captureAtStart: () => 'none',
    start: vi.fn(async () => true),
    ...over,
  };
}

describe('runAutoResumeOnStart', () => {
  it('шёл и включено → запуск через start(), исход «started»', async () => {
    const d = deps();
    expect(await runAutoResumeOnStart(d)).toEqual({ kind: 'started' });
    expect(d.start).toHaveBeenCalledTimes(1);
  });
  it('владелец остановил до выключения (отметки нет) → start() не вызывается', async () => {
    const d = deps({ readRunMark: () => false });
    expect(await runAutoResumeOnStart(d)).toMatchObject({ kind: 'skipped', silent: true });
    expect(d.start).not.toHaveBeenCalled();
  });
  it('жёсткий захват известен → не запускаем, строка честная', async () => {
    const d = deps({ captureAtStart: () => 'hard' });
    expect(await runAutoResumeOnStart(d)).toMatchObject({ kind: 'skipped', silent: false });
    expect(d.start).not.toHaveBeenCalled();
  });
  it('без сети: признак — последнее известное значение; без сети и без кабинета захват неизвестен → запуск', async () => {
    await runAutoResumeOnStart(deps());
    expect(readLastKnownFlag('d-1')).toBe(true);
    const offline = deps({ fetchFlag: async () => null, waitConnected: async () => false, captureAtStart: () => 'unknown' });
    expect(await runAutoResumeOnStart(offline)).toEqual({ kind: 'started' });
    localStorage.clear();
    const never = deps({ fetchFlag: async () => null });
    expect(await runAutoResumeOnStart(never)).toMatchObject({ kind: 'skipped', silent: true });
    expect(never.start).not.toHaveBeenCalled();
  });
  it('запуск не подтвердился → исход «failed» с причиной', async () => {
    expect(await runAutoResumeOnStart(deps({ start: async () => false }))).toMatchObject({ kind: 'failed' });
    expect(await runAutoResumeOnStart(deps({ start: async () => { throw new Error('x'); } }))).toMatchObject({ kind: 'failed' });
  });
});
