# Сессия В — 20.08: media-per-device-token (реализация ADR-0028 Р1+Р2)

> Точка входа отдельной сессии. **Всё — через `membrana-local-sprint`**: нарезка с
> персонами → ратификация владельцем В ЧАТЕ → код; сессии не работают в одиночку без
> виртуальной команды. Магистраль дня (`studio-firebat-user-pairing`) — НЕ ваша.

## Контекст (сверено 20.08)

ADR-0028 (`docs/adr/ADR-0028-pair-media-token-per-device.md`, PR #2018): парринг кабинета
сегодня кладёт в `PairResponse.mediaToken` **служебный `MEDIA_API_TOKEN`** — он у каждого
спаренного клиента в localStorage. Образец решения — вчерашний `NodeKey` (ADR-0027, b2
`firebat-node-device`): таблица с sha256-хешем, guard, мягкий отзыв
(`packages/background-media/src/modules/firebat-node/node-key.*`).

## Объём (Р1+Р2 ADR-0028; Р3/Р4 — НЕ ваши)

1. **Р1**: media выдаёт per-device ключ при регистрации устройства через мост кабинета
   (`MediaBridgeService.registerDevice` / отдельный вызов под служебным токеном);
   `PairResponse.mediaToken` несёт ЕГО, не `MEDIA_API_TOKEN`. Форма поля (строка) не
   меняется — клиент контрактно не трогается. Носитель — таблица `NodeKey`; рекомендация
   Веснина: поле `audience: 'node' | 'client'` (два subjects — не декор), решает ваш резчик.
   Guard клиентских ручек media (upload/collections под device-token) — по образцу NodeKeyGuard.
2. **Р2**: отзыв связки в кабинете (`pairedKey` revoke) зовёт отзыв media-ключа
   (`DELETE /v1/devices/:id/node-key` или client-аналог). Потеря узла = одно действие.

## Запрещено

Р3 (ротация MEDIA_API_TOKEN) — только после раскатки, НЕ сегодня. Р4 (включение
safeStorage на клиенте) — не ваш. Менять форму PairResponse (поля/типы) запрещено.
Прод НЕ деплоить (после #2009 деплой без e2e-smoke Тарасов не подписывает) — код в
ствол, деплой отдельным словом владельца. Прямые правки apps/client — не ваши.

## DoD

Нарезка ратифицирована владельцем до кода · зубы media+cabinet без Postgres (хранилище
за интерфейсом, класс NodeKeyStore) · `pair` в зубах возвращает per-device ключ ·
ревок каскадит · sprint:gate/experience записаны · PR ≤400 строк каждый, Issue с первым PR.
