# C3R2 — exact TargetClaim, candidate classification и orthogonal matrix

> Общее задание: `MEETING_BRIEF.md`.
> Активные predecessors: `C1_VERDICT.md`, `C2_VERDICT.md`.
> Два BLOCK: `C3_AUDIT.md`.
> Это второй repair того же C3, не новый DAG-узел.

## Вопрос

**C3 — как окончательно замкнуть TargetClaim, candidate/evidence types, typed edges,
scenario matrix и axis-specific basis без смешения assessment, absence и proof class?**

## Обязательные исправления

1. Exact discriminated union:
   - `{axis:'L', subject:SliceRef, assertedValue:'delivered'|'not-delivered'}`;
   - `{axis:'O', subject:SliceRef, assertedValue:'realized'|'not-realized'}`.
   `None` не TargetClaim и evidence для None запрещён.
2. Одна консистентная модель:
   - `EvidenceCandidate` проходит `classify(candidate) → evidence|hint|invalid`;
   - `EvidenceNode` — только candidate, принятый как `evidence`.
   Hint/invalid не являются EvidenceNode и не входят в proof count.
3. Typed immutable refs/edges обязаны связать target с C1/C2:
   `EvidenceNode supports TargetClaim`; TargetClaim `about` SLICE;
   SLICE `in-scope-of` MANDATE; MANDATE `belongs-to` insightRevision;
   EvidenceNode `from` canonical originRef и `projects-through` linked C2 context.
4. Matrix cell ортогональна:
   - `assessment: None | Some(exactValue)`;
   - `proofs: {evidenceNodes:0..N, hints:0..N, invalid:0..N}`.
   Negative — exact axis value, не proof class. Verified assessment требует Some(value)
   и accepted evidence для того же exact TargetClaim.
5. Вернуть пять rows: single task (1..N slices), epic+child graph, deploy gate,
   partial per-slice, non-delivery. Отдельные `EpicDeliverySummary` и
   `EpicOutcomeSummary` — derived tokens, не C2 axes/targets; полнота по immutable scope.
6. Provenance/dedup: обязательный canonical `originRef`; digest только integrity.
   Dedup key `(canonicalTargetClaim, originRef, predicateId, predicateVersion)`.
   Duplicate same proof не invalid, но uniqueEvidenceCount для одного target не растёт.
   Не называть distinct keys независимыми без explicit correlation/lineage rule и не
   агрегировать counts между claims.
7. Axis-specific negative basis:
   - L=`not-delivered`: explicit refusal/cancellation/failure, проверенный относительно
     declared acceptance rule или acceptance window;
   - O=`not-realized`: named/versioned criteria реально выполнены с false-result внутри
     declared observation window.
   Mere absence/timeout без declared rule/window = hint/invalid.
8. Mandatory core candidate fields и conditional basis fields задать отдельно для
   `delivered`, `not-delivered`, `realized`, `not-realized`; evidence criteria не оставлять
   одним generic «predicate verifiable».
9. Explicit non-evidence list сохранить: task status/archive, branch/PR existence,
   `transcribed`, V=`archived`, unfinished parent — hint либо invalid сами по себе.
10. Sources/open-map/contract-only DoD сохранить; C4–C7 не решать.

## Требуемый единственный вердикт

- отдельный heading `ВЕРДИКТ C3`;
- exact type/edges/cardinality/provenance/classification/basis tables;
- orthogonal cell и все пять scenarios с отдельными L/O summaries;
- premises/open-map без C4–C7 решений.
