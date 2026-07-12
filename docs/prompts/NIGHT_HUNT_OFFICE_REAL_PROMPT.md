# Промпт: night-hunt-office-real — запустить night-hunt по-настоящему на office

> Task-промпт (размер **S**). Реестр: `night-hunt-office-real`. GitHub Issue: [#390](https://github.com/officefish/Membrana/issues/390).
> Повторяет рецепт night-triage (#380): нативный Anthropic через media/NL-прокси, деплой на office, приёмка. Инфра уже готова.

## Проблема

`night-hunt` (weekly-анализ репо → PR) реализован, но не работает по-настоящему:
1. LLM через `OpenRouterService` — гео-блок из РФ (office в Москве), и `OpenRouterService` использует голый `fetch` → **media-прокси его не видит** (только `ClaudeService.proxyUrl()` умеет `HTTPS_PROXY`).
2. `NIGHT_HUNT_ENABLED` не выставлен → cron не идёт.
3. `baseBranch()` дефолт = мёртвая `techies68`.

## Фазы

- **NH1 (PR)** — свап `NightHuntService` с `OpenRouterService` на `ClaudeService` (native Anthropic, proxy-aware через `HTTPS_PROXY=media`); `isEnabled()` от `ANTHROPIC_API_KEY`; `baseBranch()` дефолт `techies68`→`main`; `night-hunt.module` импортирует `ClaudeModule`; обновить тест.
- **NH2** — деплой на office (`NIGHT_HUNT_ENABLED=true` в office.env, пересборка/рестарт); ручной ран `POST /v1/night-hunt/run/:jobId` → PR.
- **NH3** — приёмка: 3 job (design-token-drift / services-api-contract-drift / monorepo-dependency-graph) дают осмысленные PR; включить расписание.

## Definition of Done

- [ ] NH1: night-hunt на ClaudeService, baseBranch=main, тесты зелёные.
- [ ] NH2: деплой, `NIGHT_HUNT_ENABLED=true`, ручной ран одной job → PR через media-прокси (не гео-блок).
- [ ] NH3: 3 job проверены, расписание включено после приёмки. LGTM.

## Инварианты / границы

- Инфра готова: office `176.124.218.4`, media tinyproxy `72.56.27.58:8888`, `ClaudeService` с `HTTPS_PROXY`.
- night-hunt PR — **не draft** (в отличие от night-triage), label `night-hunt,automated`, дедуп по label.
- **Fly night-hunt** (`membrana-office-night-hunt`) — отдельная площадка, НЕ затрагиваем.
- Не трогать код анализа job (только провайдер LLM + конфиг).

Связано: `docs/prompts/NIGHT_TRIAGE_OFFICE_PROMPT.md` (тот же паттерн), `packages/background-office/src/modules/night-hunt/`.
