# Регламент Competition Sprint

> **Competition Sprint** — формат разработки, в котором **одно общее задание** выполняют **три независимые команды** параллельно. Команды не делят код и не синхронизируют реализацию до финала; победитель выбирается после консилиума и **взвешенного голосования** виртуальной команды.
>
> Связано: [`VIRTUAL_TEAM_PROMPT.md`](./VIRTUAL_TEAM_PROMPT.md), [`TASK_PROMPT_WORKFLOW.md`](./prompts/TASK_PROMPT_WORKFLOW.md), [`TASK_CLOSURE_REGULATION.md`](./prompts/TASK_CLOSURE_REGULATION.md), [`DEVELOPER_RHYTHM.md`](./DEVELOPER_RHYTHM.md).

---

## Когда использовать

| Режим | Когда | Пример |
|-------|--------|--------|
| **Дневной M/L** | Один очевидный путь, LGTM заранее | Hotfix, мелкий эпик |
| **Night Build** | Одна ночь, один эпик, без альтернатив | DRY, lint gate |
| **Hackathon** | 3–5 дней, последовательные эпики одной оси | device-board v1 |
| **Competition Sprint** | **Несколько равноправных архитектур/UX**, выбор по фактам | Новый модуль UI, стратегия интеграции, формат API |

**Competition Sprint уместен, если:**

- есть **≥2 правдоподобных** решения с разными trade-off;
- стоимость ошибочного выбора высока (сложно откатить);
- product готов **сравнить работающие прототипы**, а не читать только slide-deck.

**Competition Sprint не заменяет:**

- prod-deploy и prod-smoke (после merge победителя — отдельный PR);
- изменения `@membrana/core` / `agenda` / `MembranaRegistry` без ветки **`vesnin`** и LGTM Vesnin;
- triage посторонних Issue — только блокеры из brief.

**Не смешивать** в один календарный слот: Night Build, Hackathon и Competition Sprint.

---

## Участники

### Три конкурирующие команды (исполнители)

| Команда | Codename | Ветка | Изоляция |
|---------|----------|-------|----------|
| **Team A** | `alpha` | `comp/<sprint-id>/alpha` | свой код, свой `CONCEPT.md`, свой demo |
| **Team B** | `beta` | `comp/<sprint-id>/beta` | то же |
| **Team C** | `gamma` | `comp/<sprint-id>/gamma` | то же |

**Правила независимости (hard):**

1. До Phase 3 **запрещены** merge/rebase/cherry-pick между ветками alpha/beta/gamma.
2. **Запрещено** копировать файлы целиком из чужой ветки (идеи — да, diff — нет).
3. Общий brief **одинаков** для всех; трактовка brief — на усмотрение команды.
4. Команда может назначить себе «lead-роль» (Ozhegov / Dynin / Rodchenko), но **не обязана** покрывать все пять ролей — достаточно DoD brief.

### Жюри (виртуальная команда — оценка, не реализация)

| Роль | Персонаж | Что оценивает на Phase 4 |
|------|----------|---------------------------|
| Teamlead | **Vesnin** | архитектура, границы пакетов, mergeability, LGTM |
| Структурщик | **Ozhegov** | слабая связанность, слои, отсутствие циклов |
| Математик | **Dynin** | корректность метрик/алгоритмов, тестируемость |
| Музыкант | — | аудио-поток, latency, качество сигнала (если brief про звук) |
| Верстальщик | **Rodchenko** | UX, a11y, DESIGN.md, destructive flows |

Если brief **не про аудио**, Музыкант голосует с весом **0** (не участвует в сумме) или оценивает только «operator clarity» по согласованию Vesnin.

**Tie-break:** при равенстве weighted score — решающий голос **Vesnin**.

---

## Сводная таблица фаз

