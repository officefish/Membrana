# Concept — Block registry-contract

## Граница блока

Блок превращает недоверенный JSON/JSONL реестра в закрытый, неизменяемый доменный
снимок. Он отвечает только за форму `EvidenceRecord`, вычисление линейной истории и
отказ на противоречивом источнике. Файловая система, HTTP, индекс lookup/resolve и
экспорт из `packages/core/src/contracts/index.ts` принадлежат интеграции или соседним
блокам.

В Phase 2 production-код живёт только в
`packages/core/src/contracts/static-registry/**`. Общая точка
`packages/core/src/contracts/index.ts` остаётся явно integration-owned.

## Модель записи

Закрытый `EvidenceRecord` содержит обязательные поля:

- `id`: immutable record identity, slug длиной 3–64 символа;
- `sha256`: ровно 64 строчных hex-символа, identity заявленных байтов;
- `bytes`: положительное safe integer;
- `addedAt`: календарно валидная дата `YYYY-MM-DD` либо валидный ISO 8601 timestamp;
- `source`: непустой provenance байтов;
- `location`: объект с `kind` из `local | affine | url | archivarius` и непустым
  `ref`.

Опциональные поля: `about`, `measured`, `sensitive { reason, decidedAt }` и
`supersedes`. Если `supersedes` присутствует, это один валидный record id, а не список.
Неизвестные ключи, неверные типы, `null` вместо опционального значения и частично
валидные вложенные объекты отклоняются. Парсер не исправляет и не дополняет вход.

`sha256`, record `id` и lineage identity различны. Совпавший `sha256` не является
ошибкой и никогда не объединяет записи или линии.

## Два этапа разбора

1. `parseEvidenceRecord(unknown)` строго валидирует одну запись и возвращает
   discriminated result с диагностикой поля.
2. `parseStaticRegistryJsonl(string)` разбирает непустые строки, сохраняет номера строк,
   а затем валидирует весь набор и вычисляет производные значения. Любая битая строка
   или ошибка графа делает результат целиком неуспешным; частичного снимка нет.

Планируемая успешная проекция каждой записи содержит исходный `recordId`,
`effectivePredecessor`, `rootId` и
`canonicalRef = "urn:mmbrn:static:" + rootId`. Для каждой линии вычисляются
упорядоченные от root к tip record ids и единственный `tip`.

## Effective predecessor

`effectivePredecessor: RecordId | null` вычисляется в строгом порядке:

1. валидный явный `supersedes`;
2. если его нет, точное совпадение id с одной из четырёх legacy-записей;
3. иначе `null`.

Fallback — закрытая таблица, не эвристика по суффиксу:

| Legacy record id | Effective predecessor |
|---|---|
| `ozon-receipt-3765-field-kit-r2` | `ozon-receipt-3765-field-kit` |
| `day-memo-2026-07-28-r2` | `day-memo-2026-07-28` |
| `bpla-guidance-methodology-partner-r2` | `bpla-guidance-methodology-partner` |
| `bpla-guidance-methodology-partner-r3` | `bpla-guidance-methodology-partner-r2` |

Для любого другого `-rN` без `supersedes` запись является новым root. Номер ревизии,
`addedAt`, одинаковый hash и текст `about` не участвуют в выводе связи.

## Проверка линии

После вычисления всех predecessor ids снимок строится только если одновременно истинны
следующие условия:

- record ids уникальны;
- каждый ненулевой predecessor существует;
- у записи ровно ноль или один predecessor; массив/многородительская форма отклоняется
  как merge;
- ни один predecessor не имеет больше одного successor (fork);
- обход predecessor-связей не встречает запись повторно (cycle, включая self-cycle).

Root — запись с `effectivePredecessor = null`. Tip — record id, которого нет среди
**всех** effective predecessor, включая legacy fallback. В одноэлементной линии root и
tip совпадают; в линии длины больше одного это разные записи. `rootId` получается
обходом predecessor до root, после чего canonical ref вычисляется только точной
формулой `urn:mmbrn:static:<rootId>`.

## Ошибки и неизменяемость

Ошибки имеют стабильную категорию (`invalid-json`, `invalid-record`, `duplicate-id`,
`dangling-predecessor`, `fork`, `merge`, `cycle`) и достаточный контекст: строка,
record id и затронутые ids, когда они известны. Внешний текст сообщения не является
identity и не используется для ветвления потребителей.

Успешный результат не раскрывает mutable внутренние `Map`/`Set`: массивы, записи,
lineages и вложенные значения копируются и замораживаются. Исходный объект после parse
не может изменить контрактный снимок.

## Phase 2 DoD

Чистые Vitest-тесты в собственной файловой зоне докажут:

- принятие текущей формы `EvidenceRecord` и трёх legacy-линий;
- отказ для неправильных id, hash, bytes, date и location;
- отказ для duplicate id, dangling predecessor, fork, merge и cycle;
- точные `effectivePredecessor`, `rootId`, tip и canonical formula;
- независимые record/lineage identities при одинаковом `sha256`;
- полный fail-closed JSONL без частичного результата;
- исполняемый test-local consumer stub, использующий только заявленную публичную
  проекцию блока.
