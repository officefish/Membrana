# Промпт: Рефакторинг CI — vitest-конфиги, разделение integration/acceptance, CI-aware latency

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — vitest-конфиги + CI-aware latency + разделение test steps.
> Реестр: `id` = `ci-test-stability-refactor` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Два повторных падения unit-test workflow (PR #189) на неизменённом коде:

1. `packages/services/rag/src/retriever/acceptance.test.ts` — 5 тестов упали по таймауту 5 000 мс (Vitest default). Тесты выполняют keyword-corpus I/O (чтение файлов репозитория). На GitHub Actions runner это занимает >5s, локально — <3s.

2. `packages/services/detectors/harmonic/src/detector.integration.test.ts` — `expect(result.latencyMs).toBeLessThan(100)` даёт 115ms на shared CI runner из-за CPU throttling.

Срочный фикс применён (per-test таймауты + `< 500`), но это бандаж. Консилиум определил системные причины и рекомендации. Нужен рефакторинг.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы модулей |
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | Issue / PR |
| [`.github/workflows/unit-tests.yml`](../../.github/workflows/unit-tests.yml) | Текущий workflow |

**GitHub Issue:** #191

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план. Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить

#### 1. vitest.config.ts для пакетов с I/O-тяжёлыми тестами

Создать `vitest.config.ts` в двух пакетах:

**`packages/services/rag/vitest.config.ts`:**
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    testTimeout: 30_000,  // keyword-corpus I/O на CI runner
  },
});
```

**`packages/services/detectors/harmonic/vitest.config.ts`:**
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    testTimeout: 10_000,  // FFT processing с margin на CI runner
  },
});
```

После добавления конфигов — удалить явные per-test таймауты из:
- `packages/services/rag/src/retriever/acceptance.test.ts` (3-й аргумент `30_000`)
- `packages/services/rag/src/retriever/acceptance.test.ts` (3-й аргумент `30_000` в `dual retriever routing`)

#### 2. CI-aware latency threshold в harmonic integration test

Заменить hardcoded `toBeLessThan(100)` в `detector.integration.test.ts`:

```ts
// Было:
expect(result.latencyMs).toBeLessThan(100);

// Стало:
const LATENCY_BUDGET_MS = process.env.CI ? 500 : 150;
expect(result.latencyMs).toBeLessThan(LATENCY_BUDGET_MS);
```

Константу вынести в начало файла (не inline в тест).

#### 3. Разделение тестов в unit-tests.yml

В `.github/workflows/unit-tests.yml` добавить отдельный step для acceptance/integration тестов:

```yaml
- name: Turbo — unit tests (fast, без acceptance)
  run: yarn turbo run test --continue
  env:
    VITEST_EXCLUDE_TAGS: acceptance,integration

- name: Turbo — acceptance & integration tests
  run: yarn turbo run test:acceptance --continue
  if: always()
  timeout-minutes: 8
```

**Альтернатива (если `test:acceptance` сложно настроить):** добавить в `package.json` каждого затронутого пакета команду `test:acceptance`, которая запускает только `*.acceptance.test.ts` и `*.integration.test.ts`. Основная `test` команда исключает их через `exclude` в vitest.config.ts.

Решение о варианте принять после анализа vitest.config текущих пакетов.

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| vitest config | `packages/services/rag/vitest.config.ts` | testTimeout для I/O-тестов |
| vitest config | `packages/services/detectors/harmonic/vitest.config.ts` | testTimeout для FFT |
| integration test | `harmonic/src/detector.integration.test.ts` | CI-aware latency constant |
| acceptance test | `rag/src/retriever/acceptance.test.ts` | убрать per-test timeout args |
| CI workflow | `.github/workflows/unit-tests.yml` | разделение fast / slow test steps |

**Запрещено:**

- Не менять логику тестов (только таймауты и latency threshold)
- Не добавлять `skip` или `only` в тесты
- Не трогать тесты других пакетов
- Не добавлять `process.env.CI` в production code (только в test files)

---

### Тесты

| Область | Минимум |
|---------|---------|
| rag/acceptance | Все 5 P@5 тестов + dual retriever routing проходят на CI |
| harmonic/integration | `detects harmonic drone fixture` проходит с новым LATENCY_BUDGET_MS |
| Регрессия | Прочие тесты пакетов rag и harmonic не сломаны |

---

### Definition of Done

- [ ] `vitest.config.ts` создан в `rag` и `harmonic`, содержит `testTimeout`
- [ ] Per-test таймаут-аргументы удалены из `acceptance.test.ts`
- [ ] `LATENCY_BUDGET_MS` константа в `detector.integration.test.ts` с `process.env.CI`
- [ ] `.github/workflows/unit-tests.yml` имеет отдельный step для acceptance/integration
- [ ] CI workflow зелёный на двух последовательных прогонах
- [ ] `yarn turbo run lint typecheck test --continue` — зелёный локально
- [ ] LGTM Teamlead

---

### Out of scope

- Рефакторинг самих тестов (менять assertions на смысл, а не на пороги — отдельная задача)
- `vitest bench` для latency (task #192 или позже — из консилиума)
- Добавление vitest.config в другие пакеты (только rag и harmonic в этом PR)
- Self-hosted runner (отдельное инфраструктурное решение)

---

### Порядок работы ролей

1. **Структурщик** — создаёт vitest.config.ts в двух пакетах, удаляет per-test аргументы
2. **Математик** — задаёт `LATENCY_BUDGET_MS` константу, проверяет что порог корректен
3. **Верстальщик** — рефакторит `unit-tests.yml`: разделяет fast и slow steps
4. **Teamlead** — LGTM, проверяет что CI зелёный

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: …
[Структурщик]: …
[Математик]: …
[Музыкант]: —
[Верстальщик]: …

Итоговый артефакт: vitest.config.ts × 2 + harmonic test fix + unit-tests.yml update
Definition of Done: CI зелёный на 2 прогонах, все acceptance/integration тесты в отдельном step
```

---

## Заметки для человека-постановщика

1. GitHub Issue #191 создан: <https://github.com/officefish/Membrana/issues/191>
2. Запись в `docs/tasks/registry.json` (status: active, id: `ci-test-stability-refactor`)
3. После merge: `yarn task:archive ci-test-stability-refactor --notes "PR #…"`

### Проверка после PR

```bash
# Локально
yarn workspace @membrana/rag-service test
yarn workspace @membrana/harmonic-detector-service test

# CI — убедиться что unit-tests workflow зелёный на двух последовательных прогонах
gh run list --branch main --workflow "Unit tests" --limit 3
```

---

## Связь с дорожной картой

- Консилиум 2026-06-29: системные причины CI флейки определены
- Срочный фикс: PR #189 commit e9d8359 (таймауты вручную)
- Этот рефакторинг: убирает бандаж, вводит структурное решение
- Следующий шаг (вне scope): `vitest bench` для latency SLA детекторов