| Фаза | Название | Длительность (ориентир) | Артефакт |
|------|----------|-------------------------|----------|
| **0** | Brief + open | 0.5–1 день | `COMPETITION_SPRINT_BRIEF.md`, `COMPETITION_SPRINT_ACTIVE.md` |
| **1** | Concept pitch | 0.5–1 день | `team-*/CONCEPT.md` (+ optional diagram) |
| **2α** | Proof implementation | 1–2 дня | vertical slice, demo, scoped tests |
| **2β** | Full implementation | 1–3 дня | DoD brief, CI green на ветке команды |
| **3** | Consilium | 2–4 часа | `docs/discussions/competition-sprint-<id>-consilium.md` |
| **4** | Vote + winner | 1–2 часа | `SCORECARD.md`, `WINNER.md` |
| **5** | Merge + archive | 0.5–1 день | PR победителя в `techies68`, `yarn task:archive` |

---

## Жизненный цикл (7 шагов)

```
Brief → comp:open → Phase1×3 → Phase2α×3 → Phase2β×3 → Consilium → Vote → merge winner → archive
```

### Шаг 0. Brief (Product + Vesnin)

Владелец продукта и Teamlead фиксируют **замороженный brief**:

| Блок | Обязательно |
|------|-------------|
| **Problem** | Какую боль решаем (1 абзац) |
| **Constraints** | Пакеты, запреты (Web Audio только через engine, no direct store, …) |
| **DoD (общий)** | Что должно работать у **каждой** команды к концу Phase 2β |
| **Out of scope** | Явный список |
| **Evaluation hints** | На что смотреть жюри (не binding, но orienting) |
| **Demo script** | Единый сценарий ручной проверки для Phase 3 |

Файл: `docs/competition-sprint/<sprint-id>/COMPETITION_SPRINT_BRIEF.md`

Регистрация в [`docs/tasks/registry.json`](./tasks/registry.json):

```json
{
  "id": "comp-<slug>",
  "title": "Competition Sprint: …",
  "promptPath": "docs/competition-sprint/<sprint-id>/COMPETITION_SPRINT_BRIEF.md",
  "size": "L",
  "status": "active",
  "sprintKind": "competition-sprint",
  "notes": "3 teams alpha/beta/gamma; winner merge"
}
```

Подзадачи (опционально): `comp-<slug>-alpha`, `comp-<slug>-beta`, `comp-<slug>-gamma`, `comp-<slug>-consilium`.

### Шаг 1. Открытие (`yarn comp:open --id <sprint-id>` — *рекомендуемая команда, скрипт optional*)

Создаётся `docs/COMPETITION_SPRINT_ACTIVE.md`:

```markdown
# Competition Sprint ACTIVE

| Поле | Значение |
|------|----------|
| sprintId | comp-… |
| brief | docs/competition-sprint/…/COMPETITION_SPRINT_BRIEF.md |
| baseBranch | techies68 |
| teams | alpha, beta, gamma |
| phase | 1 |
| openedAt | ISO |
```

Три ветки от **одного и того же** merge-base commit:

```bash
git checkout techies68 && git pull
git checkout -b comp/<sprint-id>/alpha
git push -u origin comp/<sprint-id>/alpha
# повторить для beta, gamma от того же SHA (зафиксировать BASE_SHA в ACTIVE)
```

**Запрещено открывать**, если brief не LGTM или `COMPETITION_SPRINT_ACTIVE.md` уже `open` (без `--force`).

---

## Phase 1 — Concept pitch (концепт + техобоснование)

**Цель:** каждая команда **независимо** документирует своё решение **до** существенного кода (допустим spike ≤200 LOC / throwaway).

### Deliverable: `team-<codename>/CONCEPT.md`

Обязательные разделы:

```markdown
# Concept — Team <Alpha|Beta|Gamma>

## One-liner
…

## Product thesis
Почему оператор/продукт выигрывает именно так.

## Architecture
- Затронутые пакеты (@membrana/…)
- Диаграмма (mermaid или ascii)
- Границы: что НЕ трогаем

## Key decisions (ADR-lite)
| ID | Решение | Альтернатива | Почему так |

## Trade-offs
| Плюс | Минус |

## Phase 2 plan
### 2α — vertical slice (что покажем первым)
### 2β — full DoD (что добьём)

## Risks & mitigations

## Demo narrative (2–3 мин)
Шаги по demo script из brief.
```

### Формат представления (async или live)

