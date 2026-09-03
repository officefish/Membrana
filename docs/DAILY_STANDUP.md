<!-- Сгенерировано: 2026-09-03T10:47:10.992Z (yarn standup@6772645a) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGY_DAY, DAILY_CODE_REVIEW, GitHub Issues (25), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"564238012474b93ad6fa7ade16ae48cc28041d0d","digest":"9013d121b75ea24e6eadafed4068d2d5aa3285283210bcf7656cb2338c838340"}}} -->

## Фокус дня
- **Снять P0-блокеры merge (`#2266` + вердикт `#2256`) и закрыть хвост `sample-move-between-collections` в обоих домах (Studio + кабинет).**
- Owner-мандат 31.08 (набор→набор без буфера) всё ещё в санитарном хвосте; вечернее ревью держит product-merge до диагноза красных `@membrana/media-library-service` / `@membrana/background-cabinet`. `#2266` уже даёт проверяемую причину (порог 5 с при 5,4–5,6 с; у `background-media` тот же класс лечат `testTimeout: 30_000`), `#2256` — false red без `dist`/CI-контура, не регресс продукта. Главный риск — принять флаки за регресс `isReadOnlyCollection`/`canMutate` и раздуть diff или починить только один дом. К вечеру: фильтры media-library + cabinet зелёные либо issue с вердиктом «помеха vs pre-existing»; в обоих домах A→B без `selectedId === BUFFER_COLLECTION_ID`; buffer→набор и серверные запреты (тариф, same) без регрессии; merge только после этого.

## Что сознательно не делаем
- Старт L-кандидатов `angelina-hostess-impl` / `assets-container` / `batch-collection-run-contour` без нового слова владельца.
- Боевой проход гейта `secret-parser-built` и правки архива сессий (только dry-run/черновик манифеста — подкрепление, не ствол).
- DSP/FFT «Этап 1.A» / benchmark harmonic+cepstral+flux / stage-gate на free-v1 и «разведку» yamnet.
- `detector-scoreboard` / содержимое `CURRENT_TASK.md` как канон дня; oversized `47d731e9` и PR-долги — только после/рядом с P0, не главная полоса.

---

## Роутинг персон (вычислено из реестра, не моделью)

- **Teamlead** · сила: Нагрузки и связки ролей, вердикты, ритм дня, приоритизация эпиков, приёмка исполнения · ведёт: `mfcc-compare-sprint` · журнала нет
- **Архитектор** · сила: Границы модулей и пакетов, контракты, форма решения, цена альтернатив, ADR · ведёт: `cowork-library-open-api` (ещё 51) · последняя запись журнала: 2026-09-02
- **Структурщик** · сила: Сервисы, хуки, сторы, фасады, слабая связанность · ведёт: `firebat-node-device` (ещё 27) · последняя запись журнала: 2026-09-02
- **Математик** · сила: FFT, вейвлеты, спектр — чистые функции · ведёт: `static-mmbrn-m6-alignment` (ещё 22) · последняя запись журнала: 2026-09-02
- **Музыкант** · сила: Эффекты, Web Audio, 24 bit / 48 kHz · ведёт: `node-duty-ready-predicate` (ещё 4) · последняя запись журнала: 2026-09-02
- **Верстальщик** · сила: Презентационный UI по `DESIGN.md`, React/TS, a11y, адаптив · ведёт: `playback-hang-timeout` (ещё 13) · последняя запись журнала: 2026-09-02

> Сила — из таблицы ролей `VIRTUAL_TEAM_PROMPT.md`; задача — из `registry.json`
> (`leadPersona`/`supportPersonas`); provenance — дата последней записи журнала персоны.
> Самооценка полезности во вход НЕ входит: вход роутинга — только объективный факт.

<details><summary>Нормы команды (дисциплина, честность, код-стайл, таланты)</summary>

Канон — [`docs/virtual-team/STANDUP_NORMS.md`](../virtual-team/STANDUP_NORMS.md). Стендап на него **ссылается, не копирует**.

</details>