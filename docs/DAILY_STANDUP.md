<!-- Сгенерировано: 2026-07-08T04:57:03.138Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (17), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# 🗓 DAILY STANDUP — 2026-07-08

**Координатор:** Vesnin (Teamlead)
**Источники:** STRATEGIC_PLAN_DAY (08.07), DAILY_CODE_REVIEW (07.07 вечер), MAIN_DAY_ISSUE (07.07, канон предыдущего дня), open GitHub Issues, packages/temp
**Магистраль недели:** финализация FREE-тарифа → S2 combined UC (fusion спектр+нейро)

---

## 1. Свод входов (что читаем на входе)

| Источник | Ключевой сигнал | Импликация на сегодня |
|----------|-----------------|------------------------|
| **Code-review 07.07** | T0, дерево code-clean; хвост — untracked `docs/archive/daily-day/2026-07-07/`; P2 warning `SampleLibraryModule.tsx:94` | ФАЗА 0: закоммитить снимок дня, зелёный client, docs:lint |
| **STRATEGIC_PLAN_DAY 08.07** | Сутки ушли в UX-контур (CX/CSR/BTJ); детекционное ядро S2 **не двигалось** | Сегодня магистраль = fusion-хелпер (A), долг объяснимости (C) |
| **MAIN_DAY_ISSUE 07.07** | Fusion-контракт вчера был центром; проверить, дошёл ли он до `main` | Уточнить статус Задачи A: контракт есть? функция есть? |
| **Open Issues** | Продуктовых блокеров детекции нет; #34/#10 (FFT-долг) релевантны Задаче C | #10/#34 — попутно к таблице сравнения, не магистраль |
| **packages/temp** | Набросков, ломающих план, не обнаружено | — |

⚠️ **Разрыв планов:** STRATEGIC_PLAN_DAY (08.07) и MAIN_DAY_ISSUE (07.07) описывают **одну и ту же** пятёрку задач A–E. Судя по code-review 07.07 (день архивный, 0 строк кода), **вчерашняя магистраль fusion (Задача 1/A) не была реализована** — только заархивированы UX-эпики. Значит fusion переносится на сегодня как незакрытый keystone.

---

## 2. Синхронизация ролей

```
[Teamlead]: Держу магистраль: fusion-хелпер спектр+нейро (сырой confidence, НЕ бинарный OR) —
            это вход в S2 FREE-тарифа. Вчера ушли в UX; сегодня возвращаем ядро.
            Приоритет: A (fusion) → C (таблица val) → B/E (после контракта). D — профилактика.
            LGTM держу на выводах C и D. Задачи A/C нельзя пропускать второй день подряд.

[Структурщик]: Границы: fusion живёт на уровне core/client, НЕ внутри detectors/*
               (детекторы не зависят друг от друга — check:boundaries обязателен).
               Веду D (аудит singleton после CSR1: runtime/presence/captures/scenario-registry).
               Со-веду E (каркас 3+1 UC: device-board зависит только от core, UC — слотом от хоста).

[Математик]: Веду A: pure-функция слияния на СЫРОМ confidence (trends + yamnet),
             unit-тесты на 3 сценария (согласие / расхождение / один молчит). Заметка ND3.
             Веду C: таблица P/R/FPR/F1 обоих детекторов на ОДНОМ held-out val —
             БЕЗ нового DSP-прогона free-v1 (FFT_METRICS §6, потолок зафиксирован).
             Попутно вижу #10/#34 — тесты и edge-cases FFT-ядра; закрывать не сегодня.

[Музыкант]: Задача B (alarm-loop «ближе/дальше» по RMS): согласую форму с Teamlead
            (1–2 абзаца + модули) ДО кода. Аудио только через audio-engine, не Web Audio напрямую.
            Порог алерта завязан на combinedScore из A → жду контракт A.

[Верстальщик]: Веду B (UI-индикатор ближе/дальше) и со-веду E (карточки UC по DESIGN.md).
               Бизнес-логика НЕ в JSX; индикатор явно помечен «грубая громкость, не координата».
               Стартую после контракта A (~13:00).
```

---

## 3. План на сегодня (приоритизированный)

### 🟢 ФАЗА 0 — Гигиена (08:00–09:00) · блокирующая
- [ ] `git add docs/archive/daily-day/2026-07-07/ && git commit` — снимок дня (сейчас ломает preflight «чистое дерево»)
- [ ] `git status --porcelain | grep -E '\.txt$'` — нет `.txt`-логов в корне
- [ ] `yarn turbo run lint typecheck test --filter=@membrana/client` — зелёный после волны device-board
- [ ] `yarn docs:lint` + `yarn catalog:verify-client` — после массовой правки docs/tasks + device-board runtime
- **Роли:** Ozhegov + Rodchenko · **DoD:** дерево чистое, client green, все 5 ролей прочитали standup

