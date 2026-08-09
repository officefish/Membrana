import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder, type OpenAPIObject } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { StaticRegistryModule } from './static-registry.module';
import type { StaticRegistryReadPort } from './static-registry-read.port';

const notFoundPort: StaticRegistryReadPort = {
  getRecordById: () => Promise.resolve({ kind: 'not-found' }),
  resolveCanonicalRef: () => Promise.resolve({ kind: 'not-found' }),
};

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;

function schemaPropertyNames(document: OpenAPIObject, schemaName: string): string[] {
  const schema = document.components?.schemas?.[schemaName];
  if (!schema || !('properties' in schema)) {
    throw new Error(`OpenAPI schema ${schemaName} is missing`);
  }
  return Object.keys(schema.properties ?? {}).sort();
}

describe('Static registry OpenAPI contract', () => {
  let app: NestFastifyApplication;
  let document: OpenAPIObject;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        StaticRegistryModule.register({
          useFactory: () => notFoundPort,
        }),
      ],
    }).compile();

    app = testingModule.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
      logger: false,
    });
    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Static registry isolated contract').setVersion('1').build(),
    );
  });

  afterEach(async () => {
    await app.close();
  });

  it('declares exactly the two read operations and no write operation', () => {
    const operations = Object.entries(document.paths)
      .flatMap(([path, pathItem]) =>
        HTTP_METHODS.filter((method) => pathItem?.[method] !== undefined).map((method) => ({
          method,
          path,
        })),
      )
      .sort((left, right) => left.path.localeCompare(right.path));

    expect(operations).toEqual([
      { method: 'get', path: '/static-registry/records/{recordId}' },
      { method: 'get', path: '/static-registry/resolve' },
    ]);
  });

  it('documents allow-list response DTOs and 400/404 responses without forbidden fields', () => {
    expect(schemaPropertyNames(document, 'StaticRegistryRecordResponseDto')).toEqual(
      [
        'addedAt',
        'bytes',
        'canonicalRef',
        'effectivePredecessorId',
        'id',
        'rootId',
        'sha256',
        'tip',
      ].sort(),
    );
    expect(schemaPropertyNames(document, 'StaticRegistryLineageResponseDto')).toEqual(
      ['canonicalRef', 'recordIds', 'rootId', 'tipId'].sort(),
    );
    expect(schemaPropertyNames(document, 'StaticRegistryErrorResponseDto')).toEqual(
      ['error', 'message', 'statusCode'].sort(),
    );
    const recordSchema = document.components?.schemas?.StaticRegistryRecordResponseDto;
    const addedAt = recordSchema && 'properties' in recordSchema
      ? recordSchema.properties?.addedAt
      : undefined;
    expect(addedAt).toMatchObject({ type: 'string' });
    expect(JSON.stringify(addedAt)).not.toContain('"format":"date-time"');

    for (const path of Object.values(document.paths)) {
      expect(path?.get?.responses).toHaveProperty('400');
      expect(path?.get?.responses).toHaveProperty('404');
    }

    const serialized = JSON.stringify(document);
    expect(serialized).not.toContain('"location"');
    expect(serialized).not.toContain('location.ref');
    expect(serialized).not.toContain('affineDocId');
    expect(serialized).not.toContain('downloadUrl');
  });
});
