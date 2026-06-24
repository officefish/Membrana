import {
  parseDeviceScenarioDocument,
  type DeviceScenarioDocument,
} from '@membrana/core';

/** IndexedDB database for multi-slot user workspaces (U10 W1). */
export const DEVICE_BOARD_WORKSPACE_DB_NAME = 'membrana-device-board-workspaces';
export const DEVICE_BOARD_WORKSPACE_DB_VERSION = 1;

const WORKSPACES_STORE = 'workspaces';
const META_STORE = 'meta';

export interface DeviceBoardWorkspaceRecord {
  readonly storageKey: string;
  readonly deviceId: string;
  readonly workspaceId: string;
  readonly title: string;
  readonly document: DeviceScenarioDocument;
  readonly updatedAt: string;
}

export interface DeviceBoardWorkspaceListItem {
  readonly workspaceId: string;
  readonly title: string;
  readonly updatedAt: string;
}

export interface DeviceBoardWorkspaceMeta {
  readonly deviceId: string;
  readonly activeWorkspaceId: string | null;
}

export interface DeviceBoardWorkspaceStore {
  list(): Promise<readonly DeviceBoardWorkspaceListItem[]>;
  get(workspaceId: string): Promise<DeviceBoardWorkspaceRecord | null>;
  put(input: {
    readonly workspaceId: string;
    readonly title: string;
    readonly document: DeviceScenarioDocument;
    readonly updatedAt: string;
  }): Promise<DeviceBoardWorkspaceRecord>;
  delete(workspaceId: string): Promise<void>;
  count(): Promise<number>;
  getActiveWorkspaceId(): Promise<string | null>;
  setActiveWorkspaceId(workspaceId: string | null): Promise<void>;
}

/** Стабильный ключ записи: deviceId + workspaceId. */
export function buildWorkspaceStorageKey(deviceId: string, workspaceId: string): string {
  return `${deviceId}\u0000${workspaceId}`;
}

/** Новый workspaceId для user slot. */
export function createDeviceBoardWorkspaceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `user-ws-${crypto.randomUUID()}`;
  }
  return `user-ws-${Date.now()}`;
}

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;
let dbInstance: IDBDatabase | null = null;

function openWorkspaceDatabase(): Promise<IDBDatabase> {
  if (!canUseIndexedDb()) {
    return Promise.reject(new Error('indexedDB unavailable'));
  }
  if (dbPromise !== null) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DEVICE_BOARD_WORKSPACE_DB_NAME, DEVICE_BOARD_WORKSPACE_DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WORKSPACES_STORE)) {
        const store = db.createObjectStore(WORKSPACES_STORE, { keyPath: 'storageKey' });
        store.createIndex('byDeviceId', 'deviceId', { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'deviceId' });
      }
    };
  });
  return dbPromise;
}

/** Сброс singleton (тесты). */
export function resetDeviceBoardWorkspaceDatabaseForTests(): void {
  dbPromise = null;
}

/** Закрыть открытое соединение перед deleteDatabase в тестах. */
export async function closeDeviceBoardWorkspaceDatabaseForTests(): Promise<void> {
  if (dbInstance !== null) {
    dbInstance.close();
    dbInstance = null;
  }
  resetDeviceBoardWorkspaceDatabaseForTests();
}

async function withStores<T>(
  mode: IDBTransactionMode,
  run: (workspaces: IDBObjectStore, meta: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openWorkspaceDatabase();
  const tx = db.transaction([WORKSPACES_STORE, META_STORE], mode);
  const result = await run(tx.objectStore(WORKSPACES_STORE), tx.objectStore(META_STORE));
  await transactionDone(tx);
  return result;
}

function toListItem(record: DeviceBoardWorkspaceRecord): DeviceBoardWorkspaceListItem {
  return {
    workspaceId: record.workspaceId,
    title: record.title,
    updatedAt: record.updatedAt,
  };
}

function parseStoredDocument(raw: unknown): DeviceScenarioDocument | null {
  const parsed = parseDeviceScenarioDocument(raw);
  return parsed.ok ? parsed.value : null;
}

/** CRUD user workspace slots в IndexedDB для одного deviceId. */
export function createDeviceBoardWorkspaceStore(deviceId: string): DeviceBoardWorkspaceStore {
  return {
    async list() {
      return withStores('readonly', async (workspaces) => {
        const index = workspaces.index('byDeviceId');
        const records = await requestToPromise(
          index.getAll(IDBKeyRange.only(deviceId)) as IDBRequest<DeviceBoardWorkspaceRecord[]>,
        );
        return records
          .map(toListItem)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      });
    },

    async get(workspaceId) {
      return withStores('readonly', async (store) => {
        const record = await requestToPromise(
          store.get(buildWorkspaceStorageKey(deviceId, workspaceId)) as IDBRequest<
            DeviceBoardWorkspaceRecord | undefined
          >,
        );
        if (record === undefined) {
          return null;
        }
        const document = parseStoredDocument(record.document);
        if (document === null) {
          return null;
        }
        return { ...record, document };
      });
    },

    async put(input) {
      const record: DeviceBoardWorkspaceRecord = {
        storageKey: buildWorkspaceStorageKey(deviceId, input.workspaceId),
        deviceId,
        workspaceId: input.workspaceId,
        title: input.title,
        document: input.document,
        updatedAt: input.updatedAt,
      };
      await withStores('readwrite', async (store) => {
        await requestToPromise(store.put(record));
      });
      return record;
    },

    async delete(workspaceId) {
      await withStores('readwrite', async (workspaces, meta) => {
        await requestToPromise(
          workspaces.delete(buildWorkspaceStorageKey(deviceId, workspaceId)),
        );
        const metaRecord = await requestToPromise(
          meta.get(deviceId) as IDBRequest<DeviceBoardWorkspaceMeta | undefined>,
        );
        if (metaRecord?.activeWorkspaceId === workspaceId) {
          await requestToPromise(
            meta.put({ deviceId, activeWorkspaceId: null } satisfies DeviceBoardWorkspaceMeta),
          );
        }
      });
    },

    async count() {
      const items = await this.list();
      return items.length;
    },

    async getActiveWorkspaceId() {
      return withStores('readonly', async (_workspaces, meta) => {
        const metaRecord = await requestToPromise(
          meta.get(deviceId) as IDBRequest<DeviceBoardWorkspaceMeta | undefined>,
        );
        return metaRecord?.activeWorkspaceId ?? null;
      });
    },

    async setActiveWorkspaceId(workspaceId) {
      await withStores('readwrite', async (_workspaces, meta) => {
        await requestToPromise(
          meta.put({ deviceId, activeWorkspaceId: workspaceId } satisfies DeviceBoardWorkspaceMeta),
        );
      });
    },
  };
}
