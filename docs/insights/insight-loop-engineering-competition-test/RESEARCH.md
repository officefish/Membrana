# Research: Loop engineering — соревновательное тестирование с точками останова

> `yarn insight research insight-loop-engineering-competition-test` · источник: **Perplexity MCP** (2026-06-25)

## Q1 — Landscape

**Запрос:** Loop engineering: соревновательное тестирование с точками останова: industry landscape, open-source approaches 2024-2026

**Выжимка:**

- **Визуальные графы:** Unreal Blueprints — эталон node-level breakpoints + Functional Tests; n8n/Node-RED — inspection через execution history и replay узлов, не полноценный debugger.
- **E2E:** Playwright (`PWDEBUG`, trace viewer) и Cypress (time-travel UI) дают pause/step на **шагах теста**, не на узлах продуктового графа; CDP — pause на DOM/JS событиях.
- **Паттерн 2024–2026:** record + replay + trace (LangFuse, AgentOps для агентов) вместо детерминированного time-travel; AI-агенты в CI-loop пишут/чинят Playwright-тесты (Instawork, BrowserBash, MCP).
- **Gap:** нет open-source «единого графа» с breakpoints на workflow-узлах + browser + agent trace; стыковка из нескольких инструментов.

**Импликация для Membrana:** breakpoint должен жить в **scenario-engine** (семантика узла), а не в debugger браузера; E2E/Playwright — оболочка test loop host.

---

## Q2 — Fit (Membrana)

**Запрос:** Loop engineering: соревновательное тестирование с точками останова: fit with Web Audio, edge recording, zero-shot audio, TypeScript monorepo

**Выжимка:**

- **Архитектура:** `scenario-engine` с `BreakpointSet`, `TraceEvent` на каждый tick, `PauseRuntime` (pause/resume/step), порты для audio (`audio-sim` vs `audio-browser`).
- **Субагент:** оператор, не control plane — читает trace, сверяет ожидания, экспортирует snapshot; аналог scenario-based automated testing.
- **Test loop host:** реальная машина для Web Audio, permissions, autoplay, device-board UI; headless + `audio-sim` для CI логики графа.
- **Связка с монорепо:** чистая логика в `packages/device-board` runtime; `apps/test-runner` + operator mode; те же UserCase manifests, что и `usercase.mjs verify-pack`.

**Импликация:** v0 — расширить существующий `PauseRuntime` + chain-log контракт; не ждать remote MP7.

---

## Q3 — Risk

**Запрос:** Loop engineering: соревновательное тестирование с точками останова: risks latency cost privacy licensing flakiness team velocity

**Выжимка:**

| Риск | Митигация |
|------|-----------|
| Flaky pause в Web Audio (AudioWorklet ≠ JS thread) | Breakpoints в **доменном** runtime, не debugger; semantic waits |
| State drift on resume | Короткие сценарии; snapshot domain state; reset между прогонами |
| Headless без реального audio | OfflineAudioContext / integration tests; E2E только UI/transport |
| Стоимость второй машины | Узкий smoke-pack на real host; логика графа в CI |
| Velocity (flaky E2E) | Пирамида: unit engine → sim integration → real-machine smoke; quarantine |

**Импликация:** «pause на узле» = **Paused** в scenario-engine с `exportSnapshot()`, не freeze браузера mid-frame.

---

*Источник: Perplexity MCP (каскад: API недоступен → MCP)*