### 🔴 ФАЗА 1 — МАГИСТРАЛЬ: Задача A (09:00–12:00) · **центр дня**
- **Fusion-хелпер спектр+нейро на сыром confidence** (перенос незакрытого keystone с 07.07)
- **Ведёт:** Dynin (Математик) · **Границы:** Ozhegov · **LGTM детектора:** Vesnin · **Размер:** M
- **DoD:**
  - [ ] Тип combined-результата в `@membrana/core` — сырой confidence обоих + агрегат, **без бинарного OR**
  - [ ] Pure-функция слияния (без побочных эффектов, без фреймворков)
  - [ ] Unit-тесты: согласие / расхождение / один источник молчит
  - [ ] `check:boundaries` зелёный — слияние не внутри `detectors/*`
  - [ ] Combined-точка отражена в `DETECTOR_BENCHMARK.md`

### 🟡 ФАЗА 2 — Долг объяснимости: Задача C (11:00–13:00)
- **Таблица trends `DRONE_TIGHT` vs yamnet на одном held-out val**
- **Ведёт:** Dynin · **LGTM:** Vesnin · **Размер:** S
- **DoD:**
  - [ ] Строка P/R/FPR/F1 обоих в `DETECTOR_BENCHMARK.md`
  - [ ] Вывод 2–3 фразы: **yamnet — основной hard-gate, trends — объяснимый бэкап**
  - [ ] **БЕЗ** нового прогона free-v1 DSP (FFT_METRICS §6)
  - [ ] Отмечено: hard-gate P≥85%/R≥90% пока НЕ достигнут (yamnet FPR 36.7 → ждёт VDR)

### 🟣 ФАЗА 3 — Параллельные треки (после контракта A, ~13:00–16:00)
- [ ] **Задача B** — alarm-loop «ближе/дальше» (Kuryokhin + Rodchenko, M) · форма → LGTM Teamlead до кода
- [ ] **Задача E** — каркас 3+1 UserCase в device-board (Ozhegov + Rodchenko, M) · lazy через `MembranaRegistry`, границы только на core
- [ ] **Задача D** — аудит singleton клиент↔сервер (Ozhegov + Vesnin, S) · чек-лист в `DEVICE_BOARD_SERVER_FIRST.md`

---

## 4. Открытые Issues — триаж (не магистраль)

| # | Тема | Решение на сегодня |
|---|------|--------------------|
| **#10** | Unit-тесты чистой математики fft-analyzer | Попутно к Задаче C — Математик рядом; закрывать позже отдельным PR |
| **#34** | Документация FFT edge cases / windowing | Тот же контекст, что #10; не сегодня |
| #236 | Studio tray/global-shortcut emergency stop | Risk-задача, вне магистрали (studio-capture-adaptation) |
| #195–197 | Intern T1/T2/T3 onboarding | Вертикаль стажёра, отдельный трек, куратор |
| #187 | headroom proxy-perf замер | Вне продуктовой магистрали |
| #92 / #95 | MP7 realtime gateway / device-board v0.4 | Крупные эпики, не сегодня |
| #57–59 | trends-template editor / background-media deploy | Заморожены относительно S2 |
| #49 | MicrophoneCapturePanel UX | Не в фокусе дня |

---

## 5. Что НЕ делаем сегодня (границы)

- ❌ Повтор unified DSP-бенчмарка harmonic/cepstral/flux на free-v1 — эшелон 0 исчерпан (FFT_METRICS §6, потолок 75%/40%)
- ❌ Одиночные DSP как решающий голос hard-gate — их FPR 88–100%
- ❌ Новые foundation-пакеты (`tdoa`/`localizer`/`tracker`/`transport`) — заморожены до hard-gate
- ❌ «Разведка» yamnet — уже в prod-бенчмарке (F1 0.803)
- ❌ Синхронизация времени / многолучёвость / GPS-PPS — Этап 2+
- ❌ Fusion **внутри** `detectors/*` — только core/client (границы Структурщика)

---

## 6. Gate конца дня (проверки)

```
[Teamlead]: LGTM на выводах C (основной/бэкап) и D (аудит singleton). Fusion (A) не пропущен второй день.
[Структурщик]: check:boundaries зелёный; fusion не в detectors/*; device-board зависит только от core.
[Математик]: unit-тесты A зелёные (3 сценария); таблица C на одном val без нового DSP-прогона.
[Музыкант]: alarm-loop — форма согласована до кода; аудио только через engine.
[Верстальщик]: UI-индикатор реагирует на RMS live; помечен «не координата»; каркас UC монтируется lazy.
```

**Итоговый артефакт:** `docs/DAILY_STANDUP.md` (план на 08.07) + чек-лист фаз 0–3

**Definition of Done дня:**
- Чистое рабочее дерево, снимок 07.07 закоммичен, нет `.txt` в корне
- `@membrana/client` lint/typecheck/test зелёные; `check:boundaries` зелёный
- **Задача A (fusion)** доведена до типа+функции+тестов — keystone не переносится третий раз
- Таблица C с выводом основной/бэкап + LGTM Teamlead
- Ни одна задача не завела новый foundation/analyzer-пакет вне `SERVICES.md`

---

⚡ **Одна фраза дня:** возвращаем магистраль в детекционное ядро — **строим мост fusion** (сырой confidence trends+yamnet в `@membrana/core`), вчера ушедший под UX-волну; DSP-эшелон 0 закрыт, дальше только слияние модальностей.