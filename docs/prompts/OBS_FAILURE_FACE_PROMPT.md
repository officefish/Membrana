# Промпт: Кусок B: контракт отказа кабинета — род + номер происшествия (INC/TMP)

> **Task-промпт для агента-разработчика.** Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **M**. Ожидаемый артефакт: **1 PR** — контракт отказа в `AllExceptionsFilter` + лог + тесты.
> Реестр: `id` = `obs-failure-face` · **GitHub Issue:** [#2119](https://github.com/officefish/Membrana/issues/2119)

---

## Контекст

23.08 владелец получил голую пятисотку без номера — соединить экран с журналом сервера
было нечем. Несущий вердикт: [`m1-incident-number`](../seanses/logging-observability-cut-m1-incident-number-2026-08-24.md);
сводка и DoD: [`EPIC.md`](../meeting/logging-observability-cut/EPIC.md), кусок B.

## Промпт целиком (для вставки агенту)

### Что построить

1. `AllExceptionsFilter` кабинета (`packages/background-cabinet/src/common/filters/http-exception.filter.ts`):
   отказ несёт `genus: 'broken' | 'busy' | 'unreachable'` (Т3); `busy` — с «подожди N».
2. При `broken`: `incidentId` в теле **и** заголовке `X-Incident-Id` (добавить в CORS
   expose), рядом `requestId`; формат `INC-XXXX-XXXX` (Crockford Base32 без I/L/O/U,
   группы по 4) — чеканит Сентри; Сентри нет/недоступен → локальный суррогат
   `TMP-XXXX-XXXX` (в картотеку не пишется, помечен «не в картотеке»).
3. Лог сервера: структурированные поля `genus`, `incidentId`, `requestId` (+ краткий
   message) — тем же литералом, что в ответе.
4. `busy` / `unreachable` номера **не** несут. `X-Request-Id` сохраняет текущее поведение.

### Definition of Done (8 предикатов вердикта M1)

- [ ] `broken` всегда с непустым `incidentId` (`INC-*`/`TMP-*`); заголовок = телу.
- [ ] Лог несёт тот же литерал + `requestId`.
- [ ] При живом Сентри `INC-…` находим в картотеке; при мёртвом — `TMP-…`, не 500-простыня.
- [ ] `busy`/`unreachable` без номера; `X-Request-Id` не сломан.
- [ ] #2113/#2110 встают на контракт без переделки: `incidentId` — opaque string, новых
      обязательных зависимостей журнала/сортировки от клиента Сентри нет (ревью-проверка).
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный (scope) · LGTM Teamlead.

### Out of scope

Контейнер Сентри (кусок E — до него все номера TMP) · `/health/deep` (D) · пульс (C) ·
существо #2113/#2110 · прод-деплой без слова владельца.
