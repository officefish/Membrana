# Опись веток без копии на сервере — 2026-09-17

Сессия Г, подкрепление магистрали `worktree-sanitation-day2`. Задание: [`docs/prompts/SESSION_G_ORPHAN_BRANCHES_2026-09-17.md`](../prompts/SESSION_G_ORPHAN_BRANCHES_2026-09-17.md).

Ствол на момент замера: `af77ed93` (origin/main, 2026-09-17 15:08). Ничего не удалялось: задание — спасение и опись.

## Откуда 103

Сухой прогон `yarn repo:clean` утром 17.09 дал «103 · нет PR и нет на origin». Пересчёт по серверу (`git ls-remote --heads`, 163 головы) и по **всем** PR (1686 штук, `gh pr list --state all --limit 5000`) раскладывает эти 103 так:

| Группа | Штук | Что это |
|---|---:|---|
| A. PR есть, но старше окна прибора | 55 | `repo-clean.mjs` читает `gh pr list --limit 500`; 500-й PR — #1728. Ветки с PR #1091…#1604 прибор считает «без PR». Все 55 — MERGED. |
| B. PR нет, на сервере нет, коммиты есть | 48 | настоящие сироты — единственная копия на этой машине |

Из группы A у 54 веток вершина ветки **равна голове влитого PR** — всё содержимое ушло в ствол squash-мерджем, ветка пуста по смыслу. Одна (`chore/archive-tw-v1-v2`) несёт 4 коммита сверх головы PR #1091 и разобрана как сирота.

Побочная находка для прибора: лимит 500 PR в `scripts/repo-clean.mjs` делает корзину «нет PR» ложно-широкой (fail-closed, ничего не сносит, но 55 из 103 — не сироты). Отдельно: `git branch -r` прибора и `ls-remote` сервера сегодня совпали (устаревших tracking-ref нет).

## Метод замера

По каждой ветке: `git log origin/main..<ветка>` (уникальные коммиты), `git diff --name-only <merge-base>..<ветка>` (файлы). По каждому файлу — три ступени сравнения со стволом:

1. блоб файла на вершине ветки == блоб в `origin/main` → совпадает;
2. иначе — этот блоб встречается в истории `origin/main` (`git log origin/main --find-object`) → вошёл в ствол другим путём, потом перезаписан;
3. иначе — доля добавленных веткой строк, присутствующих в текущем файле ствола. ≥90% — считается вошедшим.

Корзины: **пусто** — ни одного файла с уникальным содержимым; **ценное** — есть код вне ствола, либо документы вне ствола объёмом от 40 строк; **неясно** — уникальны лишь строки лент/журналов или мелкие расхождения в документах. Ценное и неясное отправлено на сервер (спасение обратимо и дёшево, потеря — нет).

Итог: пусто — 85 · ценное — 13 · неясно — 5 · всего 103.

## Таблица

