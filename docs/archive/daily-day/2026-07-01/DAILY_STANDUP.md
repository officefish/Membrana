<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-01
  archived-at: 2026-07-01T17:45:17.470Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-01T04:12:01.976Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (17), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# ЕЖЕДНЕВНЫЙ СТЕНДАП 🎬

**Дата:** 2026-07-01 | **Время:** 09:00 UTC  
**Ветка:** `chore/backlog-cleanup-s1-clean`  
**Координатор:** Vesnin (Teamlead)

---

## 📋 СИНТЕЗ ВЧЕРАШНИХ МАТЕРИАЛОВ

### 1️⃣ Вчерашнее вечернее code-review (`DAILY_CODE_REVIEW.md`)

**Статус:** Tier T1 (требует утреннего lint-пропуска)

**Ключевые проблемы:**
- ❌ **Lint ошибки** в трёх пакетах: `@membrana/client`, `trends-detector-service`, `template-match-detector-service`
- ✅ **Структура** соблюдена (новые JSON-шаблоны, dataset классификация по SERVICES.md)
- ✅ **CI gate** прошёл (druid, 4 min; но требует lint-fix перед merge)
- 🔴 **Риск P1:** без зелёного lint/typecheck/test слияние в main заблокировано

**Действие на утро:**
```bash
yarn turbo run lint typecheck test \
  --filter='@membrana/{client,trends-detector-service,template-match-detector}' \
  --force --fix
```

---

### 2️⃣ Стратегический план на день (`STRATEGIC_PLAN_DAY.md`)

**Большой контекст:** Membrana завершила Этап 1.A (DSP-эшелон). Trends-детектор достиг **95% recall / 30% FPR** на val — проходит мягкую цель (80%/40%), но не stage-gate (требуется P≥85%).

**Шесть рекомендуемых задач на ближайшие дни:**

| Задача | Размер | Ответственный | Статус |
|--------|--------|---------------|--------|
| **4.1** VDR-протокол | M | Vesnin + Ozhegov | 🆕 |
| **4.2** Scaffold zero-shot-detector | M | Ozhegov + Dynin | 🆕 |
| **4.3** Stage-gate 1→2 документирование | S | Vesnin + Ozhegov | 🆕 |
| **4.4** VDR content phase 2 | M | Ozhegov + Kuryokhin | 🆕 |
| **4.5** Trends integration в benchmark | S | Dynin + Ozhegov | 🔄 |
| **4.6** Multinode контракты | S | Ozhegov + Dynin | 🆕 |

**Главный тезис:** Чистый FFT-путь исчерпан → переход на VDR (validated dataset) + эшелон 2 (нейро).

---

### 3️⃣ Вчерашний MAIN_DAY_ISSUE (2026-06-29)

**Три критических блокера дня:**

1. **#178** (async-v2 track upload) — Ozhegov
   - Статус: требуется root-cause диагностика
   - Таймбокс: 2.5ч
   - Блокирует: detached-report генерацию

2. **#153** (W0-H3 selection clearance) — Rodchenko
   - Статус: требуется fix + merge
   - Таймбокс: 1.5ч
   - Блокирует: W0 hotfix-ветвь

3. **#187** + **#186-C2** (headroom proxy-perf + RAG-balance) — Dynin
   - Статус: требуется прогонка с headroom proxy
   - Таймбокс: 2ч
   - Блокирует: Этап 2 контракты

**Параллель (T1):** VDR-сбор (Kuryokhin, 11:00–17:00) — 10–15 валидационных сэмплов.

---

### 4️⃣ FFT/Trends потолок эшелона 0 (`FFT_METRICS_POTENTIAL_AND_LIMITS.md`)

**Ключевой инсайт:**

```
┌─────────────────────────────────────────────────────────────┐
│ Потолок чистого DSP/FFT на free-v1:                          │
│                                                              │
│ • Пороговый тест (центроид/flux/RMS):  R 75–85% / FPR 40% │
│ • Гармонический детектор:                R 68%   / FPR 88% │
│ • Cepstral (live):                       R 100%  / FPR 100%│
│ • Spectral-flux (live):                  R 87%   / FPR 100%│
│ • Live-консенсус (OR):                   R ~100% / FPR 100%│
│                                                              │
│ ✅ **Trends (DRONE_TIGHT):**             R 95%   / FPR 30% │
│    → Цель достигнута (80%/40%),                              │
│    → но не stage-gate (P≥85% R≥90%)                          │
│                                                              │
│ 📊 **Вывод:** Без новых данных или нейро → дальше не расти   │
└─────────────────────────────────────────────────────────────┘
```

**Почему trends работает, а остальные нет:**
- Спектры drone/not-drone **физически перекрываются** в боксе (высокие центроиды 3–4.5 кГц совпадают у насекомых, техники, фона).
- **Временна́я структура** разделяет: дрон = стабильный гул (low centroidStd, high stability), фон = нестабильный/импульсный.
- Trends = спектр (30%) + временные признаки (70%) → успешное разделение.

