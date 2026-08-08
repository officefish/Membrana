# EPIC — заседание `static-mmbrn-container`

> **Статус:** **РАТИФИЦИРОВАН владельцем 2026-08-08** с раскрытым ограничением:
> пять независимых review-вызовов не вернули verdict; local audit PASS не выдан за LGTM.
> Owner act: сообщение «ратифицирую» после предъявления этого ограничения.

> **Предмет:** контракт контейнера оригиналов `static.mmbrn.tech`, роль Affine как
> заменяемого человеческого движка и исполнимый переезд с `strategy.mmbrn.tech`.
> Код, DNS, Caddy, Panel, GitHub Issues и production этим актом не изменены.

## Источники и порядок

Порядок `M1 -> M2 -> M3 -> M4 -> M5 -> M6 -> M7` установлен M0 и
ратифицирован владельцем 2026-08-03. Этот файл не заменяет carrier комнат: при
расхождении действует соответствующий carrier, а сборка возвращается на исправление.

| Р | Комната | Предмет | Канонический carrier |
|---|---|---|---|
| R1 | M1 | граница контейнера | [`M1`](../../seanses/static-mmbrn-container-m1-boundary-2026-08-03.md) |
| R2 | M2 | тождество и источник истины | [`M2`](../../seanses/static-mmbrn-container-m2-identity-2026-08-03.md) |
| R3 | M3 | доступ | [`M3`](../../seanses/static-mmbrn-container-m3-access-2026-08-04.md) |
| R4 | M4 | хранение и живучесть | [`M4`](../../seanses/static-mmbrn-container-m4-storage-2026-08-04.md) |
| R5 | M5 | роль Affine | [`M5`](../../seanses/static-mmbrn-container-m5-affine-role-2026-08-06.md) |
| R6 | M6 | приём и разрешённая выдача | [`M6`](../../seanses/static-mmbrn-container-m6-intake-delivery-2026-08-06.md) |
| R7 | M7 | переезд и доставка | [`M7`](../../seanses/static-mmbrn-container-m7-migration-delivery-2026-08-08.md) |

## Активные вердикты

| Р | Контракт | Сжатый вердикт |
|---|---|---|
| R1 | Boundary | `static.mmbrn.tech` принимает назначенные владельцем оригиналы внешних материалов и собственные записи управления. Код, DNS, стратегические документы и состояние Affine в канонические материалы не входят. Принятые байты не мутируют на месте; отношение нового поступления к прежнему определяют последующие контракты. |
| R2 | Identity | У материала раздельны byte identity (`sha256`), immutable record identity (`EvidenceRecord.id`) и lineage identity (`canonicalRef`). `registry.jsonl` — единственная истина регистрации и истории; изменение поля создаёт новую строку с новым `id` и `supersedes`. Байты доказывают запись, но не восстанавливаются из JSONL. |
| R3 | Access | Panel — единственный канонический авторизатор. Объекты: container, collection, lineage. Каждое действие проходит proxy по stable principal, наиболее специфичной policy, grants, subject/object versions и binding; unknown или unavailable всегда DENY. Affine исполняет разрешение, но не создаёт вторую истину доступа. |
| R4 | Storage | Immutable bytes живут на FD-1, complete backup — на независимом FD-2, immutable registry и append-only lifecycle — на FD-3. Адрес `local/static:{class}:{sha256}`; overwrite запрещён. Запись, чтение, backup, restore, retention и deletion fail-closed; Affine не входит в storage truth. |
| R5 | Affine | Выбран Panel-owned projection contract. Affine необязателен и заменяем: engine projection, layout, cache и session могут быть пересобраны или потеряны; originals, registry, projection intent, binding events и portable annotations терять нельзя. Любой вызов Affine требует Panel allow, актуальные versions и единственный active binding. |
| R6 | Intake/Delivery | LIGD (Ledgered Intake + Gated Delivery) — единственный контракт приёма и выдачи. Durable intent ledger, immutable M2 rows, append-only lifecycle, точные M3 gates и M4 admission образуют атомарный путь. Replay идемпотентен; crash reconciliation запрещает M2 row без binding и fake binding без доказанных bytes. |
| R7 | Migration | MDC-1 — один sealed inventory, per-object disposition, append-only migration ledger, M3 route matrix и причинный rollout DAG. Измеренный baseline `82 pages / 57 assets` не является fenced proof. Контракт принят, но текущий cutover — **NO-GO** до PASS всех M4/M5/M6 readiness gates. Cutover, rollback и retirement — разные акты; rollback не стирает байты, строки и историю. |

## Неподвижные инварианты реализации

1. Стратегические документы остаются в Git/Panel и не становятся оригиналами static
   только потому, что их копия существовала в Affine.
2. `docs/evidence` и `registry.jsonl` принадлежат контейнеру, а не движку.
3. Канонический объект нельзя идентифицировать `affineDocId`; внешний движок связан с
   `canonicalRef` только через Panel-owned binding ledger.
4. Один HTTP/WebSocket forward соответствует ровно одному классифицированному M3
   action/object; неизвестный или составной маршрут отказывает до действия.
5. `location.ref`, bytes и download — разные полномочия. Metadata никогда не раскрывает
   ref; audit не хранит raw content или секретный ref.
6. Sensitive и standard разделены storage class, credentials и key namespace; sensitive
   остаётся полноценной M2 record.
7. Новые или изменённые байты входят только через LIGD. Ни импорт Affine, ни ручная строка
   реестра не создают lawful original.
8. Immutable history не откатывается обратными переходами. Retry создаёт новый attempt;
   production rollback добавляет компенсирующие события.
