---
name: membrana-evening-ritual
status: live
description: >-
  Runs the Membrana EVENING ritual through its own door: procedure manifest
  ritual-evening, frames preflight→chain→post, `yarn ritual:evening`, partner
  swallow owner-gate via `yarn evening:gate partner-swallow`, and fail-closed
  refusal instead of falling back to membrana-developer-rhythm. Use when the user
  says вечер, вечерний ритуал, ritual:evening, закрыть день, or asks to run the
  evening.
---

# Membrana — вечерний ритуал

> **Статус: live** — единственный playbook входа в вечер. Вечер больше не
> проходит через общий `membrana-developer-rhythm`: тот скилл только указывает
> сюда. Повод: Issue #1475 — «Вечеру своя дверь».

## Before Start

1. Читать [`docs/procedures/ritual-evening/MANIFEST.json`](../../../docs/procedures/ritual-evening/MANIFEST.json)
   и [`docs/tasks/evening-ritual-steps.json`](../../../docs/tasks/evening-ritual-steps.json).
   Порядок шагов не восстанавливается по памяти.
2. Проверить дерево: если есть чужая грязь или незакрытая работа, не убирать её.
   Эскалировать владельцу или работать в своей ветке.
3. Не заменять вечер старой ручной цепочкой из `docs/DEVELOPER_RHYTHM.md`. Канон
   исполнения — `yarn ritual:evening` / `node scripts/ritual-evening-run.mjs`.

## Frames

Фреймы объявлены в manifest:

- `preflight/evening-door` — вход и провода скилла.
- `frames/archive-day` — архив утренних артефактов до ревью.
- `frames/truth-memory-index` — truth/RAG/team-memory/insight reporters.
- `frames/leveling-workspace` — soft leveling; findings видимы, но не auto-ship.
- `frames/code-review` — критичное ревью дня и архив ревью.
- `frames/closure-feedback` — закрытие Issues и team evening feedback.
- `post/partner-swallow` — ручной доклад партнёрам после показа владельцу.

## Run

Основная цепочка:

```bash
yarn ritual:evening
```

Если Yarn в конкретной среде недоступен, допустимый эквивалент:

```bash
node scripts/ritual-evening-run.mjs
```

Частичный прогон только для ремонта конкретного шага:

```bash
node scripts/ritual-evening-run.mjs --only <step-id>
```

`--only` не считается полным вечером.

## Partner Swallow Gate

Вечерний owner-gate имеет собственный CLI:

```bash
yarn swallow:draft --kind evening
yarn evening:gate partner-swallow --draft <file>
# показать владельцу полный черновик
yarn evening:gate partner-swallow --ack
yarn telegram:swallow --file <file>
```

Предикат: `day ∧ ownerAck ∧ draftDigest(payload)`. Это тот же безопасный
digest-контур, который проверяет `telegram:swallow`, но дверь и отказ вечерние.
Не использовать `morning:gate` для вечернего черновика.

## Failover

Если этот скилл, manifest или `evening:gate` недоступны — **STOP с явной ошибкой**.
`membrana-developer-rhythm` не замещает вечер и не даёт права импровизировать
ручную цепочку. Рабочий отказ: назвать сломанное звено и resume-команду
(`yarn ritual:evening` или `yarn evening:gate partner-swallow ...`).

## Output

Коротко сообщить: полный/частичный прогон, критичные отказы, findings-репортёры,
путь к `docs/DAILY_CODE_REVIEW.md`, путь к team feedback, состояние
`partner-swallow` (ждёт draft / ждёт ok / открыт / отправлен).

