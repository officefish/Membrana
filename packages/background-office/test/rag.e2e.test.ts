import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ExpressAdapter, type NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { RequestIdInterceptor } from '../src/common/interceptors/request-id.interceptor';
import { AppConfigModule } from '../src/config/config.module';
import { RagGatewayService } from '../src/modules/rag/rag-gateway.service';
import { RagModule } from '../src/modules/rag/rag.module';

async function createRagTestApp(
  gateway: Pick<RagGatewayService, 'retrieveContext'>,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppConfigModule, RagModule],
  })
    .overrideProvider(RagGatewayService)
    .useValue(gateway)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>(
    new ExpressAdapter(),
    { bufferLogs: true },
  );
  app.useLogger({
    log: () => undefined,
    error: () => undefined,
    warn: () => undefined,
    debug: () => undefined,
    verbose: () => undefined,
  });
  app.useGlobalInterceptors(new RequestIdInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}

describe('POST /api/rag/query', () => {
  let app: INestApplication;
  const retrieveContext = vi.fn();

  beforeAll(async () => {
    app = await createRagTestApp({ retrieveContext });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns 401 without X-Membrana-Token', async () => {
    await request(app.getHttpServer())
      .post('/api/rag/query')
      .send({ query: 'background-office port' })
      .expect(401);
  });

  it('returns 400 for empty query', async () => {
    await request(app.getHttpServer())
      .post('/api/rag/query')
      .set('X-Membrana-Token', 'test-internal-token')
      .send({ query: '   ' })
      .expect(400);
  });

  it('returns mocked fragments', async () => {
    retrieveContext.mockResolvedValueOnce({
      query: 'background-office port',
      fragments: [
        {
          text: 'office :3000 media :3010',
          score: 0.9,
          circuit: 'archive',
          metadata: {
            source: 'docs/BACKGROUND_SERVERS.md',
            type: 'doc',
            timestamp: '2026-06-21T00:00:00.000Z',
            tags: [],
            priority: 1,
            chunkIndex: 0,
            isHistorical: false,
            status: 'active',
          },
        },
      ],
      usedArchive: true,
      usedOperative: false,
    });

    const res = await request(app.getHttpServer())
      .post('/api/rag/query')
      .set('X-Membrana-Token', 'test-internal-token')
      .send({
        query: 'background-office port',
        options: { useLongTerm: true, topK: 5 },
      })
      .expect(200);

    expect(retrieveContext).toHaveBeenCalledWith('background-office port', {
      useLongTerm: true,
      topK: 5,
    });
    expect(res.body.fragments).toHaveLength(1);
    expect(res.body.fragments[0].metadata.source).toContain('BACKGROUND_SERVERS.md');
    expect(res.body.usedArchive).toBe(true);
  });
});
