/**
 * Зубы владельца эпизода (#2463). Предмет — `deviceOverflowHold.ts` (подпись, сверка, разбор
 * подписи из хранилища) и `ownerBridge.ts` (привязка → владелец).
 *
 * Случай владельца 25.09: прибор перевязан на кабинет `september` (буфер пуст, лимит 512 МБ),
 * а клиент показал удержание со числами старой мембраны `admin` — 1009.9 МБ из 1.00 ГБ, время
 * факта 08.09. Эпизод лежал в одной глобальной ячейке `localStorage` без владельца и пережил
 * смену привязки.
 *
 * Порчи → красный:
 *  - эпизод чужой мембраны показан (`getEpisode()` не `null`) или держит запись (`isHeld()`) —
 *    красный;
 *  - неподписанный эпизод из хранилища (ровно случай 25.09) признан своим — красный;
 *  - СВОЙ эпизод снят сверкой, освобождением места или неизвестностью владельца — красный
 *    (норма 25.09: удержание снимает только человек или очистка);
 *  - подпись «любой владелец подходит» (битая подпись читается как совпадение) — красный.
 */
import { BUFFER_OVERFLOW_REASONS } from '@membrana/plugin-contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';
import { useNodeConnectionStore } from '@/stores/nodeConnectionStore';

import {
  DeviceOverflowHoldImpl,
  OVERFLOW_HOLD_STORE_KEY,
  createLocalStorageOverflowHoldStore,
  createMemoryOverflowHoldStore,
  sameOverflowHoldOwner,
} from './deviceOverflowHold';
import { applyLocalGuardFromQuota } from './localGuard';
import { resolveOverflowHoldOwner, startOverflowHoldOwnerBridge } from './ownerBridge';
import type {
  HoldChange,
  OverflowHoldEpisode,
  OverflowHoldOwner,
  OverflowRefusalSnapshot,
} from './types';

const MB = 1048576;

/** Старая мембрана владельца: тариф «Наблюдательный пункт», буфер 1 ГБ, факт 08.09. */
const ADMIN: OverflowHoldOwner = { kind: 'membrane', membraneId: 'm-admin', deviceId: 'dev-admin' };
/** Новая мембрана: кабинет `september`, буфер 512 МБ, пуст. */
const SEPTEMBER: OverflowHoldOwner = { kind: 'membrane', membraneId: 'm-september', deviceId: 'dev-september' };

const ADMIN_EPISODE: OverflowHoldEpisode = {
  overflowId: null,
  overflowAt: '2026-09-08T07:39:02.000Z',
  reason: BUFFER_OVERFLOW_REASONS.DEVICE_BUFFER_FULL,
  policy: 'stop',
  source: 'local',
  buffer: { usedBytes: 1009.9 * MB, limitBytes: 1024 * MB },
  userStorage: null,
  enteredAtMs: Date.UTC(2026, 8, 8, 7, 39, 2),
  owner: ADMIN,
};

const REFUSAL: OverflowRefusalSnapshot = {
  reason: BUFFER_OVERFLOW_REASONS.DEVICE_BUFFER_FULL,
  overflowId: 'ovf-1',
  overflowAt: '2026-09-26T09:00:00.000Z',
  overflowPolicy: 'stop',
  buffer: { usedBytes: 512 * MB, limitBytes: 512 * MB },
  userStorage: null,
};

function restore(
  episode: OverflowHoldEpisode,
  owner: OverflowHoldOwner | null,
): { hold: DeviceOverflowHoldImpl; changes: HoldChange[]; store: ReturnType<typeof createMemoryOverflowHoldStore> } {
  const store = createMemoryOverflowHoldStore(episode);
  const hold = new DeviceOverflowHoldImpl({ store, now: () => 1_000, owner });
  const changes: HoldChange[] = [];
  hold.subscribe((_ep, change) => changes.push(change));
  return { hold, changes, store };
}

