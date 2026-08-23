# Assets Container: Owner Decision To Wait For Originals

Date: 2026-08-23
Task: `assets-container`
Decision source: owner chat after PR #2102 recut merge

## Decision

Assets-container waits for originals container readiness. It does not start as a
domain layer without storage, and it does not use temporary storage.

## Reason

The main tooth of the epic is "photo confirmation with today's date". Without
real storage this tooth cannot work. Temporary storage is rejected because it
tends to become permanent.

## Registered State

The epic remains registered and active with a named external blocker:
`static.mmbrn.tech` R7 keeps cutover NO-GO until readiness gates pass. This is a
checkable blocked state, not an unspecified suspension.

## Answers Carried By The Recut

1. Assets-container is a domain layer over the originals contract, not a second
   storage/access container.
2. "Sensitive in server DB behind API" is compatible with R3/R4 only as a
   Panel-authorized route; it diverges if assets creates its own authorizer or
   mutable overwrite store.
3. The essential asset-specific domain is the physical world: holder by nature,
   today's photo confirmation, and receipt-grouped asset sets.
