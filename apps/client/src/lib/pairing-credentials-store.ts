/**
 * Порт хранения кредов парринга (b2 спринта studio-firebat-user-pairing; форма — Веснин,
 * словарь — Ожегов). Одно имя на весь тракт: «pairing credentials store»; синонимы
 * (secure storage, vault, keychain) в клиенте не употребляются.
 *
 * Зачем порт: креды (включая mediaToken — сегодня это СЛУЖЕБНЫЙ токен media, долг
 * ADR-0028) писались в localStorage напрямую из nodeConnectionStore — в Electron это
 * плоский файл на диске узла. Порт разводит «что хранится» и «где лежит»: web-адаптер
 * сохраняет сегодняшнее поведение, Electron-адаптер — заглушка до ADR-0028
 * (@stage ADR-0028: шифрование НЕ включается — нет миграции ключей и политики ротации;
 * провод IPC к safeStorage строит b4, включение — отдельный спринт media-per-device-token).
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

/** Мост, который b4 выставляет из preload Studio (contextBridge). Наличие ≠ шифрование. */
export interface MembranaSecureStorageBridge {
  /** Провод есть, но включение шифрования — за ADR-0028; до него мост не зовётся. */
  readonly available: boolean;
}

declare global {
  interface Window {
    membranaSecureStorage?: MembranaSecureStorageBridge;
  }
}

/**
 * Electron-адаптер — ЗАГЛУШКА (@stage ADR-0028): сегодня делегирует web-адаптеру,
 * чтобы поведение Studio на узле было идентично браузерному и не породить два формата
 * хранения без миграции. После ADR-0028 сюда встаёт вызов моста b4.
 */
export function createElectronSafeStorageAdapter(base?: PairingCredentialsStore): PairingCredentialsStore {
  return base ?? createLocalStorageAdapter();
}

/** Выбор адаптера по среде: мост preload виден → Electron-заглушка, иначе web. Параметр — для зубов. */
export function resolvePairingCredentialsStore(
  bridge: MembranaSecureStorageBridge | undefined = typeof window === 'undefined' ? undefined : window.membranaSecureStorage,
  base?: PairingCredentialsStore,
): PairingCredentialsStore {
  return bridge ? createElectronSafeStorageAdapter(base) : (base ?? createLocalStorageAdapter());
}
