import { z } from 'zod';

/**
 * Локальный DTO записи drift-anchor якоря (ADR 0004, Р1-поправка).
 *
 * НЕ импортирует `DriftAnchorRecord` из `@membrana/core` — background-office
 * документирован как автономный от монорепо-клиента (BACKGROUND_SERVERS.md:
 * «локальные DTO»; единственное разрешённое исключение зависимости от
 * `packages/*` — `@membrana/rag-service`, R4). Схема structurally совпадает с
 * core-типом, но объявлена самостоятельно, как `commentSchema` в
 * `linear.controller.ts`.
 *
 * Ключ хранения — `${anchorKind}:${anchorSource}` (три ожидаемых значения:
 * code:ci, code:schedule, data:schedule — консилиум drift-anchor-triggers).
 */
export const driftAnchorRecordSchema = z.object({
  anchorKind: z.enum(['data', 'code']),
  anchorSource: z.enum(['ci', 'schedule']),
  detectorVersion: z.string().min(1),
  imageFrozenAt: z.string().nullable(),
  delta: z.number().finite(),
  verdict: z.enum(['ok', 'drift', 'broken']),
  takenAt: z.string().min(1),
  metrics: z.record(z.string(), z.number()),
});

export type DriftAnchorRecordDto = z.infer<typeof driftAnchorRecordSchema>;

export function driftAnchorRecordKey(
  rec: Pick<DriftAnchorRecordDto, 'anchorKind' | 'anchorSource'>,
): string {
  return `${rec.anchorKind}:${rec.anchorSource}`;
}
