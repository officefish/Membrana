import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { createStaticRegistryReadPortFromText } from './integration/static-registry-runtime.provider';
import { StaticRegistryModule } from './static-registry.module';

const ROOT_ID = 'receipt-root';
const REVISION_ID = 'receipt-root-r2';
const CANONICAL_REF = `urn:mmbrn:static:${ROOT_ID}`;
const SECRET_REF = 'affine://private/never-expose';

function record(id: string, supersedes?: string) {
  return {
    id,
    sha256: 'a'.repeat(64),
    bytes: 4096,
    addedAt: '2026-08-09',
    source: 'integration fixture',
    location: { kind: 'affine', ref: SECRET_REF },
    ...(supersedes === undefined ? {} : { supersedes }),
  };
}

function registryJsonl(): string {
  return [
    record(REVISION_ID, ROOT_ID),
    record('equal-hash-root'),
    record(ROOT_ID),
  ].map((value) => JSON.stringify(value)).join('\n');
}

async function createApp(source = registryJsonl()): Promise<NestFastifyApplication> {
  const port = await createStaticRegistryReadPortFromText(source);
  const testingModule = await Test.createTestingModule({
    imports: [StaticRegistryModule.register({ useFactory: () => port })],
  }).compile();
  const app = testingModule.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
    { logger: false },
  );
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

describe('Static registry integrated read chain', () => {
  let app: NestFastifyApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('parses, indexes and serves record and lineage truth without storage disclosure', async () => {
    app = await createApp();
    const http = app.getHttpAdapter().getInstance();

    const recordResponse = await http.inject({
      method: 'GET',
      url: `/static-registry/records/${REVISION_ID}`,
    });
    expect(recordResponse.statusCode).toBe(200);
    expect(recordResponse.json()).toEqual({
      id: REVISION_ID,
      sha256: 'a'.repeat(64),
      bytes: 4096,
      addedAt: '2026-08-09',
      canonicalRef: CANONICAL_REF,
      effectivePredecessorId: ROOT_ID,
      rootId: ROOT_ID,
      tip: true,
    });

    const lineageResponse = await http.inject({
      method: 'GET',
      url: `/static-registry/resolve?canonicalRef=${encodeURIComponent(CANONICAL_REF)}`,
    });
    expect(lineageResponse.statusCode).toBe(200);
    expect(lineageResponse.json()).toEqual({
      canonicalRef: CANONICAL_REF,
      rootId: ROOT_ID,
      recordIds: [ROOT_ID, REVISION_ID],
      tipId: REVISION_ID,
    });

    expect(recordResponse.body).not.toContain(SECRET_REF);
    expect(lineageResponse.body).not.toContain(SECRET_REF);
    expect(recordResponse.body).not.toContain('location');
    expect(lineageResponse.body).not.toContain('affine');
  });

  it('maps strict malformed identities to 400 and valid unknown identities to 404', async () => {
    app = await createApp();
    const http = app.getHttpAdapter().getInstance();

    const malformed = await http.inject({
      method: 'GET',
      url: '/static-registry/records/bad_id',
    });
    const unknown = await http.inject({
      method: 'GET',
      url: '/static-registry/records/unknown-record',
    });

    expect(malformed.statusCode).toBe(400);
    expect(unknown.statusCode).toBe(404);
  });

  it('refuses a forked source before the module can be composed', async () => {
    const forked = [
      record(ROOT_ID),
      record('receipt-child-one', ROOT_ID),
      record('receipt-child-two', ROOT_ID),
    ].map((value) => JSON.stringify(value)).join('\n');

    await expect(createStaticRegistryReadPortFromText(forked)).rejects.toThrow(
      /Static registry bootstrap failed: fork/u,
    );
  });
});
