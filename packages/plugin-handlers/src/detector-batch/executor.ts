import type {
  BatchCollectionDetectorVerdict,
  BatchCollectionRunAggregate,
  BatchCollectionRunOutcome,
  BatchCollectionSampleResult,
  PluginContext,
  PluginExecutor,
  RunFingerprints,
  RunResult,
} from '@membrana/plugin-contracts';

import {
  inputHashOf,
  sha256Hex,
  type CollectionSampleAudio,
  type CollectionSampleDescriptor,
  type CollectionSampleReader,
} from '../sample-reader.js';
import { decodeWavMono16 } from '../wav.js';
import { DETECTOR_BATCH_MANIFEST } from './manifest.js';

export const DETECTOR_BATCH_MAX_SAMPLES = 2_000;

export interface DetectorBatchAnalysis {
  readonly verdicts: readonly BatchCollectionDetectorVerdict[];
}

export interface DetectorBatchAnalyzer {
  isAvailable?(): boolean;
  analyze(
    sample: CollectionSampleDescriptor,
    audio: { readonly samples: Float32Array; readonly sampleRate: number },
  ): Promise<DetectorBatchAnalysis>;
}

export interface DetectorBatchDeps {
  readonly reader: CollectionSampleReader;
  readonly analyzer: DetectorBatchAnalyzer;
  readonly now?: () => Date;
  readonly maxSamples?: number;
}

export interface DetectorBatchExecutor extends PluginExecutor {
  execute(ctx: PluginContext): Promise<DetectorBatchRunResult>;
}

interface BatchPayload {
  readonly deviceId: string;
  readonly collectionId: string;
  readonly sampleIds?: readonly string[];
}

export interface DetectorBatchRunResult extends RunResult, BatchCollectionRunOutcome {
  readonly kind: 'report';
}

const emptyAggregate = (): BatchCollectionRunAggregate => ({
  total: 0,
  ok: 0,
  failed: 0,
  skipped: 0,
  detected: 0,
  latencyP50Ms: 0,
  latencyP95Ms: 0,
});

const percentile = (values: readonly number[], fraction: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * fraction) - 1] ?? sorted[sorted.length - 1] ?? 0;
};

const aggregateOf = (results: readonly BatchCollectionSampleResult[]): BatchCollectionRunAggregate => {
  const okRows = results.filter((row) => row.status === 'ok');
  const latencies = okRows.map((row) => row.latencyMs ?? 0);
  return {
    total: results.length,
    ok: okRows.length,
    failed: results.filter((row) => row.status === 'failed').length,
    skipped: results.filter((row) => row.status === 'skipped').length,
    detected: okRows.filter((row) => row.detected === true).length,
    latencyP50Ms: percentile(latencies, 0.5),
    latencyP95Ms: percentile(latencies, 0.95),
  };
};

const payloadOf = (ctx: PluginContext): BatchPayload => {
  const raw = (ctx.payload ?? {}) as Record<string, unknown>;
  return {
    deviceId: typeof raw.deviceId === 'string' ? raw.deviceId : '',
    collectionId: typeof raw.collectionId === 'string' ? raw.collectionId : ctx.address.collectionId,
    ...(Array.isArray(raw.sampleIds)
      ? { sampleIds: raw.sampleIds.filter((id): id is string => typeof id === 'string' && id.length > 0) }
      : {}),
  };
};

const selectSamples = (
  all: readonly CollectionSampleDescriptor[],
  sampleIds: readonly string[] | undefined,
): readonly CollectionSampleDescriptor[] => {
  if (!sampleIds) return all;
  const wanted = new Set(sampleIds);
  return all.filter((sample) => wanted.has(sample.id));
};

export async function detectorBatchFingerprintsOf(
  reader: CollectionSampleReader,
  deviceId: string,
  collectionId: string,
  sampleIds?: readonly string[],
): Promise<RunFingerprints> {
  const selected = selectSamples(await reader.listSamples(deviceId, collectionId), sampleIds);
  const entries: Array<{ sampleId: string; contentHash: string }> = [];
  for (const sample of selected) {
    entries.push({ sampleId: sample.id, contentHash: (await reader.readAudio(sample)).contentHash });
  }
  return {
    inputHash: inputHashOf(entries),
    configHash: sha256Hex(JSON.stringify({
      pluginId: DETECTOR_BATCH_MANIFEST.id,
      version: DETECTOR_BATCH_MANIFEST.version,
      mode: 'drone-detection-detailed',
    })),
  };
}

const skipped = (sample: CollectionSampleDescriptor, reason: string): BatchCollectionSampleResult => ({
  sampleId: sample.id,
  title: sample.title,
  status: 'skipped',
  reason,
});

