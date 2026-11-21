/**
 * ORIGIN ПРИЗНАКА «ВОЗОБНОВЛЯТЬ СЦЕНАРИЙ ПРИ СТАРТЕ СТУДИИ» (ADR-0033 Р1).
 *
 * Признак прибора (`Device.scenarioAutoResume`, умолчание ВЫКЛ) меняет владелец мембраны.
 * Порядок тот же, что у политики прибора (#2308): сначала запись в кабинете, потом разноска
 * контекста на этот прибор (`syncNode`) — второго носителя до прибора нет. Отказ media смену не
 * отменяет: наружу едет счёт `{updated, failed}`.
 *
 * Конвенция 12.08: доменный отказ — `200 { ok:false, reason }`; 403/404 — транспорту.
 */
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import {
  MembraneContextFanoutService,
  type MembraneContextFanoutResult,
} from '../pair/membrane-context-fanout.service';

export type ScenarioAutoResumeOutcome =
  | { ok: true; nodeId: string; scenarioAutoResume: boolean; contextSync: MembraneContextFanoutResult }
  | { ok: false; reason: 'invalid_value' | 'node_not_paired' };

@Injectable()
export class NodeScenarioAutoResumeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contextFanout: MembraneContextFanoutService,
  ) {}

  async setNodeAutoResume(userId: string, nodeId: string, raw: unknown): Promise<ScenarioAutoResumeOutcome> {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      include: { membrane: true, device: true },
    });
    if (!node) throw new NotFoundException('Node not found');
    if (node.membrane.userId !== userId) throw new ForbiddenException('Node access denied');

    // Только булево `enabled`: «"true"», 1 или пустое тело не включают возобновление молча.
    const enabled = (raw as { enabled?: unknown } | null | undefined)?.enabled;
    if (typeof enabled !== 'boolean') return { ok: false, reason: 'invalid_value' };
    if (!node.device) return { ok: false, reason: 'node_not_paired' };

    await this.prisma.device.update({
      where: { nodeId: node.id },
      data: { scenarioAutoResume: enabled },
      select: { id: true },
    });
    const contextSync = await this.contextFanout.syncNode(node.membrane.id, node.id);
    return { ok: true, nodeId: node.id, scenarioAutoResume: enabled, contextSync };
  }
}
