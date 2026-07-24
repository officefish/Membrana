# CLOSURE: llm-calls-house-2026-07-23

| Поле | Значение |
|------|----------|
| **Epic** | `llm-calls-house` · [#1033](https://github.com/officefish/Membrana/issues/1033) |
| **Status** | **closed** |
| **Date** | 2026-07-23 |
| **Product PR** | [#1040](https://github.com/officefish/Membrana/pull/1040) · squash `6570769b` |
| **Archive** | фазы + эпик `yarn task:archive` · W5 |

## Delivered

- Дом [`docs/audit/llm-calls/`](../../audit/llm-calls/) — пять органов + specimens + мастерская
- Emit: `promptSha256` / `responseSha256` / params (ADR-0016); сырые тела запрещены
- `yarn llm-calls:audit|decompose|snapshot`
- Thin Mintlify `apps/docs/llm-calls/` · группа в docs.json
- Инварианты E1–E8

## Phases

| Phase | Issue | Result |
|-------|------:|--------|
| W0 | #1034 | OPEN + registry + ACTIVE · archived |
| W1 | #1035 | дом · archived |
| W2 | #1036 | мастерская · archived |
| W3 | #1037 | emit + snapshot + ADR · archived |
| W4 | #1038 | Mintlify · archived |
| W5 | #1039 | CLOSURE + ACTIVE clear + archive · this PR |

## Follow-up (не блокер закрытия)

- Redeploy office — DTO evidence на prod
- Live `yarn llm-calls:snapshot` с office token (не только `--from-fixture`)
