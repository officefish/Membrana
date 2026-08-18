/**
 * Манифесты первой волны — один конструктор на шесть детекторов (M6′): род `handler`, дом
 * `background-media/collections`, повод `collections.sample_added`, `windowSize: 1` — один
 * повод порождает один прогон, накопления нет (постфактум-детекторы без `StateRecord`).
 *
 * `id` собирается ТОЛЬКО из slug: org и род подставляются здесь, а собранное имя проходит
 * `isPluginId` — так `mfcc-detector` без org и рода (граница 9 M6′) физически не пройдёт.
 */
import {
  PLUGIN_TRIGGERS,
  isPluginId,
  type HandlerManifest,
  type PluginId,
} from '@membrana/plugin-contracts';

export const FIRST_WAVE_MOUNT_TARGET = 'background-media/collections' as const;

export function firstWavePluginId(slug: string): PluginId {
  const id = `membrana.handler.${slug}`;
  if (!isPluginId(id)) {
    throw new Error(`«${id}» не проходит формат PluginId M1 (<org>.<kind>.<slug>)`);
  }
  return id;
}

export function firstWaveHandlerManifest(slug: string, version: string): HandlerManifest {
  return {
    id: firstWavePluginId(slug),
    version,
    kind: 'handler',
    mountTarget: FIRST_WAVE_MOUNT_TARGET,
    triggers: [PLUGIN_TRIGGERS.COLLECTIONS_SAMPLE_ADDED],
    windowSize: 1,
  };
}
