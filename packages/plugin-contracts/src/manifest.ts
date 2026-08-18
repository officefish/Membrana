/**
 * Манифест плагина — M1_VERDICT (АВТОРИТЕТ словаря, #1961) с уточнениями M2 (`mountTarget:
 * HomeName`), M4 (`triggers: PluginTrigger[]`), M3′ (`windowSize` — поле рода handler) и M5′
 * (витринные поля — только у showcase).
 *
 * БАЗА — РОВНО ПЯТЬ ПОЛЕЙ, ШЕСТОГО НЕТ. Полей `enabled` и `label` не существует: включённость —
 * операция реестра (`enable`/`disable`, у хоста — `setPluginEnabled`), а не свойство описания.
 * Прежний M5 стоял на сочинённой базе с этими двумя полями и был переигран (A5-1…A5-3);
 * зуб рядом проверяет их отсутствие типовой системой.
 *
 * РАСШИРЯТЬ БАЗУ ВПРАВЕ ТОЛЬКО ТИПЫ РОДОВ. Владелец словаря — Архитектор: класс 1
 * (non-breaking) — PR + ревью архитектора; класс 2 (новый kind, изменение или удаление
 * обязательного поля) — ADR + консилиум. Кажется, что поле нужно, — оно не добавляется здесь.
 */
import type { HomeName } from './homes.js';
import type { PluginId } from './plugin-id.js';
import type { PluginTrigger } from './triggers.js';

export const PLUGIN_KINDS = ['handler', 'report', 'showcase'] as const;

export type PluginKind = (typeof PLUGIN_KINDS)[number];

export function isPluginKind(value: unknown): value is PluginKind {
  return typeof value === 'string' && (PLUGIN_KINDS as readonly string[]).includes(value);
}

/**
 * База. Не экспортируется под своим именем: наружу выходит `PluginManifest` — discriminated
 * union родов, — и общие пять полей читаются с него как общие члены юниона. Отдельное публичное
 * имя для базы вердикт не назначал, и заводить его здесь значило бы расширить словарь.
 */
interface PluginManifestBase {
  /** `<org>.<kind>.<slug>`; второй сегмент — род, не модуль. */
  readonly id: PluginId;
  /** semver. Форматная проверка — предмет реестра (PR-2), не типа. */
  readonly version: string;
  readonly kind: PluginKind;
  /** Дом крепления. `mountTarget ∉ HOME_REGISTRY` отвергается валидацией до рантайма (M2). */
  readonly mountTarget: HomeName;
  /** Имена поводов из закрытого словаря M4. */
  readonly triggers: readonly PluginTrigger[];
}

/**
 * Обработчик. `windowSize` — окно накопления: константа декларации, задаётся автором при
 * публикации и в ходе прогона не меняется — потому здесь, а не в `StateRecord` (M3′;
 * `StateRecord` несёт наблюдаемые границы `windowStart`/`windowEnd`, где
 * `windowEnd = windowStart + windowSize`). Входит в `configHash` (M3).
 */
export interface HandlerManifest extends PluginManifestBase {
  readonly kind: 'handler';
  readonly windowSize: number;
}

/** Отчёт. Витринных полей физически нет (M5′) — проверяется типовой системой в зубах. */
export interface ReportManifest extends PluginManifestBase {
  readonly kind: 'report';
}

/**
 * Форма показа — M5′. Закрытый словарь первой волны плюс лазейка `x-…`: страница ОБЯЗАНА
 * нести fallback-ветку для неё — без броска, с заглушкой или сообщением «форма не
 * поддерживается». Форма объявляется самоописанием, а не выводится из данных (Т3.6).
 */
export type DisplayForm =
  | 'row'
  | 'table'
  | 'zone-map'
  | 'histogram'
  | 'time-series'
  | `x-${string}`;

/** Витрина: база + `displayForm` + `description?` — и НИКАКИХ дополнительных полей (M5′). */
export interface ShowcaseManifest extends PluginManifestBase {
  readonly kind: 'showcase';
  readonly displayForm: DisplayForm;
  readonly description?: string;
}

/**
 * Discriminated union родов (M1). `getRegisteredPlugins()` отдаёт `ReadonlyArray<PluginManifest>`,
 * и narrowing по `kind` сужает до типа рода — это единственный канал чтения самоописаний (M5′).
 */
export type PluginManifest = HandlerManifest | ReportManifest | ShowcaseManifest;
