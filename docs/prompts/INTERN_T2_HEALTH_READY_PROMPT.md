# Промпт: Intern T2 — `/health` и `/ready`

> **Task-промпт.** Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **S**. Артефакт: **1 PR**. Спека: [`docs/intern/INTERN_ONBOARDING_BACKGROUND_OFFICE.md`](../intern/INTERN_ONBOARDING_BACKGROUND_OFFICE.md) §3.2.
> Реестр: `id` = `intern-t2-health-ready`. **GitHub Issue:** [#196](https://github.com/officefish/Membrana/issues/196).
> Зависит от: `intern-t1-outbound-self-check` (#195 / PR #666).

---

## Промпт целиком

### Что построить

1. `GET /health` — уже есть (liveness). Не ломать контракт `{status,version,uptime}`.
2. `GET /ready` — readiness без auth:
   - зонд зависимостей через `runOutboundSelfCheck` из T1;
   - ответ: `{ ready: boolean, checks: [...] }` (или эквивалент с теми же полями);
   - `ready=true` только если все reachable;
   - HTTP 200 всегда при поднятом процессе (readiness в теле; опционально 503 если not ready — зафиксировать в README: **200 + ready:false** проще для smoke).
3. E2E/unit: mock probe → ready true/false; `/health` регресс.
4. README: секция Ready.

### Out of scope

Метрики, дашборды, auth на health/ready, починка зависимостей.

### DoD

- [ ] Оба эндпоинта отвечают; `/ready` отражает сеть.
- [ ] Переиспользование T1 без копипасты. `Closes #196`.
