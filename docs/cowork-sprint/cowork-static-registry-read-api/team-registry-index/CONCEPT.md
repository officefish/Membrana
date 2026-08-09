# Concept - Block registry-index

## Purpose

`registry-index` is a pure domain block that turns an injected, finite registry source into
an immutable query index. It owns deterministic indexing, lineage topology validation and
read semantics. It does not own persistence, JSONL file access, HTTP, OpenAPI DTOs or the
final cross-package adapter.

The block succeeds atomically: either the complete source produces one valid index, or
construction fails with structured evidence. A rejected source never yields a partial
index.

## Domain boundary

The index needs a normalized record projection with these meanings:

| Field | Meaning used by this block |
|-------|----------------------------|
| `id` | Immutable record identity and the key for exact lookup |
| `canonicalRef` | Lineage identity, exactly `urn:mmbrn:static:<rootId>` |
| `effectivePredecessor` | Previous record id in the lineage, or `null` for a root |
| `record` | Immutable normalized record returned by exact lookup |

The projection is a local design assumption for Phase 2 stubs, not a negotiated shared
interface. The integration adapter may translate the contract block's eventual output into
this meaning without changing the index's topology rules.

Construction has two injected-source forms:

1. **Normalized records:** a finite iterable is materialized and validated as one snapshot.
2. **Lines:** a finite iterable of lines is passed through an injected line decoder, then
   through the same normalized-record construction path.

Neither form opens a file, fetches a URL or discovers a runtime source. A caller owns all
I/O before invoking this block.

## Construction model

Construction is deliberately independent of source order:

1. Materialize the injected source exactly once.
2. Decode every line, when the line form is used. Any decoder failure rejects the source.
3. Copy and freeze the normalized records so caller-owned containers cannot mutate the
   completed index.
4. Sort validation inputs by record id to make traversal and diagnostics stable.
5. Build `byId`, predecessor and successor relations.
6. Validate each connected component as one finite linear chain.
7. Derive its root, require every member's `canonicalRef` to equal
   `urn:mmbrn:static:<rootId>`, and index the chain by that reference.
8. Store each lineage in root-to-tip order and store its unique tip.

The completed object exposes no mutable map, set or array. Query results are immutable
snapshots, and rebuilding from equivalent input produces deeply equivalent observable
results regardless of iteration order.

## Query semantics

The conceptual read surface is:

| Operation | Success |
|-----------|---------|
| lookup by record id | The one immutable normalized record with that id |
| resolve `canonicalRef` | The one immutable lineage identified by that reference |
| read lineage | Records ordered root to tip |
| read tip | The final record in that ordered lineage |

Exact exported TypeScript signatures remain local until Interface Consilium. Internally,
all four operations distinguish success from fail-closed domain errors; they do not return
an arbitrary first match and do not silently coerce malformed keys.

## Fail-closed rules

Construction rejects at least these source conditions:

- malformed line or malformed normalized record reported by the injected decoder/guard;
- duplicate record id;
- missing predecessor;
- more than one successor for a record (fork);
- more than one effective predecessor for a record, if presented by an injected shape
  (merge);
- cycle or a component without exactly one root and one tip;
- a member whose `canonicalRef` does not match its derived root;
- one `canonicalRef` identifying disconnected components or otherwise resolving
  ambiguously.

Queries reject malformed identifiers before lookup, reject unknown record ids and unknown
canonical references, and reject ambiguity instead of selecting by insertion order. Error
evidence uses stable codes and deterministically ordered involved ids; it contains no file
path, URL or transport status.

The index never treats equal `sha256` values as identity. Records and lineages remain
separate unless their record-id predecessor topology joins them.

## Phase 2 implementation shape

The planned production code remains entirely under
`packages/services/static-registry/**`:

- a small local normalized-record input boundary;
- immutable index construction shared by record and line entry points;
- topology validation and stable domain errors;
- exact-id and canonical-lineage query methods;
- package-scoped tests and test-only executable stubs.

A package-local manifest may be added only if the workspace tooling requires it. Root
manifests, shared exports, runtime registry loading and cross-package wiring stay outside
this block and remain integration-owned.

## Own executable stubs

Phase 2 tests will define stubs only inside `packages/services/static-registry/**`:

| Stub | Local purpose |
|------|---------------|
| `test/stubs/registry-contract.stub.ts` | Produce normalized valid and malformed records without importing neighbor code |
| `test/stubs/line-decoder.stub.ts` | Decode injected fixture lines and emit deterministic parse failures |
| `test/stubs/index-consumer.stub.ts` | Exercise the offered read outcomes without importing transport code |

These stubs are test-only, are not exported by the production package and must not enter the
integration production graph.

## Own Definition of Done

Phase 2 is ready only when package-scoped tests prove:

- equivalent records and lines rebuild to the same observable index across input orders;
- exact id lookup succeeds and unknown/malformed ids fail closed;
- canonical resolution, root-to-tip lineage and unique tip are correct;
- equal hashes never merge records or lineages;
- malformed records, decoder failures, duplicate ids, dangling predecessors, fork, merge,
  cycle, canonical mismatch and ambiguous canonical reference reject the whole build;
- returned records and lineage collections cannot mutate index behavior;
- tests import only this block and its own stubs and perform no filesystem or HTTP access.
