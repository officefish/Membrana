/**
 * Дом результатов — M3 (непереигрываемое) + M3′ (адрес и окно), #1961. Носитель — Mongo
 * офиса, коллекция `plugin-results` (константы в `homes.ts`, рядом с `HOME_REGISTRY`).
 * Здесь — только форма документов; ни Mongo-типов, ни индексов: индексы — предмет PR-2.
 */
import type { HomeName } from './homes.js';
import type { PluginKind } from './manifest.js';
import type { PluginId } from './plugin-id.js';

/**
 * Адрес одного прогона — ПЯТЬ полей, цепочка Т3.3 «модуль → плагин → версия → коллекция →
 * прогон». `mountTarget` — явное поле, а не восстанавливается из реестра по `pluginId`:
 * восстановление — скрытая зависимость, адрес перестаёт быть замкнутым, а имя плагина дом не
 * кодирует (второй сегмент — род). Адрес — неизменяемая запись момента исполнения: при
 * переезде плагина в другой дом старые прогоны сохраняют дом, в котором реально шли (M3′).
 *
 * Уникальный индекс Mongo — БЕЗ `mountTarget`: `{ pluginId, version, collectionId, runId }`;
 * дом функционально определён именем через манифест и множества уникальных документов не
 * меняет. `runId` — UUID v7 (монотонный, сортируемый по времени).
 */
export interface RunAddress {
  readonly pluginId: PluginId;
  readonly version: string;
  readonly collectionId: string;
  readonly runId: string;
  readonly mountTarget: HomeName;
}

/**
 * Два отпечатка Т3.4 — ОТДЕЛЬНЫЙ интерфейс, не часть адреса. `inputHash` — SHA-256 от
 * отсортированного по `sampleId` списка `(sampleId, contentHash)`; `configHash` — SHA-256 от
 * отсортированного списка `(pluginId, version, params)`, где `params` включает `windowSize`.
 * Протухание объявляет ЧТЕНИЕ на лету (`RunRecordView.stale`), сторожа нет.
 */
export interface RunFingerprints {
  readonly inputHash: string;
  readonly configHash: string;
}

/**
 * Объявление того, С ЧЕГО прогон начал (эрратум A4-1): `'from-freeze'` — найден `StateRecord`,
 * `'fresh'` — не найден. Механизмом чтения оно не является: догонялка — чтение дома
 * результатов по `RunAddress` за своё окно. В `StateRecord` не живёт.
 */
export type ResumeMode = 'from-freeze' | 'fresh';

/** Результат `execute` — M1: `completedAt` обязателен, `kind` совпадает с родом плагина. */
export interface RunResult {
  readonly completedAt: Date;
  readonly kind: PluginKind;
}

/** Документ БД. `stale` здесь НЕ хранится — см. `RunRecordView`. */
export interface RunRecord extends RunResult {
  readonly address: RunAddress;
  readonly fingerprints: RunFingerprints;
  readonly resumeMode: ResumeMode;
}

/**
 * Ответ чтения. `stale` вычисляется на лету: `fingerprints.inputHash ≠ hash(текущей коллекции)`.
 * Два разных интерфейса нарочно: хранить `stale` значило бы обновлять записи при каждом
 * изменении коллекции.
 */
export interface RunRecordView extends RunRecord {
  readonly stale?: boolean;
}

/**
 * Заморозка накопительного плагина при выключении. Адресуется без `runId`; при включении
 * читается последняя по `frozenAt`. `windowStart`/`windowEnd` — наблюдаемые границы окна в
 * единицах `windowSize` (`windowEnd = windowStart + windowSize`). На границе окна итоговый
 * `RunRecord` и новый `StateRecord` пишутся ОДНОЙ транзакцией — нет состояния «окно закрыто,
 * новое не открыто». `windowSize` здесь не живёт (M3′).
 */
export interface StateRecord {
  readonly pluginId: PluginId;
  readonly version: string;
  readonly collectionId: string;
  readonly kind: 'state';
  readonly frozenAt: Date;
  readonly windowStart: number;
  readonly windowEnd: number;
  readonly payload: unknown;
}

/**
 * Зуб сходимости живого прогона и пересчёта (Т3.9). Свой `convergenceId` (UUID v7), два runId
 * отдельными полями — одно поле, один смысл. Предикат сходимости:
 * `inputFingerprintMatch && outputDiff === null`. Содержимое `outputDiff` — за пределами M3.
 */
export interface ConvergenceRecord {
  readonly convergenceId: string;
  readonly pluginId: PluginId;
  readonly version: string;
  readonly collectionId: string;
  readonly liveRunId: string;
  readonly recomputeRunId: string;
  readonly inputFingerprintMatch: boolean;
  readonly outputDiff: unknown;
}
