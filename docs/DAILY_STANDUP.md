<!-- Сгенерировано: 2026-08-08T08:00:33.609Z (yarn standup@6fca825a) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGY_DAY, DAILY_CODE_REVIEW, GitHub Issues (25), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"39c178a9eeb42a44427a5bec09720ab8de8a55c7","digest":"93d4ce219ba79937f8de450d2a6985c6934a380a3baca3d1c1a41fd6f987f489"}}} -->

# Ежедневный стендап Membrana — 2026-08-08

---

## Фокус дня

**Провод `tariff-promo-server-wiring` — замкнуть серверный роут и атомарное списание промокода.**

Вчерашний code-review подтвердил: `decideTransition` с 16 зубами теста существует, но ни один серверный роут её не вызывает — все 16 упоминаний внутри собственного теста домена. `spendPromo` — аналогично. Домен готов, потребителя нет. Задача дня — не дописывать логику, а замкнуть провод: серверный обработчик вызывает `decideTransition`, атомарная Prisma-транзакция списывает попытку промокода, клиент получает различимую причину отказа из закрытого списка (`promo_revoked` / `promo_already_redeemed` / `promo_expired` / `promo_target_mismatch` / `promo_downgrade_forbidden`).

**Главный риск:** атомарность `spendPromo` декларирована, но не проверена под двойным вызовом — без изолированного теста транзакции это точка скрытого двойного списания. Критерий успеха к вечеру: `grep decideTransition` показывает вызов вне теста домена, хотя бы один интеграционный зуб проходит по реальному маршруту, `yarn typecheck` зелёный в затронутых пакетах.

**Санитарный P1 — до старта основной работы:**
закрыть orphaned run `ritual-day-2026-08-07-r2`:
```bash
yarn procedure:close ritual-day-2026-08-07-r2 --status fail --gaps orphaned
```
Без этого утренний ритуал спотыкается и вносит шум в трейл.

**Санитарный P1 — параллельно первой работе:**
вынести вердикт по красному CI трёх детекторов (`cepstral` / `harmonic` / `spectral-flux`) — одна строка на каждый «аудио-дефект / инфраструктура» — и первый oversized из очереди:
```bash
yarn turbo run typecheck --filter=@membrana/background-cabinet --filter=@membrana/background-office
yarn code-review:pr 1765
```
Очередь из 9 oversized PR не сокращается третий день; без вердиктов ночной прогон не имеет судьи.

---

## Что сознательно не делаем

- **`angelina-hostess-impl` / `archivarius-sessions-container` / `assets-container`** — кандидаты первого снимка топ-3; owner-choice 07.08 перекрыл их прямым называнием оси `tariff-promo-server-wiring`. Возвращаемся к ним только при явном owner-choice сегодня.
- **Новые DSP-бенчмарки (`harmonic` / `cepstral` / `spectral-flux` на free-v1)** — потолок эшелона 0 зафиксирован (`DRONE_TIGHT` 95%/30%); физика не изменилась, повтор замеров не даст новой информации.
- **`secret-parser-built` (резак в `night-triage-secret-scan.mjs`) и ротация ключей** — это условие прохождения вехи, но оно подкрепляющее, не магистральное; берётся только если магистраль замкнута раньше вечера или owner-choice переключает фокус.
- **Добавление новых шаблонов trends FFT или MFCC-спринт** — `mfcc-compare-sprint` в ведении Teamlead, но без owner-gate на смену магистрали не стартует параллельно; детекционная полоса сегодня поддерживающая (вердикты CI), не ведущая.

---

## Роутинг персон (вычислено из реестра, не моделью)

- **Teamlead** · сила: Нагрузки и связки ролей, вердикты, ритм дня, приоритизация эпиков, приёмка исполнения · ведёт: `mfcc-compare-sprint` (ещё 1) · журнала нет
- **Архитектор** · сила: Границы модулей и пакетов, контракты, форма решения, цена альтернатив, ADR · ведёт: `tariff-promo-server-wiring` (ещё 64) · последняя запись журнала: 2026-08-07
- **Структурщик** · сила: Сервисы, хуки, сторы, фасады, слабая связанность · ведёт: `swallow-own-moment` (ещё 79) · последняя запись журнала: 2026-08-07
- **Математик** · сила: FFT, вейвлеты, спектр — чистые функции · ведёт: `corpus-track-acceptance-predicate` (ещё 45) · последняя запись журнала: 2026-08-07
- **Музыкант** · сила: Эффекты, Web Audio, 24 bit / 48 kHz · ведёт: `media-library-a3-mic-recorder` (ещё 8) · последняя запись журнала: 2026-08-07
- **Верстальщик** · сила: Презентационный UI по `DESIGN.md`, React/TS, a11y, адаптив · ведёт: `procedure-run-journal-panel-reader` (ещё 21) · последняя запись журнала: 2026-08-07

> Сила — из таблицы ролей `VIRTUAL_TEAM_PROMPT.md`; задача — из `registry.json`
> (`leadPersona`/`supportPersonas`); provenance — дата последней записи журнала персоны.
> Самооценка полезности во вход НЕ входит: вход роутинга — только объективный факт.

<details><summary>Нормы команды (дисциплина, честность, код-стайл, таланты)</summary>

Канон — [`docs/virtual-team/STANDUP_NORMS.md`](../virtual-team/STANDUP_NORMS.md). Стендап на него **ссылается, не копирует**.

</details>