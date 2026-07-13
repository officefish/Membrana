# ADR 0004 — транспорт журнала drift-anchor: push через `background-office` (не pull из Actions API)

> **Статус:** DRAFT · 2026-07-13
> **merge файла ≠ принятие решения** — решения действуют после LGTM владельца.

## Контекст

Три producer'а code-anchor пишут `DriftAnchorRecord` (ADR 0003) на **разных машинах**:
CI-гейт (`.github/workflows/detector-drift-gate.yml`) — на эфемерном GitHub Actions
раннере; scheduled-code-anchor (`deploy/office-drift-code-cron.sh`) — на office-хосте
(`/opt/membrana-drift/Membrana`, живой с 2026-07-13, cron 03:15 МСК). Оба сегодня пишут
в `docs/reports/drift-anchor/records/` **локально своей файловой системы** — каталог
gitignored, никуда не синхронизируется.

`scripts/drift-anchor-divergence.mjs` (DA5, #414) сравнивает `code-ci-latest.json` и
`code-schedule-latest.json` **из одного каталога** — но эти файлы физически никогда не
окажутся рядом без транспорта. Разведка 2026-07-13 (живой прогон на office): при
отсутствии пары скрипт корректно graceful (`пары записей нет`), но алерт «Прод ≠ main»
структурно недостижим. Это и есть блокер UI-панели «Дрейф-якоря» из памяти спринта.

## Наблюдаемое состояние (подтверждено кодом)

| Факт | Где (файл:строка @ дата) |
|------|---------------------------|
| `background-office` — канонический «интеграционный шлюз» для нового внешнего API/webhook | `docs/BACKGROUND_SERVERS.md:53,192` (2026-07-13) |
| Паттерн push-приёма с общим секретом уже есть (`ApiTokenGuard` + заголовок `X-Membrana-Token`) | `packages/background-office/src/modules/night-hunt/night-hunt.controller.ts:1-11` |
| Секреты `OFFICE_URL`/`OFFICE_API_TOKEN` уже заведены в GH Actions (использует `night-hunt-office-trigger.yml`) | `.github/workflows/night-hunt-office-trigger.yml:19-27`; `gh secret list` (2026-07-13: обе даты создания есть) |
| `office.mmbrn.tech` — публичный HTTPS, живой прод (OM4 cutover завершён) | память `project_office_vds_migration.md` |
| `DriftAnchorRecord` уже публичный тип `@membrana/core` — переиспользуется без нового контракта | `packages/core/src/contracts/drift-anchor.ts` (ADR 0003, PR #413) |
| Скачивание артефактов GitHub Actions требует токен даже для публичного репо (нет анонимного pull) | GitHub REST API docs (artifacts download всегда 302 на подписанный URL, требующий Actions/API auth) |

## Решение

### Р1 — Направление: **push от producer'ов к office**, не pull office→GitHub Actions API

CI-гейт и office-cron **сами отправляют** свою запись в `background-office` сразу после
прогона (`POST /v1/drift-anchor/records`, тело — `DriftAnchorRecord`, заголовок
`X-Membrana-Token`). Office становится единственным местом хранения актуальных записей
(`code-ci`, `code-schedule`, позже `data`) — единый источник для divergence-проверки и
для UI.

**Почему не pull (office ходит в GitHub Actions API за артефактом CI):** требует токена
с правами на Actions API у office (новый секрет, новая зависимость направления
office→GitHub), сложнее (list runs → find latest success → download artifact zip →
extract), и ломает симметрию — schedule-producer и так уже должен куда-то писать. Push
использует **уже существующий** секрет-пейр (`OFFICE_URL`/`OFFICE_API_TOKEN`) и
**уже существующий** guard-паттерн — нулевая новая инфраструктура авторизации.

**Границы:** новый модуль `packages/background-office/src/modules/drift-anchor/` —
контроллер (`POST .../records`, `GET .../digest`) + сервис хранения. НЕ трогает
`@membrana/drift-anchor` (чистое ядро остаётся чистым), НЕ трогает `@membrana/core`
(тип уже есть). Office остаётся вне графа foundation/analyzer (уже задокументированное
правило `BACKGROUND_SERVERS.md`).

### Р2 — Хранилище: файловый журнал на office (не Prisma/БД)

`background-office` пишет входящие записи как файлы `docs/reports/drift-anchor/records/`
**внутри контейнера office** (тот же путь, что уже используют producer'ы локально —
единообразие) + держит последнюю запись каждого `(anchorKind, anchorSource)` в памяти
для быстрого digest-ответа. Без БД: office сегодня в основном stateless-шлюз (кроме
где обосновано — R4 RAG); заводить Prisma-таблицу ради 3 JSON-записей — оверинжиниринг.
При рестарте контейнера in-memory кэш восстанавливается чтением файлов с диска
(volume, не эфемерный — как остальные office-данные).

**Границы:** файлы — implementation detail модуля, не публичный контракт. Если позже
понадобится история/аналитика — миграция на Prisma отдельным решением, не сейчас.

### Р3 — Cabinet читает digest через office, не пишет напрямую в БД кабинета

UI-панель «Дрейф-якоря» в кабинете делает `GET {OFFICE_URL}/v1/drift-anchor/digest`
(read-only, без токена или с публичным read-scope — уточнить при реализации: секрет
`X-Membrana-Token` не должен утечь в клиентский бандл кабинета, значит **либо**
эндпоint публично-читаемый без секрета, **либо** кабинет ходит через собственный
backend-прокси). Ответ — три строки (code/CI · code/schedule · data/schedule) +
`ProdMainDivergence` для danger-строки (уже чистая функция ADR 0003).

**Граница, требующая внимания при реализации:** GET-эндпоинт **не** должен требовать
тот же секрет, что и POST-приём (иначе секрет уходит в браузер). Разделить guard:
POST — `ApiTokenGuard` (producer'ы), GET — либо открыт, либо кабинет проксирует через
`background-cabinet`/`node-realtime` (уже существующий канал кабинет↔сервер).

## Definition of Done (для будущей реализации)

- [ ] `packages/background-office/src/modules/drift-anchor/` — модуль, контроллер, сервис, тесты (аналог `night-hunt` по структуре).
- [ ] `POST /v1/drift-anchor/records` — `ApiTokenGuard`, валидация `DriftAnchorRecord` (zod/class-validator), запись на диск + в память.
- [ ] `GET /v1/drift-anchor/digest` — три записи + `evaluateProdMainDivergence` (если пара code-ci/code-schedule одной версии есть); auth-модель решена (см. Р3).
- [ ] CI-гейт (`detector-drift-gate.yml`) — шаг `curl POST` после `yarn drift:code` (не блокирует job при недоступности office — office это наблюдаемость, не гейт; сам гейт остаётся exit-код скрипта).
- [ ] `deploy/office-drift-code-cron.sh` — POST своей записи в office (тот же паттерн, `curl` или маленький `.mjs`).
- [ ] UI-панель в кабинете: 3 строки, danger-строка «Прод ≠ main», `tabular-nums`, `aria-live="polite"`, DESIGN.md.
- [ ] Тесты границ: office-модуль не импортирует из detectors/drift-anchor пакетов напрямую (только тип из `@membrana/core`).
- [ ] LGTM владельца по auth-модели GET (Р3) — открытый эндпоинт или кабинет-прокси.

## Out of scope / открытые задачи

- **data-anchor джоб** на `background-media` (frozen-image, warning-семантика) — отдельный producer, тот же push-паттерн, не в этом ADR.
- История/аналитика дрейфа за период — сейчас только «последняя запись», ретенш/тренды — отдельное решение.
- Уведомления (Slack/Telegram) на `verdict=broken`/`diverged` — вне scope, digest-эндпоинт этого не делает.

## Ссылки

- ADR 0003: [`0003-drift-anchor-record-in-core.md`](./0003-drift-anchor-record-in-core.md) — контракт `DriftAnchorRecord`.
- Консилиум-2 drift-anchor-triggers: [`drift-anchor-triggers-2026-07-12.md`](../seanses/drift-anchor-triggers-2026-07-12.md) — исходное назначение DA5 (UI-панель).
- `BACKGROUND_SERVERS.md` §«Новый внешний API или webhook» — канон размещения в office.
