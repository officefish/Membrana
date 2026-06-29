# Review: Loop engineering — соревновательное тестирование с точками останова

> `yarn insight review insight-loop-engineering-competition-test` · 2026-06-25 (virtual team, на основе INSIGHT + RESEARCH)

[Teamlead]: Идея закрывает боль packaging-эпика: L17–L20 ловились post-hoc без привязки к узлу. Loop engineering — правильный следующий слой поверх operator smoke (`insight-operator-smoke-ci-gate`), но не блокер merge #179/#181. Рекомендую **deferred** до стабилизации smoke-критериев и одного adopted pilot из G–I; затем отдельный S/M эпик «test loop host v0» с LGTM. Не в дневной ритуал.

[Структурщик]: Архитектурно чисто, если breakpoint живёт в `scenario-engine` / runtime trace, а не в Playwright-debugger. Уже есть `PauseRuntime` как graph-node (DBP2) — не путать с test breakpoint API. Нужен контракт `TraceEvent` + `exportSnapshot()` в `packages/device-board`, тонкий `apps/test-runner` или script в `scripts/`, без циклов client↔services. Субагент — потребитель trace, не владелец runtime.

[Математик]: Детерминизм tick-loop и resume — главный риск; research подтверждает: не freeze браузера mid-AudioWorklet. Для CI — unit/integration на чистом engine; для competition forks — счётчики chain-log и diff snapshot. Скриптовая обвязка (`insight.mjs`-стиль) ок. Оценка умеренная: без формального контракта trace flakiness съест velocity.

[Музыкант]: Web Audio на headless не заменит test loop host — отдельная машина обоснована (permissions, autoplay, mic journal, clip recorder L18). Breakpoint на узле «после FFT» / «до upload» — именно то, что нужно для async-v2 Act IIb. Поддерживаю после минимального smoke gate; v0 может быть operator CLI + paused snapshot без красивого UI.

[Верстальщик]: Dashboard «сценарий X на узле Y» — nice-to-have; v0 достаточно markdown/json handoff в чат агенту. Если будет UI — отдельная панель operator mode, токены `DESIGN.md`, не засорять device-board canvas. Приоритет ниже инфраструктуры trace.

## Голосование приоритета (1–10)

| Роль | Внедрять | Этап | /10 |
|------|----------|------|-----|
| Teamlead | да, после smoke pilot | месяц | 8 |
| Структурщик | да | месяц | 7 |
| Математик | частично (trace contract) | после MVP competition | 6 |
| Музыкант | да | неделя–месяц (real host) | 8 |
| Верстальщик | опционально (dashboard) | после v0 CLI | 5 |

**Средний балл:** 6.8

## Резюме Teamlead

- Рекомендуемый статус: **deferred** (стратегически adopted — внедрять после `insight-operator-smoke-ci-gate`)
- Влияние на plan:week: **weight 6.8** — включить в недельный обзор как «competition test loop v0»; не в `MAIN_DAY_ISSUE` без отдельного task-промпта
- Следующий шаг (если adopted): эпик S — контракт `BreakpointSet`/`TraceEvent`, CLI `yarn test-loop snapshot`, один fork (Gamma) на dedicated host + субагент playbook в `.cursor/skills/`
