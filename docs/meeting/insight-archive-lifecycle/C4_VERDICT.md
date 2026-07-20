# ВЕРДИКТ C4

> Режим: ручной председательский resolution по указанию владельца после недоступности
> Anthropic. Основания: `C1_VERDICT.md`, `C2_VERDICT.md`, `C4_TOPIC.md`,
> `C4_REPAIR2_TOPIC.md`, `C4_AUDIT.md`.  
> Статус: active; independent read-only audit PASS.

## Discriminated EventEnvelope

```text
EventEnvelope = {
  eventId,
  seq,
  schemaVersion,
  event: AssertD | AssertL | AssertO | AssertV | Revoke | Supersede | Reopen
}
```

`eventId` и committed total-order `seq` уникальны. Exact subject/value refs находятся в
typed payload, generic target ref отсутствует.

| Event | Typed payload |
|---|---|
| AssertD | fresh assertionId; MANDATE/revision ref; `proposed|accepted|rejected|deferred`; optional opaque evidenceRef |
| AssertL | fresh assertionId; SLICE ref; `delivered|not-delivered`; optional opaque evidenceRef |
| AssertO | fresh assertionId; SLICE ref; `realized|not-realized`; optional opaque evidenceRef |
| AssertV | fresh assertionId; representation ref; `active|archived`; optional opaque evidenceRef |
| Revoke | targetAssertionId |
| Supersede | oldDecisionAssertionId; successorRevisionId; event-only link |
| Reopen | oldRevisionId; fresh newRevisionId; fresh initialDecisionAssertionId with D=`proposed` |

## Immutable BaseContext

`BaseContext` — отдельный immutable versioned input:

```text
BaseContext = {
  contextId,
  schemaVersion,
  insightRevisions,
  mandates,
  slices,
  representations,
  transcriptionRelations: Task -> Mandate
}
```

- BaseContext — authoritative seed/source для pre-existing identities, immutable scopes и
  исходных typed relations на границе replay; он не содержит lifecycle assessments/current views.
- EventLog — authoritative source для event-created assertion/revision IDs и lifecycle
  events/transitions.
- Оба входа фиксируются по identity/version для воспроизводимого replay. BaseContext не
  cache и не derived lifecycle state.

## Committed-log validation и ReplayResult

```text
ReplayResult = Ok(State) | Error(ReplayError)
```

`replay(baseContext, log, targetSchemaVersion)` обрабатывает события по `seq` и при первом невалидном событии возвращает
детерминированный `ReplayError {seq, eventId, code, refs}`. Error codes:

- duplicate eventId или seq / non-strict total order;
- duplicate/freshness violation созданного assertionId/revisionId;
- missing reference в committed prefix;
- wrong reference kind, axis, subject или value;
- unsupported schema version либо deterministic upcast failure;
- repeated revoke уже revoked assertion;
- invalid supersede/reopen payload.

Validation после upcast требует:

- created IDs fresh;
- исходный MANDATE/SLICE/representation subject и scope relation существуют в BaseContext;
- event-created assertion/revision существует в committed prefix и имеет ожидаемый type;
- `oldDecisionAssertionId` действительно D assertion;
- successor revision для Supersede существует в BaseContext либо committed prefix;
- Reopen ссылается на revision из BaseContext/prefix и создаёт fresh относительно обоих
  входов new revision + fresh initial D assertion.

Как append/transaction/retry обеспечивает эти условия, решает C7.

## Reducer transitions

Reducer инициализируется immutable index BaseContext. State содержит ссылку на этот context,
immutable assertion registry, revoked assertion IDs, typed supersede links и event-created
revision registry. Transcription relations читаются только из BaseContext и событиями C4
не создаются и не мутируются.

