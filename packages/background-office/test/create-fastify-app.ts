import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { RequestIdInterceptor } from '../src/common/interceptors/request-id.interceptor';
import { AppModule } from '../src/app.module';

/** Общий bootstrap e2e на Fastify (идентичен media/cabinet адаптеру). */
export async function createOfficeFastifyApp(
  options: { silent?: boolean; rawBody?: boolean } = {},
): Promise<INestApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true, rawBody: options.rawBody ?? true },
  );
  if (options.silent !== false) {
    app.useLogger({
      log: () => undefined,
      error: () => undefined,
      warn: () => undefined,
      debug: () => undefined,
      verbose: () => undefined,
    });
  }
  app.useGlobalInterceptors(new RequestIdInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
