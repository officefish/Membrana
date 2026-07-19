# C6 — единый agent workflow и enforcement

> Зависимости: вердикты C5 и C7; финальный сток DAG.

## Неподвижные predecessors

- C1–C2: closure assertion относится к exact immutable scope; D/L/O/V независимы;
  Task→Mandate relation не является delivery; V не выводится из coverage.
- C3: любой Some(L/O) требует exact EvidenceNode того же TargetClaim; task/archive/PR/
  mention сами по себе только candidates/hints.
- C4: pinned BaseContext + append-only EventLog; exact event union/payload; derived views
  rebuildable; correction/reopen не переписывают историю.
- C5: deterministic manifest migration; diagnostics не axis; legacy backfill only typed
  relations; Comms CC9 и Telegram operational smoke остаются L=None; O=None во всех
  audited candidates.
- C7: repo-shared lock, pinned OperationPlan, two TOCTOU revalidations, idempotent journal,
  pre-commit physical rollback, post-commit append correction, outbox for remote effects.

## Вопрос

**C6 — как замкнуть единый исполнимый workflow Cursor, Claude и Codex от insight-to-sprint до reconciliation и archive-view так, чтобы агенты не могли обойти принятые evidence и safety gates?**

## Требуемый единственный вердикт

- отдельный heading `ВЕРДИКТ C6`;
- канонический skill ownership для capture/research/review, insight→sprint,
  reconciliation/visibility/history и read-only overview; определить, обновляется ли
  существующий production `membrana-insight` или вводится новый узкий skill;
- exact mirror matrix Cursor/Claude/Codex/OpenCode: один канон без full-copy drift,
  корректные relative paths и автоматическая проверка resolvability/parity;
- executable workflow от принятого Mandate/SLICE через task transcription, Teamlead
  closure review exact SHA, C3 EvidenceCandidate classification, C7 transaction до
  derived archive/current view; task archive не создаёт L/O/V автоматически;
- exact CLI surface и семантика каждой команды: read-only/dry-run/execute, inputs,
  authority, events/projections, idempotency. Не сохранять ambiguous legacy
  `archive --task --result` как доказательство whole-insight completion;
- automatic hooks/CI: что блокируется, что только предупреждается, affected-path scope;
  ни hook, ни skill не создаёт lifecycle assertions по inference;
- read-only overview всех insights: красивый понятный тезисный список, D/L/O/V и evidence
  gaps без pseudo-summary axes, отдельный personal top-3 от первого лица и объективная
  рекомендация; archived не равно delivered/realized;
- одинаковые stop rules, human/owner authority и override limits: override не обходит
  C3 evidence, C4 replay или C7 safety; attribution/provenance вне exact event payload;
- machine + human audit output, deterministic failure codes и handoff между insight,
  task lifecycle, Teamlead closure review и insight reconciliation;
- implementation sprint boundary: какие existing prototype files переписать/удалить,
  one-time legacy migration, compatibility/deprecation policy и exact testable DoD;
- фактически использованные premises; не менять C1–C5/C7 contracts.
