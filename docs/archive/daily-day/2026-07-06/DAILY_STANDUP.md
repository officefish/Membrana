<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-06
  archived-at: 2026-07-07T03:55:01.329Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-06T04:17:14.605Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (18), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# 🌅 Daily Standup — 2026-07-06

**Координатор:** Vesnin (Teamlead) · **Тир дня:** T1 (runtime-код возвращается) · **Статус:** Active

---

## 0. TL;DR

Вчерашнее ревью — **LGTM, чистый T0-день** (только docs/tasks: закрыт `comms-contour-environment`, зарегистрирован `comms-sandbox-docs-adaptation`). Блокеров нет.

**Но:** `plan:day` фиксирует **стратегический дрейф второй день подряд** — магистраль детекции не двигалась (весь объём ушёл в comms/инфру). Сегодня жёсткий разворот: **детекция — магистраль, comms — фоновая полоса**.

**Фокус дня:** `DRONE_TIGHT` → curated template-match + `benchmark:detectors` v0.3 → подготовка hard-gate. Это единственная FFT-конфигурация, прошедшая планку (95% recall / 30% FPR, эпик #84).

---

## 1. Синтез входных сигналов

| Источник | Главный сигнал | Действие сегодня |
|----------|----------------|------------------|
| **DAILY_CODE_REVIEW** (05.07 вечер) | T0 LGTM; runtime не тронут; untracked снапшот `daily-day/2026-07-05/` | Закоммитить/игнорировать снапшот перед работой |
| **STRATEGIC_PLAN_DAY** | Дрейф 2-й день; магистраль = DRONE_TIGHT промоушен + hard-gate | Приоритет **A→B→C**, разведка D/E, comms F — по остатку |
| **FFT_METRICS (#84)** | Эшелон 0 исчерпан; потолок = trends DRONE_TIGHT 95%/30% | НЕ повторять DSP-бенчмарк free-v1; промоушен tight-шаблона |
| **MAIN_DAY_ISSUE (05.07)** | Календарь фаз 0→1→2 уже расписан под DRONE_TIGHT | Переиспользуем как скелет сегодняшнего дня |
| **GitHub Issues** | Продуктовых блокеров детекции нет; открытое — intern/deploy/device-board | В фон; #34 (FFT edge-docs) — попутно к задаче A |
| **CURRENT_TASK** | Буфер устал (device-board-server-first, 30.06) — **не канон**, игнор | Не ориентироваться |

---

## 2. Роли и распределение (формат координатора)

**[Teamlead]** (Vesnin): Держу разворот к детекции — это прямой ответ на вечерний feedback «один канон = одна реальная работа». Веду LGTM на stage-gate таблицу (задача B) и go/no-go по эшелону 2 (D). Фиксирую границу транспортного слоя (E) как разведку, без реализации — Этап 2 заморожен. Comms (F) координирую, но это фон: не более чем «начать CD1», не расширять контур.

**[Структурщик]** (Ozhegov): Стерегу границы `detectors/*` в задаче A — `DRONE_TIGHT` тянет только `detector-base` + `core` + `audio-engine` (типы окна), никаких прямых связей плагинов. В D — проверяю, что zero-shot scaffold реализует тот же `DroneDetector`/`DetectionResult` без протечки внешних весов в граф. В E веду разведку: таблица «PCB-функция → текущее место → foundation vs background-server».

**[Математик]** (Dynin): **Ведущий дня.** Задача A — вношу `DRONE_TIGHT` (centroid 2900–4300, flux 0.03–0.16, rms 0.07–0.28, temporal-профиль, spectral 0.3 / temporal 0.7) в curated-каталог как чистую конфигурацию, unit-тесты скоринга. Задача B — пересъёмка `benchmark:detectors` v0.3 с trends+tight; сверяю recall/FPR/F1 на `val` с §4 FFT_METRICS (95%/30%), любое расхождение объясняю. Разведка D — реализует ли CLAP/YAMNet тот же контракт.

**[Музыкант]** (Kuryokhin): Пресеты калибровки для задачи C — ручной прогон trends+`DRONE_TIGHT` в библиотеке сэмплов. Без смены алгоритма (это зона Математика) — только параметры/пресеты поверх готового trends-сервиса.

**[Верстальщик]** (Rodchenko): Веду UI задачи C — плагин `trends-fft-analyzer` через `MembranaRegistry.registerPlugin`, визуализация попадания в `DRONE_TIGHT` бокс + вердикт. Строго: никакого `new AudioContext()`/`getUserMedia` вне engine (ARCHITECTURE §1b), бизнес-логика — не в JSX.

---

## 3. План на день (приоритет A → B → C → D/E → F)

### 🔴 Магистраль (детекция)

| # | Задача | Роль (ведёт) | Размер | DoD-ядро |
|---|--------|--------------|--------|----------|
| **A** | `DRONE_TIGHT` → curated template-match | Математик + Структурщик | M | Шаблон + конкуренты в каталоге; границы `detectors/*`; unit-тесты скоринга зелёные |
| **B** | `benchmark:detectors` **v0.3** с trends/DRONE_TIGHT | Математик + Teamlead (LGTM) | M | trends+tight в прогоне; recall/FPR/F1 ≈ 95%/30% на `val` или расхождение объяснено; `DETECTOR_BENCHMARK.md` обновлён с пометкой датасета/даты |
| **C** | Live-калибровка trends-fft под `DRONE_TIGHT` (sample-library) | Верстальщик + Музыкант | M | Плагин через `MembranaRegistry`; без Web Audio вне engine; ручной прогон → визуализация бокса + вердикт |

### 🟡 Разведка (без реализации)

| # | Задача | Роль (ведёт) | Размер | DoD-ядро |
|---|--------|--------------|--------|----------|
| **D** | Контракт подключения zero-shot (CLAP/YAMNet) на `detector-base` | Математик + Структурщик + Teamlead (go/no-go) | S | Зафиксировано: реализует ли тот же `DroneDetector`; веса — внешний asset; границы не ломаются |
| **E** | Граница транспортного слоя (PCB → `transport-service`?) | Структурщик + Teamlead (LGTM) | S | Таблица функция→текущее→целевое место; явно: Этап 2 заморожен, это фиксация |

### ⚪ Фоновая полоса (по остатку ёмкости)

| # | Задача | Роль | Размер | DoD-ядро |
|---|--------|------|--------|----------|
| **F** | Comms-долг CD1–CD6: адаптация baseline-документов | Teamlead координирует | S | Хотя бы RUNBOOK/CHECKLIST под Вариант A; `check:boundaries` leaf-zero зелёный |
| попутно | #34 FFT edge-cases в JSDoc/README fft-analyzer | Математик | XS | Документируется вместе с касанием math-ядра в A |

---

## 4. Утренняя фаза 0 (блокирующая, до старта магистрали)

**Ответственные:** Структурщик + Верстальщик · **Окно:** ~08:00–09:00

```bash
# 1. Гигиена дерева — untracked снапшот из вчерашнего вечера
git status                       # ожидаем: docs/archive/daily-day/2026-07-05/
git add docs/archive/daily-day/2026-07-05/   # осознанный снимок → коммит
#   (или добавить в .gitignore, если снапшоты не версионируем)

# 2. Проверка чистоты: НЕТ .txt-логов в корне (cabinet-recover*.txt, deploy-*.txt)
git status --porcelain | grep -E '\.txt$' && echo "⚠ убрать в %TEMP%/docs/archive" || echo "✓ clean"

# 3. Зелёный клиент перед runtime-работой
yarn turbo run lint typecheck test --filter=@membrana/client
```

**DoD фазы 0:**
- ✅ Рабочее дерево чистое (снапшот закоммичен/проигнорирован, нет `.txt` в корне)
- ✅ `@membrana/client` lint/typecheck/test зелёные
- ✅ Все 5 ролей прочитали этот стендап + `MAIN_DAY_ISSUE.md`

---

## 5. Что НЕ делаем сегодня (антидрейф)

- ❌ **Повторный DSP-бенчмарк harmonic/cepstral/spectral-flux на free-v1** — эшелон 0 исчерпан (FFT_METRICS §6), вердикт зафиксирован. Разрешена только пересъёмка со **сменой конфигурации** (trends+tight, задача B).
- ❌ **Повторный тюнинг порогов DSP** «ещё раз прогнать» — no-go.
- ❌ **`tdoa-service` / `localizer-service` / `tracker-service`** — Этапы 2–4 заморожены до stage-gate 1→2.
- ❌ **Полная реализация `transport-service`** — только фиксация границы (E).
- ❌ **Расширение comms-контура новыми фичами** сверх адаптации baseline — уже помечено как дрейф.
- ❌ **Ориентация на `CURRENT_TASK.md`** — буфер устарел (30.06), при конфликте проигрывает этому стендапу и реестру.

---

## 6. Проверки в конце дня (вечерний preflight)

- **Артефакт детекции:** `DRONE_TIGHT` в curated template-match; `benchmark:detectors` v0.3 переснят; `DETECTOR_BENCHMARK.md` обновлён (датасет free-v1/val + дата + trends-строка).
- **Метрика:** trends+`DRONE_TIGHT` на `val` воспроизводит ~95% recall / ~30% FPR (совпадение с FFT_METRICS §4 или объяснённое расхождение).
- **Тесты:** unit-тесты скоринга шаблона + границы `detectors/*` зелёные; `check:boundaries` (вкл. comms leaf-zero) зелёный.
- **UI-демо:** плагин trends-fft в библиотеке сэмплов — ручной прогон `DRONE_TIGHT` с визуализацией; зарегистрирован через `MembranaRegistry`, без прямого Web Audio.
- **Разведка:** есть go/no-go заметка по эшелону 2 + таблица границы транспортного слоя.
- **Дисциплина фокуса:** вечерний feedback подтверждает — магистраль дня была **детекционной**, не comms (устранён 2-дневный дрейф).

---

## 7. Вечерний ритуал (напоминание)

```bash
yarn archive:daily-day   # снимок STRATEGIC_PLAN_DAY + DAILY_STANDUP + MAIN_DAY_ISSUE
yarn code-review         # ревью → docs/DAILY_CODE_REVIEW.md (на завтра)
yarn save-code-review
```

---

**Итоговый артефакт:** `docs/DAILY_STANDUP.md` (план на 2026-07-06)
**Definition of Done дня:** DRONE_TIGHT в curated-каталоге · benchmark v0.3 переснят и задокументирован · trends на `val` = 95%/30% (или объяснено) · unit-тесты + `check:boundaries` зелёные · UI-плагин калибровки через Registry · разведка D/E зафиксирована · дрейф в comms устранён.