<!-- Сгенерировано: 2026-06-27T06:09:01.775Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (25), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# ЕЖЕДНЕВНЫЙ СТЕНДАП — Membrana Team

**Дата:** 2026-06-27 · **Время:** 07:00+03:00 (утро, перед началом работы)  
**Последний коммит:** `4fc37d9` · **Branch:** main  
**Горизонт:** 1 день (далее в STRATEGIC_PLAN_DAY)

---

## 📋 Входные потоки

### 1️⃣ Вчерашнее вечернее code-review (DAILY_CODE_REVIEW.md)

**Статус:** Conditional LGTM  
**Blockers (P0):**
- ❌ `.sync-readme-out.txt` в корне репозитория (артефакт CI/скрипта, не должен быть в tree)
- ❌ `.agents/` / `.opencode/` не зареги́стрированы явно в `AGENTS.md` (новая конвенция)
- ❌ `yarn turbo run typecheck` требует прогона (docs/actions миграция может иметь TS-ошибки)

**Warnings (P1):**
- `playwright-report/` остался в tree (нужен .gitignore)
- `yarn verify-mcp-bootstrap` не запускался — нужна проверка конфига MCP

**Opportunites (P2):**
- `docs/actions` link-audit требует smoke-прохода
- DevOps техдолг (гигиена дерева перед sprint 3)

**Действие на утро:**
```bash
# 1. Очистка артефактов
rm -f .sync-readme-out.txt playwright-report/

# 2. Типизация и линт
yarn turbo run typecheck --filter='@membrana/*' --skip-outputs
yarn lint

# 3. MCP верификация
yarn verify-mcp-bootstrap

# 4. Условный LGTM только после 3x PASS
```

---

### 2️⃣ Стратегический план на день (STRATEGIC_PLAN_DAY.md)

**Главное:** 7 задач, распределённые по ролям; фокус на **promotion trends-fft DRONE_TIGHT** и **audit DSP-детекторов**.

| Задача | Роль | Размер | Приоритет | Статус |
|--------|------|--------|-----------|--------|
| 1. Trends DRONE_TIGHT → curated-каталог | Матем. + Музыкант | M | P0 | ⏳ START |
| 2. Cleanup harmonic/cepstral/spectral-flux | Структур. + Музыкант | M | P0 | ⏳ START |
| 3. TDOA-service scaffold & freeze | Структур. + Матем. | M | P1 | ⏳ START |
| 4. Desktop logging audit | Верст. + Структур. | L | P1 | ⏳ START |
| 5. Stage-gate 1→2 consilium | Teamlead | S | **P0-DECISION** | ⏳ MID-DAY |
| 6. Device-board load-tests | Структур. + Музыкант | M | P2 | ⏳ LATER |
| 7. Cabinet API batch-read | Верст. + Структур. | M | P2 | ⏳ LATER |

**Ожидаемый выход:** BQA-7 tasks (2 P0 + 1 P0-decision + 4 P1–P2).

---

### 3️⃣ Открытые GitHub Issues (7 активных)

**P0 — Blockers:**
- **#178** — `async-v2 track upload fails` — нужна детачед-логика в media-library (блокирует live-детекцию)
- **#157** — `comment group deletion unintentionally removes nodes` — UX-регрессия device-board
- **#153** — `W0-H3: selection не сохраняется при закрытии модалки` — копирование узлов заблокировано

