<!--
  archive-role: archive-snapshot
  archive-day: 2026-08-11
  archived-at: 2026-08-11T17:25:44.239Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-08-11T06:51:12.182Z (yarn standup@bca76eaf) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGY_DAY, DAILY_CODE_REVIEW, GitHub Issues (25), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"186ca6adc8253f6d56edc9b4aa7bba6ba1ddbd10","digest":"f3f3868ecbfbb7eed6501cc0d6f36ec09538cb3218a4e71f932f0dd591cfea6c"}}} -->

# Стендап Membrana — 2026-08-11

---

## Фокус дня

**Магистраль — `angelina-hostess-impl` (L): превратить Ангелину из декларации в живой вызываемый агент.**

Три кандидата выдвинуты планом дня, выбор за владельцем — но `angelina-hostess-impl` имеет наибольший операционный вес прямо сейчас: пока у Ангелины нет вызываемого контракта, ритуал дня оркеструется вручную, и любое масштабирование (server-only прогон через панель, `insight:insight-server-only-ritual-run`) упирается в то же отсутствие тела. Второй кандидат — `archivarius-sessions-container` — прямой питатель вехи `secret-parser-built` (gate: approaching): без контейнера резак режет, но класть некуда, и датированный проход с манифестом ротации ключей невозможен. Выбор между ними — слово владельца в первые 10 минут.

**Главный риск:** L-задача при нечётком DoD расползается за один день. Критерий успеха к вечеру — не «написан код», а проверяемое: либо Ангелина отвечает на вызов (hostess), либо `archivarius-sessions-container` принимает первую сессию без сырых секретов в транзите.

**Параллельно, не блокируя магистраль:**

- `friction6-secret-inventory` (#1266) — S, свободная карточка, прямой питатель вехи: без инвентаря резак режет вслепую. Начать после фиксации магистрали, не до.
- `fix-sprint-experience-dead-ends` — S, живой провод `sprint:experience` нужен для замера датированного прохода ротации ключей; зуб `sprint-experience-dead-ends-after-recut` рождён в `debt-ledger.jsonl`, задача в реестре не заведена — риск потери (P2 из вчерашнего ревью).

**Утренние команды (из code-review вчера, не выполнены):**

```bash
yarn turbo run lint typecheck --filter=@membrana/background-office --filter=@membrana/core
yarn catalog:verify-client
yarn network:snapshot          # сравнить с дельтой 444→918 ms от 10.08
yarn task:create --id sprint-experience-dead-ends-after-recut --size S
```

---

## Что сознательно не делаем

- **Oversized PR-очередь (#1785, #1789, #1801) — не разбираем до конца магистрали.** Третий день без вердикта — долг растёт, но разрыв контекста магистрали дороже. Разбор — после закрытия основного фокуса.
- **DSP-бенчмарки (`harmonic` / `cepstral` / `spectral-flux`) — не запускаем.** Потолок эшелона 0 зафиксирован (FFT_METRICS §6, trends `DRONE_TIGHT` 95%/30% — лучший результат); повтор без смены датасета или fusion не даёт новой информации. Три красных CI детекторов — только вердикт «аудио-дефект / инфраструктура» одной строкой на каждый, не новый прогон.
- **`angelina-hostess-impl` и `archivarius-sessions-container` одновременно — не берём.** L + L в один день без явного owner-choice расщепит фокус; одна магистраль, вторая — кандидат следующего дня.
- **Новые исследования (`mfcc-compare-sprint`, нейро-эшелон 2) — не открываем.** YAMNet уже в prod-бенчмарке (F1 0.803); «разведка» без нового датасета или fusion-задачи — повтор, не прогресс. Продуктовая полоса (FREE-тариф S2→S5) ждёт своего слова владельца отдельно.

---

## Роутинг персон (вычислено из реестра, не моделью)

- **Teamlead** · сила: Нагрузки и связки ролей, вердикты, ритм дня, приоритизация эпиков, приёмка исполнения · ведёт: `mfcc-compare-sprint` · журнала нет
- **Архитектор** · сила: Границы модулей и пакетов, контракты, форма решения, цена альтернатив, ADR · ведёт: `tariff-concurrent-move-reason` (ещё 50) · последняя запись журнала: 2026-08-10
- **Структурщик** · сила: Сервисы, хуки, сторы, фасады, слабая связанность · ведёт: `morning-journal-close-step` (ещё 41) · последняя запись журнала: 2026-08-10
- **Математик** · сила: FFT, вейвлеты, спектр — чистые функции · ведёт: `dreams-models-liveness` (ещё 41) · последняя запись журнала: 2026-08-10
- **Музыкант** · сила: Эффекты, Web Audio, 24 bit / 48 kHz · ведёт: `sca-manual-smoke` (ещё 1) · последняя запись журнала: 2026-08-10
- **Верстальщик** · сила: Презентационный UI по `DESIGN.md`, React/TS, a11y, адаптив · ведёт: `procedure-run-journal-panel-reader` (ещё 11) · последняя запись журнала: 2026-08-10

> Сила — из таблицы ролей `VIRTUAL_TEAM_PROMPT.md`; задача — из `registry.json`
> (`leadPersona`/`supportPersonas`); provenance — дата последней записи журнала персоны.
> Самооценка полезности во вход НЕ входит: вход роутинга — только объективный факт.

<details><summary>Нормы команды (дисциплина, честность, код-стайл, таланты)</summary>

Канон — [`docs/virtual-team/STANDUP_NORMS.md`](../virtual-team/STANDUP_NORMS.md). Стендап на него **ссылается, не копирует**.

</details>