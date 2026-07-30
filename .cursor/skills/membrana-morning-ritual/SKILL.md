---
name: membrana-morning-ritual
status: live
description: >-
  Runs the Membrana MORNING ritual — the full owner-gated scenario: pre-ritual order
  (tree freshEnough∧clean vs origin/main — not checkout main; escalate dirty/
  main-holder; read yesterday's feedback + open owner forks BEFORE start),
  the chain with Angelina as freshness guard, the two owner gates
  (magistral owner-choice from top-3, swallow-send with explicit «ок»), and the ban on
  accepting a magistral chosen by a script. Use when the user says утро, утренний ритуал,
  ritual:day, standup, main-day-issue, стендап, план дня, or asks to start the morning.
  Do NOT use for evening ritual (membrana-evening-ritual), day rhythm
  (membrana-developer-rhythm), task closure (membrana-task-lifecycle), or Night
  Build (membrana-night-sprint).
---

# Membrana — утренний ритуал

> **Статус: live** — единственный источник истины по утру. Вердикт заседания
> `angelina-hostess` M1 (21.07, ратифицирован владельцем):
> [`angelina-hostess-m1-canon-2026-07-21.md`](../../../docs/seanses/angelina-hostess-m1-canon-2026-07-21.md).
> Утро **вычеркнуто** из `membrana-developer-rhythm` — тот скилл о ритме дня и
> лишь ссылается сюда. Вечер вычеркнут в `membrana-evening-ritual` (#1475).
> Прецедент-повод:
> [`2026-07-21-ritual-old-scenario-lost-sprint.md`](../../../docs/precedents/2026-07-21-ritual-old-scenario-lost-sprint.md).

## ПЕРЕД ритуалом (обязательный порядок — нарушение = прецедент 21.07)

1. **Дерево утра — свежее и чистое** (#1232): `freshEnough(дерево, origin/main) ∧
   clean(дерево)` (порог behind по умолчанию **0**). Чекаут `main` **не нужен** и
   `main` никому не выдаётся — держатель с путём дерева = находка (`morning-care`
   падает громко). Грязь / чужие незакоммиченные правки → **эскалация владельцу**,
   не переключение веток и не снос чужого. **Свои** артефакты прежнего прогона
   (ревью/план/стратегия/снапшоты) забирает автозабор — первый шаг `ritual:day`
   (`ritual:artifacts-commit --manifest docs/tasks/morning-ritual-steps.json`,
   помеха 29.07 — близнец вечерней №1/#1382). Холодная сессия 21.07 прогнала ритуал
   устаревшим кодом — лечится свежестью относительно `origin/main`, не конкуренцией
   за чекаут.
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
| **swallow-send** | доклад партнёрам: черновик через линзу (структура = план, слова чищены) + чек живых ссылок → **явное «ок» владельца** → `yarn telegram:swallow` | предикаты требуют `state.day === today` (#1233); `swallowApproved = day ∧ ownerAck ∧ draftDigest`; `canSend = day ∧ magistral ∧ swallow`; отправитель зовёт `canSendAlly` (день ∧ ack ∧ digest payload) |

**Магистраль, назначенную генератором/стендапом БЕЗ owner-choice, — не принимать**
(рецидивы 16.07, 17.07, 21.07). Ручная чеканка владельца легитимна — подписывается
`author=human` (после B: `yarn canon:sign --author human`).

## Failover (вердикт M1-C)

Если этот скилл недоступен/битый — **СТОП с явной ошибкой**. `membrana-developer-rhythm`
утро **не замещает**: мёртвая дверь запрещена.

## Output

Итог: какие шаги прошли, вердикт Ангелины по каскаду, статус двух гейтов
(magistral: выбран/ждёт · swallow: ок/ждёт), фокус дня из `MAIN_DAY_ISSUE`.
