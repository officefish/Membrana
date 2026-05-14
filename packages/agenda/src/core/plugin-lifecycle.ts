/**
 * Жизненный цикл плагинов: install / teardown.
 *
 * Teardown-callback, который плагин может вернуть из `install`, хранится
 * ВНЕ Zustand state — функции не сериализуются и не должны попадать в persist.
 *
 * Используется store при `activatePlugin` / `deactivatePlugin` /
 * `registerPlugin` (если плагин уже active после rehydrate).
 *
 * См. `docs/MODULE_AND_PLUGIN_UI.md` §0 — раздел про жизненный цикл плагинов.
 */

import { logger } from '@membrana/core';

import type {
  ModuleContext,
  Plugin,
  PluginTeardown,
} from './types';

/** Map: `${moduleId}:${pluginId}` → teardown. Только для активных плагинов. */
const teardowns = new Map<string, PluginTeardown>();

function keyOf(moduleId: string, pluginId: string): string {
  return `${moduleId}:${pluginId}`;
}

/** Уже ли плагин установлен (есть teardown или install прошёл). */
export function isPluginInstalled(
  moduleId: string,
  pluginId: string,
): boolean {
  return teardowns.has(keyOf(moduleId, pluginId));
}

/**
 * Вызывает `plugin.install(context)` и сохраняет teardown.
 * Идемпотентен: повторный вызов с уже установленным плагином — no-op.
 *
 * Параметры:
 *   - `getCurrentPlugin` — получает свежий снапшот плагина (config может
 *     обновиться после установки; UI может вызывать install не сразу).
 *   - `updatePluginConfig` / `getPluginById` — публичные actions store,
 *     которые проброшены в `ModuleContext`.
 */
export async function invokePluginInstall<TConfig>(
  moduleId: string,
  plugin: Plugin<TConfig>,
  api: {
    updatePluginConfig: (updates: Partial<TConfig>) => void;
    getPluginById: (pluginId: string) => Plugin | undefined;
  },
): Promise<void> {
  const k = keyOf(moduleId, plugin.id);
  if (teardowns.has(k)) return;

  const context: ModuleContext<TConfig> = {
    moduleId,
    config: plugin.config ?? ({} as TConfig),
    updateConfig: api.updatePluginConfig,
    getPlugin: api.getPluginById,
  };

  try {
    const result = await Promise.resolve(plugin.install(context));
    if (typeof result === 'function') {
      teardowns.set(k, result);
    } else {
      // Маркер «установлен», даже без teardown — чтобы повторный install не сработал.
      teardowns.set(k, () => undefined);
    }
  } catch (err) {
    logger.error('plugin.install threw', {
      moduleId,
      pluginId: plugin.id,
      err,
    });
  }
}

/**
 * Вызывает teardown плагина и удаляет запись.
 * Безопасен: если плагин не был установлен — no-op.
 */
export async function invokePluginTeardown(
  moduleId: string,
  pluginId: string,
): Promise<void> {
  const k = keyOf(moduleId, pluginId);
  const teardown = teardowns.get(k);
  if (!teardown) return;
  teardowns.delete(k);
  try {
    await Promise.resolve(teardown());
  } catch (err) {
    logger.error('plugin teardown threw', { moduleId, pluginId, err });
  }
}

/** Очищает всё (для тестов / hot reload). */
export function resetAllPluginTeardowns(): void {
  teardowns.clear();
}