| Event | Effect |
|---|---|
| Assert* | Добавляет immutable typed assertion; другие axes не меняет |
| Revoke | Добавляет target ID в revoked set; только этот assertion становится inactive |
| Supersede | Добавляет typed link old D assertion → successor revision; D/V не меняет, old D остаётся в history/current своего exact old subject |
| Reopen | Создаёт fresh revision и fresh initial D=`proposed`; old revision immutable; transcription не создаёт и не переносит |

Correction = append Revoke(old) + Assert*(new). Между событиями возможен промежуточный
derived state; atomicity/idempotency/recovery пары остаются C7. Committed events не
rewrite/delete.

## Active/conflict semantics

Для каждого exact key `(axis, subject)`:

```text
live(key) = все type-valid assertions(key) minus valid revoked assertion IDs
current(key) =
  None                       if |live| = 0
  Some(the assertion)        if |live| = 1
  Conflict(sorted IDs)       if |live| > 1
```

`Conflict` — typed derived diagnostic вне C2 enum; winner молча не выбирается. Sorting по
immutable assertion IDs делает diagnostic deterministic; semantic result не зависит от
порядка iteration.

Supersede не вычитает old D из `live(old subject)`: это relation между revisions, не D-value.
Successor имеет собственный exact subject и собственный current D.

## Typed views

View A:

- `assertionHistory` = все assertions с revoked flag + supersede/reopen relations;
- `currentAssessments` = map каждого exact `(axis,subject)` по правилу `None|Some|Conflict`.

View B для каждого representation subject использует только View A result по V:

- `None` → `unclassified` projection case;
- `Some(active)` → current representation;
- `Some(archived)` → archive representation;
- `Conflict(ids)` → visibility-conflict diagnostic.

`None` находится вне V enum и означает отсутствие active V assertion, а не третье V-value.
Revoked/superseded не равны archived. Полный no-inference сохраняется:
`V ⇏ D/L/O` и `D/L/O ⇏ V`.

## Version-explicit replay и upcast

`replay(baseContext, log, targetSchemaVersion)` использует upcast registry. Каждый supported path:

- pure, total и deterministic;
- compositional и path-independent;
- semantically preserving;
- сохраняет eventId, seq, created IDs и exact subject identity.

После upcast событие проходит ту же typed validation. Past events не переписываются.

## Source of truth и cache boundary

- Immutable BaseContext authoritative для pre-existing identity/scope seed; committed
  append-only EventLog authoritative для event-created IDs и lifecycle events/transitions.
  Они отвечают за разные типы истины.
- Cache/snapshot допустим только как discardable, rebuildable, non-authoritative derived
  optimization после benchmark full replay.
- Correctness и ReplayResult не зависят от cache; удаление cache полностью восстанавливает
  views из того же pinned/versioned BaseContext + EventLog.
- Фиксированного численного порога нет. CQRS/bus/saga не вводятся без отдельной задачи.

## Premises и open-map

| Источник | Использовано |
|---|---|
| C1_VERDICT | Immutable subject/scope/revisions |
| C2_VERDICT | Exact D/L/O/V subjects/enums; no-delete; no-inference; event-only supersede; reopen new ID/no transcription |
| C4_TOPIC / repairs | Event/history/replay/upcast/view/cache requirements |
| M0 / DEPS | C4 не решает legacy, enforcement или operational mechanics |

C3 evidence остаётся optional opaque `evidenceRef`: C4 не фиксирует его schema,
cardinality или criteria. Открыты: C5 legacy; C6 workflow/UX/enforcement/implementation;
C7 concurrency/idempotency/atomicity/order assignment/retry/recovery.

## Contract-level DoD

- BaseContext и EventLog разделены по типам истины; replay signature содержит оба входа.
- Event union и validation/error semantics полны и type-safe.
- Reducer transitions и `None|Some|Conflict` определены без silent winner.
- Assertion history и V representation views раздельны; V=None не enum-value.
- Versioned replay/upcast deterministic и identity-preserving.
- Cache non-authoritative и benchmark-driven.
- C3 content и C5–C7 не спроектированы.
