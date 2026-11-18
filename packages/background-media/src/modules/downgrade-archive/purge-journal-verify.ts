/**
 * График удалений и аудит прогона (#2632 блок g4b; шторм 08.10, Т4 и Т5; консилиум
 * archive-gc-journal-2026-10-08, вердикт 7: панель office — только чтение). Журнал и пульс — g4a
 * (`purge-journal-read.ts`).
 *
 * НАРУЖУ — ТОЛЬКО СЧЁТЧИКИ, ID И БУЛЕВЫ ПРИЗНАКИ: адресов файлов снимка аудит не отдаёт — по пути
 * только «существует ли сейчас» в порядке снимка.
 *
 * - `purgeSchedule` (Т5) — `frozen`-партии по сроку: что и когда уйдёт;
 * - `verifyRun` (Т4) — аудит СЕЙЧАС, а не по записи журнала: состояние партии, остаток строк архива,
 *   повторная проверка существования каждого пути снимка. Не смог посмотреть ≠ файла нет: ошибка
 *   наблюдения считается присутствием (как в g2).
 */
import { nodeBlobRemovalFs, type BlobStorageService } from '../../blob/blob-storage.service';

import type { PurgeJournalDb } from './purge-journal-read';

/** Есть ли файл по адресу снимка сейчас. */
export type BlobExistsProbe = (storageRef: string) => Promise<boolean>;

export function blobExistsProbe(blobs: Pick<BlobStorageService, 'resolvePath'>): BlobExistsProbe {
  return async (storageRef) => {
    try {
      return (await nodeBlobRemovalFs.stat(blobs.resolvePath(storageRef))) !== null;
    } catch {
      return true;
    }
  };
}

export async function purgeSchedule(db: PurgeJournalDb, limit: number) {
  const rows = await db.downgradeArchiveBatch.findMany({
    where: { state: 'frozen' },
    orderBy: { expiresAt: 'asc' },
    take: limit,
    select: { id: true, membraneId: true, deviceId: true, expiresAt: true, frozenBytes: true },
  });
  return rows.map((b) => ({ batchId: b.id, membraneId: b.membraneId, deviceId: b.deviceId, expiresAt: b.expiresAt, frozenBytes: Number(b.frozenBytes) }));
}
export type PurgeScheduleRow = Awaited<ReturnType<typeof purgeSchedule>>[number];

export async function verifyRun(db: PurgeJournalDb, exists: BlobExistsProbe, runId: string) {
  const run = await db.coldArchivePurgeRun.findUnique({ where: { id: runId }, select: { id: true, mode: true, status: true } });
  if (!run) return null;
  const jobs = await db.coldArchivePurgeJob.findMany({ where: { runId }, orderBy: { id: 'asc' } });
  const verified = [];
  for (const j of jobs) {
    const batch = j.batchId ? await db.downgradeArchiveBatch.findUnique({ where: { id: j.batchId }, select: { state: true } }) : null;
    const rowsRemaining = j.batchId ? await db.downgradeArchivedSample.count({ where: { batchId: j.batchId } }) : 0;
    const pathsExistNow: boolean[] = [];
    for (const ref of j.storageRefs) pathsExistNow.push(await exists(ref));
    const pathsRemaining = pathsExistNow.filter(Boolean).length;
    const batchGone = j.targetType !== 'batch' || (batch?.state === 'deleted' && rowsRemaining === 0);
    verified.push({ jobId: j.id, targetType: j.targetType, batchId: j.batchId, status: j.status, batchState: batch?.state ?? null, rowsRemaining, pathsTotal: pathsExistNow.length, pathsRemaining, pathsExistNow, clean: batchGone && pathsRemaining === 0 });
  }
  return { runId: run.id, mode: run.mode, status: run.status, clean: verified.every((v) => v.clean), jobs: verified };
}
export type PurgeRunVerification = NonNullable<Awaited<ReturnType<typeof verifyRun>>>;
