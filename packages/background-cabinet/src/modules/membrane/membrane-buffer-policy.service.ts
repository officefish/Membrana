/**
 * ORIGIN ПОЛИТИКИ ПЕРЕПОЛНЕНИЯ — запись в кабинете и разноска (#2308, вердикт M1).
 *
 * Три движения человека, и у каждого — своя ручка и свой объём разноски:
 *
 *   1. политика мембраны   — `setMembranePolicy`  → все приборы;
 *   2. галочка-привязка    — `setBinding`         → все приборы;
 *   3. политика прибора    — `setNodePolicy`      → этот прибор.
 *
 * **Порядок несущий: сначала запись в кабинете, потом приборы** (как у тарифа, #2281). Отказ
 * media смену настройки не отменяет — наружу едет счёт `{updated, failed}`, чтобы страница
 * сказала правду «до одного прибора политика не доехала», а не показала новый режим при старом
 * поведении прибора.
 *
 * **Гейт параметров — здесь, при записи.** `smart_cleanup` без полного набора → `ok:false`,
 * режим НЕ записан, разноски нет. Сервер записей проверит то же ещё раз при разноске: два
 * сервера — две проверки, потому что каждый отвечает за своё обещание.
 *
 * **Разноска всегда, даже при снятой галочке.** Смена политики мембраны при снятой галочке не
 * меняет эффективное значение ни одного прибора — но разноска идемпотентна, дёшева и заодно
 * лечит дрейф копии. Правило «каждая запись → разноска» проще правила с исключениями, и его
 * можно проверить одним зубом.
 *
 * **Привязка — с подтверждением на сервере.** `confirmed: true` обязателен при включении:
 * галочка без подтверждения красна и здесь, а не только в форме. Снятие подтверждения не
 * требует — оно возвращает приборам их настройки, а не отбирает.
 */
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '../../prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MembraneContextFanoutService,
  type MembraneContextFanoutResult,
} from '../pair/membrane-context-fanout.service';
import {
  effectiveBufferPolicy,
  effectiveDevicePolicy,
  parseBufferPolicy,
  type BufferPolicy,
  type BufferPolicyDenyReason,
} from './buffer-policy';

/** Как политика ложится в строку. `stop` — параметры в DB NULL, чтобы ничего не протекало. */
function bufferPolicyColumns(policy: BufferPolicy) {
  return {
    bufferPolicy: policy.mode,
    bufferPolicyParams: policy.params === null ? Prisma.DbNull : { ...policy.params },
  };
}

export type MembranePolicyOutcome =
  | { ok: true; bufferPolicy: BufferPolicy; applyToAll: boolean; contextSync: MembraneContextFanoutResult }
  | { ok: false; reason: BufferPolicyDenyReason };

export type BindingOutcome =
  | { ok: true; applyToAll: boolean; contextSync: MembraneContextFanoutResult }
  | { ok: false; reason: BufferPolicyDenyReason };

export type NodePolicyOutcome =
  | {
      ok: true;
      nodeId: string;
      bufferPolicy: BufferPolicy;
      effectiveBufferPolicy: BufferPolicy;
      contextSync: MembraneContextFanoutResult;
    }
  | { ok: false; reason: BufferPolicyDenyReason };

@Injectable()
export class MembraneBufferPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contextFanout: MembraneContextFanoutService,
  ) {}

  /** Политика мембраны: пишется всегда (черновик при снятой галочке), разносится всегда. */
  async setMembranePolicy(membraneId: string, raw: unknown): Promise<MembranePolicyOutcome> {
    const parsed = parseBufferPolicy(raw);
    if (!parsed.ok) return { ok: false, reason: parsed.reason };

    const membrane = await this.prisma.membrane.update({
      where: { id: membraneId },
      data: bufferPolicyColumns(parsed.policy),
      select: { bufferPolicyBinding: true },
    });
    const contextSync = await this.contextFanout.syncAllNodes(membraneId);
    return { ok: true, bufferPolicy: parsed.policy, applyToAll: membrane.bufferPolicyBinding, contextSync };
  }

  /** Галочка-привязка. Включение — только с `confirmed: true`; снятие — без подтверждения. */
  async setBinding(
    membraneId: string,
    input: { applyToAll?: unknown; confirmed?: unknown },
  ): Promise<BindingOutcome> {
    const applyToAll = input.applyToAll === true;
    if (applyToAll && input.confirmed !== true) {
      return { ok: false, reason: 'binding_not_confirmed' };
    }
    await this.prisma.membrane.update({
      where: { id: membraneId },
      data: { bufferPolicyBinding: applyToAll },
      select: { id: true },
    });
    const contextSync = await this.contextFanout.syncAllNodes(membraneId);
    return { ok: true, applyToAll, contextSync };
  }

  /**
   * Собственная политика прибора. При стоящей галочке — отказ `binding_active`: запись была бы
   * молчаливым no-op, а оператор решил бы, что прибор переключён.
   */
  async setNodePolicy(userId: string, nodeId: string, raw: unknown): Promise<NodePolicyOutcome> {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      include: { membrane: true, device: true },
    });
    if (!node) throw new NotFoundException('Node not found');
    if (node.membrane.userId !== userId) throw new ForbiddenException('Node access denied');

    // Порядок проверок: сначала форма (что прислали), потом состояние (можно ли сейчас).
    // Оператор с неполными параметрами узнаёт об этом раньше, чем о стоящей галочке.
    const parsed = parseBufferPolicy(raw);
    if (!parsed.ok) return { ok: false, reason: parsed.reason };
    if (node.membrane.bufferPolicyBinding) return { ok: false, reason: 'binding_active' };
    if (!node.device) return { ok: false, reason: 'node_not_paired' };

    await this.prisma.device.update({
      where: { nodeId: node.id },
      data: bufferPolicyColumns(parsed.policy),
      select: { id: true },
    });
    const contextSync = await this.contextFanout.syncNode(node.membrane.id, node.id);
    return {
      ok: true,
      nodeId: node.id,
      bufferPolicy: parsed.policy,
      effectiveBufferPolicy: effectiveDevicePolicy({
        binding: node.membrane.bufferPolicyBinding,
        membrane: node.membrane,
        device: parsed.policy.mode === 'stop'
          ? { bufferPolicy: 'stop', bufferPolicyParams: null }
          : { bufferPolicy: 'smart_cleanup', bufferPolicyParams: parsed.policy.params },
      }),
      contextSync,
    };
  }

  /** Вид политики мембраны для `membranes/me`: эффективная (через `effective()`), не сырая. */
  static membraneView(membrane: {
    bufferPolicy?: unknown;
    bufferPolicyParams?: unknown;
    bufferPolicyBinding?: boolean;
  }): { mode: BufferPolicy['mode']; params: BufferPolicy['params']; applyToAll: boolean } {
    const policy = effectiveBufferPolicy(membrane);
    return { mode: policy.mode, params: policy.params, applyToAll: membrane.bufferPolicyBinding === true };
  }
}
