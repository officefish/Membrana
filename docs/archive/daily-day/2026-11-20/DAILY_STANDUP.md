<!--
  archive-role: archive-snapshot
  archive-day: 2026-11-20
  archived-at: 2026-11-20T14:30:20.380Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-11-20T07:08:10.000Z (yarn standup@f6da38ff) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGY_DAY, DAILY_CODE_REVIEW, GitHub Issues (25), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->
<!-- Источник фокуса: нет (магистраль владельцем не выбрана) -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"f6da38ffd8b63552f07d5fe1add2791e960836e2","digest":"073489de78dcfddc15dd1ebfacb8a6c8f84dce2b19d6aae69e764bc80ea61ef5","versionAt":"2026-11-20T09:55:53+03:00"}}} -->

## Фокус дня

- Магистраль владельцем ещё не выбрана (owner-choice отсутствует на 2026-11-20); стендап фокус не назначает

## Что сознательно не делаем

- Фазу 2 стратегии возвращения (выпуск FREE / качество обнаружения, S2–S5 combined→UserCases→studio-download→лендинг) и боевое включение уборки холодного архива — до приёмки контура g1–g7 по `#2632` / `archive-gc-journal-2588` и слова владельца.
- Повторные DSP-бенчмарки и «Этап 1.A» (harmonic/cepstral/spectral-flux, stage-gate на одиночном FFT) на free-v1 без смены датасета, алгоритма или fusion — потолок эшелона 0 зафиксирован; yamnet «разведкой» не открываем.
- Продуктовый располз по параллельным L-кандидатам (`assets-container`, `chart-list-plugin`) и вложение в хвосты старых PR (#1939, Night Hunt #1831/#1846/#1876, #1728, #1793) — только audit, не очередь исполнения, пока нет owner-choice магистрали на 2026-11-20.
- Закрытие эпика #2632 «по одному PR» и merge по docs-chore вместо границы media/office; красный `@membrana/client#test` вне scope — не в магистраль и не поводом расширять день.

---

## Роутинг персон (вычислено из реестра, не моделью)

- **Teamlead** · сила: Нагрузки и связки ролей, вердикты, ритм дня, приоритизация эпиков, приёмка исполнения · ведёт: `mfcc-compare-sprint` · последняя запись журнала: 2026-11-18
- **Архитектор** · сила: Границы модулей и пакетов, контракты, форма решения, цена альтернатив, ADR · ведёт: `archive-gc-journal-2588` (ещё 24) · последняя запись журнала: 2026-11-18
- **Структурщик** · сила: Сервисы, хуки, сторы, фасады, слабая связанность · ведёт: `firebat-node-device` (ещё 10) · последняя запись журнала: 2026-11-18
- **Математик** · сила: FFT, вейвлеты, спектр — чистые функции · ведёт: `frames-alive-dynin` (ещё 11) · последняя запись журнала: 2026-11-18
- **Музыкант** · сила: Эффекты, Web Audio, 24 bit / 48 kHz · ведёт: `node-duty-ready-predicate` · последняя запись журнала: 2026-11-18
- **Верстальщик** · сила: Презентационный UI по `DESIGN.md`, React/TS, a11y, адаптив · ведёт: `session-digest-library-face` (ещё 7) · последняя запись журнала: 2026-11-18

> Сила — из таблицы ролей `VIRTUAL_TEAM_PROMPT.md`; задача — из `registry.json`
> (`leadPersona`/`supportPersonas`); provenance — дата последней записи журнала персоны.
> Самооценка полезности во вход НЕ входит: вход роутинга — только объективный факт.

<details><summary>Нормы команды (дисциплина, честность, код-стайл, таланты)</summary>

Канон — [`docs/virtual-team/STANDUP_NORMS.md`](../virtual-team/STANDUP_NORMS.md). Стендап на него **ссылается, не копирует**.

</details>