describe('эпизод чужой мембраны не показывается (#2463)', () => {
  it('поднятый эпизод мембраны admin при привязке к september отброшен: ни чисел, ни удержания', () => {
    const store = createMemoryOverflowHoldStore(ADMIN_EPISODE);
    const hold = new DeviceOverflowHoldImpl({ store, now: () => 1_000, owner: SEPTEMBER });

    expect(hold.getEpisode()).toBeNull();
    expect(hold.isHeld()).toBe(false);
    // Чужая запись убрана и из хранилища: перезапуск не вернёт её снова.
    expect(store.load()).toBeNull();
    // И числа старой мембраны нигде не всплывают — состояние узла пусто.
    expect(hold.toRuntimePayload()).toBeNull();
  });

  it('перевязка при живом эпизоде: смена владельца отбрасывает его и говорит об этом подписчикам', () => {
    const { hold, changes, store } = restore(ADMIN_EPISODE, ADMIN);
    expect(hold.isHeld()).toBe(true);

    expect(hold.reconcileOwner(SEPTEMBER)).toBe('discarded');

    expect(hold.getEpisode()).toBeNull();
    expect(hold.isHeld()).toBe(false);
    expect(store.load()).toBeNull();
    // `discarded`, а не `released`: удержание не снято человеком — эпизод оказался не наш.
    expect(changes).toEqual(['discarded']);
  });

  it('тот же прибор, но другая мембрана — чужой; та же мембрана, но другой прибор — тоже чужой', () => {
    const sameDevice: OverflowHoldOwner = { kind: 'membrane', membraneId: 'm-other', deviceId: 'dev-admin' };
    const sameMembrane: OverflowHoldOwner = { kind: 'membrane', membraneId: 'm-admin', deviceId: 'dev-other' };

    expect(restore(ADMIN_EPISODE, sameDevice).hold.getEpisode()).toBeNull();
    expect(restore(ADMIN_EPISODE, sameMembrane).hold.getEpisode()).toBeNull();
    expect(sameOverflowHoldOwner(ADMIN, sameDevice)).toBe(false);
    expect(sameOverflowHoldOwner(ADMIN, sameMembrane)).toBe(false);
  });

  it('автономный прибор и мембрана — разные владельцы; автономный с автономным — один', () => {
    const autonomous: OverflowHoldOwner = { kind: 'autonomous' };
    expect(sameOverflowHoldOwner(autonomous, ADMIN)).toBe(false);
    expect(sameOverflowHoldOwner(autonomous, autonomous)).toBe(true);
    expect(restore(ADMIN_EPISODE, autonomous).hold.getEpisode()).toBeNull();
    expect(restore({ ...ADMIN_EPISODE, owner: autonomous }, autonomous).hold.isHeld()).toBe(true);
  });

  it('эпизод БЕЗ подписи из хранилища (ровно 25.09) не признаётся своим ни при каком владельце', () => {
    const legacy: OverflowHoldEpisode = { ...ADMIN_EPISODE, owner: null };
    const { hold, changes } = restore(legacy, SEPTEMBER);
    expect(hold.getEpisode()).toBeNull();
    expect(hold.isHeld()).toBe(false);
    // Сверка прошла в конструкторе — до того, как кто-либо мог увидеть чужие числа.
    expect(changes).toEqual([]);
  });
});

