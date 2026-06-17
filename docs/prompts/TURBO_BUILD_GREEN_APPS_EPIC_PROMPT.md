# Промпт: turbo-build-green-apps — зелёный turbo build для client и cabinet

> **Стратегический task-промпт (эпик)** — Cursor IDE / Claude.
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **L** (фазы F0–F6).
> Ветка: **`ozhegov/turbo-build-green-apps`** → merge в **`techies68`** (или `techies68` напрямую после LGTM).
> Реестр: `id` = **`turbo-build-green-apps`** в [`docs/tasks/registry.json`](../tasks/registry.json).
> Вход: расследование 2026-06-17 (turbo build падает на `@membrana/client` + `@membrana/cabinet`; `packages/**` — 26/26 OK).

---

## Контекст

`yarn turbo run build --continue` **падает только на двух apps** — `@membrana/client` и `@membrana/cabinet`. Все пакеты `packages/**` (сервисы, libs, `background-*`) собираются успешно.

**Корневые причины (расследование):**

| # | Проблема | Следствие |
|---|----------|-----------|
| 1 | `typecheck` в apps = `tsc --noEmit` на `tsconfig.json` с `"files": []` | Turbo typecheck **ложнозелёный**; ошибки видны только в `build` (`tsc -b`) |
| 2 | `apps/cabinet/tsconfig.app.json` без `"references"` (у client — есть) | ~168 каскадных TS6059/6307 («файл вне rootDir») |
| 3 | ~35 реальных TS-ошибок в client (API export, LiveModeConfig drift, journal adapters, readonly trends builder, …) | `tsc -b` exit 1 |
| 4 | `apps/cabinet/Dockerfile` — `vite build` **без** `tsc -b` | Prod Docker может быть зелёным при красном локальном turbo build |
| 5 | `.github/workflows/ci.yml` — только `main`/`develop`/`master` | PR в `techies68` не ловит полный CI |

