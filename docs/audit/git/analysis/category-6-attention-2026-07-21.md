# Category 6 — attention tiers (Застой / zombie)

## Meta

| Field | Value |
| --- | --- |
| Date | 2026-07-21 |
| Category | 6 — Застой / zombie |
| Registry source | `docs/audit/git/registry/BRANCHES_DECOMPOSE_LIST.md` |
| Base | origin/main |
| Base SHA | `ad474e688417722792a92cee05a1b1f22b7cd4ad` |
| Method | members from registry only (no ad-hoc rediscovery); churn via `git diff --shortstat origin/main...BRANCH` |
| Thresholds | A1: churn≥2000 OR (files≥40 AND churn≥800); A2: churn≥200 OR files≥10 (below A1); A3: churn>0 OR ahead>0 below A2; A4: churn==0 AND ahead==0 |
| Cache (optional) | `docs/audit/git/cache/cat6-churn-2026-07-21.json` (gitignored) |
| Note | Registry refreshed (Scenario A) before this pass — prior snapshot base `b03880c…` was stale vs post-#760 `origin/main` |

## Summary by tier

| Tier | Count | Meaning |
| --- | --- | --- |
| A1 | 0 | Крупный уникальный diff vs main — высокий приоритет внимания |
| A2 | 2 | Умеренный уникальный diff — глянуть перед clean |
| A3 | 0 | Малый уникальный tip — беглый взгляд |
| A4 | 11 | Нет уникальных коммитов/diff vs main (типичный ahead==0 zombie) |
| **Total** | **13** | Совпадает с registry cat.6 |

## A1 — high attention

_пусто_

## A2 — moderate attention

| Branch | Ahead | Behind | Files | Churn | Note |
| --- | --- | --- | --- | --- | --- |
| origin/claude/night-triage-1784590210419 | 1 | 18 | 1 | 323 | remote night-triage/claude without open PR |
| origin/claude/night-triage-1784503809283 | 1 | 57 | 1 | 317 | remote night-triage/claude without open PR |

## A3 — low attention

_пусто_

## A4 — no unique tip vs main

| Branch | Ahead | Behind | Files | Churn | Note |
| --- | --- | --- | --- | --- | --- |
| feat/panel-live-deploy | 0 | 313 | 0 | 0 | ahead==0 behind-only |
| verify-main | 0 | 266 | 0 | 0 | ahead==0 behind-only |
| verify-main-2 | 0 | 262 | 0 | 0 | ahead==0 behind-only |
| verify-final | 0 | 259 | 0 | 0 | ahead==0 behind-only |
| main-check | 0 | 257 | 0 | 0 | ahead==0 behind-only |
| tmp-probe | 0 | 233 | 0 | 0 | ahead==0 behind-only |
| work/scratch | 0 | 227 | 0 | 0 | ahead==0 behind-only |
| feat/evening-audit-generator | 0 | 144 | 0 | 0 | ahead==0 behind-only |
| grok/worktree | 0 | 82 | 0 | 0 | ahead==0 behind-only |
| fix/repo-clean-root-scratch | 0 | 19 | 0 | 0 | ahead==0 behind-only |
| post-merge-check | 0 | 11 | 0 | 0 | ahead==0 behind-only |

## Recommendations (no execute)

1. **A4 (11):** типичные кандидаты на `yarn repo:clean` **dry-run** (ahead==0, churn=0). Не `--execute` без ok владельца. Убедиться, что ветка не нужна как локальная метка.
2. **A2 (2 remote night-triage):** по 1 уникальному коммиту и ~320 churn (отчёты) — перед remote-clean глянуть diff; возможно уже покрыто triage-отчётами в `docs/reports/night-triage/`.
3. Не смешивать с cat.7 Salvage — там ahead>0 и другой сценарий спасения коммитов.
4. Персон и worktree-активных в этом файле нет (другие категории реестра).
5. Тиры A1–A4 — эвристика внимания, не приговор на удаление.
