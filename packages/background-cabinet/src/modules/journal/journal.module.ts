import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';
import { JournalPluginHostService } from './plugin-host/journal-plugin-host.service';
import { JournalPluginsController } from './plugin-host/journal-plugins.controller';
import { JournalServiceEntriesReader } from './plugin-host/journal-entries.reader';
import { ChartListMeasureAdapter } from './selection/measure.adapter';
import { ChartListOrchestrator } from './selection/chart-list.orchestrator';
import { ChartListSelectionController, MembraneResolver } from './selection/selection.controller';
import { ChartListSelectionService } from './selection/selection.service';
import { MediaRunPort } from './selection/media-run.port';
import { ChartListRegistrar } from './selection/chart-list.registrar';
import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [AuthModule],
  controllers: [JournalController, JournalPluginsController, ChartListSelectionController],
  providers: [
    JournalService,
    JournalServiceEntriesReader,
    {
      // Хост принимает ПОРТ ленты, а не службу: связывание порта со службой — акт сборки (И-8).
      provide: JournalPluginHostService,
      useFactory: (reader: JournalServiceEntriesReader) => new JournalPluginHostService(reader),
      inject: [JournalServiceEntriesReader],
    },
    ChartListSelectionService,
    {
      // Порт настраивается ИЗ КОНФИГА, а не из констант: адрес media и внутренний токен уже
      // объявлены схемой окружения (MEDIA_API_URL / MEDIA_API_TOKEN) и используются модулем пары.
      provide: MediaRunPort,
      useFactory: (config: AppConfig) =>
        new MediaRunPort({
          mediaApiUrl: config.MEDIA_API_URL,
          internalToken: config.MEDIA_API_TOKEN,
          bufferCollectionId: '__buffer__',
        }),
      inject: [APP_CONFIG],
    },
    {
      provide: ChartListMeasureAdapter,
      useFactory: (prisma: PrismaService, port: MediaRunPort) => new ChartListMeasureAdapter(prisma, port),
      inject: [PrismaService, MediaRunPort],
    },
    {
      provide: ChartListOrchestrator,
      useFactory: (host: JournalPluginHostService, selections: ChartListSelectionService) =>
        new ChartListOrchestrator(host, selections),
      inject: [JournalPluginHostService, ChartListSelectionService],
    },
    ChartListRegistrar,
    MembraneResolver,
  ],
  exports: [JournalService, JournalPluginHostService],
})
export class JournalModule {}
