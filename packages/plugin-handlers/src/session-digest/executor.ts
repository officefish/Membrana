/**
 * Исполнитель разбора сеанса — блок j2 (#1961). Обвязка вокруг мер `session-metrics` (j1):
 * читает пробы портом, кадрирует, зовёт меры, собирает свод. СВОЕЙ МАТЕМАТИКИ ЗДЕСЬ НЕТ.
 *
 * ДВА ПРОХОДА, и это не расточительство. Фон сеанса известен только когда прослушан весь
 * сеанс, а признаки события считаются по его звуку — значит либо держать 343 МБ в памяти,
 * либо пройти дважды. Первый проход читает все треки и оставляет ОГИБАЮЩИЕ (720 × ~50 чисел,
 * копейки); второй перечитывает только те треки, где после вычисления фона нашлись события.
 *
 * ОКНО — ISO-ГРАНИЦАМИ `{from, to}`, а НЕ парой первый/последний `sampleId`, как предлагал
 * структурщик (Q5). Причина фактическая: `sampleId` — uuid, он не упорядочен, и «диапазон
 * от id до id» пришлось бы восстанавливать тем же `createdAt`, только окольно. Окно времени
 * выражается временем; `sampleId` остаётся адресом повода, не границей.
 *
 * ОКНО СЕАНСА — из `ctx.payload`, как постановила комната: `PluginContext.payload` в контракте
 * объявлен `unknown`, поэтому окно едет без единой правки `plugin-contracts` (#1982). Payload
 * не разобрался — сеансом считается вся коллекция, и это сказано в паспорте прогона, а не
 * подразумевается.
 *
 * ПОРОГИ ПОМЕЧЕНЫ `//provisional`: числа ниже — рабочая точка до слуха. Их выбирает Курёхин на
 * реальном сеансе (блок j3) и называет с обоснованием; здесь они живут затем, чтобы прогон был
 * возможен, и едут в паспорт результата, чтобы цифра не читалась как измеренная.
 */
import type { PluginContext, PluginExecutor, RunResult } from '@membrana/plugin-contracts';
import { FftCore } from '@membrana/fft-analyzer-service';
import { decodeWavMono16 } from '@membrana/wav-decode';

import type { CollectionSampleDescriptor, CollectionSampleReader } from '../sample-reader.js';
import {
  dedupeGreedy,
  featuresOf,
  findEvents,
  loudnessEnvelope,
  normalizeFeatures,
  refuseSession,
  sessionFloor,
  shortfallOf,
  indicesByStructure,
  structureOf,
  DEFAULT_FLATNESS_CEILING,
  type EventFeatures,
  type SessionEvent,
  type SessionRefusal,
} from '../session-metrics/index.js';
import { SESSION_DIGEST_MANIFEST } from './manifest.js';

/** Рабочая точка до слуха (j3). Каждое число — предмет подтверждения, не измеренная величина. */
export const SESSION_DIGEST_DEFAULTS = {
  /** Кадр огибающей: 4096 при 48 кГц ≈ 85 мс — короче хлопка, длиннее щелчка. //provisional */
  frameSize: 4096,
  /** Насколько событие обязано быть громче фона сеанса, дБ. //provisional */
  deltaDb: 12,
  /** Порог похожести в долях максимума расстояния сеанса. //provisional */
  minDistanceRatio: 0.05,
  /**
   * Потолок плоскостности: не выше — тональное (опорный образ), выше — широкополосное
   * (негативный материал). Число названо слухом на часовом сеансе 21.08, где классы легли
   * с провалом 0.150 / 0.155; квантиль убран — см. session-metrics.
   */
  flatnessCeiling: DEFAULT_FLATNESS_CEILING,
  /** Сколько опорных образов отдаём. */
  referencesLimit: 20,
  /**
   * Сколько негативного материала отдаём. Двадцать, а не «все»: негатив — сбалансированный
   * контрпример к двадцати опорным, а не свалка на сотни адресов (разбор резчика 21.08).
   */
  negativesLimit: 20,
} as const;

/**
 * Пороги без слуха. `flatnessCeiling` и `deltaDb` здесь НЕ значатся: их назвал Курёхин на
 * часовом сеансе 21.08 с обоснованием (провал между классами 0.150/0.155; «в тихой комнате
 * громкое начинается с ~10 дБ над полом»). Остальные два — рабочая точка кода до замера.
 */
export const PROVISIONAL_THRESHOLDS: readonly string[] = ['frameSize', 'minDistanceRatio'];

export interface SessionWindow {
  readonly from?: string;
  readonly to?: string;
}

export interface SessionDigestTuning {
  readonly frameSize?: number;
  readonly deltaDb?: number;
  readonly minDistanceRatio?: number;
  readonly flatnessCeiling?: number;
  readonly referencesLimit?: number;
  readonly negativesLimit?: number;
}

