import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { PANEL_SESSION_COOKIE } from '../src/modules/panel-auth/panel-auth-core';
import { PanelAuthService } from '../src/modules/panel-auth/panel-auth.service';
import { createOfficeFastifyApp } from './create-fastify-app';

/**
 * #2375: вход в панель через GitHub — настоящий редирект. Nest до обработчика ставит статус метода (200),
 * Fastify 5 `redirect(url)` без кода берёт уже выставленный — выходил HTTP 200 с `Location` и пустым телом,
 * браузер оставался на пустой странице. Порча: убрать явный 302 в контроллере → оба теста красные (200).
 */
describe('panel-auth E2E: GitHub OAuth отвечает 302, а не 200 с Location (#2375)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    vi.stubEnv('PANEL_GITHUB_CLIENT_ID', 'e2e-client-id');
    vi.stubEnv('PANEL_GITHUB_CLIENT_SECRET', 'e2e-client-secret');
    app = await createOfficeFastifyApp();
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    if (app) await app.close();
  });

  it('GET /github → 302 на github.com/login/oauth/authorize', async () => {
    const res = await request(app.getHttpServer()).get('/v1/panel/auth/github');
    expect(res.status).toBe(302);
    expect(String(res.headers.location)).toMatch(/^https:\/\/github\.com\/login\/oauth\/authorize\?/);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('GET /github/callback с валидным state → 302 на витрину и cookie сессии', async () => {
    const service = app.get(PanelAuthService);
    vi.spyOn(service, 'exchangeGithubCode').mockResolvedValue({ id: '1', login: 'e2e-owner' });
    vi.spyOn(service, 'roleForGithubUser').mockReturnValue('owner');
    const state = service.mintOauthState();

    const res = await request(app.getHttpServer()).get(`/v1/panel/auth/github/callback?code=c&state=${encodeURIComponent(state)}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
    expect(String(res.headers['set-cookie']?.[0] ?? '')).toContain(PANEL_SESSION_COOKIE);
  });
});