describe('своё удержание сверка не снимает (норма 25.09 под зубом)', () => {
  it('тот же владелец — эпизод живёт, сколько бы раз ни сверяли', () => {
    const { hold, changes } = restore(ADMIN_EPISODE, ADMIN);
    for (let i = 0; i < 10; i += 1) expect(hold.reconcileOwner(ADMIN)).toBe('kept');
    expect(hold.isHeld()).toBe(true);
    expect(hold.getEpisode()?.overflowAt).toBe(ADMIN_EPISODE.overflowAt);
    expect(changes).toEqual([]);
  });

  it('владелец НЕИЗВЕСТЕН (привязка не поднята) — не судим: удержание остаётся', () => {
    const { hold, changes } = restore(ADMIN_EPISODE, null);
    expect(hold.isHeld()).toBe(true);
    expect(hold.reconcileOwner(null)).toBe('deferred');
    expect(hold.isHeld()).toBe(true);
    expect(changes).toEqual([]);
  });

  it('эпизод, открытый до чтения привязки, ПОДПИСЫВАЕТСЯ, а не отбрасывается', () => {
    const store = createMemoryOverflowHoldStore();
    const hold = new DeviceOverflowHoldImpl({ store, now: () => 2_000 });
    expect(applyLocalGuardFromQuota(hold, { usedBytes: 500 * MB, limitBytes: 512 * MB }, 'stop')).toBe('entered');
    expect(hold.getEpisode()?.owner).toBeNull();

    expect(hold.reconcileOwner(SEPTEMBER)).toBe('adopted');

    expect(hold.isHeld()).toBe(true);
    expect(hold.getEpisode()?.owner).toEqual(SEPTEMBER);
    expect(store.load()?.owner).toEqual(SEPTEMBER);
    // Подписанный эпизод переживает перезапуск у того же владельца.
    expect(new DeviceOverflowHoldImpl({ store, owner: SEPTEMBER }).isHeld()).toBe(true);
  });

  it('свой эпизод с overflowId: null ждёт человека, а не срока: сверка его не гасит (решение по п.2 #2463)', () => {
    const { hold } = restore({ ...ADMIN_EPISODE, overflowId: null }, ADMIN);
    // Тысяча сверок = тысяча тиков жизни после стопа; срока у своего эпизода нет.
    for (let i = 0; i < 1000; i += 1) hold.reconcileOwner(ADMIN);
    // И освобождение места его не снимает — соседняя норма цела.
    applyLocalGuardFromQuota(hold, { usedBytes: 0, limitBytes: 1024 * MB }, 'stop');
    expect(hold.isHeld()).toBe(true);
    expect(hold.getEpisode()?.overflowId).toBeNull();

    // Единственный выход — человек (или очистка), и он же даёт `released`, не `discarded`.
    const changes: HoldChange[] = [];
    hold.subscribe((_ep, change) => changes.push(change));
    hold.release('human');
    expect(changes).toEqual(['released']);
  });
});

describe('подпись новых эпизодов', () => {
  it('серверный и локальный эпизод подписываются текущим владельцем', () => {
    const hold = new DeviceOverflowHoldImpl({
      store: createMemoryOverflowHoldStore(),
      now: () => 3_000,
      owner: SEPTEMBER,
    });
    expect(hold.activateFromServer(REFUSAL)).toBe('entered');
    expect(hold.getEpisode()?.owner).toEqual(SEPTEMBER);

    hold.release('human');
    applyLocalGuardFromQuota(hold, { usedBytes: 512 * MB, limitBytes: 512 * MB }, 'stop');
    expect(hold.getEpisode()?.owner).toEqual(SEPTEMBER);
  });

  it('повышение локального эпизода до серверного id подпись не теряет', () => {
    const hold = new DeviceOverflowHoldImpl({
      store: createMemoryOverflowHoldStore(),
      now: () => 3_000,
      owner: SEPTEMBER,
    });
    applyLocalGuardFromQuota(hold, { usedBytes: 512 * MB, limitBytes: 512 * MB }, 'stop');
    expect(hold.activateFromServer(REFUSAL)).toBe('promoted');
    expect(hold.getEpisode()?.owner).toEqual(SEPTEMBER);
  });
});

