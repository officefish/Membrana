# INSIGHT: Loop engineering — соревновательное тестирование с точками останова

| Поле | Значение |
|------|----------|
| **ID** | `insight-loop-engineering-competition-test` |
| **Статус** | deferred |
| **Источник** | user (фаза J спринта `insight-process-registration-2026-06-25`) |
| **Создан** | 2026-06-25 |

---

## Проблема / наблюдение

Отладка competition UserCase (alpha/beta/gamma async-v2) сейчас — ручной operator smoke на машине разработчика: Run ≥60s, paste logs, `yarn logs:parse`, итерации L17–L20. Виртуальная команда и исправляющий агент получают **агрегированный** лог без привязки к конкретному узлу графа и тику сценария. Нет изоляции «тестовой петли» от основной рабочей станции.

## Гипотеза

**Loop engineering** — выделенный компьютер (test loop host) + **субагент-тестировщик**, который:

1. Запускает / останавливает / **ставит на паузу** сценарии competition forks.
2. Поддерживает **точки останова** на заданных узлах device-board (node id / function block / exec step).
3. На паузе отдаёт виртуальной команде (и агенту-фиксеру) **контекст этапа**: runId, tick, branch, nodeId, chain-log срез, показания узла (refs, store snapshots где возможно).
4. Цикл: breakpoint → диагностика → fix PR → resume — без полного перезапуска с нуля (где runtime позволяет).

Это эволюция operator smoke (инсайт `insight-operator-smoke-ci-gate`) от «post-merge human Run» к **инженерной петле отладки** с явной границей test host ↔ dev host.

## Scope (черновик)

**In scope:**

- Архитектура: test loop host, tester subagent, протокол pause/breakpoint/resume
- Контракт «снимок на узле» (минимум: logs-parse поля + node enter + variable/ref handles)
- Интеграция с `yarn logs:parse`, `OPERATOR_DEBUG_LOG`, lessons registry
- Связка с виртуальной командой (формат handoff для `/review`, fix agent)

**Out of scope (v0 insight):**

- Полная замена Playwright CI на всех ветках
- Remote WebSocket MP7 device-board (если ещё не в runtime)
- Автоматический merge без LGTM

## Связи

- `insight-operator-smoke-ci-gate` — smoke criteria, CI gate (комплементарно)
- `insight-competition-catalog-pipeline` — какие forks гонять
- `docs/competition-sprint/comp-packaging-catalog-2026-06-25/OPERATOR_DEBUG_LOG.md`
- `packages/device-board` — PauseRuntime, scenario runtime, `onNodeEnter`
- `membrana-client-logs-parsing` skill
- Phase C competition regulation, `usercase.mjs verify-pack`

## Оператор / тестировщик видит

- Dashboard или CLI: «сценарий X на узле Y, tick N, paused»
- Экспорт пакета для чата: breakpoint report (markdown/json)
- Команды: `run`, `pause-at <nodeId>`, `resume`, `stop`, `snapshot`

## Вопросы для research (Q1–Q3)

1. **Landscape:** breakpoint / time-travel debugging in visual node editors, E2E test harnesses with pause (Unreal Blueprint debugger, n8n, Node-RED, Playwright debug, Chrome DevTools protocol) 2024–2026
2. **Fit (Membrana):** device-board PauseRuntime, scenario tick loop, headless client vs dedicated test machine, Cursor subagent as operator
3. **Risk:** flaky pause semantics, Web Audio on headless host, state drift on resume, operational cost of second machine
