# C3R — evidence graph без pseudo-axis и closed-world inference

> Общее задание: `MEETING_BRIEF.md`.
> Активные predecessors: `C1_VERDICT.md`, `C2_VERDICT.md`.
> BLOCK: `C3_AUDIT.md`.
> Это repair того же C3, не новый DAG-узел.

## Вопрос

**C3 — как исправить evidence graph, cardinality, roll-up и negative basis так, чтобы
evidence доказывал только exact SLICE claim и не создавал pseudo-axis или closed-world вывод?**

## Одиннадцать обязательных исправлений

1. Удалить `pending`. Отсутствие L/O assertion = `None`; complete check использует
   `Some(exactValue)` только там, где конкретный summary требует эту axis.
2. Task транскрибирует MANDATE с `1..N` immutable SLICE. Scenario — per linked
   slice/axis, без single-task=single-slice.
3. `EpicDeliverySummary`/derived roll-up token — не C2 axis assessment и не evidence target.
   Значения summary (`complete|partial|unknown` либо точные эквиваленты) не меняют L enum;
   L остаётся только per-SLICE.
4. Completeness считается по полному `mandate.scope`/declared immutable slice graph:
   missing link или required Slice=None → summary `unknown/incomplete`, не negative.
5. Generic immutable `originRef/provenanceRef`; digest/hash условный. Dedup key минимум
   `(targetClaim, originRef-or-digest, predicate/version)`. Один origin может законно
   доказывать разные claims; duplicate proof одного target не становится invalid, но не
   увеличивает independent weight.
6. Negative evidence только affirmative bounded basis:
   - `not-delivered`: explicit refusal/cancellation/failure относительно declared
     acceptance window/rule;
   - `not-realized`: выполненная проверка criteria с отрицательным результатом и
     observation window.
   Простое «не нашли»/timeout без declared rule — hint или invalid.
7. Один target claim может иметь 0..N independent evidence nodes; каждый node доказывает
   ровно один claim.
8. DoD только для verdict/contract; implementation, unit tests, UI/a11y/clickability — C6.
9. DESIGN и role-memory — максимум non-binding analogies, не logical premises и не
   основания dedup.
10. Sources: C1_VERDICT = immutable subject/scope/MANDATE/SLICE; C2_VERDICT = exact enums,
    linked tuple/no-inference; C3_TOPIC + brief/M0 = scenarios/scope.
11. Exact open-map: C4 history/storage, C5 legacy, C6 UX/enforcement/implementation,
    C7 operational safety остаются открытыми.

## Требуемый единственный вердикт

- отдельный heading `ВЕРДИКТ C3`;
- corrected EvidenceNode/edges/cardinality/provenance and negative-basis contract;
- scenario matrix и derived summaries без pseudo-axis;
- evidence/hint/invalid rules и source premises;
- никаких решений C4–C7.