/** Опорный звук: адрес — точка (проба + смещение), а не «трек целиком». */
export interface ReferenceSound {
  readonly sampleId: string;
  readonly title: string;
  readonly startSec: number;
  readonly endSec: number;
  readonly peakDb: number;
  readonly durationSec: number;
  readonly structure: 'tonal' | 'broadband';
  readonly features: EventFeatures;
  /** Скольких похожих этот звук вытеснил при отсеве — видно, что дедуп работал. */
  readonly similarDropped: number;
}

/**
 * Паспорт прогона: числами, а не литеральными типами умолчаний — рабочая точка могла быть
 * переопределена вызывающим, и паспорт обязан нести то, чем СЧИТАЛИ (ADR-0006 Р3).
 */
export interface SessionDigestPassport {
  readonly frameSize: number;
  readonly deltaDb: number;
  readonly minDistanceRatio: number;
  readonly flatnessCeiling: number;
  readonly referencesLimit: number;
  readonly negativesLimit: number;
  /**
   * Пороги, которые слух ЕЩЁ НЕ называл, — поимённо, а не общим флагом. Общий флаг врал бы
   * с 21.08: `flatnessCeiling` и `deltaDb` названы Курёхиным на часовом сеансе, а
   * `frameSize` и `minDistanceRatio` до сих пор рабочая точка кода.
   */
  readonly provisional: readonly string[];
}

export interface SessionDigestResult extends RunResult {
  readonly kind: 'report';
  readonly window: SessionWindow & { readonly tracksSeen: number; readonly tracksInWindow: number };
  readonly floor: { readonly value: number; readonly measured: boolean };
  /**
   * Опорные образы — ТОЛЬКО тональные. Прежнее поле `twenty` убрано: часовой сеанс 21.08 дал
   * в нём 12 широкополосных из 20 (шаги и дверь), и имя врало о содержимом. Требование
   * владельца: тональные — опорные, широкополосные — негативный материал.
   */
  readonly references: readonly ReferenceSound[];
  /** Негативный материал — широкополосные, с адресами; не выброшены и не смешаны с опорными. */
  readonly negatives: readonly ReferenceSound[];
  /** Недобор по каждому списку отдельно: у опорных и негатива он свой. */
  readonly shortfall: { readonly references: number; readonly negatives: number };
  readonly eventsFound: number;
  readonly passport: SessionDigestPassport;
  readonly refusal: SessionRefusal | null;
}

export interface SessionDigestDeps {
  readonly reader: CollectionSampleReader;
  readonly tuning?: SessionDigestTuning;
  readonly now?: () => Date;
}

const inWindow = (s: CollectionSampleDescriptor, w: SessionWindow): boolean => {
  if (!w.from && !w.to) return true;
  // Проба без отметки времени в окно по времени не попадает: «не знаем когда» и «попадает» —
  // разные состояния, и первое не вправе притвориться вторым.
  if (!s.createdAt) return false;
  if (w.from && s.createdAt < w.from) return false;
  if (w.to && s.createdAt > w.to) return false;
  return true;
};

/** Окно из `ctx.payload`. Не разобралось — вся коллекция, и это будет сказано в результате. */
export function windowOf(payload: unknown): SessionWindow {
  if (typeof payload !== 'object' || payload === null) return {};
  const p = payload as Record<string, unknown>;
  const from = typeof p.from === 'string' ? p.from : undefined;
  const to = typeof p.to === 'string' ? p.to : undefined;
  return { ...(from ? { from } : {}), ...(to ? { to } : {}) };
}

