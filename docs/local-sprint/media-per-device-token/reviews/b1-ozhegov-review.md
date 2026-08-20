# b1 review — Ozhegov

Проверено: Prisma enum `NodeKeyAudience`, индекс по `deviceId/audience/revokedAt`, `NodeKeyService.issue/verify/revoke` с default `node`, guard/controller узла явно требуют `node`.

Зуб: `packages/background-media/src/modules/firebat-node/node-key.service.test.ts` фиксирует раздельные node/client ключи, `foreign_audience` и client-only revoke.

Вердикт: pass.

Подпись: ozhegov · review_pass · b1-media-key-audience.
