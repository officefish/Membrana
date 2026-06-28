import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { AppConfigModule } from './config/config.module';
import type { AppConfig } from './config/env.schema';
import { APP_CONFIG } from './config/config.tokens';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { MembraneModule } from './modules/membrane/membrane.module';
import { PairModule } from './modules/pair/pair.module';
import { JournalModule } from './modules/journal/journal.module';
import { SampleLibraryModule } from './modules/sample-library/sample-library.module';
import { NodeRealtimeModule } from './modules/node-realtime/node-realtime.module';
import { ScenarioEditLeaseModule } from './modules/scenario-edit-lease/scenario-edit-lease.module';

const testImports =
  process.env.NODE_ENV === 'test'
    ? []
    : [
        LoggerModule.forRootAsync({
          inject: [APP_CONFIG],
          useFactory: (config: AppConfig) => ({
            pinoHttp: {
              level: config.LOG_LEVEL,
              genReqId: (req) => {
                const h = req.headers['x-request-id'];
                return (typeof h === 'string' && h) || randomUUID();
              },
              redact: {
                paths: [
                  'req.headers.authorization',
                  'req.headers["x-membrana-token"]',
                ],
                censor: '[Redacted]',
              },
            },
          }),
        }),
      ];

@Module({
  imports: [AppConfigModule, PrismaModule, ...testImports, AuthModule, MembraneModule, PairModule, JournalModule, SampleLibraryModule, NodeRealtimeModule, ScenarioEditLeaseModule],
  controllers: [HealthController],
})
export class AppModule {}
