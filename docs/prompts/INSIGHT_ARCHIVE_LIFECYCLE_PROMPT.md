# Промпт: доказуемый жизненный цикл Membrana Insight

> **Task-промпт для агента-разработчика.** Процесс:
> [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md). Размер: **L**.  
> Реестр: `insight-archive-lifecycle`. GitHub Issue #609, draft PR #612.  
> Формат investigation → external research → meeting завершён; implementation разрешён
> только по active verdicts C1–C7.

## Источники решения

- расследование: [`insight-lifecycle-investigation-2026-07-18.md`](../discussions/insight-lifecycle-investigation-2026-07-18.md);
- external research: [`insight-archive-lifecycle.md`](../tasks/research/insight-archive-lifecycle.md);
- M0/DAG: [`MEETING_BRIEF.md`](../meeting/insight-archive-lifecycle/MEETING_BRIEF.md),
  [`DEPS.json`](../meeting/insight-archive-lifecycle/DEPS.json);
- канонические PASS-вердикты:
  [`C1`](../meeting/insight-archive-lifecycle/C1_VERDICT.md),
  [`C2`](../meeting/insight-archive-lifecycle/C2_VERDICT.md),
  [`C3`](../meeting/insight-archive-lifecycle/C3_VERDICT.md),
  [`C4`](../meeting/insight-archive-lifecycle/C4_VERDICT.md),
  [`C5`](../meeting/insight-archive-lifecycle/C5_VERDICT.md),
  [`C6`](../meeting/insight-archive-lifecycle/C6_VERDICT.md),
  [`C7`](../meeting/insight-archive-lifecycle/C7_VERDICT.md).

При расхождении этого prompt с verdict побеждает соответствующий verdict. Менять contracts
C1–C7 без нового заседания запрещено.

## Промпт целиком

### Цель

Заменить draft-прототип `archive --task --result` на доказуемый, replayable и обратимый
lifecycle, одинаково исполнимый Cursor, Claude, Codex и OpenCode:

```text
pre-decision artifacts → immutable Mandate/Slices → D decision
→ Task→Mandate transcription → task work/closure candidates
→ C3 reconciliation → append-only D/L/O/V history
→ rebuildable current/archive views
```

### Неподвижные инварианты

- Exact axes: D на Mandate/revision, L/O на Slice, V на representation.
- `None` вне enum; `Conflict` — derived diagnostic; silent winner запрещён.
- `V ⇏ D/L/O` и `D/L/O ⇏ V`.
- Task archive, PR/branch, mention, `sprintPhase`, `transcribed` сами по себе не evidence.
- Some(L/O) требует exact C3 EvidenceNode того же TargetClaim.
- Historical artifacts и committed events не rewrite/delete.
- BaseContext + EventLog authoritative; views/cache rebuildable.
- Только typed Task→Mandate relation. Slice refs — scoped request context, не новая relation.
- Reopen создаёт fresh revision/ID и D=proposed; Supersede — event-only link.

### Implementation phases

#### I1 — contracts, replay и evidence

- Pure modules для BaseContext/EventEnvelope/replay/current `None|Some|Conflict`.
- Exact C3 candidate classification, bases, provenance/dedup и summaries.
- Versioned lifecycle store; sealed legacy registry/meta не authority.
- Separate rebuildable lifecycle views.

#### I2 — CLI и safety

Реализовать exact C6 CLI: `status`, `overview`, `verify`, `decide`, `reconcile`,
`visibility`, `correct`, `reopen`, `supersede`, `migrate-legacy`.

- Все lifecycle transitions default dry-run и требуют caller requestKey/authority.
- `archive --task --result` и `close --status adopted` — hard deprecation без writes.
- State-aware no-op/transition rules не создают duplicate Conflict.
- C7 OperationPlan, repo-shared lock, journal, crash recovery, idempotency и outbox.
- Routine reconcile никогда сам не создаёт Revoke.

#### I3 — migration, agents и enforcement

- C5 deterministic legacy migration с independent-audited manifest.
- Expected facts: Hermes accepted scope/L delivered/O None/V archived; Comms CC1–CC8
  delivered, CC9 None; Telegram software delivered, operational smoke None; Persona phases
  1/1.5 delivered and O None; G/H/I D accepted, L/O None, V active.
- Четыре canonical `.cursor` skills, thin mirrors для Claude/Codex/OpenCode.
- Read-only overview: все insights тезисами, D/L/O/V/gaps, first-person personal top-3,
  deterministic objective candidate.
- `insight:verify`, versioned affected dependency manifest, pre-push/CI integration.
- `insight:drift` становится thin compatibility adapter к verify library без старых
  mention/archive inference.

### Authority и stop rules

Следовать exact C6 authority matrix и C7 override limits. Hard stop без writes при stale/
unpinned input, wrong refs, missing exact evidence, Conflict/ReplayError, live overlap,
dirty target, lock/idempotency/hash conflict или disputed migration. Remote-unavailable
override допускает только pinned owner-attributed snapshot и не скрывает обнаруженный
overlap.

### Agent output

Любой human report — понятный тезисный список:

1. итог/режим;
2. exact scope;
3. отдельно D, L, O, V;
4. evidence/hints/invalid/None;
5. safety/projection diff;
6. что не было выведено автоматически;
7. следующий handoff.

Обзор всегда перечисляет все insights и завершает блоками `Мой top-3` и
`Объективный кандидат` по C6.

### Запрещено

- Мутировать старые registry/meta как источник истины.
- Автоматически выбирать V по delivery/roadmap.
- Называть весь insight delivered по одной задаче/фазе.
- Делать negative assertion из отсутствия результата.
- Расширять exact C4 event payload provenance-полями.
- Копировать full skill bodies в mirrors.
- Прятать bypass в hook skip, compatibility alias или owner override.
- Вводить DB/CQRS/event bus/UI dashboard.

## Definition of Done

Полный DoD находится в [`C6_VERDICT.md`](../meeting/insight-archive-lifecycle/C6_VERDICT.md#exact-testable-dod)
и обязателен целиком. Дополнительно:

- все meeting child tasks C1–C7 archived с PASS audit artifacts;
- implementation diff не содержит прежнего solution-first archive semantics;
- targeted tests + relevant lint/typecheck + `git diff --check` green;
- Teamlead closure review на exact SHA — LGTM;
- только после review/commit/push архивировать parent task по
  [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md).

## Out of scope

- UI, remote deploy и изменение GitHub/Linear business semantics;
- inferred product outcomes;
- удаление historical insight/task artifacts;
- изменение C1–C7 без нового ratified meeting.

