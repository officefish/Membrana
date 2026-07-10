---
name: membrana-usercase-lessons
description: >-
  UserCase lessons journal workflow: read docs/actions/device-board/USERCASE_COMPETITION_LESSONS.md
  BEFORE building/forking/packing any device-board UserCase scenario; log every live-Run
  finding as an L-entry (симптом→корень→фикс→профилактика) DURING debug, not after.
  Use when building a scenario, debugging a Run that «не заработал», running the live-Run
  checklist before owner sign-off, or when user says журнал ошибок, L-запись, недочёты
  сценария. Do NOT use for generic PR review (membrana-code-review) or client log parsing
  mechanics (membrana-client-logs-parsing — this skill decides WHAT to record, that one HOW to read logs).
---

# Membrana UserCase lessons journal

**Журнал:** [`docs/actions/device-board/USERCASE_COMPETITION_LESSONS.md`](../../../docs/actions/device-board/USERCASE_COMPETITION_LESSONS.md) — живой дневник недочётов сценариев борда (L1–L28+).

**Формат владельца** (действует с первого соревнования): ни один сценарий трёх соревнований
не заработал сразу — журнал накапливает симптомы, корни и фиксы, чтобы каждый следующий
мастер-агент не наступал на пройденное. Правило чтения — hard rule мастер-промпта
[`COMPETITION_SPRINT_REGULATION.md`](../../../docs/COMPETITION_SPRINT_REGULATION.md).

## When to use

- **Перед** сборкой / fork / programmatic pack любого UserCase-сценария (обязательное чтение).
- **Во время** отладки живого Run: сценарий «не заработал» / упал / молчит.
- Перед sign-off владельца: чеклист live Run из журнала.
- Пользователь: «журнал ошибок», «недочёты сценария», «L-запись», «почему сценарий не работает».

## When NOT to use

- Механика чтения логов (`yarn logs:parse`, gate-true, chain-trace) → `membrana-client-logs-parsing`.
- Ревью кода PR → `membrana-code-review`.
- Регламент самого соревнования → `COMPETITION_SPRINT_REGULATION.md`.

## Workflow

### 1. Перед сборкой сценария (мастер-агент)

1. Прочитай журнал ЦЕЛИКОМ (L-записи + оба чеклиста).
2. Пройди чекбоксы «Профилактика» релевантных L: collapse → L1–L12; async/pack → L18–L23;
   basn-узлы (fusion/ensemble/proximity/combined-report) → L24–L28.
3. В CONCEPT/PR сошлись на конкретные L, которые учёл.

### 2. Во время отладки живого Run

1. Находка = **сразу** L-запись (не в конце сессии): следующий номер, формат ниже.
2. Собери симптом с фактами: runId (trace-панель / `yarn logs:parse`), выдержка лога.
3. Фикс — по регламенту задач (S/M; семантика рантайма → консилиум-гейт).
4. После фикса допиши «Fix (#PR)» и «Профилактика» (unit-чекбоксы отмечай по факту).

### 3. Формат L-записи (канон)

```markdown
### L<N> — <однострочная суть>

**Симптом (<контекст>, runId `<id>`, <дата>):**
```text
<выдержка лога / ошибки>
```
**Что:** <корневая причина — механизм, не пересказ симптома>
**Fix (#PR):** <что изменено и где>
**Профилактика:**
- [ ] <unit/чеклист-пункт, предотвращающий повтор>
```

### 4. Live Run чеклист (перед sign-off владельца)

Использовать раздел «Чеклист live Run» журнала; новые пункты добавлять туда же.

## Инварианты

- Журнал append-only по смыслу: L-записи не переписываются, только дополняются fix/профилактикой.
- Каждая находка живого Run обязана стать L-записью — даже если фикс тривиален.
- Обновлять шапку журнала при закрытии каждого спринта (статус + диапазон новых L).
