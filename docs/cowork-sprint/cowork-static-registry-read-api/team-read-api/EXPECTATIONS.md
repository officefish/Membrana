# Expectations - Block read-api

This is a one-sided Phase 1 statement. It records what the read-api block needs and can
provide without reading or predicting another team's implementation. Type names below belong
to this block's planned test boundary; an integration adapter may translate different domain
shapes later.

## What I need from neighboring blocks

| From | Need | Shape expected at my boundary | Invariants |
|------|------|-------------------------------|------------|
| Registry contract provider | Validated immutable record and lineage metadata suitable for a safe projection | A value from which record id, `sha256`, `bytes`, `addedAt`, effective predecessor id, root id, `canonicalRef`, and tip status can be read | Record id, hash identity, and lineage identity remain distinct; `canonicalRef` is exactly `urn:mmbrn:static:<rootId>`; equal hashes do not merge records or lineages |
| Registry index provider | Lookup by exact record id | Found/not-found outcome for one well-formed id | Unknown is explicit; no fuzzy matching, fallback to Affine id, mutation, filesystem concern, or partial success |
| Registry index provider | Resolve by exact `canonicalRef` | Found/not-found outcome containing root id, lineage records in deterministic predecessor order, and tip id | The returned lineage is valid and unambiguous; canonicalRef is opaque lineage identity, not a URL; unknown or invalid registry truth fails closed |
| Integration owner | Runtime adapter and Nest application wiring | Adapter binds the integrated registry/index API to this block's injected read port | `app.module.ts`, manifests, cross-package dependencies, and bootstrap remain outside this block before integration |

I do not require neighboring blocks to export the names, classes, exceptions, or object layout
used by my stub. I require only the capabilities and invariants above; shape reconciliation is
an Interface Consilium and integration-adapter concern.

## What I can provide

| To | What | Form | Invariants |
|----|------|------|------------|
| Integration owner | NestJS read-only boundary | Isolated module/controller with an injection token and replaceable read-port interface | No root application wiring and no direct filesystem/index construction |
| API consumers behind future ingress/auth | Record lookup | `GET /static-registry/records/{recordId}` with explicit success, `400`, and `404` schemas | Response is an allow-list DTO; no `location.ref`, raw location, Affine id, file-byte payload, or write side effect |
| API consumers behind future ingress/auth | Canonical lineage resolution | `GET /static-registry/resolve?canonicalRef=...` with explicit success, `400`, and `404` schemas | Accepts only exact canonicalRef syntax; never accepts `affineDocId` as identity or turns canonicalRef into a URL |
| Integration and review | Executable contract evidence | Controller tests plus generated OpenAPI assertions from an isolated Nest test app | Exactly two GET operations; malformed input does not call the service; unknown maps to `404`; no write operation is declared |

## Block-local read port proposed for stubs

The Phase 2 executable stub will target this conceptual port in the read-api write scope:

```ts
type ReadResult<T> =
  | { kind: 'found'; value: T }
  | { kind: 'not-found' };

interface StaticRegistryReadPort {
  getRecordById(recordId: string): Promise<ReadResult<RegistryRecordReadModel>>;
  resolveCanonicalRef(
    canonicalRef: string,
  ): Promise<ReadResult<ResolvedLineageReadModel>>;
}
```

This is not a negotiated cross-block interface. It is the dependency surface against which
this block can prove its own controller behavior. A later adapter may implement it over any
neighboring API ratified in Phase 3.

## Invariants owned by this block

- Only `GET` handlers exist; the transport exposes no create, update, repair, supersede, or
  delete route.
- Malformed transport input is `400`; a well-formed unknown registry key is `404`.
- DTOs are reconstructed by allow-list and never serialize a domain record directly.
- `location.ref` is absent from every HTTP success and error schema before ingress/auth.
- Affine id is neither accepted input, emitted canonical identity, nor fallback lookup key.
- `canonicalRef` remains `urn:mmbrn:static:<rootId>` and is never represented as a URL.
- Service/index failure cannot yield a partial `200` response.
- The controller owns HTTP semantics only; registry validation, lineage computation, storage,
  authorization, and application wiring stay outside it.

## Planned executable stubs in my future write scope

| Stub or harness | Replaces | Planned location | Executable proof |
|-----------------|----------|------------------|------------------|
| In-memory `StaticRegistryReadPort` test double | Integrated registry/index adapter | Inline or test-only helper under `packages/background-office/src/modules/static-registry/**` | Deterministic found/not-found results and call recording for malformed-input assertions |
| Sanitized record fixture | Neighbor-produced record read model | Test fixture under the same module test tree | Mapper returns only allowed fields even when the source fixture contains forbidden `location.ref` and Affine-like fields |
| Sanitized lineage fixture | Neighbor-produced canonicalRef resolution | Test fixture under the same module test tree | Ordered lineage and tip reach the DTO without exposing storage identity |
| Isolated Nest test application | Root `app.module.ts` and integration wiring | Controller/OpenAPI test under the same module test tree | HTTP status mapping, route-method absence, dependency injection, and generated OpenAPI schemas are executable without shared-file edits |

All stubs remain test-only, are never imported by production runtime code, and require no
change outside the read-api Phase 2 write scope.
