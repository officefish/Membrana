/**
 * Store срока хранения архива понижения на мембране (#2588 b1; ADR-0031 п.4).
 *
 * Единственный писатель и читатель таблицы `MembraneArchiveRetention`. Потребители:
 * дверь office→кабинет (b2) — `read`/`set`; поток понижения блока 1 (#2587) — `daysFor`
 * через ПОРТ `ArchiveRetentionReader` по токену `ARCHIVE_RETENTION_READER`, не через класс.
 *
 * ДВА ПРАВИЛА БЕЗОПАСНОЙ СТОРОНЫ (домен `archive-retention.ts`): строки нет → 14, чтение
 * строк не заводит; значение вне списка → 14 + предупреждение (CHECK в миграции такого не
 * пустит, домен — второй пояс).
 *
 * «НЕТ СТРОКИ» ≠ «НЕТ БАЗЫ». Отказ Prisma НЕ глотается в умолчание: если база недоступна,
 * `daysFor` отвергает, и понижение блока 1 падает целиком (вердикт 5 консилиума — на отказе
 * тариф не коммитить), а не морозит партию с молчаливыми «14 днями».
 */
import { Injectable, Logger } from '@nestjs/common';

import {
  InvalidRetentionDaysError,
  isValidRetentionDays,
  resolveRetentionDays,
  type RetentionDays,
} from '../../domain/archive-retention';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Порт чтения срока для блока 1 (#2587): поток понижения инжектит его по токену
 * `ARCHIVE_RETENTION_READER` и до влития этого модуля держит провайдер-умолчание «всегда 14».
 */
export interface ArchiveRetentionReader {
  /** Эффективный срок мембраны в днях: строка есть и годна → её значение, иначе 14. */
  daysFor(membraneId: string): Promise<RetentionDays>;
}

/** DI-токен порта чтения срока. Строка, а не Symbol — токен пересекает границу модулей. */
export const ARCHIVE_RETENTION_READER = 'ARCHIVE_RETENTION_READER';

/** Срок мембраны глазами двери office: число и признак «строки нет, это умолчание». */
export interface ArchiveRetentionView {
  readonly membraneId: string;
  readonly retentionDays: RetentionDays;
  readonly isDefault: boolean;
  /** `null`, пока строки нет. */
  readonly updatedAt: Date | null;
  readonly updatedBy: string | null;
}

@Injectable()
export class ArchiveRetentionStore implements ArchiveRetentionReader {
  private readonly logger = new Logger(ArchiveRetentionStore.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Срок и его происхождение. Строк не заводит; отказ базы пробрасывает. */
  async read(membraneId: string): Promise<ArchiveRetentionView> {
    const row = await this.prisma.membraneArchiveRetention.findUnique({ where: { membraneId } });
    if (!row) {
      return { membraneId, retentionDays: resolveRetentionDays(null), isDefault: true, updatedAt: null, updatedBy: null };
    }
    if (!isValidRetentionDays(row.days)) {
      // CHECK миграции такого не пускает; если строка всё же такая — второй пояс и голос.
      this.logger.warn(
        { membraneId, days: row.days },
        'archive-retention: срок вне закрытого списка — читаем умолчание (fail-safe хранения)',
      );
      return { membraneId, retentionDays: resolveRetentionDays(row.days), isDefault: true, updatedAt: row.updatedAt, updatedBy: row.updatedBy };
    }
    return { membraneId, retentionDays: row.days, isDefault: false, updatedAt: row.updatedAt, updatedBy: row.updatedBy };
  }

  async daysFor(membraneId: string): Promise<RetentionDays> {
    return (await this.read(membraneId)).retentionDays;
  }

  /**
   * Поставить срок. Проверка списка — ДО обращения к базе: на `2` ни одного вызова Prisma.
   * Одна строка на мембрану — `upsert` по `membraneId`; повтор того же значения строк не плодит.
   * Существование мембраны здесь не проверяется — это забота двери (404 в b2).
   */
  async set(membraneId: string, days: unknown, actor: string): Promise<ArchiveRetentionView> {
    if (!isValidRetentionDays(days)) {
      throw new InvalidRetentionDaysError(days);
    }
    const row = await this.prisma.membraneArchiveRetention.upsert({
      where: { membraneId },
      create: { membraneId, days, updatedBy: actor },
      update: { days, updatedBy: actor },
    });
    return { membraneId, retentionDays: days, isDefault: false, updatedAt: row.updatedAt, updatedBy: row.updatedBy };
  }
}
