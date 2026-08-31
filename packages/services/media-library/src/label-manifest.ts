/**
 * Файл разметки набора: выгрузка и приём (#2237, заказ владельца 30.08).
 *
 * ЗАЧЕМ. Выгрузка объявляла себя разметкой НАБОРА (`collection: <имя>`), а несла разметку
 * ЗАГРУЖЕННОЙ СТРАНИЦЫ: `labels: samples.map(...)`, где `samples` — то, что успело
 * подгрузиться в дом. Дальше файл уходит человеку, правится и **возвращается импортом** —
 * то есть неполнота приезжает обратно как достоверные данные, и отличить её от настоящей
 * разметки уже нечем. Из входов класса «решение по загруженному вместо полного»
 * (`docs/field/decisions-on-partial-data.md`) этот единственный портит данные необратимо:
 * остальные врали на экране, этот врёт в артефакте, который переживает экран.
 *
 * ЧЕМ ЛЕЧИТСЯ. Файл САМ объявляет, полон ли он: несёт `collectionTotal` (полное число из
 * счётчика набора), `exportedCount` и признак `partial`. Приём обязан это увидеть и
 * ОТКАЗАТЬ с названной причиной — иначе честное поле было бы очередной правдой, из которой
 * никто не делает вывода.
 *
 * ГРАНИЦА. Здесь только контракт файла: собрать и прочитать. Ни сети, ни файловой системы,
 * ни React — оба дома зовут одно и то же.
 */
import type { MediaSample, SampleLabel } from './types.js';

/** Версия формата: приём обязан отличать «другой файл» от «испорченного». */
export const LABEL_MANIFEST_SCHEMA = 'membrana.labels/2' as const;

export interface LabelManifestEntry {
  readonly fileName: string;
  readonly label: SampleLabel;
  readonly notes: string | null;
}

export interface LabelManifest {
  readonly schema: typeof LABEL_MANIFEST_SCHEMA;
  readonly collection: string;
  readonly collectionId: string;
  readonly exportedAt: string;
  /** Полное число проб набора — из счётчика набора, а не из длины выгруженного списка. */
  readonly collectionTotal: number;
  /** Сколько записей реально попало в файл. */
  readonly exportedCount: number;
  /** Файл неполон: выгружено меньше, чем в наборе. */
  readonly partial: boolean;
  readonly labels: readonly LabelManifestEntry[];
}

export interface BuildLabelManifestInput {
  readonly collectionName: string;
  readonly collectionId: string;
  /** Пробы, которые дом СМОГ выгрузить — обычно загруженная страница. */
  readonly exported: readonly MediaSample[];
  /**
   * Полное число проб набора. `null` — дом его не знает; тогда файл объявляется неполным,
   * потому что «не знаю» не равно «полон». Оптимистичное умолчание здесь стоило бы данных.
   */
  readonly collectionTotal: number | null;
  readonly now?: Date;
}

/** Собрать файл разметки, честно объявив его полноту. */
export function buildLabelManifest(input: BuildLabelManifestInput): LabelManifest {
  const exportedCount = input.exported.length;
  const total = typeof input.collectionTotal === 'number' ? input.collectionTotal : null;
  // Не знаем полного числа — считаем файл неполным. Полным он объявляется только когда
  // известно, ЧЕМУ он равен.
  const partial = total === null ? true : exportedCount < total;

  return {
    schema: LABEL_MANIFEST_SCHEMA,
    collection: input.collectionName,
    collectionId: input.collectionId,
    exportedAt: (input.now ?? new Date()).toISOString(),
    collectionTotal: total ?? exportedCount,
    exportedCount,
    partial,
    labels: input.exported.map((s) => ({
      fileName: s.title,
      label: s.label,
      notes: s.notes ?? null,
    })),
  };
}

export type LabelManifestRefusalReason =
  | 'not_json'
  | 'unknown_schema'
  | 'partial_export'
  | 'no_labels';

export interface LabelManifestRefusal {
  readonly ok: false;
  readonly reason: LabelManifestRefusalReason;
  /** Человеческая строка: едет человеку на экран, а не в консоль. */
  readonly why: string;
}

export interface LabelManifestAccepted {
  readonly ok: true;
  readonly manifest: LabelManifest;
}

export type LabelManifestReadResult = LabelManifestAccepted | LabelManifestRefusal;

/**
 * Прочитать файл разметки перед применением.
 *
 * ОТКАЗ — не ошибка чтения, а вердикт о пригодности. Неполный файл применять нельзя:
 * записи, которых в нём нет, останутся со старой разметкой, и человек будет уверен, что
 * применил разметку набора целиком. Молчаливое частичное применение — ровно тот способ
 * испортить данные, ради которого заведён `partial`.
 *
 * Старый формат (без `schema`) тоже отвергается: он не умел объявлять полноту, значит про
 * его полноту сказать нечего, а «нечего сказать» здесь равно «нельзя применять».
 */
export function readLabelManifest(raw: unknown): LabelManifestReadResult {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, reason: 'not_json', why: 'файл не разбирается как JSON' };
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, reason: 'not_json', why: 'файл не разбирается как JSON' };
  }

  const m = parsed as Record<string, unknown>;
  if (m.schema !== LABEL_MANIFEST_SCHEMA) {
    const seen = typeof m.schema === 'string' ? `«${m.schema}»` : 'без версии';
    return {
      ok: false,
      reason: 'unknown_schema',
      why: `файл ${seen}: неизвестный формат разметки. Ожидается ${LABEL_MANIFEST_SCHEMA}; файлы старого образца не объявляли своей полноты, поэтому применять их нельзя — перевыгрузите набор`,
    };
  }

  if (!Array.isArray(m.labels)) {
    return { ok: false, reason: 'no_labels', why: 'в файле нет списка разметки' };
  }

  const exportedCount = typeof m.exportedCount === 'number' ? m.exportedCount : m.labels.length;
  const collectionTotal = typeof m.collectionTotal === 'number' ? m.collectionTotal : exportedCount;
  const partial = m.partial === true || exportedCount < collectionTotal;

  if (partial) {
    const missing = Math.max(0, collectionTotal - exportedCount);
    return {
      ok: false,
      reason: 'partial_export',
      why: `файл неполон: в нём ${exportedCount} записей из ${collectionTotal}${missing > 0 ? `, не хватает ${missing}` : ''}. Применить его значило бы оставить остальные со старой разметкой, не сказав об этом. Выгрузите набор целиком и повторите`,
    };
  }

  return {
    ok: true,
    manifest: {
      schema: LABEL_MANIFEST_SCHEMA,
      collection: typeof m.collection === 'string' ? m.collection : '',
      collectionId: typeof m.collectionId === 'string' ? m.collectionId : '',
      exportedAt: typeof m.exportedAt === 'string' ? m.exportedAt : '',
      collectionTotal,
      exportedCount,
      partial: false,
      labels: m.labels as readonly LabelManifestEntry[],
    },
  };
}
