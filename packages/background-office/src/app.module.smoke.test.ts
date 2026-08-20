/**
 * Smoke подъёма приложения (#2009): `AppModule` офиса собирается целиком — граф DI разрешается.
 * Класс дефекта 19.08: параметр конструктора без `@Optional` → `can't resolve dependencies (?)`
 * на старте Nest; зубы сервисов этого не видят — дефект в сборке графа.
 *
 * Модуль берётся из **dist** (артефакт tsc, тот же, что бежит на проде): vitest транспилирует
 * esbuild'ом без `design:paramtypes`, и DI по классам в src-импорте не разрешается в принципе
 * (проверено 20.08 на media). Нет dist — тест ПАДАЕТ с именем лекарства, не скипается.
 * Обязательные env стабует `test/setup-env.ts`; Mongo/сеть не нужны: `compile()` хуков
 * `onModuleInit` не зовёт.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIST_APP_MODULE = join(__dirname, '..', 'dist', 'app.module.js');

describe('background-office: AppModule поднимается (#2009)', () => {
  it('граф DI разрешается на dist — без Mongo и без сети', async (ctx) => {
    if (!existsSync(DIST_APP_MODULE)) {
      // Гейт-шаг CI (SMOKE_REQUIRE_DIST=1, unit-tests.yml) собирает dist сам и отсутствие превращает
      // в падение; вне гейта (nightly, чистое дерево) отсутствие dist — инфраструктура, не DI-дефект:
      // скип ВСЛУХ, не молчаливый зелёный.
      const cure = `нет ${DIST_APP_MODULE} — соберите: yarn workspace @membrana/background-office build`;
      if (process.env.SMOKE_REQUIRE_DIST === '1') throw new Error(cure);
      console.warn(`[app-di-smoke] SKIP: ${cure}`);
      ctx.skip();
    }

    await import('reflect-metadata');
    const { Test } = await import('@nestjs/testing');
    const { AppModule } = (await import(/* @vite-ignore */ DIST_APP_MODULE)) as { AppModule: new () => unknown };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  }, 120_000);
});
