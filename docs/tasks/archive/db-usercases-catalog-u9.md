# Архив: DB UserCases catalog: settings + modal + apply-all (U9)

| Поле | Значение |
|------|----------|
| **ID** | `db-usercases-catalog-u9` |
| **Статус** | archived |
| **Размер** | L |
| **Создана** | 2026-06-21 |
| **Архивирована** | 2026-06-21 |
| **GitHub Issue** | #136 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/DEVICE_BOARD_USERCASES_EPIC_PROMPT.md`](../../docs/prompts/DEVICE_BOARD_USERCASES_EPIC_PROMPT.md) |

## Отчёт о выполнении

**Что сделано.** Эпик U9: каталог UserCases от manifest/build до operator UX.

| Wave | id | Deliverable |
|------|-----|-------------|
| R0 | `db-uc-r0-schema` | `manifest.json`, `yarn usercase:build`, `yarn usercase:verify-kinds` |
| L1 | `db-uc-l1-layout-canon` | `applyUserCaseLayoutCanon`, `yarn usercase:verify-layout`, comment groups MVP main |
| C1 | `db-uc-c1-catalog` | `UserCaseCatalogService`, bundled `usercase-mvp-microphone` |
| G1 | `db-uc-g1-settings-gate` | Settings toggle, entitlement badges, `readDeviceBoardUserCaseGate()` |
| P1 | `db-uc-p1-picker-modal` | Modal picker, apply-all, dirty confirm, ref-mapping, signal layer intact |
| D1 | `db-uc-d1-docs` | `DEVICE_BOARD_CONCEPT.md` §20, README, `apps/docs/device-board/usercases.mdx` |

**PRs.** Ветка `feat/db-usercases-catalog-u9` (`ae3878f`…`4576abb`); PR — merge в `main`.

**Linear ticket.** —

**Связь со стратегией.** Направление U9 / post-usercase roadmap; bundled MVP microphone LGTM; supersedes roadmap U1 UX.

**Реестр.** `yarn task:archive db-usercases-catalog-u9` — выполнено 2026-06-21.

**Тесты.** `@membrana/device-board` 388 passed; client UserCase tests 9 passed.

**Известные нюансы / отложено.** Tariff billing — stub only; CI pipeline hook для `usercase:verify-*` — follow-up; merge PR в `main` для полного закрытия по регламенту §4.

## Заметки при закрытии

GitHub #136 closed; PR #137.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