| Ветка | Последний коммит | Уникальных коммитов | Области | Корзина | Куда спасено |
|---|---|---:|---|---|---|
| `angelina/docs/meeting-tariff-single-truth-20260908` | 2026-09-12 | 10 | `docs`, `docs/archive`, `docs/evidence`, `docs/meeting` +6 | ценное | `rescue/angelina/docs/meeting-tariff-single-truth-20260908-20260917` |
| `angelina/work/2026-08-01-f` | 2026-08-01 | 4 | `docs/discussions`, `docs/procedure-runs`, `docs/prompts`, `docs/sprint` +4 | ценное | `rescue/angelina/work/2026-08-01-f-20260917` |
| `chore/cowork-library-open-api-phase0` | 2026-09-02 | 2 | `docs`, `docs/cowork-sprint`, `docs/discussions`, `docs/tasks` +1 | ценное | `rescue/chore/cowork-library-open-api-phase0-20260917` |
| `codex/fv1-s2-content` | 2026-06-30 | 8 | `.claude`, `.claude/skills`, `.cursor/skills`, `AGENTS.md` +14 | ценное | `rescue/codex/fv1-s2-content-20260917` |
| `codex/procedure-runs-delivery-amended-save` | 2026-08-01 | 1 | `.agents/skills`, `.claude/skills`, `.cursor/skills`, `.opencode/skills` +14 | ценное | `rescue/codex/procedure-runs-delivery-amended-save-20260917` |
| `codex/task-archive-migration-sprint` | 2026-06-30 | 9 | `.claude/skills`, `docs`, `docs/insights`, `docs/prompts` +7 | ценное | `rescue/codex/task-archive-migration-sprint-20260917` |
| `comp/comp-detection-alarm-2026-07-10/alpha` | 2026-07-10 | 5 | `docs/competition-sprint`, `packages/device-board` | ценное | `rescue/comp/comp-detection-alarm-2026-07-10/alpha-20260917` |
| `comp/comp-detection-alarm-2026-07-10/gamma` | 2026-07-10 | 5 | `docs/competition-sprint`, `packages/device-board` | ценное | `rescue/comp/comp-detection-alarm-2026-07-10/gamma-20260917` |
| `feat/buffer-manager-journal` | 2026-08-27 | 2 | `apps/cabinet`, `packages/plugin-handlers`, `packages/services` | ценное | `rescue/feat/buffer-manager-journal-20260917` |
| `feat/journal-twenty-plugin` | 2026-08-21 | 4 | `docs/discussions`, `docs/meeting`, `docs/procedure-runs`, `docs/prompts` +9 | ценное | `rescue/feat/journal-twenty-plugin-20260917` |
| `fix/exhaustive-deps-error` | 2026-08-30 | 1 | `.eslintrc.cjs`, `apps/cabinet`, `apps/client` | ценное | `rescue/fix/exhaustive-deps-error-20260917` |
| `night/graphify-public-graph-2026-07-15` | 2026-07-15 | 1 | `.gitignore`, `.graphifyignore`, `docs`, `docs/archive` | ценное | `rescue/night/graphify-public-graph-2026-07-15-20260917` |
| `pr1410-head` | 2026-07-28 | 5 | `docs`, `docs/archive`, `docs/bridge`, `docs/comms` +8 | ценное | `rescue/pr1410-head-20260917` |
| `backup/mfcc-rebased-3107` | 2026-07-31 | 16 | `apps/client`, `data/detectors-benchmark`, `docs`, `docs/archive` +16 | неясно | `rescue/backup/mfcc-rebased-3107-20260917` |
| `chore/day-2026-08-15-product` | 2026-08-15 | 2 | `docs`, `docs/procedure-runs`, `docs/security`, `docs/tasks` | неясно | `rescue/chore/day-2026-08-15-product-20260917` |
| `feat/results-bridge` | 2026-08-19 | 3 | `docs/discussions`, `docs/local-sprint`, `docs/plugins`, `docs/procedure-runs` +6 | неясно | `rescue/feat/results-bridge-20260917` |
| `tmp-keep-2107` | 2026-08-24 | 4 | `.claude`, `docs/network`, `scripts/lib`, `scripts` | неясно | `rescue/tmp-keep-2107-20260917` |
| `wip/ritual-31-08` | 2026-08-31 | 5 | `docs`, `docs/archive`, `docs/comms`, `docs/evidence` +8 | неясно | `rescue/wip/ritual-31-08-20260917` |
| `angelina/chore/evening-evidence-3107` | 2026-08-01 | 1 | — | пусто | — |
| `angelina/chore/ritual-day-20260829` | 2026-08-29 | 1 | `docs`, `docs/archive`, `docs/comms`, `docs/procedure-runs` +5 | пусто | — |
| `angelina/chore/ritual-evening-20260731` | 2026-07-31 | 1 | — | пусто | — |
| `angelina/chore/swallow-day-20260801` | 2026-08-01 | 1 | — | пусто | — |
| `angelina/docs/handoff-20260801` | 2026-07-31 | 1 | — | пусто | — |
| `angelina/docs/handoff-containers` | 2026-07-31 | 1 | — | пусто | — |
| `angelina/docs/handoff-neighbours` | 2026-07-31 | 1 | — | пусто | — |
| `angelina/docs/handoff-start` | 2026-07-31 | 1 | — | пусто | — |
| `angelina/ritual/day-2026-08-01` | 2026-08-01 | 2 | — | пусто | — |
| `angelina/work/2026-08-01-b` | 2026-08-01 | 1 | — | пусто | — |
| `angelina/work/2026-08-01-c` | 2026-08-01 | 1 | — | пусто | — |
| `angelina/work/2026-08-08-evening` | 2026-08-08 | 1 | `docs/archive`, `docs/seanses` | пусто | — |
| `angelina/work/2026-08-09-morning` | 2026-08-09 | 4 | `docs/procedure-runs` | пусто | — |
| `backup-rebased-1769` | 2026-08-07 | 3 | `docs/archive`, `docs/bridge`, `docs/discussions` | пусто | — |
| `build/studio-20260824` | 2026-08-24 | 1 | `docs/archive`, `docs/seanses` | пусто | — |
| `chore/archive-tw-v1-v2` | 2026-07-24 | 4 (PR #1091 MERGED + 4 коммита сверх) | `docs/meeting`, `docs/seanses`, `scripts`, `scripts/lib` | пусто | — |
| `chore/day-2026-07-31` | 2026-07-31 | 14 | — | пусто | — |
| `chore/day-2026-08-14` | 2026-08-14 | 2 | `docs/procedure-runs` | пусто | — |
| `chore/evening-2026-08-15` | 2026-08-15 | 1 | `docs/archive`, `docs/seanses` | пусто | — |
| `chore/evening-2026-08-16` | 2026-08-16 | 1 | `docs/archive`, `docs/seanses` | пусто | — |
| `chore/evening-2026-08-18` | 2026-08-18 | 1 | `docs/archive`, `docs/seanses` | пусто | — |
| `chore/register-llm-transport-card-2026-07-31` | 2026-07-31 | 1 | `docs/prompts`, `docs/tasks` | пусто | — |
| `chore/ritual-trail-20260824` | 2026-08-24 | 4 | `docs/procedure-runs` | пусто | — |
| `codex/development-matrix-delivery` | 2026-08-01 | 1 | — | пусто | — |
| `codex/evening-ritual-door` | 2026-07-30 | 4 | — | пусто | — |
| `codex/fix-insight-overview-empty` | 2026-07-30 | 1 | — | пусто | — |
| `codex/fix-task-archive-provenance` | 2026-07-31 | 1 | — | пусто | — |
| `codex/handoff-liveness-pr-carriers` | 2026-07-30 | 1 | — | пусто | — |
| `codex/meeting-task-archive-cold-store` | 2026-07-31 | 2 | — | пусто | — |
| `codex/office-task-archive-deploy-wiring` | 2026-07-30 | 1 | — | пусто | — |
| `codex/procedure-portfolio-delivery` | 2026-08-01 | 3 | — | пусто | — |
| `codex/procedure-runs-delivery` | 2026-08-01 | 7 | — | пусто | — |
| `codex/recreate-pr-1508` | 2026-07-31 | 1 | — | пусто | — |
| `codex/task-archive-cold-store-implementation` | 2026-07-30 | 2 | — | пусто | — |
| `codex/worktree-demolition-frames` | 2026-07-30 | 2 | — | пусто | — |
| `cowork/cowork-honest-sprint/integration` | 2026-07-30 | 29 | — | пусто | — |
| `cowork/honest-sprint-close` | 2026-07-30 | 1 | — | пусто | — |
| `cowork/honest-sprint-open` | 2026-07-30 | 4 | — | пусто | — |
| `cowork/honest-sprint-phase1` | 2026-07-30 | 6 | — | пусто | — |
| `cowork/honest-sprint-phase2-close` | 2026-07-30 | 9 | — | пусто | — |
| `docs/insight-agenda-extract` | 2026-08-01 | 1 | — | пусто | — |
| `docs/meeting-m4-audit` | 2026-08-01 | 2 | — | пусто | — |
| `docs/meeting-m4s` | 2026-08-01 | 3 | — | пусто | — |
| `docs/meeting-m4x` | 2026-08-01 | 1 | — | пусто | — |
| `docs/meeting-m6-epic` | 2026-08-01 | 1 | — | пусто | — |
| `docs/precedent-orphan-diagnosis-2026-07-31-b` | 2026-07-31 | 1 | — | пусто | — |
| `evening/20260825` | 2026-08-25 | 1 | `docs/archive`, `docs/seanses` | пусто | — |
| `evening/20260826` | 2026-08-26 | 1 | `docs/archive`, `docs/seanses` | пусто | — |
| `evening/20260827` | 2026-08-27 | 1 | `docs/archive`, `docs/seanses` | пусто | — |
| `feat/atlas-guide-2026-07-31` | 2026-07-31 | 8 | — | пусто | — |
| `feat/cut-act-trace` | 2026-08-01 | 5 | — | пусто | — |
| `feat/experience-seam-2026-07-31` | 2026-07-31 | 3 | — | пусто | — |
| `feat/invariant-tooth-2026-07-31` | 2026-07-31 | 3 | — | пусто | — |
| `feat/kit-frame-boundary-2026-07-31` | 2026-07-31 | 2 | — | пусто | — |
| `feat/meeting-gates-teeth` | 2026-08-01 | 2 | — | пусто | — |
| `feat/membrana-leveling-adopt` | 2026-07-25 | 1 | — | пусто | — |
| `feat/mfcc-analyzer-to-main` | 2026-08-01 | 16 | — | пусто | — |
| `feat/norm-in-agents-2026-07-31` | 2026-07-31 | 5 | — | пусто | — |
| `feat/session-floor-2026-07-31` | 2026-07-31 | 4 | — | пусто | — |
| `fix/protocol-body-tail-echo-2026-07-31` | 2026-07-31 | 8 | — | пусто | — |
| `fix/review-verdict-over-truncated-diff` | 2026-07-31 | 1 | — | пусто | — |
| `fix/twins-readonly-and-repo-2249` | 2026-09-01 | 3 | `apps/cabinet`, `apps/client`, `docs/archive`, `docs/meeting` +6 | пусто | — |
| `morning/20260827` | 2026-08-27 | 2 | `docs/procedure-runs` | пусто | — |
| `ozhegov/tooling/dead-wire-catalogs` | 2026-08-01 | 2 | — | пусто | — |
| `ozhegov/tooling/weekly-dead-wire-audit` | 2026-08-01 | 4 | — | пусто | — |
| `pr1613-refresh` | 2026-08-06 | 9 | `apps/docs-harness`, `docs/discussions`, `docs/local-sprint`, `docs/procedure-runs` +9 | пусто | — |
| `pr2232-merge` | 2026-08-29 | 5 | `apps/cabinet`, `apps/client`, `docs/field`, `docs/procedure-runs` +1 | пусто | — |
| `pr2255` | 2026-09-01 | 3 | `apps/cabinet`, `apps/client`, `packages/services` | пусто | — |
| `pr2267` | 2026-09-03 | 13 | `docs`, `docs/cowork-sprint`, `docs/discussions`, `docs/tasks` +3 | пусто | — |
| `pr2276` | 2026-09-03 | 20 | `apps/cabinet`, `packages/background-media` | пусто | — |
| `ritual/day-2026-07-30` | 2026-07-30 | 1 | — | пусто | — |
| `ritual/day-2026-08-16` | 2026-08-16 | 1 | `docs/procedure-runs` | пусто | — |
| `ritual/day-2026-08-17-r2` | 2026-08-17 | 1 | `docs/procedure-runs` | пусто | — |
| `ritual/day-2026-08-18` | 2026-08-18 | 1 | `docs/procedure-runs` | пусто | — |
| `ritual/day-2026-08-19` | 2026-08-19 | 1 | `docs/procedure-runs` | пусто | — |
| `ritual/day-2026-08-20` | 2026-08-20 | 4 | `.gitignore`, `docs/discussions`, `docs/procedure-runs` | пусто | — |
| `ritual/day-2026-08-22` | 2026-08-22 | 1 | `docs/procedure-runs` | пусто | — |
| `ritual/evening-2026-07-29` | 2026-07-29 | 1 | `docs/archive`, `docs/bridge`, `docs/seanses` | пусто | — |
| `storm/mfcc-sprint-test-3007` | 2026-07-30 | 15 | — | пусто | — |
| `tariff-2281-merged` | 2026-09-04 | 2 | `apps/cabinet`, `packages/background-cabinet`, `packages/background-media` | пусто | — |
| `tooling/forecast-archive-wire` | 2026-08-01 | 5 | — | пусто | — |
| `tooling/mfcc-sample-rate` | 2026-08-01 | 1 | — | пусто | — |
| `tooling/tasks-readme-sync-0108` | 2026-08-01 | 1 | — | пусто | — |
| `verify-head` | 2026-08-28 | 1 | `docs/archive`, `docs/seanses` | пусто | — |
| `worktree-agent-ae43a2ec288ea290c` | 2026-07-29 | 2 | — | пусто | — |

## Ценное — что именно вне ствола

- `angelina/docs/meeting-tariff-single-truth-20260908` — документы вне ствола (+2513 строк): docs/DAILY_AUDIT.md, docs/archive/daily-day/2026-09-08/DAILY_STANDUP.md, docs/archive/daily-day/2026-09-08/DAY_PLAN.md (+29).
  - `docs/DAILY_AUDIT.md` — отличается, добавлено 13 строк, в стволе 0%
  - `docs/archive/daily-day/2026-09-08/DAILY_STANDUP.md` — в стволе нет, добавлено 35 строк, в стволе 0%
  - `docs/archive/daily-day/2026-09-08/DAY_PLAN.md` — в стволе нет, добавлено 41 строк, в стволе 0%
  - `docs/archive/daily-day/2026-09-08/MAIN_DAY_ISSUE.md` — в стволе нет, добавлено 102 строк, в стволе 0%
  - `docs/archive/daily-day/2026-09-08/STRATEGIC_PLAN_DAY.md` — в стволе нет, добавлено 99 строк, в стволе 0%
  - `docs/archive/daily-day/2026-09-08/STRATEGY_DAY.md` — в стволе нет, добавлено 98 строк, в стволе 0%
  - `docs/archive/daily-day/2026-09-08/manifest.json` — в стволе нет, добавлено 57 строк, в стволе 0%
  - `docs/archive/daily-day/2026-09-12/audit.md` — в стволе нет, добавлено 24 строк, в стволе 0%
  - … ещё 26 файлов
- `angelina/work/2026-08-01-f` — код вне ствола: scripts/sprint-cut-check.mjs.
  - `docs/procedure-runs/trail/2026-08-01.jsonl` — отличается, добавлено 1 строк, в стволе 0%
  - `scripts/sprint-cut-check.mjs` — отличается, добавлено 35 строк, в стволе 37%
- `chore/cowork-library-open-api-phase0` — документы вне ствола (+40 строк): docs/COWORK_SPRINT_ACTIVE.md.
  - `docs/COWORK_SPRINT_ACTIVE.md` — отличается, добавлено 40 строк, в стволе 8%
- `codex/fv1-s2-content` — код вне ствола: packages/core/src/contracts/acoustic-network.ts, packages/core/src/contracts/index.ts, packages/core/src/index.ts, packages/core/src/secret-patterns.ts (+16).
  - `.claude/CLAUDE.md` — отличается, добавлено 21 строк, в стволе 0%
  - `.claude/skills/membrana-night-sprint/SKILL.md` — в стволе нет, добавлено 12 строк, в стволе 0%
  - `.cursor/skills/membrana-task-lifecycle/SKILL.md` — отличается, добавлено 11 строк, в стволе 0%
  - `docs/CURRENT_TASK.md` — отличается, добавлено 13 строк, в стволе 0%
  - `docs/DAY_SPRINT_ACTIVE.md` — отличается, добавлено 8 строк, в стволе 0%
  - `docs/DAY_SPRINT_LOG.md` — отличается, добавлено 22 строк, в стволе 45%
  - `docs/NIGHT_SPRINT_REGULATION.md` — отличается, добавлено 12 строк, в стволе 8%
  - `docs/SESSION_ARCHIVE_REGULATION.md` — в стволе нет, добавлено 53 строк, в стволе 0%
  - … ещё 38 файлов
- `codex/llm-procedure-panel` — код вне ствола: scripts/ask-persona.mjs, scripts/ask-persona.test.mjs, scripts/lib/llm-procedure-defaults.json, scripts/lib/llm-procedures.json (+3).
  - `scripts/ask-persona.mjs` — отличается, добавлено 51 строк, в стволе 10%
  - `scripts/ask-persona.test.mjs` — в стволе нет, добавлено 38 строк, в стволе 0%
  - `scripts/lib/llm-procedure-defaults.json` — отличается, добавлено 9 строк, в стволе 44%
  - `scripts/lib/llm-procedures.json` — отличается, добавлено 8 строк, в стволе 75%
  - `scripts/llm-calls-audit.mjs` — отличается, добавлено 71 строк, в стволе 20%
  - `scripts/llm-calls-audit.test.mjs` — в стволе нет, добавлено 52 строк, в стволе 0%
  - `scripts/llm-procedure-channels.test.mjs` — отличается, добавлено 9 строк, в стволе 11%
- `codex/procedure-runs-delivery-amended-save` — код вне ствола: scripts/procedure-run-journal.mjs.
  - `.claude/skills/membrana-local-sprint/SKILL.md` — отличается, добавлено 34 строк, в стволе 12%
  - `.cursor/skills/membrana-local-sprint/SKILL.md` — отличается, добавлено 23 строк, в стволе 70%
  - `docs/discussions/procedure-run-journal-dynin-review-v2-followup.md` — в стволе нет, добавлено 18 строк, в стволе 0%
  - `docs/discussions/procedure-run-journal-dynin-review-v2.md` — в стволе нет, добавлено 15 строк, в стволе 0%
  - `docs/discussions/procedure-run-journal-dynin-review.md` — в стволе нет, добавлено 17 строк, в стволе 0%
  - `docs/discussions/procedure-run-journal-ozhegov-review.md` — в стволе нет, добавлено 15 строк, в стволе 0%
  - `docs/discussions/procedure-run-journal-vesnin-review-pass.md` — в стволе нет, добавлено 32 строк, в стволе 0%
  - `docs/discussions/procedure-run-journal-vesnin-review.md` — в стволе нет, добавлено 11 строк, в стволе 0%
  - … ещё 5 файлов
- `codex/task-archive-migration-sprint` — код вне ствола: scripts/_main-day-issue.mjs, scripts/archive-task.mjs, scripts/lib/task-registry.mjs, scripts/task-archive-migration.mjs (+6).
  - `.claude/skills/membrana-night-sprint/SKILL.md` — в стволе нет, добавлено 12 строк, в стволе 0%
  - `docs/NIGHT_SPRINT_REGULATION.md` — отличается, добавлено 12 строк, в стволе 8%
  - `docs/insights/insight-agent-worktree-cleanup-skill/INSIGHT.md` — в стволе нет, добавлено 71 строк, в стволе 0%
  - `docs/insights/insight-agent-worktree-cleanup-skill/RESEARCH.md` — в стволе нет, добавлено 13 строк, в стволе 0%
  - `docs/insights/insight-agent-worktree-cleanup-skill/REVIEW.md` — в стволе нет, добавлено 15 строк, в стволе 0%
  - `docs/insights/insight-agent-worktree-cleanup-skill/meta.json` — в стволе нет, добавлено 20 строк, в стволе 0%
  - `docs/prompts/TASK_REGISTRY_HOTFIX_ARCHIVE_REFACTOR_2026_06_30_PROMPT.md` — в стволе нет, добавлено 35 строк, в стволе 0%
  - `docs/reviews/task-archive-migration-2026-06-30/e875bd9af8610c6b468648de0282d04a8a13a295-review.md` — в стволе нет, добавлено 27 строк, в стволе 0%
  - … ещё 23 файлов
- `comp/comp-detection-alarm-2026-07-10/alpha` — код вне ствола: packages/device-board/src/catalog/bundled-user-case-entries.ts, packages/device-board/src/catalog/detection-alarm-competition-user-case-entries.ts, packages/device-board/src/catalog/index.ts, packages/device-board/src/catalog/user-case-catalog.test.ts (+1).
  - `packages/device-board/src/catalog/bundled-user-case-entries.ts` — отличается, добавлено 2 строк, в стволе 0%
  - `packages/device-board/src/catalog/detection-alarm-competition-user-case-entries.ts` — в стволе нет, добавлено 24 строк, в стволе 0%
  - `packages/device-board/src/catalog/index.ts` — отличается, добавлено 1 строк, в стволе 0%
  - `packages/device-board/src/catalog/user-case-catalog.test.ts` — отличается, добавлено 7 строк, в стволе 0%
  - `packages/device-board/src/graph/index.ts` — отличается, добавлено 7 строк, в стволе 14%
- `comp/comp-detection-alarm-2026-07-10/gamma` — код вне ствола: packages/device-board/src/catalog/bundled-user-case-entries.ts, packages/device-board/src/catalog/detection-alarm-competition-user-case-entries.ts, packages/device-board/src/catalog/index.ts, packages/device-board/src/catalog/user-case-catalog.test.ts.
  - `docs/competition-sprint/comp-detection-alarm-2026-07-10/PITCH_LOG.md` — отличается, добавлено 4 строк, в стволе 25%
  - `packages/device-board/src/catalog/bundled-user-case-entries.ts` — отличается, добавлено 4 строк, в стволе 0%
  - `packages/device-board/src/catalog/detection-alarm-competition-user-case-entries.ts` — в стволе нет, добавлено 25 строк, в стволе 0%
  - `packages/device-board/src/catalog/index.ts` — отличается, добавлено 1 строк, в стволе 0%
  - `packages/device-board/src/catalog/user-case-catalog.test.ts` — отличается, добавлено 22 строк, в стволе 50%
- `cowork/cowork-library-open-api/contract` — код вне ствола: packages/services/media-library/src/open-api/public-sample.ts, packages/services/media-library/src/open-api/temporary-key.ts, packages/services/media-library/test/open-api.stubs.ts.
  - `packages/services/media-library/src/open-api/public-sample.ts` — отличается, добавлено 84 строк, в стволе 88%
  - `packages/services/media-library/src/open-api/temporary-key.ts` — отличается, добавлено 19 строк, в стволе 32%
  - `packages/services/media-library/test/open-api.stubs.ts` — отличается, добавлено 65 строк, в стволе 89%
- `cowork/cowork-server-plugin-pages/journal-home` — код вне ствола: packages/background-cabinet/src/modules/journal/plugin-host/contracts.stub.ts, packages/background-cabinet/src/modules/journal/plugin-host/journal-plugin-host.service.test.ts, packages/background-cabinet/src/modules/journal/plugin-host/journal-plugin-host.service.ts.
  - `packages/background-cabinet/src/modules/journal/plugin-host/contracts.stub.ts` — в стволе нет, добавлено 102 строк, в стволе 0%
  - `packages/background-cabinet/src/modules/journal/plugin-host/journal-plugin-host.service.test.ts` — отличается, добавлено 165 строк, в стволе 89%
  - `packages/background-cabinet/src/modules/journal/plugin-host/journal-plugin-host.service.ts` — отличается, добавлено 112 строк, в стволе 84%
- `cowork/cowork-server-plugin-pages/page-plugins` — код вне ствола: apps/cabinet/src/pages/JournalPage.tsx, apps/cabinet/src/plugins/stubs/rowStubPlugin.tsx.
  - `apps/cabinet/src/pages/JournalPage.tsx` — отличается, добавлено 17 строк, в стволе 47%
  - `apps/cabinet/src/plugins/stubs/rowStubPlugin.tsx` — в стволе нет, добавлено 30 строк, в стволе 0%
- `feat/buffer-manager-journal` — код вне ствола: apps/cabinet/src/pages/JournalPage.tsx, packages/plugin-handlers/src/buffer-manager/manifest.ts, packages/plugin-handlers/src/index.ts, packages/services/media-library/src/index.ts.
  - `apps/cabinet/src/pages/JournalPage.tsx` — отличается, добавлено 53 строк, в стволе 75%
  - `packages/plugin-handlers/src/buffer-manager/manifest.ts` — в стволе нет, добавлено 27 строк, в стволе 0%
  - `packages/plugin-handlers/src/index.ts` — отличается, добавлено 1 строк, в стволе 0%
  - `packages/services/media-library/src/index.ts` — отличается, добавлено 4 строк, в стволе 75%
- `feat/journal-twenty-plugin` — код вне ствола: packages/background-media/src/modules/collections/first-wave.registrar.test.ts, packages/plugin-handlers/src/session-digest/executor.ts, scripts/tasks-decompose.config.json.
  - `docs/tasks/README.md` — отличается, добавлено 1 строк, в стволе 0%
  - `packages/background-media/src/modules/collections/first-wave.registrar.test.ts` — отличается, добавлено 5 строк, в стволе 60%
  - `packages/plugin-handlers/src/session-digest/executor.ts` — отличается, добавлено 237 строк, в стволе 83%
  - `scripts/tasks-decompose.config.json` — отличается, добавлено 1 строк, в стволе 0%
- `fix/exhaustive-deps-error` — код вне ствола: apps/cabinet/src/components/sample-library/CabinetSampleDuplicatesPanel.tsx, apps/client/src/modules/device-board/useDeviceBoardUserCaseSettings.ts.
  - `.eslintrc.cjs` — отличается, добавлено 36 строк, в стволе 11%
  - `apps/cabinet/src/components/sample-library/CabinetSampleDuplicatesPanel.tsx` — отличается, добавлено 3 строк, в стволе 0%
  - `apps/client/src/modules/device-board/useDeviceBoardUserCaseSettings.ts` — отличается, добавлено 4 строк, в стволе 0%
- `night/graphify-public-graph-2026-07-15` — документы вне ствола (+21471 строк): .gitignore, .graphifyignore, docs/NIGHT_BUILD_LOG.md (+4).
  - `.gitignore` — отличается, добавлено 2 строк, в стволе 0%
  - `.graphifyignore` — в стволе нет, добавлено 27 строк, в стволе 0%
  - `docs/NIGHT_BUILD_LOG.md` — отличается, добавлено 18 строк, в стволе 28%
  - `docs/archive/night-build/2026-07-15/artifacts/GRAPH_REPORT-full-monorepo.md` — в стволе нет, добавлено 2177 строк, в стволе 0%
  - `docs/archive/night-build/2026-07-15/artifacts/graph-core-scoped.html` — в стволе нет, добавлено 305 строк, в стволе 0%
  - `docs/archive/night-build/2026-07-15/artifacts/graph-core-scoped.json` — в стволе нет, добавлено 18915 строк, в стволе 0%
  - `docs/archive/night-build/2026-07-15/artifacts/graphifyignore.used` — в стволе нет, добавлено 27 строк, в стволе 0%
- `pr1410-head` — документы вне ствола (+62 строк): docs/HANDOFF.md, docs/bridge/DEBTS.md, docs/bridge/debt-ledger.jsonl (+8).
  - `docs/HANDOFF.md` — отличается, добавлено 28 строк, в стволе 0%
  - `docs/bridge/DEBTS.md` — отличается, добавлено 1 строк, в стволе 0%
  - `docs/bridge/debt-ledger.jsonl` — отличается, добавлено 1 строк, в стволе 0%
  - `docs/comms/sent-log.jsonl` — отличается, добавлено 1 строк, в стволе 0%
  - `docs/evidence/registry.jsonl` — отличается, добавлено 4 строк, в стволе 0%
  - `docs/tasks/morning-gates-state.json` — отличается, добавлено 2 строк, в стволе 0%
  - `docs/virtual-team/memory/dynin.md` — отличается, добавлено 5 строк, в стволе 0%
  - `docs/virtual-team/memory/kuryokhin.md` — отличается, добавлено 5 строк, в стволе 0%
  - … ещё 3 файлов

## Неясно — вопросы владельцу

- `backup/mfcc-rebased-3107` (2026-07-31) — мелкие расхождения в документах (+3 строк): package.json [67%]. Вопрос: нужны ли эти строки в стволе, или ветку можно считать пустой?
- `chore/day-2026-08-15-product` (2026-08-15) — мелкие расхождения в документах (+18 строк): docs/DAILY_STANDUP.md [0%], docs/STRATEGY_DAY.md [67%]. Вопрос: нужны ли эти строки в стволе, или ветку можно считать пустой?
- `feat/results-bridge` (2026-08-19) — код вне ствола, но всего 2 строк: docs/tasks/README.md [0%], scripts/tasks-decompose.config.json [0%]. Вопрос: нужны ли эти строки в стволе, или ветку можно считать пустой?
- `tmp-keep-2107` (2026-08-24) — мелкие расхождения в документах (+13 строк): docs/network/env.snapshot.json [0%], docs/network/env.snapshot.md [0%], docs/network/history/2026-08.jsonl [0%]. Вопрос: нужны ли эти строки в стволе, или ветку можно считать пустой?
- `wip/ritual-31-08` (2026-08-31) — мелкие расхождения в документах (+11 строк): docs/procedure-runs/trail/2026-08-31.jsonl [0%], docs/tasks/morning-gates-state.json [40%]. Вопрос: нужны ли эти строки в стволе, или ветку можно считать пустой?

## Рядом, но не в списке: сироты, занятые рабочими деревьями

Прибор их не считает (гард «занята worktree» срабатывает раньше), но класс риска тот же — нет PR, нет на сервере, коммиты есть. Не переключались и не перебазировались (в деревьях может лежать чужая работа). Замерены тем же методом; у трёх всё содержимое уже в стволе, четыре отправлены на сервер как есть.

| Ветка | Последний коммит | Уникальных коммитов | Области | Корзина | Куда спасено |
|---|---|---:|---|---|---|
| `codex/llm-procedure-panel` | 2026-08-11 | 1 | `scripts`, `scripts/lib` | ценное | `rescue/codex/llm-procedure-panel-20260917` |
| `cowork/cowork-library-open-api/contract` | 2026-09-02 | 2 | `docs/cowork-sprint`, `packages/services` | ценное | `rescue/cowork/cowork-library-open-api/contract-20260917` |
| `cowork/cowork-library-open-api/key-ttl` | 2026-09-02 | 2 | `docs/cowork-sprint`, `packages/background-media` | пусто | — |
| `cowork/cowork-library-open-api/ownership` | 2026-09-02 | 2 | `docs/cowork-sprint`, `packages/background-media` | пусто | — |
| `cowork/cowork-server-plugin-pages/homes` | 2026-08-22 | 1 | `docs/cowork-sprint`, `packages/plugin-contracts` | пусто | — |
| `cowork/cowork-server-plugin-pages/journal-home` | 2026-08-22 | 1 | `docs/cowork-sprint`, `packages/background-cabinet` | ценное | `rescue/cowork/cowork-server-plugin-pages/journal-home-20260917` |
| `cowork/cowork-server-plugin-pages/page-plugins` | 2026-08-22 | 1 | `apps/cabinet`, `docs/cowork-sprint` | ценное | `rescue/cowork/cowork-server-plugin-pages/page-plugins-20260917` |

