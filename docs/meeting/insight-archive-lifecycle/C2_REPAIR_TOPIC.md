# C2R — typed state records без ложных prerequisites

> Общее задание: `MEETING_BRIEF.md`.
> Активный predecessor: `C1_VERDICT.md`.
> BLOCK: `C2_AUDIT.md`.
> Это repair того же C2, не новый DAG-узел.

## Вопрос

**C2 — как исправить state model в набор typed records и well-typed projections так,
чтобы оси разных subjects не смешивались, а ни один cross-axis prerequisite не появлялся
без посылки?**

## Неподвижные исправления

1. Каждой оси назвать subject: decision — MANDATE/revision; delivery и outcome — SLICE;
   visibility — representation record. Общий view допустим только как well-typed projection
   связанной tuple `(insightRevision, mandate, slice, representation)`; отсутствие assertion
   не подменять синтетическим фактом.
2. `transcribed` остаётся отдельным typed relation Task→Mandate вне всех осей.
3. `reopen(oldRevision)` — inter-revision event, создающий новую revision с новым ID и
   initial decision; `reopened` не является in-place D-state. Старый scope не мутирует.
4. Удалить X1–X3. C1 не дал prerequisites outcome→delivery/accepted и не запретил cleanup
   после reject/supersede. Все well-typed cross-axis combinations allowed; forbidden только
   ill-typed join, вывод из visibility/archive и мутация immutable scope.
5. Не утверждать terminal/monotonic semantics без premises. Для каждой axis определить
   минимальные values и события смены active assessment/assertion; revoke/supersede не
   удаляют прежний assertion. Историю и derived current view проектирует C4.
6. Outcome не overwrite истории: C2 может менять только active assessment посредством
   нового assertion; сохранение, supersession/revocation history — C4.
7. Разделить sources: C1 facts, C2_TOPIC hard constraints, brief/M0. Не приписывать C1
   archive invariants и не использовать отсутствующие обратные prerequisites.

## Требуемый единственный вердикт

- отдельный heading `ВЕРДИКТ C2`;
- typed axis record: subject, minimal values, allowed assertion-events;
- правила well-typed projection и exhaustive allowed/forbidden matrix classes;
- точная reopen/revoke/supersede семантика без мутации/удаления истории;
- фактически использованные посылки по источникам;
- evidence contract, history implementation, legacy, operational enforcement и CLI
  оставить C3–C7.
