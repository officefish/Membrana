import { z } from 'zod';

/**
 * Сводка канонического бенчмарк-прогона детекторов для панели (#454).
 *
 * Push-ingest (ADR 0004): локальный `yarn benchmark:push` дистиллирует
 * `data/detectors-benchmark/v0.2/reports/latest.json` и POST'ит сюда; office —
 * тупой in-memory транспорт, ничего не хранит на диске. Локальный DTO без
 * импорта @membrana/core (BACKGROUND_SERVERS.md).
 *
 * Q3 data-минимизация: только агрегаты. `.strict()` на каждом уровне —
 * попытка протащить `perSample` (пер-файловые предсказания, сырьё) → 400.
 */
const detectorMetricsSchema = z
  .object({
    tp: z.number().int().nonnegative(),
    fp: z.number().int().nonnegative(),
    fn: z.number().int().nonnegative(),
    tn: z.number().int().nonnegative(),
    precision: z.number().min(0).max(1),
    recall: z.number().min(0).max(1),
    f1: z.number().min(0).max(1),
    latencyP50Ms: z.number().nonnegative().optional(),
    latencyP95Ms: z.number().nonnegative().optional(),
  })
  .strict();

const detectorEntrySchema = z
  .object({
    name: z.string().min(1),
    family: z.string().min(1),
    status: z.string().min(1),
    /** Отсутствует у scaffold-детекторов (в таблице канона они «—»). */
    metrics: detectorMetricsSchema.optional(),
  })
  .strict();

export const benchmarkReportSchema = z
  .object({
    /** Происхождение чисел (консилиум quality-control-contour): дата прогона… */
    generatedAt: z.string().min(1),
    /** …версия корпуса… */
    datasetVersion: z.string().min(1),
    /** …и объём выборки. */
    sampleCount: z.number().int().positive(),
    detectors: z.array(detectorEntrySchema).min(1).max(24),
  })
  .strict();

export type BenchmarkReportDto = z.infer<typeof benchmarkReportSchema>;
