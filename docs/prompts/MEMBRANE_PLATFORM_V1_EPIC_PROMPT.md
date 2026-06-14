# Промпт (эпик): Membrane Platform v1 — cabinet, pairing, tariff, cloud journal

> **Task-промпт для координатора и постановщика** (не для одного PR).
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер эпика: **L** (6+ последовательных PR).
> Реестр: `id` = `membrane-platform-v1` в [`docs/tasks/registry.json`](../tasks/registry.json).
> Консилиум: [`discussions/membrane-platform-consilium-2026-06-13.md`](../discussions/membrane-platform-consilium-2026-06-13.md).
> Канон: [`MEMBRANE_PLATFORM.md`](../MEMBRANE_PLATFORM.md).

---

## Контекст

`background-media` даёт data-plane по анонимному `deviceId`. Нужен **личный кабинет** (`cabinet.membrana.space`), login/password, модель **Мембрана → Узел → Device**, управляемые **ключи с TTL enum** (4ч, 3д, 2н, 1мес, 3мес), тарифы с **отдельными** квотами userStorage/buffer и каталогом dataset (`datasetCatalogId`), pairing в **`apps/client`**, облачный журнал (**TelemetryReport** + **TelemetryLiveRecord**).

Десктоп — тот же `apps/client`, не отдельное приложение.

**Подзадачи (строгий порядок):**

| Фаза | Реестр `id` | Содержание | PR |
|------|-------------|------------|-----|
| MP0 Domain | `membrane-platform-mp0-domain` | Consilium + `MEMBRANE_PLATFORM.md` (этот эпик) | docs |
| MP1 Auth | `membrane-platform-mp1-auth-cabinet` | `packages/background-cabinet` bootstrap, login/password, `apps/cabinet` shell | 1 |
| MP2 Keys | `membrane-platform-mp2-membrane-node-keys` | Membrane, Tariff seed `free-v1`, Node, `NodeAccessKeyDuration` enum | 2 |
| MP3 Pairing | `membrane-platform-mp3-client-pairing` | Pairing + **автономный режим узла** в `apps/client` | 3 |
| MP4 Media | `membrane-platform-mp4-media-membrane` | Media scope `membraneId`, userStorage/buffer квоты, tariff dataset | 4 |
| MP5 Journal | `membrane-platform-mp5-telemetry-journal` | Report + LiveRecord API, shared journal cards | 5 |
| MP6 Deploy | `membrane-platform-mp6-prod-deploy` | Финальная prod-регрессия MP1–MP5, runbook | 6+ |