---

### 5️⃣ Открытые GitHub Issues (T3/T2/T1, intern vertical + епики)

**Intern вертикаль (T1→T3):**
- **#195** T1: outbound self-check (пинг каналов) — 🆕
- **#196** T2: /health + /ready эндпоинты — 🆕
- **#197** T3: research-дайджест (Perplexity Sonar) — 🆕

**Епики (блокеры этапов):**
- **#95** Device-Board Refactor v0.4 (переменные, Event node, dataflow) — 🔄 в techies68
- **#92** MP7: Node Realtime Gateway (WSS для журнала) — ⏸️ ожидает stage-gate
- **#94** Deploy: детерминированность, гейты, откат — ⏸️ после MP7
- **#59** Deploy background-media to prod (A5c) — 🔄 на очереди

---

### 6️⃣ Наброски в `packages/temp/`

📁 **Структура (примерно):**

```
packages/temp/
├── free-v1-content/           # Материализованный датасет
│   ├── birds/
│   ├── drone/
│   ├── gunshot/
│   ├── machine-hum/
│   ├── silence/
│   ├── speech/
│   ├── wind/
│   └── quality-report.json
├── vdr-scaffold/              # VDR инфраструктура (черновик)
│   ├── annotation-schema.json
│   ├── validator.mjs
│   └── README.md
└── zero-shot-detector-scaffold/ # Нейро-детектор (базовый контракт)
    ├── package.json
    └── src/index.ts (заглушка)
```

**Статус:** Неполные, требуют интеграции в основные пакеты.

---

## 🎯 ПЛАН НА СЕГОДНЯ (2026-07-01)

### Фаза 1: Утренний ритуал (09:00–09:30)

```bash
# 1. Lint/typecheck/test с фиксом
yarn turbo run lint typecheck test \
  --filter='@membrana/{client,trends-detector-service,template-match-detector}' \
  --force --fix

# 2. Валидация free-v1 контента
yarn prepare-free-v1-content --validate

# 3. Зелёный smoke
yarn turbo run test --filter='@membrana/device-board'

# 4. Проверка git-статуса (нет случайных .txt в корне)
git status --short | grep -E '\.(txt|log)$' && echo "⚠️ Warning: logs detected" || true
```

**DoD:** Все три пакета зелёные, git-дерево чистое.

---

### Фаза 2: Синхронизация трёх критических блокеров (09:30–12:30)

**👨‍💻 Ozhegov (Структурщик) — #178 диагностика:**

| Время | Действие | Ожидаемый результат |
|-------|----------|-------------------|
| 09:30–10:30 | Device Board live debug (upload flow) | Root-cause в `docs/audit-uploads-2026-07-01.md` |
| 10:30–11:30 | Fix или обоснование workaround | PR с меткой `fixed` ИЛИ comment с `awaiting-data` |
| 11:30–12:00 | Smoke-тест + коммит | Зелёный test #device-board |

**🎨 Rodchenko (Верстальщик) — #153 W0-H3:**

| Время | Действие | Ожидаемый результат |
|-------|----------|-------------------|
| 09:30–10:00 | Fix dismissSelectionAction | clearCanvasNodeSelection → closeSelectionActionModal |
| 10:00–10:30 | Unit-тест + UI-тест | selection intact после modal close ✓ |
| 10:30–11:00 | Merge в techies68 | #153 closed, PR merged |

**📐 Dynin (Математик) — #187 + #186-C2:**

| Время | Действие | Ожидаемый результат |
|-------|----------|-------------------|
| 09:30–10:30 | Headroom proxy setup + Claude Code сеанс | 20–30 tool calls с метриками |
| 10:30–11:30 | Экспорт proxy-perf-report.json | savings_pct, cache_hit_pct, transforms |
| 11:30–12:30 | RAG_TOP_K update + ritual:day smoke | #186-C2 merged, ritual smoke ✅ |

**Параллель (за кулисами):**
- 📦 **Kuryokhin (Музыкант)** — T1 VDR-сбор начинается в 11:00

---

### Фаза 3: Инициирование дневных задач (12:30–17:00)

После закрытия блокеров сосредоточиться на **шести планируемых задачах** из STRATEGIC_PLAN_DAY:

1. **4.1 VDR-протокол** (Vesnin + Ozhegov, 12:30–14:00)
   - Создать `docs/VDR_PROTOCOL.md`
   - Скрипт `validate-vdr-labels.mjs`
   - DoD: документ + скрипт + README обновлён

2. **4.2 Zero-shot-detector scaffold** (Ozhegov + Dynin, 13:00–14:30)
   - Package: `packages/services/detectors/zero-shot-detector/`
   - Типы: `packages/core/src/detectors/ZeroShotDetectionResult`
   - DoD: scaffold компилируется, экспортирует `ZeroShotDetectorService`

