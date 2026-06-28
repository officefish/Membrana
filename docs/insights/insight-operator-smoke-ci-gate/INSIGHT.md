# Insight: Operator smoke как pre-merge CI gate

| Поле | Значение |
|------|----------|
| **ID** | `insight-operator-smoke-ci-gate` |
| **Статус** | adopted |
| **Источник** | packaging-epic (`comp-packaging-catalog-2026-06-25`) |
| **Создан** | 2026-06-25 |

---

## Проблема / наблюдение

Phase C packaging доказала ценность operator smoke (`yarn logs:parse`, v20 happy path), но проверка остаётся ручной post-merge. Ошибки класса L17/L20 ловятся только после human Run ≥60s.

## Гипотеза

Минимальный headless или CI-adjacent gate (pack tests + optional Playwright smoke) снизит регрессии async-v2 forks до merge.

## Scope (черновик)

- In scope: критерии pass из `OPERATOR_DEBUG_LOG.md`, pack tests, dry-run manifest
- Out of scope: полный browser matrix, prod deploy gate

## Связи

- `docs/competition-sprint/comp-packaging-catalog-2026-06-25/OPERATOR_DEBUG_LOG.md`
- `yarn usercase:build-competition-async-v2-all`
- PR #179, lessons L17–L20

## Вопросы для research

1. **Landscape:** CI patterns for visual/graph DSL apps, Playwright smoke in monorepos 2024–2026
2. **Fit:** headless limits for Web Audio / mic scenarios in Membrana
3. **Risk:** flaky tests, false green without real device
