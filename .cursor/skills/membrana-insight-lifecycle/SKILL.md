---
name: membrana-insight-lifecycle
description: >-
  Reconcile, inspect, correct, reopen, supersede, migrate, or change visibility of
  Membrana insights using exact D/L/O/V subjects, C3 evidence, append-only history and
  C7 safety. Use when the user asks which insights are truly implemented, to reconcile
  task results, archive/unarchive an insight representation, inspect history, correct an
  assertion, reopen/supersede a revision, or migrate legacy insight links. Do NOT use for
  idea capture/research/review (membrana-insight), sprint transcription
  (membrana-insight-to-sprint), or task archive (membrana-task-lifecycle).
---

# Membrana insight lifecycle

Канон агента: [`INSIGHT_LIFECYCLE_FOR_AGENTS.md`](../../../docs/prompts/INSIGHT_LIFECYCLE_FOR_AGENTS.md) ·
active verdicts [`C1–C7`](../../../docs/meeting/insight-archive-lifecycle/) ·
артефакты: [`INSIGHT_REGULATION.md`](../../../docs/prompts/INSIGHT_REGULATION.md).

## Неподвижные правила

- Всегда назвать exact subject/scope. Голое «инсайт закрыт» запрещено.
- D — Mandate/revision; L/O — Slice; V — representation. `None` не negative.
- Task archive, PR/branch, mention, sprintPhase, `insightId` и Task→Mandate — hints/
  relations, но не L/O evidence.
- Some(L/O) требует exact C3 EvidenceNode того же TargetClaim.
- V выбирается отдельно и ничего не доказывает о D/L/O.
- Routine reconcile не создаёт Revoke. Correction — отдельный exact request.
- Mutating commands default dry-run; `--execute` не обходит replay/evidence/C7.

## Workflow

1. `yarn insight status <id> --json` — replay exact state/history/gaps.
2. Для task result: подготовить request с requestKey, authority, Slice TargetClaims,
   EvidenceCandidates и pinned refs; `yarn insight reconcile <id> --request <file>`.
3. Проверить human report: scope; D/L/O/V; evidence/hints/invalid/None; safety; no-inference.
4. Execute только после appropriate authority и всех PASS gates.
5. Visibility отдельно:
   `yarn insight visibility <representation> --set active|archived --reason "…" --request-key <key> --authority <ref>`.
6. Conflict/different current value → `correct`; новая revision → `reopen`; relation между
   решениями → `supersede`. Historical artifacts/events не rewrite.

## Hard stop

Не писать при stale/unpinned inputs, missing/wrong refs, отсутствии exact L/O evidence,
Conflict/ReplayError, live overlap, dirty target, lock/idempotency/hash conflict,
unavailable mandatory remote state или disputed migration. Override не превращает hint в
evidence и не снимает safety gates.

## Deprecated

- `insight archive --task --result` → hard error; L/O делает `reconcile`, V — `visibility`.
- `insight close --status adopted` → hard error; D делает exact `decide`.

## Output

Только понятный тезисный список: итог/режим → exact scope → D/L/O/V отдельно → proofs/
hints/invalid/None → safety/projection diff → что не выведено → следующий handoff.

