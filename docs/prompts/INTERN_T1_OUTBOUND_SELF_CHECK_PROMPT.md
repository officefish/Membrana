# Промпт: Intern T1 — outbound self-check

> **Task-промпт.** Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **S**. Артефакт: **1 PR**. Спека: [`docs/intern/INTERN_ONBOARDING_BACKGROUND_OFFICE.md`](../intern/INTERN_ONBOARDING_BACKGROUND_OFFICE.md) §3.1.
> Реестр: `id` = `intern-t1-outbound-self-check`. **GitHub Issue:** [#195](https://github.com/officefish/Membrana/issues/195).

---

## Контекст

Стажёрский трек `docs/intern/`: переиспользуемая диагностика внешних каналов office
(Anthropic, Linear, GitHub, Perplexity). Логика должна жить в `@membrana/background-office`,
чтобы T2 `/ready` переиспользовал тот же модуль. CLI — `yarn office:self-check`
(согласовано с семейством `office:*`).

**GitHub Issue:** #195.

---

## Промпт целиком

### Что построить

1. `packages/background-office/src/lib/outbound-self-check.ts` — чистая логика:
   - зонд четырёх эндпоинтов (лёгкий GET/HEAD или минимальный API-пинг);
   - таймаут на запрос; недостижимый → статус, не throw наружу;
   - сводка: id / url / reachable / latencyMs / httpStatus / note.
2. CLI: `yarn office:self-check` → таблица/строки сводки, exit 0 даже если часть down
   (диагностика, не гейт).
3. Unit-тесты на классификацию таймаута/ok/unreachable (mock fetch).
4. Кратко в `packages/background-office/README.md` (секция Self-check).

### Definition of Done

- [ ] Четыре эндпоинта в сводке; таймаут не роняет процесс.
- [ ] Тесты пакета зелёные. `Closes #195`.
- [ ] Логика экспортируема для T2 `/ready` (без копипасты).

### Out of scope

Ретраи, алерты, расписание, починка сети, `/ready` (это T2 / #196).

---

## Заметки

После merge: `yarn task:archive intern-t1-outbound-self-check --notes "PR #…"`.
