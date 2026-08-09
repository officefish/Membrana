# Retrospective: static registry read API cowork

| Поле | Значение |
|---|---|
| sprint | `cowork-static-registry-read-api` |
| blocks | `registry-contract`, `registry-index`, `read-api` |
| integration PR | #1828 |
| status | integration complete; CI/review/merge pending |

## Outcome

Все три frozen block-коммита механически вошли в integration branch. Собрана одна цепочка:

`registry.jsonl -> strict parser -> immutable index -> read port -> redacted Nest DTO`.

Текущий канонический источник проходит целиком: 18 records / 14 lineages. API остаётся
composition-ready и намеренно не монтируется в production `AppModule`: до зависимой фазы
`static-mmbrn-ingress-auth` нет законного Panel forward-auth для metadata.

## Adapted vs rewritten

| Стык / поверхность | Что адаптировано |
|---|---|
| contract -> index | `recordId` переведён в `id`; validated record явно скопирован в JSON payload |
| index -> read API | sync domain exceptions переведены в async `found/not-found`; остальные ошибки fail-closed |
| identity grammar | ведущей назначена строгая M2 grammar; HTTP/OpenAPI и adapter одинаково режут более широкий local input до lookup |
| CJS office -> ESM packages | runtime composition использует dynamic import и local read shape |
| registry date -> OpenAPI | `addedAt` объявлен string без ложного обязательного `date-time`; значение не нормализуется |
| workspace/image | добавлены package graph, lock, Docker context/build/runtime COPY |

**Переписано блоков: 0. Адаптировано стыков/поверхностей: 6.**

Две точечные integration-коррекции внутри frozen поверхностей не меняют доменную модель:

- service config приведён к обязательному composite workspace contract;
- рядом с намеренным control-character regex добавлено узкое ESLint-освобождение.

## Verification

- core: 163/163 tests, lint, build;
- static registry service: 15/15 tests, lint, typecheck, build;
- background office: 270/270 tests, lint, typecheck, build;
- integrated smoke: real parser/index/port/controller, malformed 400, unknown 404, no address leak;
- pre-push affected graph: 54/54;
- current registry: 18 records / 14 lineages;
- Docker image smoke: **unknown locally**, daemon unavailable; PR CI must supply evidence.

## Process incident

После Phase 1 координатор одновременно прочитал три первых `EXPECTATIONS.md`, не дождавшись
Phase 3. Команды не читали чужие материалы и не получили cross-block информации; различающиеся
frozen interfaces подтверждают независимое исполнение. Поэтому block outputs не объявлены
compromised, но embargo координатора нарушено.

Точная запись: **`coordinator exposure; no team information flow found`**.

Следующее лечение не входит в этот PR: машинный `cowork:reveal` должен до трёх freeze SHA
показывать координатору только paths/hashes, затем единым журналируемым актом открывать все
`EXPECTATIONS.md`. Это отдельная process/tooling задача, а не скрытая часть static registry.

## What the cut taught us

Резка по contract/index/transport была настоящей: файловые зоны не пересеклись, все три
собственных DoD прошли до переговоров, а различия свелись adapters. Самый дорогой шов оказался
не между доменными типами, а между delivery-средами: CJS/ESM и три ручных Docker-манифеста.
Следующий cowork brief для server foundation должен называть runtime/package/image seam уже в
начальной оценке integration cost.
