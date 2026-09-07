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

/**
 * Зуб двух форм ответа загрузки пробы (вердикт M2, #2307): 201 — проба легла; 200 — доменный
 * отказ `{ ok:false, reason, buffer, userStorage, overflowPolicy, overflowId, overflowAt }`;
 * 413 — только транспорт, без доменного `reason`.
 *
 * Ожидаемые литералы `reason` читаются из СЛОВАРЯ (`plugin-contracts/dist/buffer-overflow`),
 * не пишутся здесь — третья копия строк запрещена. Порчи → красный: снять `@ApiResponse(200)`;
 * `reason` без enum или с лишним литералом; вернуть в 413 описание квоты.
 */
const UPLOAD_PATH = '/v1/devices/{deviceId}/collections/{collectionId}/samples';
const REFUSAL_FIELDS = ['ok', 'reason', 'buffer', 'userStorage', 'overflowPolicy', 'overflowId', 'overflowAt'];

function resolveSchema(doc, schema) {
  if (schema && typeof schema.$ref === 'string') {
    const name = schema.$ref.split('/').pop();
    return doc.components?.schemas?.[name];
  }
  return schema;
}

async function checkUploadResponseForms(doc) {
  const problems = [];
  const dictionaryUrl = pathToFileURL(
    resolve(pkgRoot, '..', 'plugin-contracts', 'dist', 'buffer-overflow', 'reasons.js'),
  ).href;
  const { BUFFER_OVERFLOW_REASONS } = await import(dictionaryUrl);
  const expectedReasons = Object.values(BUFFER_OVERFLOW_REASONS).sort();

  const responses = doc.paths?.[UPLOAD_PATH]?.post?.responses ?? {};
  if (!responses['201']) problems.push('201 (sample stored) is not documented');

  const refusal = responses['200'];
  if (!refusal) {
    problems.push('200 (domain refusal) is not documented');
  } else {
    const schema = resolveSchema(doc, refusal.content?.['application/json']?.schema);
    if (!schema?.properties) {
      problems.push('200 has no object schema');
    } else {
      const missing = REFUSAL_FIELDS.filter((f) => !schema.properties[f]);
      if (missing.length) problems.push(`200 schema lacks fields: ${missing.join(', ')}`);
      const okEnum = schema.properties.ok?.enum;
      if (!Array.isArray(okEnum) || okEnum.length !== 1 || okEnum[0] !== false) {
        problems.push('200 schema: ok must be enum [false]');
      }
      const reasonEnum = schema.properties.reason?.enum;
      if (!Array.isArray(reasonEnum)) {
        problems.push('200 schema: reason has no enum');
      } else if (JSON.stringify([...reasonEnum].sort()) !== JSON.stringify(expectedReasons)) {
        problems.push(
          `200 schema: reason enum ${JSON.stringify(reasonEnum)} != dictionary ${JSON.stringify(expectedReasons)}`,
        );
      }
    }
  }

  const tooLarge = responses['413'];
  if (!tooLarge) {
    problems.push('413 (transport: file too large) is not documented');
  } else {
    const description = tooLarge.description ?? '';
    if (!/transport/iu.test(description)) problems.push('413 must be described as transport-only');
    if (/quota exceeded/iu.test(description)) problems.push('413 must not describe quota as its meaning');
    const schema = resolveSchema(doc, tooLarge.content?.['application/json']?.schema);
    if (schema?.properties?.reason) problems.push('413 must not carry a domain reason');
  }
  return problems;
}

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
  const refusalProblems = await checkUploadResponseForms(doc);

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
  if (refusalProblems.length > 0) {
    console.error('Swagger tooth: sample upload must document both response forms (M2, #2307):');
    for (const problem of refusalProblems) console.error(`  - ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log('Upload response forms: 201 stored · 200 domain refusal (reason enum = dictionary) · 413 transport-only');
  console.log('\nSwagger OK');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
