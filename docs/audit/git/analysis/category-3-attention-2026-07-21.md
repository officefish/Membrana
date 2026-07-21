# Category 3 — attention tiers (Baseline / sync-якоря)

## Meta

| Field | Value |
| --- | --- |
| Date | 2026-07-21 |
| Category | 3 — Baseline / sync-якоря |
| Registry source | `docs/audit/git/registry/BRANCHES_DECOMPOSE_LIST.md` |
| Base | origin/main |
| Base SHA | `b03880c74f72c8aaf879ec2c3620cdc9f56e55e6` |
| Method | members from registry only (no ad-hoc rediscovery); churn via `git diff --shortstat origin/main...BRANCH` |
| Thresholds | A1: churn≥2000 OR (files≥40 AND churn≥800); A2: churn≥200 OR files≥10 (below A1); A3: churn>0 OR ahead>0 below A2; A4: churn==0 AND ahead==0 |
| Cache (optional) | `docs/audit/git/cache/cat3-churn-2026-07-21.json` (gitignored) |

## Summary by tier

| Tier | Count | Meaning |
| --- | --- | --- |
| A1 | 0 | Крупный уникальный diff vs main — высокий приоритет внимания |
| A2 | 0 | Умеренный уникальный diff — глянуть перед clean |
| A3 | 0 | Малый уникальный tip — беглый взгляд |
| A4 | 5 | Нет уникальных коммитов/diff vs main (якоря без tip ahead) |
| **Total** | **5** | Совпадает с registry cat.3 |

## A1 — high attention

_пусто_

## A2 — moderate attention

_пусто_

## A3 — low attention

_пусто_

## A4 — no unique tip vs main

| Branch | Ahead | Behind | Files | Churn | Note |
| --- | --- | --- | --- | --- | --- |
| base/codex | 0 | 20 | 0 | 0 | base/* sync anchor |
| base/cursor | 0 | 20 | 0 | 0 | base/* sync anchor |
| base/product | 0 | 20 | 0 | 0 | base/* sync anchor |
| base/tooling | 0 | 20 | 0 | 0 | base/* sync anchor |
| main | 0 | 0 | 0 | 0 | main baseline |

## Recommendations (no execute)

1. **Все 5 — keep as anchors.** Категория 3 по определению: `main` и `base/*` — якоря синхронизации. Не кандидаты в `repo:clean`, даже dry-run narrative «снеси» здесь неуместен.
2. **`base/*` behind=20:** локальные sync-якоря отстают от `origin/main` на 20 коммитов; уникального tip нет (ahead=0, churn=0). При необходимости обновить якоря — осознанный merge/reset от `origin/main` по регламенту worktree/base sync (не часть Scenario B delete-пути).
3. **`main`:** sync с `origin/main` (ahead=0, behind=0) — ожидаемо для локального baseline.
4. Тиры A1–A4 — эвристика внимания, не приговор на удаление. Для cat.3 вердикт внимания: **нулевой уникальный код-объём** — фокус гигиены на других категориях (5/6/7).
