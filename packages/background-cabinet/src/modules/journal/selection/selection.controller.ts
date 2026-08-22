/**
 * Транспорт выборки наружу. Блок c4b спринта `chart-list-plugin`.
 *
 * Здесь только ОТКРЫТИЕ уже собранной выборки и перечень собранных. Сборка (кнопка
 * «сгенерировать») приезжает вместе с портом заказа к media — это блок c5, и выводить наружу
 * ручку, за которой ещё нет исполнителя, значило бы завести мёртвый регулятор.
 *
 * Адрес выборки — то, ради чего вся сущность заведена (Т3): человек уходит со страницы и завтра
 * открывает выборку по адресу, а не собирает её заново.
 */
import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';

import { SessionGuard, type AuthenticatedRequest } from '../../../common/guards/session.guard';
import { ChartListSelectionService, type StoredSelection } from './selection.service';

/** Как из запроса достаётся мембрана пользователя — тем же путём, что у ленты журнала. */
export interface MembraneResolver {
  membraneIdOf(userId: string): Promise<string>;
}

@Controller('v1/telemetry/chart-list')
@UseGuards(SessionGuard)
export class ChartListSelectionController {
  constructor(
    private readonly selections: ChartListSelectionService,
    private readonly membranes: MembraneResolver,
  ) {}

  @Get()
  async listRecent(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ): Promise<{ readonly selections: readonly StoredSelection[] }> {
    const membraneId = await this.membranes.membraneIdOf(req.authUser!.id);
    const parsed = Number.parseInt(limit ?? '', 10);
    const take = Number.isFinite(parsed) && parsed > 0 && parsed <= 50 ? parsed : 20;
    return { selections: await this.selections.listRecent(membraneId, take) };
  }

  @Get(':selectionId')
  async open(
    @Req() req: AuthenticatedRequest,
    @Param('selectionId') selectionId: string,
  ): Promise<StoredSelection> {
    const membraneId = await this.membranes.membraneIdOf(req.authUser!.id);
    return this.selections.openById(membraneId, selectionId);
  }
}
