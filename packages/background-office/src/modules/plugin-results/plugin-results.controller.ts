/**
 * Приёмник моста media → office (блок b2 спринта `plugin-results-bridge`, #1961).
 *
 * Единственный писатель в дом результатов — сам дом: запись идёт через существующий
 * `PluginResultsService.writeRun`, тем же путём, что у скрипта 18.08 и будущих хостов офиса.
 * Ключ — класс `X-Membrana-Token` (`ApiTokenGuard`), тот же, что у обратного направления
 * office → media. Идемпотентность — у хранилища (upsert по `{pluginId, version, collectionId,
 * runId}`): повтор того же прогона — `200 { ok: true }`, не 500, и мост вправе повторить.
 *
 * Чтение (`GET /plugin-results/runs?collectionId=…`) — для приёмки «документ читается
 * обратно, не из лога» (b5): тот же `readRuns`, что у дома, `stale` считается на лету.
 */
import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { writeRunBodySchema } from './plugin-results.dto';
import { PluginResultsService } from './plugin-results.service';
import type { ReadRunsFilter, RunRecordView } from './plugin-results.types';

@ApiTags('plugin-results')
@Controller('plugin-results')
@UseGuards(ApiTokenGuard)
@ApiBearerAuth('X-Membrana-Token')
export class PluginResultsController {
  constructor(private readonly results: PluginResultsService) {}

  @Post('runs')
  @ApiOperation({ summary: 'Принять RunRecord (+ StateRecord) от хоста плагинов — мост media → office (#1961)' })
  @ApiResponse({ status: 200, description: 'Записано (или уже было — idempotent upsert)' })
  @ApiResponse({ status: 400, description: 'Форма не по контрактам plugin-contracts' })
  @ApiResponse({ status: 401, description: 'Нет или неверный X-Membrana-Token' })
  async writeRun(@Body() raw: unknown): Promise<{ ok: true; runId: string }> {
    const parsed = writeRunBodySchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    // DTO выводится в контракт (зуб типов в dto): кастов на границе нет.
    await this.results.writeRun(parsed.data.run, parsed.data.state);
    return { ok: true, runId: parsed.data.run.address.runId };
  }

  @Get('runs')
  @ApiOperation({ summary: 'Прочитать прогоны коллекции из дома результатов (stale — по чтению)' })
  @ApiResponse({ status: 200, description: 'RunRecordView[]' })
  @ApiResponse({ status: 400, description: 'collectionId обязателен' })
  async readRuns(
    @Query('collectionId') collectionId?: string,
    @Query('pluginId') pluginId?: string,
    @Query('currentInputHash') currentInputHash?: string,
    @Query('limit') limit?: string,
  ): Promise<{ runs: RunRecordView[] }> {
    if (!collectionId) throw new BadRequestException('collectionId is required');
    const filter: ReadRunsFilter = {
      collectionId,
      ...(pluginId ? { pluginId: pluginId as ReadRunsFilter['pluginId'] } : {}),
      ...(currentInputHash ? { currentInputHash } : {}),
      // Только положительное целое: `limit=0` у Mongo означает «без лимита», и строка '0' молча
      // снимала бы ограничение (ревью PR #1981, P2).
      ...(limit && Number.isInteger(Number(limit)) && Number(limit) > 0 ? { limit: Number(limit) } : {}),
    };
    return { runs: await this.results.readRuns(filter) };
  }
}
