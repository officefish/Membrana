# Тема консилиума: device-board + cabinet hotfix (prod UX)

> Дата: 2026-06-18  
> Эпик: `device-board-cabinet-hotfix`  
> Ветка: `ozhegov-module-catalog-v1`  
> Основание: ручной QA prod `cabinet.membrana.space` после DBR6 / deploy #103.

---

## Замечания QA (5 пунктов)

| # | Замечание | Где проявляется |
|---|-----------|-----------------|
| **HF1** | Рабочее поле визуального скриптинга **не на весь экран** — сжато между левым и правым сайдбарами. Поле должно занимать **весь viewport под шапкой**; сайдбары **перекрывают** канвас и **не участвуют** в расчёте его размеров. | `@membrana/device-board` (`device-board-shell`), хост `apps/cabinet` `DeviceBoardPage` |
| **HF2** | Сайдбары **слишком широкие** (`w-56` / `w-72`). Нужны **жёсткие пределы** относительно ширины экрана (clamp min/max + доля vw). | `board-left-sidebar`, `board-right-sidebar` |
| **HF3** | По тарифу **1 узел**, фактически **2**, **удалить нельзя**. При удалении узла — **отзыв всех ключей** узла и инвалидация сессий. | `background-cabinet`, `NodesPage`, seed `free-v1` `maxNodesPerMembrane: 2` |
| **HF4** | **Узлы** и **ключи** — **два раздела** навигации (связанные, но отдельные). Сейчас prod: объединённый пункт «Узлы и ключи» (`VITE_CABINET_NODES_KEYS_SPLIT !== 'true'`). | `CabinetShell`, `NodesPage`, `KeysPage` |
| **HF5** | **Просроченные** ключи висят в списке; удалить можно только **отозванные** (`purgeRevoked`). Нужна очистка **expired + revoked**. | `KeysPage`, `membrane.service` `purgeRevokedAccessKeys` |

---

## Вопросы на консилиум

1. **HF1:** overlay-сайдбары (`absolute`/`fixed` + full-size canvas) vs «отступы под панели» — согласование с `DEVICE_BOARD_CONCEPT.md` §8 / §15.
2. **HF2:** конкретные clamp для left/right (rem + vw + max-width).
3. **HF3:** семантика `DELETE /v1/nodes/:id` (каскад Prisma, revoke-before-delete, минимум узлов 0?).
4. **HF3:** миграция `free-v1` `maxNodesPerMembrane` 2→1 без авто-удаления лишнего узла.
5. **HF4:** включить split **по умолчанию** (инвертировать флаг / prod env) — откат RT5 combined nav.
6. **HF5:** расширить `purgeRevoked` → `purgeInactive` или отдельный endpoint + per-key delete для expired.

---

## Ожидаемый артеfact

- Протокол: `docs/seanses/device-board-cabinet-hotfix-2026-06-18.md`
- Эпик-промпт: `docs/prompts/DEVICE_BOARD_CABINET_HOTFIX_EPIC_PROMPT.md`
- Реестр: `docs/tasks/registry.json` → `device-board-cabinet-hotfix`, подзадачи DBH0…DBH4
