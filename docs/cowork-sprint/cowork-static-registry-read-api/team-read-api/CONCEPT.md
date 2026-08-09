# Concept - Block read-api

## Phase and scope

This Phase 1 artifact describes the NestJS read-only HTTP boundary for static registry
metadata. It does not implement the module, choose another block's exported types, or wire
anything into `packages/background-office/src/app.module.ts`.

The block will own only:

- an isolated NestJS module and controller under
  `packages/background-office/src/modules/static-registry/**`;
- HTTP request/response DTOs and their OpenAPI description;
- controller tests against an injected executable service stub;
- API documentation under `docs/api/static-registry/**`.

Root application wiring, cross-package dependencies, and the runtime adapter from the real
registry index remain integration-owned.

## Boundary model

The controller depends on a small injected read port identified by a Nest injection token.
It never reads `registry.jsonl`, imports a storage implementation, or constructs an index.
The eventual integration adapter may translate the neighboring domain API into this port;
this block does not require neighboring blocks to adopt its TypeScript names.

The port has two capabilities:

1. Read one immutable registry record by record id.
2. Resolve one lineage by exact `canonicalRef`, including its root, ordered record ids, and
   current tip.

The service result is discriminated as `found` or `not-found`, so the transport can map an
unknown but well-formed key to `404` without guessing from exceptions. Invalid or unavailable
registry truth is never converted into a partial success response.

## HTTP surface

The proposed isolated surface contains exactly two operations:

| Operation | Request | Success | Client errors |
|-----------|---------|---------|---------------|
| Read record | `GET /static-registry/records/{recordId}` | sanitized record DTO | malformed id `400`; unknown id `404` |
| Resolve lineage | `GET /static-registry/resolve?canonicalRef=...` | sanitized lineage DTO | malformed ref `400`; unknown ref `404` |

`canonicalRef` is carried as an opaque query value. The endpoint does not treat it as a URL,
derive a URL from it, or accept an Affine document id as an alias. Transport validation checks
presence, scalar shape, bounded length, and the exact `urn:mmbrn:static:` prefix before calling
the read port. Domain validation remains behind the port.

There are no `POST`, `PUT`, `PATCH`, or `DELETE` handlers, no command DTOs, and no hidden
mutation in either read operation.

## Disclosure-safe DTO projection

Responses are explicit allow-list projections rather than serialized domain records. A record
response may contain stable registry and lineage metadata such as record id, `sha256`, `bytes`,
`addedAt`, `canonicalRef`, effective predecessor id, root id, and tip status. A resolve response
may contain `canonicalRef`, root id, ordered record ids, and tip id.

The projection has these hard exclusions:

- no `location.ref` under any nesting or alias;
- no raw `location` object;
- no Affine document id or other storage-provider identity;
- no file-byte payload, download address, signed link, or allow/deny decision.

This is intentionally stricter than omitting only sensitive addresses. Before the dependent
ingress/auth phase, this transport has no authority to decide who may receive an address.
`canonicalRef` remains lineage identity and never becomes a route to storage.

## Error semantics

- Request syntax is validated at the controller boundary; malformed values produce a stable
  OpenAPI-documented `400` response and do not invoke the service.
- A well-formed id or `canonicalRef` absent from registry truth produces `404`.
- Unexpected service failure or invalid registry state fails closed and emits no partial DTO.
  It is not mislabeled as `404` or repaired by the transport.
- Response mapping is exhaustive and reconstructs DTOs field by field, preventing future
  domain fields from leaking automatically.

## OpenAPI contract

Phase 2 will describe both operations, parameters, success schemas, and `400`/`404` responses
with Nest Swagger decorators. The generated OpenAPI document will be tested from an isolated
Nest application, without changing root bootstrap or `app.module.ts`.

The OpenAPI test will also enforce the negative contract: only the two GET operations exist,
and response schemas contain neither `location.ref`, an Affine id, nor write operations.

## Phase 2 proof plan

Controller tests will build a Nest testing module with an injected in-memory stub implementing
the block-local read port. Fixtures will cover one found record, one resolved lineage, unknown
keys, malformed inputs, and a service failure. The tests will prove:

- read by record id and resolve by exact `canonicalRef`;
- malformed request -> `400`, with zero service calls;
- unknown well-formed key -> `404`;
- successful DTOs are allow-list projections with no forbidden address, file-byte payload,
  or Affine identity;
- the isolated route/OpenAPI graph has no write route;
- the service is replaceable by injection and no filesystem or neighboring implementation is
  required for the block's own DoD.

No production code is created in Phase 1.
