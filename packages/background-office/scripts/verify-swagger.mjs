/**
 * Проверка Swagger UI без реальных API-ключей (NODE_ENV=test).
 * Запуск из packages/background-office:
 *   yarn build && node scripts/verify-swagger.mjs
 */
import 'reflect-metadata';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const require = createRequire(import.meta.url);

process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '3199';
process.env.LOG_LEVEL ??= 'error';
process.env.API_INTERNAL_TOKEN ??= 'test-internal-token';
process.env.ANTHROPIC_API_KEY ??= 'test-anthropic-key';
process.env.LINEAR_API_KEY ??= 'test-linear-key';
process.env.LINEAR_WEBHOOK_SECRET ??= 'test-webhook-secret';
process.env.GITHUB_TOKEN ??= 'test-github-token';
process.env.GITHUB_OWNER ??= 'officefish';
process.env.GITHUB_REPO ??= 'Membrana';

const { NestFactory } = require('@nestjs/core');
const { FastifyAdapter } = require('@nestjs/platform-fastify');
const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');
const request = require('supertest');

async function main() {
  const distApp = pathToFileURL(resolve(pkgRoot, 'dist/app.module.js')).href;
  const { AppModule } = await import(distApp);

  const app = await NestFactory.create(AppModule, new FastifyAdapter(), { logger: false });
  const swaggerConfig = new DocumentBuilder()
    .setTitle('@membrana/background-office')
    .setVersion('0.1.0')
    .addTag('Health')
    .addTag('Claude')
    .addTag('Linear')
    .addTag('Webhooks')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, { swaggerOptions: { persistAuthorization: true } });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const server = app.getHttpServer();
  const ui = await request(server).get('/docs/');
  const json = await request(server).get('/docs-json');

  console.log('GET /docs/     ->', ui.status, ui.type || ui.headers['content-type']);
  console.log('GET /docs-json ->', json.status, json.body?.info?.title ?? '(no title)');

  const paths = Object.keys(json.body?.paths ?? {});
  console.log('OpenAPI paths:', paths.length);
  for (const p of paths.sort()) {
    console.log(' ', p);
  }

  await app.close();
  if (ui.status !== 200 || json.status !== 200 || paths.length === 0) {
    process.exit(1);
  }
  console.log('\nSwagger OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
