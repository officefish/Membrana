# Cowork Sprint Brief: static registry truth and canonicalRef read API

| Поле | Значение |
|------|----------|
| sprintId | `cowork-static-registry-read-api` |
| исполняемая фаза | `static-mmbrn-registry-read-api` (`#1303-A`) |
| GitHub umbrella | `#1303` (отдельный Issue для carrier не создаётся) |
| execution parent | `static-mmbrn-registry-read-api` |
| root epic | `static-mmbrn-container` |
| baseBranch | `main` |
| BASE_SHA | назначается после merge подготовительного PR |
| blocks | `registry-contract`, `registry-index`, `read-api` |
| integration deadline | 2026-08-14 (fallback; гейт 2->3 событийный) |
| координатор | Codex; ведёт фазы, Interface Consilium и integration-ветку |
| ратификация резки владельцем | **owner, 2026-08-09** — «ратифицирую» |
| LGTM координатора | **PENDING** |

## Problem

Ратифицированный EPIC назначил `docs/evidence/registry.jsonl` единственным источником истины
о регистрации, record identity и lineage identity материалов `static.mmbrn.tech`. Сейчас в
репозитории есть append-only JSONL и генератор производной описи, но нет библиотечного индекса,
который проверяет весь lineage-контракт M2, и нет read API, разрешающего `canonicalRef` только
через registry truth.

Этот коворк реализует ровно фазу `#1303-A`: контракт записи и линии, детерминированный индекс и
read-only transport. Он не выполняет live-инвентаризацию Affine, не поднимает storage target и
не строит доступ. Три блока могут доказать собственный DoD на стабах и не должны согласовывать
форму швов до Interface Consilium.

**Нормативные входы:**

- [`EPIC.md`](../../meeting/static-mmbrn-container/EPIC.md), решения R1-R7 и фаза `#1303-A`;
- [`M2_AGENDA.md`](../../meeting/static-mmbrn-container/M2_AGENDA.md), закрытый identity-контракт;
- [`M3_AGENDA.md`](../../meeting/static-mmbrn-container/M3_AGENDA.md), граница доступа;
- [`docs/evidence/README.md`](../../evidence/README.md) и текущий `registry.jsonl` как измеренный дом;
- [`COWORK_SPRINT_REGULATION.md`](../../COWORK_SPRINT_REGULATION.md).

## Резка на блоки

| Блок | Суть | Файловая зона | Собственный DoD без соседей |
|------|------|---------------|-----------------------------|
| **`registry-contract`** | Закрытый тип и parser текущего `EvidenceRecord`; вычисление `effectivePredecessor`, `rootId`, `canonicalRef` и tip по M2. Legacy fallback применяется только к четырём именованным записям. | `packages/core/src/contracts/static-registry/**`<br>`docs/cowork-sprint/cowork-static-registry-read-api/team-registry-contract/**` | Чистые тесты принимают валидные записи и отклоняют неправильный id/hash/bytes/date/location, duplicate id, dangling predecessor, fork, merge и cycle. Фикстуры доказывают три legacy-линии, отдельные линии одинаковых байтов и точную формулу `urn:mmbrn:static:<rootId>`. Блок публикует свой односторонний контракт через стаб в собственной зоне. |
| **`registry-index`** | Неизменяемый детерминированный индекс над внедрёнными строками/записями: lookup по record id, resolve по `canonicalRef`, чтение lineage и tip. Доменный слой не знает файловую систему и HTTP. | `packages/services/static-registry/**`<br>`docs/cowork-sprint/cowork-static-registry-read-api/team-registry-index/**` | Тесты на собственном стаб-контракте доказывают одинаковый результат при повторной сборке, lookup id, resolve canonicalRef, упорядоченную lineage, tip и fail-closed для неизвестного/неоднозначного/некорректного входа. Ни один тест не читает код соседних блоков. |
| **`read-api`** | NestJS read-only module/controller с внедрённым сервисом-стабом и OpenAPI-контрактом для записи и resolve. Transport не объявляется публичным ingress и не принимает Affine id как канон. | `packages/background-office/src/modules/static-registry/**`<br>`docs/api/static-registry/**`<br>`docs/cowork-sprint/cowork-static-registry-read-api/team-read-api/**` | Controller-тесты на стабе сервиса доказывают чтение record id и resolve `canonicalRef`, `400` для malformed, `404` для unknown и отсутствие write-route. HTTP DTO никогда не содержит `location.ref`: право выдать адрес принадлежит зависимой фазе `static-mmbrn-ingress-auth`. |

**Файловые зоны не пересекаются.** До Phase 3 блоки не трогают общие точки сборки:

- `packages/core/src/contracts/index.ts`;
- `packages/background-office/src/app.module.ts`;
- root/shared `package.json`, manifests других workspaces и cross-package dependency wiring;
- `docs/tasks/registry.json`, `docs/tasks/README.md`, `docs/COWORK_SPRINT_ACTIVE.md`;
- runtime-адаптер чтения канонического `registry.jsonl`.

Их меняет только координатор в Phase 4 по `INTERFACE_CONTRACT.md`. Стабы соседей живут внутри
зоны своего блока и в integration-ветку не входят.

## Обязательный контракт предмета

