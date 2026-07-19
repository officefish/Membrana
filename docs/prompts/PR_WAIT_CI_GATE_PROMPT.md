# Промпт: pr:wait — честное ожидание проверок PR (четыре состояния)

> **Task-промпт для агента-разработчика.**
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **S**. Ожидаемый артефакт: **1 PR** — скрипт `yarn pr:wait` + тест
> классификатора + грабли пп.2–4 из #643 в `AGENTS.md`.
> Реестр: `id` = `pr-wait-ci-gate` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Эпизод 18.07 (#643 п.1): агент ждал CI самописным циклом
`gh pr checks 637 | grep -c pending`. Ответ `no checks reported` дал ноль совпадений
со словом «pending» → цикл объявил проверки завершёнными, и агент **доложил владельцу
зелёный CI, которого не было** — проверки не запускались вовсе (PR конфликтовал,
`mergeable: CONFLICTING`, GitHub не строит merge-ref и не порождает прогонов).

Класс дефекта: инструмент не врёт — он молчит, а молчание принимается за отсутствие
проблемы. Ложное «зелено» опаснее красного: красное видно, зелёное берут на веру.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| GitHub Issue #643 | Эпизоды, эскиз, обязательство по AGENTS.md |
| [`scripts/_deploy-ci-gate.mjs`](../../scripts/_deploy-ci-gate.mjs) | Близкий прецедент чтения `gh` (зелёность по SHA для деплоя) — переиспользовать подход, не дублировать задачу |
| [`AGENTS.md`](../../AGENTS.md) §Agent tooling → Грабли | Куда дописываются пп.2–4 (обязательство TF-7 из #554) |

**GitHub Issue:** #643.

---

## Промпт целиком (для вставки агенту)

### Что построить

1. `scripts/pr-wait.mjs` + скрипт `pr:wait` в `package.json`:
   `yarn pr:wait <N> [--once] [--timeout-min 15] [--interval-sec 20]`.
2. Скрипт различает **четыре состояния** и никогда их не схлопывает:
   - `none` — проверок нет (это НЕ зелено);
   - `running` — идут;
   - `green` — все завершились успехом (success / skipped / neutral);
   - `red` — есть failure / error / cancelled / timed_out / action_required.
3. Рядом с состоянием печатаются `mergeable` / `mergeStateStatus`. При `none` +
   `CONFLICTING`/`DIRTY` скрипт сам объясняет: конфликтующий PR не запускает CI —
   сначала разрешить конфликт, потом ждать проверок (грабля п.2 из #643).
4. Отрицательный результат выдаётся вместе со способом проверки (какая команда,
   какой SHA/PR). Exit-коды: `0` green, `1` red, `2` none (после таймаута или
   сразу при конфликте), `3` таймаут при running, `4` ошибка usage/gh.
5. Грабли пп.2–4 из #643 — строками в таблицу `AGENTS.md` §Грабли:
   конфликтующий PR не запускает CI; фоновый вывод нельзя уводить в `tail`;
   short-path `USER19~1` ломает ESM-импорт из scratchpad (`pathToFileURL` +
   длинный абсолютный путь).

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| CLI | `scripts/pr-wait.mjs` | Поллинг `gh pr view --json`, печать, exit-код |
| Чистая логика | экспорт `classifyChecks(rollup)` там же | Классификация statusCheckRollup в одно из четырёх состояний |
| Тест | `scripts/pr-wait.test.mjs` | Юнит на классификатор + на объяснение `none`-состояния |

**Запрещено:**

- Судить о состоянии grep'ом по тексту вывода `gh` — только структурный JSON.
- Схлопывать `none` в `green` при любых условиях.
- Дублировать `_deploy-ci-gate.mjs` (другая задача: gate по SHA для деплоя).

### Тесты

| Область | Минимум |
|---------|---------|
| `classifyChecks` | пустой rollup → none; pending → running; все success → green; смесь success+failure → red; red приоритетнее running |
| Объяснение none | при `mergeable: CONFLICTING` текст называет причину и действие |

### Definition of Done

- [ ] `yarn pr:wait <N> --once` на живом PR печатает состояние, mergeable и exit-код по контракту.
- [ ] `node --test scripts/pr-wait.test.mjs` зелёный; файл добавлен в список `test` в `package.json`.
- [ ] Грабли пп.2–4 в `AGENTS.md`.
- [ ] LGTM Teamlead (code-review перед ship).

### Out of scope

- Автомерж / ретраи воркфлоу — только наблюдение.
- Изменение `_deploy-ci-gate.mjs`.
- Пункт 1 обязательства #554 TF-6 (инвентарь генерируется, команду в AGENTS.md списком не вносить).

---

## Заметки для человека-постановщика

1. Issue #643 уже содержит эпизоды-evidence; после merge — отчёт в Issue.
2. Закрытие: `yarn task:archive pr-wait-ci-gate --notes "PR #…, pr:wait + грабли AGENTS.md"`.

### Проверка после PR

```bash
yarn pr:wait <живой-N> --once
node --test scripts/pr-wait.test.mjs
```
