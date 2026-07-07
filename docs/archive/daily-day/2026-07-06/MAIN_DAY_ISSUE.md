<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-06
  archived-at: 2026-07-07T03:55:01.329Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-06T04:18:13.189Z (yarn main-day-issue) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: single-node-detection-first, real-dataset-live-calibration, media-library-a3-mic-recorder, media-library-a4-sample-player, trends-fft-template-editor, background-media-v1, background-media-a5a-server, background-media-a5b-docker, background-media-a5c-deploy, sample-library-drone-detection, sld3-dsp-detectors-free-v1, sld4-stage-gate-calibration, live-parallel-detection-sprint, lp1-mic-drone-stream-modes, lp1b-drone-detailed-report-server, lp2-fft-plugins-journal-sink, lp3-track-import-backpressure, lp4-parallel-detection-smoke, lp5-journal-report-renderers, device-board-hackathon-1, db-h1b-board-shell, db-h1c-graph-serialize, db-h2a-json-import, db-h2b-scenario-runtime, db-h2c-mic-journal, db-h2d-cabinet-sync, db-h3a-trigger-stop, db-h3b-trigger-disconnect, db-h3c-subgraph, db-h4-alarm-close, membrane-node-realtime-gateway, membrane-node-realtime-nr0-contract, membrane-node-realtime-nr1-gateway, membrane-node-realtime-nr2-journal-ws, membrane-node-realtime-nr3-client-journal, membrane-node-realtime-nr4-mic-live, membrane-node-realtime-nr5-cabinet-live, membrane-node-realtime-nr6-prod-hardening, membrane-node-runtime-remote, mp7b-rt0-contract, mp7b-rt1-gateway, mp7b-rt2-client-runtime, mp7b-rt3-mode, mp7b-rt4-multinode-schema, mp7b-rt5-cabinet-nodes, mp7b-rt6-board-ux, mp7b-rt7-prod-hardening, deploy-pipeline-refactor, dpr-dr0-git-hygiene-gate, dpr-dr1-ci-gate, dpr-dr2-image-registry, dpr-dr3-rollback-runbook, dpr-dr4-smoke-suite, dpr-dr5-branch-migration-policy, dpr-dr6-client-delivery, dpr-dr7-zero-downtime, device-board-refactor-v04, dbr-0-concept-core, dbr-1-fullscreen, dbr-2-variables, dbr-3-event-node, dbr-4-dataflow-resolve, dbr-5-palette-nodes, dbr-6-run-gating, db-doc-v04-mvp, db-post-usercase-roadmap, usercase-mvp-v2-groups-async, ucv2-0-spec-lgtm, ucv2-1-graph-collapse, ucv2-2-freeze-async-tracks, ucv2-3-pack-verify, ucv2-4-operator-signoff, device-board-phase-3, db-p3-a1-usercase-catalog-service, db-p3-a2-runtime-validators, db-p3-a3-competition-restrictions, db-ap-r1-core-contracts, db-ap-r2-core-sequence-latent, db-ap-r3-async-job-store, db-ap-r4-sequence-latent-runtime, db-ap-r5-promise-nodes-editor, db-ap-r6-promise-nodes-executor, db-ap-r7-host-bridge-jobs, db-ap-r8-detached-event-dispatch, db-ap-r9-mvp-graph-v2, db-ap-r10-agenda-async-hub, db-ap-r11-observability-tests, db-ap-r12-docs-signoff, opencode-proxy-sprint-2026-06-25, oc-proxy-s0-research-isolation, oc-proxy-s1-opencode-install, oc-proxy-s2-freemodel-keys, oc-proxy-s3-llm-proxy-script, oc-proxy-s4-opencode-config, comp-packaging-catalog-2026-06-25, device-board-three-hosts-2026-06-26, ci-gate-stabilization, cg2-two-tier-test-gate, cg3-flaky-metrics-week, cg4-ci-testing-docs, db3h-s2-cabinet-host, db3h-s5-desktop-logging, db3h-s4-microphone-detectors, device-board-server-first, db-sf-0-canon, db-sf-1-core-contracts, db-sf-2-gateway-board, db-sf-3-cabinet-lease-api, db-sf-4-client-follower, db-sf-5-board-flags-ui, db-sf-6-nodes-runtime, db-sf-7-last-track-preview, db-sf-8-tests-smoke, db-sf-9-docs-sync, neural-tier-1b-contract, neural-free-tier-dataset-report, rag-dual-circuit-v1, rag-r6-closure, rag-r7-optional, fv1-s2-closeout, db-scenario-selector, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, vdr-label-roundtrip-night-build, nb-vlr-0-gate, nb-vlr-1-labels-export-ui, nb-vlr-2-labels-merge-script, nb-vlr-3-library-label-filter, nb-vlr-4-docs, pl2b-node-heartbeat, pcb-d2-multinode, comms-sandbox-docs-adaptation, cd-1-topology-variant-a, cd-2-live-canon-not-copies, cd-3-hook-reuse-tone-guard, cd-4-sandbox-seam-relationship, cd-5-precision-refs, cd-6-placement-registration -->

