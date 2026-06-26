# INSIGHT: Chain-log golden oracle для operator smoke

| Поле | Значение |
|------|----------|
| **ID** | `insight-dynin-chain-log-golden-oracle` |
| **Статус** | adopted |
| **Источник** | virtual-team-dynin |
| **Создан** | 2026-06-25 |

---

## Проблема / наблюдение (Дынин)

`insight-operator-smoke-ci-gate` требует детерминированный gate, но `yarn logs:parse` сравнивается с human paste без **versioned golden vectors**. L17–L20 ловились post-hoc; нужен oracle: expected chain-log sequence per fork (alpha/beta/gamma).

## Гипотеза

**Golden oracle pack:**

- `fixtures/operator-smoke/<fork>/chain-log.golden.json` — ordered events (`track.start`, `async.upload.done`, …)
- `yarn logs:parse --expect-golden <fork>` → exit 0/1
- Pack tests assert graph wiring; golden asserts **runtime narrative**

## Scope

- In: fixture format, CLI flag, CI job hook
- Out: full Playwright

## Связи

- `insight-operator-smoke-ci-gate`, `USERCASE_COMPETITION_LESSONS.md`, `membrana-client-logs-parsing`
