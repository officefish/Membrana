---
name: membrana-morning-ritual
status: live
description: >-
  Runs the Membrana MORNING ritual — the full owner-gated scenario: pre-ritual order
  (branch=main, escalate on dirty tree, read yesterday's feedback + open owner forks
  BEFORE start), the chain with Angelina as freshness guard, the two owner gates
  (magistral owner-choice from top-3, swallow-send with explicit «ок»), and the ban on
  accepting a magistral chosen by a script. Use when the user says утро, утренний ритуал,
  ritual:day, standup, main-day-issue, стендап, план дня, or asks to start the morning.
  Do NOT use for evening/day rhythm (membrana-developer-rhythm), task closure
  (membrana-task-lifecycle), or Night Build (membrana-night-sprint).
---

# Membrana — утренний ритуал

> **Статус: live** — единственный источник истины по утру. Вердикт заседания
> `angelina-hostess` M1 (21.07, ратифицирован владельцем):
> [`angelina-hostess-m1-canon-2026-07-21.md`](../../../docs/seanses/angelina-hostess-m1-canon-2026-07-21.md).
> Утро **вычеркнуто** из `membrana-developer-rhythm` — тот скилл о ритме дня и вечере и
> лишь ссылается сюда. Прецедент-повод:
> [`2026-07-21-ritual-old-scenario-lost-sprint.md`](../../../docs/precedents/2026-07-21-ritual-old-scenario-lost-sprint.md).

## ПЕРЕД ритуалом (обязательный порядок — нарушение = прецедент 21.07)

1. **Ветка утра — `main`** (или назначенная Тимлидом). Грязное дерево / занятый main —
   **эскалация владельцу**, не молчаливое продолжение на боковой ветке. Холодная сессия
   21.07 прогнала ритуал старым кодом с боковой ветки — весь новый контур жил в main.
2. **Прочитать** вчерашний `docs/seanses/team-evening-feedback-<вчера>.md` (блок «на
   завтра» + резюме Teamlead) **и открытые развилки владельца** в свежих Issue — ДО
   запуска. Это дешевле одного лишнего прогона.

## Сценарий (`yarn ritual:day`)

Цепочка: morning-care → deps-watch → plan-week (пн) → **strategy-day** (горизонт,
подписан провенансом) → standup → main-day-probe → **main-day-issue** (5-блочный каркас,
гейт скелета: LLM уронил слот → файл не пишется, вещдок в `MAIN_DAY_ISSUE.rejected.md`) →
**Ангелина** (страж свежести/подписей: `stale`/нет провенанса → exit 22, цепочка стоит).

Встреча дня — **первая реплика Ангелины** (имя, ревизия head, состояние фронтира);
молчаливый старт запрещён (вердикт M4-H).

## Двухгейтовое утро (тезис Т2 шторма #741; до проводки в код — держать руками)

| Гейт | Что | Механика (вердикт M3-G) |
|------|-----|--------------------------|
| **magistral** | магистраль дня = **owner-choice из топ-3** (продукт↔тулинг), НЕ выбор скрипта/стендапа | предикат `magistralChosen`: выбор владельца ∈ замороженный снимок топ-3 → перечеканка `main-day-assertions.json` |
| **swallow-send** | доклад партнёрам: черновик через линзу (структура = план, слова чищены) + чек живых ссылок → **явное «ок» владельца** → `yarn telegram:swallow` | предикат `swallowApproved = ownerAck`; черновик виден целиком ДО одобрения; `canSend = magistralChosen ∧ swallowApproved` — единственный путь к отправке |

**Магистраль, назначенную генератором/стендапом БЕЗ owner-choice, — не принимать**
(рецидивы 16.07, 17.07, 21.07). Ручная чеканка владельца легитимна — подписывается
`author=human` (после B: `yarn canon:sign --author human`).

## Failover (вердикт M1-C)

Если этот скилл недоступен/битый — **СТОП с явной ошибкой**. `membrana-developer-rhythm`
утро **не замещает**: мёртвая дверь запрещена.

## Output

Итог: какие шаги прошли, вердикт Ангелины по каскаду, статус двух гейтов
(magistral: выбран/ждёт · swallow: ок/ждёт), фокус дня из `MAIN_DAY_ISSUE`.
