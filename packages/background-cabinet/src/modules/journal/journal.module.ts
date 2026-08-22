import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';
import { JournalPluginHostService } from './plugin-host/journal-plugin-host.service';
import { JournalPluginsController } from './plugin-host/journal-plugins.controller';
import { JournalServiceEntriesReader } from './plugin-host/journal-entries.reader';

@Module({
  imports: [AuthModule],
  controllers: [JournalController, JournalPluginsController],
  providers: [
    JournalService,
    JournalServiceEntriesReader,
    {
      // Хост принимает ПОРТ ленты, а не службу: связывание порта со службой — акт сборки (И-8).
      provide: JournalPluginHostService,
      useFactory: (reader: JournalServiceEntriesReader) => new JournalPluginHostService(reader),
      inject: [JournalServiceEntriesReader],
    },
  ],
  exports: [JournalService, JournalPluginHostService],
})
export class JournalModule {}
