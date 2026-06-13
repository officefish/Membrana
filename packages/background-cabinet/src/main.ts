import 'reflect-metadata';
import cors from '@fastify/cors';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { APP_CONFIG } from './config/config.tokens';
import { loadDotenvFiles } from './config/load-dotenv';
import type { AppConfig } from './config/env.schema';

async function bootstrap(): Promise<void> {
  loadDotenvFiles();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  const config = app.get<AppConfig>(APP_CONFIG);
  await app.register(cors, {
    origin: config.CABINET_CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });

  app.enableShutdownHooks();
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.useGlobalInterceptors(new RequestIdInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = config.PORT;
  await app.listen(port, '0.0.0.0');
  logger.log(`Listening on http://localhost:${port}`);

  const shutdown = async (signal: string): Promise<void> => {
    logger.log({ signal }, 'shutdown initiated');
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
