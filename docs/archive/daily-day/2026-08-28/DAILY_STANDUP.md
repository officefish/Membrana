<!--
  archive-role: archive-snapshot
  archive-day: 2026-08-28
  archived-at: 2026-08-28T18:31:24.405Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-08-28T08:26:56.143Z (yarn standup@6f08dd35) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGY_DAY, DAILY_CODE_REVIEW, GitHub Issues (25), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"63326cb34a2e713295f30cf574111e30fe397a10","digest":"a074412297cda2275aa7d2f38a2ee28e7ca32b4e0679e101e06c67522cc2c65b"}}} -->

## Фокус дня
- **#2204 — green-тесты media-буфера + воспроизводимый стоп по remaining/порогу до дежурства 28.08.**
- Вчера в ствол ушли ядро и dual-mount, но вечерний BLOCK: RED `@membrana/media-library-service` / `@membrana/background-media` и в развёрнутом диффе нет проверяемого DoD п.3 (remaining + порог стопа + сигнал наружу) — без этого квота на живом дежурстве снова упирается в «кнопки без продуктового стопа». Главный риск — принять GC/UI за закрытие #2204 или уйти в новый L из top-3 DAY_PLAN, пока гигиена и стоп не фальсифицируемы. Критерий к вечеру: `turbo test` по media-library + background-media → green; стоп сценария по порогу воспроизводим **или** явная gap-таблица в #2204; smoke частичной разгрузки ≠ wipe-all на буфере узла; `main-day-assertions.json` sources[0] → мандат 27–28.08/#2204.

## Что сознательно не делаем
- Новый L-эпик из top-3 DAY_PLAN (`angelina-hostess-impl` / `assets-container` / `batch-collection-run-contour`) как магистраль — пока owner-choice и #2204 не закрыты по BLOCK.
- `secret-parser-built` / резак / ротация ключей с выкладкой — горизонт и подкрепление, не primary coding-focus пятницы дежурства.
- FFT / «Этап 1.A» / benchmark harmonic+cepstral+flux / `detector-scoreboard` как витрина — не магистраль; эшелон-0 потолок и FREE-форсайт не подменяют media-квоту сегодня.
- Oversized-хвосты #2208/#2211/#2212 и play-path #2177 — только если цепляют прод/квоту; иначе после green и стопа.

---

## Роутинг персон (вычислено из реестра, не моделью)

- **Teamlead** · сила: Нагрузки и связки ролей, вердикты, ритм дня, приоритизация эпиков, приёмка исполнения · ведёт: `mfcc-compare-sprint` · журнала нет
- **Архитектор** · сила: Границы модулей и пакетов, контракты, форма решения, цена альтернатив, ADR · ведёт: `studio-package-av-refusal` (ещё 50) · последняя запись журнала: 2026-08-27
- **Структурщик** · сила: Сервисы, хуки, сторы, фасады, слабая связанность · ведёт: `firebat-node-device` (ещё 27) · последняя запись журнала: 2026-08-27
- **Математик** · сила: FFT, вейвлеты, спектр — чистые функции · ведёт: `static-mmbrn-m6-alignment` (ещё 22) · последняя запись журнала: 2026-08-27
- **Музыкант** · сила: Эффекты, Web Audio, 24 bit / 48 kHz · ведёт: `node-duty-ready-predicate` (ещё 4) · последняя запись журнала: 2026-08-27
- **Верстальщик** · сила: Презентационный UI по `DESIGN.md`, React/TS, a11y, адаптив · ведёт: `playback-hang-timeout` (ещё 13) · последняя запись журнала: 2026-08-27

> Сила — из таблицы ролей `VIRTUAL_TEAM_PROMPT.md`; задача — из `registry.json`
> (`leadPersona`/`supportPersonas`); provenance — дата последней записи журнала персоны.
> Самооценка полезности во вход НЕ входит: вход роутинга — только объективный факт.

<details><summary>Нормы команды (дисциплина, честность, код-стайл, таланты)</summary>

Канон — [`docs/virtual-team/STANDUP_NORMS.md`](../virtual-team/STANDUP_NORMS.md). Стендап на него **ссылается, не копирует**.

</details>