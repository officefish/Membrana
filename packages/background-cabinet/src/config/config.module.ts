import { Global, Module } from '@nestjs/common';
import { APP_CONFIG } from './config.tokens';
import type { AppConfig } from './env.schema';
import { parseEnv } from './env.schema';

@Global()
@Module({
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: (): AppConfig => parseEnv(process.env),
    },
  ],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