9. Готовность выводится из свежего evidence pack, а не из наличия сервиса, DNS или страницы.
10. Source Affine удаляется только после retirement predicate; DNS cutover сам по себе не
    является ни миграцией, ни готовностью, ни завершением.

## Исполнительный граф

```text
sealed inventory
  -> disposition manifest
  -> target provision
  -> M4 storage readiness
  -> Affine export / rehydrate / M5 parity
  -> M6 registry-ledger-storage alignment
  -> M3 routes + deferred bypass/access checks
  -> canary
  -> cutover
  -> observation
  -> retirement arm
  -> source retirement
```

Обратных рёбер нет. `PARITY_FAILED`, pre-cutover hard fail и failed canary завершают
текущий attempt; повтор начинается новым `INIT`. После cutover допустим только
предписанный rollback/forward-fix с сохранением history.

## Нарезка поставок

Новые umbrella issues не создаются. Реализация раскладывается под существующие
[#1303](https://github.com/officefish/Membrana/issues/1303) и
[#1305](https://github.com/officefish/Membrana/issues/1305). Регистрация фаз начинается
только после ратификации этого EPIC.

| Фаза | Зависимость | Артефакт | Приёмка |
|---|---|---|---|
| #1303-A Registry/index read API + `canonicalRef` resolve | R2 | OpenAPI, handlers, tests | resolve читает только registry truth; Affine id не канон |
| #1305-A Read-only inventory/export | нет production mutation | snapshot tool, manifest schema | INV-1 воспроизводим; DB/export fenced, CLI не proof |
| #1305-B Disposition ledger | #1305-A, R1/R2/R5 | append API, reducer/read model | закрытый vocabulary и только lawful transitions |
| Target provision | inventory/disposition готовы; существующий umbrella #1303/#1305 | endpoints, FD allocation, provision receipt | выделенный target; office VDS не выдаётся за готовый target |
| #1303-B Static ingress + forward-auth | #1303-A, R3, provisioned target | proxy policies, route tests | один action/object, fail-closed, WS/native bypass DENY |
| #1305-C Rehydrate + parity jobs | #1305-A/B, R4 PASS | job runners, evidence reports | M5 G1-G10 evidence pack; portable annotations совпадают |
| M6 alignment | #1305-B/C, R6 | reconciliation report | registry/FD-1/ledger sets сходятся; legacy явно uncovered/held |
| #1305-D Cutover/canary/rollback | #1303-B, #1305-C, M6 alignment | scripts and runbooks, dry-runs | R1/R2 dry-run; merge не меняет DNS |
| #1303-C LIVE_SERVICES/docs/monitoring | доказанный service state | documentation PR | static не назван LIVE до proof; strategy retirement отражён честно |
| #1305-E Retirement counters/checklist | stable cutover | metrics, checklist, tests | 90d redirect, 30d zero traffic, fresh restore/parity, retain >=365d |

`Target provision` и `M6 alignment` — обязательные узлы R7 DAG, но не самостоятельные
номерные slices исходной delivery-таблицы M7. Сборка выводит их в явные строки, чтобы они
не исчезли между двумя umbrella issues. При регистрации каждому назначается один явный
parent/holder; третий umbrella для этого не создаётся. Именно это производное разложение,
вместе с остальной сборкой, требует отдельной ратификации владельца.

## Readiness и текущий вердикт

| Контур | Требование | Состояние на момент заседания |
|---|---|---|
| Inventory | sealed DB/export snapshot, disposition каждой page/asset | `NOT PERFORMED` |
| M4 | G1-G10 на выделенном target, включая capacity, restore и sensitive isolation | `NO-GO`; office VDS как target не проходит capacity |
| M5 | G1-G10, bindings, annotations, backup/restore и replacement parity | `NOT PERFORMED` / `NO-GO` без evidence |
| M6 | schema, atomicity, replay, M3, M4, reconciliation и legacy coverage | `NO-GO`; legacy rows uncovered |
| Routes | exact M3 matrix, native Affine и unclassified WS denied | `NOT PERFORMED` |
| Cutover | canary error rate <=1% за 15m и все предыдущие gates PASS | **NO-GO** |

Константы R7: mapped redirect `308`, unmapped `404`, rollback window `2h`, redirect
lifetime `90d`, observation `7d`, zero traffic `30d`, superseded retention `>=365d`.

## Что ратифицирует владелец

Ратификация этого файла означает:

- семь активных вердиктов собраны без нового архитектурного решения;
- исполнительный граф и нарезка признаются достаточным входом для регистрации фаз;
- текущий эксплуатационный вердикт остаётся `NO-GO`, пока evidence gates не пройдены;
- реализация идёт отдельными reviewable PR и не пересматривает carrier молча;
- #1303 и #1305 остаются открытыми umbrella до закрытия своих поставок.

Ратификация **не** разрешает production mutation, DNS/Caddy cutover, удаление Affine,
создание fake originals или обход обязательного code review.

## Definition of Done сборки

- [x] Все M1-M7 представлены и ссылаются на единственные carrier.
- [x] Порядок M0 сохранён.
- [x] Граница container/engine, M2 identity, M3 authority, M4 storage, M5 projection,
  M6 LIGD и M7 MDC-1 не смешаны.
- [x] Текущий cutover назван `NO-GO`.
- [x] #1303/#1305 разложены на reviewable deliveries без третьего umbrella issue.
- [x] Код, production, DNS, Caddy, Panel и Issues не изменены.
- [ ] Предметное ревью сборки получено.
- [x] Владелец отдельно ратифицировал EPIC с раскрытым отсутствием independent LGTM.
