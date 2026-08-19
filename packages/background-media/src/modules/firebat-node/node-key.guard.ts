/**
 * NodeKeyGuard — вход только для ручек узла (ADR-0027 Р3). Не смешивается с ApiTokenGuard:
 * тот — словарь внутреннего API, этот — словарь узла. Чужое устройство — 403, не 401:
 * ключ настоящий, адрес не его.
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { NODE_KEY_HEADER, NodeKeyService } from './node-key.service';

export interface NodeKeyRequest extends FastifyRequest {
  nodeKey?: { keyId: string; deviceId: string };
}

@Injectable()
export class NodeKeyGuard implements CanActivate {
  constructor(private readonly keys: NodeKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<NodeKeyRequest>();
    const deviceId = (req.params as { deviceId?: string }).deviceId;
    if (!deviceId) throw new ForbiddenException('deviceId required');
    const header = req.headers[NODE_KEY_HEADER];
    const raw = Array.isArray(header) ? header[0] : header;
    const res = await this.keys.verify(raw, deviceId);
    switch (res.verdict) {
      case 'ok':
        req.nodeKey = { keyId: res.keyId, deviceId: res.deviceId };
        return true;
      case 'foreign_device':
        throw new ForbiddenException('node key belongs to another device');
      case 'missing':
        throw new UnauthorizedException(`Missing ${NODE_KEY_HEADER} header`);
      case 'revoked':
        throw new UnauthorizedException('node key revoked');
      default:
        throw new UnauthorizedException('node key unknown');
    }
  }
}
