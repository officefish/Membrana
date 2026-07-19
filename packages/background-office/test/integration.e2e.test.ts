import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, type NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { RequestIdInterceptor } from '../src/common/interceptors/request-id.interceptor';

function getUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(),
    { bufferLogs: true, rawBody: true },
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

describe('background-office HTTP', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /health returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.version).toBe('string');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('GET /ready returns dependency checks (Intern T2)', async () => {
    const res = await request(app.getHttpServer()).get('/ready').expect(200);
    expect(typeof res.body.ready).toBe('boolean');
    expect(Array.isArray(res.body.checks)).toBe(true);
    expect(res.body.checks).toHaveLength(4);
    for (const check of res.body.checks) {
      expect(typeof check.id).toBe('string');
      expect(typeof check.reachable).toBe('boolean');
      expect(typeof check.latencyMs).toBe('number');
    }
  });

  it('POST /v1/claude/ask without token → 401', async () => {
    await request(app.getHttpServer())
      .post('/v1/claude/ask')
      .send({ messages: [{ role: 'user', content: 'hi' }] })
      .expect(401);
  });

  it('POST /api/rag/query without token → 401', async () => {
    await request(app.getHttpServer())
      .post('/api/rag/query')
      .send({ query: 'background-office port' })
      .expect(401);
  });

  it('POST /v1/claude/ask proxies Anthropic success', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = getUrl(input);
      if (url.startsWith('https://api.anthropic.com')) {
        return new Response(
          JSON.stringify({
            content: [{ type: 'text', text: 'ok-from-model' }],
            stop_reason: 'end_turn',
            model: 'claude-haiku-4-5-20251001',
            usage: { input_tokens: 2, output_tokens: 3 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('unexpected ' + url, { status: 500 });
    });

    const res = await request(app.getHttpServer())
      .post('/v1/claude/ask')
      .set('X-Membrana-Token', 'test-internal-token')
      .send({
        messages: [{ role: 'user', content: 'ping' }],
      })
      .expect(200);

    expect(res.body.text).toBe('ok-from-model');
    expect(res.body.stop_reason).toBe('end_turn');
    expect(res.body.usage?.input_tokens).toBe(2);
  });

  it('POST /v1/claude/ask forwards Anthropic error with request_id', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = getUrl(input);
      if (url.startsWith('https://api.anthropic.com')) {
        return new Response(
          JSON.stringify({
            type: 'error',
            message: 'rate_limited',
            request_id: 'req_test_1',
          }),
          { status: 429, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('unexpected', { status: 500 });
    });

    const res = await request(app.getHttpServer())
      .post('/v1/claude/ask')
      .set('X-Membrana-Token', 'test-internal-token')
      .send({
        messages: [{ role: 'user', content: 'ping' }],
      })
      .expect(429);

    expect(res.body.request_id).toBe('req_test_1');
  });

  it('GET /v1/linear/issue/TEC-42 returns issue (mocked)', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = getUrl(input);
      if (url.startsWith('https://api.linear.app')) {
        return new Response(
          JSON.stringify({
            data: {
              issues: {
                nodes: [
                  {
                    id: 'iss-1',
                    identifier: 'TEC-42',
                    title: 'Test',
                    description: 'Desc',
                    url: 'https://linear.app/x/issue/TEC-42',
                    state: { name: 'Todo' },
                    labels: { nodes: [{ name: 'a', color: '#fff' }] },
                    comments: {
                      nodes: [
                        {
                          id: 'c1',
                          body: 'hello',
                          createdAt: '2020-01-01T00:00:00.000Z',
                          user: { name: 'U', email: 'u@x.com' },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('unexpected ' + url, { status: 500 });
    });

    const res = await request(app.getHttpServer())
      .get('/v1/linear/issue/TEC-42')
      .set('X-Membrana-Token', 'test-internal-token')
      .expect(200);

    expect(res.body.identifier).toBe('TEC-42');
    expect(res.body.comments).toHaveLength(1);
  });

  it('POST /v1/linear/issue/TEC-42/comment (mocked)', async () => {
    let linearCalls = 0;
    vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = getUrl(input);
      if (url.startsWith('https://api.linear.app')) {
        linearCalls += 1;
        if (linearCalls === 1) {
          return new Response(
            JSON.stringify({
              data: {
                issues: {
                  nodes: [
                    {
                      id: 'iss-1',
                      identifier: 'TEC-42',
                      title: 'T',
                      description: null,
                      url: 'https://linear.app/x',
                      state: { name: 'Todo' },
                      labels: { nodes: [] },
                      comments: { nodes: [] },
                    },
                  ],
                },
              },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({
            data: {
              commentCreate: {
                success: true,
                comment: {
                  id: 'com-1',
                  url: 'https://linear.app/comment',
                  createdAt: '2020-01-01T00:00:00.000Z',
                },
              },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('unexpected', { status: 500 });
    });

    const res = await request(app.getHttpServer())
      .post('/v1/linear/issue/TEC-42/comment')
      .set('X-Membrana-Token', 'test-internal-token')
      .send({ body: 'note' })
      .expect(200);

    expect(res.body.commentId).toBe('com-1');
  });

  it('POST /webhooks/linear rejects bad signature', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/linear')
      .set('Linear-Signature', 'deadbeef')
      .send(JSON.stringify({ type: 'Issue' }))
      .expect(403);
  });

  it('POST /webhooks/linear accepts valid signature', async () => {
    const { createHmac } = await import('node:crypto');
    const body = JSON.stringify({
      action: 'create',
      type: 'Comment',
      webhookTimestamp: Date.now(),
    });
    const sig = createHmac('sha256', 'test-webhook-secret')
      .update(body)
      .digest('hex');

    await request(app.getHttpServer())
      .post('/webhooks/linear')
      .set('Linear-Signature', sig)
      .set('Linear-Delivery', 'delivery-uuid-1')
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(200, { received: true });
  });

  it('POST /webhooks/linear duplicate delivery is idempotent', async () => {
    const { createHmac } = await import('node:crypto');
    const body = JSON.stringify({
      action: 'create',
      type: 'Issue',
      webhookTimestamp: Date.now(),
    });
    const sig = createHmac('sha256', 'test-webhook-secret')
      .update(body)
      .digest('hex');

    const agent = request(app.getHttpServer());
    await agent
      .post('/webhooks/linear')
      .set('Linear-Signature', sig)
      .set('Linear-Delivery', 'same-delivery-id')
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(200);

    await agent
      .post('/webhooks/linear')
      .set('Linear-Signature', sig)
      .set('Linear-Delivery', 'same-delivery-id')
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(200);
  });

  it('POST /v1/claude/persona/unknown → 404', async () => {
    await request(app.getHttpServer())
      .post('/v1/claude/persona/nobody/ask')
      .set('X-Membrana-Token', 'test-internal-token')
      .send({ question: 'q' })
      .expect(404);
  });
});
