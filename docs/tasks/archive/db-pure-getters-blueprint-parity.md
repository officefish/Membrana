# Архив: DB Pure Getters: Blueprint parity (exec-free data getters)

| Поле | Значение |
|------|----------|
| **ID** | `db-pure-getters-blueprint-parity` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-06-21 |
| **Архивирована** | 2026-06-21 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/DEVICE_BOARD_PURE_GETTERS_EPIC_PROMPT.md`](../../docs/prompts/DEVICE_BOARD_PURE_GETTERS_EPIC_PROMPT.md) |

## Заметки при закрытии

G0-G4 complete; proposal #1 closed

## Отчёт о выполнении

Эпик **U7 Pure Getters** закрыт 2026-06-21.

| Фаза | Результат |
|------|-----------|
| P0 | Product decisions D1–D5 LGTM |
| G0 | `scenario-node-pure.ts`; `ScenarioGraphNode.pure`; parse normalize |
| G1 | exec-subgraph transparent skip; validatePreRun hints; D4 no tick-cache |
| G2 | Pure toggle; exec strip on impure→pure; ref bound/empty; value edit |
| G3 | MVP main JSON data-only policy wires; MakeTrack→restart exec; migration v0.9 |
| G4 | CONCEPT §15.7 v0.9; [`PURE_GETTERS_LGTM.md`](../../docs/device-board-scripts/PURE_GETTERS_LGTM.md) |

**Ключевой topology fix (G3):** policy constructors без exec-hop; `MakeRecordingPolicy` / `MakeFftTrendsPolicy` — data-only к consumers.

**CI:** `yarn workspace @membrana/device-board test` (327); `yarn trends-parity:smoke-matrix`; `yarn recording-parity:smoke-matrix`.

**Unblocks:** U1 UserCase picker, proposal #2+ (Product Owner).

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
