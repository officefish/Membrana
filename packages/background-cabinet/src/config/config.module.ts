import { Global, Module } from '@nestjs/common';
import { APP_CONFIG } from './config.tokens';
import { parseEnv } from './env.schema';
import type { CabinetConfigWithOffice } from './office-env.schema';
import { parseOfficeEnv } from './office-env.schema';

@Global()
@Module({
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: (): CabinetConfigWithOffice => ({
        ...parseEnv(process.env),
        office: parseOfficeEnv(process.env),
      }),
    },
  ],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
