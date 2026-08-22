/**
 * Измеритель чарт-листа: меряет НАБОР проб там, где лежит звук. Блок c5b.
 *
 * МЕРЫ НЕ ПЕРЕПИСАНЫ. Огибающая, фон, события над фоном, признаки, плоскостность и структура —
 * всё из `../session-metrics`, теми же функциями, что у свода сеанса. Второй набор мер означал бы
 * вторую правду о звуке: два плагина одного функционала считали бы «громче фона» по-разному.
 *
 * ОТБОРА ЗДЕСЬ НЕТ. Измеритель возвращает ВСЕХ измеренных кандидатов, не сортируя и не обрезая.
 * Кого показать и в каком порядке — решает чарт-лист в доме журнала, потому что это зависит от
 * настроек человека, а человек по ту сторону провода. Мерить и выбирать — разные обязанности, и
 * склеить их значило бы запереть выбор внутри измерения.
 *
 * ОДИН КАНДИДАТ НА ТРЕК, А НЕ НА СОБЫТИЕ. Свод сеанса отбирает СОБЫТИЯ (точки внутри трека),
 * потому что ищет опорные образы. Чарт-лист отбирает ЗАПИСИ ЛЕНТЫ: строка выборки — это строка
 * журнала, а у неё один адрес. Поэтому от трека берётся его самое громкое событие: оно и есть
 * ответ на вопрос «почему эта запись сюда попала».
 *
 * ── ЧТО ЗДЕСЬ ЗНАЧИТ «ФОН» — СКАЗАНО ВСЛУХ ───────────────────────────────────────────────────
 *
 * Владелец требовал меру громкости ОТНОСИТЕЛЬНО ФОНА СЕАНСА, а не абсолютный порог. У свода фон
 * считается по одному сеансу — так и было задумано. Здесь набор приходит из ленты журнала и
 * сеансом не ограничен (Т1: отбор идёт по всему журналу), значит фон считается по ВСЕМУ
 * ПРИСЛАННОМУ НАБОРУ.
 *
 * Это не то же самое, и разница может быть велика: тихий сеанс в тихой комнате и шумный уличный,
 * смешанные в одном наборе, дадут общий фон выше тихого и ниже шумного — тихие события утонут,
 * шумные всплывут. Требование «относительно фона, а не абсолютного порога» соблюдено; но «фон
 * сеанса» превратился в «фон выборки», и это следствие Т1, а не недосмотр. Названо, чтобы на
 * приёмке смотрели именно сюда, а не удивлялись потом.
 */
import { FftCore } from '@membrana/fft-analyzer-service';
import { decodeWavMono16 } from '@membrana/wav-decode';

import {
  dbOverFloor,
  featuresOf,
  findEvents,
  loudnessEnvelope,
  sessionFloor,
  structureOf,
  DEFAULT_FLATNESS_CEILING,
  type EventFeatures,
  type EventStructure,
} from '../session-metrics/index.js';
import type { CollectionSampleReader } from '../sample-reader.js';

export interface MeasuredCandidate {
  readonly sampleId: string;
  readonly deltaDb: number;
  readonly peakDb: number;
  readonly flatness: number;
  readonly structure: EventStructure;
  readonly durationSec: number;
  readonly features: EventFeatures;
}

export type MeasureRefusalReason = 'empty-set' | 'floor-not-measured' | 'nothing-decodable';

export interface MeasureRefusal {
  readonly reason: MeasureRefusalReason;
  readonly detail: string;
}

export interface MeasureOutcome {
  readonly candidates: readonly MeasuredCandidate[];
  /** Фон, от которого считалось превышение, и был ли он ИЗМЕРЕН, а не подставлен. */
  readonly floor: { readonly value: number; readonly measured: boolean };
  readonly asked: number;
  readonly refusal: MeasureRefusal | null;
}

export interface MeasureTuning {
  readonly frameSize: number;
  readonly deltaDb: number;
  readonly flatnessCeiling: number;
}

/**
 * Пороги унаследованы у свода БЕЗ ИЗМЕНЕНИЯ. Провенанс — в `../chart-list/THRESHOLDS.md`:
 * `deltaDb` и `flatnessCeiling` названы Курёхиным на часовом сеансе 21.08, `frameSize` — рабочая
 * точка кода (`//provisional`). Своей измеренной точки у чарт-листа нет, и подбирать её на глаз
 * значило бы выдать догадку за замер.
 */
export const CHART_LIST_MEASURE_DEFAULTS: MeasureTuning = {
  frameSize: 4096,
  deltaDb: 12,
  flatnessCeiling: DEFAULT_FLATNESS_CEILING,
};

