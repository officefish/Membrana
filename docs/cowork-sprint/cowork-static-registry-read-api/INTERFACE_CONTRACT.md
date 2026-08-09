# Interface Contract: static registry read API

| Поле | Значение |
|---|---|
| sprint | `cowork-static-registry-read-api` |
| ratified by consilium | 2026-08-09, 3/3 `ACCEPT-WITH-ADAPTERS` |
| contract block | `cbba747e6c990a4c106e095ee24925799214492d` |
| index block | `d09dc34a41a7ab23ab419c729af79b047052bc9d` |
| API block | `44630395a44e7d6536a839984ae4eb2c5ea6e209` |

## Contract to index

Production source enters through exactly one parser:

```ts
parseStaticRegistryJsonl(text: string): ParseResult<StaticRegistrySnapshot>;

function toRegistryIndexInputs(
  snapshot: StaticRegistrySnapshot,
): readonly RegistryIndexInput<IntegratedEvidencePayload>[];

function createIndexFromSnapshot(
  snapshot: StaticRegistrySnapshot,
): StaticRegistryIndex<IntegratedEvidencePayload>;
```

`IntegratedEvidencePayload` is an explicit JSON-compatible copy of the complete validated
`EvidenceRecord`: `id`, `sha256`, `bytes`, `addedAt`, `source`, `location` and optional
`about`, `measured`, `sensitive`, `supersedes`. It is internal and is never serialized as an
HTTP DTO.

| Contract entry | Index input |
|---|---|
| `recordId` | `id` |
| `canonicalRef` | `canonicalRef` |
| `effectivePredecessor` | `effectivePredecessor` |
| explicit JSON copy of `record` | `record` |

Parser failure rejects bootstrap before index creation. Index revalidates topology and
canonical ownership; its line-decoder entry point is not a second production parser.

## Index to read API

Integration supplies the frozen port unchanged:

```ts
class StaticRegistryIndexReadAdapter implements StaticRegistryReadPort {
  constructor(index: StaticRegistryIndex<IntegratedEvidencePayload>);

  getRecordById(
    recordId: string,
  ): Promise<StaticRegistryReadResult<StaticRegistryRecordReadModel>>;

  resolveCanonicalRef(
    canonicalRef: string,
  ): Promise<StaticRegistryReadResult<StaticRegistryLineageReadModel>>;
}
```

The adapter enforces record/root grammar `^[a-z0-9][a-z0-9-]{2,63}$` before lookup.
`UNKNOWN_ID` and `UNKNOWN_CANONICAL_REF` map to `not-found`; malformed identity maps to HTTP
`400`; construction, invariant and unexpected mapping errors propagate fail-closed.

Record projection:

- `id`, `sha256`, `bytes`, `addedAt`, `canonicalRef` come from validated indexed data;
- `effectivePredecessorId = indexed.effectivePredecessor`;
- `rootId = lineage.records[0].id`;
- `tip = lineage.tip.id === indexed.id`.

Lineage projection contains only `canonicalRef`, root id, root-to-tip record ids and tip id.
Neither projection contains `location`, `location.ref`, `source`, Affine identity, file bytes,
download addresses or access decisions.

## Data-flow invariants

1. Runtime integration owns UTF-8 file I/O and constructs one immutable index per source load.
2. Contract owns record validation, four legacy fallbacks, predecessor, root and canonicalRef.
3. Index owns deterministic exact lookup, topology revalidation, lineage order and tip lookup.
4. Read adapter owns domain-error translation and allow-listed read models.
5. Controller owns HTTP syntax/status/OpenAPI and final DTO projection.
6. Source is atomic: no parser or index error yields a partial route or partial response.
7. Lineage order follows only effective predecessor, never source order or `addedAt`.
8. `addedAt` is preserved as date/date-time registry metadata; no clock or timezone is invented.
9. Equal `sha256` values never merge records or lineages.
10. `canonicalRef` is an opaque lineage URN, never a URL or Affine document id.
11. Requests never rebuild or mutate the index.
12. Before `#1303-B`, the module is composition-ready but not mounted in production
    `AppModule`; Panel forward-auth owns the live metadata gate.

## Glossary

| Term | Meaning |
|---|---|
| record id / index id | immutable `EvidenceRecord.id` |
| hash identity | SHA-256 byte claim; not record or lineage identity |
| effective predecessor | explicit `supersedes`, else one of four contract-owned fallbacks |
| root id | record id with no effective predecessor |
| canonicalRef | `urn:mmbrn:static:<rootId>`, lineage identity |
| lineage | one validated root-to-tip chain |
| tip | final record with no successor |
| snapshot | complete fail-closed parser result |
| index | immutable query projection over one snapshot |
| read model | allow-listed transport projection, never raw domain serialization |
| location.ref | internal storage address, never identity and not exposed in this phase |

## Integration adapters and wiring

Coordinator-owned changes:

- service adapter from core snapshot to index inputs;
- office adapter from index errors/values to `StaticRegistryReadPort`;
- runtime source provider reading canonical `docs/evidence/registry.jsonl` fail-closed;
- core barrel export, service package manifest, package dependencies and lockfile;
- Docker context/build/runtime copies for core, static-registry service and registry source;
- API documentation stating `composition-ready`, not `live`;
- no production `AppModule` mount before `static-mmbrn-ingress-auth`.

Stubs under block test trees are not imported into production and need not be copied into the
runtime image.

## Integration smoke

One test must execute the real chain:

1. Supply fixture JSONL with a root and revision, reversed source order, equal-SHA separate
   roots, and a secret-like `location.ref`/Affine address.
2. Parse with real `parseStaticRegistryJsonl`.
3. Adapt the snapshot and build the real `StaticRegistryIndex` once.
4. Inject the real read adapter into the frozen Nest module.
5. Assert record GET returns correct predecessor/root/tip metadata and no forbidden field.
6. Assert canonical resolve returns deterministic root-to-tip ids and correct tip.
7. Assert malformed identity is `400`, unknown valid identity is `404`, and no write route exists.
8. Assert malformed/forked source refuses composition before a port is exposed.

Verification also runs all three block suites, affected typecheck/build, `git diff --check`,
Docker image smoke, and a production-import scan proving no test stub enters the runtime graph.

## Integration acceptance

- [x] all three frozen block commits merged without replacement;
- [x] adapters implement the signatures and invariants above;
- [x] current registry parses and indexes atomically: 18 records / 14 lineages;
- [x] integration smoke and all block tests pass;
- [x] OpenAPI reflects calendar-date `addedAt` without normalization;
- [ ] package/Docker wiring is written and statically checked; image smoke is honest `unknown`
  because the local Docker daemon is unavailable, so CI must prove the image;
- [x] module remains unmounted until R3 ingress/auth;
- [ ] coordinator embargo incident is carried into retrospective.
