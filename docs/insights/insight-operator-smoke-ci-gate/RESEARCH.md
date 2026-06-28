# Research: Operator smoke как pre-merge CI gate

> Perplexity MCP · 2026-06-25

## Q1 — Landscape

**Запрос:** Operator smoke как pre-merge CI gate для async-v2 UserCase: industry landscape, open-source approaches 2024-2026

**Выжимка:**

- CI для graph/DSL monorepo: **3 кольца** — pre-commit (\<30s), PR smoke (\<5 min), nightly full E2E.
- Playwright `@smoke`: editor load, minimal graph create-run-save, Chromium only, \<90s.
- **Pack verification** на PR: build changed packs + micro-smoke (создать граф с узлом → execute → assert).
- n8n/Node-RED: health + simple workflow в CI; full business flows — nightly.
- Operator smoke ≠ full E2E: критичные deploy-checks в smoke, regression — async.

**Импликация:** `usercase:verify-pack` + `logs:parse` критерии в PR gate; Playwright optional layer.

---

## Q2 — Fit (Membrana)

**Запрос:** fit with Web Audio, edge recording, zero-shot audio, TypeScript monorepo

**Выжимка:**

- Pack tests (L17/L20 wiring) — **без браузера**, идеальны для pre-merge.
- `yarn logs:parse` на fixture logs — детерминированный gate.
- Web Audio/mic Run ≥60s — **не** в PR; оставить operator smoke manual или nightly на real host.
- Turbo path-filter: только changed `packages/device-board` + competition packs.

---

## Q3 — Risk

**Запрос:** risks latency cost privacy licensing flakiness team velocity

**Выжимка:**

| Риск | Митигация |
|------|-----------|
| False green без mic | Явный label: pack gate ≠ audio gate |
| Flaky Playwright | Тег `@smoke`, 2–4 теста, auto-wait |
| CI time | Pack-only на PR; browser smoke на main |
| Velocity | \<5 min budget на PR ring |

---

*Источник: Perplexity MCP*
