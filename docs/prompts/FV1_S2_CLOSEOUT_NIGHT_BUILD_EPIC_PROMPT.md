# Night Build epic — fv1-S2 closeout & registry reconciliation

**Epic:** `fv1-s2-closeout`
**Sprint kind:** night-build
**Lead:** Vesnin (Teamlead) · **Support:** Ozhegov (structurer)
**Base branch:** `main` (см. отклонение ниже)
**Дата:** 2026-07-01

> Автономный ночной closeout «хвоста» fv1-S2: реестр и worktree не соответствуют
> фактам. Контент S2 давно смержен (PR #217), архивная карточка создана (#218),
> но `status` в реестре не переключён; эпик `free-v1-sound-catalog` (#205, CLOSED)
> всё ещё `active`, хотя все три спринта завершены; в worktree `fv1-s2-publish`
> висит заброшенный `review_pending` манифест.

## Отклонение от регламента (осознанное)

Регламент `NIGHT_SPRINT_REGULATION.md` требует базу `techies68`. **Здесь база — `main`.**
Причина: `techies68` отстал от `main` на 7 коммитов (0 впереди), не содержит S3-архив
и актуальный `registry.json` (расхождение +375/−177). Closeout правит реестр, который
обязан базироваться на текущем main; ветка от устаревшего techies68 откатила бы S3-архив
и породила конфликты. Зафиксировано в HANDOFF.

## In scope (только эти фазы)

| Фаза | Lead | Действие | Evidence |
|------|------|----------|----------|
| **NB0 Gate** | Vesnin | baseline: чистое дерево, `test:scripts` green, реестр валиден | checkpoint |
| **NB1 S2 registry reconcile** | Ozhegov | `fv1-s2-content` → `archived` (карточка `docs/tasks/archive/fv1-s2-content.md` уже есть от #218); archivedAt/notes проставить | registry diff |
| **NB2 Epic archive** | Vesnin | `free-v1-sound-catalog` → `archived` (все дети done, #205 CLOSED) | registry diff |
| **NB3 Worktree cleanup** | Ozhegov | удалить устаревший worktree `fv1-s2-publish` (уникальный контент — заброшенный `review_pending` манифест, замещён #218) | `git worktree list` |

## Out of scope (запрещено этой ночью)

- prod deploy / prod smoke;
- изменения `@membrana/core` / `MembranaRegistry` / детекторной логики;
- новые фичи, новый triage Issue;
- `yarn task:close-github` (#205 уже CLOSED — трогать GitHub не нужно);
- финализация заброшенного S2 `review_pending` манифеста (он замещён ручным bookkeeping #218 — **не** воскрешаем, worktree удаляем целиком).

## Stop rules

- 2 подряд падения `test:scripts` / валидации реестра → стоп, HANDOFF с блокером.
- Любой конфликт в `registry.json` вне записей S2/эпика → стоп (значит база неверна).

## Definition of Done

- [ ] `fv1-s2-content` и `free-v1-sound-catalog` → `archived` в реестре, консистентно с карточками.
- [ ] worktree `fv1-s2-publish` удалён, `git worktree prune` чист.
- [ ] `test:scripts` green на конец ночи.
- [ ] `HANDOFF.md` в архиве; `NIGHT_BUILD_ACTIVE` closed.
- [ ] Утренний LGTM Vesnin на merge night-ветки.
