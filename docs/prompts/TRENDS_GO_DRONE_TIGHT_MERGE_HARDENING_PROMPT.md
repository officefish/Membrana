# Промпт: trends-go-drone-tight — merge hardening (рефакторинг по code-review)

> **Стратегический task-промпт (эпик)** — Cursor IDE / Claude.
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **L** (фазы R1–R5).
> Ветка: **`feat/trends-go-drone-tight`** → merge в **`techies68`**.
> Реестр: `id` = **`trends-go-drone-tight-merge-hardening`** в [`docs/tasks/registry.json`](../tasks/registry.json).
> Вход: [`DAILY_CODE_REVIEW.md`](../DAILY_CODE_REVIEW.md) 2026-06-16; контекст FFT — [`FFT_METRICS_POTENTIAL_AND_LIMITS.md`](./FFT_METRICS_POTENTIAL_AND_LIMITS.md).

---

## Контекст

Ветка `feat/trends-go-drone-tight` завершает цикл после эпика #84 (FFT last-chance):

- `DRONE_TIGHT` в curated template-match (`benchmark:detectors` P 85.5% / R 88.3% / FPR 15%)
- `droneTightCalibration.ts` — единый источник пресета для mic FFT, mic trends, sample-library trends
- offline sample trends (`trends-fft-sample-analyzer`), утренний ритуал под §6 FFT_METRICS

**Вечернее code-review 2026-06-16 не дало LGTM на merge.** Нужен спринт **не на новую детекцию**, а на **архитектурную фиксацию, CI и UI-долг** перед слиянием.

**Уже сделано (не переделывать):**

| Компонент | Путь |
|-----------|------|
| Client facade | `apps/client/src/lib/droneTightCalibration.ts` |
| Curated JSON (package) | `packages/services/detectors/template-match/src/data/curated-drone-templates.json` |
| Curated JSON (benchmark) | `data/detectors-benchmark/v0.2/curated-drone-templates.json` |
| Sample trends offline | `apps/client/src/plugins/trends-fft-sample-analyzer/` |
| Mic trends merge catalog | `mergeDroneTightTrendsTemplates()` в `trendsFftAnalyzerPlugin.ts` |

**Связанные документы:** [`ARCHITECTURE.md`](../ARCHITECTURE.md), [`BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md), [`DETECTOR_BENCHMARK.md`](../DETECTOR_BENCHMARK.md), [`DEVELOPER_RHYTHM.md`](../DEVELOPER_RHYTHM.md).

---

## Промпт целиком (для вставки агенту)

> Ты — координатор виртуальной команды Membrana под руководством **Vesnin**. Доведи `feat/trends-go-drone-tight` до merge-ready по code-review 2026-06-16.
>
> **Цель:** зелёный полный CI, задокументированный контракт DRONE_TIGHT, закрытый долг lint/a11y, PR в `techies68`, архив связанных task-промптов.
>
> **Запрещено:** новые detector-service, повторный «Этап 1.A / benchmark 3 DSP», перенос curated templates в `client/assets`, `new AudioContext()` вне `audio-engine`, прямая регистрация модулей в store.
>
> **Фазы:**
> 1. **R1** — аудит импортов client + § в `ARCHITECTURE.md` (истина шаблонов, граница client vs `background-media`).
> 2. **R2** — CI: починить `@membrana/background-office#test`, убрать turbo warnings; `yarn turbo run lint typecheck test build --continue` зелёный.
> 3. **R5** — client lint: `TrendsTemplateList.tsx` — `useMemo` для `enabledSet`/`allKeys`; a11y toggles analyze/threshold.
> 4. **R4** — (параллельно) одна секция «audio constraints» для mic-live-drone / FFT_METRICS.
> 5. **R3** — PR → `techies68`, `yarn task:archive trends-fft-sample-library-drone-tight`, Vesnin LGTM.

---

## Архитектурный контракт (R1)

| Слой | Источник DRONE_TIGHT | Роль |
|------|----------------------|------|
| **Shipped curated** | `@membrana/template-match-detector-service` JSON + sync `data/detectors-benchmark/v0.2/` | единственная истина чисел и temporal-паттернов |
| **Client** | `droneTightCalibration.ts` | thin facade: дефолты плагинов, `mergeDroneTightTrendsTemplates`, без дублирования порогов |
| **User templates (remote)** | `background-media` trends API | когда включён remote-server; не в client bundle |
| **Journal UI** | `@membrana/journal-report-views` | рендер отчётов; client только композиция |

**Проверка импортов:** `apps/client` → только `@membrana/*-service` и `@membrana/journal-report-views`; ❌ локальные `*.json` trends-data, ❌ `detection-service`.

---

## Фазы и DoD

### R1 — Architecture contract (M)

- [ ] Grep/граф: client не импортирует curated JSON напрямую (только через template-match-service).
- [ ] `ARCHITECTURE.md`: новый подпункт «Detection calibration (DRONE_TIGHT)» — таблица выше.
- [ ] Краткая заметка в `template-match` README: sync с `data/detectors-benchmark/v0.2/`.

### R2 — CI merge gate (M)

- [ ] `yarn workspace @membrana/background-office test` — зелёный (root cause + fix).
- [ ] Turbo: нет ложных «no output files» для harmonic-detector / journal-report-views (package `turbo.json` или документированный cosmetic).
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный на ветке.

### R5 — Trends UI lint + a11y (S–M)

- [ ] `TrendsTemplateList.tsx`: `enabledSet`, `allKeys` в `useMemo` (эталон: `TrendsCreateTemplateFromAnalysis.tsx`).
- [ ] `yarn workspace @membrana/client lint` — 0 warnings в trends-fft panel.
- [ ] Toggle шаблонов / кнопки analyze: `aria-label`, keyboard focus.

### R4 — Audio constraints doc (S, параллельно)

- [ ] Зафиксировать фактический `sampleRate` mic pipeline (browser default vs 48 kHz target).
- [ ] Параграф в `FFT_METRICS_POTENTIAL_AND_LIMITS.md` или README `mic-live-drone-analysis`.

### R3 — PR + archive (S)

- [ ] PR `feat/trends-go-drone-tight` → `techies68`, описание + test plan.
- [ ] `yarn task:archive trends-fft-sample-library-drone-tight` (код уже в ветке).
- [ ] После merge эпика: `yarn task:archive trends-go-drone-tight-merge-hardening`.

---

## Out of scope

- Unified benchmark harmonic / cepstral / spectral-flux (см. FFT_METRICS §6).
- Перенос curated templates в `background-media` (отдельный эпик remote trends).
- Нейро / эшелон 2.
- Stage-gate 85/90 через одиночные DSP.

---

## Порядок ролей

1. **Teamlead (Vesnin)** — LGTM контракт R1, финальный merge sign-off.
2. **Структурщик (Ozhegov)** — R1 аудит, R2 CI, Docker sanity.
3. **Верстальщик (Rodchenko)** — R5 lint/a11y.
4. **Математик (Dynin)** — сверка метрик в DETECTOR_BENCHMARK после merge (R4 опционально).
5. **Музыкант** — smoke mic + sample-library trends в браузере перед R3.

---

## Заметки для постановщика

- GitHub Issue (wish): «Merge hardening: feat/trends-go-drone-tight по code-review 2026-06-16».
- Зависит от завершённой реализации в ветке (commits через `700841f`).
- `trends-fft-sample-library-drone-tight` — код готов; архив в R3, не блокирует R1/R2.
