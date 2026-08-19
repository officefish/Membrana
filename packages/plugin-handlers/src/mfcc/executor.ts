/**
 * `membrana.handler.mfcc` — первый живой плагин (M6′, #1961): executor поверх тембрового детектора
 * `@membrana/mfcc-analyzer-service` (свёртка `processWindow`, суд `evaluatePipe` по воротам калибровки).
 * Своей математики нет — плагин, судящий собственной копией счёта, мерит себя (урок 31.07).
 * Только чтение проб (норма #1950): единственный вход в дом — порт `CollectionSampleReader`; в
 * `plugin-results` результат кладёт хост. Отказ судьи по пробе — `outcome: 'refused'` с причиной
 * (не «дрона нет»); расхождение отпечатков контекста — именованный бросок `MfccRunRefusal`.
 */
import { evaluatePipe, processWindow, type MfccExtractor, type MfccVector } from '@membrana/mfcc-analyzer-service';
import type { HandlerManifest, PluginContext, PluginExecutor, RunFingerprints, RunResult } from '@membrana/plugin-contracts';
import { inputHashOf, sha256Hex, type CollectionSampleAudio, type CollectionSampleDescriptor, type CollectionSampleReader } from '../sample-reader.js';
import { decodeWavMono16 } from '../wav.js';
import { mfccConfigFromHash, mfccPipeSpecOf, type MfccGatePreset, type MfccStrictness } from './preset.js';

export type MfccSampleOutcome = 'detected' | 'not-detected' | 'refused';

export interface MfccSampleVerdict {
  readonly sampleId: string;
  readonly title: string;
  readonly contentHash: string;
  readonly sampleRate: number;
  readonly frames: number;
  readonly outcome: MfccSampleOutcome;
  readonly reason: string | null;
  readonly judgedCount: number | null;
  readonly silentCount: number | null;
  readonly passRate: number | null;
}

export interface MfccRunResult extends RunResult {
  readonly kind: 'handler';
  readonly collectionId: string;
  /** Отпечатки, измеренные САМИМ прогоном; совпадение с `ctx.fingerprints` — условие выхода. */
  readonly measured: RunFingerprints;
  /** Паспорт рабочей точки (ADR-0006 Р3): цифра без ворот и порогов неинтерпретируема. */
  readonly passport: {
    readonly presetConfigHash: string;
    readonly strictness: MfccStrictness;
    readonly minInBandRatio: number;
    readonly minPassRate: number;
    readonly minMagnitude: number;
    readonly judgedCoefficients: readonly number[];
  };
  readonly samples: readonly MfccSampleVerdict[];
  readonly summary: { readonly total: number; readonly detected: number; readonly notDetected: number; readonly refused: number };
}

export class MfccRunRefusal extends Error {
  override readonly name = 'MfccRunRefusal';
}

export interface MfccExecutorDeps {
  readonly manifest: HandlerManifest;
  readonly reader: CollectionSampleReader;
  /** Считалка, уже настроенная под пресет (meyda-экземпляр); ядро её только вызывает. */
  readonly extract: MfccExtractor;
  readonly preset: MfccGatePreset;
  readonly strictness: MfccStrictness;
  readonly now?: () => Date;
}

/**
 * `configHash` по M3: SHA-256 от `(pluginId, version, params)`; `params` несёт `windowSize` и всё,
 * от чего зависит вердикт (ворота целиком) — пересъёмка калибровки меняет отпечаток.
 */
export function mfccConfigHashOf(manifest: HandlerManifest, preset: MfccGatePreset, strictness: MfccStrictness): string {
  const spec = mfccPipeSpecOf(preset, strictness);
  return sha256Hex(
    JSON.stringify({
      pluginId: manifest.id,
      version: manifest.version,
      params: {
        windowSize: manifest.windowSize,
        presetConfigHash: preset.configHash,
        strictness,
        minInBandRatio: spec.minInBandRatio,
        minPassRate: spec.minPassRate,
        minMagnitude: spec.minMagnitude,
        judgedCoefficients: spec.judgedCoefficients,
        bounds: spec.bounds,
      },
    }),
  );
}

/** Отпечатки для `ctx.fingerprints` — тем же чтением и теми же формулами, что и прогон. */
export async function mfccFingerprintsOf(deps: MfccExecutorDeps, collectionId: string): Promise<RunFingerprints> {
  const samples = await deps.reader.listSamples(collectionId);
  const entries = [];
  for (const s of samples) entries.push({ sampleId: s.id, contentHash: (await deps.reader.readAudio(s)).contentHash });
  return { inputHash: inputHashOf(entries), configHash: mfccConfigHashOf(deps.manifest, deps.preset, deps.strictness) };
}

