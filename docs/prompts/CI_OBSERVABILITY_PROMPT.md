# Задача: ci-observability

**Issue:** #193  
**Размер:** S  
**Дата:** 2026-06-29

## Контекст

Code review PR #192 (ci-test-stability-refactor) выявил 5 подтверждённых структурных проблем CI. PR #192 был смержен как есть (решает исходную flakiness), эти проблемы выносятся в отдельный спринт.

## Находки из review (все CONFIRMED)

### #1 CRITICAL — ci.yml gap
`ci.yml` запускает `yarn turbo run test`, который теперь **исключает** acceptance/integration тесты. Отдельных шагов для `test:acceptance`/`test:integration` в `ci.yml` нет. Ветка `techies68` покрыта только `ci.yml` (не `unit-tests.yml`), поэтому acceptance и integration тесты **никогда не запускаются** на techies68.

**Fix:** добавить `test:acceptance` и `test:integration` шаги в `ci.yml`, аналогично `unit-tests.yml`.

### #2 — testTimeout 30_000 применяется ко всем rag unit-тестам
`packages/services/rag/vitest.config.ts` выставляет `testTimeout: 30_000` глобально. Но `acceptance.test.ts` исключён из дефолтного `test` скрипта. В итоге быстрые unit-тесты rag получают 30s timeout вместо дефолтных 5s — зависшие тесты обнаруживаются в 6 раз медленнее.

**Fix:** перенести timeout в `vitest.config.ts` через `exclude` (или снизить до 5s и поставить per-test timeout в acceptance.test.ts).

### #3 — exclusion в CLI флаге, не в vitest.config.ts
`--exclude '**/acceptance.test.ts'` живёт только в `package.json` скрипте. IDE-раннеры (VSCode vitest extension, `npx vitest`) запускают vitest напрямую без этого флага — получают acceptance с 30s timeout. Скрытая связность между CLI флагом и конфигом.

**Fix:** добавить `exclude: ['**/acceptance.test.ts']` в `packages/services/rag/vitest.config.ts`; аналогично для harmonic.

### #4 — нет reporters/outputFile в новых vitest.config.ts
`packages/services/rag/vitest.config.ts` и `packages/services/detectors/harmonic/vitest.config.ts` не настраивают JSON-репортёры. Все остальные пакеты (fft-analyzer, core, telemetry, background-office) имеют:
```ts
reporters: process.env.CI ? ['verbose', 'json'] : ['default'],
outputFile: { json: 'test-results/results.json' }
```
Без этого — нет артефактов для диагностики при падении CI.

**Fix:** добавить reporters/outputFile в оба новых vitest.config.ts.

### #5 — artifact upload указывает на чужие пакеты
`Upload test results` в `unit-tests.yml` перечисляет пути для fft-analyzer/core/telemetry/background-office, но **не** для rag и harmonic — тест-результаты новых сьютов никогда не загружаются. `if-no-files-found: ignore` скрывает проблему.

**Fix:** добавить `packages/services/rag/test-results/` и `packages/services/detectors/harmonic/test-results/` в пути артефакта.

## Файлы для изменения

- `.github/workflows/ci.yml` — добавить шаги acceptance/integration
- `.github/workflows/unit-tests.yml` — исправить пути артефакта
- `packages/services/rag/vitest.config.ts` — exclude + reporters + скорректировать timeout
- `packages/services/detectors/harmonic/vitest.config.ts` — exclude + reporters

## Критерии готовности

- [ ] `ci.yml` запускает `test:acceptance` и `test:integration` для затронутых пакетов
- [ ] `packages/services/rag/vitest.config.ts` содержит `exclude` и `reporters`
- [ ] `packages/services/detectors/harmonic/vitest.config.ts` содержит `exclude` и `reporters`
- [ ] `Upload test results` артефакт включает rag и harmonic пути
- [ ] Unit-тесты rag имеют разумный timeout (≤ 5s или дефолт vitest)
