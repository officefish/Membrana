<!-- Сгенерировано: 2026-07-03T04:55:53.506Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (17), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# ☀️ ЕЖЕДНЕВНЫЙ СТЕНДАП — 2026-07-03

**Время**: 08:00 UTC | **Период**: последние 24 ч (с 2026-07-02 04:00)  
**Координатор**: Vesnin (Teamlead) | **Источники**: DAILY_CODE_REVIEW (вчер.), STRATEGIC_PLAN_DAY, GitHub Issues, packages/temp

---

## 📌 Вчерашний вечер: Code Review & Merge Status

### ✅ Завершено (Device Board Capture Tariff v2)

**Спринт:** `feat/db-capture-tariff-v2-integration` (CT0–CT9) → **готов к merge в main**

| Компонент | Status | Notes |
|-----------|--------|-------|
| **@membrana/core** (CT1) | ✅ | Контракты board.capture/heartbeat/release реализованы |
| **background-cabinet** (CT2) | ✅ | DeviceCaptureService + REST API ready |
| **apps/cabinet** (CT3) | ✅ | UI Захватить/Отпустить, WS broadcast |
| **apps/client** (CT4) | ✅ | serverFirstStore, TTL-таймер 5m |
| **packages/audio-engine** (CT6) | ✅ | fadeOutMs в BufferPlayer, остановка вытеснённого |
| **device-board** (CT5) | ✅ | CaptureAlertToasts, badges v2 |
| **Docs** (CT9) | ✅ | ARCHITECTURE v2, DEVICE_BOARD_CAPTURE_TARIFF_V2_SMOKE.md |

**Code Review артефакты (CT7, CT8, CT9):** 7 коммитов назад, no new runtime changes.  
**Test Status:** 68/68 pass, lint green, **нет P0/P1**.

---

## 🎯 Сегодняшний стратегический план (вчерашний STRATEGIC_PLAN_DAY)

### Приоритет 1: Stabilization & Validation

**Task 4.1** — CI-gate stabilization (CG1–CG3)
- Flaky-тесты в GitHub Actions
- Pull request feat/ci-gate-flaky-fix требуется

**Task 4.2** — DETECTOR_BENCHMARK.md обновление
- Зафиксировать FFT_METRICS §4–6 как контекст
- Таблица: trends-DRONE_TIGHT vs harmonic/cepstral/flux результаты

### Приоритет 2: Trends-DRONE_TIGHT → Curated Catalog

**Task 4.3** — Интеграция trends-DRONE_TIGHT в background-media  
- Prisma-модель TrendTemplate
- REST-endpoint `/trends-templates` (cached)
- `yarn benchmark:detectors` переснят

**Task 4.4** — TrendCalibrationPanel (live-калибрация на микрофоне)
- Компонент с слайдерами centroidMin/Max, fluxMin/Max, rmsMin/Max
- Live-график спектральных метрик + попадание в бокс

### Приоритет 3: Scaffold Эшелона 2 (нейро)

**Task 4.5** — `@membrana/clap-detector-service` scaffold  
- CLAP-инференс из Hugging Face
- Контракт DroneDetector реализован
- Unit-тесты + latency p95 < 500ms

**Task 4.6** — `@membrana/yamnet-detector-service` scaffold  
- YAMNet zero-shot, классификация в мультиклассе
- Адаптер в detector-report

### Приоритет 4: Документирование

**Task 4.7** — WHITE_PAPER §9 SNR-таблица  
- Сценарии: открытое поле / город днём / ночью / дождь
- Требуемый SNR для детекции дрона

---

## 🔴 Блокеры вчерашних дневных операций (DAILY_CODE_REVIEW)

### ❌ Блокер 1: yarn lint typecheck в @membrana/client

```
status: REQUIRES FIX (until 09:00)
severity: P0
command: yarn turbo run lint typecheck --filter='@membrana/client' --fix
```

**Причина:** Untracked typecheck errors после CT4 интеграции.  
**Action:** Структурщик (Ozhegov) + Верстальщик (Rodchenko) исправляют в 06:00–09:00.

### ❌ Блокер 2: Tests в @membrana/research-tree-demo

```
status: REQUIRES FIX (until 09:00)
severity: P0
command: yarn turbo run test --filter='@membrana/research-tree-demo'
```

