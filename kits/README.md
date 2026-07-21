# kits/ — слой китов (ранг 1)

Дом **именованных наборов** точек входа под задачу. Код движков остаётся плоским
в [`scripts/`](../scripts/README.md); кит — виртуальный подграф со ссылками и
SHA-пинами ([`PINNED_SUBGRAPH_VERSIONING`](../docs/patterns/PINNED_SUBGRAPH_VERSIONING.md)).

Канон границы слоёв: [`docs/procedures/layer-rules.json`](../docs/procedures/layer-rules.json)
(процедура → кит → скрипт). Контракт ревью кит-манифеста — вердикт Р3
([`docs/procedures/README.md`](../docs/procedures/README.md) § «Граница слоёв и киты»,
PR #808 / `pl-r3-boundary`). Эпик первого жильца: `kits-angelina-morning` (#814).

**Не путать:** этот каталог — **не** `docs/audit/git/` и **не** второй дом скриптов.
Схемы кита в `scripts/` **нет** и не будет (sbc-s3 / #795).

## Термины

| Лемма | Значение |
|-------|----------|
| **Кит** | Каталог `kits/<id>/` + `MANIFEST.json` + `README.md` |
| **Кит-манифест** | Главный diffable-артефакт ревью; без него / с битыми ссылками — машинный BLOCK (Р3) |
| **pins** | Подграф `path → SHA` (git object id файла/узла); копии запрещены |
| **roots** | Точки входа кита (пути под `scripts/…`); замыкание пинов строит K2-аудит |
| **leadPersona** | Владелец пина (кто отвечает за дрейф манифест ↔ реальность) |
| **kitVersion** | Поле *процедуры* → дом кита (`kits/<id>`); утро: [`ritual-day`](../docs/procedures/ritual-day/) → `kits/angelina-morning` (K4) |

## Layout

```
kits/
  README.md              — этот файл (контракт слоя)
  MANIFEST.schema.json   — единственная JSON Schema кит-манифеста (потребляет Р3 + #761)
  <id>/                  — жилец (первый: angelina-morning — фаза K3)
    README.md
    MANIFEST.json        — обязан соответствовать MANIFEST.schema.json
```

В контейнере кита **нет** исполняемого кода и тестов (как процедурa, Т12): только
манифест + README. Движки — в `scripts/` по пинам.

## Контракт MANIFEST.json

Схема: [`MANIFEST.schema.json`](./MANIFEST.schema.json). Поля (лишние — дефект):

| Поле | Тип | Правило |
|------|-----|---------|
| `id` | string | kebab-case = имя каталога |
| `leadPersona` | string | непустой; владелец пина |
| `roots` | string[] | ≥1 путь; каждый ∈ ключам `pins` и резолвится от корня репо |
| `pins` | object | `path →` 40 hex SHA; каждый path существует; без копий файлов |

Режимы исполнения (паттерн #761) — в README жильца и в рантайме (K3+):

- **latest** — интерактив; пины ориентир, дерево может быть новее
- **pinned** — autonomous (night/cron/office); только от пина

## Что писать / коммитить

| Разрешено | Запрещено |
|-----------|-----------|
| `kits/<id>/README.md`, `MANIFEST.json` | Код/тесты внутри `kits/<id>/` |
| Правка `MANIFEST.schema.json` (осознанный акт контракта) | `scripts/**/kits*.schema.json` (второй остров) |
| Обновление пинов отдельным ревьюируемым коммитом | Пин как побочный эффект правки скрипта |
| Ссылки на `scripts/…` и конфиги в `pins` | Ссылки на `docs/procedures/` (кит не знает о процедуре) |

## Жильцы

| Кит | Держатель | Статус |
|-----|-----------|--------|
| [`angelina-morning/`](./angelina-morning/) | angelina | ✅ первый жилец (K3 / #818); 13 roots · pins подграф |

## Зубы (по фазам эпика)

| Зуб | Фаза | Статус |
|-----|------|--------|
| Схема манифеста (этот файл + schema) | K1 | ✅ |
| Аудит полноты подграфа path→SHA | K2 | ✅ `yarn kits:audit` |
| Жилец + режимы latest/pinned | K3 | ✅ `kits/angelina-morning/` |
| `kitVersion` с процедуры утра | K4 | ✅ `ritual-day` → `kits/angelina-morning` |

## Аудит (K2)

```bash
yarn kits:audit                 # все жильцы, mode=pinned (CI)
yarn kits:audit --mode latest   # sha_drift → warn, не exit 1
yarn kits:audit --id <kit-id>
```

Зуб: `scripts/lib/kit-subgraph-audit.mjs` — замыкание статических импортов от
`roots` ↔ `pins` (path→git blob SHA). Находки таблицей: `missing_pin`,
`sha_drift`, `orphan_pin`, `unresolvable`, `schema`. Exit 0/1/2 как у
`check:layer-direction` (ошибка инструмента ≠ «0 находок»). Пока жильцов нет —
честный exit 0 («0 kits»). Слепая зона: data-чтения (`readFileSync` конфигов)
в статический граф не входят (как у layer-direction).

## Чеклист PINNED_SUBGRAPH (слой)

1. ✅ Единица версии — подграф в манифесте (`pins`).
2. ✅ Пины — git SHA; копий нет (контракт).
3. ✅ Аудит полноты — `yarn kits:audit`.
4. ✅ Режимы latest/pinned названы в контракте слоя и в CLI `--mode`.
5. ✅ Обновление пина — отдельный коммит (таблица выше).
6. ✅ Владелец пина — `leadPersona`.
7. ✅ Дрейф — табличный вывод audit (`missing_pin` / `sha_drift`).
