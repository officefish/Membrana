<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-09
  archived-at: 2026-07-09T18:25:46.691Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-09T06:13:50.134Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (17), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# 🗓 DAILY STANDUP — Membrana · 2026-07-09

**Координатор:** Vesnin (Teamlead)
**Источники:** DAILY_CODE_REVIEW (08.07 вечер), STRATEGIC_PLAN_DAY (09.07), MAIN_DAY_ISSUE (08.07), CURRENT_TASK (09.07), открытые GitHub Issues, RAG operative

---

## 1. Свод вчерашнего (что закрылось 08.07)

Вчерашний день **пробил keystone**, который дважды переносился (06→07→08):

- ✅ **`fuseDetectorConfidences`** в `@membrana/core` — pure-функция слияния trends+yamnet на **сыром confidence** (не бинарный OR), 11 тестов. Задача A (fusion) **закрыта**.
- ✅ **`LoudnessTrendTracker` + `evaluateProximityAlarm`** в `fft-analyzer` — 22 unit-теста; порог alarm завязан на `combinedScore`, а не на громкости.
- ✅ Плагин **`mic-proximity-alarm`** (alarm-loop через engine), **`CabinetScenarioPicker`**, каркас **3+1 FREE UserCase**, шареный `UserCaseCardView`.
- ✅ **`background-cabinet`**: персистентность выбора сценария, `node.entitlements`, CJS wire-sync.
- ✅ **Night Build (#315)**: `pr:ship`, `build:affected`, `verify:wire-sync`, scoped хуки.

**Code-review (T1) вердикт:** CI зелёный (test 53/53, lint 0). Границы csp-цепочки чисты. Флаги: P2 `exhaustive-deps` в `SampleLibraryModule.tsx:94`; проверить тесты рядом с csp-4/csp-5 (C7); core-контракт `BoardScenarioListItem` + `entitlements` — авто-T2 при следующем касании.

---

## 2. 🔴 Расхождение канона: два источника тянут в разные стороны

| Источник | Магистраль на сегодня |
|----------|----------------------|
| **STRATEGIC_PLAN_DAY (09.07)** | Combined-продюсер → `combinedScore>0` (Задача 1) |
| **CURRENT_TASK (09.07)** | Спринт `hermes-brief` (adopted-инсайт 7.4) |

**Решение Teamlead:** магистраль дня — **combined-продюсер** (STRATEGIC_PLAN_DAY). `hermes-brief` — **инфраструктурный трек ритма**, не двигает картину неба (WHITE_PAPER); идёт как отдельный побочный слот, если останется ёмкость. Обоснование: вчера закрыт `fuseDetectorConfidences`, но `combinedScore=0` до появления продюсера — это **прямое продолжение keystone**, а не новый разворот. Продукт (S2 FREE) важнее тулинга.

---

## 3. 🎯 Магистраль дня и распределение по ролям

```
[Teamlead]:    Combined-продюсер — вход в S2 FREE. Fusion-ядро есть (вчера),
               сегодня появляется тот, кто его ПИТАЕТ. Свести канон (задача 5).
[Структурщик]: Корень дублирования wire-контракта core↔CJS (задача 3).
               detection-ensemble-service: границы — только core+audio-engine.
[Математик]:   Combined-продюсер (ведёт, задача 1) + таблица trends vs yamnet (задача 4).
[Музыкант]:    Интеграция combined-продюсера в mic-plugin (alarm реагирует на score).
[Верстальщик]: combined+alarm UserCase — реальный граф спектр+нейро→fusion→alarm (задача 2).
```

---

## 4. План на сегодня (порядок исполнения)

### ФАЗА 0 — Гигиена (08:00–09:00) · блокирующая
- Закоммитить снимок `docs/archive/daily-day/2026-07-08/`, нет `.txt` в корне.
- `yarn turbo run lint typecheck test --filter=@membrana/client` зелёный.
- `yarn docs:lint` + `yarn catalog:verify-client`.
- **Все 5 ролей прочитали этот стендап.**

### ФАЗА 1 — МАГИСТРАЛЬ: Combined-продюсер (09:00–13:00) · M
**Ведёт:** Dynin (Математик) + Ozhegov (границы) · **Интеграция:** Kuryokhin · **LGTM:** Vesnin
- `detection-ensemble-service` (каркас → минимальная реализация): прогон trends+yamnet на окне → `combinedScore` через `fuseDetectorConfidences`.
- **DoD:** зависит только от core+audio-engine (детекторы через контракт); `combinedScore>0` на живом входе; alarm-loop реагирует на score, не на громкость; unit-тесты согласие/расхождение; `check:boundaries` зелёный.

### ФАЗА 2 — combined+alarm UserCase (13:00–16:00) · M · параллельно после контракта
**Ведёт:** Rodchenko (Верстальщик) + Dynin (контракт графа)
- `loadDocument` combined-UC → непустой граф спектр+нейро→fusion→alarm; e2e smoke; device-board зависит только от core.

### ФАЗА 3 — Долг структуры и объяснимости (параллельно)
- **Задача 3 · M · Ozhegov:** единый источник `BoardScenarioListItem` / `NODE_REALTIME_EVENT_TYPES`, CJS генерируется, `verify:wire-sync` тривиально зелёный.
- **Задача 4 · S · Dynin+Vesnin:** таблица P/R/FPR/F1 trends `DRONE_TIGHT` vs yamnet на **одном** val в `DETECTOR_BENCHMARK.md`; вывод «yamnet основной, trends бэкап»; **без нового DSP-прогона**.
- **Задача 5 · S · Vesnin:** свести MAIN_DAY_ISSUE ↔ факт (combined = №1, детекция/объяснимость = supporting).

### Побочный слот (если есть ёмкость)
- **`hermes-brief`** (Dynin): `yarn hermes:brief` → `docs/HERMES_BRIEF.md`, детерминизм + тест. Не магистраль.

---

## 5. Открытые GitHub Issues — привязка

| # | Issue | Статус сегодня |
|---|-------|----------------|
| **#10** | Unit-тесты чистой математики fft-analyzer | 🟡 Попутно к задаче 4 (val-таблица), отдельным PR **не сегодня** |
| **#34** | Docs: FFT edge cases / windowing | 🟡 Попутно к #10, не магистраль |
| **#236** | ST7 tray/global-shortcut emergency stop | ⏸ Risk-задача спринта studio-capture, не сегодня |
| **#195–#197** | Intern T1/T2/T3 (self-check, /health, дайджест) | ⏸ Вертикаль онбординга, вне магистрали |
| **#187** | headroom proxy-perf замер | ⏸ Эпик #186, не магистраль |
| **#95** | Device-Board Refactor v0.4 | ⏸ Заморожен за stage-gate |
| **#92** | MP7 Node Realtime Gateway | ⏸ Транспорт узла, не сегодня |
| **#57/#58/#59** | trends-редактор, background-media | ⏸ Вне магистрали дня |
| **#49/#27/#33** | Mic-capture UI, Storybook/a11y | ⏸ UX-долг, не магистраль |

**Вывод по issues:** продуктовых блокеров combined-магистрали нет. #10/#34 — единственные, кто **касается** сегодняшней работы (val-таблица), но закрываются отдельным PR позже.

---

## 6. Что НЕ делаем сегодня (защита фокуса)

- ❌ Повторный unified benchmark harmonic/cepstral/flux на free-v1 — эшелон 0 исчерпан (FFT_METRICS §6, потолок 95%/30%).
- ❌ Новые сервисы за stage-gate: `tdoa/localizer/tracker/transport` — заморожены (WHITE_PAPER §8).
- ❌ Тюнинг порогов DSP «ещё раз» — только при смене датасета/алгоритма.
- ❌ hermes как 6-я роль — read-only функция ритма, не оркестратор.
- ❌ Уводить день в UX/scenario-picker — вчера уже был этот дрейф (team-feedback 08.07).

---

## 7. Проверки в конце дня (DoD стендапа)

- [ ] `combinedScore > 0` на живом входе; alarm-loop реагирует на fusion-score (demo в «Микрофоне»).
- [ ] combined+alarm UserCase монтируется e2e; карточка в пикере с tariff-бейджем.
- [ ] `check:boundaries` + `verify:wire-sync` зелёные; `detection-ensemble-service` не зависит от других analyzer-сервисов.
- [ ] Таблица trends vs yamnet в `DETECTOR_BENCHMARK.md` с вердиктом «основной / бэкап».
- [ ] MAIN_DAY_ISSUE ↔ факт синхронны (combined = №1).
- [ ] Новые unit-тесты (combined-продюсер: согласие/расхождение) зелёные; регрессов нет.

---

**Одна фраза дня:** вчера построили **мост** (`fuseDetectorConfidences`), сегодня ставим на него **того, кто по нему идёт** — combined-продюсер, дающий живой `combinedScore>0` в S2 FREE-тариф; `hermes-brief` — только если останется ёмкость.

*Итоговый артефакт:* `docs/DAILY_STANDUP.md` · *DoD:* см. §7 · соответствие WHITE_PAPER §3.3/§4.4/§4.6, границы пакетов чисты, никакого бинарного OR.