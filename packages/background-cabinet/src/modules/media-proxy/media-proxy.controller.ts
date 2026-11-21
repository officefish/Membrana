/**
 * `/v1/media/devices/:deviceId/*` — библиотека прибора для браузера кабинета через сервер кабинета.
 *
 * Сессия пользователя (`SessionGuard`); решения «пускать ли» — в `MediaProxyService` (закрытый
 * список ручек + принадлежность прибора мембране пользователя). Ответ media уходит потоком: статус,
 * заголовки из списка, тело как есть — так бинарь записи не собирается в памяти кабинета.
 */
import { All, Controller, Param, Req, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';

import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';

import { MediaProxyService } from './media-proxy.service';

export const MEDIA_PROXY_PREFIX = 'v1/media/devices';

/** Путь после `/v1/media/devices/:deviceId` (со строкой запроса) из сырого адреса запроса. */
export function proxySubpath(url: string, deviceId: string): string {
  const marker = `/${MEDIA_PROXY_PREFIX}/${deviceId}`;
  const at = url.indexOf(marker);
  return at < 0 ? '' : url.slice(at + marker.length);
}

@ApiTags('Sample library')
@Controller(MEDIA_PROXY_PREFIX)
@UseGuards(SessionGuard)
export class MediaProxyController {
  constructor(private readonly proxy: MediaProxyService) {}

  @All(':deviceId/*')
  @ApiExcludeEndpoint()
  async forward(
    @Req() req: AuthenticatedRequest,
    @Param('deviceId') deviceId: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const out = await this.proxy.forward({
      userId: req.authUser!.id,
      deviceId,
      method: req.method,
      pathWithQuery: proxySubpath(req.url, deviceId),
      headers: req.headers,
      body: req.body,
    });
    reply.status(out.status).headers(out.headers);
    await reply.send(out.body ?? '');
  }
}
