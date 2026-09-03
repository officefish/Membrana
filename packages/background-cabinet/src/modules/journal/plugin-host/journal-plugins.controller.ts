/**
 * Транспорт дома журнала наружу. Адаптер И-6 интеграции коворка `cowork-server-plugin-pages`.
 *
 * ЗАЧЕМ. Блок C построил дом, блок B — механизм страницы; между ними не было провода, и без него
 * страница «получает список от дома» осталась бы словами. Провод узкий намеренно: список жильцов
 * с их включённостью и переключение включённости — ровно то, что нужно правому сайдбару.
 *
 * ЧЕГО ЗДЕСЬ НЕТ. Запуска прогона (`request`) нет: он требует `PluginContext` с адресом, а вопрос
 * адресации прогона журнала открыт и вынесен владельцу словаря. Отдавать наружу ручку, за которой
 * нет решённого адреса, значило бы завести тот самый мёртвый регулятор.
 */
import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { SessionGuard } from '../../../common/guards/session.guard';
import { JournalPluginHostService } from './journal-plugin-host.service';
import type { PluginId } from '@membrana/plugin-contracts' with { 'resolution-mode': 'import' };

/** Жилец в проводе: манифест как есть плюс включённость. Включённость рядом, а НЕ внутри манифеста. */
export interface JournalPluginStateDto {
  readonly manifest: unknown;
  readonly enabled: boolean;
}

export interface SetPluginEnabledDto {
  readonly enabled: boolean;
}

@ApiTags('Journal plugins')
@Controller('v1/telemetry/plugins')
@UseGuards(SessionGuard)
export class JournalPluginsController {
  constructor(private readonly host: JournalPluginHostService) {}

  @Get()
  @ApiOperation({ summary: 'List journal plugin states' })
  list(): { readonly mountTarget: string; readonly plugins: readonly JournalPluginStateDto[] } {
    return { mountTarget: this.host.mountTargetId, plugins: this.host.getPluginStates() };
  }

  @Patch(':pluginId')
  @ApiOperation({ summary: 'Enable or disable a journal plugin' })
  setEnabled(@Param('pluginId') pluginId: string, @Body() body: SetPluginEnabledDto): { readonly ok: true } {
    this.host.setPluginEnabled(pluginId as PluginId, body.enabled === true);
    return { ok: true };
  }
}