1. Команда публикует `CONCEPT.md` в **своей** ветке + push.
2. Append в `docs/competition-sprint/<sprint-id>/PITCH_LOG.md` (без оценок, только ссылки на commit).
3. **Запрещено** комментировать чужие концепты до Phase 3 (чтобы не якорить решения).

**Gate Phase 1 → 2α:** Vesnin проверяет, что все три `CONCEPT.md` есть и не нарушают `ARCHITECTURE.md` на уровне intent. Хотя бы одна команда rejected → sprint pause.

---

## Phase 2 — Реализация (две подфазы)

Обе подфазы выполняет **каждая** команда **только в своей ветке**.

### Phase 2α — Proof (vertical slice)

| Критерий | Требование |
|----------|------------|
| Scope | Один happy-path из demo script |
| Tests | ≥1 meaningful test (не smoke `true===true`) |
| CI | `lint` + `typecheck` + scoped `test` на ветке |
| Docs | README или comment в CONCEPT «2α done @ commit» |
| Duration | Ориентир 1–2 дня |

**Stop rule 2α:** 2 падения scoped CI подряд → handoff в `team-*/BLOCKER.md`, команда может выйти из соревнования (forfeit).

### Phase 2β — Full DoD

| Критерий | Требование |
|----------|------------|
| Scope | Полный DoD из brief |
| Tests | Покрытие сценариев из brief; device-board ≥380 tests baseline не ломаем |
| CI | Полный scoped pipeline из brief (или `turbo lint typecheck test build --filter=…`) |
| Docs | README / CONCEPT §Implementation / apps/docs stub если в brief |
| Cross-team | По-прежнему **нет** merge между alpha/beta/gamma |

**Gate 2β → 3:** все **не forfeited** команды зелёные по CI своей ветки. Команда-forfeit остаётся в consilium как «withdrawn», но не в голосовании.

---

## Phase 3 — Consilium (общее обсуждение)

**Цель:** структурированное сравнение **готовых** решений, без выбора победителя (голосование — Phase 4).

### Протокол

Файл: `docs/discussions/competition-sprint-<sprint-id>-consilium.md`

**Порядок реплик (как в [`VIRTUAL_TEAM_PROMPT.md`](./VIRTUAL_TEAM_PROMPT.md)):**

```text
Vesnin → Ozhegov → Dynin → Музыкант → Rodchenko → (по кругу по темам)
```

**Структура протокола:**

```markdown
# Consilium: Competition Sprint <title>

## Demo recap
| Team | Commit | Demo OK? | Notes |

## Team Alpha — summary
### Strengths
### Weaknesses
### Open questions

## Team Beta — summary
…

## Team Gamma — summary
…

## Cross-cutting themes
| Theme | Alpha | Beta | Gamma |

## Журнал реплик
[Teamlead — Vesnin]: …
[Структурщик — Ozhegov]: …
…

## Pre-vote consensus (non-binding)
Что жюри считает обязательным перенести в winner regardless (tech debt, docs, …).
```

**Правила consilium:**

- Обсуждаем **факты**: diff, тесты, demo, метрики — не намерения из Phase 1.
- Каждая команда может дать **5 мин rebuttal** (append в протокол).
- **Запрещено** менять код во время consilium (freeze tag `comp-<id>-consilium-freeze` на каждой ветке).

---

## Phase 4 — Голосование и выбор победителя

### Scorecard

Файл: `docs/competition-sprint/<sprint-id>/SCORECARD.md`

Каждый член жюри выставляет **баллы 1–5** (5 — отлично) по критериям:

| ID | Критерий | Vesnin | Ozhegov | Dynin | Музыкант | Rodchenko | Weight |
|----|----------|--------|---------|-------|----------|-----------|--------|
| C1 | Соответствие brief / DoD | | | | | | 1.5 |
| C2 | Архитектура и границы пакетов | | | | | | 2.0 |
| C3 | Тестируемость и CI | | | | | | 1.5 |
| C4 | UX / operator clarity | | | | | | 1.5 |
| C5 | Maintainability (читаемость, scope) | | | | | | 1.5 |
| C6 | Risk / tech debt | | | | | | 1.0 |

