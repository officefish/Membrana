/**
 * Swagger UI / OpenAPI smoke (no live PostgreSQL).
 * Run from packages/background-cabinet:
 *   yarn build && node scripts/verify-swagger.mjs
 */
import 'reflect-metadata';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const require = createRequire(import.meta.url);

process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '3298';
process.env.LOG_LEVEL ??= 'error';
process.env.API_INTERNAL_TOKEN ??= 'test-internal-token';
process.env.DATABASE_URL ??= 'postgresql://stub:stub@127.0.0.1:1/stub';
process.env.MEDIA_API_URL ??= 'http://localhost:3010';
process.env.SWAGGER_ENABLED ??= 'true';

const EXPECTED_PATHS = [
  '/health',
  '/health/deep',
  '/v1/access-keys/{keyId}',
  '/v1/access-keys/{keyId}/revoke',
  '/v1/auth/login',
  '/v1/auth/logout',
  '/v1/auth/me',
  '/v1/auth/register',
  '/v1/captures',
  '/v1/media/session',
  '/v1/membranes/{membraneId}/catalog',
  '/v1/membranes/{membraneId}/catalog/samples/{sampleId}',
  '/v1/membranes/{membraneId}/nodes',
  '/v1/membranes/me',
  '/v1/membranes/me/nodes',
  // #2281 — выбор тарифа собственным решением: витрина и смена.
  '/v1/membranes/me/tariff',
  '/v1/membranes/me/tariff/promo-redemptions',
  '/v1/nodes/{nodeId}',
  '/v1/nodes/{nodeId}/access-keys',
  '/v1/nodes/{nodeId}/access-keys/purge-inactive',
  '/v1/nodes/{nodeId}/access-keys/purge-revoked',
  '/v1/nodes/{nodeId}/capture',
  '/v1/nodes/{nodeId}/health-ping',
  '/v1/nodes/{nodeId}/link-state',
  '/v1/pair',
  '/v1/pair/status',
  '/v1/nodes/{nodeId}/scenario/edit-lease',
  '/v1/nodes/{nodeId}/scenario/edit-lease/renew',
  '/v1/tariffs',
  '/v1/telemetry/chart-list',
  '/v1/telemetry/chart-list/{selectionId}',
  '/v1/telemetry/journal-items',
  '/v1/telemetry/live-records',
  '/v1/telemetry/live-records/{recordId}',
  '/v1/telemetry/plugins',
  '/v1/telemetry/plugins/{pluginId}',
  '/v1/telemetry/reports',
];

function listControllerFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listControllerFiles(full));
    if (entry.isFile() && entry.name.endsWith('.controller.ts')) out.push(full);
  }
  return out;
}

