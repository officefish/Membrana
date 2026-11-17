# Membrana Local Sprint OPEN: batch-collection-run-contour

| Поле | Значение |
|------|----------|
| Sprint | `batch-collection-run-contour` |
| Procedure | `membrana-local-sprint` |
| Registry epic | `batch-collection-run-contour` |
| GitHub Issue | [#494](https://github.com/officefish/Membrana/issues/494) |
| Prompt | [`BATCH_COLLECTION_RUN_CONTOUR_PROMPT.md`](../../prompts/BATCH_COLLECTION_RUN_CONTOUR_PROMPT.md) |
| Cut | [`batch-collection-run-contour.json`](../../sprint/cut/batch-collection-run-contour.json) |
| Lead | ozhegov |
| Support | kuryokhin · dynin · rodchenko · vesnin |
| Status | implementation complete; gate pass; PR/review pending |

## Сверка старого билета со стволом 2026-09-29

Issue #494 от 2026-07-15 повторяет июльский тезис: прогон детекторов по библиотеке не является
одним узлом палитры, а требует границы live/batch, источника коллекции и итерации по N пробам.
Текст билета старше сегодняшнего контура библиотеки, поэтому его нельзя исполнять буквально.

Уже закрыто сегодняшним стволом:

- массовый перенос из буфера в пользовательский набор уже есть: кабинет перечисляет полный
  набор через `service.getBackend().listSamples(selection.collectionId)` и не ограничивается
  текущей страницей;
- серверный backend `listSamples` уже обходит все страницы `listSamplesPage`, значит #2505
  закрыл класс "видим 40 из 1057 и считаем это всем набором";
- дверь `moveSamplesBatch('/samples/move-batch')` уже возит пачку одной операцией и возвращает
  штатный частичный исход через `stayed`;
- plugin host уже имеет read-only `CollectionSampleReader` и request-вход
  `POST /v1/devices/:deviceId/collections/:collectionId/plugins/:pluginId/request`.

Не закрыто:

- нет живых символов `SampleCollectionRef`, `for-each-sample` или отдельного batch-runtime;
- нет ратифицированного решения, нужен ли новый core-контракт, или детекторный batch-run должен
  лечь на существующий серверный plugin host;
- нет пользовательского контура "выбрать коллекцию -> прогнать детектор по N пробам -> увидеть
  агрегированный результат/отказ" как продукта переполненного буфера.

## Архитектурная развилка

Спринт задевает контракт между пакетами: как минимум вход `collections` в `background-media`,
контракты plugin-run/result и, возможно, новый core-contract. Поэтому кодовая фаза начинается
только после `yarn consilium` по вопросу live↔batch. До этого можно держать только нарезку и
доказательства разведки.

Вопрос консилиума: строим новый `SampleCollectionRef`/batch-runtime/итератор в core, или
фиксируем batch-run как развитие существующего `CollectionSampleReader` + `collections` plugin
request без нового носителя библиотеки?

### Принятый вердикт 2026-09-29

Владелец принял протокол
[`batch-collection-run-contour-architecture-gate-2026-09-29.md`](../../seanses/batch-collection-run-contour-architecture-gate-2026-09-29.md):

- новый `SampleCollectionRef`, palette-итератор и core batch-runtime сейчас не вводятся;
- batch-run развивается внутри существующего `collections` plugin request и read-only
  `CollectionSampleReader`;
- DSP остаётся в живом `drone-detection-orchestrator`, а collection executor получает анализ
  через внедрённый порт и не пишет в samples/collections;
- массовый перенос и пагинация исключены из #494 как уже закрытые стволом;
- a2-a4 уточняются этим verdict без перерезки и новой ратификации.

## Фазы

| Фаза | Карточка | Lead | Прогноз | Выход |
|------|----------|------|---------|-------|
| a1 | `batch-collection-run-contour-a1-architecture-gate` | vesnin | 180 lines | `yarn consilium` verdict live↔batch; код до verdict запрещён |
| a2 | `batch-collection-run-contour-a2-run-contract` | dynin | 300 lines | контракт запуска, inputHash, отказов и лимитов без второго носителя библиотеки |
| a3 | `batch-collection-run-contour-a3-detector-runner` | dynin | 390 lines | исполнитель детектора по N пробам и агрегированный результат |
| a4 | `batch-collection-run-contour-a4-cabinet-entry` | rodchenko | 360 lines | вход кабинета/серверная дверь, статус, частичные отказы и тексты полного буфера |

## Прогноз до исполнения

- Нарезка ожидает один обязательный `plan_unratified` до слова владельца.
- Самый рискованный блок — a3: он рядом с detector services и plugin host, но держится ниже
  порога 400 строк; если после a1 появится новый core-contract, a2/a3 требуют recut.
- Старые пункты билета про "добавить перенос/пагинацию коллекции" не берутся в работу: это уже
  сделано стволом #2488/#2489/#2499/#2505.
- Порядок ритуалов и вечерних/утренних цепочек не меняется.

## Ратификация

План проверяется так:

```bash
yarn sprint:cut --plan docs/sprint/cut/batch-collection-run-contour.json
```

До явного слова владельца ожидаемая находка — только `plan_unratified`. После ратификации
отметку должен поставить инструмент:

```bash
yarn sprint:cut --plan docs/sprint/cut/batch-collection-run-contour.json --ratify --at <ISO-8601-with-offset>
```

Исполнение, `sprint:gate`, `sprint:experience`, PR и review-gate относятся к фазе Б и не
запускаются до ратификации этой нарезки.