**Причина:** Broken imports после рефакторинга (CT3 UI).  
**Action:** Структурщик (Ozhegov) — диагностика и fix.

### ⚠️ Блокер 3: Untracked mjs-timestamps в packages/services

```
status: MINOR (cleanup)
severity: P2
файлы: packages/services/**/*.mjs.timestamp, deploy-*.txt
```

**Причина:** VPS-логирование (Постмортем #94).  
**Action:** Git-гигиена перед merge в main (все .txt логи в %TEMP%, не в root).

---

## 📊 Открытые GitHub Issues (приоритет ≥ 3)

### 🔥 Hot Issues (Блокирующие)

| # | Название | Статус | Роль | Действие |
|---|----------|--------|------|----------|
| **#197** | Intern T3: ресёрч-дайджест (Perplexity) | 🟡 TODO | Структурщик | Определить тему & yarn-команду |
| **#196** | Intern T2: /health + /ready endpoints | 🟡 TODO | Структурщик | Scaffold NestJS endpoints |
| **#195** | Intern T1: outbound self-check | 🟡 TODO | Математик | Пинг api.anthropic, Linear, GitHub |
| **#187** | headroom proxy-perf замер (C6 of #186) | 🟡 待机 | Структурщик | Запустить Claude Code через proxy |
| **#95** | Device-Board Refactor v0.4 (DBR0–DBR6) | 🟡 Active | Teamlead | §1–3 variables/Event/fullscreen |
| **#94** | Deploy детерминированность & откат | 🟠 Planning | Структурщик | CI-gate + smoke suite |
| **#92** | MP7: Node Realtime Gateway (NR0–NR6) | 🟠 Planning | Структурщик | WSS для journal+mic-live |
| **#59** | Deploy background-media to prod (A5c) | 🟠 Planning | Структурщик | VPS TLS + DNS |
| **#58** | background-media v1 (A5a–A5d) | 🟠 Phases | Структурщик | API/Docker/Deploy |
| **#57** | Редактор trends-fft шаблонов | 🔵 Backlist | Верстальщик | CRUD UI для classifyTrends |
| **#49** | MicrophoneCapturePanel | 🔵 Backlist | Верстальщик | Выразительный UI захвата |
| **#34** | FFT edge cases docs | 🔵 Nice-to-have | Математик | JSDoc контрактов |

---

## 📦 Наброски в packages/temp (статус)

### Активные наброски

```
packages/temp/
├── sketch-vdr-protocol.md           (VDR-protocol draft → STRATEGIC_PLAN 4.2)
├── sketch-zero-shot-service.ts      (CLAP scaffold → STRATEGIC_PLAN 4.5)
├── sketch-trends-calibration-ui.tsx (TrendCalibrationPanel → STRATEGIC_PLAN 4.4)
├── sketch-stage-gate-1-to-2.md      (Stage-gate doc → STRATEGIC_PLAN 4.7)
└── sketch-ci-gate-flaky-fix.yml     (GitHub Actions → STRATEGIC_PLAN 4.1)
```

**Что делать:** Превратить в PR-артефакты в порядке приоритета (§ ниже).

---

## 🚀 ЕДИНЫЙ ПЛАН НА СЕГОДНЯ (консолидированный)

### **ФАЗА 1: Утренняя стабилизация (06:00–09:00)**

```bash
# КРИТИЧНОЕ: зелёный статус до основной работы
yarn turbo run lint typecheck --filter='@membrana/client' --filter='@membrana/research-tree-demo' --fix
yarn turbo run test --filter='@membrana/client' --filter='@membrana/research-tree-demo'

# Git-гигиена
git status  # → no .txt-логов, только tracked files
rm -f packages/**/*.mjs.timestamp deploy-*.txt  # если есть

# Merge в main (когда зелено)
git checkout main && git pull origin main
git merge --ff-only feat/db-capture-tariff-v2-integration
git push origin main

# Smoke-тест CT4+CT6 (audio-engine + client)
yarn turbo run test --filter='@membrana/audio-engine' --filter='@membrana/client'

# Архив спринта DB-Capture-Tariff-v2
yarn task:archive db-capture-tariff-v2
```

**DoD к 09:00:**
- ✅ Lint/typecheck/test pass
- ✅ Main зелёный, ветка merged
- ✅ Спринт архивирован

---

### **ФАЗА 2: Магистраль (09:00–14:00) — VDR-Protocol**

**Lead:** Vesnin (TL) + Ozhegov (Структурщик)  
**Размер:** L (5 ч)

#### 09:00–11:00: `docs/VDR_PROTOCOL.md` (2 ч)

```markdown
# VDR Protocol: Validated Drone Recognition

## 1. Обзор
- Размеченный корпус free-v1 (ручные лейблы drone/not-drone)
- Цель: валидация детекторов для stage-gate P≥85% R≥90%
- Фазы: pilot (20–30) → alpha (100+) → beta (200+)

## 2. Процесс аннотации
- Инструмент: HTML-UI + прослушивание WAV + radios drone/not-drone
- Консенсус: 2+ аннотатора → Cohen's Kappa ≥0.75
- Метаданные: source, datetime, SNR, confidence

## 3. Переоценка детекторов
- Train 60% / val 20% / test 20%
- yarn benchmark:detectors --dataset vdr
- P, R, F1 для каждого

## 4. Gate решение
- Если P≥85% R≥90% → ПРОЙДЕН → разморозить TDOA
- Если нет → ensemble или zero-shot
```

#### 11:00–13:00: Скрипты валидации (2 ч)

```bash
# 1. validate-vdr-labels.mjs
yarn validate:vdr --dataset free-v1-validated
# Output: { total_samples, labeled_samples, kappa_score, disputed_count, comparison_table }

# 2. prepare-vdr-annotations.mjs
yarn prepare:vdr-ui --output docs/datasets/free-v1/annotation-ui.html

# 3. CI-гейт (git commit, не в CI ещё)
cat > .github/workflows/vdr-validate.yml
```

**DoD к 14:00:**
- ✅ docs/VDR_PROTOCOL.md завершён
- ✅ `yarn validate:vdr` работает без ошибок
- ✅ `yarn prepare:vdr-ui` генерирует HTML
- ✅ CI-гейт зарегистрирован (dry-run)

---

### **ФАЗА 3: Параллель A (13:00–15:00) — Zero-shot Scaffold**

**Lead:** Ozhegov (Структурщик) + Dynin (Математик)  
**Размер:** L (2 ч)

#### 13:00–13:30: Выбор модели

```bash
# CLAP v2 от Hugging Face
# Link: https://huggingface.co/laion/clap-htsat-unfused
# Size: ~170 МБ
# Docs: Обновить docs/prompts/INTEGRATIONS_STRATEGY.md
```

#### 13:30–14:30: Scaffold пакета

```bash
mkdir -p packages/services/detectors/zero-shot-detector/{src,__tests__}
```

**Структура:**
```
src/
├── index.ts
├── service.ts (stub ZeroShotDetector implements DroneDetector)
├── types.ts (ZeroShotDetectionResult extends DetectionResult)
└── __tests__/service.spec.ts (smoke test)
```

#### 14:30–15:00: CI + PR

```bash
yarn turbo run build --filter='@membrana/zero-shot-detector'
yarn turbo run test --filter='@membrana/zero-shot-detector'

git commit -am "feat: scaffold @membrana/zero-shot-detector (CLAP)"
git push origin feat/zero-shot-detector-scaffold
# → открыть PR, marked @experimental @stage2
```

**DoD к 15:00:**
- ✅ Пакет компилируется без ошибок
- ✅ Unit-тесты pass
- ✅ PR открыт

---

### **ФАЗА 4: Параллель B (14:00–15:30) — Stage-gate Documentation**

**Lead:** Vesnin (TL)  
**Размер:** S (1.5 ч)

```markdown
# docs/STAGE_GATE_1_TO_2.md

## Definition: P≥85% R≥90%

| Детектор | P | R | F1 | Status |
|----------|---|---|-----|--------|
| Trends DRONE_TIGHT | 76% | 95% | 0.844 | 🟡 soft-pass |
| Требуемый | **≥85%** | **≥90%** | — | hard-gate |

## Чек-лист

- [ ] VDR-pilot готов (≥20 сэмплов)
- [ ] Cohen's Kappa ≥0.75
- [ ] Переоценка даёт P≥85% R≥90%
- [ ] Консилиум согласен

## Что заморожено

- ❌ @membrana/tdoa-service
- ❌ @membrana/localizer-service
- ❌ @membrana/tracker-service
```

**DoD к 15:30:**
- ✅ Документ завершён
- ✅ Связан с WHITE_PAPER §8
- ✅ Сохранён в git

---

## 📋 Definition of Done (день)

```
УТРО (06:00–09:00):
  ✅ yarn turbo run lint typecheck --fix pass на @membrana/client и @membrana/research-tree-demo
  ✅ yarn turbo run test pass
  ✅ feat/db-capture-tariff-v2-integration merged в main
  ✅ Git дерево чистое (no .txt-логов, no untracked files)

ДЕНЬ (09:00–15:30):
  ✅ docs/VDR_PROTOCOL.md завершён (200–300 строк)
  ✅ scripts/validate-vdr-labels.mjs работает: yarn validate:vdr pass
  ✅ scripts/prepare-vdr-annotations.mjs работает: yarn prepare:vdr-ui генерирует HTML
  ✅ @membrana/zero-shot-detector scaffold компилируется без ошибок
  ✅ yarn turbo run test --filter='@membrana/zero-shot-detector' pass
  ✅ docs/STAGE_GATE_1_TO_2.md готов (связан с WHITE_PAPER)
  ✅ Три PR открыты (VDR + zero-shot + stage-gate docs)

ВЕЧЕР (17:00–18:00):
  ✅ yarn ritual:evening выполнен (archival + code-review)
  ✅ DAILY_CODE_REVIEW.md готов на завтра
  ✅ WHITE_PAPER §8 обновлён (ссылка на STAGE_GATE_1_TO_2)
```

---

## 🔒 Что НЕ делаем сегодня

1. **Не открываем новые детекторные спринты** без VDR-валидации.
2. **Не трогаем TDOA/Localizer/Tracker** до stage-gate 1→2.
3. **Не начинаем Studio App спринт** — заморожен после консилиума 2026-07-02.
4. **Не переснимаем harmonic/cepstral/flux бенчмарки** без новых данных.

---

## 📊 Риски дня

| Риск | Probability | Mitigation |
|------|-------------|-----------|
| Lint/test failures в CT4+CT6 продлены после merge | High | Фаза 1 — раннее обнаружение (06:00) |
| VDR-protocol требует консилиума → время | Medium | Черновик готов в packages/temp |
| Zero-shot scaffold упирается в Hugging Face SDK | Low | Dynin подготовил CLAP link, fallback — stub |
| Stage-gate doc требует пересмотра WHITE_PAPER | Low | Прямая линия к Vesnin, можно async |

---

## 📞 Консилиум (если нужен)

**Опциональный запрос:**
```bash
yarn consilium "уточнить VDR scope и stage-gate criteria перед фиксацией в docs"
# Протокол → docs/seanses/vdr-and-stage-gate-consilium-2026-07-03.md
```

---

## 🎯 Итоговый артефакт дня

```
📁 git commits (к концу дня):
  ├── docs/VDR_PROTOCOL.md (commit: "docs: add VDR protocol spec for validated drone recognition")
  ├── scripts/validate-vdr-labels.mjs (commit: "feat: add validate:vdr command for Cohen's Kappa check")
  ├── scripts/prepare-vdr-annotations.mjs (commit: "feat: add prepare:vdr-ui command for annotation HTML")
  ├── packages/services/detectors/zero-shot-detector/ (commit: "feat: scaffold @membrana/zero-shot-detector (CLAP)")
  └── docs/STAGE_GATE_1_TO_2.md (commit: "docs: define stage-gate 1→2 criteria for production")

📁 PRs (в review):
  ├── PR#xxx: "feat: VDR protocol + validate/prepare scripts" (VDR_PROTOCOL.md + 2 скрипта)
  ├── PR#xxx: "feat: scaffold @membrana/zero-shot-detector (zero-shot CLAP)" (@experimental)
  └── PR#xxx: "docs: stage-gate 1→2 definition & checklist" (docs only)

📁 Archives (вечер):
  └── docs/archive/daily-day/2026-07-03/{
        STRATEGIC_PLAN_DAY.md,
        DAILY_STANDUP.md (этот файл),
        MAIN_DAY_ISSUE.md
      }
```

---

**Статус координатора**: 🟢 Готово к исполнению  
**Горизонт**: 12 часов операционного времени (06:00–18:00 UTC)  
**Приоритет**: Магистраль (VDR) → Параллели (zero-shot + stage-gate)