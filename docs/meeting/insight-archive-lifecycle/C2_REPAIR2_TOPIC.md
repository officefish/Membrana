# C2R2 — optional typed assertions и проверяемые projections

> Общее задание: `MEETING_BRIEF.md`.
> Активный predecessor: `C1_VERDICT.md`.
> Два BLOCK: `C2_AUDIT.md`.
> Это второй repair того же C2, не новый DAG-узел.

## Вопрос

**C2 — как окончательно определить optional typed assertions, события assessment и
проверяемую well-typed projection, устранив десять дефектов C2R без проектирования C3–C7?**

## Десять обязательных исправлений

1. Отсутствие assertion = `None/Absent`, не enum-value. Если `pending`/`unassessed`
   остаётся, это только явно asserted assessment; предпочтительна минимальная модель без них.
2. Decision assessments обязаны покрыть `proposed`, `accepted`, `rejected`, `deferred`.
   Не утверждать terminal/monotonic semantics.
3. Однозначно развести supersede-event и assessment: допустимо
   `supersede(oldAssertion, successorRevision)` добавить assessment `superseded` старому
   subject и связать successor, не мутируя scope. Не использовать одно слово без роли.
4. Полный no-inference invariant: `V ⇏ D,L,O` и `D,L,O ⇏ V`; ни одна ось не
   auto-mutates другую. В premises включить факт C2_TOPIC о неоднородном task archive.
5. Развести forbidden scope mutation и no-overwrite assertion:
   - subject/id/scope/claims immutable;
   - новый assessment/revoke/supersede разрешён, прежний assertion не delete/rewrite.
6. Sources: C1 даёт immutable scopes, Task→Mandate, три one-way non-implications и
   delivery/outcome dimensions. Отсутствие других prerequisites — не факт C1, а
   repair-правило «не выводить без premise».
7. Карта M0: C6 = agent workflow/enforcement и возможный CLI surface;
   C7 = operational safety/concurrency/idempotency/rollback-reopen.
8. Reopen не создаёт transcription. Он создаёт новую revision с новым ID и initial
   `proposed`; если transcription позже возникает, relation указывает на новый Mandate.
9. Well-typed tuple проверяется abstract predicates без schema:
   `mandate belongs-to insightRevision`, `slice ∈ mandate.scope`,
   `representation represents exact subject/scope`. Allowed = все optional axis assignments
   над linked tuple; unlinked/ill-typed join forbidden.
10. No-delete — semantic constraint, не storage/history representation. C4 решает, как
    хранить события и вычислять active assessment/derived view.

## Требуемый единственный вердикт

- отдельный heading `ВЕРДИКТ C2`;
- для D/L/O/V: exact subject, `Option<assessment>` и минимальные asserted values;
- assessment-events (`assert`, `revoke`, `supersede`, `reopen`) без in-place scope mutation;
- exhaustive matrix только для linked optional assignments; inference и mutation rules —
  отдельные invariants, не matrix cells;
- sources по фактическому происхождению;
- C3 evidence, C4 history/views, C5 legacy, C6 agent enforcement/CLI,
  C7 operational safety оставить открытыми.
