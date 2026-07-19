# Промпт: `/ready` — error-path (try/catch)

> **Task-промпт.** Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **S**. Артефакт: **1 PR**. Follow-up Teamlead P1 из ревью [#667](https://github.com/officefish/Membrana/pull/667).
> Реестр: `id` = `office-ready-error-path`. **GitHub Issue:** [#669](https://github.com/officefish/Membrana/issues/669).

---

## Контекст

Intern T2 (#196 / PR #667) ввёл `GET /ready` с переиспользованием `runOutboundSelfCheck`.
Контракт: HTTP 200 всегда при поднятом процессе; `body.ready` отражает зависимости.
`probeTarget` ловит сетевые ошибки, но `ready()` не защищён от неожиданного throw
(баг в fetchImpl, сбой агрегатора) → Nest 500.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| `packages/background-office/src/health.controller.ts` | Точка правки |
| `docs/discussions/pr-667-code-review.md` | P1 finding |
| `docs/prompts/INTERN_T2_HEALTH_READY_PROMPT.md` | Исходный контракт |

**GitHub Issue:** [#669](https://github.com/officefish/Membrana/issues/669).

---

## Промпт целиком

### Что построить

1. В `HealthController.ready()` обернуть `runOutboundSelfCheck` в try/catch.
2. На исключении: HTTP 200, `ready: false`, `checks` с одной (или агрегированной) записью
   `reachable: false` и `note` с текстом ошибки (без стека/секретов).
3. Тест: замокать `runOutboundSelfCheck` → throw → `expect(200)` + `ready === false`.
4. Не менять контракт `/health` и успешный путь `/ready`.

### Out of scope

Auth, метрики, удаление `formatReadyChecksTable`, изменение списка хостов T1.

### Definition of Done

- [ ] Error-path даёт 200 + `ready: false`.
- [ ] Тест зелёный. LGTM Teamlead. `Closes #<issue>`.

---

## Заметки для постановщика

1. Закрытие: `yarn task:archive office-ready-error-path --notes "PR #…"`.