function verifyControllerDecorators() {
  const srcRoot = resolve(pkgRoot, 'src');
  const missingTags = [];
  const missingOperations = [];

  for (const file of listControllerFiles(srcRoot)) {
    const src = readFileSync(file, 'utf8');
    const rel = relative(pkgRoot, file).replaceAll('\\', '/');
    const classes = [...src.matchAll(/export class (\w+Controller)\b/g)];
    for (const match of classes) {
      const beforeClass = src.slice(Math.max(0, match.index - 500), match.index);
      if (!beforeClass.includes('@ApiTags(')) {
        missingTags.push(`${match[1]} (${rel})`);
      }
    }

    const routes = [
      ...src.matchAll(/\n\s+@(Get|Post|Patch|Delete|Put)\b[\s\S]*?\n\s+(?:async\s+)?(\w+)\s*\(/g),
    ];
    for (const match of routes) {
      const decoratorBlock = match[0].slice(0, match[0].lastIndexOf('\n'));
      if (!decoratorBlock.includes('@ApiOperation(')) {
        missingOperations.push(`${match[2]} (${rel})`);
      }
    }
  }

  if (missingTags.length > 0) {
    console.error('Swagger tooth: controllers without @ApiTags:');
    for (const item of missingTags) console.error(`  - ${item}`);
  }
  if (missingOperations.length > 0) {
    console.error('Swagger tooth: routes without @ApiOperation:');
    for (const item of missingOperations) console.error(`  - ${item}`);
  }
  if (missingTags.length > 0 || missingOperations.length > 0) {
    return false;
  }
  return true;
}

async function main() {
  if (!verifyControllerDecorators()) {
    process.exitCode = 1;
    return;
  }
  if (process.argv.includes('--static-only')) {
    console.log('Swagger static tooth OK');
    return;
  }

  const distApp = pathToFileURL(resolve(pkgRoot, 'dist/app.module.js')).href;
  const distPrisma = pathToFileURL(resolve(pkgRoot, 'dist/prisma/prisma.service.js')).href;
  const distSwagger = pathToFileURL(resolve(pkgRoot, 'dist/swagger/setup-swagger.js')).href;
  const distTokens = pathToFileURL(resolve(pkgRoot, 'dist/config/config.tokens.js')).href;

  for (const fileUrl of [distApp, distPrisma, distSwagger, distTokens]) {
    const file = fileURLToPath(fileUrl);
    if (!existsSync(file)) {
      throw new Error(`Build output is missing: ${relative(pkgRoot, file).replaceAll('\\', '/')}`);
    }
  }

  const { Test } = require('@nestjs/testing');
  const { FastifyAdapter } = require('@nestjs/platform-fastify');
  const { WsAdapter } = require('@nestjs/platform-ws');
  const { AppModule } = await import(distApp);
  const { PrismaService } = await import(distPrisma);
  const { mountSwagger } = await import(distSwagger);
  const { APP_CONFIG } = await import(distTokens);

  const prismaModelStub = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === 'findMany') return async () => [];
        if (prop === 'findUnique') return async () => null;
        if (prop === 'findFirst') return async () => null;
        if (prop === 'count') return async () => 0;
        return async () => ({});
      },
    },
  );
  const prismaStub = new Proxy(
    {
      onModuleInit: async () => {},
      onModuleDestroy: async () => {},
      $connect: async () => {},
      $disconnect: async () => {},
      $queryRaw: async () => [{ one: 1 }],
      $transaction: async (fn) => fn(prismaModelStub),
    },
    {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        return prismaModelStub;
      },
    },
  );

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prismaStub)
    .compile();

  const app = moduleFixture.createNestApplication(new FastifyAdapter(), {
    logger: false,
  });
  app.useWebSocketAdapter(new WsAdapter(app));

  mountSwagger(app, app.get(APP_CONFIG));
  await app.listen(0, '127.0.0.1');
  const baseUrl = await app.getUrl();
  const ui = await fetch(`${baseUrl}/docs/`);
  const json = await fetch(`${baseUrl}/docs-json`);

  const doc = await json.json();
  const paths = Object.keys(doc.paths ?? {});
  const missingPaths = EXPECTED_PATHS.filter((path) => !paths.includes(path));
  const operationCount = Object.values(doc.paths ?? {}).reduce(
    (sum, item) => sum + Object.keys(item ?? {}).length,
    0,
  );
  const operationsWithoutTags = [];
  const operationsWithoutSummary = [];
  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    for (const [method, operation] of Object.entries(item ?? {})) {
      if (!Array.isArray(operation.tags) || operation.tags.length === 0) {
        operationsWithoutTags.push(`${method.toUpperCase()} ${path}`);
      }
      if (typeof operation.summary !== 'string' || operation.summary.length === 0) {
        operationsWithoutSummary.push(`${method.toUpperCase()} ${path}`);
      }
    }
  }

  console.log('GET /docs/     ->', ui.status, ui.headers.get('content-type'));
  console.log('GET /docs-json ->', json.status, doc.info?.title ?? '(no title)');
  console.log('OpenAPI paths:', paths.length);
  console.log('OpenAPI operations:', operationCount);
  for (const p of paths.sort()) {
    console.log(' ', p);
  }

  await app.close();

  const security = doc.components?.securitySchemes?.['api-token'];
  const apiKeyOk =
    security?.type === 'apiKey' &&
    security?.name === 'X-Membrana-Token' &&
    security?.in === 'header';

  if (ui.status !== 200 || json.status !== 200 || !apiKeyOk) {
    process.exitCode = 1;
    return;
  }
  if (missingPaths.length > 0) {
    console.error('Swagger tooth: missing active cabinet paths:');
    for (const path of missingPaths) console.error(`  - ${path}`);
    process.exitCode = 1;
    return;
  }
  if (operationsWithoutTags.length > 0 || operationsWithoutSummary.length > 0) {
    if (operationsWithoutTags.length > 0) {
      console.error('Swagger tooth: document operations without tags:');
      for (const item of operationsWithoutTags) console.error(`  - ${item}`);
    }
    if (operationsWithoutSummary.length > 0) {
      console.error('Swagger tooth: document operations without summaries:');
      for (const item of operationsWithoutSummary) console.error(`  - ${item}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log('\nSwagger OK');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
