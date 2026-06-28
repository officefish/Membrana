# Competition Sprint — Closure (no winner merge)

| Поле | Значение |
|------|----------|
| **sprintId** | `comp-mvp-packaging-2026-06-21` |
| **closed** | 2026-06-21 |
| **outcome** | **Process validated** — все три fork Run-green; **победитель не выбран**, merge отложен |

---

## Решение

Sprint закрывается на этапе **отладки процесса генерации UserCases**, а не выбора единственного catalog winner.

**Все три варианта остаются в catalog** (`tier: community`) для изучения:

| id | Codename | Functions | Run (2026-06-21) |
|----|----------|-----------|------------------|
| `usercase-mvp-microphone-alpha` | alpha | 3 (+ onConnect bootstrap) | ✅ |
| `usercase-mvp-microphone-beta` | beta | 3 (policy-build + gate + trends) | ✅ |
| `usercase-mvp-microphone-gamma` | gamma | 2 (gate + trends) | ✅ |

Bundled reference по-прежнему: **`usercase-mvp-microphone`** (flat MVP).

---

## Что доказано

1. **Programmatic collapse** (`packMvpUserCaseForTeam`) + layout canon + verify-layout
2. **Pre-run** после hydrate (block pins sync)
3. **Runtime parity** collapsed vs flat (L9–L12 fixes в `@membrana/device-board`)
4. **Agent workflow:** build/verify scripts + generation prompt

---

## Артефакты для следующих задач

| Artifact | Path |
|----------|------|
| **Generation regulation** | [`docs/actions/device-board/USERCASE_GENERATION_REGULATION.md`](../../actions/device-board/USERCASE_GENERATION_REGULATION.md) |
| **Generation prompt** | [`docs/prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md`](../../prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md) |
| **Scripts hub** | [`docs/device-board-scripts/README.md`](../../device-board-scripts/README.md) |
| **Lessons diary** | [`docs/actions/device-board/USERCASE_COMPETITION_LESSONS.md`](../../actions/device-board/USERCASE_COMPETITION_LESSONS.md) |
| **Agent CLI** | `node scripts/usercase.mjs help` |
| Scorecard (historical) | [`SCORECARD.md`](./SCORECARD.md) |
| Winner doc (historical packaging vote) | [`WINNER.md`](./WINNER.md) — **не** action item для merge |

---

## Deferred (explicitly out of closure scope)

- Merge beta (или любого fork) в bundled MVP
- POL-01 cherry-picks (gamma titles, alpha RU copy)
- CAT-01 bundled vs community tier product decision
- Git archive tags

---

## Follow-up when ready

1. Продуктовый выбор fork или hybrid — отдельная задача с PR
2. ~~`USERCASE_GENERATION_REGULATION.md`~~ — **done** (2026-06-21, discovery wired)
3. ~~CI: `node scripts/usercase.mjs verify-competition` в nightly или PR gate для pack changes~~ — **done**: `.github/workflows/usercase-competition.yml` (PR paths) + `scheduled-ci.yml` (weekly)

---

*Sprint comp-mvp-packaging-2026-06-21 — closed: generation process > winner selection.*
