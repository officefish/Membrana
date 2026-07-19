---
name: membrana-insight-overview
description: >-
  Read-only overview of every Membrana insight as a clear bullet list with exact D/L/O/V,
  evidence gaps, a first-person personal top-3 and a separate deterministic sprint
  candidate. Use when the user asks to show all insights, what is implemented, what to do
  next, favorites, top-3, insight overview, or the insight queue. Never mutates lifecycle
  state and never infers delivery/outcome from archive/task/PR/mentions.
---

# Membrana insight overview

Read-only. Канон: [`C6_VERDICT.md`](../../../docs/meeting/insight-archive-lifecycle/C6_VERDICT.md).

## Данные

1. Выполнить `yarn insight overview --json` или прочитать pinned BaseContext+EventLog view.
2. Notes, sprintPhase, task archive, branch/PR показывать только как hints/live-work context.
3. Никогда не использовать legacy registry/meta как второй source of truth.

## Обязательный ответ

1. Короткий снимок counts/conflicts.
2. **Все** insights по V-группам `active | archived | unclassified | conflict`.
3. Один компактный пункт на insight:
   `Название / id — смысл; D; L coverage; O coverage; V; gap/next action`.
4. `Мой top-3` — три выбора от первого лица с личной причиной и честной readiness.
5. `Объективный кандидат` — результат machine policy, отдельно от мнения.

Не прятать остальные записи в «и ещё N». Archived не означает delivered/realized.
`None` показывать честно. Personal top-3 не создаёт event и не разрешает старт sprint.

## Top-3

По умолчанию выбирать среди V=`active|unclassified`, D не `rejected`, без Conflict.
Deferred допустим как стратегический личный выбор с явной меткой, но не objective
candidate. Archived включать только по явной просьбе о historical favorites. Readiness
брать только из typed state/relations/live-work checks, не из hints.

## Handoff

- Выбран accepted Mandate → `membrana-insight-to-sprint`.
- Нужно доказать delivery/outcome, изменить V или проверить историю →
  `membrana-insight-lifecycle`.

