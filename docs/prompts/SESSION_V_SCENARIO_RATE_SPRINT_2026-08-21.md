# Session V — 2026-08-21: scenario rate 44.1 vs 48 kHz (#2001)

> Entry point for a separate session. Everything goes through
> `membrana-local-sprint` (card -> cutter context -> cut -> owner ratification in
> chat before code -> blocks -> gate -> experience -> CLOSURE).
> Urgency: before the hour-long session, otherwise part of the material will be
> non-judgeable and will need to be recaptured.

## Observed

On the owner's device `1c04f0bc-...` production has 236 records, including both
44,100 and 48,000 Hz. Yesterday's board scenario tracks: three consecutive tracks
at 48 kHz, and one `MakeTrack 31b53800-1d5`, 3.11 s, at 44,100 Hz. So one scenario
within one session produces different sample rates.

Cost: mfcc analysis gates honestly refuse 44.1 kHz. Evidence: 2026-08-20 probe in
`docs/plugins/mfcc-first-field-probe-2026-08-20.md`; debt is open as #2001.
Today the owner records an hour with this scenario, so part of the tracks can fall
outside analysis.

## Task

1. Cause discovery first, before any code: why the same scenario writes different
   sample rates. Candidates: input device is selected by OS default instead of
   name; scenario node does not set rate and inherits card/driver mode; input
   changes between tracks. Output: written cause with code address.
2. Solution, based on cutter context, one of:
   - normalize in the path (resample to 48 kHz at ingest or in the scenario node)
     — Kuryokhin voice from 2026-08-20;
   - or second gates (analysis accepts 44.1 honestly), with explicit comparison
     cost;
   - or hard-fix the capture frequency in the scenario.
   The choice must be justified, not tweaked.
3. Tooth for the class: heterogeneous sample rate within one session must be named
   explicitly (at ingest, in sidecar check, or in analysis). It must not be mixed
   silently in one set.

## Forbidden

Touching the magistral session or journal plugin; changing #1950 behavior
(declared vs measured); production deploy; `git add -A`; manually fixing one track.

## DoD

Cause named with code address; solution ratified by cut and implemented; tooth for
the class exists; #2001 is closed or explicitly reformulated with a remaining
debt; full sprint trail exists.

---

## Acceptance criteria (scaffold)

> Заполнить до кода. Чеклист приёмки = Definition of Done + явные AC Issue.

- [ ] …
- [ ] …
