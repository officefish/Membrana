# device-board-scripts — UserCase fixtures

Каталог **bundled / community UserCases**, golden JSON и legacy branch exports для `@membrana/device-board`.

**Процессы и регламенты** переехали в [`docs/actions/device-board/`](../actions/device-board/).  
Hub actions: [`docs/actions/README.md`](../actions/README.md).

---

## Для AI-агентов: генерация UserCase

| Приоритет | Документ |
|-----------|----------|
| 1 | [`USERCASE_GENERATION_REGULATION.md`](../actions/device-board/USERCASE_GENERATION_REGULATION.md) — normative rules |
| 2 | [`docs/prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md`](../prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md) — full workflow |
| 3 | [`USERCASE_COMPETITION_LESSONS.md`](../actions/device-board/USERCASE_COMPETITION_LESSONS.md) — RCA L1–L23 |
| 4 | `node scripts/usercase.mjs help` — build / verify CLI |

**Write allowlist (NB3):** build scripts may write only under `docs/device-board-scripts/usercase-*` and `packages/device-board/src/graph/default-usercase-*.generated.ts`. Check: `node scripts/usercase.mjs verify-paths`.

Также в [`.cursorrules`](../.cursorrules) (стратегический документ #11) и [`docs/prompts/README.md`](../prompts/README.md).

---

## Bundled UserCases

| id | tier | Описание |
|----|------|----------|
| [`usercase-mvp-microphone`](./usercase-mvp-microphone/) | bundled | Flat MVP reference, Run LGTM |
| [`usercase-mvp-microphone-alpha`](./usercase-mvp-microphone-alpha/) | community | Sprint fork — observation + gate |
| [`usercase-mvp-microphone-beta`](./usercase-mvp-microphone-beta/) | community | Sprint fork — modular 3 functions |
| [`usercase-mvp-microphone-gamma`](./usercase-mvp-microphone-gamma/) | community | Sprint fork — poster 2 functions |

Sprint closure: [`docs/competition-sprint/comp-mvp-packaging-2026-06-21/CLOSURE.md`](../competition-sprint/comp-mvp-packaging-2026-06-21/CLOSURE.md)

---

## Yarn / scripts

```bash
yarn usercase:build usercase-mvp-microphone
yarn usercase:build-competition-all
node scripts/usercase.mjs verify-competition
node scripts/usercase.mjs verify-paths
yarn usercase:verify-competition
yarn usercase:verify-layout usercase-mvp-microphone-beta
yarn usercase:verify-prerun usercase-mvp-microphone-beta
```

---

## Sign-offs и specs (actions)

| Doc | Путь |
|-----|------|
| MVP operator spec | [`../actions/device-board/specs/USERCASE_MVP_MICROPHONE.md`](../actions/device-board/specs/USERCASE_MVP_MICROPHONE.md) |
| MVP LGTM | [`../actions/device-board/sign-offs/USERCASE_MVP_MICROPHONE_LGTM.md`](../actions/device-board/sign-offs/USERCASE_MVP_MICROPHONE_LGTM.md) |
| Manual Run trace | [`logs/info.txt`](./logs/info.txt) |

---

*Fixtures hub для `docs/device-board-scripts/` — JSON/manifests only; processes → `docs/actions/device-board/`.*
