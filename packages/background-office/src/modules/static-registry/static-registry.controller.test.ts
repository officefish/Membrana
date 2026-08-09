import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { StaticRegistryModule } from './static-registry.module';
import type {
  StaticRegistryLineageReadModel,
  StaticRegistryReadPort,
  StaticRegistryReadResult,
  StaticRegistryRecordReadModel,
} from './static-registry-read.port';

const RECORD_ID = 'day-memo-2026-07-28-r2';
const ROOT_ID = 'day-memo-2026-07-28';
const CANONICAL_REF = `urn:mmbrn:static:${ROOT_ID}`;

const unsafeSourceRecord: StaticRegistryRecordReadModel & {
  readonly location: { readonly kind: string; readonly ref: string };
  readonly affineDocId: string;
} = {
  id: RECORD_ID,
  sha256: 'a'.repeat(64),
  bytes: 4096,
  addedAt: '2026-07-28T12:00:00.000Z',
  canonicalRef: CANONICAL_REF,
  effectivePredecessorId: ROOT_ID,
  rootId: ROOT_ID,
  tip: true,
  location: { kind: 'affine', ref: 'affine://private/storage-address' },
  affineDocId: 'private-affine-document-id',
};

const unsafeLineage: StaticRegistryLineageReadModel & {
  readonly location: { readonly kind: string; readonly ref: string };
  readonly affineDocId: string;
} = {
  canonicalRef: CANONICAL_REF,
  rootId: ROOT_ID,
  recordIds: [ROOT_ID, RECORD_ID],
  tipId: RECORD_ID,
  location: { kind: 'affine', ref: 'affine://private/lineage-address' },
  affineDocId: 'private-affine-lineage-id',
};

class ExecutableStaticRegistryReadStub implements StaticRegistryReadPort {
  readonly recordRequests: string[] = [];
  readonly canonicalRefRequests: string[] = [];
  failRecordReads = false;

  getRecordById(
    recordId: string,
  ): Promise<StaticRegistryReadResult<StaticRegistryRecordReadModel>> {
    this.recordRequests.push(recordId);
    if (this.failRecordReads) {
      return Promise.reject(new Error('registry source is invalid'));
    }
    if (recordId !== RECORD_ID) {
      return Promise.resolve({ kind: 'not-found' });
    }
    return Promise.resolve({ kind: 'found', value: unsafeSourceRecord });
  }

  resolveCanonicalRef(
    canonicalRef: string,
  ): Promise<StaticRegistryReadResult<StaticRegistryLineageReadModel>> {
    this.canonicalRefRequests.push(canonicalRef);
    if (canonicalRef !== CANONICAL_REF) {
      return Promise.resolve({ kind: 'not-found' });
    }
    return Promise.resolve({ kind: 'found', value: unsafeLineage });
  }
}

describe('StaticRegistryController', () => {
  let app: NestFastifyApplication;
  let stub: ExecutableStaticRegistryReadStub;

  beforeEach(async () => {
    stub = new ExecutableStaticRegistryReadStub();
    const testingModule = await Test.createTestingModule({
      imports: [
        StaticRegistryModule.register({
          useFactory: () => stub,
        }),
      ],
    }).compile();

    app = testingModule.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
      logger: false,
    });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('reads a record by id through the injected port and strips unsafe source fields', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: `/static-registry/records/${RECORD_ID}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: RECORD_ID,
      sha256: 'a'.repeat(64),
      bytes: 4096,
      addedAt: '2026-07-28T12:00:00.000Z',
      canonicalRef: CANONICAL_REF,
      effectivePredecessorId: ROOT_ID,
      rootId: ROOT_ID,
      tip: true,
    });
    expect(response.body).not.toContain('location');
    expect(response.body).not.toContain('affine');
    expect(stub.recordRequests).toEqual([RECORD_ID]);
  });

  it('resolves an exact canonicalRef through the injected port', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: `/static-registry/resolve?canonicalRef=${encodeURIComponent(CANONICAL_REF)}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      canonicalRef: CANONICAL_REF,
      rootId: ROOT_ID,
      recordIds: [ROOT_ID, RECORD_ID],
      tipId: RECORD_ID,
    });
    expect(response.body).not.toContain('location');
    expect(response.body).not.toContain('affine');
    expect(stub.canonicalRefRequests).toEqual([CANONICAL_REF]);
  });

  it('returns 400 for malformed request values without calling the port', async () => {
    const malformedRecord = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/static-registry/records/AFFINE-DOC-ID',
    });
    const legacyBroadRecord = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/static-registry/records/bad_id',
    });
    const missingCanonicalRef = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/static-registry/resolve',
    });
    const affineAlias = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/static-registry/resolve?canonicalRef=affine-document-id',
    });

    expect(malformedRecord.statusCode).toBe(400);
    expect(legacyBroadRecord.statusCode).toBe(400);
    expect(missingCanonicalRef.statusCode).toBe(400);
    expect(affineAlias.statusCode).toBe(400);
    expect(stub.recordRequests).toEqual([]);
    expect(stub.canonicalRefRequests).toEqual([]);
  });

  it('returns 404 for unknown well-formed record ids and canonicalRefs', async () => {
    const unknownRecord = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/static-registry/records/unknown-record',
    });
    const unknownRef = 'urn:mmbrn:static:unknown-root';
    const unknownLineage = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: `/static-registry/resolve?canonicalRef=${encodeURIComponent(unknownRef)}`,
    });

    expect(unknownRecord.statusCode).toBe(404);
    expect(unknownLineage.statusCode).toBe(404);
    expect(stub.recordRequests).toEqual(['unknown-record']);
    expect(stub.canonicalRefRequests).toEqual([unknownRef]);
  });

  it('fails closed without a partial DTO when the read port fails', async () => {
    stub.failRecordReads = true;

    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: `/static-registry/records/${RECORD_ID}`,
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
    expect(response.body).not.toContain('location');
    expect(response.body).not.toContain('affine');
    expect(response.body).not.toContain(RECORD_ID);
  });

  it('has no write route for the static registry boundary', async () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE'] as const) {
      const response = await app.getHttpAdapter().getInstance().inject({
        method,
        url: `/static-registry/records/${RECORD_ID}`,
      });
      expect(response.statusCode).toBe(404);
    }
  });
});
