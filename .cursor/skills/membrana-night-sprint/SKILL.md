---
name: membrana-night-sprint
description: >-
  Opens and closes Membrana Night Build sprints between evening and morning rituals
  (night:open, night:checkpoint, night:close). Use when user mentions Night Build,
  night sprint, or autonomous overnight epic work. Do NOT use for daytime M/L with
  prod-smoke (DEVELOPER_RHYTHM) or hackathon (HACKATHON_REGULATION).
---

# Membrana Night Build

Канон: [`docs/NIGHT_SPRINT_REGULATION.md`](../../../docs/NIGHT_SPRINT_REGULATION.md).

## Lifecycle

```
yarn ritual:evening → night:open → always-yes:on → ДЕЛЕГИРОВАТЬ субагенту (NB0…NBn + checkpoint + close + HANDOFF)
  → morning: HANDOFF → yarn night:land-reports (dry-run → слово владельца → --execute) → review/merge code-epic PR
```

## Delegated execution (default, ADR-0009)

Фазы NB0…NBn исполняет **делегированный фоновый субагент**, а не координатор.
**Перед спавном** обязательно **`yarn always-yes:on`** (scoped auto-yes, Р7; скилл
[`membrana-always-yes`](../membrana-always-yes/SKILL.md)) — иначе субагент упрётся
в confirm на каждой команде. Затем: `night:open` (если ещё не открыт) → спавни
субагент (`run_in_background`, `isolation: worktree`) с epic-промптом; он
**наследует профиль разрешений** и автономно проходит фазы, чекпойнтит, пишет
HANDOFF. Координатор получает уведомление, **верифицирует HANDOFF утром** (не
мёржит вслепую), затем `yarn always-yes:off`.

Гардрейлы: **Р2** промпт эпика = контракт (фазы+DoD+жёсткие инварианты+вердикт
консилиума/ADR); **Р3** human-in-loop (визуальная оценка, живой смоук) → владельцу,
не фабриковать; **Р4** утром адверсариальная верификация кода, честный негатив =
валидный исход; **Р5** один субагент = один ограниченный эпик, шире → несколько
делегатов/Workflow; **Р6** worktree обязателен; **Р7** scoped auto-yes
(`permissions.allow` на командной поверхности ночи + `deny` на прод/force/core),
НЕ глобальный `--dangerously-skip-permissions`. Шаблон промпта и пресет разрешений —
в `docs/NIGHT_SPRINT_REGULATION.md` §Делегированное исполнение.

## Commands

```bash
yarn always-yes:on          # ДО спавна субагента (ADR-0009 Р7)
yarn night:open --id <epic-id>
yarn night:checkpoint --phase NB0 --status pass --note "lint green"
yarn night:close --id <epic-id>
yarn night:land-reports              # утро: dry-run docs-report cascade
yarn night:land-reports --execute    # после «да» владельца
yarn always-yes:off         # после утренней верификации
```

## Artifacts

| File | Role |
|------|------|
| `docs/NIGHT_BUILD_ACTIVE.md` | open epic |
| `docs/NIGHT_BUILD_LOG.md` | append checkpoints |
| `docs/archive/night-build/<date>/HANDOFF.md` | morning handoff |

## Preconditions

1. Evening ritual done (min. code-review archived).
2. Epic in registry with `sprintKind: "night-build"`.
3. Branch: `night/<epic-id>-<YYYY-MM-DD>` from **`origin/main`** (techies68 мертва).

## Forbidden in Night Build

- Prod deploy/smoke (morning or separate PR).
- `@membrana/core` / `MembranaRegistry` changes without **vesnin** + LGTM.
- New Issue triage mid-night (blockers only).

## Morning after close

1. Read HANDOFF.
2. `yarn night:land-reports` (dry-run) → owner «да» → `--execute` — приземлить
   eligible night-triage draft PR (allowlist `docs/reports/night-triage/**`).
3. `yarn ritual:day` → adversarial review/merge code-epic PR `night/*`.
4. `yarn always-yes:off` если день без авто-yes.