1. `sha256`, immutable record `id` и lineage `canonicalRef` остаются разными тождествами.
2. `canonicalRef = "urn:mmbrn:static:" + rootId`; альтернативная формула запрещена.
3. `effectivePredecessor` сначала использует явный `supersedes`; fallback разрешён только
   четырём именованным legacy-записям из M2.
4. Root не имеет effective predecessor. Tip отсутствует среди **всех** effective predecessor,
   включая legacy fallback. Fork, merge и cycle не являются допустимой линией.
5. Одинаковый `sha256` не сливает records или lineages.
6. Индекс строится из внедрённого источника и не мутирует `registry.jsonl`.
7. Ни один API этого коворка не использует `affineDocId` как identity и не превращает
   `canonicalRef` в URL.
8. До `#1303-B` transport не выдаёт `location.ref`, не выдаёт байты и не принимает решения
   allow/deny. Неизвестный либо некорректный registry source даёт отказ, а не частичный ответ.

## Интеграционный smoke

Набросок уточняется только в Phase 3 после одновременного вскрытия трёх `EXPECTATIONS.md`:

1. Runtime-адаптер читает fixture JSONL через настоящий parser блока `registry-contract`.
2. Блок `registry-index` строит индекс и находит запись по `recordId`.
3. По `canonicalRef` той же линии индекс возвращает lineage и актуальный tip.
4. Controller блока `read-api` отдаёт DTO через настоящий сервис-адаптер.
5. Ответ детерминирован, не содержит `location.ref`, не содержит Affine id и не предлагает
   write-route.
6. Malformed lineage, unknown id и unknown canonicalRef дают fail-closed ответы.

Integration DoD включает собственные тесты всех трёх блоков, этот smoke, scoped typecheck/build
затронутых workspaces и проверку отсутствия стабов в production graph.

## Constraints / Out of scope

- Не читать чужие ветки блоков и чужие `EXPECTATIONS.md` до Interface Consilium.
- Не создавать второй registry, materialized truth или mutable repair старых строк.
- Не менять текущие записи `docs/evidence/registry.jsonl` в этой фазе.
- Не выполнять live Affine inventory; это отдельная активная карточка
  `static-mmbrn-live-inventory` с отдельным owner/ops-разрешением.
- Не реализовывать Panel policies, forward-auth, binding ledger, выдачу `location.ref` или байтов.
- Не provision/deploy `static.mmbrn.tech`, не менять DNS, Caddy, Panel, storage и Affine.
- Не закрывать umbrella `#1303` и parent epic завершением одного коворка.

## Учёт центральной задачи

Источник порядка — [`DEPS.json`](../../meeting/static-mmbrn-container/DEPS.json), а статусы
вычисляет `node scripts/meeting-status.mjs --id static-mmbrn-container`.

| Узел | Состояние на открытии | Как не потеряется |
|------|----------------------|------------------|
| `meeting-static-mmbrn-container` | archived | ратифицированный предшественник |
| `static-mmbrn-inventory-export` | archived | построен offline-инструмент |
| `static-mmbrn-live-inventory` | active, отдельный ops-трек | остаётся active до sealed live evidence |
| `static-mmbrn-registry-read-api` | active, цель этого коворка | архивируется только после integration PR + LGTM |
| `cowork-static-registry-read-api` | active, carrier | архивируется вместе с целевой фазой после Phase 5 |
| `static-mmbrn-disposition-ledger` | deferred | разблокируется live inventory |
| `static-mmbrn-target-provision` | deferred | разблокируется disposition ledger |
| `static-mmbrn-ingress-auth` | deferred | зависит от registry API и target provision |
| `static-mmbrn-rehydrate-parity` | deferred | зависит от live inventory, disposition и target |
| `static-mmbrn-m6-alignment` | deferred | зависит от disposition и parity |
| `static-mmbrn-cutover` | deferred | зависит от ingress, parity и M6 alignment |
| `static-mmbrn-live-services` | deferred | зависит от cutover |
| `static-mmbrn-retirement` | deferred | зависит от cutover и live services |

Предикат закрытия Phase 5: integration PR merged, Teamlead LGTM, оба carrier-id архивированы,
parent epic остаётся active, а `meeting:status` показывает следующий честно разблокированный узел.

## Порядок фаз

1. После ратификации brief и merge подготовительного PR координатор фиксирует свежий BASE_SHA.
2. `cowork:open` валидирует brief, фиксирует BASE_SHA и печатает команды. Координатор
   выполняет их, создаёт три ветки/worktree от этого SHA и обновляет ACTIVE.
3. Каждая команда сдаёт `CONCEPT.md`, затем собственный DoD на стабах.
4. Гейт `ready(A) && ready(B) && ready(C)` либо deadline открывает Interface Consilium.
5. Координатор собирает integration-ветку адаптерами, отдаёт один PR на ревью и только после
   merge архивирует carrier и целевую фазу.

## Definition of Done brief/open

- [x] Ровно три блока и непересекающиеся файловые зоны названы.
- [x] У каждого блока есть проверяемый собственный DoD на стабах.
- [x] Общие точки сборки вынесены в Phase 4.
- [x] Интеграционный smoke и stop boundaries названы.
- [x] Все узлы центрального DAG перечислены с явным состоянием.
- [x] Владелец ратифицировал эту резку 2026-08-09 словом «ратифицирую».
- [ ] Подготовительный PR получил LGTM и merged.
- [ ] Три worktree созданы от одного свежего BASE_SHA.
