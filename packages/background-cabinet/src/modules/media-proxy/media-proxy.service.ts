/**
 * Библиотека прибора для браузера кабинета — через сервер кабинета.
 *
 * Браузер приходит с сессией пользователя; кабинет решает две вещи и только потом идёт в media:
 *   1. ручка есть в закрытом списке (`media-proxy-routes.ts`);
 *   2. прибор принадлежит мембране этого пользователя (та же связь, что собирает `media/session`).
 * Любое «нет» — один и тот же 404: по ответу нельзя отличить чужой прибор от несуществующего
 * и от ручки вне списка. В media кабинет идёт своим служебным ключом через мост
 * (`MediaBridgeService.forwardDeviceRequest`); браузер этот ключ не получает ни в теле, ни в
 * заголовках ответа, и в лог он не пишется.
 */
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { MediaBridgeService } from '../pair/media-bridge.service';

import {
  MEDIA_DEVICE_ID_RE,
  matchMediaProxyRoute,
  mediaProxyRequestHeaders,
  mediaProxyResponseHeaders,
  mediaProxyStatus,
} from './media-proxy-routes';

export interface MediaProxyRequest {
  readonly userId: string;
  readonly deviceId: string;
  readonly method: string;
  /** Путь после `/v1/media/devices/:deviceId`, со строкой запроса. */
  readonly pathWithQuery: string;
  readonly headers: Record<string, string | string[] | undefined>;
  /** Разобранный JSON (Nest) или сырой поток (multipart, см. `media-proxy-body.ts`). */
  readonly body: unknown;
}

export interface MediaProxyResponse {
  readonly status: number;
  readonly headers: Record<string, string>;
  /** Тело ответа media потоком; `null` — тела нет. */
  readonly body: Readable | null;
}

const NOT_FOUND = 'Not found';

@Injectable()
export class MediaProxyService {
  private readonly logger = new Logger(MediaProxyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bridge: MediaBridgeService,
  ) {}

  /** Прибор принадлежит мембране пользователя. */
  async ownsDevice(userId: string, deviceId: string): Promise<boolean> {
    if (!MEDIA_DEVICE_ID_RE.test(deviceId)) return false;
    const node = await this.prisma.node.findFirst({
      where: { membrane: { userId }, device: { mediaDeviceId: deviceId } },
      select: { id: true },
    });
    return node !== null;
  }

  async forward(req: MediaProxyRequest): Promise<MediaProxyResponse> {
    const match = matchMediaProxyRoute(req.method, req.pathWithQuery);
    if (!match) throw new NotFoundException(NOT_FOUND);
    if (!(await this.ownsDevice(req.userId, req.deviceId))) throw new NotFoundException(NOT_FOUND);

    const { route, target } = match;
    const headers = mediaProxyRequestHeaders(req.headers, route.body, req.deviceId);
    const body = bodyFor(route.body, req.body);
    if (body === undefined) delete headers['content-type'];

    const res = await this.bridge.forwardDeviceRequest(req.deviceId, target, {
      method: route.method,
      headers,
      ...(body === undefined ? {} : { body }),
    });

    const status = mediaProxyStatus(res.status);
    if (status !== res.status) {
      // Только числа и шаблон ручки: ни заголовков, ни тела.
      this.logger.warn({ deviceId: req.deviceId, route: route.path, mediaStatus: res.status }, 'media refused the cabinet proxy request');
    }
    return {
      status,
      headers: mediaProxyResponseHeaders(Object.fromEntries(res.headers.entries())),
      body: res.body ? Readable.fromWeb(res.body as unknown as WebReadableStream) : null,
    };
  }
}

type FetchBody = NonNullable<RequestInit['body']>;

function bodyFor(kind: 'none' | 'json' | 'raw', body: unknown): FetchBody | undefined {
  if (kind === 'none') return undefined;
  if (kind === 'json') return body === undefined || body === null ? undefined : JSON.stringify(body);
  if (body instanceof Readable) return Readable.toWeb(body) as unknown as FetchBody;
  if (Buffer.isBuffer(body)) return new Uint8Array(body);
  return undefined;
}
