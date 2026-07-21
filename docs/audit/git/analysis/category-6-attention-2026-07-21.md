# Category 6 — attention tiers (Застой / zombie)

## Meta

| Field | Value |
| --- | --- |
| Date | 2026-07-21 |
| Category | 6 — Застой / zombie |
| Registry source | `docs/audit/git/registry/BRANCHES_DECOMPOSE_LIST.md` (= `BRANCHES_DECOMPOSE_LIST-2026-07-21.md`) |
| Base | origin/main |
| Base SHA | `b03880c74f72c8aaf879ec2c3620cdc9f56e55e6` |
| Method | members from registry only; churn via `git diff --shortstat origin/main...BRANCH` |
| Thresholds | A1: churn≥2000 OR (files≥40 AND churn≥800); A2: churn≥200 OR files≥10; A3: churn>0 or ahead>0 below A2; A4: churn==0 AND ahead==0 |

## Summary by tier

| Tier | Count | Meaning |
| --- | --- | --- |
| A1 | 0 | Large unique diff vs main — high attention |
| A2 | 2 | Moderate unique diff — review before clean |
| A3 | 0 | Small unique tip — glance |
| A4 | 11 | No unique commits/diff vs main (typical ahead==0 zombie) |
| **Total** | **13** | Matches registry cat.6 |

## A1 — high attention

_пусто_

## A2 — moderate attention

| Branch | Ahead | Behind | Files | Churn | Note |
| --- | --- | --- | --- | --- | --- |
| origin/claude/night-triage-1784590210419 | 1 | 16 | 1 | 323 | remote night-triage/claude without open PR |
| origin/claude/night-triage-1784503809283 | 1 | 55 | 1 | 317 | remote night-triage/claude without open PR |

## A3 — low attention

_пусто_

## A4 — no unique tip vs main

| Branch | Ahead | Behind | Files | Churn | Note |
| --- | --- | --- | --- | --- | --- |
| feat/panel-live-deploy | 0 | 311 | 0 | 0 | ahead==0 behind-only |
| verify-main | 0 | 264 | 0 | 0 | ahead==0 behind-only |
| verify-main-2 | 0 | 260 | 0 | 0 | ahead==0 behind-only |
| verify-final | 0 | 257 | 0 | 0 | ahead==0 behind-only |
| main-check | 0 | 255 | 0 | 0 | ahead==0 behind-only |
| tmp-probe | 0 | 231 | 0 | 0 | ahead==0 behind-only |
| work/scratch | 0 | 225 | 0 | 0 | ahead==0 behind-only |
| feat/evening-audit-generator | 0 | 142 | 0 | 0 | ahead==0 behind-only |
| grok/worktree | 0 | 80 | 0 | 0 | ahead==0 behind-only |
| fix/repo-clean-root-scratch | 0 | 17 | 0 | 0 | ahead==0 behind-only |
| post-merge-check | 0 | 9 | 0 | 0 | ahead==0 behind-only |

## Recommendations (no execute)

1. **A4 (11):** типичные кандидаты на `yarn repo:clean` **dry-run** (ahead==0). Не `--execute` без ok владельца. Проверить, что ветка не нужна как локальная метка.
2. **A2 (2 remote night-triage):** есть 1 уникальный коммит и ~320 churn — перед remote-clean глянуть diff; возможно уже покрыто triage-отчётами в `docs/reports/night-triage/`.
3. Не смешивать с cat.7 Salvage — там ahead>0 и другой сценарий спасения коммитов.
4. Персон и worktree-активных в этом файле нет (другие категории реестра).
