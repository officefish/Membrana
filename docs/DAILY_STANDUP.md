<!-- Сгенерировано: 2026-11-21T07:10:13.085Z (yarn standup@d070c44f) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGY_DAY, DAILY_CODE_REVIEW, GitHub Issues (25), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->
<!-- Источник фокуса: нет (магистраль владельцем не выбрана) -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"0b9871866b5846cd49520395e61b3df07e37274f","digest":"21c3a9488ee53cf1d984b2e8f405db5b2f29d444031e6650c807258d0695db2e","versionAt":"2026-11-20T11:06:42+03:00"}}} -->

## Фокус дня

- Магистраль владельцем ещё не выбрана (owner-choice отсутствует на 2026-11-21); стендап фокус не назначает

## Что сознательно не делаем

- Не включаем боевой cold-archive (`COLD_ARCHIVE_SWEEP_DRY_RUN=false` / live purge) и не принимаем g7 «по умолчанию»: только после diff-pass oversized `0b987186`/`242aef3d`, замка D1 (одна реплика media или явное ограничение в ADR-0032) и слова владельца на september.
- Не размораживаем недельный контур и не уходим в top-3 магистрали дня (`assets-container`, `chart-list-plugin`, `detection-alarm-loop-refactor`), пока owner-choice не зафиксирован и веха `return-hygiene` не добита (busboy/media, Docker Desktop, weekly-plan PR + token — по горизонту, без подмены фокуса стендапом).
- Не поднимаем детекцию как главную полосу: без «Этап 1.A» / повторного benchmark harmonic+cepstral+flux на free-v1, без «разведки» yamnet (эшелон 2 уже в prod) и без phase-2 FREE/качества обнаружения до закрытия уборщика и гигиены возврата.
- Не размазываем день по хвостам вне опорной оси return-hygiene/g6–g7: a11y cold-archive UI, orphan_blob, token-revision (#2662), trace-teardown (#2659), build-order tooth (#2653) — только как санитарные/follow-up, не как смена магистрали.

---

## Роутинг персон (вычислено из реестра, не моделью)

- **Teamlead** · сила: Нагрузки и связки ролей, вердикты, ритм дня, приоритизация эпиков, приёмка исполнения · ведёт: `mfcc-compare-sprint` · последняя запись журнала: 2026-11-20
- **Архитектор** · сила: Границы модулей и пакетов, контракты, форма решения, цена альтернатив, ADR · ведёт: `obs-sentry-container` (ещё 23) · последняя запись журнала: 2026-11-20
- **Структурщик** · сила: Сервисы, хуки, сторы, фасады, слабая связанность · ведёт: `firebat-node-device` (ещё 10) · последняя запись журнала: 2026-11-20
- **Математик** · сила: FFT, вейвлеты, спектр — чистые функции · ведёт: `frames-alive-dynin` (ещё 11) · последняя запись журнала: 2026-11-20
- **Музыкант** · сила: Эффекты, Web Audio, 24 bit / 48 kHz · ведёт: `node-duty-ready-predicate` · последняя запись журнала: 2026-11-20
- **Верстальщик** · сила: Презентационный UI по `DESIGN.md`, React/TS, a11y, адаптив · ведёт: `session-digest-library-face` (ещё 7) · последняя запись журнала: 2026-11-20

> Сила — из таблицы ролей `VIRTUAL_TEAM_PROMPT.md`; задача — из `registry.json`
> (`leadPersona`/`supportPersonas`); provenance — дата последней записи журнала персоны.
> Самооценка полезности во вход НЕ входит: вход роутинга — только объективный факт.

<details><summary>Нормы команды (дисциплина, честность, код-стайл, таланты)</summary>

Канон — [`docs/virtual-team/STANDUP_NORMS.md`](../virtual-team/STANDUP_NORMS.md). Стендап на него **ссылается, не копирует**.

</details>