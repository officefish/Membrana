# C4R — typed history, separate V projection и deterministic replay

> Общее задание: `MEETING_BRIEF.md`.
> Активные predecessors: `C1_VERDICT.md`, `C2_VERDICT.md`.
> BLOCK: `C4_AUDIT.md`.
> Это repair того же C4, не новый DAG-узел.

## Вопрос

**C4 — как исправить event envelope, reducer, versioned replay и typed views так, чтобы
история была воспроизводима, V=archived не смешивалась с revoke/supersede, а C6/C7 не
были спроектированы преждевременно?**

## Обязательные исправления

1. Typed `EventEnvelope`: минимум `eventId`, `kind`, `schemaVersion`, committed total-order
   key/seq, exact target refs и typed payload. Способ atomic assignment/concurrency — C7.
2. Exact payloads для:
   - `assert`: новый `assertionId`, axis, exact subject ref, exact value, optional opaque
     `evidenceRef`;
   - `revoke`: target assertion ID;
   - event-only `supersede`: old decision assertion ID + successor revision ID;
   - `reopen`: old revision ID + new revision ID + initial D=`proposed` assertion identity.
3. Correction semantics = append `revoke(old)` + `assert(new)`; correlation допустима,
   но atomicity/idempotency решает C7. Никакого rewrite/delete.
4. Deterministic reducer обязан определить active assessment/conflict semantics per exact
   axis+subject and historical assertions. Один committed ordered log + target schema version
   должен давать один результат; тавтология `fold(E)=fold(E)` недостаточна.
5. Раздельные typed views:
   - assertion-history/current view над assertions/revoke/supersede;
   - representation current/archive/unclassified view строго по active V assessment
     `active|archived|None`.
   Revoked/superseded не равны V=archived. Ни один view не выводит D/L/O.
6. Version-explicit replay: `replay(log, targetSchemaVersion)`. Upcasts pure,
   deterministic, total для supported versions, compositional/path-independent,
   semantically preserving; past events не rewrite.
7. EventLog остаётся authoritative. Snapshot/cache допустим только как discardable,
   rebuildable, non-authoritative derived optimization после benchmark; без фиксированного
   числа. Correctness не зависит от cache. CQRS/bus/saga не вводить без отдельной нужды.
8. Supersede referential validity проверяется на committed replay; точный append order,
   transaction, concurrency и recovery — C7.
9. C3 evidence — optional opaque ref; C4 не фиксирует C3 schema/cardinality/criteria.
10. DoD только contract-level; убрать implementation API, tests, UI labels и reviewer roles.
11. Logical premises только C1_VERDICT, C2_VERDICT, C4_TOPIC и M0/DEPS.
    Other-session/persona материалы — не основания.
12. Exact open-map: C5 legacy, C6 workflow/UX/enforcement/implementation,
    C7 concurrency/idempotency/atomicity/recovery остаются открытыми.

## Требуемый единственный вердикт

- отдельный heading `ВЕРДИКТ C4`;
- exact EventEnvelope/payload/correction/reducer/replay/upcast contracts;
- separate assertion and V representation views including V=None;
- measured non-authoritative cache boundary;
- sources/open-map без решений C3 content/C5–C7.