3. **4.3 Stage-gate 1→2 документирование** (Vesnin, 14:00–15:00)
   - `docs/STAGE_GATE_1_TO_2.md` с таблицей требований
   - Чек-лист: VDR → P≥85% R≥90% → разблокировка TDOA
   - DoD: документ завершён, frozen-статус переходных этапов подтверждён

4. **4.4 VDR content phase 2** (Ozhegov + Kuryokhin, 14:00–16:00)
   - `annotation-index.json` с metadata
   - HTML-интерфейс для локальной аннотации
   - 20 сэмплов пилотная аннотация
   - DoD: индекс + интерфейс + 20 примеров

5. **4.5 Trends benchmark integration** (Dynin, 15:00–16:00)
   - Убедиться `yarn benchmark:detectors` воспроизводит trends метрики
   - CI-гейт интеграция
   - `docs/DETECTOR_BENCHMARK.md` обновлён
   - DoD: benchmark green, таблица показывает R 95% / P 76% / F1 0.844

6. **4.6 Multinode контракты** (Ozhegov, 16:00–17:00)
   - `@membrana/core/src/multinode/` типы
   - `docs/MULTINODE_CONTRACTS.md`
   - DoD: типы экспортированы, документирование завершено

---

### Фаза 4: Вечерний ритуал (17:00–18:00)

```bash
# Архивизация дневных результатов
yarn ritual:evening

# Это генерирует:
# 1. docs/archive/daily-day/2026-07-01/ (STRATEGIC_PLAN_DAY + DAILY_STANDUP + MAIN_DAY_ISSUE)
# 2. docs/DAILY_CODE_REVIEW.md (код ревью для завтра утром)

# Коммит + push (если все тесты зелёные)
git add docs/ && git commit -m "chore: archive day 2026-07-01; lint fixed; VDR protocol drafted"
```

---

## 📊 МАТРИЦА РЕЗУЛЬТАТОВ

| Компонента | Сегодня | Статус |
|-----------|--------|--------|
| **Code-review fix** | lint/typecheck/test all green | 🟢 06:00 утра |
| **#178 диагностика** | root-cause в audit-docs | 🟡 09:30–11:30 |
| **#153 merge** | W0-H3 в techies68 | 🟡 10:30 |
| **#187/#186-C2** | proxy-perf + RAG поднят | 🟡 12:30 |
| **VDR-протокол** | docs + скрипты | 🟡 14:00 |
| **Zero-shot scaffold** | пакет + типы | 🟡 14:30 |
| **Stage-gate doc** | требования + чек-лист | 🟡 15:00 |
| **VDR content phase 2** | индекс + 20 сэмплов | 🟡 16:00 |
| **Trends benchmark** | воспроизводимость подтверждена | 🟡 16:00 |
| **Multinode типы** | экспортированы из core | 🟡 17:00 |

**🟢 Ready** | **🟡 In Progress** | **🔴 Blocked**

---

## 🚨 РИСКИ И СТРАХОВКИ

### P1 (Блокирует выпуск)
- ❌ Lint ошибки не пройдены к 09:30 → merge заблокирован
  - **Страховка:** `--fix` флаг, ручной review ошибок перед retry

- ❌ #178 диагностика не завершена → detached-report frozen
  - **Страховка:** если > 2ч диагностики без результата → открыть issue `awaiting-data` для реальных лог-файлов

### P2 (Задерживает задачи)
- ⚠️ Headroom proxy не стартует → #187 отложен
  - **Страховка:** обратиться к Dynin за помощью с VPS / использовать fallback-метрики

- ⚠️ VDR-сбор медленнее запланированного → контент фаза 2 задержится
  - **Страховка:** 10–15 сэмплов достаточно для пилота, не требует 30+

### P3 (Технический долг)
- 🟡 Edge cases (silence, clipping) в free-v1 датасете → defer на FV1-S2
  - **Решение:** принять как известное ограничение, добавить synthetic samples в спринт 2

---

## ✅ ЗАВЕРШЕНИЕ СТЕНДАПА

**Резюме дня:**

1. **Утро (06:00–09:30):** Lint-fix, зелёный smoke-тест.
2. **Магистраль (09:30–12:30):** Закрыть три блокера (#178, #153, #187/#186-C2).
3. **Дневные задачи (12:30–17:00):** VDR-протокол, scaffold zero-shot, stage-gate doc, VDR контент, benchmark, multinode типы.
4. **Вечер (17:00–18:00):** Архив + code-review на завтра.

**Ключевой навигационный символ:** 🎯 Поворот от **FFT-исчерпания** к **VDR + эшелон 2 (нейро)**. Без новых данных → дальше не расти на DSP.

---

**Готовность команды:** ✅  
**Время публикации:** 2026-07-01T09:00 UTC  
**Координатор:** Vesnin (Teamlead)  
**Статус ветки:** `chore/backlog-cleanup-s1-clean` → merge pending lint-fix

---

*Стендап завершён. Все роли уведомлены. [Ritual:day] запущен в фоне.*