export function createMfccExecutor(deps: MfccExecutorDeps): PluginExecutor {
  const config = mfccConfigFromHash(deps.preset.configHash);
  if (config === null) throw new MfccRunRefusal(`отпечаток пресета «${deps.preset.configHash}» не разбирается`);
  const spec = mfccPipeSpecOf(deps.preset, deps.strictness);
  const configHash = mfccConfigHashOf(deps.manifest, deps.preset, deps.strictness);
  const now = deps.now ?? (() => new Date());

  const refused = (s: CollectionSampleDescriptor, audio: CollectionSampleAudio, frames: number, reason: string): MfccSampleVerdict => ({
    sampleId: s.id, title: s.title, contentHash: audio.contentHash, sampleRate: s.sampleRate, frames,
    outcome: 'refused', reason, judgedCount: null, silentCount: null, passRate: null,
  });

  const judge = (s: CollectionSampleDescriptor, audio: CollectionSampleAudio): MfccSampleVerdict => {
    if (s.audioFormat !== 'wav') return refused(s, audio, 0, `формат ${s.audioFormat} — декодер только wav PCM16`);
    const decoded = decodeWavMono16(audio.bytes);
    if (!decoded.ok) return refused(s, audio, 0, `wav не разобран: ${decoded.reason}`);
    if (decoded.audio.sampleRate !== config.sampleRate) {
      // Пересчитать вектор под чужие ворота нельзя — проба не судится, а не подгоняется (#1603).
      return refused(s, audio, 0, `частота ${decoded.audio.sampleRate} ≠ ${config.sampleRate}, на которой сняты ворота — несравнимо`);
    }
    // Кадрирование как у калибровки: подряд, без перекрытия, хвост короче кадра отброшен.
    const vectors: MfccVector[] = [];
    const pcm = decoded.audio.samples;
    for (let start = 0; start + config.bufferSize <= pcm.length; start += config.bufferSize) {
      const r = processWindow(
        // nodeId — имя источника кадра по контракту ядра; у серверного плагина это проба (#1972 п.2).
        { samples: pcm.subarray(start, start + config.bufferSize), sampleRate: config.sampleRate, startIndex: start, nodeId: s.id },
        config,
        deps.extract,
      );
      if (!r.ok) return refused(s, audio, vectors.length, `кадр ${start}: ${r.reason}`);
      // Отпечаток — пресетный (с частотой): ядро частоту в свой хэш не берёт, судья её требует.
      vectors.push({ ...r.vector, configHash: deps.preset.configHash });
    }
    const outcome = evaluatePipe(vectors, spec);
    if (!outcome.ok) return refused(s, audio, vectors.length, outcome.reason);
    const { report } = outcome;
    return {
      sampleId: s.id, title: s.title, contentHash: audio.contentHash, sampleRate: s.sampleRate, frames: vectors.length,
      outcome: report.detected ? 'detected' : 'not-detected', reason: null,
      judgedCount: report.judgedCount, silentCount: report.silentCount, passRate: report.passRate,
    };
  };

  return {
    async execute(ctx: PluginContext): Promise<MfccRunResult> {
      if (ctx.fingerprints.configHash !== configHash) {
        throw new MfccRunRefusal(`configHash контекста ${ctx.fingerprints.configHash} ≠ измеренного ${configHash}`);
      }
      const { collectionId } = ctx.address;
      const list = [...(await deps.reader.listSamples(collectionId))].sort((a, b) => (a.id < b.id ? -1 : 1));
      const verdicts: MfccSampleVerdict[] = [];
      for (const s of list) verdicts.push(judge(s, await deps.reader.readAudio(s)));
      const inputHash = inputHashOf(verdicts.map((v) => ({ sampleId: v.sampleId, contentHash: v.contentHash })));
      if (ctx.fingerprints.inputHash !== inputHash) {
        throw new MfccRunRefusal(`inputHash контекста ${ctx.fingerprints.inputHash} ≠ измеренного ${inputHash}: срез коллекции изменился`);
      }
      const count = (o: MfccSampleOutcome) => verdicts.filter((v) => v.outcome === o).length;
      return {
        kind: 'handler',
        completedAt: now(),
        collectionId,
        measured: { inputHash, configHash },
        passport: {
          presetConfigHash: deps.preset.configHash, strictness: deps.strictness,
          minInBandRatio: spec.minInBandRatio, minPassRate: spec.minPassRate, minMagnitude: spec.minMagnitude,
          judgedCoefficients: spec.judgedCoefficients ?? [],
        },
        samples: verdicts,
        summary: { total: verdicts.length, detected: count('detected'), notDetected: count('not-detected'), refused: count('refused') },
      };
    },
  };
}
