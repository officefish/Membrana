<!--
  archive-role: archive-snapshot
  archive-day: 2026-09-28
  archived-at: 2026-09-28T17:31:07.105Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-09-28T10:29:08.974Z (yarn standup@369cd8b9) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGY_DAY, DAILY_CODE_REVIEW, GitHub Issues (25), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->
<!-- Источник фокуса: нет (магистраль владельцем не выбрана) -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"f8b4637b67e5726702e764383640dea5f5e2c184","digest":"9dbdda055fb277398ac45183b944e06a4c1eea503ace1bde800f9e6152a9c821","versionAt":"2026-09-27T12:42:34+03:00"}}} -->

# Daily Standup — Membrana · 2026-09-28

---

## Фокус дня

- Магистраль владельцем ещё не выбрана (owner-choice отсутствует на 2026-09-28); стендап фокус не назначает

**Магистраль владельцем ещё не выбрана.**

Топ-3 кандидата из реестра и вчерашнего плана (в порядке накопленного давления):

| # | id | Размер | Давление |
|---|-----|--------|---------|
| 1 | `cabinet-registration-rollout` (#2369) | L | 4-й день OPEN; образ не пересобран с `--no-cache`; `cabinet.env` без `OFFICE_URL`/`OFFICE_API_TOKEN`; CI молчит при правках кабинета |
| 2 | `angelina-hostess-impl` | L | накопленный контекст персоны; видимый якорь дня для владельца |
| 3 | `batch-collection-run-contour` | L | буфер 95 % / ETA 293 с по вчерашнему `buffer-watch`; Dynin в фидбеке указал прямо |

**Слово владельца — единственный вход для назначения магистрали.**

---

### Что обязательно до первой строки нового кода

Вчерашний code-review зафиксировал **P1-долг четвёртый день подряд** — он не снят:

```bash
# 1. Typecheck + tests по затронутым пакетам
yarn turbo run typecheck test \
  --filter=@membrana/background-office \
  --filter=@membrana/client \
  --filter=@membrana/cabinet

# 2. Lint
yarn turbo run lint \
  --filter=@membrana/client \
  --filter=@membrana/cabinet

# 3. Архитектурный разбор oversized — выделенный слот, не попутно
yarn code-review:pr 2488
yarn code-review:pr 2489
yarn code-review:pr 2499
```

> Пока три oversized-PR (`#2488` / `#2489` / `#2499`) не прошли архитектурный разбор, HEAD не верифицирован. Любой новый код поверх непроверенного ствола — скрытый риск.

---

### Санитарные XS — сделать до обеда, независимо от магистрали

| Задача | Кто | Оценка | Почему не ждёт |
|--------|-----|--------|----------------|
| Пометить `night-hunt-graph.test.ts` тегом `integration` (хрупкий путь `../../../../../yarn.lock`) | **Dynin** | XS | 4-й день; CI нестабилен |
| Перечеканить `main-day-assertions.json` под `three-roads-experiment` (гейт 27.09 свежее ассерций 24.09) | **Angelina** | XS | расхождение магистралей снимается сейчас, не после |
| Исправить `CURRENT_TASK.md`: убрать устаревший `detector-scoreboard`, вписать актуальный фокус | **Angelina** | XS | 3-й день; дезориентирует холодные сессии |

---

## Что сознательно не делаем

- **Не повторяем DSP-бенчмарки на free-v1** — потолок эшелона 0 зафиксирован (`FFT_METRICS_POTENTIAL_AND_LIMITS.md §6`); yamnet в prod-бенчмарке (F1 0.803) де-факто открыл эшелон 2; «Этап 1.A / benchmark harmonic+cepstral+flux» как магистраль — закрытая тема.

- **Не берём `mfcc-compare-sprint` и `dads-benchmark-bridge`** — оба блокированы до стабилизации prod-среды (`cabinet-registration-rollout` #2369 ещё OPEN).

- **Не делаем попутный архитектурный разбор oversized-PR** — каждый из трёх (#2488/#2489/#2499) требует выделенного слота; попутный разбор создаёт ложное ощущение закрытости и маскирует реальный долг.

- **Не трогаем `batch-collection-run-contour` без консилиум-гейта** по модели исполнения — буфер давит, но запуск без гейта нарушает канон.

---

*Стендап сгенерирован координатором (Tarasov) · входы: `DAILY_CODE_REVIEW.md` 27.09, `DAY_PLAN.md` 28.09, `STRATEGY_DAY.md` #592, `MAIN_DAY_ISSUE.md` 27.09 · роутинг персон подставит скрипт*

---

## Роутинг персон (вычислено из реестра, не моделью)

- **Teamlead** · сила: Нагрузки и связки ролей, вердикты, ритм дня, приоритизация эпиков, приёмка исполнения · ведёт: `mfcc-compare-sprint` · журнала нет
- **Архитектор** · сила: Границы модулей и пакетов, контракты, форма решения, цена альтернатив, ADR · ведёт: `cowork-library-open-api` (ещё 49) · последняя запись журнала: 2026-09-27
- **Структурщик** · сила: Сервисы, хуки, сторы, фасады, слабая связанность · ведёт: `firebat-node-device` (ещё 24) · последняя запись журнала: 2026-09-27
- **Математик** · сила: FFT, вейвлеты, спектр — чистые функции · ведёт: `static-mmbrn-m6-alignment` (ещё 21) · последняя запись журнала: 2026-09-27
- **Музыкант** · сила: Эффекты, Web Audio, 24 bit / 48 kHz · ведёт: `node-duty-ready-predicate` (ещё 3) · последняя запись журнала: 2026-09-27
- **Верстальщик** · сила: Презентационный UI по `DESIGN.md`, React/TS, a11y, адаптив · ведёт: `session-digest-library-face` (ещё 11) · последняя запись журнала: 2026-09-27

> Сила — из таблицы ролей `VIRTUAL_TEAM_PROMPT.md`; задача — из `registry.json`
> (`leadPersona`/`supportPersonas`); provenance — дата последней записи журнала персоны.
> Самооценка полезности во вход НЕ входит: вход роутинга — только объективный факт.

<details><summary>Нормы команды (дисциплина, честность, код-стайл, таланты)</summary>

Канон — [`docs/virtual-team/STANDUP_NORMS.md`](../virtual-team/STANDUP_NORMS.md). Стендап на него **ссылается, не копирует**.

</details>