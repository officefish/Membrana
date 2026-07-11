# Night Build: tooling-retro-2026-07-11

> Автономный ночной спринт: 6 S-тулинг-фаз по итогам сессии 2026-07-11.
> Регламент: [`docs/NIGHT_SPRINT_REGULATION.md`](../NIGHT_SPRINT_REGULATION.md). База — `main`.
> `id` = `tooling-retro-2026-07-11` в [`docs/tasks/registry.json`](../tasks/registry.json).

## Контекст

Сессия 2026-07-11 вскрыла повторяющуюся боль тулинга (office-vds сетевая диагностика,
рефактор detection-alarm, вечерний ритуал). Каждая фаза чинит конкретное место трения,
все — S-размера, без изменений `@membrana/core`. Каждая фаза = отдельный commit/PR через
`yarn pr:ship`, чекпойнт `yarn night:checkpoint --phase NB<n> --status pass|fail`.

## Фазы

### NB1 — `logs:parse`: шаблон detection-alarm
Парсер (`scripts/lib/client-logs-parser.mjs`) знает только старые MVP/v2-шаблоны → на
basn-сценариях врёт (`fn-1 bootstrap FAIL`, `trends FAIL` — ложные). Добавить смоук/секцию
для detection-alarm: `make-detection-fusion combinedScore`, `branch-on-detection → detected`,
`main → alarm (loop-transition-policy)`, per-tick `detected`/`confidence`, вход alarm по
`combinedScore>=0.5`. DoD: `yarn logs:parse` на detection-alarm-логе даёт корректные маркеры,
unit-тест парсера на sample-логе.

### NB2 — `yarn net:diag <ip>`
Скрипт-батарея «сервер недоступен → бандл для тикета»: TCP-connect+banner-grab, DF-ping
малый/крупный (PMTU-проба), tracert, (опц.) ssh -vvv; пишет `00-summary` с интерпретацией
(loss / PMTU / TCP-data-filter). Переиспользуемо для не-РФ VPS к 15-му. DoD: `yarn net:diag
<ip>` пишет бандл в указанную папку; unit-тест на классификатор диагноза (чистая функция).

### NB3 — `code-review --staged`
`code-review --uncommitted` ревьюит всё дерево (включая незакоммиченные daily-доки) → ложный
oversized + stash-пляска. Добавить `--staged` (ревью только `git diff --cached`). DoD: флаг
работает, документирован в `membrana-code-review` скилле.

### NB4 — `task:close-github` терпимость к missing archive-cards
Сегодня ритуал упал на 38 старых задачах без карточек. Сделать skip-missing с варнингом
(не обрывать цепочку) + опц. `task:repair-cards`. DoD: `task:close-github` не падает на
отсутствующей карточке, печатает варнинг; unit-тест.

### NB5 — ADR скилл/шаблон
Консилиум дважды дрейфовал; ADR-формат импровизировался руками. Создать `docs/adr/` +
шаблон `ADR_TEMPLATE.md` + скилл `membrana-adr` (лёгкая запись решения ниже консилиум-гейта).
Заметка в `membrana-consilium`: эхо-повтор пронумерованных пунктов брифа. DoD: шаблон + скилл
+ первый ADR (сегодняшний loop-switch перенести/связать) + `docs:lint` зелёный.

### NB6 — pack-тест canonical entry-ids
Alpha не стартовала (L36) из-за `alpha-*` вместо `SCENARIO_*_ENTRY` — всплыло на борде.
Добавить ассерт в `user-case-catalog.test`/pack: event-точки входа сценария ∈ `SCENARIO_*_ENTRY`.
DoD: тест ловит non-canonical entry-id до живого прогона; зелёный на текущих Beta/Gamma.

## Out of scope
- `@membrana/core` / `MembranaRegistry` изменения (запрет Night Build).
- Прод-деплой/smoke (утро / отдельный PR).
- Фикс самих сценариев (Alpha entry-id — завтрашняя сценарная сессия, NB6 только тест-гард).

## DoD эпика
Все 6 фаз смёржены отдельными PR; `yarn turbo run lint typecheck test` зелёный на затронутых
пакетах; `night:close` → HANDOFF.
