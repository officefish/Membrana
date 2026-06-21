# Архив: DB Canvas: marquee, comment groups, user functions, align MVP (U8)

| Поле | Значение |
|------|----------|
| **ID** | `db-canvas-groups-functions` |
| **Статус** | archived |
| **Размер** | L |
| **Создана** | 2026-06-21 |
| **Архивирована** | 2026-06-21 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/DEVICE_BOARD_CANVAS_GROUPS_FUNCTIONS_EPIC_PROMPT.md`](../../docs/prompts/DEVICE_BOARD_CANVAS_GROUPS_FUNCTIONS_EPIC_PROMPT.md) |

## Заметки при закрытии

PR #134; LGTM Vesnin; CONCEPT v0.7 section 18; CI green

## Отчёт о выполнении

**Продукт:** DoD эпика U8 (R0→F1→G1→A0) выполнен; operator smoke — рекомендован вручную post-merge.

**Артефакты:**

- PR [#134](https://github.com/officefish/Membrana/pull/134) — `@membrana/core` + `@membrana/device-board`
- `DEVICE_BOARD_CONCEPT.md` v0.7 §18
- Subtasks archived: `db-cgf-r0-marquee-modal`, `db-cgf-f1-user-functions`, `db-cgf-g1-comment-groups`, `db-cgf-a0-align-basic`

**Тесты:** `yarn workspace @membrana/device-board test` — 364 passed; CI green.

**Out of scope (→ `db-node-align-advanced`):** snap guides, dagre exec-chain, expand function inline.

**Нюансы:** PR merge pending; archive с LGTM до merge по регламенту §4 (код в ветке, CI OK).

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
