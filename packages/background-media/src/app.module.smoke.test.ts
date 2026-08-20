/**
 * Smoke подъёма приложения (#2009): `AppModule` собирается целиком — граф DI разрешается.
 *
 * Ровно тот класс, что уронил прод 19.08 (restart-loop ~8 минут): параметр конструктора с типом
 * функции/интерфейса без `@Optional` → `Nest can't resolve dependencies (?)`. Зубы строили сервисы
 * напрямую и этого не видели — дефект живёт в СБОРКЕ графа, не в сервисе.
 *
 * Модуль берётся из **dist**, не из src: vitest транспилирует esbuild'ом, который не эмитит
 * `design:paramtypes`, и DI по классам не разрешается в принципе (ложное красное на здоровом
 * графе — проверено 20.08). Прод бежит по dist от tsc — smoke судит тот же артефакт. Нет dist —
 * тест ПАДАЕТ с именем лекарства, не скипается: молчаливый зелёный и был бы дефектом контура.
 *
 * БД не нужна намеренно: `compile()` инстанцирует провайдеры и разрешает зависимости, но хуки
 * `onModuleInit` (где `PrismaService.$connect()`) не зовёт — их зовёт `app.init()`. Это
 * least-effort из #2009; testcontainers не требуются. Обязательные env стабуются до импорта.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIST_APP_MODULE = join(__dirname, '..', 'dist', 'app.module.js');

describe('background-media: AppModule поднимается (#2009)', () => {
  it('граф DI разрешается на dist — без БД и без внешних env', async (ctx) => {
    if (!existsSync(DIST_APP_MODULE)) {
      // Гейт-шаг CI (SMOKE_REQUIRE_DIST=1, unit-tests.yml) собирает dist сам и отсутствие превращает
      // в падение; вне гейта (nightly, чистое дерево) отсутствие dist — инфраструктура, не DI-дефект:
      // скип ВСЛУХ, не молчаливый зелёный.
      const cure = `нет ${DIST_APP_MODULE} — соберите: yarn workspace @membrana/background-media build`;
      if (process.env.SMOKE_REQUIRE_DIST === '1') throw new Error(cure);
      console.warn(`[app-di-smoke] SKIP: ${cure}`);
      ctx.skip();
    }
    process.env.NODE_ENV = 'test';
    process.env.API_INTERNAL_TOKEN ??= 'smoke-token';
    process.env.DATABASE_URL ??= 'postgresql://smoke:smoke@127.0.0.1:5432/smoke';

    await import('reflect-metadata');
    const { Test } = await import('@nestjs/testing');
    const { AppModule } = (await import(/* @vite-ignore */ DIST_APP_MODULE)) as { AppModule: new () => unknown };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  }, 120_000);
});
