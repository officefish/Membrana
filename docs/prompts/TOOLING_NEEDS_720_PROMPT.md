# Промпт: tooling needs 20.07 — umbrella

> **Task-промпт (umbrella)** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **L** · `id` = `tooling-needs-720` · Issue: [#720](https://github.com/officefish/Membrana/issues/720).

## Контекст

Umbrella batch tooling-needs 20.07: meeting:audit / task:start / media env / pr:wait + XS-нормы.
Дети: #721–#725. Не путать с #705.

## Промпт целиком

Закрыть детей #721–#725 одним tooling-PR (или атомарными commits в одной ветке).
Канон START обновить на `yarn task:start`. Не раздувать AGENTS фиче-докой.

### Definition of Done

- [x] #721 meeting:audit check4 own-room
- [x] #722 yarn task:start
- [x] #723 media:env:check + media-token
- [x] #724 pr:wait approval + --resume
- [x] #725 XS грабли/нормы в AGENTS + skills
- [x] карточки registry active → archive после merge

### Out of scope

#705 worktree:bootstrap junction→install (follow-up); #683 land-reports.
