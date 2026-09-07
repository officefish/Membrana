/**
 * Зубы реестра эпизодов (носитель `overflowId`/`overflowAt`, M2 #2307). Предмет —
 * `overflow-episode-registry.ts`.
 *
 * Порчи → красный: `open` чеканит новый id при открытом эпизоде; `release` не удаляет; часы не
 * инжектированы (`overflowAt` плывёт между вызовами); ключ без субъекта (буфер и хранилище
 * делят эпизод).
 */
import { describe, expect, it } from 'vitest';

import { OverflowEpisodeRegistry } from './overflow-episode-registry';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function tickingClock(startMs: number, stepMs = 1_000) {
  let calls = 0;
  return () => new Date(startMs + calls++ * stepMs);
}

describe('OverflowEpisodeRegistry', () => {
  it('open — идемпотентно: 100 вызовов при открытом эпизоде = один id и одно время', () => {
    const registry = new OverflowEpisodeRegistry(tickingClock(1_000_000));
    const first = registry.open('dev-1', 'buffer');
    const ids = new Set<string>();
    const ats = new Set<number>();
    for (let i = 0; i < 100; i += 1) {
      const view = registry.open('dev-1', 'buffer');
      ids.add(view.overflowId);
      ats.add(view.overflowAt.getTime());
    }
    expect(ids.size).toBe(1);
    expect(ats.size).toBe(1);
    expect([...ids][0]).toBe(first.overflowId);
    // Часы тикали на каждом вызове (100 отказов за 100 с), время эпизода — первого отказа.
    expect([...ats][0]).toBe(1_000_000);
  });

  it('overflowId — uuid, непрозрачный; view заморожен', () => {
    const registry = new OverflowEpisodeRegistry(() => new Date(0));
    const view = registry.open('dev-1', 'userStorage');
    expect(view.overflowId).toMatch(UUID_RE);
    expect(Object.isFrozen(view)).toBe(true);
  });

  it('release закрывает эпизод: следующий open — новый id и новое время', () => {
    const registry = new OverflowEpisodeRegistry(tickingClock(5_000));
    const a = registry.open('dev-1', 'buffer');
    registry.release('dev-1', 'buffer');
    expect(registry.peek('dev-1', 'buffer')).toBeNull();
    const b = registry.open('dev-1', 'buffer');
    expect(b.overflowId).not.toBe(a.overflowId);
    expect(b.overflowAt.getTime()).toBeGreaterThan(a.overflowAt.getTime());
  });

  it('release при закрытом эпизоде — no-op, не бросает', () => {
    const registry = new OverflowEpisodeRegistry(() => new Date(0));
    expect(() => registry.release('dev-1', 'buffer')).not.toThrow();
    expect(registry.peek('dev-1', 'buffer')).toBeNull();
  });

  it('ключ — прибор × субъект: буфер и хранилище одного прибора, один субъект двух приборов — разные эпизоды', () => {
    const registry = new OverflowEpisodeRegistry(() => new Date(0));
    const buffer = registry.open('dev-1', 'buffer');
    const storage = registry.open('dev-1', 'userStorage');
    const other = registry.open('dev-2', 'buffer');
    expect(new Set([buffer.overflowId, storage.overflowId, other.overflowId]).size).toBe(3);

    registry.release('dev-1', 'buffer');
    expect(registry.peek('dev-1', 'buffer')).toBeNull();
    expect(registry.peek('dev-1', 'userStorage')?.overflowId).toBe(storage.overflowId);
    expect(registry.peek('dev-2', 'buffer')?.overflowId).toBe(other.overflowId);
  });

  it('без инжектированных часов берёт текущее время', () => {
    const before = Date.now();
    const registry = new OverflowEpisodeRegistry();
    const view = registry.open('dev-1', 'buffer');
    expect(view.overflowAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(view.overflowAt.getTime()).toBeLessThanOrEqual(Date.now());
  });
});
