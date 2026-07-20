import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { canAccessSection, PUBLIC_IDENTITY } from './panel-auth-core';
import { BRIDGE_GATED_SECTIONS } from './panel-bridge-sections';
import { PanelPublic } from './panel-auth.decorators';
import { PanelAuthGuard, type PanelRequest } from './panel-auth.guard';

/**
 * Цель `forward_auth` маршрут-моста панели (GRP1, консилиум
 * graphify-research-tree-panel-sections). Caddy на `/panel/section/<id>/*` бьёт
 * сюда с оригинальной cookie; office — единственный арбитр:
 *   - 204 → доступ есть, Caddy отдаёт статику блока;
 *   - 403 → нет доступа;  - 404 → раздел не под мостом.
 *
 * `@PanelPublic` — guard разрешает вход и проставляет `panelIdentity`, а решение
 * по разделу принимает этот handler через `canAccessSection` (реестр
 * BRIDGE_GATED_SECTIONS). Логики ролей в Caddy нет.
 */
@Controller('v1/panel/gate')
@UseGuards(PanelAuthGuard)
export class PanelGateController {
  @Get(':sectionId')
  @PanelPublic()
  gate(
    @Param('sectionId') sectionId: string,
    @Req() req: PanelRequest,
    @Res() res: FastifyReply,
  ): void {
    const section = BRIDGE_GATED_SECTIONS[sectionId];
    if (!section) {
      void res.status(404).send();
      return;
    }
    const identity = req.panelIdentity ?? PUBLIC_IDENTITY;
    const allowed = canAccessSection(identity.role, identity.grants, section.minRole, sectionId);
    void res.status(allowed ? 204 : 403).send();
  }
}
