<!--
  archive-role: archive-snapshot
  archive-day: 2026-09-29
  archived-at: 2026-09-29T17:55:23.572Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-09-29T11:31:53.360Z (yarn standup@cbbca0bc) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGY_DAY, DAILY_CODE_REVIEW, GitHub Issues (25), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->
<!-- Источник фокуса: owner-choice@chat/magistral-29-09 -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"cbbca0bc1113d0d356ad3e947fc0725250d5cfa5","digest":"ef5c58bcb0447746319bbee61f3ac1c46a021eb12d28fb6ad26dc0837d359a39","versionAt":"2026-09-29T14:25:35+03:00"}}} -->

# Ежедневный стендап — 2026-09-29

---

## Фокус дня

- **Выбор владельца:** Владелец 29.09: магистраль — three-roads-experiment (ответ «первое» на замороженный снимок: three-roads-experiment · pagination-a11y · batch-collection-run-contour; зачеканено author=human).

**Магистраль — `three-roads-experiment`** (owner-choice@chat/magistral-29-09, author=human, 29.09).

Сборка `794930f6` (`membrana-studio-windows`, 144 МБ) несёт одновременно массовый перенос (#2488/#2489/#2499) и пагинацию (#2505) — один выезд на прибор закрывает два долга, которые переносились третий день подряд. Главный риск: блокер — установка сборки на прибор руками владельца; без этого шага три из семи пунктов DoD недостижимы сегодня физически, и день снова закроется на синтетике. Критерий успеха к вечеру: протокол `docs/procedures/duty/2026-09-27.md` содержит факты В1–В3, Ч1, Т1–Т3 без изменения предсказаний, плюс один абзац о фризе/отсутствии при пагинации (#2476).

До установки сборки — два XS без ожидания: **Структурщик** (Ozhegov) закрывает `PERSONAS` → `scripts/lib/personas.mjs` (#2503/#2502), снимая точку рассинхронизации персон между `ask-persona.mjs`, `consilium.mjs` и `review-lead.mjs`; **Математик** (Dynin) прогоняет typecheck + lint по oversized PR #2505/#2506/#2507 (`yarn turbo run typecheck test lint --filter=@membrana/tooling`) и фиксирует вердикт одним абзацем — оба P2 из вчерашнего ревью (граничный тест на 36 ч и рассинхронизация `PERSONAS`) закрываются до прибора. **Teamlead** (Tarasov) перечеканивает `main-day-assertions.json` под `three-roads-experiment` первым действием — пока не сделано, `yarn main-day-probe` даёт ложный зелёный по снимку 26.09.

---

## Что сознательно не делаем

- **`angelina-hostess-impl`** — кандидат магистрали, владелец 29.09 выбрал другое; не трогаем, чтобы не расщепить фокус на L + L в один день.
- **`assets-container`** и **`batch-collection-run-contour`** — оба в top-3 кандидатов, оба L; без слова владельца в код не идём (канон Q1).
- **DSP-бенчмарки / повтор free-v1 / разведка yamnet** — потолок эшелона 0 зафиксирован (`FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6); повторный проход без смены датасета или fusion — трата слота.
- **Ревью-долг #2488→#2489→#2499 полным слотом** — в санитарные; выделенный архитектурный разбор откладывается на завтра первым, если прибор сегодня доступен.

---

## Роутинг персон (вычислено из реестра, не моделью)

- **Teamlead** · сила: Нагрузки и связки ролей, вердикты, ритм дня, приоритизация эпиков, приёмка исполнения · ведёт: `mfcc-compare-sprint` · журнала нет
- **Архитектор** · сила: Границы модулей и пакетов, контракты, форма решения, цена альтернатив, ADR · ведёт: `cowork-library-open-api` (ещё 49) · последняя запись журнала: 2026-09-28
- **Структурщик** · сила: Сервисы, хуки, сторы, фасады, слабая связанность · ведёт: `firebat-node-device` (ещё 24) · последняя запись журнала: 2026-09-28
- **Математик** · сила: FFT, вейвлеты, спектр — чистые функции · ведёт: `static-mmbrn-m6-alignment` (ещё 21) · последняя запись журнала: 2026-09-28
- **Музыкант** · сила: Эффекты, Web Audio, 24 bit / 48 kHz · ведёт: `node-duty-ready-predicate` (ещё 3) · последняя запись журнала: 2026-09-28
- **Верстальщик** · сила: Презентационный UI по `DESIGN.md`, React/TS, a11y, адаптив · ведёт: `session-digest-library-face` (ещё 11) · последняя запись журнала: 2026-09-28

> Сила — из таблицы ролей `VIRTUAL_TEAM_PROMPT.md`; задача — из `registry.json`
> (`leadPersona`/`supportPersonas`); provenance — дата последней записи журнала персоны.
> Самооценка полезности во вход НЕ входит: вход роутинга — только объективный факт.

<details><summary>Нормы команды (дисциплина, честность, код-стайл, таланты)</summary>

Канон — [`docs/virtual-team/STANDUP_NORMS.md`](../virtual-team/STANDUP_NORMS.md). Стендап на него **ссылается, не копирует**.

</details>