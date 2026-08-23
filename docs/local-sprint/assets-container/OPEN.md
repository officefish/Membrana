# Membrana Local Sprint OPEN: assets-container

| Field | Value |
|-------|-------|
| Sprint | `assets-container` |
| Procedure | `membrana-local-sprint` |
| Registry card | `assets-container` (L, #959) |
| Prompt | [`ASSETS_CONTAINER_PROMPT.md`](../../prompts/ASSETS_CONTAINER_PROMPT.md) |
| Cut plan | [`assets-container.json`](../../sprint/cut/assets-container.json) |
| Cutter context | Vesnin, [`cut-assets-container-2026-08-23-vesnin.md`](../../discussions/cut-assets-container-2026-08-23-vesnin.md) |
| Lead | vesnin |
| Support | ozhegov |
| Status | recut ratified · no code yet |

## Why

The original assets-container epic predated the ratified `static.mmbrn.tech`
originals contract. Reconnaissance found that docs/evidence and
`static.mmbrn.tech` are one container on two stages, and R2/R3/R4 already cover
index/history, authorization and sensitive storage mechanics. Assets-container
must therefore be recut as the physical-asset domain layer, not as a competing
storage/access container.

## Ratified Decision

Owner ratified the recut in chat on 2026-08-23. Assets-container keeps its
domain semantics: receipt, asset set, holder, today photo confirmation, RT-9
freshness and Scarlett Solo field acceptance. It reuses the originals contract
for immutable records, storage, lifecycle and Panel authority.

## Code Gate

No implementation starts from the old three-tier framing. The next code sprint
must begin from [`assets-container.json`](../../sprint/cut/assets-container.json)
and must not add a second authorizer or a second storage truth for sensitive
asset material.
