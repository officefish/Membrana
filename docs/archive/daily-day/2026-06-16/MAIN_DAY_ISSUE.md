<!--
  archive-role: archive-snapshot
  archive-day: 2026-06-16
  archived-at: 2026-06-16T18:07:04.583Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Обновлено: 2026-06-16 (эпик telemetry-journal-event-driven #83) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) -->
<!-- Эпик: docs/prompts/TELEMETRY_JOURNAL_EVENT_DRIVEN_EPIC_PROMPT.md -->
<!-- Registry: telemetry-journal-event-driven -->

# MAIN_DAY_ISSUE — 2026-06-16

**Дата:** 2026-06-16 · **Хранитель:** Teamlead (Vesnin)

---

## Утренний ритуал

| Шаг | Статус | Артефакт |
|-----|--------|----------|
| `yarn morning-care --no-anthropic` | ✓ | ветка `main`, есть локальные правки (TARIFF_MATRIX, вечерний архив) |
| `yarn plan:day` | ✓ | [`STRATEGIC_PLAN_DAY.md`](./STRATEGIC_PLAN_DAY.md) |
| `yarn standup` | ✓ | [`DAILY_STANDUP.md`](./DAILY_STANDUP.md) |
| `yarn main-day-issue` | ✓ + **коррекция** | этот файл |

**Вчерашнее ревью:** [`DAILY_CODE_REVIEW.md`](./DAILY_CODE_REVIEW.md) (2026-06-15) — границы пакетов, edge-case тесты DSP, a11y.

**Закрыто вчера:** эпик **#81** `telemetry-journal-ux-hardening` (PR #82, prod smoke OK).

---

## Центральный фокус дня

**Эпик [`telemetry-journal-event-driven`](./prompts/TELEMETRY_JOURNAL_EVENT_DRIVEN_EPIC_PROMPT.md)** — Issue [#83](https://github.com/officefish/Membrana/issues/83).

**Старт:** фаза **JE1** (buffer clear event chain). Параллельно — docs commit `TARIFF_MATRIX` ✓ (`bd5e575`).

---

## Задачи дня (приоритет)

### 1. ~~Зафиксировать продуктовую матрицу тарифов (S)~~ ✓

Коммит `bd5e575` — [`TARIFF_MATRIX.md`](./TARIFF_MATRIX.md) v0.3 в `main`.

---

### 2. JE1 — buffer clear event chain (M) ← **сейчас**

**Пакеты:** `apps/client`, `@membrana/media-library-service`, `background-media`

| Было | Стало |
|------|-------|
| Кнопка + таймер | Клик → запрос clear → ответ сервера → UI обновлён |

**DoD:** нет polling-таймера на clear; ошибка сети показывается; тест или ручной smoke в paired-режиме.

---

### 3. JE2 — stop → analyze (M)

**Пакеты:** `apps/client` (`mic-buffer-recorder`, `mic-live-drone-analysis`)

| Было | Стало |
|------|-------|
| Интервал анализа | Событие `stop` / `sampleImported` → один прогон `analyzeSampleDetectors` |

**DoD:** анализ только при новом клипе; плагин выключен → нет отчётов в журнал (TJ10).

---

### 4. JE3 + JE4 — journal refresh (S–M)

**Пакеты:** `apps/client`, `apps/cabinet`, `@membrana/telemetry-journal-service`

- Client: после upload/sync — invalidate списка (не слепой 5s poll, если можно hub).
- Cabinet: visibility + событие после новой записи (~1s poll как fallback — допустимо на сегодня).

**DoD:** новая запись видна без ручного F5 в типичном сценарии.

---

### 5. JE5 — contextual journal clear (M, после JE3–JE4)

Кнопка **«Очистить»** справа в строке фильтров (client + cabinet). Удаление по активному фильтру: все / треки / отчёты / обнаружения. `useRemoteMutation`: timeout 30 s, unmount unlock, banner при недоступности server.

---

### 6. Smoke на prod (S, если есть время)

- `cabinet.membrana.space`: журнал, play, pagination.
- Client paired: запись → анализ → запись в журнал → cabinet.

---

## Что сознательно НЕ делаем сегодня

- ❌ Повторный «завершить Этап 1.A» — harmonic/cepstral/flux **уже** в бенчмарке ([`DETECTOR_BENCHMARK.md`](./DETECTOR_BENCHMARK.md)).
- ❌ Stage-gate консилиум — не блокер; neural/indie — **следующий эпик** после MFCC.
- ❌ TDOA / мультиузел — frozen.
- ❌ Реализация MFCC/спектрограмм — только в тарифной матрице; код indie — отдельный эпик.

---

## Параллельные треки (не блокируют фокус)

| Трек | Issue / id | Заметка |
|------|------------|---------|
| DDR подробный отчёт | #78 | уже в prod path |
| TJ live refactor | #79 | частично перекрыт #81 |
| Real dataset week | `real-dataset-live-calibration` | ручная курация + live matching |
| Cabinet MP4 night build | #67 NB* | по желанию вечером |

---

## Definition of Done (день)

- [x] `TARIFF_MATRIX.md` в `main` (`bd5e575`).
- [ ] JE1 merged (или PR готов).
- [ ] Stop → analyze — event-driven в `mic-live-drone-analysis`.
- [ ] Журнал client/cabinet обновляется предсказуемо после новой записи.
- [ ] `yarn typecheck` / smoke по затронутым пакетам — зелёные.
- [ ] Вечером: `yarn ritual:evening` (архив + code-review).

---

## Команды

```bash
yarn morning-care --no-anthropic
yarn workspace @membrana/client dev
yarn workspace @membrana/cabinet dev
yarn typecheck
yarn test --filter=@membrana/media-library-service
```

---

**Статус:** фокус согласован с product (2026-06-15 вечер): платформа готова → чиним UX и фиксируем тарифы.
