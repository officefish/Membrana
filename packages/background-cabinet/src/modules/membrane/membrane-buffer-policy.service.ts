/**
 * ORIGIN ПОЛИТИКИ ПЕРЕПОЛНЕНИЯ — запись в кабинете и разноска (#2308, вердикт M1).
 *
 * Три движения человека, и у каждого — своя ручка и свой объём разноски:
 *
 *   1. политика мембраны   — `setMembranePolicy`  → все приборы;
 *   2. галочка-привязка    — `setBinding`         → все приборы;
 *   3. политика прибора    — `setNodePolicy`      → этот прибор.
 *
 * Носитель политики мембраны — таблица `MembraneBufferPolicy` (одна строка на мембрану, держит
 * схема); отсутствие строки читается как `stop` со снятой привязкой. Запись — `upsert` по
 * `membraneId`: первое движение человека заводит строку, дальше правит её.
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
  effectiveDevicePolicy,
  explainBufferPolicy,
  membranePolicyScope,
  parseBufferPolicy,
  type BufferPolicy,
  type BufferPolicyDenyReason,
  type MembranePolicySetting,
} from './buffer-policy';
import { warnIfSmartCleanupGated } from './buffer-policy-gate-warn';

/** Как политика ложится в строку прибора. `stop` — параметры в DB NULL, чтобы ничего не протекало. */
function devicePolicyColumns(policy: BufferPolicy) {
  return {
    bufferPolicy: policy.mode,
    bufferPolicyParams: policy.params === null ? Prisma.DbNull : { ...policy.params },
  };
}

/** То же для строки настройки мембраны (имена колонок — `mode` / `params`). */
function membranePolicyColumns(policy: BufferPolicy) {
  return {
    mode: policy.mode,
    params: policy.params === null ? Prisma.DbNull : { ...policy.params },
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

    const setting = await this.prisma.membraneBufferPolicy.upsert({
      where: { membraneId },
      create: { membraneId, ...membranePolicyColumns(parsed.policy) },
      update: membranePolicyColumns(parsed.policy),
      select: { binding: true },
    });
    const contextSync = await this.contextFanout.syncAllNodes(membraneId);
    return { ok: true, bufferPolicy: parsed.policy, applyToAll: setting.binding, contextSync };
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
    await this.prisma.membraneBufferPolicy.upsert({
      where: { membraneId },
      create: { membraneId, binding: applyToAll },
      update: { binding: applyToAll },
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
    const scope = membranePolicyScope(await this.readSetting(node.membrane.id));
    if (scope.bufferPolicyBinding) return { ok: false, reason: 'binding_active' };
    if (!node.device) return { ok: false, reason: 'node_not_paired' };

    await this.prisma.device.update({
      where: { nodeId: node.id },
      data: devicePolicyColumns(parsed.policy),
      select: { id: true },
    });
    const contextSync = await this.contextFanout.syncNode(node.membrane.id, node.id);
    return {
      ok: true,
      nodeId: node.id,
      bufferPolicy: parsed.policy,
      effectiveBufferPolicy: effectiveDevicePolicy({
        binding: scope.bufferPolicyBinding,
        membrane: scope,
        device: {
          bufferPolicy: parsed.policy.mode,
          bufferPolicyParams: parsed.policy.params,
        },
      }),
      contextSync,
    };
  }

  /** Строка настройки мембраны или `null` — отсутствие законно (stop, привязка снята). */
  async readSetting(membraneId: string): Promise<MembranePolicySetting | null> {
    return this.prisma.membraneBufferPolicy.findUnique({ where: { membraneId } });
  }

  /** Вид политики мембраны для `membranes/me`: эффективная (через `effective()`), не сырая. */
  static membraneView(setting: MembranePolicySetting | null | undefined): {
    mode: BufferPolicy['mode'];
    params: BufferPolicy['params'];
    applyToAll: boolean;
  } {
    const scope = membranePolicyScope(setting);
    const explained = explainBufferPolicy(scope);
    // #2318 fail-closed: умная очистка в строке мембраны при выключенном гейте → stop + warn (один на мембрану).
    if (setting?.membraneId) warnIfSmartCleanupGated(explained, { kind: 'membrane', id: setting.membraneId });
    const { policy } = explained;
    return { mode: policy.mode, params: policy.params, applyToAll: scope.bufferPolicyBinding };
  }
}