**P1 — Hotfixes (эпик #151):**
- **#146** — `W0-H1: палитра узлов в редакторе пользовательских функций`
- **#152** — `W0-H2: Ctrl+C / Ctrl+V` copy/paste узлов

**P1 — Epics:**
- **#144** — `Tasks Audit v1` — bookkeeping / reviewing / scripts
- **#141** — `device-board pause runtime v0.7` (DBP0–DBP4)

**P2 — Backlog:**
- **#131** — `Device-Board Journal + Reporter v0.6` (DBJ0–DBJ6)
- **#95** — `Device-Board Refactor v0.4` (DBR0–DBR6) — fullscreen, переменные, Event-node
- **#94** — `Deploy детерминированный, гейтированный, откатываемый` — postmortem MP7b
- **#92** — `MP7: Node Realtime Gateway` — WebSocket для журнала и live-микрофона
- **#59** — `Deploy background-media to production` (A5c)

**Рекомендуемая приоритизация на спринт 3:**
1. **Сначала:** Закрыть P0-blockers (#178, #157, #153) — разблокируют workflow
2. **Потом:** Hotfixes W0 (#146, #152) — polish перед MVP
3. **Фоном:** Tasks Audit v1 (#144) — инфраструктура для дальнейших спринтов

---

### 4️⃣ Наброски в packages/temp/ (заготовки)

**Статус:** Нет новых набросков с вчера. Текущие:

- `packages/temp/neural-detector-skeleton/` — заморожено (stage 2)
- `packages/temp/tdoa-calculator/` — будет использовано в задаче 3 (scaffold)
- `packages/temp/cabinet-batch-api/` — будет использовано в задаче 7

**Действие:** Задачи 3 и 7 сегодня скопируют наброски → `packages/services/tdoa-service/` и `packages/background-cabinet/` соответственно.

---

## 🎯 ГЛАВНЫЙ ФОКУС ДНЯ (MAIN_DAY_ISSUE.md)

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  MAIN_DAY_ISSUE — 2026-06-27                               ║
║                                                            ║
║  ❶ Promotion trends-DRONE_TIGHT в curated-каталог          ║
║     → вход в stage-gate 1→2 (recall 95%, FPR 30%)          ║
║                                                            ║
║  ❷ Audit DSP-детекторов (harmonic/cepstral/spectral-flux) ║
║     → явная документация why no-go для автономной детекции ║
║                                                            ║
║  ❸ STAGE-GATE 1→2 CONSILIUM (MID-DAY DECISION)             ║
║     → GO или NO-GO на Этап 2 (TDOA, локализация)           ║
║                                                            ║
║  Параллельно (не блокирует): Device-board W0 hotfixes      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

**Канон:** 
- [`docs/seanses/neural-detectors-strategy-2026-06-26.md`](./seanses/neural-detectors-strategy-2026-06-26.md) ← вчерашний consilium
- [`docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md`](./prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) ← технический референс

**Ожидаемый выход дня:** 3 PR + 1 consilium-решение (GO/NO-GO).

---

## 🚀 План на следующий день (по ролям)

### **[Teamlead / Vesnin]**

**Фокус:** Организация consilium; LGTM по задачам 1–2; условный LGTM по code-review (после typecheck).

1. **Утро (до 09:00):**
   - Запустить утренние проверки (typecheck, lint, MCP verify).
   - Прочитать вчерашний code-review; установить блокеры на merge.
   - Разбирать открытые issues: P0 (#178, #157, #153) → assign на W0 hotfix эпик.

2. **Днём (09:00–14:00):**
   - **MID-DAY consilium (stage-gate 1→2)** — собрать Матем., Структур., Музыканта.
   - Вход: FFT_METRICS, результаты trends (R 95%, P 0.76).
   - Выход: явное решение (GO с ожиданиями live-данных / NO-GO с альтернативой).
   - Дождать LGTM по задачам 1 и 2.

3. **Вечер (после 18:00):**
   - Подпись консилиума → `docs/seanses/stage-gate-1-2-consilium-2026-06-27.md`.
   - Обновление WHITE_PAPER / DETECTOR_BENCHMARK по решению.

---

### **[Структурщик / Ozhegov]**

**Фокус:** Scaffold TDOA-service; код-ревью задач 2, 4, 7.

1. **Задача 3 (TDOA-service scaffold, M):**
   - Создать структуру пакета: `packages/services/tdoa-service/src/{math/,core/,hooks/,types.ts,index.ts}`.
   - GCC-PHAT интерфейс: `tdoa-calc.ts` (чистые функции).
   - README: алгоритм, требования, ограничения (скорость звука).
   - Smoke-тест на mock-наблюдениях.
   - Статус: **ready for review** → Teamlead LGTM.

2. **Параллельно:**
   - Код-ревью задачи 2 (audit DSP): проверить границы пакетов, нет цикличных импортов.
   - Код-ревью задачи 4 (desktop logging): чек-лист и политика документированы?
   - Код-ревью задачи 7 (Cabinet API): граница между `background-cabinet` и `apps/cabinet`.

---

### **[Математик / Dynin]**

**Фокус:** Валидация DRONE_TIGHT шаблона; участие в consilium.

1. **Задача 1 (Trends DRONE_TIGHT promotion, M):**
   - Забрать шаблон из эпика #84 (`fft-last-chance-calibration`).
   - Валидировать thresholds (centroid, flux, rms, frameHitRatio): p10–p90 train-данных совпадают.
   - Добавить шаблон в `background-media` curated-каталог с версией.
   - Запустить `yarn benchmark:detectors` → проверить recall ≥ 95%, FPR ≤ 30% на val.
   - Залить результаты в `docs/datasets/week-2026-06-27/trends-promotion-benchmark.md`.
   - **Ready for merge** → Teamlead LGTM.

2. **Mid-day consilium:**
   - Вход: FFT_METRICS §4 (потолок DSP = 88–100% FPR).
   - Участие в обсуждении: какие метрики реальны на live-данных? Какой confidence для trends?
   - Вывод: GO или NO-GO на TDOA/локализацию (Этап 2).

---

### **[Музыкант / Kuryokhin]**

**Фокус:** Code-review задачи 1; параллельно W0 hotfixes.

1. **Задача 1 (Code-review trends-promotion):**
   - Проверить интеграцию DRONE_TIGHT в `trends-detector-service`.
   - Unit-тесты: 3+ сценария (drone-tight-match, not-drone-reject, edge-case).
   - Дефолты детектора указывают на curated-каталог.
   - **Approve for merge**.

2. **Параллельно (если есть время):**
   - Начать работу над **W0-H2 (#152)**: Ctrl+C / Ctrl+V copy/paste узлов в device-board.
   - Дождаться H3 (#153) merge → затем H2.

---

### **[Верстальщик / Rodchenko]**

**Фокус:** Desktop logging audit; W0 hotfixes.

1. **Задача 4 (Desktop logging audit, L):**
   - Полный скан IPC-каналов в `apps/membrana-studio/`: `console.log`, `logger.*`, `ipcRenderer.send`.
   - Фильтры в `shell-log-scrub.ts`: AAC-буферы, WAV-заголовки, микрофонные пути.
   - JSDoc-комментарии: `// ✓ no sensitive data` или `// ⚠️ filtered`.
   - Обновление `DESKTOP_APP_LOGGING_POLICY.md`: чек-лист 20–30 пунктов + примеры.
   - E2E-тест: запуск Studio, сценарий, проверка отсутствия hex-буферов в логах.
   - **Ready for review** → Teamlead.

2. **Параллельно (W0 hotfixes):**
   - **W0-H3 (#153):** Сохранять selection при закрытии модалки группирования.
     - Перенести `dismissSelectionAction` → не должна вызывать `clearCanvasNodeSelection`.
     - Только `closeSelectionActionModal`.
   - Smoke: yarn workspace @membrana/client dev → выделить, открыть модалку, закрыть, Ctrl+C копирование должно работать.

---

## 📊 Таблица распределения рабочего времени

| Роль | Задача | Время | Статус |
|------|--------|-------|--------|
| **Teamlead** | Утренние проверки, consilium, LGTM | 08:00–19:00 | **on critical path** |
| **Математик** | Задача 1 (trends-promotion) | 08:00–16:00 | **on critical path** |
| **Структурщик** | Задача 3 (TDOA-scaffold) | 08:00–16:00 | **on critical path** |
| **Верстальщик** | Задача 4 (logging audit) + W0-H3 | 08:00–18:00 | **extended** |
| **Музыкант** | Code-review задачи 1 + W0-H2 | 10:00–18:00 | **parallel** |

---

## ⚠️ Риски и зависимости

| Риск | Уровень | Mitigation |
|------|---------|-----------|
| `yarn typecheck` может выявить TS-ошибки в docs/actions | P0 | Запустить первым делом (08:00) |
| Consilium затянется → задержка на merge | P0 | Планировать consilium на **11:00** (2–3 часа) |
| Desktop logging audit требует полного аудита IPC | P1 | Разбить на подтаски: скан → фильтры → документ → тест |
| TDOA-scaffold зависит от наброска в packages/temp | P1 | Наброски готовы; структура известна |
| W0 hotfixes (#153, #152) могут конфликтовать | P1 | H3 → H2 в порядке зависимостей; разные файлы |

---

## 📌 Definition of Done (конец дня)

Проверка перед вечерним ритуалом (`yarn ritual:evening`):

- [ ] ✅ `yarn turbo run typecheck lint` — GREEN
- [ ] ✅ Вчерашний code-review processed (блокеры resolved)
- [ ] ✅ Задача 1 (trends-promotion): PR → review → LGTM / merge
- [ ] ✅ Задача 2 (DSP audit): PR → review → LGTM / merge
- [ ] ✅ Задача 3 (TDOA-scaffold): PR → review → ready (не merge, freeze на stage 2)
- [ ] ✅ Consilium stage-gate 1→2: protokol → решение (GO/NO-GO) → WHITE_PAPER update
- [ ] ⏳ Задача 4 (logging audit): 70% complete → ready for review завтра
- [ ] ⏳ W0-H3 (#153): ready for merge
- [ ] 🚀 Вечер: `yarn archive:daily-day` → `yarn code-review` → `yarn save-code-review`

---

## 🔗 Быстрые ссылки

| Документ | Предназначение |
|----------|----------------|
| [`MAIN_DAY_ISSUE.md`](./MAIN_DAY_ISSUE.md) | Центральная задача дня |
| [`STRATEGIC_PLAN_DAY.md`](./STRATEGIC_PLAN_DAY.md) | 7 задач, распределение по ролям |
| [`DAILY_CODE_REVIEW.md`](./DAILY_CODE_REVIEW.md) | Вчерашний ревью (условный LGTM) |
| [`prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md`](./prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) | Технический референс FFT-потолка |
| [`seanses/neural-detectors-strategy-2026-06-26.md`](./seanses/neural-detectors-strategy-2026-06-26.md) | Вчерашний consilium (context) |
| [`WHITE_PAPER.md`](./WHITE_PAPER.md) | Стратегический контекст (дорожная карта) |

---

## ✍️ Подписей

**Сводку подготовил:** Координатор виртуальной команды (Vesnin)  
**Дата генерации:** 2026-06-27 · 07:00+03:00  
**Источники:** DAILY_CODE_REVIEW + STRATEGIC_PLAN_DAY + GitHub Issues API + MAIN_DAY_ISSUE  
**Утверждение:** await Teamlead morning check-in

---

**🟢 СТАТУС:** Ready for team sync · Готово к работе · Let's go! 🚀