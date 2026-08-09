# Expectations — Block registry-contract

Документ односторонний: он фиксирует потребности и предложение этого блока, не описывая
фактический дизайн соседних команд.

## Что мне нужно от соседей

| От блока | Что | Форма | Инварианты |
|---|---|---|---|
| Любой будущий потребитель | Для собственного DoD production-код соседа не нужен | Test-local consumer stub в моей файловой зоне | Стаб не импортирует соседний код и не попадает в production graph |
| Любой будущий потребитель | При интеграции принимать fail-closed результат целиком | Discriminated success/error result | Ошибка источника не превращается в частичный индекс или HTTP-ответ |
| Любой будущий потребитель | Не выводить identity повторно | Использовать переданные `recordId`, `rootId`, `canonicalRef`, lineage и tip | Ни hash, ни дата, ни Affine id, ни `-rN`-эвристика не заменяют registry truth |
| Интеграция | Добавить общий экспорт только после Interface Consilium | Изменение `packages/core/src/contracts/index.ts` | Файл остаётся вне write scope этого блока |

## Что я готов отдать

Имена ниже — односторонне планируемая поверхность; окончательный шов принадлежит
Interface Consilium.

| Получатель | Что | Планируемая форма | Инварианты |
|---|---|---|---|
| Любой будущий потребитель | Строгий разбор одной записи | `parseEvidenceRecord(raw: unknown): ParseResult<EvidenceRecord>` | Закрытая схема; неправильный id/hash/bytes/date/location отклоняется |
| Любой будущий потребитель | Разбор полного JSONL и производный снимок | `parseStaticRegistryJsonl(text: string): ParseResult<StaticRegistrySnapshot>` | Любая строковая или lineage-ошибка отклоняет весь источник |
| Любой будущий потребитель | Нормализованная запись | `{ record, recordId, effectivePredecessor, rootId, canonicalRef }` | `canonicalRef === "urn:mmbrn:static:" + rootId` |
| Любой будущий потребитель | Линии и tips | Readonly-проекция root-to-tip | Root не имеет predecessor; tip отсутствует среди всех effective predecessors |
| Любой будущий потребитель | Структурированная ошибка | Категория + контекст строки/ids | Категории включают invalid input, duplicate, dangling, fork, merge и cycle |

## Инварианты предложения

- Явный `supersedes` имеет приоритет; fallback существует только для четырёх id,
  перечисленных в `CONCEPT.md`.
- Все прочие записи без `supersedes` — roots, даже если id заканчивается на `-rN`.
- Одинаковый `sha256` допустим и не объединяет records, roots, canonical refs или lines.
- Парсер не читает файл, не обращается к сети, не знает HTTP и не мутирует вход.
- `location.ref` остаётся частью записи контракта; решение о его выдаче не принадлежит
  этому блоку.
- Порядок строк и `addedAt` не определяют lineage; порядок линии следует только
  effective predecessor.

## Планируемые исполняемые стабы в моей будущей зоне

| Стаб | Замещает | Где будет жить | Как исполняется |
|---|---|---|---|
| `consumeSnapshotStub` | Неизвестного будущего потребителя snapshot | `packages/core/src/contracts/static-registry/static-registry.contract.test.ts` | Vitest вызывает стаб на реальном результате parser и проверяет только публичную проекцию |
| `fixtureRegistryJsonl` | Неизвестный runtime source | `packages/core/src/contracts/static-registry/fixtures.test.ts` либо test-local fixture рядом с parser | Vitest передаёт строку напрямую, без fs и без импорта соседнего блока |

Стабы будут test-local mocks, а не production adapters. Они доказывают собственный DoD
блока и не требуют предположений о реализации соседей.
