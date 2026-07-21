# Заседание `worktree-hygiene-gaps` — объединяющее задание

**Заведено:** 2026-07-20 · **Председатель:** Claude (сессия `truth/session-crystallization-19-07`)
· **Backlink:** `insight-tier2-worktree-topology`

## Материя

Консилиум `tier2-git-hygiene-multi-agent` (2026-07-20,
[`docs/seanses/tier2-git-hygiene-multi-agent-2026-07-20.md`](../../seanses/tier2-git-hygiene-multi-agent-2026-07-20.md))
ратифицировал **несущую git-гигиену** для четырёх агентов (2× Claude, Codex, Grok) на
одной машине с одним проектом. Из восьми пронумерованных точек он закрыл шесть, но
**две уронил** — их и разбирает это заседание.

Оба вопроса — **операционные, поверх уже принятого ядра**. Ядро в спор не выносится.

## Ратифицированное ядро (посылки, НЕ предмет спора)

- worktree = изоляция процесса (свой index/HEAD/node_modules); базовая ветка = изоляция истории.
- Разные базовые ветки на деревьях → git даёт mandatory-lock (одну ветку нельзя вычекать дважды).
- Базовая ветка дерева — **держатель позиции, не место работы**; спринт всегда в task-ветку → squash-PR в `main`.
- `gc.auto=0` глобально; ручной `gc` только из `main`, когда никто не пишет.
- Раздельные `node_modules`/`dist`/`.env`; общее только `.git/objects` и turbo-cache (content-addressed).
- `WORKTREE.md` в каждом корне + advisory `.worktree-owner`; инвариант `|writers(worktree)| ≤ 1`.
- Топология (черновик владельца, нормализованная): `main` (ритуалы/штормы), `tooling` (scripts/docs/CI),
  `product` (apps/packages), саппорт-контуры `codex`/`cursor` (привязка к агенту — временная).

## Два уронённых вопроса (каждый — своё заседание)

- **K1 (точка 6):** синхронизация базовых веток деревьев с `main` — частота, ответственный, автоматизация.
- **K2 (точка 7):** lifecycle дерева — bootstrap и **teardown**, гейт «нет хвостов» (на 20.07 накопилось 30+ деревьев), кто и когда вычищает.

## Фактура (не домысливать сверх неё)

- На 20.07 `git worktree list` — 30+ деревьев: per-задача, per-cowork-блок, per-night, детач-хеды.
- Пришло из #711: `scripts/worktree-bootstrap.mjs` + `scripts/lib/worktree-bootstrap.mjs` (bootstrap уже есть; teardown — нет).
- Правило параллельных сессий: `.claude/CLAUDE.md` § Parallel sessions, `.cursor/skills/membrana-worktree/SKILL.md`.
- Канон веток: спринт → task-ветка → squash-PR в `main` (TASKS_MANAGEMENT §7а).

## Границы заседания

- Не пересматривать ратифицированное ядро консилиума — это посылки.
- Не проектировать форму «токена правды» / вёрстку вердиктов в эпик (эпик `truth-graph-contour`).
- Аудитор ≠ председатель (S-M5): процедуру проверяет `yarn meeting:audit --id worktree-hygiene-gaps` и/или отдельный агент.
