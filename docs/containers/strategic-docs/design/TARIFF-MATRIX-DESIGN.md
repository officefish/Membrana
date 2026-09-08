# Дизайн: матрица тарифов как единственный источник правды

> Спринт `tariff-matrix-2331` (Issue #2331), блоки b1/b2 — контекст Ожегова, резчик Веснин.
> Основание: шторм `storm-tariff-single-truth-2026-09-08` (T1, T2/T10, T13–T16), консилиум
> [`tariff-matrix-scalars-fate-2026-09-08`](../../../seanses/tariff-matrix-scalars-fate-2026-09-08.md),
> прогоны контекста [b1](../../../discussions/tariff-matrix-2331-b1-ozhegov-context.md) /
> [b2](../../../discussions/tariff-matrix-2331-b2-ozhegov-context.md) /
> [резчика](../../../discussions/cut-tariff-matrix-2331-vesnin-run.md).
> Git = SoT. Публикация в Affine не трогается (заморожена 26.07).

## Три дома, одна правда

| Дом | Что несёт | Кто пишет |
|-----|-----------|-----------|
| **R** — гранулы `granules/tariff-*/resource.json` + релиз `releases/tariff-matrix/` | единственный источник правды о тарифах (T13–T16) | человек — гранулы; генератор — релиз |
| **G** — `docs/tariffs/tariff-grid.json` | техническая сетка прав, которую читает кабинет | только пересев (b4); руками — красный зуб |
| **S** — `docs/tariffs/tariff-scalars.json` | замороженная эпоха посева базы (S0) до задания В | никто в спринте Б; расхождение S↔R печатается списком, не краснеет |

Правило матрицы: **тариф — колонка, ресурс — строка** (T14). Значения по трём тарифам живут
внутри гранулы ресурса, а не в гранулах по тарифу: у ресурса один паспорт, одна дата, одно
правило пересева — дублировать их по трём тарифам значило бы завести три дома одного числа.

## Схема `resource.json` (`tariff-resource/1`)

Единственный носитель значений и паспорт гранулы. Ядро предикатов — чистое
[`scripts/lib/tariff-matrix/passport.mjs`](../../../../scripts/lib/tariff-matrix/passport.mjs)
(`parseResource(raw) → {ok, resource} | {ok:false, findings[]}`), зуб —
`scripts/lib/tariff-matrix/passport.test.mjs`.

Одиночная форма (один ресурс — одна строка):

```json
{
  "schema": "tariff-resource/1",
  "id": "buffer",
  "resource": "storage.buffer",
  "title": "Буфер записи",
  "domain": "storage",
  "kind": "quota",
  "unit": "MiB",
  "reseedRule": "exact-bytes",
  "passport": {
    "version": "1.0.0",
    "ratifiedAt": "2026-09-08",
    "owner": "owner",
    "source": "storm-tariff-single-truth-2026-09-08 T1",
    "note": "…"
  },
  "registry": { "titleKey": "tariff.storage.buffer", "description": "…" },
  "values": {
    "free-v1":        { "MiB": 512,  "ratifiedAt": "2026-09-08" },
    "checkpoint-v1":  { "MiB": 2048, "ratifiedAt": "2026-09-08" },
    "observatory-v1": { "MiB": 4096, "ratifiedAt": "2026-09-08" }
  }
}
```

Составная форма (несколько записей реестра в одной грануле — инструменты): вместо
`resource / kind / unit / reseedRule / registry / values` на верхнем уровне — массив
`entries: [ { id, resource, title, kind, unit?, unitWords?, reseedRule, registry, values } ]`.
Обе формы вместе — красный. Ядро нормализует обе к `resource.entries[]`.

| Поле | Обязательно | Смысл |
|------|-------------|-------|
| `schema` | да | ровно `tariff-resource/1` |
| `id`, `title` | да | id гранулы ресурса и заголовок строки для человека |
| `domain` | да | закрытая ось: `storage` \| `rights` \| `catalog` \| `instrument` |
| `passport.version` | да | точный semver |
| `passport.ratifiedAt` | да | ISO-день закрепления или `null` — «не закреплено» словами, не молчанием |
| `passport.owner`, `passport.source` | да | кто закрепил и откуда (шторм/заседание с тезисом) |
| `passport.note` | нет | проза для человека |
| `resource` | да (в записи) | id права в сетке (`registry[].id`) |
| `kind` | да | закрытый род: `quota` \| `catalog` \| `instrument` \| `gated` \| `produce` |
| `unit` | по правилу | `MiB` \| `count` \| `null`; «MB» — не единица паспорта (красный) |
| `unitWords` | при `count` | три формы слова `[один, два, пять]` — render слов не выдумывает |
| `reseedRule` | да | закрытое правило пересева (ниже) |
| `registry.titleKey`, `registry.description` | да | подпись права в сетке |
| `values.<sku>` | ровно три | `free-v1`, `checkpoint-v1`, `observatory-v1` — четвёртый тариф или пропуск — красный |
| `values.<sku>.ratifiedAt` | да, у каждого | ISO-день или `null`; отсутствие ключа — красный |
| `values.<sku>.label` | нет | слова ячейки для человека, если формула ядра не годится («при готовой сети», «набор блокпоста») |
| `values.<sku>.stub` | нет | заём/заглушка: `{ since, reason, resolvesBy }` словами; при `stub` значение обязано быть `ratifiedAt: null` |
| `values.<sku>.note` | нет | проза |
| `systemDatasets` | нет | у `datasets`: `{ outsideQuota: true, note }` — ссылка на строку системных наборов (T2/T10) |

### Закрытый список правил пересева и форма значения

| `reseedRule` | Род | Единица | Форма значения | Что делает пересев |
|--------------|-----|---------|----------------|--------------------|
| `exact-bytes` | quota | `MiB` | `{ MiB, ratifiedAt }` | число МиБ едет в сетку байтами (`MiB × 1024 × 1024`), `unit: bytes` |
| `exact-count` | quota | `count` | `{ count, ratifiedAt }` | число штук едет как есть, `unit: count` |
| `catalog-id` | catalog | — | `{ catalogId, ratifiedAt, stub? }` | идентификатор набора едет строкой как есть; `stub` — не решение, а заём |
| `enabled-flag` | instrument | — | `{ enabled, ratifiedAt }` | булево «включено» |
| `gated-by-precondition` | gated | — | `{ enabled, preconditionId, ratifiedAt }` | булево + условие; условие сетка берёт из паспорта |
| `produce-scope` | produce | — | `{ enabled, scope?[], ratifiedAt }` | булево + перечень; включено без `scope` — красный |
| `matrix-only` | catalog | — | `{ available, outsideQuota, ratifiedAt }` | **строка живёт только в матрице; пересев такие записи пропускает** (системные наборы вне квоты, T2/T10) |

Связка род ↔ правило закрыта (`KIND_RULES`): правило из списка, но не того рода — красный
(замечание Веснина: зуб проверяет замкнутость домена правила, не только наличие поля).
Форма `available/outsideQuota` принимается только при `matrix-only`; её контрабанда в квоту — красный.

### Единицы

В паспорте — **МиБ** (`MiB`, мебибайты): «512 МиБ», не «512 МБ». Пересчёт в байты живёт ровно в
двух местах: `mibToBytes` ядра (для слов и зуба) и у пересева (для сетки). Ключи `MB`, `bytes`,
`limit` в значении — красный: сетка хранит байты, паспорт — нет.

## Как рендерится строка

Каждая гранула ресурса — function-гранула контейнера: `granule.json` (`kind: function`, `fn`,
`modulePath: ./render.mjs`, `usedBy` на шаблон `tariff-matrix`) + `resource.json` + `render.mjs`.
`render.mjs` читает `resource.json` рядом, зовёт `parseResource` и `renderRows` ядра и отдаёт
**одну строку** markdown-таблицы (у составной гранулы — по строке на запись):

```
| Буфер записи | 512 МиБ | 2048 МиБ | 4096 МиБ |
```

Порядок колонок — `rank` тарифов из ядра (`SKUS`), не порядок ключей в файле. Шапку таблицы
(`renderHeader()` ядра: `| Ресурс | Датчик | Блокпост | Наблюдательный пункт |`) и текст вокруг
даёт шаблон `tariff-matrix` (блок b3) — гранула шапки не рендерит. В io гранулы матрицы не ходят.

Слова ячейки (`formatValue`): `512 МиБ`; `0 МиБ` → `нет`; штуки склоняются по `unitWords`
(«1 прибор / 4 прибора / 9 приборов»); булевы — «да/нет»; `label` из гранулы главнее формулы
(«при готовой сети», «набор блокпоста»); значение с `stub` получает « (заглушка)»,
с `ratifiedAt: null` — « (не закреплено)». Слов, которых нет в грануле или в ядре, render не выдумывает.

## Как читает пересев (b4)

Пересев (`yarn tariff:reseed`, зона Дынина) читает релиз и те же `resource.json`, для каждой
записи с правилом ≠ `matrix-only` строит `registry[]` (из `resource`, `kind`, `registry`) и
ячейки `rows[].cells[resource]` по правилу из таблицы выше, пишет `docs/tariffs/tariff-grid.json`.
Зуб `yarn tariff:grid`: красный только G↔R; S↔R — печатный список. Детали — в b4, здесь только
контракт формы.

## Гранула → ресурс сетки → правило пересева

| Гранула | Плейсхолдер | Ресурс сетки | Домен | Правило | Закреплено |
|---------|-------------|--------------|-------|---------|------------|
| `tariff-matrix-purpose` (literal) | `{{purpose}}` | — | — | — | — |
| `tariff-buffer` | `{{row_buffer}}` | `storage.buffer` | storage | `exact-bytes` | 08.09 T1 (512 / 2048 / 4096 МиБ) |
| `tariff-collections` | `{{row_collections}}` | `storage.hot` | storage | `exact-bytes` | 08.09 T1 (512 / 2048 / 4096 МиБ) |
| `tariff-cold` | `{{row_cold}}` | `storage.cold` | storage | `exact-bytes` | **нет** — заседание tariff-single-truth; 0 / 2048 / 2048 как в сетке 29.07 |
| `tariff-nodes` | `{{row_nodes}}` | `nodes.max` | rights | `exact-count` | 29.07 (1 / 4 / 9) |
| `tariff-workspaces` | `{{row_workspaces}}` | `workspaces.user.max` | rights | `exact-count` | 29.07 у датчика (3); старшие — нижняя граница, не закреплено |
| `tariff-datasets` | `{{row_datasets}}` | `dataset.sounds` | catalog | `catalog-id` | 29.07 у датчика и блокпоста; наблюдательный пункт — заём набора блокпоста (заглушка словами, `ratifiedAt: null`) |
| `tariff-system-datasets` | `{{row_system_datasets}}` | — (только матрица) | catalog | `matrix-only` | 08.09 T2/T10 (вне квоты, на всех тарифах) |
| `tariff-instruments` (составная) | `{{row_instruments}}` | `instrument.fft_trends`, `instrument.yamnet`, `instrument.mfcc`, `bearing.position`, `produce.own` | instrument | `enabled-flag` / `gated-by-precondition` / `produce-scope` | 29.07 |

Зуб живых файлов сверяет объединение `resource` всех гранул (кроме `matrix-only`) с
`registry[].id` текущей сетки: право без гранулы или гранула без права — красный.

## Что меняет число

Изменить значение = поправить `values.<sku>` в `resource.json`, поставить `ratifiedAt` и источник,
поднять `passport.version` и `version` гранулы, пересобрать релиз, пересеять сетку. Правка релиза
или сетки руками ничего не меняет и ловится зубами.
