/**
 * Журнал fail-closed гейта умной очистки (#2318, долг D-1): строка мембраны или прибора хранит
 * `smart_cleanup`, а переключатель выключен — эффективная политика `stop`, и об этом сказано
 * warn с id субъекта. После backfill #2308 такой строки быть не должно; если она есть — это
 * след старой записи, и оператор обязан её увидеть в журнале, а не догадываться по витрине.
 *
 * Дедупликация — память процесса, ключ = субъект (`membrane:<id>` / `device:<id>`): политику
 * кабинет читает на каждую загрузку страницы мембраны и на каждую разноску по всем приборам,
 * и warn на каждое чтение был бы шумом, а не журналом. Один раз на субъект за жизнь процесса;
 * рестарт повторит — журнал новый. Носитель общий для трёх читателей (страница мембраны,
 * origin-сервис, разноска): один субъект — один warn, откуда бы его ни прочитали.
 *
 * Чистые функции носителя (`explainBufferPolicy`, `explainDevicePolicy`) не логируют — они
 * только называют причину подмены; логирует этот модуль.
 */
import { Logger } from '@nestjs/common';

import { SMART_CLEANUP_UNAVAILABLE_REASON, type ExplainedBufferPolicy } from './buffer-policy';

const logger = new Logger('BufferPolicyGate');
const warned = new Set<string>();

export interface GateWarnSubject {
  readonly kind: 'membrane' | 'device';
  readonly id: string;
  /** Для прибора — его мембрана, чтобы строка журнала была адресной с обеих сторон. */
  readonly membraneId?: string | null;
}

/** Сказать warn, если чтение подменило умную очистку на `stop` из-за гейта; иначе — тишина. */
export function warnIfSmartCleanupGated(explained: ExplainedBufferPolicy, subject: GateWarnSubject): void {
  if (explained.fallback !== SMART_CLEANUP_UNAVAILABLE_REASON) return;
  const key = `${subject.kind}:${subject.id}`;
  if (warned.has(key)) return;
  warned.add(key);
  const where =
    subject.kind === 'membrane'
      ? `мембрана ${subject.id}`
      : `прибор ${subject.id} (мембрана ${subject.membraneId ?? '—'})`;
  logger.warn(
    `${where} хранит режим умной очистки, а алгоритма T12 нет — эффективная политика stop (#2318, fail-closed)`,
  );
}

/** Только для зубов: забыть, о ком уже сказано. */
export function resetSmartCleanupGateWarningsForTests(): void {
  warned.clear();
}
