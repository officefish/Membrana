# C7 — operational safety

> Зависимости: вердикты C2, C3 и C4.

## Неподвижные predecessors

- C2/C4: pinned versioned BaseContext + append-only EventLog; exact typed events,
  deterministic ReplayResult, no rewrite/delete after commit.
- C3: evidence refs opaque to C7; C7 обеспечивает запись/валидацию, не criteria.
- Reopen создаёт new revision/new ID/D=`proposed`; supersede event-only.

## Вопрос

**C7 — какие минимальные operational guards должны сделать lifecycle-переходы атомарными, идемпотентными и обратимыми при параллельных worktree, live PR, повторном запуске и частичном файловом сбое?**

## Требуемый единственный вердикт

- отдельный heading `ВЕРДИКТ C7`;
- concurrency/version precondition: pin BaseContext
  `(contextId, schemaVersion, digest)`, EventLog `(tailSeq, tailDigest)`, target
  repo/branch HEAD or tree digest и migration/command input digest; revalidate тот же
  набор immediately before apply и immediately before commit;
- transaction boundary для versioned BaseContext + EventLog + derived registry/meta/views;
- BaseContext new version + EventLog append — authoritative transaction;
  registry/meta/views/cache — non-authoritative rebuildable projections. Crash after
  authoritative commit означает roll-forward/rebuild projections, а не physical rollback
  committed events; до authoritative commit partial staged files удаляются или
  восстанавливаются journal recovery;
- prepare/apply/commit journal и deterministic crash recovery для многофайловой записи;
- idempotency key/event IDs/retry semantics и repeated-run validation;
- same idempotency key + same input возвращает recorded result без нового event;
  same key + different input — deterministic error; новый key проходит полную C4
  validation, поэтому repeated revoke не маскируется как harmless retry;
- repo-shared lock, overlapping worktree/live PR/unpushed-work guards и двукратная
  TOCTOU revalidation;
- различить physical rollback незакоммиченной partial transaction и append-only semantic
  correction/revoke после commit; reopen path;
- внешний GitHub/push side effect не включать в файловую atomic boundary: outbox/retry;
- stale lock/recovery/override provenance и deterministic failure modes;
- stale-lock override не обходит pinned-version, evidence/reference validation или
  live-work guard; он только освобождает доказанно orphaned lock с provenance;
- фактически использованные premises;
- не проектировать C6 agent UX/CLI/enforcement presentation или C5 legacy classification.
