# Static registry read API

## Status and boundary

This module is the read-only transport from Cowork Sprint block `read-api`. It is not a
public ingress and is not wired into `packages/background-office/src/app.module.ts` by the
block. Application wiring and the adapter to registry/index truth belong to the integration
phase.

The module is registered with an injected `StaticRegistryReadPort`; it does not read files,
construct an index, mutate registry truth, authorize a caller, or locate material bytes.

## Operations

| Method | Path | Purpose | Success |
|--------|------|---------|---------|
| `GET` | `/static-registry/records/{recordId}` | Read one immutable record by exact record id | Allow-list record metadata DTO |
| `GET` | `/static-registry/resolve?canonicalRef=...` | Resolve one exact lineage identity | Root id, deterministic record-id order, and tip id |

There are exactly two operations. `POST`, `PUT`, `PATCH`, and `DELETE` are not implemented.

## Request and error contract

- `recordId` is a lowercase registry slug of at most 128 characters, beginning with an
  alphanumeric character and then containing only lowercase alphanumerics, `.`, `_`, or `-`.
- `canonicalRef` has the exact form `urn:mmbrn:static:<rootId>` and is lineage identity, not
  a URL.
- A malformed or missing value returns `400` before the read port is called.
- A well-formed value absent from registry truth returns `404`.
- An unexpected read-port failure fails closed; the controller does not return partial data.

An Affine document id is not an accepted alias for either input and is never canonical
identity.

## Response disclosure

Responses are rebuilt field by field from local DTOs. The record response contains only:

- `id`, `sha256`, `bytes`, and `addedAt`;
- `canonicalRef`, `effectivePredecessorId`, `rootId`, and `tip`.

The lineage response contains only `canonicalRef`, `rootId`, ordered `recordIds`, and `tipId`.

Before the dependent ingress/auth phase, responses never expose:

- `location.ref` or a raw `location` object;
- an Affine id or storage-provider identity;
- a file-byte payload, download address, or signed link;
- an authorization decision.

## Isolated registration

The dynamic module accepts a factory for the block-local read port:

```ts
StaticRegistryModule.register({
  imports: [IntegratedRegistryIndexModule],
  inject: [INTEGRATED_REGISTRY_INDEX],
  useFactory: (index) => createStaticRegistryReadAdapter(index),
});
```

The symbols in this example are placeholders for the Phase 3 contract and Phase 4 adapter;
they are not declarations about another block's implementation.
