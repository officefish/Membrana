import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { AppConfigModule } from './config/config.module';
import type { AppConfig } from './config/env.schema';
import { APP_CONFIG } from './config/config.tokens';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { DevicesModule } from './modules/devices/devices.module';
import { SamplesModule } from './modules/samples/samples.module';
import { TrendsTemplatesModule } from './modules/trends-templates/trends-templates.module';
import { DeviceScenariosModule } from './modules/device-scenarios/device-scenarios.module';

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
                  'req.headers["x-membrana-token"]',
                  'req.headers["X-Membrana-Token"]',
                ],
                censor: '[Redacted]',
              },
            },
          }),
        }),
      ];

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    ...testImports,
    DevicesModule,
    CollectionsModule,
    SamplesModule,
    TrendsTemplatesModule,
    DeviceScenariosModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
