/**
 * Транспорт выборки наружу. Блок c4b спринта `chart-list-plugin`.
 *
 * Три ручки: собрать выборку, открыть собранную, перечислить собранные. Сборка появилась здесь
 * ПОСЛЕ порта заказа к media (c5c) — до него ручка была бы мёртвым регулятором, и её тут не было.
 *
 * Адрес выборки — то, ради чего вся сущность заведена (Т3): человек уходит со страницы и завтра
 * открывает выборку по адресу, а не собирает её заново.
 */
import { BadRequestException, Body, Controller, Get, Injectable, NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

import { SessionGuard, type AuthenticatedRequest } from '../../../common/guards/session.guard';
import { ChartListSelectionService, type StoredSelection } from './selection.service';
import { ChartListOrchestrator, type GenerateOutcome } from './chart-list.orchestrator';

/**
 * Мембрана пользователя по его идентификатору.
 *
 * КЛАСС, А НЕ ИНТЕРФЕЙС — намеренно: Nest внедряет по значению во время исполнения, а интерфейс
 * до рантайма не доживает. Интерфейс здесь дал бы зелёный typecheck и падение при старте — тот
 * самый зелёный, который ничего не удостоверяет. Поймано разбором проводов, не типами.
 */
@Injectable()
export class MembraneResolver {
  constructor(private readonly prisma: PrismaService) {}

  async membraneIdOf(userId: string): Promise<string> {
    const found = await this.prisma.membrane.findUnique({ where: { userId }, select: { id: true } });
    if (!found) throw new NotFoundException('Мембрана пользователя не найдена');
    return found.id;
  }
}

@Controller('v1/telemetry/chart-list')
@UseGuards(SessionGuard)
export class ChartListSelectionController {
  constructor(
    private readonly selections: ChartListSelectionService,
    private readonly membranes: MembraneResolver,
    private readonly orchestrator: ChartListOrchestrator,
  ) {}

  /**
   * Собрать выборку. Кнопка «сгенерировать» человека.
   *
   * Отказ приходит ПОЛЕМ, а не кодом 4xx: «задание отвергнуто», «фон не измерен», «критерий вне
   * тройки» — это исходы работы, о которых оператор должен прочесть словами, а не увидеть
   * красную плашку без причины. Ошибкой запроса остаётся только негодная форма тела.
   */
  @Post()
  async generate(
    @Req() req: AuthenticatedRequest,
    @Body() body: { entryIds?: unknown; volume?: unknown; criterion?: unknown },
  ): Promise<GenerateOutcome> {
    const entryIds = Array.isArray(body?.entryIds)
      ? body.entryIds.filter((v): v is string => typeof v === 'string' && v.length > 0)
      : null;
    if (!entryIds) throw new BadRequestException('entryIds: перечень адресов записей обязателен');
    if (typeof body?.volume !== 'number') throw new BadRequestException('volume: число обязательно');
    if (typeof body?.criterion !== 'string') throw new BadRequestException('criterion: строка обязательна');

    const membraneId = await this.membranes.membraneIdOf(req.authUser!.id);
    return this.orchestrator.generate({
      userId: req.authUser!.id,
      membraneId,
      entryIds,
      volume: body.volume,
      criterion: body.criterion,
    });
  }

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
