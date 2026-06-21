# device-board-scripts — UserCase bundles

Каталог bundled / community UserCases и legacy branch JSON для `@membrana/device-board`.

---

## Для AI-агентов: генерация UserCase

**Старт здесь**, если пользователь просит собрать / упаковать / сгенерировать UserCase:

| Приоритет | Документ |
|-----------|----------|
| 1 | [`USERCASE_GENERATION_REGULATION.md`](./USERCASE_GENERATION_REGULATION.md) — normative rules |
| 2 | [`docs/prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md`](../prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md) — full workflow |
| 3 | [`USERCASE_COMPETITION_LESSONS.md`](./USERCASE_COMPETITION_LESSONS.md) — RCA L1–L12 |
| 4 | `node scripts/usercase.mjs help` — build / verify CLI |

Также в [.cursorrules](../.cursorrules) (стратегический документ #10) и [`docs/prompts/README.md`](../prompts/README.md) § UserCase generation.

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
yarn usercase:verify-competition
yarn usercase:verify-layout usercase-mvp-microphone-beta
yarn usercase:verify-prerun usercase-mvp-microphone-beta
```

---

## Прочие документы

| Doc | Назначение |
|-----|------------|
| [`USERCASE_MVP_MICROPHONE.md`](./USERCASE_MVP_MICROPHONE.md) | Operator spec MVP |
| [`USERCASE_MVP_MICROPHONE_LGTM.md`](./USERCASE_MVP_MICROPHONE_LGTM.md) | Runtime sign-off |
| [`logs/info.txt`](./logs/info.txt) | Manual Run trace (debug) |

---

*Index hub для `docs/device-board-scripts/` — обновлять при новых bundled UserCases.*
