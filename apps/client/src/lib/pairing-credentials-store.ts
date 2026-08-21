/**
 * Порт хранения кредов парринга (b2 спринта studio-firebat-user-pairing; форма — Веснин,
 * словарь — Ожегов). Одно имя на весь тракт: «pairing credentials store»; синонимы
 * (secure storage, vault, keychain) в клиенте не употребляются.
 *
 * Зачем порт: креды (включая mediaToken — сегодня это СЛУЖЕБНЫЙ токен media, долг
 * ADR-0028) писались в localStorage напрямую из nodeConnectionStore — в Electron это
 * плоский файл на диске узла. Порт разводит «что хранится» и «где лежит»: web-адаптер
 * сохраняет сегодняшнее поведение, Electron-адаптер шифрует через safeStorage узла.
 *
 * ADR-0028 Р4 ВКЛЮЧЁН 21.08 (спринт deploy-safestorage-2026-08-21, блок secure-store-cache).
 * Контракт порта НЕ размыт асинхронностью моста: три глагола остаются синхронными, а мост
 * снимается КЭШЕМ ПРИ СТАРТЕ — `hydrate()` возвращается отдельным значением рядом с портом,
 * а не новым методом порта (ограничение Ожегова/Веснина b2/b5: второе имя
 * `AsyncPairingCredentialsStore` не заводится, кэш дешевле и не плодит контракт).
 */
import type { NodeConnectionMode, PairedNodeCredentials } from './nodeConnectionMode';

export const PAIRING_STORAGE_KEY = 'membrana.client.nodeConnection';

export interface PersistedNodeConnection {
  mode: NodeConnectionMode | null;
  pairing: PairedNodeCredentials | null;
}

/** Контракт порта — ровно три глагола, которыми живёт nodeConnectionStore. */
export interface PairingCredentialsStore {
  read(): PersistedNodeConnection;
  write(state: PersistedNodeConnection): void;
  clear(): void;
}

const EMPTY: PersistedNodeConnection = { mode: null, pairing: null };

/** Разбор сырой строки — единственное место валидации формы (перенесено из nodeConnectionStore). */
export function parsePersisted(raw: string | null): PersistedNodeConnection {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as PersistedNodeConnection;
    if (parsed.mode !== 'autonomous' && parsed.mode !== 'paired') return EMPTY;
    return { mode: parsed.mode, pairing: parsed.mode === 'paired' ? parsed.pairing : null };
  } catch {
    return EMPTY;
  }
}

/** Web/dev-адаптер: поведение сегодняшнего дня, один к одному. */
export function createLocalStorageAdapter(storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): PairingCredentialsStore {
  const s = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
  return {
    read: () => (s ? parsePersisted(s.getItem(PAIRING_STORAGE_KEY)) : EMPTY),
    write: (state) => { s?.setItem(PAIRING_STORAGE_KEY, JSON.stringify(state)); },
    clear: () => { s?.removeItem(PAIRING_STORAGE_KEY); },
  };
}

/**
 * Мост, который b4 выставляет из preload Studio (contextBridge).
 *
 * `available` — ответ ПЛАТФОРМЫ (`safeStorage.isEncryptionAvailable()`), а не факт наличия
 * моста: узел, где ОС шифровать не умеет, обязан честно сказать «нет» и остаться на web-адаптере,
 * иначе креды молча уедут в никуда.
 */
export interface MembranaSecureStorageBridge {
  readonly available: boolean;
  get(): Promise<string | null>;
  set(raw: string): Promise<boolean>;
  del(): Promise<void>;
}

declare global {
  interface Window {
    membranaSecureStorage?: MembranaSecureStorageBridge;
  }
}

/** Порт плюс его инициализация: `hydrate` НЕ член порта — контракт остаётся из трёх глаголов. */
export interface HydratablePairingStore {
  readonly store: PairingCredentialsStore;
  /** Поднять кэш из шифртекста и, если надо, перенести старые креды из localStorage. */
  hydrate(): Promise<void>;
}

/** Что случилось при подъёме — для лога вызывающего; молчаливых исходов у миграции нет. */
export type HydrateOutcome = 'encrypted' | 'migrated' | 'empty' | 'unavailable';

/**
 * Electron-адаптер: шифртекст в userData через мост, кэш в памяти для синхронного чтения.
 *
 * Три ветки подъёма, каждая названа:
 * - шифртекст есть и разобран → `encrypted`;
 * - шифртекста нет, но в localStorage лежат старые креды → **миграция одним стартом**:
 *   записать в шифртекст и вычистить исходник (`migrated`); исходник чистится ТОЛЬКО после
 *   подтверждённой записи — иначе отказ моста стёр бы связку;
 * - ничего нет ЛИБО расшифровка не удалась (мост отдаёт `null`) → пустое состояние
 *   (`empty`): это **чистый ре-парринг, а не крах** — политика ADR-0028 Р4.
 *
 * Запись синхронна для вызывающего: кэш обновляется сразу, отправка в мост — fire-and-forget;
 * провал отправки не рушит сессию, но и не молчит (`onError`).
 */
export function createElectronSafeStorageAdapter(
  bridge: MembranaSecureStorageBridge,
  fallback: PairingCredentialsStore = createLocalStorageAdapter(),
  onError: (stage: 'write' | 'clear', error: unknown) => void = () => {},
): HydratablePairingStore & { lastOutcome: () => HydrateOutcome | null } {
  let cache: PersistedNodeConnection = EMPTY;
  let outcome: HydrateOutcome | null = null;

  return {
    lastOutcome: () => outcome,
    store: {
      read: () => cache,
      write: (state) => {
        cache = state;
        void bridge.set(JSON.stringify(state)).catch((error: unknown) => onError('write', error));
      },
      clear: () => {
        cache = EMPTY;
        void bridge.del().catch((error: unknown) => onError('clear', error));
      },
    },
    hydrate: async () => {
      if (!bridge.available) {
        cache = fallback.read();
        outcome = 'unavailable';
        return;
      }
      const raw = await bridge.get().catch(() => null);
      const decrypted = parsePersisted(raw);
      if (decrypted.mode !== null) {
        cache = decrypted;
        outcome = 'encrypted';
        return;
      }
      const legacy = fallback.read();
      if (legacy.mode === null) {
        cache = EMPTY;
        outcome = 'empty';
        return;
      }
      const stored = await bridge.set(JSON.stringify(legacy)).catch(() => false);
      cache = legacy;
      if (stored) {
        fallback.clear();
        outcome = 'migrated';
      } else {
        // Мост не принял — креды остаются в localStorage: потерять связку хуже, чем не зашифровать.
        outcome = 'unavailable';
      }
    },
  };
}

/**
 * Выбор адаптера по среде. Мост есть И платформа умеет шифровать → шифрованный адаптер с кэшем;
 * иначе web-адаптер как был. Возвращается пара «порт + hydrate»: у web-адаптера `hydrate` —
 * пустое обещание, чтобы вызывающий не ветвился.
 */
export function resolvePairingCredentialsStore(
  bridge: MembranaSecureStorageBridge | undefined = typeof window === 'undefined' ? undefined : window.membranaSecureStorage,
  base?: PairingCredentialsStore,
): HydratablePairingStore {
  const fallback = base ?? createLocalStorageAdapter();
  if (!bridge?.available) return { store: fallback, hydrate: async () => {} };
  return createElectronSafeStorageAdapter(bridge, fallback);
}
