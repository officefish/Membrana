<!--
  archive-role: archive-snapshot
  archive-day: 2026-08-23
  archived-at: 2026-08-23T13:27:47.851Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-08-23T05:26:58.625Z (yarn standup@0a495865) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGY_DAY, DAILY_CODE_REVIEW, GitHub Issues (25), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"82a93a6e7d874ace13057d78bafcb8f9bf32b36c","digest":"cc1cf035d66919ac51439bdfc31750c7ab2cd5dbe5ca29531a5102941510f43a"}}} -->

## Фокус дня
- **Согласовать форму настоящего дома журнала (`journal-home-real`) для человека — буфер · наборы · архив — и зафиксировать нарезку до любого UI-кода.**
- Owner-choice 22.08 ещё не закрыт критерием «форма согласована»; #2046/#2065 уже в стволе, поэтому rate — подкрепление, а не смена L-оси. Главный риск — начать верстку/hostess/assets «рядом» без слова владельца или принять обход rate на одном из путей. К вечеру: письменная нарезка формы (экраны/обещания тарифов) с явным «да» владельца; живой smoke — старт сценария → только 48 kHz или отказ на **первом** треке; top-3 L из плана (hostess / assets / batch) не стартуем без нового owner-choice.

## Что сознательно не делаем
- UI-код `journal-home-real` и параллельные L без choose: `angelina-hostess-impl`, `assets-container`, `batch-collection-run-contour`
- «Этап 1.A» / повторный benchmark harmonic+cepstral+flux на free-v1 и код `mfcc-compare-sprint` без вердикта по открытым issue
- Закрытие вехи `secret-parser-built` (#2022 кр.3) кодом дня — только claims-probe/инвентарь резака, без снятия амнистии импровизацией
- Построчный разбор oversized-долга (#2065/#2068/#2067/…) как магистраль дня — P1-ревью точечно, не вместо формы журнала

---

## Роутинг персон (вычислено из реестра, не моделью)

- **Teamlead** · сила: Нагрузки и связки ролей, вердикты, ритм дня, приоритизация эпиков, приёмка исполнения · ведёт: `mfcc-compare-sprint` · журнала нет
- **Архитектор** · сила: Границы модулей и пакетов, контракты, форма решения, цена альтернатив, ADR · ведёт: `chart-list-plugin` (ещё 47) · последняя запись журнала: 2026-08-22
- **Структурщик** · сила: Сервисы, хуки, сторы, фасады, слабая связанность · ведёт: `firebat-node-device` (ещё 27) · последняя запись журнала: 2026-08-22
- **Математик** · сила: FFT, вейвлеты, спектр — чистые функции · ведёт: `static-mmbrn-m6-alignment` (ещё 22) · последняя запись журнала: 2026-08-22
- **Музыкант** · сила: Эффекты, Web Audio, 24 bit / 48 kHz · ведёт: `scenario-rate-first-capture` (ещё 3) · последняя запись журнала: 2026-08-22
- **Верстальщик** · сила: Презентационный UI по `DESIGN.md`, React/TS, a11y, адаптив · ведёт: `lpc-d-panel` (ещё 10) · последняя запись журнала: 2026-08-22

> Сила — из таблицы ролей `VIRTUAL_TEAM_PROMPT.md`; задача — из `registry.json`
> (`leadPersona`/`supportPersonas`); provenance — дата последней записи журнала персоны.
> Самооценка полезности во вход НЕ входит: вход роутинга — только объективный факт.

<details><summary>Нормы команды (дисциплина, честность, код-стайл, таланты)</summary>

Канон — [`docs/virtual-team/STANDUP_NORMS.md`](../virtual-team/STANDUP_NORMS.md). Стендап на него **ссылается, не копирует**.

</details>