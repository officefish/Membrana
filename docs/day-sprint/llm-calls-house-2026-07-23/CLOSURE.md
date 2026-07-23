# CLOSURE: llm-calls-house-2026-07-23

| Поле | Значение |
|------|----------|
| **Epic** | `llm-calls-house` · [#1033](https://github.com/officefish/Membrana/issues/1033) |
| **Status** | **ready for W5 archive** (продукт W0–W4 в одном PR; archive — отдельный шаг) |
| **Date** | 2026-07-23 |

## Delivered

- Дом [`docs/audit/llm-calls/`](../../audit/llm-calls/) — пять органов + specimens
- Мастерская `workshop.manifest.json` · `yarn llm-calls:audit|decompose|snapshot`
- ADR-0016 evidence minimum · emit hashes+params
- Thin Mintlify `apps/docs/llm-calls/` · группа в docs.json
- Инварианты E1–E8 соблюдены (сырые тела не в git)

## Phases

| Phase | Issue | Result |
|-------|------:|--------|
| W0 | #1034 | OPEN + registry + ACTIVE |
| W1 | #1035 | дом |
| W2 | #1036 | мастерская |
| W3 | #1037 | emit + snapshot + ADR |
| W4 | #1038 | Mintlify |
| W5 | #1039 | pending archive после merge |

## Follow-up

- `yarn task:archive` фаз/эпика после merge PR
- Office redeploy чтобы DTO evidence полей принял prod
- Live snapshot с office token (не только `--from-fixture`)
