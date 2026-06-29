<!-- Teamlead LGTM · device-board-fn-blocks-sprint-2026-06-24 · PR #173 -->

# Code Review PR #173

Tier: **T1** · Sprint: [`DEVICE_BOARD_FN_BLOCKS_SPRINT_2026-06-24_PROMPT.md`](../prompts/DEVICE_BOARD_FN_BLOCKS_SPRINT_2026-06-24_PROMPT.md)

---

## [Teamlead]: Vesnin

PR size **OK** (~235 строк). Граница `@membrana/device-board` соблюдена; follow-up #172 закрывает пробел после #170 multi-insert.

Acceptance (sprint FB1–FB4):
- ✅ Список экземпляров `functionId` на текущей ветке (`listSubgraphBlocksForFunction`)
- ✅ Jump-select + `focusNodeIds`
- ✅ Подпись «Вызов n» + `nodeId`, активный выделен
- ✅ CONCEPT §18 + sprint prompt/registry

**Вердикт: LGTM** — merge в `main` после зелёного CI.

Утро: manual smoke — insert function ×2 → inspector → переключение экземпляров.

---

## [Структурщик]: Ozhegov

Pure helper без React; shell только wiring. `selectCanvasNodeById` переиспользует паттерн `clearCanvasNodeSelection`. Дублирование `isSubgraphBlockForFunction` с `remove-user-function.ts` — P2 extract, не блокер.

---

## [Верстальщик]: Rodchenko

Кнопки `btn-xs`, `aria-current` на активном экземпляре, секция с `aria-label`. Соответствует DESIGN.md.

---

## Вердикт

**LGTM** — склеиваем в main, закрываем #172 и day-sprint `device-board-fn-blocks-sprint-2026-06-24`.
