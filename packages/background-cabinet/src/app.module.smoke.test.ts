/**
 * Smoke подъёма приложения (#2009): `AppModule` КАБИНЕТА собирается целиком — граф DI
 * разрешается. Заведён по инциденту 24.08: деплой кабинета упал на
 * `UnknownDependenciesException — HealthDeepService (PrismaService, ?)` — параметр
 * конструктора с типом-функцией пытался инжектиться; у офиса и медиа такой смоук был,
 * у кабинета — нет, и класс поймал прод-контейнер, а не CI.
 *
 * Модуль берётся из **dist** (артефакт tsc, тот же, что бежит на проде): vitest
 * транспилирует esbuild'ом без `design:paramtypes`, и DI по классам в src-импорте не
 * разрешается в принципе. Нет dist — в гейт-шаге CI (SMOKE_REQUIRE_DIST=1) тест падает
 * с именем лекарства, вне гейта — скип ВСЛУХ. База/сеть не нужны: `compile()` хуков
 * `onModuleInit` не зовёт.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIST_APP_MODULE = join(__dirname, '..', 'dist', 'app.module.js');

describe('background-cabinet: AppModule поднимается (#2009)', () => {
  it('граф DI разрешается на dist — без базы и без сети', async (ctx) => {
    if (!existsSync(DIST_APP_MODULE)) {
      const cure = `нет ${DIST_APP_MODULE} — соберите: yarn workspace @membrana/background-cabinet build`;
      if (process.env.SMOKE_REQUIRE_DIST === '1') throw new Error(cure);
      console.warn(`[app-di-smoke] SKIP: ${cure}`);
      ctx.skip();
      return;
    }

    await import('reflect-metadata');
    const { Test } = await import('@nestjs/testing');
    const { AppModule } = (await import(/* @vite-ignore */ DIST_APP_MODULE)) as {
      AppModule: new () => unknown;
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  }, 120_000);
});
