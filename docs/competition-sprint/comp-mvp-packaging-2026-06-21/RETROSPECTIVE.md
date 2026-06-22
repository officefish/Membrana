# Retrospective — comp-mvp-packaging-2026-06-21

## Что сработало

- **Единый brief** + три независимых CONCEPT — команды не якорились друг на друга
- **Programmatic collapse** (`usercase-competition-pack.ts`) — быстрый fork MVP без ручного JSON
- **verify-layout CI** — объективный gate для Ozhegov/Dynin
- **Community tier** в catalog — осмотр вариантов в picker
- **RUN-01 resolved** (2026-06-21) — alpha/beta/gamma Run-green; L9–L12 runtime fixes
- **Generation prompt + agent CLI** — `DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md`, `scripts/usercase.mjs`

## Что не сработало (изначально)

- **Run parity** после programmatic collapse — все три fork падали на Run (исправлено)
- **Collapse order / pins** — editor marquee collapse ≠ build script collapse для runtime
- **Node count targets** (≤6 main) — aspirational, не достигнут (~15)
- **Mega-bundle gamma** — D-PINS-9 блокирует vision G2 (split на 2 functions)

## Lessons

1. Sprint DoD должен явно разделять **canvas DoD** и **Run DoD**
2. Packaging vote ≠ production-ready без graph equivalence + manual Run
3. **Process > winner:** три fork в catalog ценнее преждевременного merge
4. Дневник L1–L12 → future generation regulation

## Closure (2026-06-21)

Sprint **closed without winner merge** — см. [`CLOSURE.md`](./CLOSURE.md).

| ID | Status |
|----|--------|
| RUN-01 | ✅ Done |
| POL-01 | Deferred |
| CAT-01 | Deferred (all three stay `community`) |

## Team shout-outs

- **Alpha:** operator narrative + onConnect bootstrap pattern
- **Beta:** modular 3-function + policy-build (stress-test L12)
- **Gamma:** poster layout + simplest 2-function Run path
