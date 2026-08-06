# Membrana Local Sprint closure: harness-product-deploy-2026-08-02

**Status:** CLOSED  
**Procedure:** `membrana-local-sprint`  
**Registry task:** `harness-workflow-pages`  
**Parent epic:** `dual-mintlify-product-harness` / Issue #1622

## Outcome

PR #1650 delivered the independent Harness Mintlify corpus and merged as
`40468d1d72b38a267b6e197deeb322a7d469b0f6`. Every one of the 13 live
workshops and 23 live procedures has a generated page. The primary procedure
navigation contains the 15 procedures with substantive operational evidence;
the remaining declared or incomplete procedures stay visible as an honest
separate corpus and feed `workflow-examples-marathon`.

Product and Harness are now live at `product.mmbrn.tech` and
`harness.mmbrn.tech`. Their navigation boundaries remain disjoint.

## Definition of Done

| Requirement | Evidence | Result |
|-------------|----------|--------|
| One page per live workshop and procedure | generator test 9/9; 13 + 23 corpus | PASS |
| Canon-derived indexes and navigation | generator `--check`; Mintlify link check | PASS |
| Honest portfolio/example state | Dynin and Rodchenko reviews; marathon task | PASS |
| Product absent from Harness navigation | corpus test | PASS |
| Harness custom domain only | Connected dashboard and HTTPS smoke | PASS |
| Desktop, mobile and basic a11y | `VISUAL_REPORT.md`; owner acceptance | PASS |
| Assigned reviewers saw the code | Dynin, Rodchenko and Vesnin LGTM | PASS |
| Sprint gate and exact-SHA closure | `GATE_REPORT.md`; PR #1650 teamlead check | PASS |

## Review and delivery

The first independent review round BLOCKed the implementation. After fixes,
Dynin, Rodchenko and Vesnin issued LGTM for code SHA
`a57d91c5fcda7c6ce44ed2427363c4bdaa3227fc`; the final PR head
`88f288e76ff71fcfae1653888125b863f21cd5c6` passed the exact-SHA teamlead
status and server CI before merge. The Mintlify deployment of the merge commit
completed successfully.

## Follow-up, not closure debt

`workflow-examples-marathon` remains active by design. It accumulates lived
`run` and `boundary|failure` evidence for every workflow object. This sprint
created its machine-readable entry point and did not pretend the corpus was
already complete.