const failed = (sample: CollectionSampleDescriptor, reason: string): BatchCollectionSampleResult => ({
  sampleId: sample.id,
  title: sample.title,
  status: 'failed',
  reason,
});

const analyzeOne = async (
  sample: CollectionSampleDescriptor,
  audio: CollectionSampleAudio,
  analyzer: DetectorBatchAnalyzer,
): Promise<BatchCollectionSampleResult> => {
  const decoded = decodeWavMono16(audio.bytes);
  if (!decoded.ok) return skipped(sample, decoded.reason);
  if (decoded.audio.samples.length === 0) return skipped(sample, 'empty-audio');

  try {
    const { verdicts } = await analyzer.analyze(sample, decoded.audio);
    if (verdicts.length === 0) return failed(sample, 'detector-unavailable');
    if (verdicts.some((verdict) => !Number.isFinite(verdict.confidence) || !Number.isFinite(verdict.latencyMs))) {
      return failed(sample, 'invalid-metrics');
    }
    return {
      sampleId: sample.id,
      title: sample.title,
      status: 'ok',
      detected: verdicts.some((verdict) => verdict.isDrone),
      confidence: Math.max(...verdicts.map((verdict) => verdict.confidence)),
      latencyMs: verdicts.reduce((sum, verdict) => sum + verdict.latencyMs, 0),
      verdicts,
    };
  } catch (error) {
    return failed(sample, error instanceof Error ? error.message : String(error));
  }
};

export function createDetectorBatchExecutor(deps: DetectorBatchDeps): DetectorBatchExecutor {
  return {
    async execute(ctx): Promise<DetectorBatchRunResult> {
      const now = deps.now ?? (() => new Date());
      const payload = payloadOf(ctx);
      let selected: readonly CollectionSampleDescriptor[];
      try {
        selected = selectSamples(
          await deps.reader.listSamples(payload.deviceId, payload.collectionId),
          payload.sampleIds,
        );
      } catch (error) {
        return {
          completedAt: now(),
          kind: 'report',
          status: 'rejected',
          inputHash: ctx.fingerprints.inputHash,
          aggregate: emptyAggregate(),
          results: [],
          rejection: {
            reason: 'reader-failed',
            detail: error instanceof Error ? error.message : String(error),
          },
        };
      }

      if (selected.length === 0) {
        return {
          completedAt: now(),
          kind: 'report',
          status: 'rejected',
          inputHash: ctx.fingerprints.inputHash,
          aggregate: emptyAggregate(),
          results: [],
          rejection: { reason: 'empty', detail: 'В выбранном наборе нет проб для прогона' },
        };
      }

      const maxSamples = deps.maxSamples ?? DETECTOR_BATCH_MAX_SAMPLES;
      if (selected.length > maxSamples) {
        return {
          completedAt: now(),
          kind: 'report',
          status: 'rejected',
          inputHash: ctx.fingerprints.inputHash,
          aggregate: emptyAggregate(),
          results: [],
          rejection: {
            reason: 'limit-exceeded',
            detail: `В наборе ${selected.length} проб, предел одного прогона ${maxSamples}`,
          },
        };
      }

      if (deps.analyzer.isAvailable?.() === false) {
        return {
          completedAt: now(),
          kind: 'report',
          status: 'rejected',
          inputHash: ctx.fingerprints.inputHash,
          aggregate: emptyAggregate(),
          results: [],
          rejection: {
            reason: 'detector-unavailable',
            detail: 'Детекторный анализатор недоступен до начала прогона',
          },
        };
      }

      const entries: Array<{ sampleId: string; contentHash: string }> = [];
      const results: BatchCollectionSampleResult[] = [];
      let fingerprintComplete = true;
      for (const sample of selected) {
        try {
          const audio = await deps.reader.readAudio(sample);
          entries.push({ sampleId: sample.id, contentHash: audio.contentHash });
          results.push(await analyzeOne(sample, audio, deps.analyzer));
        } catch (error) {
          fingerprintComplete = false;
          results.push(failed(sample, error instanceof Error ? error.message : String(error)));
        }
      }

      const measuredInputHash = fingerprintComplete ? inputHashOf(entries) : ctx.fingerprints.inputHash;
      if (fingerprintComplete && measuredInputHash !== ctx.fingerprints.inputHash) {
        throw new Error(
          `inputHash изменился между снимком и прогоном: ${ctx.fingerprints.inputHash} -> ${measuredInputHash}`,
        );
      }

      return {
        completedAt: now(),
        kind: 'report',
        status: 'completed',
        inputHash: ctx.fingerprints.inputHash,
        aggregate: aggregateOf(results),
        results,
        rejection: null,
      };
    },
  };
}
