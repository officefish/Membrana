# Expectations - Block registry-index

This is a one-sided Phase 1 statement. Shapes below are requirements and offers from this
block only; they do not claim or infer another block's implementation. Phase 2 tests will
encode them with local stubs until Interface Consilium defines adapters.

## What I need from neighboring blocks

| From block | What I need | Provisional form used only by my stub | Invariants I rely on |
|------------|-------------|----------------------------------------|----------------------|
| `registry-contract` | A total way to normalize one injected record or line into the identity and lineage facts the index needs | Success containing immutable `record`, `id`, `canonicalRef`, and zero-or-one `effectivePredecessor`; or a structured failure | `id` is record identity; `canonicalRef` is lineage identity; root predecessor is absent; explicit/legacy predecessor policy is already resolved; malformed input is never represented as a partial success |
| `registry-contract` | Stable identity meanings independent of source order | Scalar strings and an immutable normalized record payload | `canonicalRef` is exactly `urn:mmbrn:static:<rootId>`; equal `sha256` does not imply equal record or lineage; no filesystem or HTTP behavior is hidden in normalization |
| `read-api` | No reverse dependency from the domain index into transport | The local consumer stub calls domain operations directly; a later adapter may map outcomes | Transport status, DTO redaction and route design remain outside this block; unknown, malformed and ambiguous outcomes must stay distinguishable through the seam |

## What I can provide

| To block | What I can provide | Provisional local form | Invariants I guarantee |
|----------|--------------------|------------------------|------------------------|
| `registry-contract` | Atomic validation of the complete normalized record set as a lineage graph | Build success with an immutable index, or a structured construction failure with stable code and sorted involved ids | No partial index; no mutation of injected data; duplicate, dangling, fork, merge, cycle, canonical mismatch and ambiguity fail closed |
| `read-api` | Exact lookup by record id | Success with one immutable normalized record, or distinct malformed/unknown domain failure | Never selects by hash, Affine id or insertion order; never exposes a filesystem/HTTP concern |
| `read-api` | Resolve a canonical reference, read its lineage and read its tip | Success with one canonical reference, root-to-tip immutable records and one tip, or distinct malformed/unknown/ambiguous domain failure | The reference remains a URN, never a URL; resolution is deterministic; no `location.ref`, bytes or allow/deny decision is introduced by the index |
| integration adapter | Construction from injected normalized records or injected lines | Record entry point plus line entry point with an injected decoder | Finite source is consumed as one snapshot; equivalent input produces equivalent results regardless of iteration order; all I/O remains caller-owned |

## My invariants

1. `id`, `sha256` and `canonicalRef` are different identities.
2. `canonicalRef = "urn:mmbrn:static:" + rootId` and is derived from lineage root.
3. A valid component is one finite linear chain with exactly one root and one tip.
4. Lineage order is root to tip; tip has no successor in the complete effective-predecessor
   relation.
5. Unknown, malformed or ambiguous input never yields a partial or guessed answer.
6. The built index and every observable result are immutable and source-order independent.
7. The domain performs no filesystem, network, HTTP, access-policy or source-mutation work.

## Planned executable stubs in my Phase 2 write scope

| Stub | Replaces for isolated tests | Planned location |
|------|-----------------------------|------------------|
| normalized registry contract stub | Neighbor normalization/parser behavior, including deterministic malformed cases | `packages/services/static-registry/test/stubs/registry-contract.stub.ts` |
| injected line decoder stub | Runtime conversion of supplied lines into normalized records | `packages/services/static-registry/test/stubs/line-decoder.stub.ts` |
| index consumer stub | A transport-side caller that observes success and fail-closed outcomes | `packages/services/static-registry/test/stubs/index-consumer.stub.ts` |

All stubs are owned by this block, executable only in this block's tests and excluded from
the future production graph. They do not import or inspect another block's code.

## Phase 2 one-sided delta

Implementation made these local offers concrete without reading a neighboring design:

| Delta | Concrete local shape | Invariant now proved by this block |
|-------|----------------------|------------------------------------|
| Construction | `createStaticRegistryIndex(records)` and `createStaticRegistryIndexFromLines(lines, decodeLine)` | The complete iterable is materialized before validation; a source or decoder failure yields no index |
| Reads | `lookupById`, `resolveCanonicalRef`, `lineage`, `tip` on `StaticRegistryIndex` | Reads return frozen snapshots; lineage order is root to tip; exact keys are never coerced |
| Failure surface | `RegistryIndexError` with stable `code`, sorted `ids`, and optional one-based `lineNumber` | Malformed, unknown and ambiguous outcomes remain distinguishable without transport status or source location |
| Record boundary | The local input projection carries a JSON-only `record` payload | Construction deep-copies and freezes payloads, so caller mutation cannot alter index behavior |

The executable stubs now live at the three planned package-local paths. They remain test-only
and express no claim about a neighbor's eventual exported names or TypeScript signatures.