export interface MeasureDeps {
  readonly reader: CollectionSampleReader;
  readonly tuning?: MeasureTuning;
}

const refuse = (reason: MeasureRefusalReason, detail: string): MeasureRefusal => ({ reason, detail });

/**
 * Измерить набор проб коллекции.
 *
 * Проба, которой нет в коллекции, молча пропускается — но расхождение `asked` и числа кандидатов
 * остаётся видимым: дополнять список пустышками значило бы подсунуть отбору тишину вместо звука.
 */
export async function measureSampleSet(
  deps: MeasureDeps,
  collectionId: string,
  sampleIds: readonly string[],
): Promise<MeasureOutcome> {
  const cfg = deps.tuning ?? CHART_LIST_MEASURE_DEFAULTS;
  const asked = sampleIds.length;

  if (asked === 0) {
    return {
      candidates: [],
      floor: { value: 0, measured: false },
      asked: 0,
      refusal: refuse('empty-set', 'набор проб пуст — мерить нечего'),
    };
  }

  const wanted = new Set(sampleIds);
  const all = await deps.reader.listSamples(collectionId);
  const tracks = all.filter((s) => wanted.has(s.id));

  // Проход 1 — огибающие и фон ПО ВСЕМУ НАБОРУ (см. заголовок: «фон выборки», не «фон сеанса»).
  const envelopes = new Map<string, { envelope: Float32Array; sampleRate: number }>();
  const history: number[] = [];
  for (const t of tracks) {
    const decoded = decodeWavMono16((await deps.reader.readAudio(t)).bytes);
    if (!decoded.ok) continue; // не wav PCM16 — пропущено, и расхождение счёта это покажет
    const envelope = loudnessEnvelope(decoded.audio.samples, cfg.frameSize);
    envelopes.set(t.id, { envelope, sampleRate: decoded.audio.sampleRate });
    for (const v of envelope) history.push(v);
  }

  if (envelopes.size === 0) {
    return {
      candidates: [],
      floor: { value: 0, measured: false },
      asked,
      refusal: refuse('nothing-decodable', `из ${asked} проб не раскодировалась ни одна`),
    };
  }

  const { floor, floorIsFallback } = sessionFloor(history);
  if (floorIsFallback) {
    // Фон НЕ измерен — отказ, а не «посчитаем от подставленного». Превышение над выдуманным полом
    // читалось бы как измеренное, и это ровно подмена, запрещённая нормой #1950.
    return {
      candidates: [],
      floor: { value: floor, measured: false },
      asked,
      refusal: refuse('floor-not-measured', `кадров ${history.length} < 20 — фон набора не измерен`),
    };
  }

  // Проход 2 — самое громкое событие каждого трека и его признаки.
  const candidates: MeasuredCandidate[] = [];
  for (const t of tracks) {
    const env = envelopes.get(t.id);
    if (!env) continue;
    const events = findEvents(env.envelope, floor, cfg.deltaDb, cfg.frameSize, env.sampleRate);
    if (events.length === 0) continue; // тише порога над фоном — не кандидат, и это не ошибка

    const loudest = events.reduce((a, b) => (b.peak > a.peak ? b : a));
    const decoded = decodeWavMono16((await deps.reader.readAudio(t)).bytes);
    if (!decoded.ok) continue;

    const fft = new FftCore(cfg.frameSize);
    const frequencies = Float32Array.from(
      { length: cfg.frameSize / 2 },
      (_, i) => (i * env.sampleRate) / cfg.frameSize,
    );
    const start = loudest.startFrame * cfg.frameSize;
    const frame = decoded.audio.samples.subarray(start, start + cfg.frameSize);
    if (frame.length < cfg.frameSize) continue;
    const previous =
      start >= cfg.frameSize
        ? fft.computeMagnitudes(decoded.audio.samples.subarray(start - cfg.frameSize, start))
        : null;
    const features = featuresOf(fft.computeMagnitudes(frame), frequencies, frame, previous);

    candidates.push({
      sampleId: t.id,
      deltaDb: dbOverFloor(loudest.peak, floor),
      peakDb: loudest.peakDb,
      flatness: features.flatness,
      structure: structureOf(features.flatness, cfg.flatnessCeiling),
      durationSec: loudest.endSec - loudest.startSec,
      features,
    });
  }

  return { candidates, floor: { value: floor, measured: true }, asked, refusal: null };
}

/** Набор проб из полезной нагрузки прогона. Иначе — пустой набор, и измеритель откажет по нему. */
export function sampleIdsOf(payload: unknown): readonly string[] {
  const p = (payload ?? {}) as Record<string, unknown>;
  const raw = p.sampleIds;
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string' && v.length > 0);
}
