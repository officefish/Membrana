<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-31
  archived-at: 2026-07-31T14:15:49.559Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-31T05:12:14.036Z (yarn standup@2d3d1f4b) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGY_DAY, DAILY_CODE_REVIEW, GitHub Issues (25), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"d45f7b7feee97a02969a668a9e59c7b40898b84e","digest":"98ab5332399c5de3b002e3eaf68e47439e5f2f756f3795405e8ad995f1612245"}}} -->

## Фокус дня
- **День 3/3 продуктовой трёхдневки: доставить MFCC-ядро в main (потребляемый пакет, не stand-in и не ветка-демонстрация).**
- Вчерашний контур и `storm/mfcc-sprint-test-3007` показали ядро; санитарная боль дня — «показал ≠ доставил»: 12 коммитов вне main, риск цифр с пометкой `core: stand-in`. Главный риск — подмена primary вехой `secret-parser-built` / night-build / archivarius или UI-обёрткой без math-core и без merge. Критерий к вечеру: стабильный API MFCC в сервисном/math-слое (`@membrana/fft-analyzer` или согласованный модуль), зелёные тесты (размерность, детерминизм, тишина/короткий буфер), право `instrument.mfcc` на T2 без утечки на FREE, обозримый PR/squash в сторону main — не только документ и не пакетный LGTM oversized.

## Что сознательно не делаем
- `secret-parser-built` / `archivarius-sessions-container` / `agent-tooling-night-build` / `angelina-hostess-impl` как primary (горизонт и top-3 DAY_PLAN — contingency после трёхдневки).
- UI/витрина MFCC, scoreboard-плагин и «Этап 1.A» / benchmark harmonic+cepstral+flux на free-v1 — не магистраль.
- Пакетный LGTM 19 oversized (#1499 / #1467 и др.) — только один точечный `yarn code-review:pr` в санитарной полосе, не вместо поставки ядра.
- Полный L-эпик нейро-спектрограмм (второй инструмент тарифа 2) и недельная стратегия.

---

## Роутинг персон (вычислено из реестра, не моделью)

- **Teamlead** · сила: Нагрузки и связки ролей, вердикты, ритм дня, приоритизация эпиков, приёмка исполнения · ведёт: `mfcc-compare-sprint` (ещё 1) · журнала нет
- **Архитектор** · сила: Границы модулей и пакетов, контракты, форма решения, цена альтернатив, ADR · ведёт: `worktree-hygiene-epic` (ещё 58) · последняя запись журнала: 2026-07-30
- **Структурщик** · сила: Сервисы, хуки, сторы, фасады, слабая связанность · ведёт: `tooling-sanitary-pack-3007` (ещё 73) · последняя запись журнала: 2026-07-30
- **Математик** · сила: FFT, вейвлеты, спектр — чистые функции · ведёт: `mfcc-lib-choice` (ещё 39) · последняя запись журнала: 2026-07-30
- **Музыкант** · сила: Эффекты, Web Audio, 24 bit / 48 kHz · ведёт: `media-library-a3-mic-recorder` (ещё 8) · последняя запись журнала: 2026-07-30
- **Верстальщик** · сила: Презентационный UI по `DESIGN.md`, React/TS, a11y, адаптив · ведёт: `lpc-d-panel` (ещё 21) · последняя запись журнала: 2026-07-30

> Сила — из таблицы ролей `VIRTUAL_TEAM_PROMPT.md`; задача — из `registry.json`
> (`leadPersona`/`supportPersonas`); provenance — дата последней записи журнала персоны.
> Самооценка полезности во вход НЕ входит: вход роутинга — только объективный факт.

<details><summary>Нормы команды (дисциплина, честность, код-стайл, таланты)</summary>

Канон — [`docs/virtual-team/STANDUP_NORMS.md`](../virtual-team/STANDUP_NORMS.md). Стендап на него **ссылается, не копирует**.

</details>