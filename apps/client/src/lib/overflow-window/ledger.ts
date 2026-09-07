import { BUFFER_COLLECTION_ID, type MediaLibrarySnapshot } from '@membrana/media-library-service';

import { formatBytes } from './reasonTexts';

/**
 * Счёт буфера для сводки «что и сколько ушло» (M5 (г), T11). Читается из ЛОКАЛЬНОГО снимка
 * библиотеки — без запроса к серверу; арифметика чистая и проверяется таблицей случаев.
 */
export interface BufferLedgerSnapshot {
  readonly bufferSamples: number;
  readonly bufferBytes: number;
  /** Пробы вне буфера — в наборах пользователя и системных; рост = вывоз. */
  readonly outsideSamples: number;
}

export function readBufferLedger(snapshot: MediaLibrarySnapshot): BufferLedgerSnapshot {
  let bufferSamples = 0;
  let bufferBytes = 0;
  let outsideSamples = 0;
  for (const [collectionId, samples] of Object.entries(snapshot.samplesByCollection)) {
    if (collectionId === BUFFER_COLLECTION_ID) {
      bufferSamples = samples.length;
      for (const s of samples) bufferBytes += Number.isFinite(s.sizeBytes) ? s.sizeBytes : 0;
    } else {
      outsideSamples += samples.length;
    }
  }
  // Сервер может сообщить число проб буфера раньше, чем список доехал в снимок (#2232:
  // занижать нельзя) — берём большее из списка и объявленного.
  const declared = snapshot.collections.find((c) => c.id === BUFFER_COLLECTION_ID)?.sampleCount;
  if (typeof declared === 'number' && declared > bufferSamples) bufferSamples = declared;
  return { bufferSamples, bufferBytes, outsideSamples };
}

/** Что обещано в подтверждении чистки: счёт проб и байт, которые уйдут. */
export interface CleanPromise {
  readonly samples: number;
  readonly bytes: number;
}

/** Факт после чистки: «удалено: N» — не «вывезено» и не «успех». */
export interface CleanOutcome {
  readonly kind: 'cleaned';
  readonly promised: CleanPromise;
  readonly removedSamples: number;
  readonly removedBytes: number;
  /** Обещано ≠ ушло — показываем, не глотаем. */
  readonly mismatch: boolean;
}

export function settleClean(
  before: BufferLedgerSnapshot,
  after: BufferLedgerSnapshot,
  promised: CleanPromise,
): CleanOutcome {
  const removedSamples = Math.max(0, before.bufferSamples - after.bufferSamples);
  const removedBytes = Math.max(0, before.bufferBytes - after.bufferBytes);
  return {
    kind: 'cleaned',
    promised,
    removedSamples,
    removedBytes,
    mismatch: removedSamples !== promised.samples,
  };
}

/** Пусто = показать пусто: ноль и пустое состояние, не «успех» без числа. */
export function describeCleanOutcome(outcome: CleanOutcome): string {
  if (outcome.removedSamples === 0 && outcome.promised.samples === 0) {
    return 'Удалено: 0 — буфер был пуст, освобождать нечего.';
  }
  const base = `Удалено из буфера: ${outcome.removedSamples} проб · ${formatBytes(outcome.removedBytes)}.`;
  if (!outcome.mismatch) return base;
  return `${base} Обещано ${outcome.promised.samples}, ушло ${outcome.removedSamples} — расхождение, проверьте буфер.`;
}

/** Что ушло из буфера с момента остановки: вывезено (в наборы) ≠ удалено. */
export interface SinceStopDelta {
  readonly gone: number;
  readonly exported: number;
  readonly deleted: number;
}

export function deltaSinceStop(base: BufferLedgerSnapshot, now: BufferLedgerSnapshot): SinceStopDelta {
  const gone = Math.max(0, base.bufferSamples - now.bufferSamples);
  const exported = Math.min(gone, Math.max(0, now.outsideSamples - base.outsideSamples));
  return { gone, exported, deleted: gone - exported };
}

export function describeSinceStop(delta: SinceStopDelta): string {
  if (delta.gone === 0) return 'С момента остановки из буфера ничего не ушло: вывезено 0 · удалено 0.';
  return `С момента остановки: вывезено в наборы ${delta.exported} · удалено ${delta.deleted}.`;
}