describe('подпись в хранилище прибора (localStorage)', () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => memory.get(k) ?? null,
        setItem: (k: string, v: string) => void memory.set(k, v),
        removeItem: (k: string) => void memory.delete(k),
      },
    });
  });

  it('подпись уезжает в ячейку и читается обратно', () => {
    const store = createLocalStorageOverflowHoldStore();
    store.save({ ...ADMIN_EPISODE, owner: SEPTEMBER });
    expect(JSON.parse(memory.get(OVERFLOW_HOLD_STORE_KEY) ?? '{}').owner).toEqual(SEPTEMBER);
    expect(store.load()?.owner).toEqual(SEPTEMBER);
  });

  it('битая подпись = ОТСУТСТВИЕ подписи, а не «подходит любому»', () => {
    const store = createLocalStorageOverflowHoldStore();
    for (const broken of [{ kind: 'membrane' }, { kind: 'membrane', membraneId: '', deviceId: 'd' }, 'm-admin', 42, {}]) {
      memory.set(OVERFLOW_HOLD_STORE_KEY, JSON.stringify({ ...ADMIN_EPISODE, owner: broken }));
      expect(store.load()?.owner, JSON.stringify(broken)).toBeNull();
      // А неподписанный из хранилища своим не признаётся — эпизод не покажется.
      expect(new DeviceOverflowHoldImpl({ store, owner: SEPTEMBER }).getEpisode()).toBeNull();
    }
  });
});

describe('мост привязки → владелец', () => {
  const pairing: PairedNodeCredentials = {
    token: 'tok',
    expiresAt: '2026-12-31T00:00:00.000Z',
    deviceId: 'dev-september',
    mediaToken: 'mtok',
    mediaApiUrl: 'http://localhost:3010',
    membraneId: 'm-september',
    nodeId: 'n1',
    nodeLabel: 'node',
  };

  it('до подъёма привязки владелец НЕизвестен, а не автономен', () => {
    expect(resolveOverflowHoldOwner(false, 'paired', pairing)).toBeNull();
    expect(resolveOverflowHoldOwner(false, 'autonomous', null)).toBeNull();
  });

  it('привязка → мембрана с прибором; автономный режим → автономный владелец; режим не выбран → неизвестно', () => {
    expect(resolveOverflowHoldOwner(true, 'paired', pairing)).toEqual(SEPTEMBER);
    expect(resolveOverflowHoldOwner(true, 'autonomous', null)).toEqual({ kind: 'autonomous' });
    expect(resolveOverflowHoldOwner(true, null, null)).toBeNull();
    // Креды без мембраны подписывать нечем — «неизвестно», а не пустая подпись.
    expect(resolveOverflowHoldOwner(true, 'paired', { ...pairing, membraneId: '' })).toBeNull();
  });

  it('мост отбрасывает чужой эпизод, как только привязка поднялась', () => {
    useNodeConnectionStore.setState({ hydrated: false, mode: null, pairing: null });
    const { hold, changes } = restore(ADMIN_EPISODE, null);
    const off = startOverflowHoldOwnerBridge(hold);
    // Привязка ещё не поднята — своё удержание цело.
    expect(hold.isHeld()).toBe(true);

    useNodeConnectionStore.setState({ hydrated: true, mode: 'paired', pairing });

    expect(hold.getEpisode()).toBeNull();
    expect(changes).toEqual(['discarded']);
    off();
    useNodeConnectionStore.setState({ hydrated: false, mode: null, pairing: null });
  });

  it('мост идемпотентен на носитель: второй вызов сверяет, но второй подписки не плодит', () => {
    useNodeConnectionStore.setState({ hydrated: false, mode: null, pairing: null });
    const { hold, changes } = restore(ADMIN_EPISODE, null);
    const off1 = startOverflowHoldOwnerBridge(hold);
    const off2 = startOverflowHoldOwnerBridge(hold);
    expect(off2).toBe(off1);

    useNodeConnectionStore.setState({ hydrated: true, mode: 'paired', pairing });

    // Один `discarded`, а не два: подписка одна.
    expect(changes).toEqual(['discarded']);
    off1();
    useNodeConnectionStore.setState({ hydrated: false, mode: null, pairing: null });
  });

  it('мост живёт на синглтоне носителя, а не только в проводке: бейдж доски строится раньше плагина', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('./deviceOverflowHold.ts', import.meta.url), 'utf8');
    const factory = src.slice(src.indexOf('export function getDeviceOverflowHold'), src.length);
    expect(factory).toContain('startOverflowHoldOwnerBridge(singleton)');
  });
});
