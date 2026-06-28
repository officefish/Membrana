# Research: Competition → catalog publish pipeline

> Perplexity MCP · 2026-06-25

## Q1 — Landscape

**Запрос:** Competition sprint → catalog publish pipeline: industry landscape 2024-2026

**Выжимка:**

- Паттерн: manifest as contract → validate → build → registry publish → catalog PR (Red Hat FBC, app manifests).
- Monorepo: child pipelines per changed package, shared base, path-filter.
- Lessons-learned registry: lightweight YAML/JSON per release (MLOps model registry аналог).
- Phase 1: manifest+tests; Phase 2: auto catalog; Phase 3: strict docs enforcement.

**Импликация:** Membrana уже близко — `usercase.mjs`, `catalog/registry.json`, `USERCASE_COMPETITION_LESSONS.md`.

---

## Q2 — Fit (Membrana)

**Запрос:** fit with usercase.mjs + catalog registry.json

**Выжимка:**

- `yarn usercase:build-competition-async-v2-all` + `catalog:verify-client` — ядро pipeline.
- Skill `membrana-competition-packaging` + regulation sprint prompt — документировать как единый checklist.
- CLOSURE + OPERATOR_DEBUG_LOG + lessons — сжать в `COMPETITION_PACKAGING_RUNBOOK.md` (один runbook).
- `comp:publish-catalog` alias если нет — обёртка над существующими yarn scripts.

---

## Q3 — Risk

**Запрос:** risks process weight vs small team velocity

**Выжимка:**

| Риск | Митигация |
|------|-----------|
| Process bloat | Phase 1 only: checklist + skill, no new gates |
| Duplicate docs | Single runbook, link from skill |
| Manual steps | Automate только verify-pack на PR (связь с insight G) |

---

*Источник: Perplexity MCP*
