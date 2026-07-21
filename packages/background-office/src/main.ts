import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { loadDotenvFiles } from './config/load-dotenv';
import { APP_CONFIG } from './config/config.tokens';
import type { AppConfig } from './config/env.schema';

async function bootstrap(): Promise<void> {
  loadDotenvFiles();
  // Без @fastify/cors: прежний Express-office CORS не включал — open origin+credentials
  // расширил бы поверхность panel cookies (Teamlead review 20.07).
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true, rawBody: true },
  );

  app.enableShutdownHooks();
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.useGlobalInterceptors(new RequestIdInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = app.get<AppConfig>(APP_CONFIG);
  const port = config.PORT;

  const swaggerConfig = new DocumentBuilder()
    .setTitle('@membrana/background-office')
    .setDescription('Centralized HTTP gateway to external Membrana APIs (Claude, Linear, webhooks)')
    .setVersion(config.APP_VERSION || '0.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'token',
        description: 'API token via X-Membrana-Token header',
      },
      'api-token',
    )
    .addTag('Health', 'Server health check')
    .addTag('Claude', 'Anthropic Claude API integration')
    .addTag('Linear', 'Linear issue management integration')
    .addTag('RAG', 'Dual-circuit repo context retrieval (operative + LanceDB archive)')
    .addTag('Webhooks', 'External webhook receivers')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

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
