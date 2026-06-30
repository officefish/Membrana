# TDOA and localization contracts

> Status: `@experimental @stage 2` design spec.
> Sprint: `tdoa-localizer-spec-s1`.
> Issue: [#211](https://github.com/officefish/Membrana/issues/211).
> Owner policy: each section has one accountable Membrana persona.

---

## 0. Freeze boundary

**Owner: Vesnin**

This document prepares Stage 2/3 contracts only. It does not unfreeze Stage 2.

Allowed in this sprint:

- document data contracts for TDOA pair estimation and localization;
- keep TypeScript interfaces in `@membrana/core` marked `@experimental @stage 2`;
- update frozen service documentation.

Forbidden until stage-gate 1 to 2 is passed:

- implementing GCC-PHAT, cross-correlation, multilateration, tracking, or association;
- connecting TDOA/localizer to `apps/client`, device-board runtime, realtime gateway, or background services;
- claiming production localization accuracy;
- removing the frozen status from `@membrana/tdoa-service`.

Gate reference: `WHITE_PAPER.md` requires precision >= 85% and recall >= 90% for a single-node detector or agreed ensemble before Stage 2 work starts.

---

## 1. Architecture boundary

**Owner: Ozhegov**

The contracts are split into three layers so later implementation can evolve without mixing responsibilities.

| Layer | Responsibility | Future package |
|-------|----------------|----------------|
| Synced observation | A node-level acoustic observation with calibrated time and quality metadata | `@membrana/core` contract |
| TDOA pair estimation | Estimate arrival-time delta between two observations of the same acoustic event | `@membrana/tdoa-service` |
| Localization | Estimate source position from multiple TDOA pairs and known node geometry | `@membrana/localizer-service` |

Tracker and target association are deliberately out of scope. A localizer may report residuals and failure states, but it does not maintain tracks.

Service dependency rule:

- analyzer services may consume core contracts;
- analyzer services must not depend on each other horizontally;
- raw audio movement is not introduced by this spec.

---

## 2. Units and coordinate system

**Owner: Dynin**

Use explicit units in field names or documentation.

| Quantity | Unit | Notes |
|----------|------|-------|
| Time timestamp | milliseconds since Unix epoch | Keeps compatibility with existing `Timestamp` conventions |
| TDOA delta | milliseconds | Positive means observation B arrived after observation A |
| Time uncertainty | milliseconds | One standard deviation unless stated otherwise |
| Coordinates | meters | Relative to a named local frame |
| Speed of sound | meters per second | Default model may use 343 m/s at 20 C, but implementation is out of scope |
| Confidence | `[0, 1]` | Contract-level normalized confidence, not a benchmark metric |

Coordinate frame policy:

- `frameId` identifies a local map/cell coordinate frame;
- all nodes in one localization input must share the same `frameId`;
- 2D coordinates are mandatory for Stage 3 plane localization;
- 3D coordinates are optional and remain future-compatible.

---

## 3. Time sync quality model

**Owner: Dynin**

TDOA is only meaningful when each observation carries a time sync quality estimate. The contract separates local node time from calibrated global time.

Recommended fields:

- `localMs`: node-local timestamp;
- `globalMs`: calibrated global timestamp;
- `offsetMs`: estimated local-to-global clock offset;
- `jitterMs`: short-window clock instability;
- `uncertaintyMs`: total timestamp uncertainty for TDOA math;
- `source`: `gps-pps`, `ptp`, `ntp`, `manual`, or `synthetic`;
- `calibratedAtMs`: when the offset was last calibrated;
- `validUntilMs`: optional validity horizon;
- `confidence`: normalized confidence in the calibration.

The first runtime implementation may start with `synthetic` or `manual` sync for lab tests, but that is a future sprint.

---

## 4. Acoustic assumptions

**Owner: Kuryokhin**

TDOA depends on hearing the same acoustic event at multiple nodes. The contract should expose quality metadata instead of hiding weak inputs.

Minimum observation quality:

- `snrDb`: estimated signal-to-noise ratio if available;
- `detectionConfidence`: confidence from the single-node detector or ensemble;
- `eventId`: optional association hint for observations believed to describe the same event;
- `frequencyBandHz`: optional band used for matching;
- `sourceClass`: optional coarse class such as `drone`, `machine_hum`, `unknown`.

Known acoustic risks:

- multipath can create false early/late peaks;
- wind and temperature shift effective speed of sound;
- quiet electric drones may be below reliable TDOA extraction threshold;
- urban reflections may require robust delay estimates and median filtering later.

The spec does not store or move raw speech/audio. Any future raw-buffer transport must go through a separate privacy and storage review.

---

## 5. TDOA pair result

**Owner: Dynin**

A TDOA pair is a pairwise estimate between two synced observations.

Positive sign convention:

```text
deltaMs = arrivalMs(nodeB) - arrivalMs(nodeA)
```

Therefore:

- `deltaMs > 0`: node A heard the event first;
- `deltaMs < 0`: node B heard the event first;
- `deltaMs = 0`: equal arrival time within uncertainty.

Recommended result fields:

- `pairId`: stable id for the estimate;
- `nodeAId`, `nodeBId`;
- `observationAId`, `observationBId`;
- `deltaMs`;
- `uncertaintyMs`;
- `confidence`;
- `method`: `cross-correlation`, `gcc-phat`, `spectral-anchor`, `manual`, or `synthetic`;
- `quality`: diagnostics such as peak ratio, search window, and warnings.

Future algorithms may use GCC-PHAT or spectral anchoring, but this sprint only defines the data shape.

---

## 6. Node geometry

**Owner: Ozhegov**

Localization requires node positions and accuracy metadata.

Recommended fields:

- `nodeId`;
- `frameId`;
- `xMeters`, `yMeters`, optional `zMeters`;
- `positionAccuracyMeters`;
- `installedAtMs` or `updatedAtMs`;
- optional `role`: `fixed`, `mobile`, `reference`.

Geometry quality matters:

- nearly collinear nodes produce poor localization conditioning;
- short baselines may be insufficient for useful TDOA;
- three nodes are the minimum for 2D localization, four for robust 3D.

---

## 7. Localization model

**Owner: Dynin**

The localizer consumes multiple TDOA pairs and node geometry. It produces hypotheses, not truth.

Recommended input:

- `tdoaPairs`: at least two independent pairs for a 2D hypothesis, preferably more;
- `nodes`: geometry for every node referenced by the pairs;
- `speedOfSoundMetersPerSecond`;
- `frameId`;
- optional environmental metadata: temperature, wind, humidity.

Recommended hypothesis fields:

- `hypothesisId`;
- `frameId`;
- `xMeters`, `yMeters`, optional `zMeters`;
- `confidence`;
- `errorEllipse` for 2D or covariance matrix for future 3D;
- `residualMs`;
- `usedPairIds`;
- `warnings`.

Failure states should be explicit:

- `insufficient-nodes`;
- `mixed-frame`;
- `ill-conditioned-geometry`;
- `high-residual`;
- `low-confidence-tdoa`;
- `out-of-bounds`.

---

## 8. Future UI contract

**Owner: Rodchenko**

No UI is implemented in this sprint. Future UI should be able to render:

- pair-level TDOA direction hints as an azimuth or baseline indicator;
- localization hypotheses as map points in a known frame;
- uncertainty as an error ellipse or confidence halo;
- warnings and low-confidence states without hiding them.

UI text must not imply more precision than the contract provides. For example, use "estimated position" rather than "drone position" unless classification and localization gates both support that claim.

---

## 9. Acceptance checklist

**Owner: Vesnin**

- [ ] Stage 2 freeze remains explicit in docs.
- [ ] TDOA pair estimation and localization are separate layers.
- [ ] Units are explicit.
- [ ] Failure modes are part of the contract.
- [ ] Every sprint step has exactly one accountable owner.
- [ ] No runtime/client integration is added.