> **Приёмка:** после **каждой** фазы MP1–MP5 — деплой на прод и prod-smoke **до** `yarn task:archive`. См. [`deploy/MEMBRANE_PLATFORM_DEPLOY.md`](../deploy/MEMBRANE_PLATFORM_DEPLOY.md).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`MEMBRANE_PLATFORM.md`](../MEMBRANE_PLATFORM.md) | Глоссарий, TTL enum, тарифы, потоки |
| [`BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md) | office / media / **cabinet** границы |
| [`MEDIA_LIBRARY_ARCHITECTURE.md`](../MEDIA_LIBRARY_ARCHITECTURE.md) | remote-server, quota |
| [`API_SERVER_BOOTSTRAP_PROMPT.md`](./API_SERVER_BOOTSTRAP_PROMPT.md) | Эталон NestJS-пакета |
| [`packages/background-media/README.md`](../../packages/background-media/README.md) | Текущий deviceId API |
| [`deploy/MEMBRANE_PLATFORM_DEPLOY.md`](../deploy/MEMBRANE_PLATFORM_DEPLOY.md) | Prod-smoke по фазам, закрытие задач |

**GitHub Issue:** [#67](https://github.com/officefish/Membrana/issues/67).

**Ветка:** архитектурные изменения → **`vesnin`**.

---

## NodeAccessKeyDuration (обязательно в MP2)

```typescript
export enum NodeAccessKeyDuration {
  hours_4 = 'hours_4',   // 4 часа
  days_3 = 'days_3',     // 3 дня
  weeks_2 = 'weeks_2',   // 2 недели
  month_1 = 'month_1',   // 1 месяц (календарный)
  months_3 = 'months_3', // 3 месяца (календарные)
}
```

UI cabinet: select с метками «4 часа», «3 дня», «2 недели», «1 месяц», «3 месяца». Не путать с форматом QR/файл.

---

## Definition of Done (эпик целиком)

- [ ] Все подзадачи MP0–MP6 в реестре `archived` с отчётами в Issue #67 (**после prod-smoke** каждой фазы).
- [ ] Login на membrana.space → session в cabinet.
- [ ] Пользователь создаёт узел и ключ с любым из 5 TTL; ключ истекает по `expiresAt`.
- [ ] `apps/client` подключается по ключу; media в `remote-server` с изоляцией мембраны.
- [ ] Пользователь **всегда** может выбрать **автономный режим узла** (данные в ФС, без pairing).
- [ ] В футере client при `autonomous` — предупреждение «узел работает автономно».
- [ ] При ошибке связи с сервером в режиме `paired` — предложение перейти в автономный режим.
- [ ] `userStorage` и `buffer` квоты отображаются и enforced отдельно; `datasetCatalogId` виден в cabinet (tariff `free-v1`: 1 GiB + 1 GiB + `free-v1-catalog`).
- [ ] В cabinet видны TelemetryReport и TelemetryLiveRecord (shared render с client).
- [ ] MP6: полная prod-регрессия smoke MP1–MP5 (см. deploy runbook).

---

## Definition of Done (одна фаза MP1–MP5)

1. PR merged в `vesnin` / интеграционную ветку.
2. Деплой на VPS (инкрементально поверх предыдущей фазы).
3. Prod-smoke из [`deploy/MEMBRANE_PLATFORM_DEPLOY.md`](../deploy/MEMBRANE_PLATFORM_DEPLOY.md) — все пункты фазы + нет регрессии предыдущих.
4. Отчёт в Issue #67 + `yarn task:archive <id> --notes "Prod smoke OK YYYY-MM-DD"`.

**MP1 дополнительно:** в том же или следующем PR — Dockerfile, compose, Caddy, `deploy/cabinet-stack.sh` (по аналогии с media A5b–A5c).

---

## Слой → путь → ответственность

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Cabinet UI | `apps/cabinet` | Login, мембрана, узлы, ключи (duration select), журнал |
| Identity API | `packages/background-cabinet` | Users, sessions, membranes, nodes, keys, tariffs, telemetry CRUD |
| Data-plane | `packages/background-media` | Samples, templates, quota enforcement по tariff |
| Desktop | `apps/client` | **Автономный узел** (ФС) или pairing, remote-server, журнал + sync |
| Shared enum | `background-cabinet` types (v1); core — только при cross-package need | `NodeAccessKeyDuration` |

**Запрещённые импорты:**

- `background-cabinet` → `@membrana/agenda`, `apps/client`
- `background-media` → password hashes, session store
- `apps/cabinet` → прямой доступ к media blobs без API

---

## Out of scope (эпик)

- OAuth / SSO / magic link
- Несколько мембран или узлов без расширения Tariff
- Платежи и смена тарифа пользователем
- Org / team RBAC
- Offline IndexedDB ↔ server full sync (media v2)
- Inference GPU

---

## Заметки для постановщика

1. MP0 — только docs, prod не требуется (уже archived).
2. **MP1–MP5:** не архивировать без prod-smoke ([`deploy/MEMBRANE_PLATFORM_DEPLOY.md`](../deploy/MEMBRANE_PLATFORM_DEPLOY.md)).
3. Старт кода и деплоя — ветка **`vesnin`**.
4. MP4 зависит от MP2 (membraneId) и MP3 (paired deviceId).
5. MP6 — после MP5: полная регрессия smoke, не первый выход cabinet в prod.
6. Детальные промпты MP1-deploy, MP2… — по аналогии с `BACKGROUND_MEDIA_A5A_*`.
