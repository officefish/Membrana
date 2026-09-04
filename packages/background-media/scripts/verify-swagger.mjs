/**
 * Swagger UI / OpenAPI smoke (no live PostgreSQL).
 * Run from packages/background-media:
 *   yarn build && node scripts/verify-swagger.mjs
 */
import 'reflect-metadata';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import multipart from '@fastify/multipart';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const require = createRequire(import.meta.url);

process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '3198';
process.env.LOG_LEVEL ??= 'error';
process.env.API_INTERNAL_TOKEN ??= 'test-internal-token';
process.env.DATABASE_URL ??= 'postgresql://stub:stub@127.0.0.1:1/stub';
process.env.MEDIA_BLOB_DIR ??= resolve(pkgRoot, '.tmp-verify-blobs');
process.env.SWAGGER_ENABLED ??= 'true';

const { Test } = require('@nestjs/testing');
const { FastifyAdapter } = require('@nestjs/platform-fastify');

const EXPECTED_PATHS = [
  '/health',
  '/v1/deploy-preflight/last-sample',
  '/v1/devices',
  '/v1/devices/{deviceId}',
  '/v1/devices/{deviceId}/client-key',
  '/v1/devices/{deviceId}/collections',
  '/v1/devices/{deviceId}/collections/{collectionId}',
  '/v1/devices/{deviceId}/collections/{collectionId}/buffer-cleanup/execute',
  '/v1/devices/{deviceId}/collections/{collectionId}/buffer-cleanup/plan',
  '/v1/devices/{deviceId}/collections/{collectionId}/plugins',
  '/v1/devices/{deviceId}/collections/{collectionId}/plugins/{pluginId}',
  '/v1/devices/{deviceId}/collections/{collectionId}/plugins/{pluginId}/request',
  '/v1/devices/{deviceId}/collections/{collectionId}/samples',
  '/v1/devices/{deviceId}/collections/ensure-reserved',
  '/v1/devices/{deviceId}/collections/provision-catalog',
  '/v1/devices/{deviceId}/device-scenario',
  '/v1/devices/{deviceId}/device-workspaces',
  '/v1/devices/{deviceId}/device-workspaces/{workspaceId}',
  '/v1/devices/{deviceId}/device-workspaces/active',
  '/v1/devices/{deviceId}/membrane',
  '/v1/devices/{deviceId}/node/heartbeat',
  '/v1/devices/{deviceId}/node/tasks',
  '/v1/devices/{deviceId}/node/tasks/{taskId}/result',
  '/v1/devices/{deviceId}/node/tasks/queue',
  '/v1/devices/{deviceId}/node-key',
  '/v1/devices/{deviceId}/quota',
  '/v1/devices/{deviceId}/samples/{sampleId}',
  '/v1/devices/{deviceId}/samples/{sampleId}/blob',
  '/v1/devices/{deviceId}/samples/{sampleId}/drone-detection-report',
  '/v1/devices/{deviceId}/samples/{sampleId}/move',
  '/v1/devices/{deviceId}/track-key-ttl',
  '/v1/devices/{deviceId}/trends-templates',
  '/v1/devices/{deviceId}/trends-templates/{key}',
  '/v1/linear-snapshots/capture',
  '/v1/open/devices/{deviceId}/collections',
  '/v1/open/devices/{deviceId}/collections/{collectionId}/samples',
  '/v1/open/devices/{deviceId}/samples/{sampleId}/blob',
];

async function main() {
  const distApp = pathToFileURL(resolve(pkgRoot, 'dist/app.module.js')).href;
  const distPrisma = pathToFileURL(resolve(pkgRoot, 'dist/prisma/prisma.service.js')).href;
  const distSwagger = pathToFileURL(resolve(pkgRoot, 'dist/swagger/setup-swagger.js')).href;
  const distTokens = pathToFileURL(resolve(pkgRoot, 'dist/config/config.tokens.js')).href;

  const { AppModule } = await import(distApp);
  const { PrismaService } = await import(distPrisma);
  const { mountSwagger } = await import(distSwagger);
  const { APP_CONFIG } = await import(distTokens);

  const prismaStub = {
    onModuleInit: async () => {},
    onModuleDestroy: async () => {},
    $connect: async () => {},
    $disconnect: async () => {},
    device: { findUnique: async () => null },
  };

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prismaStub)
    .compile();

  const app = moduleFixture.createNestApplication(new FastifyAdapter(), {
    logger: false,
  });

  await app.register(multipart, { limits: { fileSize: 52_428_800 } });
  mountSwagger(app, app.get(APP_CONFIG));
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const fastify = app.getHttpAdapter().getInstance();
  const ui = await fastify.inject({ method: 'GET', url: '/docs/' });
  const json = await fastify.inject({ method: 'GET', url: '/docs-json' });

  const doc = JSON.parse(json.payload);
  const paths = Object.keys(doc.paths ?? {});
  const missingPaths = EXPECTED_PATHS.filter((path) => !paths.includes(path));

  console.log('GET /docs/     ->', ui.statusCode, ui.headers['content-type']);
  console.log('GET /docs-json ->', json.statusCode, doc.info?.title ?? '(no title)');
  console.log('OpenAPI paths:', paths.length);
  for (const p of paths.sort()) {
    console.log(' ', p);
  }

  await app.close();

  if (ui.statusCode !== 200 || json.statusCode !== 200) {
    process.exitCode = 1;
    return;
  }
  if (missingPaths.length > 0) {
    console.error('Swagger tooth: missing active media paths:');
    for (const path of missingPaths) console.error(`  - ${path}`);
    process.exitCode = 1;
    return;
  }
  console.log('\nSwagger OK');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
