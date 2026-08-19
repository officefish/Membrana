/**
 * Ручки полевого узла (ADR-0027; блок b3 firebat-node-device, #1998). Два лица, два словаря:
 *  - оператор (ApiTokenGuard + DeviceGuard): поставить задание, посмотреть очередь и пульс;
 *  - узел (NodeKeyGuard, БЕЗ служебного токена): взять задание · сдать результат · пульс.
 * NodeKeyGuard висит ТОЛЬКО на ручках узла — на контроллере ключей (b2) его нет и не будет.
 * `outcome` — поле тела ответа (ok | stale_key | backoff), не HTTP-статус; stale_key поднимает
 * guard как 401, узел читает его по статусу и прекращает опрос до переустановки ключа.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiConsumes, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { DeviceGuard } from '../../common/guards/device.guard';
import { API_TOKEN_SECURITY } from '../../common/swagger/openapi.constants';
import type { UploadMetaOverride } from '../samples/samples.service';
import { SamplesService } from '../samples/samples.service';
import { NodeKeyGuard } from './node-key.guard';
import { NODE_KEY_HEADER } from './node-key.service';
import { TASK_KINDS, TaskQueueService, type EnqueueInput, type NodeTask, type TaskKind } from './task-queue.service';

const NODE_KEY_HEADER_NAME = 'X-Membrana-Node-Key';

const taskView = (t: NodeTask) => ({
  taskId: t.taskId,
  kind: t.kind,
  seconds: t.seconds ?? null,
  collectionId: t.collectionId ?? null,
  declared: t.declared ?? null,
  state: t.state,
  createdAt: t.createdAt.toISOString(),
  leaseUntil: t.leaseUntil ? t.leaseUntil.toISOString() : null,
  result: t.result,
});

export interface EnqueueTaskBody {
  kind: TaskKind;
  seconds?: number;
  collectionId?: string;
  declared?: Record<string, unknown>;
}

export interface PulseBody {
  pollerVersion?: string;
  lastOutcome?: 'ok' | 'stale_key' | 'backoff';
  note?: string;
}

@ApiTags('Firebat node')
@Controller('v1/devices/:deviceId/node')
@ApiParam({ name: 'deviceId', format: 'uuid' })
export class FirebatNodeController {
  constructor(
    private readonly queue: TaskQueueService,
    private readonly samples: SamplesService,
  ) {}

  // ───────── лицо оператора ─────────

  @Post('tasks')
  @UseGuards(ApiTokenGuard, DeviceGuard)
  @ApiSecurity(API_TOKEN_SECURITY)
  @ApiHeader({ name: 'X-Membrana-Token', required: true })
  @ApiOperation({ summary: 'Operator: enqueue a task for the node (capture N seconds into a collection / diagnostics)' })
  @ApiResponse({ status: 201, description: '{ outcome: ok, task, dropped } | { outcome: backoff, reason: queue_full }' })
  enqueue(@Param('deviceId') deviceId: string, @Body() body: EnqueueTaskBody) {
    if (!TASK_KINDS.includes(body?.kind)) {
      throw new BadRequestException(`kind must be one of ${TASK_KINDS.join(' | ')}`);
    }
    if (body.kind === 'capture') {
      if (!Number.isFinite(body.seconds) || (body.seconds ?? 0) <= 0) throw new BadRequestException('capture requires seconds > 0');
      if (!body.collectionId) throw new BadRequestException('capture requires collectionId');
    }
    const input: EnqueueInput = { kind: body.kind, seconds: body.seconds, collectionId: body.collectionId, declared: body.declared };
    const res = this.queue.enqueue(deviceId, input);
    if (res.outcome === 'backoff') return res;
    return { outcome: 'ok' as const, task: taskView(res.task), dropped: res.dropped };
  }

  @Get('tasks/queue')
  @UseGuards(ApiTokenGuard, DeviceGuard)
  @ApiSecurity(API_TOKEN_SECURITY)
  @ApiHeader({ name: 'X-Membrana-Token', required: true })
  @ApiOperation({ summary: 'Operator: queue snapshot and last pulse of the node' })
  snapshot(@Param('deviceId') deviceId: string) {
    const pulse = this.queue.lastPulse(deviceId);
    return {
      tasks: this.queue.list(deviceId).map(taskView),
      pulse: pulse ? { ...pulse, at: pulse.at.toISOString() } : null,
    };
  }

  // ───────── лицо узла (только ключ узла) ─────────

  @Get('tasks')
  @UseGuards(NodeKeyGuard)
  @ApiHeader({ name: NODE_KEY_HEADER_NAME, required: true, description: `node key (${NODE_KEY_HEADER})` })
  @ApiOperation({ summary: 'Node: lease one task from the head of the queue (or empty)' })
  @ApiResponse({ status: 200, description: '{ outcome: ok, task | null } | { outcome: backoff, retryAfterMs }' })
  lease(@Param('deviceId') deviceId: string) {
    const res = this.queue.lease(deviceId);
    if (res.outcome === 'backoff') return res;
    return { outcome: 'ok' as const, task: res.task ? taskView(res.task) : null };
  }

  @Post('tasks/:taskId/result')
  @UseGuards(NodeKeyGuard)
  @ApiConsumes('multipart/form-data')
  @ApiHeader({ name: NODE_KEY_HEADER_NAME, required: true })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiOperation({ summary: 'Node: hand in task result (multipart: file — the capture; meta — declared JSON; error — failure word)' })
  @ApiResponse({ status: 201, description: '{ outcome: ok, task }' })
  async result(@Param('deviceId') deviceId: string, @Param('taskId') taskId: string, @Req() req: FastifyRequest) {
    const leased = this.queue.list(deviceId).find((t) => t.taskId === taskId);
    if (!leased) throw new NotFoundException(`task ${taskId} unknown for device ${deviceId}`);
    if (leased.state !== 'leased') throw new BadRequestException(`task ${taskId} is ${leased.state}, not leased`);

    // Отказ узла приходит JSON-телом { error } (не multipart): с @fastify/multipart req.body при
    // multipart пуст, и слово причины терялось — узел Firebat 19.08 сдал «no file and no error word».
    const multipartReq = req as FastifyRequest & { isMultipart?: () => boolean };
    const isMultipart = typeof multipartReq.isMultipart === 'function' ? multipartReq.isMultipart() : true;
    const part = isMultipart ? await req.file() : undefined;
    let sampleId: string | undefined;
    let error: string | undefined;
    if (part) {
      if (!leased.collectionId) throw new BadRequestException('task has no collectionId — a file cannot be accepted');
      const buffer = await part.toBuffer();
      let meta: UploadMetaOverride | undefined;
      const metaField = part.fields?.meta;
      if (metaField && 'value' in metaField && typeof metaField.value === 'string') {
        try {
          meta = JSON.parse(metaField.value) as UploadMetaOverride;
        } catch {
          meta = undefined;
        }
      }
      const sample = await this.samples.upload(deviceId, leased.collectionId, buffer, part.mimetype, meta);
      sampleId = sample.id;
    } else {
      const errField = (req.body as { error?: string } | undefined)?.error;
      error = typeof errField === 'string' && errField ? errField : 'no file and no error word';
    }
    const done = this.queue.complete(deviceId, taskId, sampleId ? { ok: true, sampleId } : { ok: false, error });
    if (done.outcome !== 'ok') throw new BadRequestException(`cannot complete task ${taskId}: ${done.outcome}`);
    return { outcome: 'ok' as const, task: taskView(done.task) };
  }

  @Post('heartbeat')
  @UseGuards(NodeKeyGuard)
  @ApiHeader({ name: NODE_KEY_HEADER_NAME, required: true })
  @ApiOperation({ summary: 'Node: pulse — alive, poller version, last poll outcome' })
  heartbeat(@Param('deviceId') deviceId: string, @Body() body: PulseBody | undefined) {
    const pulse = this.queue.recordPulse(deviceId, {
      pollerVersion: body?.pollerVersion,
      lastOutcome: body?.lastOutcome,
      note: body?.note,
    });
    return { outcome: 'ok' as const, at: pulse.at.toISOString() };
  }
}
