# C2 — независимые оси состояния

> Зависимость: вердикт C1.  
> Активный predecessor: `C1_VERDICT.md` (финальный extraction audit: PASS).

## Неподвижный вердикт C1

- Closure assertion относится к immutable `(subject, scope)`, а не определяет status.
- Subject/scope: INSIGHT revision при стабильном insight identity; фиксированный
  MANDATE claim-set; фиксированный SLICE claim с раздельными delivery/outcome dimensions.
- `transcribed` — отношение Task → Mandate.
- Зафиксированы только non-implications `accepted ⇏ transcribed`,
  `transcribed ⇏ delivered`, `delivered ⇏ outcome-proven`; prerequisites не решены.
- Новая фаза создаёт новый immutable mandate/revision и не мутирует прошлое.
- C2 обязан решить axes/transitions, не меняя идентичности C1.

## Вопрос

**C2 — какая минимальная ортогональная модель состояний нужна для сущностей из C1,
чтобы раздельно выражать decision, delivery, outcome и archive/visibility и исчерпывающе
разрешать или запрещать их cross-axis комбинации?**

## Неподвижные ограничения

- Нужны отдельные typed axes/dimensions как минимум для decision, delivery, outcome и
  archive/visibility. Delivery и outcome нельзя объединять.
- `transcribed` остаётся отношением Task → Mandate из C1, а не осью INSIGHT.
- Hard invariants: `archive/hidden ⇏ delivered`, `archive/hidden ⇏ outcome-proven`,
  `archive/hidden ⇏ terminal decision`; delivery/outcome сами по себе также не меняют
  archive/visibility.
- Учитывать доменный факт: task archive сегодня содержит delivered, branch-only, wontfix,
  duplicate и defer, поэтому task archive не является доказательством ни одной другой оси.
- Reopen/supersede/reject/defer меняют только assertion/state axes. Immutable subject,
  scope и claims из C1 не мутируют; новая phase/revision получает новый ID.
- Evidence format/contract, storage/history implementation, CLI и legacy classification
  остаются C3–C7.

## Требуемый единственный вердикт

- отдельный заголовок `ВЕРДИКТ C2`;
- состояния и допустимые переходы по каждой typed axis;
- исчерпывающая cross-axis constraint matrix: allowed/forbidden для каждого класса
  комбинаций с обоснованием;
- обратимость, supersede/reject/defer/reopen;
- список фактически использованных посылок;
- не проектировать evidence, storage или CLI.