# MAIN_DAY_ISSUE — 2026-07-06

**Дата:** 2026-07-06 | **Координатор:** Vesnin (Teamlead)
**Время генерации:** ~08:00 UTC | **Статус:** Active
**Источники входных данных:** DAILY_STANDUP.md (06.07), STRATEGIC_PLAN_DAY.md, FFT_METRICS_POTENTIAL_AND_LIMITS.md (#84), DAILY_CODE_REVIEW.md (05.07 вечер), registry

---

## 🔴 **ЕДИНСТВЕННЫЙ ОБЯЗАТЕЛЬНЫЙ ФОКУС ДНЯ**

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│ ⚡ DRONE_TIGHT → CURATED TEMPLATE-MATCH + BENCHMARK v0.3       │
│                                                                │
│ 🎯 Магистраль: детекция возвращается на рельсы                │
│    (разворот после 2-дневного дрейфа в comms)                 │
│                                                                │
│    Ведёт: Математик (Dynin) — весь день ведущий               │
│    Страхует границы: Структурщик (Ozhegov)                    │
│    LGTM stage-gate: Teamlead (Vesnin)                         │
│    Размер: M+M (задачи A + B), ~09:00–14:00                    │
│    Блокирует: подготовку hard-gate 1→2                        │
│                                                                │
│ 📦 Параллельно (после контрактов A):                          │
│    • C: Live-калибровка trends-fft (Верстальщик + Музыкант)   │
│    • D: Разведка zero-shot контракта (Математик + Структ.)    │
│    • E: Граница транспортного слоя (Структурщик + Teamlead)   │
│                                                                │
│ 🟢 ФАЗА 0 (08:00–09:00): гигиена дерева + зелёный client      │
│    Ответ: Структурщик (Ozhegov) + Верстальщик (Rodchenko)     │
│    DoD: снапшот 2026-07-05 закоммичен/игнор; client green     │
│                                                                │
│ ⚪ Фон (по остатку): F comms-долг CD1 · #34 FFT edge-docs      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Одна фраза:** сегодня магистраль — **детекционная**: `DRONE_TIGHT` в curated-каталог + переснятый `benchmark:detectors` v0.3; comms уходит в фоновую полосу. Это прямой ответ на вечерний feedback «один канон = одна реальная работа».

---

## 📊 Синтез входных сигналов

| Источник | Главный вывод | Действие сегодня |
|----------|---------------|------------------|
| **DAILY_CODE_REVIEW** (05.07) | T0 LGTM; runtime не тронут; untracked снапшот `daily-day/2026-07-05/` | ФАЗА 0: закоммитить/игнорировать снапшот; нет `.txt` в корне |
| **STRATEGIC_PLAN_DAY** | Дрейф 2-й день; магистраль = DRONE_TIGHT промоушен + hard-gate подготовка | Приоритет **A→B→C**, разведка **D/E**, comms **F** — по остатку |
| **FFT_METRICS (#84)** | Эшелон 0 исчерпан; потолок = trends `DRONE_TIGHT` 95%/30% | НЕ повторять DSP-бенчмарк free-v1; только промоушен tight-шаблона |
| **DAILY_STANDUP** (06.07) | Разворот к детекции; Математик — ведущий дня | Календарная развёртка A→B→C→D/E→F |
| **registry** | Продуктовых блокеров детекции нет; открытое — intern/deploy/device-board | В фон; #34 (FFT edge-docs) попутно к A |

---

## 🕐 Календарный план дня

### **ФАЗА 0: Блокирующая утренняя синхронизация (08:00–09:00)**

**Ответственные:** Ozhegov (Структурщик) + Rodchenko (Верстальщик)

```bash
# 1. Гигиена дерева — untracked снапшот вчерашнего вечера
git status                                    # ожидаем: docs/archive/daily-day/2026-07-05/
git add docs/archive/daily-day/2026-07-05/    # осознанный снимок → коммит
#   (или .gitignore, если снапшоты не версионируем)

# 2. Нет .txt-логов в корне
git status --porcelain | grep -E '\.txt$' && echo "⚠ убрать в %TEMP%/docs/archive" || echo "✓ clean"

# 3. Зелёный клиент перед runtime-работой
yarn turbo run lint typecheck test --filter=@membrana/client
```

**DoD к 09:00:**
- ✅ Рабочее дерево чистое (снапшот закоммичен/проигнорирован, нет `.txt` в корне)
- ✅ `@membrana/client` lint/typecheck/test зелёные
- ✅ **Все 5 ролей прочитали этот MAIN_DAY_ISSUE.md + DAILY_STANDUP.md**

**Если блокер:** ⏸ остановить магистраль, эскалация к Teamlead.

---

### **ФАЗА 1: Магистраль — задача A (09:00–11:00)**

**`DRONE_TIGHT` → curated template-match**
**Ответственные:** Dynin (Математик, ведёт) + Ozhegov (Структурщик, границы)
**Размер:** M

**Артефакт:** `DRONE_TIGHT` в curated-каталоге `@membrana/template-match-detector-service`.

```
DRONE_TIGHT:
  spectral: centroid 2900–4300, flux 0.03–0.16, rms 0.07–0.28, frameHitRatio 0.6–1.0
  temporal: activityRatio 0.8–1.0, centroidStd 0–400,
            longTermStability [high, veryHigh], volumeTrend [stable], frequencyTrend [stable]
  scoring:  spectralWeight 0.3, temporalWeight 0.7, minConfidence 35
```

**DoD:**
- ✅ `DRONE_TIGHT` + системные не-дрон конкуренты в curated-каталоге
- ✅ Границы `detectors/*` соблюдены: только `detector-base` + `core` + `audio-engine` (типы окна); **никаких прямых связей плагинов**
- ✅ Unit-тесты скоринга (spectral 0.3 / temporal 0.7) зелёные
- ✅ Числа сверены с FFT_METRICS §3 (p10–p90 бокс)

---

### **ФАЗА 2: Магистраль — задача B (11:00–14:00)**

**`benchmark:detectors` v0.3 с trends/DRONE_TIGHT**
**Ответственные:** Dynin (Математик, ведёт) + Vesnin (Teamlead, LGTM на stage-gate таблицу)
**Размер:** M

**DoD:**
- ✅ Прогон включает trends+`DRONE_TIGHT` (не только одиночные DSP)
- ✅ recall/FPR/F1 на `val` ≈ **95% / 30% / 0.844** (совпадение с FFT_METRICS §4) **или расхождение объяснено**
- ✅ `DETECTOR_BENCHMARK.md` обновлён: датасет (free-v1 / val) + дата + trends-строка
- ✅ Hard-gate статус зафиксирован: цель P≥85%/R≥90% пока **НЕ достигнута** (precision trends на val ≈ 0.76 → требует VDR validation)

> **Разрешено:** это пересъёмка со **сменой конфигурации** (trends+tight).
> **Запрещено:** повтор free-v1 DSP-бенчмарка harmonic/cepstral/spectral-flux — эшелон 0 исчерпан (FFT_METRICS §6).

---

### **ФАЗА 3: Параллельные треки (после контрактов A, ~13:00–16:00)**

#### **C — Live-калибровка trends-fft (sample-library)** · M
**Ответственные:** Rodchenko (Верстальщик, ведёт UI) + Kuryokhin (Музыкант, пресеты)
- ✅ Плагин `trends-fft-analyzer` через `MembranaRegistry.registerPlugin` (не прямой store)
- ✅ **Никаких** `new AudioContext()` / `getUserMedia` вне engine (ARCHITECTURE §1b); бизнес-логика не в JSX
- ✅ Ручной прогон → визуализация попадания в `DRONE_TIGHT` бокс + вердикт

#### **D — Разведка zero-shot контракта (CLAP/YAMNet)** · S (без реализации)
**Ответственные:** Dynin (Математик) + Ozhegov (Структурщик) + Vesnin (go/no-go)
- ✅ Зафиксировано: реализует ли zero-shot тот же `DroneDetector`/`DetectionResult`
- ✅ Веса — внешний npm/asset; границы `detectors/*` не ломаются
- ✅ Если картина неясна — явные разведочные шаги (данные, инференс-рантайм)

#### **E — Граница транспортного слоя** · S (фиксация, не реализация)
**Ответственные:** Ozhegov (Структурщик, ведёт) + Vesnin (LGTM)
- ✅ Таблица: PCB-функция (link-state, health-ping, presence) → текущее место → целевое (foundation `transport-service` vs `background-cabinet`)
- ✅ Явно: **Этап 2 заморожен** — это фиксация границы, не реализация

---

### **ФАЗА 4: Фоновая полоса (по остатку ёмкости)**

| # | Задача | Роль | Размер | DoD |
|---|--------|------|--------|-----|
| **F** | Comms-долг CD1: адаптация baseline-документов | Teamlead координирует | S | Хотя бы RUNBOOK/CHECKLIST под Вариант A; `check:boundaries` leaf-zero зелёный |
| попутно | #34 FFT edge-cases в JSDoc/README fft-analyzer | Математик | XS | Документируется вместе с касанием math-ядра в A |

---

## 🚫 Что НЕ делаем сегодня (антидрейф)

- ❌ **Повторный DSP-бенчмарк** harmonic/cepstral/spectral-flux на free-v1 — эшелон 0 исчерпан (FFT_METRICS §6), вердикт зафиксирован. Разрешена только пересъёмка со сменой конфигурации (trends+tight, задача B).
- ❌ **Повторный тюнинг порогов DSP** «ещё раз прогнать» — no-go.
- ❌ **`tdoa-service` / `localizer-service` / `tracker-service`** — Этапы 2–4 заморожены до stage-gate 1→2.
- ❌ **Полная реализация `transport-service`** — только фиксация границы (E).
- ❌ **Расширение comms-контура** новыми фичами сверх адаптации baseline — уже помечено как дрейф.
- ❌ **Ориентация на `CURRENT_TASK.md`** — буфер устарел (30.06), при конфликте проигрывает этому файлу и реестру.

---

