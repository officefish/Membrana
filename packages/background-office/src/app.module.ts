import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { AppConfigModule } from './config/config.module';
import { ClaudeModule } from './modules/claude/claude.module';
import { LinearModule } from './modules/linear/linear.module';
import { RagModule } from './modules/rag/rag.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { DriftAnchorModule } from './modules/drift-anchor/drift-anchor.module';
import { NightHuntModule } from './modules/night-hunt/night-hunt.module';
import { NightTriageModule } from './modules/night-triage/night-triage.module';
import { PanelAuthModule } from './modules/panel-auth/panel-auth.module';
import { PanelUsersModule } from './modules/panel-users/panel-users.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { HealthController } from './health.controller';
import type { AppConfig } from './config/env.schema';
import { APP_CONFIG } from './config/config.tokens';

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
    ...(process.env.NODE_ENV === 'test' ? [] : [ScheduleModule.forRoot()]),
    ...testImports,
    ClaudeModule,
    LinearModule,
    RagModule,
    WebhooksModule,
    NightHuntModule,
    NightTriageModule,
    DriftAnchorModule,
    TelegramModule,
    PanelAuthModule,
    PanelUsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
