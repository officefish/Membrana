# Membrana Local Sprint OPEN: media-per-device-token

| Поле | Значение |
|------|----------|
| Sprint | `media-per-device-token` |
| Procedure | `membrana-local-sprint` |
| Registry card | `media-per-device-token` (M, ADR-0028 R1+R2; Issue с первым PR) |
| Prompt | [`SESSION_V_PER_DEVICE_TOKEN_SPRINT_2026-08-20.md`](../../prompts/SESSION_V_PER_DEVICE_TOKEN_SPRINT_2026-08-20.md) |
| ADR | [`ADR-0028-pair-media-token-per-device.md`](../../adr/ADR-0028-pair-media-token-per-device.md) |
| Cut plan | [`media-per-device-token.json`](../../sprint/cut/media-per-device-token.json) · recut-2 b5 ратифицирован владельцем в чате |
| Cutter context | Веснин, `ask vesnin` 20.08, два захода → [`cut-media-per-device-token-vesnin.md`](../../discussions/cut-media-per-device-token-vesnin.md) |
| Lead | vesnin |
| Support | ozhegov · dynin · angelina · tarasov |
| Status | closed · gate pass |

## Зачем

ADR-0028 фиксирует риск: `PairService.pair` в кабинете отдаёт каждому спаренному клиенту
`PairResponse.mediaToken = MEDIA_API_TOKEN`, то есть служебный токен всего media-сервиса.
Р1+Р2 этого спринта заменяют содержимое поля на отзываемый per-device client key и каскадно
отзывают его при revoke `pairedKey`.

Вне спринта: Р3 ротация служебного токена, Р4 safeStorage на клиенте, изменение формы
`PairResponse`, прод-деплой, прямые правки `apps/client`.

## Контекст Резчика

- `PairService.pair` (`packages/background-cabinet/src/modules/pair/pair.service.ts`) возвращает
  `mediaToken: this.config.MEDIA_API_TOKEN`.
- `MediaBridgeService.registerDevice` (`packages/background-cabinet/src/modules/pair/media-bridge.service.ts`)
  создаёт media-device и сейчас получает только `{ id, name, kind, createdAt }`.
- Образец ADR-0027 уже в media: `NodeKeyService`, `NodeKeyStore`, `NodeKeyGuard`,
  `NodeKeyController`, `NodeKey` в Prisma с sha256-хешем и мягким отзывом.
- Клиентские device-scoped media-ручки сегодня закрыты `ApiTokenGuard + DeviceGuard`;
  они должны принять client audience key в том же заголовке `X-Membrana-Token`, без client-кода.
- `MembraneService.revokeAccessKey` уже чистит session, `pairingStatus` и node realtime; туда
  добавляется media revoke cascade.

## Блоки

| Блок | Персона | Зона | Оценка | Статус |
|------|---------|------|-------:|--------|
| b1 media key audience | ozhegov | `packages/background-media/src/modules/firebat-node/node-key.*` · `packages/background-media/prisma/` | 260 | done · signed |
| b2 media client access | dynin | `packages/background-media/src/modules/devices/*` · device-scoped client media controllers | 260 | done · signed |
| b3 cabinet pair bridge | ozhegov | `packages/background-cabinet/src/modules/pair/*` | 210 | done · signed |
| b4 cabinet revoke cascade | dynin | `packages/background-cabinet/src/modules/membrane/*` | 120 | done · signed |
| b5 gate and review trail | angelina (+ tarasov review evidence) | `docs/local-sprint/media-per-device-token/` · focused checks | 60 | done · gate pass |

## Приёмка

- `pair` в тестах возвращает per-device client key, а не `MEDIA_API_TOKEN`.
- Media key store тестируется через in-memory `NodeKeyStore`; Postgres не нужен для зубов.
- Client-token проходит `collections`, `samples`, `device-workspaces`, legacy `device-scenario`
  и `trends-templates` только для своего `deviceId` и audience `client`.
- Revoke `pairedKey` вызывает media revoke для `mediaDeviceId`; ошибка media названа, без молчаливого зелёного.
- `sprint:gate` и `sprint:experience` записаны после исполнения.
