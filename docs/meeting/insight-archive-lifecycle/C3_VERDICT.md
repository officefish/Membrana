# ВЕРДИКТ C3

> Режим: ручной председательский resolution по указанию владельца после недоступности
> Anthropic. Основания: `C1_VERDICT.md`, `C2_VERDICT.md`, `C3_TOPIC.md`,
> `C3_REPAIR2_TOPIC.md`, `C3_AUDIT.md`.  
> Статус: active; independent read-only audit PASS.

## Exact TargetClaim

```text
TargetClaim =
  | { axis: L, subject: SliceRef, assertedValue: delivered | not-delivered }
  | { axis: O, subject: SliceRef, assertedValue: realized | not-realized }
```

- `None` не входит в `TargetClaim`: это отсутствие assertion, а не значение.
- Один evidence-документ поддерживает ровно один exact `TargetClaim`.

## Typed context и edges

`LinkedSliceContext` содержит `insightRevisionRef`, `mandateRef`, `sliceRef` и опциональный
`representationRef`. Для него обязательны predicates:

- `mandate belongs-to insightRevision`;
- `slice in-scope-of mandate`;
- если дан `representationRef`, representation представляет exact subject/scope.

Typed edges:

- `EvidenceNode supports TargetClaim`;
- `TargetClaim about SLICE`;
- `SLICE in-scope-of MANDATE`;
- `MANDATE belongs-to insightRevision`;
- `EvidenceNode projects-through LinkedSliceContext`;
- `EvidenceNode from canonical originRef`.

## Candidate, classification и EvidenceNode

Core `EvidenceCandidate`:

```text
{
  candidateId,
  targetClaim,
  linkedSliceContext,
  originRef,
  digest?,
  predicateId,
  predicateVersion,
  basis
}
```

`classify(candidate) → evidence | hint | invalid`:

- `evidence`: exact target, linked immutable context и обязательный typed basis полностью
  подтверждают то же asserted value;
- `hint`: релевантный сигнал, но basis недостаточен или граница наблюдения не замкнута;
- `invalid`: malformed/unlinked target, попытка доказать `None`, несовпадение basis и value,
  cross-axis/visibility inference либо hint, выданный за доказательство.

`EvidenceNode` — только candidate, классифицированный как `evidence`. Hint и invalid
остаются кандидатами/диагностикой, но не являются `EvidenceNode` и не входят в proof count.

Cardinality: один `TargetClaim` имеет `0..N` EvidenceNode; каждый EvidenceNode поддерживает
ровно один TargetClaim.

## Basis по четырём exact values

| Exact value | Обязательный conditional basis |
|---|---|
| `L=delivered` | Named/versioned acceptance rule и affirmative delivery/acceptance result для exact SLICE |
| `L=not-delivered` | Explicit refusal, cancellation или failure, проверенный относительно declared acceptance rule либо acceptance window |
| `O=realized` | Named/versioned criteria фактически выполнены; result=true внутри declared observation window |
| `O=not-realized` | Named/versioned criteria фактически выполнены; result=false внутри declared observation window |

Простое отсутствие, «не нашли» или timeout без declared rule/window — hint либо invalid,
никогда не negative evidence.

## Provenance, dedup и correlation

- `originRef` обязателен и является canonical provenance identity; `digest` опционален и
  служит integrity/content identity, но не заменяет `originRef`.
- Dedup key внутри одного exact target:
  `(canonicalTargetClaim, originRef, predicateId, predicateVersion)`.
- Повтор того же proof не invalid, но не увеличивает `uniqueEvidenceCount` этого target.
- Один origin может поддерживать разные TargetClaim — они не схлопываются.
- Разные dedup keys означают уникальные proofs, но не автоматически независимые.
  Independence/weight допустимы только при отдельном explicit correlation/lineage rule;
  counts разных claims не агрегируются.

## Orthogonal matrix cell

```text
EvidenceCell = {
  assessment: None | Some(exactValue),
  proofs: {
    evidenceNodes: 0..N,
    hints: 0..N,
    invalid: 0..N
  }
}
```

- Negative — exact axis value (`not-delivered`/`not-realized`), не proof class.
- Verified assessment требует `Some(value)` и минимум один EvidenceNode для того же exact
  TargetClaim.
- Для `assessment=None` TargetClaim отсутствует; candidate, пытающийся доказать None, invalid.

## Scenario matrix

| Сценарий | L | O | Derived summary / completeness |
|---|---|---|---|
| Single task | Task транскрибирует MANDATE с `1..N` SLICE; отдельная L-cell на каждый SLICE | Отдельная O-cell на каждый SLICE | Никакого task-level axis value |
| Epic + child graph | Per-SLICE L cells по полному immutable scope всех linked children | Per-SLICE O cells независимо от L | Отдельные `EpicDeliverySummary` и `EpicOutcomeSummary`; это derived tokens, не axes/targets |
| Deploy gate | `L=delivered` устанавливается только после evidence выполнения declared delivery acceptance rule/gate | O остаётся `None`, пока нет отдельного exact O evidence; затем `realized` либо `not-realized` | L никогда автоматически не устанавливает O |
| Partial | Часть SLICE имеет verified L, остальные L=`None` или иной exact value | O считается отдельно per-SLICE и может иметь другой профиль | Summary отражает counts, не создаёт `partial` в L/O enum |
| Non-delivery | `L=not-delivered` только с bounded affirmative basis | O не выводится из non-delivery и требует отдельного exact O evidence, если assertion существует | Mere absence даёт unknown/incomplete, не negative |

Derived summary каждой оси содержит counts по immutable scope: total slices, verified positive,
verified negative, `None`, unverified. Missing link или required Slice=`None` делает
completeness `unknown/incomplete`. Summary не является C2 assessment и не evidence target.

## Явно не evidence L/O само по себе

- task status или task archive;
- branch/PR existence;
- `transcribed` relation;
- V=`archived`;
- незамкнутый parent/epic;
- timeout или отсутствие находки без declared acceptance/observation boundary.

Такие сигналы классифицируются как hint либо invalid inference в зависимости от того,
предъявляются ли они как доказательство.

## Premises и open-map

| Источник | Использовано |
|---|---|
| C1_VERDICT | Immutable insight/mandate/slice subject и scope; Task→Mandate; L/O разделены |
| C2_VERDICT | Exact L/O enums; None semantics; linked contexts; full no-inference |
| C3_TOPIC / repairs | Пять scenarios, evidence/hint/invalid, completeness, bounded negative и provenance rules |
| M0 / DEPS | C3 не решает history, migration, enforcement или safety |

Открыты: C4 history/storage; C5 legacy; C6 UX/enforcement/implementation/tests/UI;
C7 operational safety/concurrency/idempotency/atomicity/recovery.

## Contract-level DoD

- Exact TargetClaim, context/edges, Candidate→classification→EvidenceNode заданы без
  противоречий.
- Assessment/None/proof classes ортогональны.
- Все четыре values имеют собственный typed basis.
- Все пять scenarios сохраняют per-SLICE L/O и no-inference.
- Dedup scoped exact target; independence не выводится из уникальности.
- C4–C7 не спроектированы.