**Не связано с:** эпиком DRONE_TIGHT / merge-hardening (#85). Это **накопившийся техдолг TypeScript + дыра в CI-скриптах apps**.

**Связанные документы:** [`CONTRIBUTING.md`](../CONTRIBUTING.md), [`ARCHITECTURE.md`](../ARCHITECTURE.md), [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md), [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

**GitHub Issue:** [#86](https://github.com/officefish/Membrana/issues/86) — «Turbo build green: client + cabinet typecheck/build parity».

---

## Промпт целиком (для вставки агенту)

> Ты — координатор виртуальной команды Membrana под руководством **Vesnin**. Доведи `yarn turbo run lint typecheck test build --continue` до **зелёного** на ветке эпика.
>
> **Цель:** честный typecheck (= build по строгости), исправление ~35 TS-ошибок client, parity cabinet tsconfig, CI на `techies68`, документированная стратегия prod build.
>
> **Запрещено:** ослаблять `strict` в `tsconfig.base.json`; отключать `tsc -b` в build без LGTM Vesnin; `any` без обоснования; новые фичи детекции; циклические зависимости между пакетами.
>
> **Фазы (строго по порядку зависимостей):**
> 1. **F0** — честный `typecheck` + CI branches (`tbga-f0-typecheck-honesty`).
> 2. **F1** — cabinet `"references"` как у client (`tbga-f1-cabinet-project-refs`).
> 3. **F2** — quick wins: exports + infra misc (`tbga-f2-lib-export-quick-wins`).
> 4. **F3** — plugin LiveModeConfig + harmonic/mic types (`tbga-f3-plugin-live-config-types`) — параллельно с F4 после F2.
> 5. **F4** — journal adapters + trends builder typing (`tbga-f4-journal-trends-typing`) — параллельно с F3 после F2.
> 6. **F5** — prod build alignment + turbo cosmetic (`tbga-f5-build-prod-alignment`).
> 7. **F6** — full CI green, PR → `techies68`, archive эпика (`tbga-f6-ci-green-merge`).

---

## Распределение по виртуальной команде

| Фаза | ID | Ответственный | Поддержка | Артефакт |
|------|-----|---------------|-----------|----------|
| **F0** | `tbga-f0-typecheck-honesty` | **Ozhegov** (Структурщик) | **Vesnin** — политика CI | `typecheck`: `tsc -b --noEmit`; `ci.yml` + `CONTRIBUTING.md` |
| **F1** | `tbga-f1-cabinet-project-refs` | **Ozhegov** | — | `apps/cabinet/tsconfig.app.json` references |
| **F2** | `tbga-f2-lib-export-quick-wins` | **Ozhegov** | — | `@membrana/detector-report` export; hub bridges; `NodeConnectionShell` |
| **F3** | `tbga-f3-plugin-live-config-types` | **Ozhegov** | **Dynin** — семантика `LiveModeConfig` | 3 FFT-плагина, harmonic viz, mic-live-drone |
| **F4** | `tbga-f4-journal-trends-typing` | **Ozhegov** | **Dynin** — `TemporalFeatures` / guards | journal adapters, `buildTemplateFromAnalysis`, `electronAPI` |
| **F5** | `tbga-f5-build-prod-alignment` | **Vesnin** | **Ozhegov** — Dockerfile | единая стратегия build; turbo outputs |
| **F6** | `tbga-f6-ci-green-merge` | **Vesnin** | все роли — smoke | PR, `task:archive`, Issue report |
| Smoke (F6) | — | **Музыкант** | **Rodchenko** — UI regressions | mic + journal cards в браузере |

**Порядок ролей (эвристика VIRTUAL_TEAM_PROMPT):**

1. **Vesnin** — LGTM стратегии F0/F5, финальный merge F6.
2. **Ozhegov** — F0–F4 (tsconfig, CI wiring, типы apps).
3. **Dynin** — контракты `LiveModeConfig`, journal report parsing, trends temporal (F3–F4).
4. **Rodchenko** — регресс UI только если затронуты panel/shell (минимально).
5. **Музыкант** — browser smoke перед F6 (не блокер headless CI).

---

## Архитектурный контракт

| Слой | Путь | Правило |
|------|------|---------|
| **Apps typecheck** | `apps/client`, `apps/cabinet` `package.json` | `typecheck` = `tsc -b` (solution build, как первый шаг `build`; `tsc -b --noEmit` несовместим с project references) |
| **Cabinet refs** | `apps/cabinet/tsconfig.app.json` | `"references"` на все `@membrana/*` из `paths`, как у client |
| **Public API** | `packages/libs/detector-report/src/index.ts` | Экспортировать типы, используемые apps (`CepstralFrameRow`, …) |
| **Plugin config** | `apps/client/src/plugins/*` | `LiveModeConfig` — полный объект или helper из `@membrana/fft-analyzer-service` |
| **Journal adapters** | `apps/client/src/modules/telemetry-journal/adapters/*` | Parse/guard, не `Record` → typed cast |
| **Prod build** | `apps/cabinet/Dockerfile`, `package.json#build` | Документировать расхождение или унифицировать после F4 |

**Запрещено:**

- Импорт `dist/` или deep paths других пакетов.
- Отключение `noImplicitReturns` / `strictNullChecks` точечно «чтобы прошло».
- Vite-only build в CI без отдельного typecheck gate.

---

## Фазы и DoD

### F0 — Typecheck honesty + CI gate (M) — Ozhegov

- [ ] `apps/client/package.json`, `apps/cabinet/package.json`: `"typecheck": "tsc -b"`.
- [ ] `.github/workflows/ci.yml`: добавить `techies68` в `pull_request.branches` (и при необходимости `workflow_dispatch`).
- [ ] `docs/CONTRIBUTING.md`: «`yarn dev` ≠ type-safe; перед PR — `yarn turbo run build` или `tsc -b --noEmit` для apps».
- [ ] `yarn workspace @membrana/client typecheck` **падает** с тем же набором ошибок, что `tsc -b` (честный сигнал).

### F1 — Cabinet project references (M) — Ozhegov

- [ ] Скопировать/адаптировать блок `"references"` из `apps/client/tsconfig.app.json` в cabinet (core, detector-report, journal-report-views, media-library, sample-playback, telemetry-journal, trends-detector, audio-engine).
- [ ] После F1: cabinet TS6059/6307 = **0**; остаются только «реальные» ошибки (~как client).

### F2 — Lib export + infra quick wins (S) — Ozhegov

- [ ] `@membrana/detector-report`: export `CepstralFrameRow` из `index.ts`.
- [ ] `mediaLibraryHub.ts`: export `MediaLibraryCaptureStopPayload`.
- [ ] `journalHubBridge.ts`, `mediaLibraryHubBridge.ts`: `ReturnType<typeof setTimeout>` для timer handles.
- [ ] `NodeConnectionShell.tsx`: все code paths return (TS7030).

### F3 — Plugin LiveModeConfig + detector typing (M) — Ozhegov + Dynin

- [ ] `fftIndicesVizPlugin`, `fftThresholdTestPlugin`, `soundQualityVizPlugin`: полный `LiveModeConfig` (`minRMS`, `frequencyRange`) или shared helper.
- [ ] `harmonicDetectorVizPlugin` / `HarmonicDetectorSidebarSettings`: `HarmonicDetector` vs `DroneDetector`; `AnalysisSourceKind` union.
- [ ] `MicLiveDroneAnalysisPanel`, `micLiveDroneAnalysisPlugin`: union `'pending'` или удаление мёртвых сравнений; `null` vs `undefined`.

### F4 — Journal + trends typing (M) — Ozhegov + Dynin

- [ ] `fftThresholdReportFromEntry.ts`: typed parse/guards вместо `unknown` → fields.
- [ ] `droneDetectionReportFromItem.ts`, `droneDetectionBriefFromItem.ts`: validate или `unknown` intermediate cast.
- [ ] `buildTemplateFromAnalysis.ts`: mutable builder / spread (readonly `temporalPatterns`).
- [ ] `userTemplatesPersistence.ts`: единый `Window.electronAPI` declaration merge.

### F5 — Prod build alignment (S) — Vesnin + Ozhegov

- [ ] Решение зафиксировано в `CONTRIBUTING.md` или `apps/cabinet/README.md`: Docker vite-only vs strict `tsc -b && vite build`.
- [ ] (Опционально) после F3+F4: Dockerfile cabinet → `tsc -b && vite build` если зелёный.
- [ ] Turbo cosmetic: `@membrana/tdoa-service#build` outputs — `outputs: []` или stub в package `turbo.json`.

### F6 — CI green + merge (S) — Vesnin

- [ ] `yarn turbo run lint typecheck test build --continue` — **зелёный** на ветке эпика.
- [ ] PR → `techies68`, test plan, ссылка на Issue.
- [ ] **Музыкант:** smoke mic + journal report cards (browser).
- [ ] `yarn task:archive turbo-build-green-apps` + subtasks F0–F6; отчёт в GitHub Issue; Vesnin LGTM.

---

## Каталог ошибок client (reference, ~35 в ~12 файлах)

| Группа | Файлы | Код |
|--------|-------|-----|
| API export | `buildDspCombinedFrameRows.ts` | TS2305 `CepstralFrameRow` |
| LiveModeConfig | `fftIndicesVizPlugin`, `fftThresholdTestPlugin`, `soundQualityVizPlugin` | TS2741/2739 |
| Journal | `fftThresholdReportFromEntry`, `droneDetection*FromItem` | TS2322/2352 |
| Trends builder | `buildTemplateFromAnalysis.ts` | TS2540×11 |
| Harmonic viz | `harmonicDetectorVizPlugin`, `HarmonicDetectorSidebarSettings` | TS2739/2345 |
| Mic live | `MicLiveDroneAnalysisPanel`, `micLiveDroneAnalysisPlugin` | TS2367/2322 |
| Infra | `NodeConnectionShell`, hub bridges, `userTemplatesPersistence`, `mediaLibraryHubBridge` | TS7030/2322/2717/2459 |

---

## Out of scope

- Рефакторинг `@membrana/core` / `@membrana/agenda` контрактов (ветка `vesnin`).
- Новые detector-service или ML-интеграции.
- Полный rewrite journal UI (Rodchenko) — только типы/adapters.
- Исправление pre-existing lint warnings вне затронутых файлов (напр. `TelemetryJournalModule` useMemo) — отдельная S-задача.

---

## Заметки для постановщика

1. GitHub Issue (`wish`): «Turbo build green: client + cabinet typecheck/build parity».
2. Запись эпика + F0–F6 в `docs/tasks/registry.json` (`status: active`).
3. Утром: `yarn main-day-issue` → `primaryFocusId: tbga-f0-typecheck-honesty`.
4. После merge: отчёт в Issue → `yarn task:archive turbo-build-green-apps --notes "PR #…"`.

### Проверка после каждой фазы

```bash
yarn workspace @membrana/client exec tsc -b --noEmit
yarn workspace @membrana/cabinet exec tsc -b --noEmit
# финал:
yarn turbo run lint typecheck test build --continue
```

---

## Связь с дорожной картой

- Закрывает пробел, оставшийся после `trends-go-drone-tight-merge-hardening` R2 (office test green, apps build — нет).
- Блокирует честный merge-gate для `techies68` и scheduled CI (понедельник).
- PR #85 может быть merged по функциональному scope; **этот эпик** — обязательный follow-up для green turbo.