**Веса по умолчанию** (сумма = 9.0). Vesnin может изменить в brief до Phase 4.

**Weighted score команды:**

\[
Score(team) = \sum_{jury} \sum_{criterion} weight_c \times score_{team,jury,c}
\]

Нормализация: если Музыкант abstain — пересчитать знаменатель без его веса по аудио-критериям.

### Бюллетень (шаблон)

```markdown
## Ballot — <Jury member name> — <ISO date>

| Criterion | Team Alpha | Team Beta | Team Gamma |
|-----------|------------|-----------|------------|
| C1 | | | |
| C2 | | | |
| … | | | |

**Rank:** 1. … 2. … 3. …
**One-line rationale:** …
```

Бюллетени append в `SCORECARD.md` **до** объявления итога (blind optional — по решению Vesnin).

### Итог: `WINNER.md`

```markdown
# Competition Sprint Winner

| Place | Team | Weighted score |
|-------|------|----------------|
| 1 | alpha | … |
| 2 | beta | … |
| 3 | gamma | … |

**Winner:** Team <codename>
**Merge strategy:** PR `comp/<id>/<winner>` → `techies68`
**Cherry-pick from losers:** optional items from consilium §Pre-vote consensus
**LGTM:** Vesnin, <date>
```

**Forfeit / DQ:** команда без зелёного 2β не получает баллы; нарушение изоляции (merge между ветками) → DQ по решению Vesnin.

---

## Phase 5 — Merge победителя и закрытие

1. PR только **победившей** ветки; title: `feat(comp-<id>): <winner> solution — Competition Sprint winner`.
2. Описание PR: ссылка на `WINNER.md`, consilium, scorecard; `Closes #<issue>`.
3. Ветки проигравших: **не merge**; тег `comp-<id>-archive-<team>` + optional export patch в `docs/archive/competition-sprint/<id>/`.
4. `yarn task:archive comp-<slug>` + подзадачи; промпт brief **остаётся**.
5. Lessons learned append в brief или `docs/archive/competition-sprint/<id>/RETROSPECTIVE.md`.

---

## Что приостановлено при `COMPETITION_SPRINT_ACTIVE.md` → `open`

- `yarn ritual:day` / `yarn main-day-issue` (или brief явно разрешает один фокус «наблюдение sprint»)
- Параллельный Night Build / Hackathon
- **Не приостанавливается:** scoped CI, `yarn consilium` для этого sprint, doc-only fixes на `techies68` по LGTM

---

## Stop rules (общие)

| # | Условие | Действие |
|---|---------|----------|
| S1 | 2 scoped CI fail подряд на команде | `team-*/BLOCKER.md`, pause 2β для команды |
| S2 | Нарушение изоляции веток | DQ команды, Vesnin notify |
| S3 | Brief change после Phase 1 | Только через `BRIEF_AMENDMENT.md` + unanimous Vesnin + Product |
| S4 | <2 команд до Phase 3 | Sprint invalid — revert to single-track M/L |
| S5 | Winner PR conflicts techies68 | Ozhegov lead rebase, max 4h box |

---

## Команды (рекомендуемые yarn-скрипты)

| Команда | Действие |
|---------|----------|
| `yarn comp:open --id <sprint-id>` | Brief check, ACTIVE.md, BASE_SHA, напоминание создать 3 ветки |
| `yarn comp:phase --id <sprint-id> --set 2a` | Обновить phase в ACTIVE |
| `yarn comp:score --id <sprint-id> --dry` | Проверить SCORECARD arithmetic |
| `yarn comp:close --id <sprint-id>` | WINNER required, archive ACTIVE → `docs/archive/competition-sprint/<date>/` |

*(Скрипты — follow-up; регламент valid без них.)*

---

## Промпт для AI-агента (копировать в Cursor)

Ниже — **мастер-промпт** для запуска Competition Sprint. Подставь `<SPRINT_ID>`, `<BRIEF_PATH>`, `<TEAM>` (`alpha`|`beta`|`gamma`).

