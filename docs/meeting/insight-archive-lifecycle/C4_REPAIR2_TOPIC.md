# C4R2 — discriminated events и deterministic conflict reducer

> Общее задание: `MEETING_BRIEF.md`.
> Активные predecessors: `C1_VERDICT.md`, `C2_VERDICT.md`.
> Два BLOCK: `C4_AUDIT.md`.
> Это второй repair того же C4, не новый DAG-узел.

## Вопрос

**C4 — как окончательно замкнуть discriminated event union, validation, reducer effects,
conflict semantics и typed views при неизменной C2-модели и открытом C7?**

## Обязательные исправления

1. `EventEnvelope` = `eventId`, unique committed total-order `seq`, `schemaVersion`,
   discriminant `kind`, typed payload. Exact refs находятся в payload, без ambiguous
   generic target ref.
2. Discriminated assert payloads:
   - D → MANDATE/revision + `proposed|accepted|rejected|deferred`;
   - L → SLICE + `delivered|not-delivered`;
   - O → SLICE + `realized|not-realized`;
   - V → representation + `active|archived`;
   каждый создаёт fresh `assertionId`, optional opaque evidenceRef.
3. Other exact payloads: revoke(targetAssertionId); event-only
   supersede(oldDecisionAssertionId, successorRevisionId); reopen(oldRevisionId,
   fresh newRevisionId, fresh initialDecisionAssertionId D=`proposed`).
4. Committed-log validation: unique eventId/seq; strict total order; fresh created IDs;
   references resolve в committed prefix и имеют правильный kind/subject. Invalid/duplicate
   event даёт deterministic typed ReplayError/diagnostic, не environment-dependent skip.
   Способ atomic append/order/retry — C7.
5. Reducer state и transitions задать явно:
   - assert добавляет immutable assertion;
   - revoke помечает только target assertion inactive;
   - supersede добавляет typed link и не меняет D/V; old D остаётся в history/current
     своего exact old subject, successor имеет свой subject;
   - reopen создаёт fresh revision + initial D=`proposed`, old immutable,
     transcription не создаётся.
6. Для каждого exact `(axis,subject)`:
   `live = type-valid assertions − valid revokes`;
   0 → `None`; 1 → `Some(assertion)`; >1 → typed `Conflict(assertionIds)` вне C2 enum.
   Не выбирать winner молча.
7. View A:
   - history = все assertions + revoke/supersede/reopen relations;
   - current map = правило 0/1/>1 выше.
   View B для representation использует active V result:
   `None→unclassified`, `Some(active)→current`, `Some(archived)→archive`,
   `Conflict→visibility-conflict`. `None` — отсутствие V assertion, не enum-value/state.
8. Полный no-inference в views: `V ⇏ D/L/O`, `D/L/O ⇏ V`; revoke/supersede не
   означают archived.
9. Version-explicit upcast сохраняет eventId/seq/created IDs/subject identity; после
   upcast применяется та же validation. Pure/total/deterministic/compositional/
   path-independent/semantic-preserving законы остаются.
10. Correction, cache boundary, C3 opaque ref, sources/open-map из C4R сохранить без
    новых C3/C5–C7 решений. DoD contract-only.

## Требуемый единственный вердикт

- отдельный heading `ВЕРДИКТ C4`;
- exact event union + validation/error table;
- reducer transition table and 0/1/conflict formula;
- exact View A/B formulas including V=None/conflict;
- replay/upcast/cache/source/open-map без C7 mechanics.
