import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { mintInviteCode, PANEL_SESSION_COOKIE } from '../src/modules/panel-auth/panel-auth-core';
import { createOfficeFastifyApp } from './create-fastify-app';

const SECRET = 'test-panel-session-secret'; // = setup-env.ts

describe('panel-auth E2E (OP2): уровни доступа через реальный HTTP', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createOfficeFastifyApp();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET /me без cookie → public, no-store', async () => {
    const res = await request(app.getHttpServer()).get('/v1/panel/auth/me').expect(200);
    // PU1 (#463): контракт /me расширен грантами партнёров (пустые для public).
    expect(res.body).toEqual({ role: 'public', sub: null, grants: [] });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('invite: валидный код → httpOnly ally-cookie; cookie открывает /me как ally', async () => {
    const code = mintInviteCode(SECRET, 'e2e-friend', Math.floor(Date.now() / 1000) + 3600);
    const res = await request(app.getHttpServer())
      .post('/v1/panel/auth/invite')
      .send({ code })
      .expect(201);
    expect(res.body).toEqual({ ok: true, role: 'ally' });
    const setCookie = String(res.headers['set-cookie']?.[0] ?? '');
    expect(setCookie).toContain(PANEL_SESSION_COOKIE);
    expect(setCookie).toContain('HttpOnly');

    const cookie = setCookie.split(';')[0];
    const me = await request(app.getHttpServer())
      .get('/v1/panel/auth/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(me.body.role).toBe('ally');
    expect(me.body.sub).toBe('invite:e2e-friend');
  });

  it('invite: мусорный код → 403, cookie не выдаётся', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/panel/auth/invite')
      .send({ code: 'garbage' })
      .expect(403);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('operator-ручка: без cookie → 401; с ally-cookie → 403 (уровень ниже)', async () => {
    await request(app.getHttpServer()).get('/v1/panel/auth/whoami-operator').expect(401);

    const code = mintInviteCode(SECRET, 'e2e-friend', Math.floor(Date.now() / 1000) + 3600);
    const invite = await request(app.getHttpServer())
      .post('/v1/panel/auth/invite')
      .send({ code })
      .expect(201);
    const cookie = String(invite.headers['set-cookie'][0]).split(';')[0];
    await request(app.getHttpServer())
      .get('/v1/panel/auth/whoami-operator')
      .set('Cookie', cookie)
      .expect(403);
  });

  it('logout гасит cookie (Max-Age=0)', async () => {
    const res = await request(app.getHttpServer()).post('/v1/panel/auth/logout').expect(201);
    expect(String(res.headers['set-cookie'][0])).toContain('Max-Age=0');
  });

  it('github без конфигурации OAuth → 503 (не 500 и не тихий 200)', async () => {
    await request(app.getHttpServer()).get('/v1/panel/auth/github').expect(503);
  });
});