export function createSessionDigestExecutor(deps: SessionDigestDeps): PluginExecutor {
  const cfg = { ...SESSION_DIGEST_DEFAULTS, ...(deps.tuning ?? {}) };
  const now = deps.now ?? (() => new Date());

  const done = (over: Partial<SessionDigestResult>, seen: number, inWin: number, w: SessionWindow): SessionDigestResult => ({
    completedAt: now(),
    kind: 'report',
    window: { ...w, tracksSeen: seen, tracksInWindow: inWin },
    floor: { value: 0, measured: false },
    references: [],
    negatives: [],
    shortfall: { references: cfg.referencesLimit, negatives: cfg.negativesLimit },
    eventsFound: 0,
    passport: { ...cfg, provisional: PROVISIONAL_THRESHOLDS },
    refusal: null,
    ...over,
  });

  return {
    async execute(ctx: PluginContext): Promise<SessionDigestResult> {
      const window = windowOf(ctx.payload);
      const all = await deps.reader.listSamples(ctx.address.collectionId);
      const tracks = all.filter((s) => inWindow(s, window));
      if (tracks.length === 0) {
        return done(
          { refusal: refuseSession('session-too-short', `в окне ноль проб из ${all.length} в коллекции`) },
          all.length, 0, window,
        );
      }

      // Проход 1 — огибающие и история кадров всего сеанса; сырой звук не удерживается.
      const envelopes = new Map<string, { envelope: Float32Array; sampleRate: number }>();
      const history: number[] = [];
      for (const t of tracks) {
        const decoded = decodeWavMono16((await deps.reader.readAudio(t)).bytes);
        if (!decoded.ok) continue; // не wav PCM16 — пропущено; счёт разойдётся с tracksInWindow, и это видно
        const envelope = loudnessEnvelope(decoded.audio.samples, cfg.frameSize);
        envelopes.set(t.id, { envelope, sampleRate: decoded.audio.sampleRate });
        for (const v of envelope) history.push(v);
      }
      const { floor, floorIsFallback } = sessionFloor(history);
      if (floorIsFallback) {
        return done(
          {
            floor: { value: floor, measured: false },
            refusal: refuseSession('floor-not-measured', `кадров ${history.length} < 20 — фон сеанса не измерен`),
          },
          all.length, tracks.length, window,
        );
      }

      // Проход 2 — только треки, где есть события над фоном; признаки считаются по их звуку.
      const candidates: { track: CollectionSampleDescriptor; event: SessionEvent; features: EventFeatures }[] = [];
      for (const t of tracks) {
        const env = envelopes.get(t.id);
        if (!env) continue;
        const events = findEvents(env.envelope, floor, cfg.deltaDb, cfg.frameSize, env.sampleRate);
        if (events.length === 0) continue;
        const decoded = decodeWavMono16((await deps.reader.readAudio(t)).bytes);
        if (!decoded.ok) continue;
        const fft = new FftCore(cfg.frameSize);
        const frequencies = Float32Array.from({ length: cfg.frameSize / 2 }, (_, i) => (i * env.sampleRate) / cfg.frameSize);
        for (const event of events) {
          const start = event.startFrame * cfg.frameSize;
          const frame = decoded.audio.samples.subarray(start, start + cfg.frameSize);
          if (frame.length < cfg.frameSize) continue;
          const previous = start >= cfg.frameSize
            ? fft.computeMagnitudes(decoded.audio.samples.subarray(start - cfg.frameSize, start))
            : null;
          candidates.push({
            track: t,
            event,
            features: featuresOf(fft.computeMagnitudes(frame), frequencies, frame, previous),
          });
        }
      }
      if (candidates.length === 0) {
        return done(
          {
            floor: { value: floor, measured: true },
            refusal: refuseSession('no-events-over-floor', `ни одного события громче фона на ${cfg.deltaDb} дБ`),
          },
          all.length, tracks.length, window,
        );
      }

      // Длительность всплеска — пятая ось дедупа, аргумент обязателен (j1, ревью PR #2040):
      // щелчок и долгий гул одного тембра иначе схлопнулись бы в один звук.
      const vectors = normalizeFeatures(
        candidates.map((c) => c.features),
        candidates.map((c) => c.event.endSec - c.event.startSec),
      );
      const flatness = candidates.map((c) => c.features.flatness);
      const byLoudness = (indices: readonly number[]): number[] =>
        [...indices].sort((a, b) => candidates[b]!.event.peakDb - candidates[a]!.event.peakDb);

      const soundsOf = (structure: 'tonal' | 'broadband', limit: number): ReferenceSound[] => {
        // Дедуп ВНУТРИ рода: общий отсев дал бы негативу вытеснять опорные (шаг громче тона),
        // и двадцать образов снова оказались бы дверью — то, ради чего спринт и случился.
        const order = byLoudness(indicesByStructure(flatness, cfg.flatnessCeiling, structure));
        const { kept, droppedAs } = dedupeGreedy(vectors, order, cfg.minDistanceRatio, limit);
        return kept.map((i) => {
          const c = candidates[i]!;
          return {
            sampleId: c.track.id,
            title: c.track.title,
            startSec: c.event.startSec,
            endSec: c.event.endSec,
            peakDb: c.event.peakDb,
            durationSec: c.event.endSec - c.event.startSec,
            structure: structureOf(c.features.flatness, cfg.flatnessCeiling),
            features: c.features,
            similarDropped: [...droppedAs.values()].filter((by) => by === i).length,
          };
        });
      };

      const references = soundsOf('tonal', cfg.referencesLimit);
      const negatives = soundsOf('broadband', cfg.negativesLimit);

      return done(
        {
          floor: { value: floor, measured: true },
          references,
          negatives,
          shortfall: {
            references: shortfallOf(references.length, cfg.referencesLimit),
            negatives: shortfallOf(negatives.length, cfg.negativesLimit),
          },
          eventsFound: candidates.length,
        },
        all.length, tracks.length, window,
      );
    },
  };
}

export const SESSION_DIGEST_ID = SESSION_DIGEST_MANIFEST.id;
