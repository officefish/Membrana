# Cowork Sprint — ACTIVE

| Поле | Значение |
|------|----------|
| **status** | `open` — Phase 0 закрыта (brief + open, LGTM владельца 2026-07-24); Phase 1 (Concept) — следующая |
| sprintId | `cowork-strategic-docs-container` |
| Brief | [`docs/cowork-sprint/cowork-strategic-docs-container/COWORK_SPRINT_BRIEF.md`](./cowork-sprint/cowork-strategic-docs-container/COWORK_SPRINT_BRIEF.md) |
| Родитель | шторм [`storm-strategic-docs-container-2026-07-24`](./storm/storm-strategic-docs-container-2026-07-24/REPORT.md) |
| blocks | `canon-data` · `generators-validation` · `engine-renderer` |
| baseBranch / BASE_SHA | `main` / `49858b90` |
| Координатор | Vesnin (Teamlead) |
| integration deadline (fallback) | 2026-07-26 |
| Формат | Cowork Sprint v1.0 — [регламент](./COWORK_SPRINT_REGULATION.md) |

## Фазы

| Фаза | Статус |
|------|--------|
| 0 — Brief + open | закрыта 2026-07-24 (BASE_SHA `49858b90`, LGTM владельца) |
| 1 — Concept (CONCEPT.md + первый EXPECTATIONS.md) | следующая |
| 2 — Isolated build (собственный DoD на стабах) | — |
| 3 — Interface Consilium → INTERFACE_CONTRACT.md | — |
| 4 — Integration (ветка `cowork/cowork-strategic-docs-container/integration`) | — |
| 5 — Merge + RETROSPECTIVE + archive | — |

## Изоляция (памятка)

Чужие ветки и чужие EXPECTATIONS.md не читать; **схема гранулы НЕ пренегосиируется** —
сводится на Интерфейс-консилиуме. Общие корневые (`package.json`, `registry.json`,
реальные README/AGENTS/CLAUDE.md, `apps/panel` общий вход) не трогать — провода на
интеграции. Каждая команда — свой worktree, коммиты поимённо, никогда `git add -A`.

## Команды веток (Phase 1 старт)

```
git branch cowork/cowork-strategic-docs-container/canon-data && git push -u origin cowork/cowork-strategic-docs-container/canon-data
git worktree add ../Membrana-canon-data cowork/cowork-strategic-docs-container/canon-data

git branch cowork/cowork-strategic-docs-container/generators-validation && git push -u origin cowork/cowork-strategic-docs-container/generators-validation
git worktree add ../Membrana-generators-validation cowork/cowork-strategic-docs-container/generators-validation

git branch cowork/cowork-strategic-docs-container/engine-renderer && git push -u origin cowork/cowork-strategic-docs-container/engine-renderer
git worktree add ../Membrana-engine-renderer cowork/cowork-strategic-docs-container/engine-renderer
```

---

Предыдущий спринт `cowork-execution-registry` **архивирован 2026-07-24**: интеграция
отгружена (PR #675 merged 2026-07-19), ACTIVE-флаг застрял на Phase 4 — ретайрен вручную,
долг «Cowork Phase 5 не автозакрывается» на доске мостика. Артефакты:
`docs/cowork-sprint/cowork-execution-registry/`.
