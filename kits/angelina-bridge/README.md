# angelina-bridge — кит комнаты «мостик»

Пятый жилец слоя [`kits/`](../README.md). Именованный набор точек входа, которым
ведущая **Ангелина** держит комнату капитана: состояние комнаты, конспект дня и
память техдолгов (попугай).

**Owner пина:** `angelina` (`leadPersona` в [`MANIFEST.json`](./MANIFEST.json)).
**Процедура-заказчик:** [`docs/procedures/bridge/`](../../docs/procedures/bridge/README.md)
(`kitVersion`: `kits/angelina-bridge`) · спринт-источник `bridge-room` (#936).
**Скилл входа:** `membrana-bridge` (канон —
[`.cursor/skills/membrana-bridge/SKILL.md`](../../.cursor/skills/membrana-bridge/SKILL.md)).

Утренний кит той же ведущей — [`angelina-morning`](../angelina-morning/README.md) —
**соседняя поставка**: каскад, стендап, ласточка, hermes. На мостике он не грузится
(разные дома, разные корни); тихой подмены соседним быть не должно.

## Режимы

| Режим | Когда | Поведение |
|-------|--------|-----------|
| **latest** | интерактивная сессия, капитан рядом | дерево `scripts/` может быть новее пина; `yarn kits:audit --mode latest` — `sha_drift` = warn |
| **pinned** | autonomous (night / cron / office) | только от пина; `yarn kits:audit` (default) — drift = BLOCK |

Обновление пина — **отдельный** ревьюируемый коммит `MANIFEST.json`, не побочный
эффект правки скрипта.

## Корни и подграф

| Узел | Роль | Чистота |
|------|------|---------|
| `scripts/bridge.mjs` | единственный корень: CLI `open` / `status` / `close` / `tools` / `debt …` | адаптер: весь fs и дата здесь |
| `scripts/lib/bridge-room.mjs` | конечный автомат комнаты `closed → opened → closed` | чистое ядро |
| `scripts/lib/bridge-debts.mjs` | реестр долгов (append-only), парс/рендер/supersede | чистое ядро |
| `scripts/lib/bridge-debts-health.mjs` | зубы долгов: validate / invariants / audit / decompose / propose | чистое ядро |
| `scripts/lib/bridge-toolkit.mjs` | инвентарь инструментария ведущей (`yarn bridge tools`) | чистое ядро |

Граница мостика: ядра без fs/сети, персистентность и дата — в адаптере
([`docs/procedures/bridge/README.md`](../../docs/procedures/bridge/README.md)).

## Инструментарий ведущей

```bash
yarn bridge tools                     # таблица: комната · попугай · ведущая · соседи
yarn bridge tools --zone lead         # только инструментарий ведущей
yarn bridge tools --doc lead-subagent # выдержка из документа инструмента
yarn bridge tools --json              # машинный вид (+ warnings)
```

Каталог — [`docs/bridge/toolkit.catalog.json`](../../docs/bridge/toolkit.catalog.json)
(дом мостика, не кит: кит поставляет движки, каталог описывает спрос). Отсутствие
файла инструмента даёт видимое `⚠`, а не тихий пропуск.

## Аудит

```bash
yarn kits:audit --id angelina-bridge
yarn kits:audit --id angelina-bridge --mode latest
```

## Чеклист PINNED_SUBGRAPH (этот кит)

1. ✅ Единица версии — подграф в `MANIFEST.json` (`pins`).
2. ✅ Пины — git blob SHA; копий файлов нет.
3. ✅ Аудит полноты — `yarn kits:audit --id angelina-bridge`.
4. ✅ Режимы latest/pinned — таблица выше + CLI `--mode`.
5. ✅ Обновление пина — отдельный ревьюируемый коммит манифеста.
6. ✅ Владелец пина — `leadPersona: angelina`.
7. ✅ Дрейф — табличный вывод audit (`missing_pin` / `sha_drift`).

## Вне скоупа (соседи)

- Утренняя цепочка (`ritual:day`) — кит [`angelina-morning`](../angelina-morning/README.md).
- Отправка конспекта — фрейм-контракт `#900`, комната сама не пушит.
- Ласточка партнёрам — `membrana-telegram-swallow`, не инструмент мостика.
