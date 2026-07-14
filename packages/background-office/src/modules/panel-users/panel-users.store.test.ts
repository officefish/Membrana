import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import type { AppConfig } from '../../config/env.schema';
import { emptyState, mintCode } from './panel-users-core';
import { PanelUsersStore } from './panel-users.store';

const dirs: string[] = [];

function storeAt(path: string): PanelUsersStore {
  return new PanelUsersStore({ PANEL_USERS_STORE_PATH: path } as AppConfig);
}

function tempStorePath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'panel-users-'));
  dirs.push(dir);
  return join(dir, 'panel-users.json');
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('PanelUsersStore', () => {
  it('нет файла → пустой реестр без деградации (первый запуск); мутация создаёт файл', () => {
    const path = tempStorePath();
    const store = storeAt(path);
    expect(store.isDegraded()).toBe(false);
    expect(store.snapshot().users).toEqual([]);

    const next = store.mutate((state) =>
      mintCode(state, { label: 'x', grants: ['*'], expiresAt: null, maxUses: 1 }, 'owner', 't').state,
    );
    expect(next?.codes).toHaveLength(1);
    expect(JSON.parse(readFileSync(path, 'utf8')).codes).toHaveLength(1);
  });

  it('перезапуск читает записанное (store переживает рестарт процесса)', () => {
    const path = tempStorePath();
    storeAt(path).mutate((state) =>
      mintCode(state, { label: 'press', grants: ['a'], expiresAt: null, maxUses: 2 }, 'owner', 't')
        .state,
    );
    const reloaded = storeAt(path);
    expect(reloaded.snapshot().codes[0]!.label).toBe('press');
  });

  it('битый файл → видимая деградация: снапшот пуст, мутации отклоняются, файл НЕ перезаписан', () => {
    const path = tempStorePath();
    writeFileSync(path, '{broken', 'utf8');
    const store = storeAt(path);
    expect(store.isDegraded()).toBe(true);
    expect(store.mutate((s) => ({ ...s }))).toBeNull();
    expect(readFileSync(path, 'utf8')).toBe('{broken');
  });

  it('мутация null (цель не найдена) не трогает состояние и диск', () => {
    const path = tempStorePath();
    const store = storeAt(path);
    expect(store.mutate(() => null)).toBeNull();
    expect(store.snapshot()).toEqual(emptyState());
  });
});
