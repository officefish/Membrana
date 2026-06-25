# Membrane Platform — деплой и prod-smoke по фазам

> **Регламент приёмки эпика [#67](https://github.com/officefish/Membrana/issues/67):**
> каждая фаза **MP1–MP5** считается готовой к архивации только после **деплоя на прод** и прохождения **prod-smoke** из таблицы ниже.
> Локальный dev и CI **не заменяют** prod-проверку.
>
> Канон: [`MEMBRANE_PLATFORM.md`](../MEMBRANE_PLATFORM.md) · Эпик: [`prompts/MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md`](../prompts/MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md).

---

## Принцип закрытия задач

```text
merge PR → деплой на VPS → prod-smoke фазы → отчёт в Issue #67 → yarn task:archive <id>
```

| Нельзя | Можно |
|--------|--------|
| `task:archive` только по локальному dev | Архив после prod-smoke + LGTM |
| Отложить весь prod на MP6 | Инкрементальный деплой после каждой фазы |
| Закрыть эпик без регрессии smoke MP1…MP5 | MP6 — финальная регрессия + runbook |

Связь с [`TASK_CLOSURE_REGULATION.md`](../prompts/TASK_CLOSURE_REGULATION.md): для задач `membrane-platform-mp*` в `archiveNotes` **обязательна** строка `Prod smoke: OK` + дата + URL.

---

## Prod-топология (цель, v0.6 — 2 VPS)

> Аудит диска 2026-06-25 (#178): combined 14 GB VPS — **legacy**; blobs малы, Docker overhead велик. Канон ёмкости: [`TARIFF_MATRIX.md`](../TARIFF_MATRIX.md) §«Platform capacity».

| VPS | Роль | Specs (ориентир) | DNS / сервисы |
|-----|------|------------------|---------------|
| **Platform** | paired data-plane + cabinet | **50 GB NVMe**, **4 GB RAM**, 2×5 GHz, 200 Mbps | `media.membrana.space` · `cabinet.membrana.space` |
| **Integrations** | RAG + Claude/Linear/GitHub | **≥14 GB** disk (после split), **≥2 GB RAM** | `office.membrana.space` + LanceDB (`.membrana/rag/`) |

| DNS | Сервис | Порт (внутри) | Фаза | VPS |
|-----|--------|---------------|------|-----|
| `media.membrana.space` | `background-media` | 3010 | #58–#66 | **Platform** |
| `cabinet.membrana.space` | `apps/cabinet` + API paths `/health`, `/v1/*` | 3020 / 8080 | **MP1** | **Platform** |
| `cabinet-api.membrana.space` | `background-cabinet` (опционально) | 3020 | MP1+DNS | **Platform** |
| `office.membrana.space` | `background-office` + RAG | 3000 | O1–O3 | **Integrations** |

**Soft caps (shared platform 4 GB):** free-v1 до **100** paired membranes; indie-v1 до **30**; business-v1 — **отдельный** узел (см. TARIFF_MATRIX).

Caddy TLS + Docker Compose на каждом VPS; секреты в `/etc/membrana/*.env`.

Эталон media: [`BACKGROUND_MEDIA_DEPLOY.md`](./BACKGROUND_MEDIA_DEPLOY.md) §12, `deploy/media-stack.sh`.
Эталон cabinet: [`BACKGROUND_CABINET_DEPLOY.md`](./BACKGROUND_CABINET_DEPLOY.md).

**Legacy (до миграции):** media + cabinet + office на одном 14 GB хосте — допустимо для smoke, **не** для beta load.

---

## Десктоп-продукты (DR6 deploy-pipeline-refactor)

`apps/client` — **dev-песочница/renderer**, не поставляемый продукт; веб-клиента в линейке нет.
Конечные продукты — **Electron-приложения**: `membrana-studio` (полная работа с контентом) и будущее
лёгкое `device` (периферия: быстрая доставка данных на сервер). Доставка — Electron-пакеты, не веб-бандл.

Сборка десктопа **декаплирована** от деплоя сервера и **условная** — workflow
[`.github/workflows/desktop-studio.yml`](../../.github/workflows/desktop-studio.yml) собирает installer
только когда `@membrana/client`/`@membrana/membrana-studio` затронуты (turbo affected), не на каждый
серверный деплой. Релиз — тегом:

```bash
git tag studio-v0.1.0 && git push origin studio-v0.1.0   # CI: NSIS → GitHub Release
```

Детали и prod-smoke студии: [`apps/membrana-studio/README.md`](../../apps/membrana-studio/README.md).

### Совместимость контракта `runtime` и индикатор версии (DR6, часть 2)

Единый источник истины версии рантайм-протокола node-realtime — `RUNTIME_PROTOCOL_VERSION` в
`@membrana/core` (`packages/core/src/contracts/runtime-version.ts`). Бампается при **несовместимом**
изменении wire-формата (envelope/каналы/события).

- **Сервер** отдаёт `protocolVersion` в `GET /health` (рядом с `version`/`uptime`).
- **Клиент** собран со своей `CLIENT_RUNTIME_PROTOCOL_VERSION` и сверяет её с серверной через
  `evaluateRuntimeCompatibility()` (`apps/client/src/lib/runtimeVersion.ts`).
- **Индикатор** `RuntimeVersionIndicator` показывает версию приложения и состояние:
  `ok` / `Доступно обновление` (сервер новее) / `Сервер устарел` (клиент новее) / `unknown`
  (сервер недоступен); при «требует внимания» — `aria-live="polite"`.
- **Тест совместимости** (CI): `packages/core/src/contracts/runtime-version.test.ts` фиксирует правило
  сверки, `apps/client/src/lib/runtimeVersion.test.ts` — парсинг `/health` и состояние индикатора.
  Дрейф «сервер↔клиент» ловится единым источником версии в core + красным тестом.

Бизнес-логика (compute/parse/fetch) отделена от презентации — индикатор чисто отображает результат.

---

## Деплой по образу и откат (DR2/DR3 deploy-pipeline-refactor)

Прод cabinet деплоится из иммутабельного образа GHCR по тегу (а не сборкой на VPS).
Подробности и гейты — [`BACKGROUND_CABINET_DEPLOY.md`](./BACKGROUND_CABINET_DEPLOY.md).

### Деплой релиза

```bash
# 1) пометить релиз тегом → CI собирает и пушит образ cabinet-api/-web в GHCR
git tag cabinet-v1.2.3 && git push origin cabinet-v1.2.3
# 2) выкатить образ по тегу (гейты preflight + ci-gate; pull до down/up)
CABINET_IMAGE_TAG=cabinet-v1.2.3 yarn cabinet:deploy:image:prod
```

Каждый деплой/откат пишет **машиночитаемую JSON-сводку** в `deploy-artifacts/`
(`cabinet-deploy-*.json` / `cabinet-rollback-*.json`) и печатает её в конце прогона:

```json
{
  "service": "cabinet",
  "mode": "image",
  "imageTag": "cabinet-v1.2.3",
  "images": { "api": "ghcr.io/officefish/membrana-cabinet-api:cabinet-v1.2.3", "web": "…:cabinet-v1.2.3" },
  "branch": "main",
  "composeSha": "<sha origin/main>",
  "startedAt": "…", "finishedAt": "…", "durationMs": 123456,
  "exitCode": 0, "smokeOk": true, "ok": true
}
```

`ok: true` ⇔ remote-скрипт завершился `exit 0` **и** прошёл маркер `CABINET IMAGE DEPLOY OK`.

### Расширенный smoke (DR4)

Узкий smoke (health + 200 на SPA) ложно-зелёный при мёртвом login / непримененной миграции /
упавшем рантайм-канале. Единый скрипт `scripts/_ssh-cabinet-smoke.mjs` проверяет функциональность
и падает (`exit ≠ 0`) при любом провале:

| # | Проверка | Что подтверждает |
|---|----------|------------------|
| 1 | `GET /health` | API живой |
| 2 | `POST /v1/auth/login` (bootstrap admin) | аутентификация работает, есть `token` |
| 3 | `GET /v1/auth/me` | сессия валидна |
| 4 | `GET /v1/membranes/me` | мембрана/узлы доступны |
| 5 | `prisma migrate status` в контейнере cabinet-api | нет непримененных миграций |
| 6 | WS `/v1/nodes/realtime?role=cabinet` открыт и не закрыт auth | рантайм-канал жив + cabinet-auth ок |

```bash
# вручную после деплоя
yarn cabinet:smoke:prod

# автоматически в конце деплоя
CABINET_SMOKE_AFTER_DEPLOY=1 CABINET_IMAGE_TAG=cabinet-v1.2.3 yarn cabinet:deploy:image:prod
```

Smoke печатает JSON-сводку (`checks[]`, `failed[]`, `ok`); при `CABINET_SMOKE_AFTER_DEPLOY=1`
она вкладывается в сводку деплоя как поле `smoke`, и общий `ok` учитывает её результат.

### Откат (rollback)

Откат — это деплой **предыдущего известно-хорошего тега**. Образ уже собран и иммутабелен,
поэтому ci-gate обходится автоматически; preflight (чистое дерево) сохраняется.

```bash
# показать доступные релизные теги (свежие сверху) и выйти
yarn cabinet:rollback:prod

# откатиться на конкретный тег
CABINET_ROLLBACK_TAG=cabinet-v1.2.2 yarn cabinet:rollback:prod
```

Процедура при сбойном релизе:

1. Зафиксировать симптом (упавший prod-smoke / 5xx) и текущий тег из JSON-сводки последнего деплоя.
2. `CABINET_ROLLBACK_TAG=<предыдущий cabinet-v*> yarn cabinet:rollback:prod`.
3. Дождаться `ok: true` в rollback-сводке и зелёного prod-smoke.
4. Завести issue на причину; чинить в обычном цикле (PR → CI → новый тег), не хотфиксом на VPS.

> **Миграции БД.** Откат образа возвращает код, но **не откатывает применённые миграции**
> (`prisma migrate deploy` идемпотентен только вперёд). Поэтому миграции должны быть
> обратносовместимыми (expand/contract — регламент DR5): старый код обязан работать с уже
> применённой схемой. Несовместимое изменение схемы делает откат по образу небезопасным.

---

## Prod-smoke по фазам

### MP1 — Auth + shell (`membrane-platform-mp1-auth-cabinet`)

| # | Проверка | Ожидание |
|---|----------|----------|
| 1 | `GET https://cabinet.membrana.space/health` | `200`, `status: "ok"` |
| 2 | `POST https://cabinet.membrana.space/v1/auth/login` (prod user) | `200`, `token`, `user.login` |
| 3 | `GET https://cabinet.membrana.space/v1/auth/me` + `Authorization: Bearer` | `200`, тот же user |
| 4 | `GET https://cabinet.membrana.space/` | SPA загружается (200) |
| 5 | Login в браузере | Shell после входа, logout работает |
| 6 | `ALLOW_REGISTRATION` на проде | `false` (регистрация только admin/seed) |

**Артефакты деплоя (DoD MP1):** `packages/background-cabinet/Dockerfile`, compose, `deploy/cabinet-stack.sh`, `deploy/Caddyfile.cabinet.example`, `deploy/generate-cabinet-env.sh`.

---

### MP2 — Membrane, Tariff, Node, ключи TTL (`membrane-platform-mp2-membrane-node-keys`)

| # | Проверка | Ожидание |
|---|----------|----------|
| 1 | MP1 smoke | без регрессии |
| 2 | UI: раздел «Мембрана» | тариф `free-v1`, квоты userStorage/buffer, `datasetCatalogId` |
| 3 | Создать узел | 1 узел на мембрану |
| 4 | Создать ключ с каждым `NodeAccessKeyDuration` | plaintext один раз, `expiresAt` корректен |
| 5 | Отзыв / ротация ключа | старый не принимается |

---

### MP3 — Pairing client (`membrane-platform-mp3-client-pairing`)

| # | Проверка | Ожидание |
|---|----------|----------|
| 1 | MP1–MP2 smoke | без регрессии |
| 2 | Выбор **автономного режима** при старте / в настройках | client работает с локальной ФС, pairing не требуется |
| 3 | Футер в `autonomous` | предупреждение: узел работает автономно |
| 4 | `apps/client` → «Связь с мембраной» | pairing по ключу с прода |
| 5 | После pairing | `deviceId` привязан, сессия client жива, футер — связанный режим |
| 6 | Имитация недоступности cabinet/media | диалог: предложение перейти в автономный режим; анализ не блокируется |

Проверка — **в браузере на полевом ПК** с HTTPS client build (не только localhost).

---

### MP4 — Media per membrane (`membrane-platform-mp4-media-membrane`)

| # | Проверка | Ожидание |
|---|----------|----------|
| 1 | MP1–MP3 smoke | без регрессии |
| 2 | `GET media…/quota` для paired device | отдельно `userStorage` и `buffer`; `dataset.catalogId` |
| 3 | Upload sample в user/buffer | учёт соответствующей квоты tariff |
| 4 | Второй membrane / device | изоляция данных |

---

### MP5 — Cloud journal (`membrane-platform-mp5-telemetry-journal`)

| # | Проверка | Ожидание |
|---|----------|----------|
| 1 | MP1–MP4 smoke | без регрессии |
| 2 | Client upload Report | карточка в cabinet |
| 3 | LiveRecord | badge live / lifecycle в UI |
| 4 | Shared render | тот же payload-type, что в client journal |

---

### MP6 — Финализация (`membrane-platform-mp6-prod-deploy`)

Не «первый выход в prod», а **закрепление runbook**:

| # | Проверка | Ожидание |
|---|----------|----------|
| 1 | Полная регрессия MP1–MP5 smoke | один чеклист, один сеанс |
| 2 | Документация деплоя | актуальна, секреты не в git |
| 3 | `membrana.space` → login | редирект / ссылка на cabinet (если в scope v1) |
| 4 | Мониторинг / health | Caddy + docker healthchecks |

---

## Шаблон отчёта в Issue #67 (перед `task:archive`)

```markdown
## MP<n> — отчёт

- PR: #…
- Deploy: `deploy/cabinet-stack.sh up` @ branch `vesnin` / `techies68`
- Prod smoke: OK (YYYY-MM-DD)
- Проверил: …

### Smoke
- [ ] … (из таблицы MP<n> выше)
```

---

## Команды

```bash
yarn cabinet:mp6:prod   # MP6: full MP1–MP5 regression (one session)
yarn cabinet:mp7:prod   # MP7: MP1–MP5 + WebSocket journal/mic-live smoke
```

Локально: `yarn cabinet:docker:up` или dev: `yarn cabinet:db:up` → `yarn cabinet:migrate` → `yarn cabinet:seed` → `yarn cabinet:dev` + `yarn cabinet:app:dev`.

---

### MP7 — Node Realtime Gateway (`membrane-node-realtime-nr6-prod-hardening`, Issue [#92](https://github.com/officefish/Membrana/issues/92))

| # | Проверка | Ожидание |
|---|----------|----------|
| 1 | MP1–MP5 smoke (REST) | без регрессии |
| 2 | `wss://cabinet.membrana.space/v1/nodes/realtime` | node + cabinet WS `101` |
| 3 | `journal.append` по WS | cabinet subscriber получает fan-out ≤20 с |
| 4 | `analysis.brief` по WS | cabinet subscriber получает mic-live brief |
| 5 | `NODE_REALTIME_ENABLED` на cabinet-api | default `true`; `false` → WS close `4503` |
| 6 | Client `VITE_NODE_REALTIME_ENABLED` | default on; `false` → REST-only push |
| 7 | WS down | client REST journal + cabinet poll 1 с (fallback) |

**Команда:** `yarn cabinet:mp7:prod` (без rebuild; `MEMBRANA_DEPLOY_REBUILD=1` при необходимости).

**Runbook:** reconnect с exponential backoff в `nodeRealtimeClient` / `cabinetNodeRealtimeClient`; paired journal — dual path (WS + REST) в `SyncJournalStorageBackend`.

---

### MP7b — Node Runtime Remote (`membrane-node-runtime-remote`, RT0–RT7)

Канал `runtime` поверх MP7-gateway: кабинет управляет live-мониторингом узла (run/stop/mode) по WS, узел шлёт `runtime.state`/`runtime.log`.

| # | Проверка | Ожидание |
|---|----------|----------|
| 1 | MP7 smoke (journal + mic-live) | без регрессии |
| 2 | Кабинет «Узлы»: ≥2 узла, у каждого run/stop + режим (в running) | список из RT4/RT5 multi-node |
| 3 | Run из кабинета → узел | `runtime.command{run, deviceId}` → headless `ScenarioRuntime` стартует; реальный звук с микрофона |
| 4 | `runtime.state` → кабинет | карточка узла: info-пульс (normal), warning-рамка (alarm) |
| 5 | `setMode('alarm')` из кабинета | узел форсит alarm-loop (detection-front игнорируется); `normal` возвращает в main |
| 6 | Reconnect узла (обрыв WS) | после `connected` узел повторно публикует снимок `runtime.state`; кабинет видит актуальный статус |
| 7 | Персист режима | `setMode` сохраняется в localStorage; после рестарта узла режим восстановлен и применяется при старте |
| 8 | Device-board UX | нет верхних табов; шапка run/stop + normal/alarm; левый сайдбар вкладок; правый — инспектор/палитра; clear + rebuild |
| 9 | Signal advanced-флаг | без `VITE_DEVICE_BOARD_SIGNAL_ADVANCED` UI сигнала скрыт; сериализация документа не меняется |

**Targeting multi-node:** `runtime.command` несёт `payload.deviceId`; gateway роутит на конкретный узел (fallback — привязанный к подключению `mediaDeviceId`).

**Runbook:** обрыв WS — exponential backoff (≤30 с) в `nodeRealtimeClient`; при восстановлении мост `runtimeRealtimeBridge` повторно публикует состояние. Режим хранится в `membrana.deviceBoard.runtimeMode`. Multi-node migration `20260618120000_mp7b_multinode` снимает `@unique` с `Node.membraneId`; лимит — `Tariff.maxNodesPerMembrane`.

---

## Текущий статус

| Фаза | Код | Prod deploy | Архив |
|------|-----|-------------|-------|
| MP0 | docs | — | archived |
| MP1 | auth + shell | **prod** 2026-06-13 | **archived** |
| MP2 | keys + tariff | **prod** | **archived** |
| MP3 | client pairing | **prod** | **archived** |
| **MP4** | media per membrane | **prod** 2026-06-12 | **archived** |
| **MP5** | telemetry journal | **prod** 2026-06-14 | **archived** |
| **MP6** | final regression | **prod** 2026-06-14 | **archived** |
| **MP7** | node realtime gateway | **prod** | **archived** |
| **MP7b** | node runtime remote (RT0–RT7) | code complete | pending prod-smoke |

Подробный чеклист: [`BACKGROUND_CABINET_DEPLOY.md`](./BACKGROUND_CABINET_DEPLOY.md).

---

*Версия: 2026-06-13 · Регламент: prod-verify-before-archive*