```markdown
# Competition Sprint — agent instructions

Ты участник **Team <TEAM>** в Competition Sprint `<SPRINT_ID>`.
Регламент: `docs/COMPETITION_SPRINT_REGULATION.md` (прочитай полностью).
Brief: `<BRIEF_PATH>`.
Ветка: **только** `comp/<SPRINT_ID>/<TEAM>`. Merge-base: см. `docs/COMPETITION_SPRINT_ACTIVE.md`.

## Hard rules
- Не читай и не копируй код из веток других команд до Phase 3.
- Не импортируй из `dist/`; Web Audio только через `@membrana/audio-engine-service`.
- Не регистрируй модули через store напрямую — только `MembranaRegistry`.
- Tariff/core boundaries — см. brief и ARCHITECTURE.md.

## Текущая фаза: <PHASE>
<!-- PHASE = 1 | 2a | 2b | 3-observer | 5-merge-winner -->

### Если PHASE = 1
Deliverable: `docs/competition-sprint/<SPRINT_ID>/team-<TEAM>/CONCEPT.md`
- Заполни все обязательные разделы регламента.
- Допустим throwaway spike ≤200 LOC; пометь `// COMP-SPike`.
- Commit: `comp(<SPRINT_ID>/<TEAM>): phase1 concept pitch`
- Push. Append ссылку в `PITCH_LOG.md`.

### Если PHASE = 2a
Deliverable: vertical slice по demo script (happy path).
- Scoped CI green.
- Commit: `comp(<SPRINT_ID>/<TEAM>): phase2a proof — <кратко>`
- Обнови CONCEPT.md §Phase 2α done.

### Если PHASE = 2b
Deliverable: full DoD brief.
- Tests + docs per brief.
- Commit: `comp(<SPRINT_ID>/<TEAM>): phase2b full DoD`
- Tag: `comp-<SPRINT_ID>-<TEAM>-final`

### Если PHASE = 3-observer (только жюри / coordinator)
Не пиши код. Участвуй в consilium: `docs/discussions/competition-sprint-<SPRINT_ID>-consilium.md`
Формат реплик — VIRTUAL_TEAM_PROMPT.md.

### Если PHASE = 5-merge-winner (только победившая команда)
PR → `techies68`. Описание: WINNER.md + consilium. Closes issue.

## Формат ответа агента
[Team <TEAM> · Phase <PHASE>]:
- Сделано: …
- Артефакты: paths
- CI: pass/fail
- Следующий шаг: …
- Blocker: — | …
```

---

## Шаблон brief (минимум)

Сохрани как `docs/competition-sprint/<sprint-id>/COMPETITION_SPRINT_BRIEF.md`:

```markdown
# Competition Sprint Brief: <title>

| Поле | Значение |
|------|----------|
| sprintId | comp-<slug> |
| GitHub Issue | #… |
| baseBranch | techies68 |
| teams | alpha, beta, gamma |
| LGTM Product | … |
| LGTM Vesnin | … |

## Problem
…

## Constraints
- …

## Definition of Done (одинаков для всех команд)
- [ ] …

## Out of scope
- …

## Demo script (единый для consilium)
1. …
2. …

## Evaluation hints (для жюри)
- …

## Timeline
| Phase | Target date |
|-------|-------------|
| 1 | |
| 2α | |
| 2β | |
| 3–4 | |
| 5 | |
```

---

## Связанные документы

| Документ | Роль |
|----------|------|
| [`VIRTUAL_TEAM_PROMPT.md`](./VIRTUAL_TEAM_PROMPT.md) | Роли жюри, формат consilium |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Gate Phase 1 |
| [`DESIGN.md`](./DESIGN.md) | Критерий C4 |
| [`TASK_CLOSURE_REGULATION.md`](./prompts/TASK_CLOSURE_REGULATION.md) | Закрытие после merge |
| [`device-board-usercases-consilium-2026-06-21.md`](./discussions/device-board-usercases-consilium-2026-06-21.md) | Пример consilium (не competition) |

---

## Версия

- **v1.0** (2026-06-21) — первый регламент Competition Sprint; согласован с ритмом Night Build / Hackathon.

Изменения — PR с LGTM Vesnin.
