# C5 — forensic migration legacy

> Зависимости: вердикты C2, C3 и C4.

## Неподвижные predecessors

- C1: immutable insight/mandate/slice revisions; closure assertion относится к exact scope.
- C2: D/L/O/V раздельны; archive не доказывает delivery/outcome; None не negative.
- C3: evidence только exact per-SLICE TargetClaim; hints не evidence; negative требует
  bounded affirmative basis; summaries не axes.
- C4: pinned BaseContext + append-only EventLog; correction через новые events;
  historical artifacts не rewrite/delete.

## Вопрос

**C5 — как детерминированно мигрировать legacy-связи в принятую модель и какие доказуемые состояния присвоить Hermes, Comms, Telegram и Persona, не переписывая исторические артефакты задним числом?**

## Требуемый единственный вердикт

- отдельный heading `ВЕРДИКТ C5`;
- deterministic migration algorithm: immutable scope reconstruction, link confidence,
  EvidenceCandidate classification, new BaseContext version/migration manifest/events;
- все forensic inputs pinned: repository tree/commit, BaseContext
  `contextId/schemaVersion/digest` и EventLog `tail seq/digest`; normalisation/order
  deterministic. Locking/revalidation mechanics остаются C7;
- `MigrationDisposition = verified|partial|unknown|disputed` и отдельный
  `manualReviewRequired: boolean` — migration diagnostics, не C2 axis/value/status.
  Ни disposition, ни confidence не создают D/L/O/V assertion; unsupported assessment
  остаётся `None`; никакой deduction из task archive;
- результат классификации Hermes, Comms, Telegram и Persona раздельно по D/L/O/V,
  closure scope и evidence gaps;
- судьба ложных архивов G/H/I;
- правила backlink backfill: exact historical task record не переписывать; новая typed
  relation/provenance в versioned BaseContext/manifest, mention/sprintPhase = hint.
  Новая BaseContext version содержит только typed identity/scope/relation backfill;
  D/L/O/V assessments/corrections пишутся только append events с manifest/provenance refs.
  Любой `Some(L/O)` требует exact C3 EvidenceNode того же TargetClaim;
  confidence/mention/sprintPhase сами по себе остаются hint;
- historical registry/meta/archive/INSIGHT/REVIEW не переписывать задним числом;
  correction текущего view только append events;
- фактически использованные sources и explicit uncertainty;
- не проектировать C6 CLI/enforcement/agent UX или C7 concurrency/transactions.
