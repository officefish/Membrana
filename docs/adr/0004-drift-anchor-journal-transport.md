# ADR 0004 — транспорт журнала drift-anchor: push через `background-office` (не pull из Actions API)

> **Статус:** ACCEPTED · 2026-07-13 (LGTM Teamlead/владелец)
> Р1/Р2 приняты как есть. Р3 (auth-модель GET) — открытый вопрос ниже уточнён владельцем при реализации.

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
| `background-office` документирован «автономным от монорепо-клиента» — локальные DTO; единственное разрешённое исключение зависимости от `packages/*` — `@membrana/rag-service` (R4) | `docs/BACKGROUND_SERVERS.md:85,87-93` — «без `@membrana/trends-detector-service` в runtime», «разрешена ЕДИНСТВЕННАЯ зависимость» |
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
`@membrana/drift-anchor` (чистое ядро остаётся чистым).

**Поправка при реализации (2026-07-13): office НЕ импортирует `@membrana/core`.**
Черновик Р1 предполагал переиспользовать тип `DriftAnchorRecord` из `@membrana/core`
напрямую — это нарушило бы задокументированную границу («автономность от
монорепо-клиента, локальные DTO»; единственное разрешённое исключение зависимости
от `packages/*` — `@membrana/rag-service`, R4). Фикс: office получает и хранит
**локальный DTO** (zod-схема, structurally совпадающая с `DriftAnchorRecord`, но
объявленная самостоятельно — как `commentSchema` в `linear.controller.ts`). `GET
.../digest` отдаёт **сырые записи**, без вычисления divergence. Чистая
`evaluateProdMainDivergence` (@membrana/core) вызывается на стороне **потребителя**
(кабинет/клиент — там core уже легальная зависимость) — это даже лучше: office
остаётся тупым транспортом, вся детекция расхождения — детерминированная функция
в браузере, ближе к UI, который её показывает.

### Р2 — Хранилище: **in-memory**, без файлов и без Prisma/БД

**Поправка при реализации (2026-07-13):** черновик Р2 предполагал файловый журнал на
диске office-контейнера как «не эфемерный (volume)» — это была ошибка, не проверенная
кодом. Факт: `packages/background-office/docker-compose.yml:1` явно документирует
office как **«stateless, без PostgreSQL»**, ни в базовом, ни в prod-compose
(`deploy/background-office.prod.compose.yml`) нет ни одного `volumes:` — файловая
запись пропадёт при каждом редеплое без предупреждения. Решение: **только in-memory**
(`Map<\`${anchorKind}:${anchorSource}\`, DriftAnchorRecord>`), никакой файловой записи
внутри office. Соответствует установленному канону office (stateless-шлюз, кроме R4 RAG
— обоснованное исключение, здесь исключение не нужно).

**Следствие рестарта:** после редеплоя digest временно пуст/устаревает до следующего
прогона producer'а (CI — на каждый PR в detectors/*, office-cron — раз в сутки). Это
**видимо**, не тихо: каждая запись несёт `takenAt`, digest-ответ отдаёт возраст —
UI-панель обязана показывать «нет свежей записи» отдельно от «ok», а не путать их
(тот же принцип видимой деградации, что в консилиуме live-neural-combined-fusion).

**Границы:** in-memory store — implementation detail модуля, не публичный контракт.
Если позже понадобится история/аналитика за период — Prisma-таблица отдельным решением,
не сейчас (Out of scope).

### Р3 — Cabinet читает сырые записи из office, сам считает divergence через `@membrana/core`

UI-панель «Дрейф-якоря» в кабинете делает `GET {OFFICE_URL}/v1/drift-anchor/digest`
(публичный, без токена — решено владельцем 2026-07-13, данные несекретны) и получает
**сырые** `DriftAnchorRecord`-подобные записи (локальный DTO office, structurally
совместимый). На стороне кабинета/клиента (где `@membrana/core` — легальная
зависимость) записи приводятся к типу `DriftAnchorRecord` и скармливаются чистой
`evaluateProdMainDivergence` для danger-строки «Прод ≠ main».

