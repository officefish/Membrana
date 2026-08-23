/**
 * Регистрация чарт-листа в доме журнала. Блок c6a спринта `chart-list-plugin`.
 *
 * Плагин обязан быть ЖИЛЬЦОМ дома, а не вызываться в обход: дом судит задание до вызова, держит
 * включённость и отвергает чужой `mountTarget`. Регистрация — акт сборки, поэтому живёт в модуле,
 * а не внутри плагина: пакет плагинов о Nest ничего не знает и знать не должен.
 *
 * Контракты — ESM, этот пакет CommonJS: значения приезжают динамическим импортом, как в доме
 * коллекций media и как уже сделано в хосте журнала. Третьего способа не заводим.
 */
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { JournalPluginHostService } from '../plugin-host/journal-plugin-host.service';
import { ChartListMeasureAdapter } from './measure.adapter';

@Injectable()
export class ChartListRegistrar implements OnModuleInit {
  private readonly logger = new Logger(ChartListRegistrar.name);

  constructor(
    private readonly host: JournalPluginHostService,
    private readonly measurer: ChartListMeasureAdapter,
  ) {}

  async onModuleInit(): Promise<void> {
    const handlers = await import('@membrana/plugin-handlers');
    const executor = handlers.createChartListExecutor({
      port: {
        measure: async (task) => {
          const measured = await this.measurer.measureEntries(task.userId, task.entryIds);
          return measured.candidates as never;
        },
      },
    });
    this.host.registerPlugin(handlers.CHART_LIST_MANIFEST as never, executor);
    this.logger.log({ pluginId: handlers.CHART_LIST_MANIFEST.id }, 'чарт-лист зарегистрирован в доме журнала');
  }
}
