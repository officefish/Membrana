# Промпт (day sprint · active): Night Hunt — office cron → proxy → PR

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** day-sprint **`night-hunt-sprint-2026-06-25`** · `sprintKind` = **`day-sprint`**  
> **GitHub Issue:** [#174](https://github.com/officefish/Membrana/issues/174)  
> **Статус:** **active** · старт 2026-06-25  
> **Размер:** **L** (3 фазы, 1–2 PR)  
> **Пакет:** `@membrana/background-office` + корневые `scripts/`

---

## Контекст

Консилиум [`optional-proxy-timer-processes-2026-06-25.md`](../seanses/optional-proxy-timer-processes-2026-06-25.md) выбрал **optional** scheduled-процессы (timer + opencode proxy + skip OK). Night Hunt — пилот топ-3 на **background-office** (ПК оператора может быть выключен ночью).

| Требование оператора | Реализация |
|---------------------|------------|
| Сервер, не локальный cron | `@nestjs/schedule` в office + Fly.io / VPS |
| В репо только через PR | `GithubService.createPullRequestWithFile` |
| Путь отчётов | `docs/seanses/night-hunt/<slug>-YYYY-WW.md` |
| Утро: review PR → план дня | `yarn night-hunt:pr-review` → `main-day-issue` |
| Вечер: архивация | `yarn archive:night-hunt` в `ritual:evening` |

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md) | Границы office |
| [`BACKGROUND_OFFICE_FLY_DEPLOY.md`](../deploy/BACKGROUND_OFFICE_FLY_DEPLOY.md) | Временный хостинг |
| [`opencode-proxy-processes-2026-06-25.md`](../seanses/opencode-proxy-processes-2026-06-25.md) | Классификация proxy vs direct |

---

## Product decisions

| ID | Решение |
|----|---------|
| **D-NH-1** | LLM для hunt — **только OpenRouter** (`OPENROUTER_API_KEY`), не `ANTHROPIC_API_KEY` ритуалов |
| **D-NH-2** | Job optional: ошибка proxy/GitHub → log + skip, **не** fail CI/ритуалов |
| **D-NH-3** | PR label `night-hunt`, base `NIGHT_HUNT_BASE_BRANCH` (default `techies68`) |
| **D-NH-4** | Prod-ритуалы (`ritual:day/evening` direct Anthropic) **не** менять на proxy |
| **D-NH-5** | Хостинг пилота: **Fly.io** (free allowance); VPS — fallback |

---

## Фазы day-sprint

| Phase | Registry id | Size | DoD | Статус |
|-------|-------------|------|-----|--------|
| **NH0** | *(в эпике)* | S | Issue, OPEN, промпт, registry | in progress |
| **NH1** | `nh-s1-office-module` | M | night-hunt module, OpenRouter, GitHub PR API, cron, tests | code ready → PR |
| **NH2** | `nh-s2-fly-deploy` | S | Fly deploy, secrets, `GET /health`, manual `POST /v1/night-hunt/run/...` | **operator** |
| **NH3** | `nh-s3-rituals` | S | `night-hunt:pr-review`, `archive:night-hunt`, ritual:day/evening | code ready → verify |

**Порядок:** NH0 → PR (NH1+NH3) → merge → NH2 deploy → первая ночь → утренний smoke → archive фаз → CLOSURE.

---

## Архитектура

| Слой | Путь | Назначение |
|------|------|------------|
| Scheduler | `packages/background-office/src/modules/night-hunt/night-hunt.scheduler.ts` | Cron UTC |
| Orchestrator | `night-hunt.service.ts` | gather context → OpenRouter → PR |
| Proxy | `openrouter/openrouter.service.ts` | OpenAI-compatible chat |
| GitHub write | `github.service.ts` | branch + file + PR |
| API | `POST /v1/night-hunt/run/:jobId` | manual trigger |
| Утро | `scripts/night-hunt-pr-review.mjs` | `docs/NIGHT_HUNT_PR_REVIEW.md` |
| Вечер | `scripts/archive-night-hunt-artifacts.mjs` | `docs/archive/night-hunt/<date>/` |

**Jobs (пилот):**

| Job | Cron UTC | Файл |
|-----|----------|------|
| `design-token-drift` | ср 07:00 | `design-drift-YYYY-WW.md` |
| `services-api-contract-drift` | пн 11:00 | `services-api-drift-YYYY-WW.md` |
| `monorepo-dependency-graph` | вт 08:30 | `graph-drift-YYYY-WW.md` |

**Запрещено:** WAV в office; direct push в main; блокировать ритуалы при skip hunt.

---

## Промпт целиком (для вставки агенту)

### Кто ты

Координатор Membrana (Vesnin). Day-sprint **`night-hunt-sprint-2026-06-25`**. Соблюдай [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) и [`BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md).

### Что построить

1. **NH1:** модуль night-hunt в background-office (OpenRouter + GitHub PR + cron).
2. **NH3:** утренний `night-hunt:pr-review`, вечерний `archive:night-hunt`, врезка в `ritual:day` / `ritual:evening`.
3. **NH2:** после merge PR — Fly deploy по [`BACKGROUND_OFFICE_FLY_DEPLOY.md`](../deploy/BACKGROUND_OFFICE_FLY_DEPLOY.md) (**секреты — оператор**).

### Definition of Done (эпик)

- [ ] GitHub Issue + PR с `Closes #N`
- [ ] NH1: API + cron + unit-тесты green
- [ ] NH2: office на Fly, smoke health + один manual run
- [ ] Первый PR от hunt с файлом в `docs/seanses/night-hunt/`
- [ ] NH3: `yarn night-hunt:pr-review` после появления PR
- [ ] `yarn task:archive` для NH1–NH3 и эпика + `CLOSURE.md`
- [ ] Teamlead LGTM

### Out of scope

- Proxy в prod `code-review` / `consilium`
- Jobs 4–7 из консилиума (Q3/Q4)
- `packages/services/.api-contract.json` (follow-up)

### Порядок ролей

1. **Vesnin** — ритуалы, LGTM, приоритет дня
2. **Ozhegov** — office module, deploy, GitHub
3. **Rodchenko** — design-drift job quality (после первых отчётов)

---

## Шаги для оператора (только где без вас не обойтись)

### NH2 — Fly.io secrets

См. [`BACKGROUND_OFFICE_FLY_DEPLOY.md`](../deploy/BACKGROUND_OFFICE_FLY_DEPLOY.md). **Обязательно от вас:**

- `fly auth login` + `fly deploy`
- `GITHUB_TOKEN` с scope **`repo`** (write PR)
- `OPENROUTER_API_KEY` (достаточный баланс)
- Label **`night-hunt`** в GitHub repo

### NH3 — утро после первой ночи

- `yarn ritual:day` или `yarn night-hunt:pr-review`
- Ревью + merge PR night-hunt

---

## Заметки для постановщика

- Issue: wish/imperfection, AC из DoD эпика.
- После merge: `OFFICE_URL` + `OFFICE_API_TOKEN` в repo secrets (backup workflow).
- Архив фаз: `yarn task:archive nh-s1-office-module --notes "PR #…"`.