**Граница, требующая внимания при реализации:** GET-эндпоинт **не** должен требовать
тот же секрет, что и POST-приём (иначе секрет уходит в браузер). Разделить guard:
POST — `ApiTokenGuard` (producer'ы), GET — либо открыт, либо кабинет проксирует через
`background-cabinet`/`node-realtime` (уже существующий канал кабинет↔сервер).

**Решено владельцем 2026-07-13: публичный GET без токена.** Данные digest (F1-метрики,
вердикты ok/drift/broken) не секретны — те же числа уже публично лежат в
`docs/DETECTOR_BENCHMARK.md` открытого репо. `GET /v1/drift-anchor/digest` без
`ApiTokenGuard`; `POST /v1/drift-anchor/records` остаётся защищён.

## Definition of Done (для будущей реализации)

- [ ] `packages/background-office/src/modules/drift-anchor/` — модуль, контроллер, сервис, тесты (аналог `night-hunt` по структуре).
- [ ] `POST /v1/drift-anchor/records` — `ApiTokenGuard`, валидация `DriftAnchorRecord` (zod/class-validator), запись на диск + в память.
- [ ] `GET /v1/drift-anchor/digest` — три записи + `evaluateProdMainDivergence` (если пара code-ci/code-schedule одной версии есть); auth-модель решена (см. Р3).
- [ ] CI-гейт (`detector-drift-gate.yml`) — шаг `curl POST` после `yarn drift:code` (не блокирует job при недоступности office — office это наблюдаемость, не гейт; сам гейт остаётся exit-код скрипта).
- [ ] `deploy/office-drift-code-cron.sh` — POST своей записи в office (тот же паттерн, `curl` или маленький `.mjs`).
- [ ] UI-панель в кабинете: 3 строки, danger-строка «Прод ≠ main», `tabular-nums`, `aria-live="polite"`, DESIGN.md.
- [ ] Тесты границ: office-модуль не импортирует из detectors/drift-anchor пакетов напрямую (только тип из `@membrana/core`).
- [ ] LGTM владельца по auth-модели GET (Р3) — открытый эндпоинт или кабинет-прокси.

## Живая проверка (2026-07-13, конец-в-конец на office)

Модуль реализован (PR #418), задеплоен на office (`docker compose ... build && up -d`,
образ пересобран из `main` 88d515e), cron-клон обновлён. Полная цепочка подтверждена
реальным прогоном: `office-drift-code-cron.sh` → сборка+корпус → `code-anchor(schedule)
verdict=ok` → `POST /v1/drift-anchor/records` с токеном из `/etc/membrana/office.env`
→ `{"ok":true}` → запись видна в `GET /v1/drift-anchor/digest` **и локально
(127.0.0.1:3000), и публично (`https://office.mmbrn.tech/v1/drift-anchor/digest`)**.
`POST` без токена по-прежнему требует `ApiTokenGuard` (не тестировался заново здесь —
покрыт `drift-anchor.controller.ts` guard + service/DTO unit-тестами, 13 тестов).

## data-anchor: реализован (2026-07-13), уже переиспользуя транспорт этого ADR

`scripts/drift-anchor-data.mjs` — тот же push-паттерн, **без нового office-кода**: существующий
`POST /v1/drift-anchor/records` уже принимает `anchorKind:'data'` (схема была написана под оба
значения с самого начала). Подтверждает тезис Р1 — office как тупой транспорт масштабируется
на новых producer'ов без изменений.

**Владелец сузил охват (2026-07-13):** оригинальный замысел консилиума («замороженный детектор
+ свежий поток реальных полевых записей») потребовал бы читать/анализировать настоящие
пользовательские аудиозаписи с `background-media` — решение о допустимости этого не принималось
здесь. Владелец выбрал **безопасный вариант**: вход — ТОЛЬКО системный курируемый
`__tariff_dataset__` (тот же корпус free-v1, что в code-anchor), никакие реальные записи
не читаются. Явное следствие: этот якорь проверяет **целостность провижининга** media
(совпадает ли отдаваемый устройствам корпус с git-каноном), а не настоящий акустический
дрейф поля — зафиксировано в докстринге producer'а, не выдаётся за большее.

Механика: служебное canary-устройство на прод-media (`docs/anchors/data-anchor-canary-device.json`,
НЕ реальный пользователь) держит провизионированный `__tariff_dataset__`; producer читает его
ТОЛЬКО через существующий public read API media (`GET .../collections/:id/samples`,
`GET .../samples/:id/blob`) — без прямого доступа к БД/blob-хранилищу, без нового кода на
стороне media. `imageFrozenAt: null` — образ намеренно не заморожен (честно задокументировано,
не выдаётся за полную реализацию исходного замысла). Порог — `dataAnchorEpsilonF1` (мягкий,
warning-only, никогда ничего не блокирует).

**Живая проверка на реальной инфраструктуре (2026-07-13):** `office-drift-code-cron.sh`
обновлён (оба якоря в одном прогоне — один `yarn install`/`detectors:build`), `MEDIA_API_TOKEN`
провизионирован в `/etc/membrana/office.env`, дрифт-клон обновлён на office. Полный прогон
дал `code:schedule verdict=ok` + `data:schedule verdict=ok, delta=0, samples=120/120` —
провизионированный на прод-media корпус byte-идентичен git-канону. Оба POST'а прошли,
**`GET https://office.mmbrn.tech/v1/drift-anchor/digest` публично отдаёт обе записи**
(records: 2) без изменений на стороне office-кода — подтверждает, что транспорт ADR 0004
масштабируется на нового producer'а без нового office-модуля.

## Out of scope / открытые задачи

- **Настоящий data-anchor по реальным полевым записям** — требует отдельного продуктового/приватность-решения (согласие, агрегация без экспорта аудио) — сознательно отложено, не эта реализация.
- История/аналитика дрейфа за период — сейчас только «последняя запись», ретенш/тренды — отдельное решение.
- Уведомления (Slack/Telegram) на `verdict=broken`/`diverged` — вне scope, digest-эндпоинт этого не делает.

## Ссылки

- ADR 0003: [`0003-drift-anchor-record-in-core.md`](./0003-drift-anchor-record-in-core.md) — контракт `DriftAnchorRecord`.
- Консилиум-2 drift-anchor-triggers: [`drift-anchor-triggers-2026-07-12.md`](../seanses/drift-anchor-triggers-2026-07-12.md) — исходное назначение DA5 (UI-панель).
- `BACKGROUND_SERVERS.md` §«Новый внешний API или webhook» — канон размещения в office.
