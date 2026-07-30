---
name: membrana-bridge
description: >-
  Enter the captain's bridge room (мостик) — Membrana's dialogue format led by
  Ангелина (конспект), with Фаррелл (pet voice) and the parrot (tech-debt memory).
  Loads the lead's toolkit from kit kits/angelina-bridge via yarn bridge tools,
  opens the room explicitly (yarn bridge open) and lets the parrot read live debts.
  Use when the captain says идём на мостик, на мостик, открой мостик, bridge room,
  зови попугая, покажи долги мостика, or asks what the bridge debts are. Do NOT use
  for the morning ritual (membrana-morning-ritual), evening ritual
  (membrana-evening-ritual), storm (membrana-storm) or заседание (membrana-meeting);
  do NOT close the room by hand — closing is the evening ritual's job.
---

# Мостик — комната капитана

Процедура: [`docs/procedures/bridge/`](../../../docs/procedures/bridge/README.md) ·
кит: [`kits/angelina-bridge`](../../../kits/angelina-bridge/README.md) ·
каталог инструментария: [`docs/bridge/toolkit.catalog.json`](../../../docs/bridge/toolkit.catalog.json) ·
спринт-источник `bridge-room` (#936).

Ведущая — **Ангелина** (конспект и честный отчёт; кода не пишет, кодекс #922).
**Фаррелл** (`origin: pet`) — свободный голос, не гейт. **Попугай** — память
техдолгов, немногословен.

## When to use

- Капитан говорит «идём на мостик», «на мостик», «открой мостик», «зови попугая».
- Нужен разбор техдолгов мостика: что живо, что пора снять, что переформулировать.
- Холодная сессия входит в комнату и должна поднять инструментарий ведущей.

## When NOT to use

- Утро → `membrana-morning-ritual`; вечер → `membrana-evening-ritual`.
- Дивергентная беседа ради тезисов → `membrana-storm`; вердикт → `membrana-meeting`.
- Закрывать комнату руками — нельзя: `bridge close` зовёт **вечерний ритуал**.

## Playbook

1. **Открыть явно:** `yarn bridge open` — по слову капитана, не по расписанию.
   Идемпотентно: уже открытая комната → та же запись, второй дом не заводится.
2. **Слушать попугая:** открытие само печатает живые долги. Молчания быть не
   должно: пустой реестр → «долгов нет» (честный empty-state, урок 22.07).
3. **Поднять инструментарий ведущей:** `yarn bridge tools` — четыре зоны
   (комната · попугай · ведущая · соседи). `--zone lead` даёт материалы Ангелины,
   `--doc <id>` — выдержку из документа, `--json` — машинный вид с `warnings`.
4. **Вести конспект:** `docs/bridge/<день>/CONSPECTUS.md` — дом дня, пишет ведущая.
5. **Работать с долгами** (попугай, append-only, всегда с вещдоком):
   `debt validate` (offline: живость ссылок + возраст) → `debt invariants`
   (реальное число тем-узлов) → `debt audit` (сеть `gh`, сверка issue с main) →
   `debt propose` (синтез: settle / supersede / audit-открыто / hold).
   Правки — `debt add` / `settle --evidence` / `supersede --to --evidence`.
6. **Не закрывать.** Закрытие неявное — шаг `ritual:evening`; конспект уезжает
   **фреймом**-заявкой, комната сама не пушит.

## Agent rules

- **Инструментарий берётся из кита, не из грепа по репозиторию.** Источник истины —
  `yarn bridge tools` + [`kits/angelina-bridge/MANIFEST.json`](../../../kits/angelina-bridge/MANIFEST.json).
- Утренний кит [`angelina-morning`](../../../kits/angelina-morning/README.md) — **сосед**,
  на мостике не грузится: тихая подмена соседней поставкой запрещена.
- Удаление записи из `DEBTS.md` запрещено: `settled` помечается, не стирается.
- `debt settle` / `supersede` без `--evidence` — отказ инструмента, не «ну ладно».
- Ангелина не фиксит код: находка → конспект + заказ на Issue, исполнение — после
  явного слова капитана.
- Границы движков: ядра (`bridge-room` / `bridge-debts` / `bridge-debts-health` /
  `bridge-toolkit`) чистые, без fs и сети; вся персистентность и дата — в
  `scripts/bridge.mjs`.
- Комната открыта дольше суток — это находка (долг, а не норма): доложить капитану,
  что вечерний `close` не отработал.
