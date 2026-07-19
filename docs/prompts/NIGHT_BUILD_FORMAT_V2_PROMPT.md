# Промпт: Формат night-build v2 — приёмник отчётов + два жанра ночи

> **Night Build — промпт целиком.** Размер **M**.  
> Реестр: `night-build-format-v2`.  
> Сырьё: [`docs/discussions/night-build-format-analysis-2026-07-19.md`](../discussions/night-build-format-analysis-2026-07-19.md)  
> (каскад triage #481→#638 19.07: draft блокировал merge; жанры Night Build vs night-triage путаются).

## Night Build — промпт целиком

### Кто ты

Делегированный ночной агент Membrana. Координатор уже включил `yarn always-yes:on`
(ADR-0009 Р7). Работай в worktree на ветке `night/night-build-format-v2-YYYY-MM-DD`
от **`origin/main`**. Чекпоинть: `yarn night:checkpoint --phase NB<n> --status pass|fail --note "…"`.

### In scope (заморожено)

| Фаза | Класс | W | DoD |
|------|-------|---|-----|
| **NB0** Gate | infra | 1 | Worktree от `origin/main`; `yarn worktree:bootstrap`; stale ACTIVE закрыт/`--force`; baseline `node --test` на новые тесты когда появятся |
| **NB1** Canon | config | 2 | В `NIGHT_SPRINT_REGULATION.md`: (a) два жанра ночи — Night Build vs night-triage/hunt; (b) утренний **land-каскад** для docs-report draft PR; (c) draft без `ready` = блокер merge. Без переписывания G1–G3 |
| **NB2** `night:land-reports` | code | 3 | CLI `yarn night:land-reports` (+ `--execute`): найти open PR title~`Night triage`, path-only `docs/reports/night-triage/**`, `gh pr ready` + squash-merge oldest-first; default dry-run; тесты на классификацию/порядок |
| **NB3** Ритуал | config | 1 | Абзац в `DEVELOPER_RHYTHM.md` (утро): после HANDOFF — `yarn night:land-reports` (dry-run → слово владельца → `--execute`). Скилл `membrana-night-sprint`: always-yes:on до спавна; land-reports утром |
| **NB4** Analysis park | config | 0 | Влить `docs/discussions/night-build-format-analysis-2026-07-19.md` в ветку (если ещё нет); ссылка из регламента |
| **NB5** Close | infra | 1 | `yarn night:close --id night-build-format-v2`; HANDOFF с рекомендацией утреннего merge PR; **не** мёржить в main |

### Out of scope

- Prod deploy / SSH / `task:close-github` / force-push / `reset --hard`
- Правки `@membrana/core`, MembranaRegistry, audio-engine
- Auto-merge без dry-run по умолчанию; закрытие GitHub Issues из triage-отчётов
- Заполнение всего stub day-sprint шаблона вне Night Build блока
- Мёрж в `main` ночью (норма: утро)

### Жёсткие инварианты (СТОП)

1. G1: always-yes deny остаётся (не обходить профилем).
2. G2: только свой worktree; не `git add -A` чужого.
3. G3: база ветки — `origin/main`, не локальный main.
4. `night:land-reports` без `--execute` ничего не мёржит.
5. Path allowlist land: только `docs/reports/night-triage/**` (один файл ADDED на PR). Иной diff → skip + note в отчёте CLI.
6. При 2 падениях CI подряд — стоп, HANDOFF с блокером.

### Тесты

| Область | Гейт |
|---------|------|
| land-reports pure classify/order | unit (`node:test`) |
| регламент / rhythm | `yarn docs:lint` или verify-encoding на затронутых md |

### Порядок

NB0 → NB1 → checkpoint → NB2 + tests → checkpoint → NB3 → NB4 → NB5 close.

### HANDOFF (утро)

Координатор: adversarial review PR; `yarn always-yes:off` если день без авто-yes; merge по LGTM.

---

## Заметки для человека-постановщика

Эпик переведён в `sprintKind: night-build` для пилота 19.07. После merge — обсудить
развилки A–F из analysis (auto-merge vs ритуал; префиксы PR).
