import type { PatternTemplate } from '@membrana/trends-detector-service';

import { getRuntimeStorageMode } from '../../lib/runtimeStorageMode';

export const USER_TEMPLATES_LOCAL_STORAGE_KEY = 'membrana.trends-fft.user-templates.v1';
export const USER_TEMPLATES_REMOTE_URL = '/api/v1/trends-templates';

export type UserTemplatesStorageBackend = 'electron-fs' | 'remote-server' | 'local-storage';

export interface UserTemplatesPersistPayload {
  readonly version: 1;
  readonly templates: PatternTemplate[];
}

export interface TrendsTemplatesElectronAPI {
  read: () => Promise<string | null>;
  write: (json: string) => Promise<void>;
}

// Window.electronAPI — см. electronMediaLibraryPort.ts (единый declare global).

let activeBackend: UserTemplatesStorageBackend = 'local-storage';

export function getActiveUserTemplatesBackend(): UserTemplatesStorageBackend {
  return activeBackend;
}

export function parseUserTemplatesPayload(raw: string): PatternTemplate[] {
  const parsed = JSON.parse(raw) as UserTemplatesPersistPayload;
  if (parsed?.version !== 1 || !Array.isArray(parsed.templates)) {
    return [];
  }
  return parsed.templates.filter(
    (t) => typeof t?.key === 'string' && t.key.startsWith('user:'),
  );
}

export function serializeUserTemplatesPayload(templates: readonly PatternTemplate[]): string {
  const payload: UserTemplatesPersistPayload = { version: 1, templates: [...templates] };
  return JSON.stringify(payload);
}

function readLocalStorageTemplates(): PatternTemplate[] {
  if (!canUseLocalStorage()) return [];
  try {
    const raw = localStorage.getItem(USER_TEMPLATES_LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return parseUserTemplatesPayload(raw);
  } catch {
    return [];
  }
}

function canUseLocalStorage(): boolean {
  return (
    typeof localStorage !== 'undefined' &&
    typeof localStorage.getItem === 'function' &&
    typeof localStorage.setItem === 'function'
  );
}

function writeLocalStorageTemplates(templates: readonly PatternTemplate[]): void {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(USER_TEMPLATES_LOCAL_STORAGE_KEY, serializeUserTemplatesPayload(templates));
}

async function loadFromElectron(): Promise<PatternTemplate[] | null> {
  const api = typeof window !== 'undefined' ? window.electronAPI?.trendsTemplates : undefined;
  if (!api) return null;
  const raw = await api.read();
  if (!raw) return [];
  return parseUserTemplatesPayload(raw);
}

async function saveToElectron(templates: readonly PatternTemplate[]): Promise<boolean> {
  const api = typeof window !== 'undefined' ? window.electronAPI?.trendsTemplates : undefined;
  if (!api) return false;
  await api.write(serializeUserTemplatesPayload(templates));
  return true;
}

async function loadFromRemote(): Promise<PatternTemplate[] | null> {
  try {
    const res = await fetch(USER_TEMPLATES_REMOTE_URL, { method: 'GET' });
    if (!res.ok) return null;
    const raw = await res.text();
    const templates = parseUserTemplatesPayload(raw);
    writeLocalStorageTemplates(templates);
    return templates;
  } catch {
    return null;
  }
}

async function saveToRemote(templates: readonly PatternTemplate[]): Promise<boolean> {
  try {
    const res = await fetch(USER_TEMPLATES_REMOTE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: serializeUserTemplatesPayload(templates),
    });
    if (!res.ok) return false;
    writeLocalStorageTemplates(templates);
    return true;
  } catch {
    return false;
  }
}

export async function loadUserTemplatesFromStorage(): Promise<{
  templates: PatternTemplate[];
  backend: UserTemplatesStorageBackend;
}> {
  if (getRuntimeStorageMode() === 'electron-system-files') {
    try {
      const electronTemplates = await loadFromElectron();
      if (electronTemplates != null) {
        activeBackend = 'electron-fs';
        writeLocalStorageTemplates(electronTemplates);
        return { templates: electronTemplates, backend: activeBackend };
      }
    } catch {
      // fallback below
    }
  }

  const remoteTemplates = await loadFromRemote();
  if (remoteTemplates != null) {
    activeBackend = 'remote-server';
    return { templates: remoteTemplates, backend: activeBackend };
  }

  const localTemplates = readLocalStorageTemplates();
  activeBackend = 'local-storage';
  return { templates: localTemplates, backend: activeBackend };
}

export async function saveUserTemplatesToStorage(
  templates: readonly PatternTemplate[],
): Promise<UserTemplatesStorageBackend> {
  if (activeBackend === 'electron-fs') {
    try {
      if (await saveToElectron(templates)) {
        writeLocalStorageTemplates(templates);
        return activeBackend;
      }
    } catch {
      // fallback below
    }
  }

  if (activeBackend === 'remote-server') {
    if (await saveToRemote(templates)) {
      return activeBackend;
    }
  }

  writeLocalStorageTemplates(templates);
  activeBackend = 'local-storage';
  return activeBackend;
}

/** Сброс режима бэкенда (тесты). */
export function resetUserTemplatesPersistenceForTests(): void {
  activeBackend = 'local-storage';
  if (canUseLocalStorage() && typeof localStorage.removeItem === 'function') {
    localStorage.removeItem(USER_TEMPLATES_LOCAL_STORAGE_KEY);
  }
}
