/**
 * Настройка режима отбора при понижении — чтение и запись на мембране (#2587 b4a; ADR-0031).
 *
 * По образцу `ArchiveRetentionStore`: строки не заводит при чтении, отсутствие строки честно
 * отдаёт `isDefault: true`; запись — `upsert` по `membraneId` (одну строку держит схема). Отказ
 * формы — причиной из закрытого списка в теле (конвенция 12.08), не статусом 400.
 */
import { Injectable, Logger } from '@nestjs/common';

import {
  DEFAULT_DOWNGRADE_CRITERION,
  isDowngradeCriterion,
  resolveDowngradeCriterion,
  type DowngradeCriterion,
} from '../../domain/downgrade-policy';
import { PrismaService } from '../../prisma/prisma.service';

export interface DowngradePolicyView {
  readonly membraneId: string;
  readonly criterion: DowngradeCriterion;
  /** Строки нет (или она негодна) — действует умолчание. */
  readonly isDefault: boolean;
  readonly updatedAt: Date | null;
}

export type SetDowngradePolicyOutcome =
  | { readonly ok: true; readonly policy: DowngradePolicyView }
  | { readonly ok: false; readonly reason: 'unknown_criterion'; readonly detail: string };

/** Чтение/запись режима отбора при понижении на мембране; строку при чтении не заводит. */
@Injectable()
export class MembraneDowngradePolicyService {
  private readonly logger = new Logger(MembraneDowngradePolicyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Действующий режим мембраны: нет строки или мусор в ней — умолчание с `isDefault: true`. */
  async read(membraneId: string): Promise<DowngradePolicyView> {
    const row = await this.prisma.membraneDowngradePolicy.findUnique({ where: { membraneId } });
    if (!row) return { membraneId, criterion: DEFAULT_DOWNGRADE_CRITERION, isDefault: true, updatedAt: null };
    if (!isDowngradeCriterion(row.criterion)) {
      // CHECK миграции такого не пускает; строка всё же такая — второй пояс и голос в журнал.
      this.logger.warn({ membraneId, criterion: row.criterion }, 'downgrade-policy: режим вне списка — читаем умолчание');
      return { membraneId, criterion: resolveDowngradeCriterion(row.criterion), isDefault: true, updatedAt: row.updatedAt };
    }
    return { membraneId, criterion: row.criterion, isDefault: false, updatedAt: row.updatedAt };
  }

  /** Режим — только из закрытой тройки; что хранится, то и действует при следующем понижении. */
  async set(membraneId: string, raw: unknown): Promise<SetDowngradePolicyOutcome> {
    if (!isDowngradeCriterion(raw)) {
      return { ok: false, reason: 'unknown_criterion', detail: `режим «${String(raw)}» вне закрытой тройки` };
    }
    const row = await this.prisma.membraneDowngradePolicy.upsert({
      where: { membraneId },
      create: { membraneId, criterion: raw },
      update: { criterion: raw },
    });
    return { ok: true, policy: { membraneId, criterion: raw, isDefault: false, updatedAt: row.updatedAt } };
  }
}
