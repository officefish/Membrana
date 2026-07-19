# ВЕРДИКТ C6

> Режим: ручной председательский resolution по указанию владельца после недоступности
> Anthropic. Основания: C1–C5/C7 active verdicts, `C6_TOPIC.md` и аудит реальных
> Cursor/Claude/Codex/OpenCode skill/CLI surfaces.  
> Статус: active; independent read-only audit PASS.

## Ownership: четыре узких skill, один канон

Канонические project playbooks находятся только в `.cursor/skills/`:

| Skill | Единственная ответственность |
|---|---|
| `membrana-insight` | capture → research → review → exact decision над immutable Mandate revision; не reconciliation/archive |
| `membrana-insight-to-sprint` | accepted Mandate → exact typed Task→Mandate transcription; declared Slice scope остаётся validated request context, не relation и не delivery assertion |
| `membrana-insight-lifecycle` **(новый)** | status/history, reconciliation C3→C4, explicit visibility, correction/reopen, safe legacy migration |
| `membrana-insight-overview` | read-only обзор всех insights, evidence gaps, personal top-3 и отдельный objective candidate |

Новый узкий lifecycle skill обязателен: существующий production `membrana-insight`
слишком широк и сейчас смешивает create/review с ложным
`archive --task --result`. Архивный workflow из него удаляется и заменяется handoff на
`membrana-insight-lifecycle`.

## Mirror matrix

| Surface | Форма |
|---|---|
| Cursor | canonical full `SKILL.md` в `.cursor/skills/<name>/` |
| Claude | thin mirror `.claude/skills/<name>/SKILL.md` с тем же name/description и delegate `../../../.cursor/skills/<name>/SKILL.md` |
| Codex | thin mirror `.agents/skills/<name>/SKILL.md` с тем же name/description и тем же корректным delegate |
| OpenCode | thin mirror `.opencode/skills/<name>/SKILL.md` с тем же name/description и тем же корректным delegate |

- Full copies вне `.cursor` запрещены: они создают drift.
- Mirror test разрешает path относительно директории mirror, проверяет существование,
  exact canonical target, frontmatter name/description parity и отсутствие второго
  workflow body.
- Исправляются известные дефекты: Claude `insight-to-sprint` использует неверный `../../`;
  Codex не имеет `insight-to-sprint`; OpenCode содержит stale full copies.
- README/catalog surfaces генерируются/проверяются; ручной список не считается parity
  proof.

## Исполнимый workflow

1. `membrana-insight`: create/list/research/review работают с pre-decision artifacts и не
   являются lifecycle truth. `insight decide ... accepted|rejected|deferred` атомарно
   фиксирует immutable reviewed Mandate/Slice scope в новой BaseContext version и создаёт
   только exact D assertion после authority gate. D=`proposed` создаётся C4 Reopen для
   новой revision. Legacy label `adopted` — derived presentation для D=`accepted`, не C2
   value.
2. `membrana-insight-to-sprint`: для D=`accepted` создаёт только каноническую typed
   Task→Mandate relation в новой BaseContext version. `task.insightId` остаётся navigation
   projection; для новой задачи обязателен exact `mandateId`. Declared Slice refs могут
   находиться в scoped task request как проверяемое подмножество Mandate scope, но не
   становятся новой lifecycle relation. Historical INSIGHT/REVIEW для backlink не
   редактируются.
3. `membrana-task-lifecycle`: task выполняется и архивируется по своему регламенту.
   Task archive, branch/PR/merge или `transcribed` не создают L/O/V.
4. `membrana-task-closure-review`: Teamlead LGTM/BLOCK exact SHA создаёт versioned
   EvidenceCandidates/acceptance results для linked slices; это ещё не EvidenceNode.
5. `membrana-insight-lifecycle reconcile`: классифицирует candidates по C3, формирует
   OperationPlan и только exact AssertL/AssertO для current=None. Только `evidence`
   становится node; unsupported cells остаются None. Если current уже Some другого value
   или требует отзыва, routine reconcile останавливается и передаёт управление explicit
   `correct` request. Absence/reclassification candidate никогда не создаёт Revoke.
6. C7 executor под repo-shared lock применяет BaseContext+EventLog transaction, затем
   rebuild projections; remote report/push идёт через outbox.
7. Visibility меняется только отдельной explicit V command/authority. Она не является
   шагом «если все slices delivered» и не меняет D/L/O.
8. Overview/history читают replayed views; не сканируют notes/sprintPhase/branch как
   lifecycle truth.

## Exact CLI surface

Все lifecycle-transition команды ниже default dry-run. `--execute` не ослабляет
validation. Capture/research artifact commands сохраняют свой отдельный documented режим.

| Команда | Режим и контракт |
|---|---|
| `yarn insight status <id> [--json]` | read-only replay: exact revisions/mandates/slices, D/L/O/V, history, proof/hint/invalid counts, conflicts |
| `yarn insight overview [--json]` | read-only полный dataset для тезисного agent output; без personal opinion внутри machine JSON |
| `yarn insight verify [<id>] [--json]` | read-only schema/ref/replay/projection/mirror validation; CI exit code |
| `yarn insight decide <mandate-id> --set accepted\|rejected\|deferred --request-key <key> --authority <ref> [--execute]` | state-aware D transition: current=None → AssertD; current=proposed → одна C7 operation Revoke(old)+AssertD(new); same value → no-op; иной current → `DECISION_CORRECTION_REQUIRED`. Teamlead/owner authority; другие axes не меняет |
| `yarn insight reconcile <id> --request <file> [--execute]` | request содержит caller `requestKey`, actor/authority refs, exact subjects, TargetClaims и EvidenceCandidates; только current=None → AssertL/O. Current same value = recorded no-op; current different/conflict = `CORRECTION_REQUIRED`. Execute требует appropriate typed authority artifact и C3/C4/C7 PASS |
| `yarn insight visibility <representation-id> --set active\|archived --reason "…" --request-key <key> --authority <ref> [--execute]` | при V=None — AssertV; при том же current value — no-op; active↔archived — одна C7 operation с exact Revoke(old V assertion)+AssertV(new). Explicit owner authority; reason/actor только manifest |
| `yarn insight correct <assertion-id> --request <file> [--execute]` | request содержит requestKey/actor/authority; explicit atomic Revoke+Assert*. targetAssertionId обязателен. D требует Teamlead/owner decision; L/O — appropriate typed authority и новый exact C3 EvidenceNode для нового Some; V — owner navigation authority |
| `yarn insight reopen <revision-id> --reason "…" --request-key <key> --authority <ref> [--execute]` | owner authority; exact C4 Reopen, fresh revision/ID, D=proposed, no transcription copy |
| `yarn insight supersede <old-decision-assertion-id> --successor <revision-id> --reason "…" --request-key <key> --authority <ref> [--execute]` | owner authority; exact C4 Supersede event-only link. Successor revision должен существовать; old D остаётся current для old subject, V не меняется |
| `yarn insight migrate-legacy --request <file> [--execute]` | C5 manifest; verified/partial deterministic batch требует independent audit PASS; disputed требует отдельный owner-attributed manual-resolution manifest. Обе ветви проходят C3/C4/C7 |

Сохранённая artifact surface явно ограничена:

- `insight create <slug> --title ...` — после cutover создаёт новый pre-decision
  INSIGHT + draft metadata в candidate artifact path, не пишет sealed legacy
  registry/meta и не создаёт D;
- `insight list` — read-only список artifact records, не current lifecycle view;
- `insight research <id>` — обновляет только unfrozen candidate RESEARCH artifact, не
  исторический frozen record и не D/L/O/V;
- `insight review <id>` — обновляет unfrozen candidate REVIEW artifact и deterministic DecisionRequest с fresh
  candidate `revisionId/mandateId/sliceIds` + content digests; это ещё не BaseContext/
  lifecycle truth. `decide <mandate-id>` потребляет pinned reviewed request, проверяет
  freshness и только тогда атомарно фиксирует immutable scope + D event;
- для lifecycle truth используются `status/overview/verify`, не legacy `list/status` fields.

Compatibility policy:

- `yarn insight archive <id> --task ... --result ...` становится non-mutating hard
  deprecation error `DEPRECATED_AMBIGUOUS_ARCHIVE` с указанием двух раздельных путей:
  `reconcile` для L/O и `visibility --set archived` для V.
- `yarn insight close <id> --status adopted|...` становится non-mutating deprecation
  `DEPRECATED_AMBIGUOUS_CLOSE`; canonical replacement — exact `insight decide`. Legacy
  `adopted` отображается как D=`accepted`, но не записывается в event payload.
- Никакой alias не интерпретирует `--task`, `--result`, task archive или exact backlink
  как whole-insight delivery/outcome.
- `insight decide` принимает только C2 D values и не меняет V/L/O.

Request-file commands (`reconcile`, `correct`, `migrate-legacy`) получают caller-provided
stable `requestKey`, `actorRef` и `authorityRef` из schema-validated request. Direct
mutating commands требуют exact flags `--request-key` и `--authority`; actor берётся из
authenticated local operator context и pin-ится в manifest. Request/manifest содержит
exact refs, intended assertions и provenance.
Event payload остаётся exact C4 union. Повторный key/digest следует C7 idempotency.

## Hooks и CI

`yarn insight:verify` — единый deterministic check вокруг `insight verify`.

- pre-push читает updates из stdin (`localRef localSha remoteRef remoteSha`) и для каждого
  не-delete push вычисляет changed paths как `git diff --name-only remoteSha..localSha`;
  для zero/new remote SHA использует merge-base с `origin/main`, а если он недоступен —
  fail-closed full verify. Любая ошибка range/path parsing также запускает full verify;
- affected matcher генерируется из versioned dependency manifest
  `scripts/config/insight-verify-affected.json`, который минимум покрывает:
  - `docs/insights/**`, `docs/reviews/**`, `docs/schemas/task-closure-review.schema.json`,
    `docs/tasks/registry.json`, `docs/tasks/archive/**`;
  - `docs/prompts/INSIGHT*.md`, `docs/prompts/TASK_CLOSURE_REGULATION.md`,
    `docs/prompts/TASK_PROMPT_WORKFLOW.md`;
  - `scripts/insight*.mjs`, `scripts/lib/insight*.mjs`, `scripts/archive-task.mjs`,
    `scripts/task-closure-review*.mjs`, `scripts/lib/task-closure-review*.mjs`,
    `scripts/task-review-ship*.mjs`, `scripts/task-register*.mjs`,
    `scripts/tooling-overview*.mjs`, `scripts/lib/tooling-overview*.mjs`;
  - `package.json`, `.githooks/pre-push`, `.cursor/skills/README.md` и все
    `.cursor|.claude|.agents|.opencode/skills/membrana-insight*`,
    `membrana-task-closure-review*`, `membrana-task-lifecycle*` paths;
- хотя бы один match запускает full `insight:verify`; отсутствие match пропускает только
  этот check, не другие pre-push checks;
- CI запускает full verify и contract/migration/fault-injection tests;
- task registration блокирует новую insight-linked задачу без resolvable exact
  `mandateId`; declared Slice refs в task request валидируются как subset этого Mandate,
  но не записываются как новая BaseContext relation. Legacy record только предупреждается
  до migration manifest;
- task archive/Teamlead closure report печатает reconciliation handoff для linked slices,
  но не блокирует независимое task closure из-за L/O=None;
- projection drift, broken mirror, malformed schema, duplicate/freshness/ref violation,
  ReplayError или committed hash mismatch блокируют;
- evidence gap, hint, L/O=None, V=archived и незавершённый roadmap сами по себе не CI
  failure; они выводятся как diagnostics;
- hooks/checks read-only: они не создают relations, evidence, events или V transitions.

Network/live-work/lock checks выполняются mutating executor под C7, а не имитируются
простым pre-push grep.

Existing `SKIP_PREPUSH=1` может пропустить локальный hook по общему repo policy, но не
mandatory CI, server protection или C7 executor validation. Hook fixtures покрывают
ordinary range, multiple refs, new branch, deleted ref, matcher hit/miss и range-error
full-verify fallback. Dependency-manifest fixture отдельно доказывает hit для каждого
producer/consumer class выше, включая closure review, task registration и tooling overview.

## Authority, stop rules и overrides

| Действие | Authority |
|---|---|
| D accepted/rejected/deferred | recorded Teamlead/owner decision над exact Mandate revision |
| L/O reconciliation execute | appropriate recorded typed authority artifact + C3 EvidenceNode + C7 plan. Delivered обычно использует LGTM exact SHA; not-delivered — BLOCK/refusal/cancellation/failure record; O — named criteria-run result/observation review. Authority artifact сам не выводит value |
| V active/archived | explicit owner navigation decision; agent может только предложить/dry-run |
| D correction | recorded Teamlead/owner decision; exact old D assertion |
| L/O correction | appropriate typed authority artifact + new exact C3 EvidenceNode; exact old assertion |
| V correction | explicit owner navigation decision; exact old V assertion |
| Reopen/Supersede/disputed legacy mapping | explicit owner decision с operation provenance |
| Verified/partial legacy batch | independent migration audit PASS + normal executor authority |
| Read-only status/overview/verify | любой агент |

Hard stop без writes: unpinned/changed inputs, missing/wrong typed refs, absent exact
evidence для requested L/O Some, Conflict/ReplayError, live scope/worktree/PR overlap,
dirty target path, unproven orphan lock, idempotency mismatch, unexpected file hash,
unavailable mandatory remote state, disputed migration identity/scope.

Override может выбрать V, подтвердить manual identity mapping новым manifest или освободить
доказанно orphaned lock. При недоступности обязательного remote read отдельный explicit
owner override может подставить только pinned owner-attributed snapshot по C7; он не
отменяет обнаруженный live-work overlap и не разрешает непроверенный moving input.
Override не может превратить hint в EvidenceNode, доказать None,
обойти replay, изменить committed event, отменить live-work conflict или снять pinned-token
check. Actor/reason/source refs живут в operation/manifest ledger, не расширяют events.

## Human и machine audit output

Каждая команда возвращает stable JSON envelope:

```text
{ ok, mode, operationId?, inputDigests, subjects, proposedEvents,
  assessments, evidenceSummary, diagnostics, safety, projectionDiff,
  outbox?, failure? }
```

`failure.code` берётся только из versioned closed registry:

- request/authority: `INVALID_ARGUMENT`, `UNKNOWN_INSIGHT`, `UNKNOWN_SUBJECT`,
  `REQUEST_SCHEMA_INVALID`, `AUTHORITY_REQUIRED`, `CORRECTION_REQUIRED`,
  `DECISION_CORRECTION_REQUIRED`, `LEGACY_DISPUTED`;
- contract/view: `BASE_CONTEXT_INVALID`, `EVENT_LOG_INVALID`, `EVIDENCE_MISSING`,
  `CURRENT_ASSERTION_CONFLICT`, `PROJECTION_DRIFT`, `MIRROR_INVALID`;
- compatibility: `DEPRECATED_AMBIGUOUS_ARCHIVE`, `DEPRECATED_AMBIGUOUS_CLOSE`;
- verification: `DRY_RUN_WRITE_DETECTED`, C4 exact ReplayError codes;
- mutation safety: exact C7 codes `LOCKED`, `STALE_PRECONDITION`,
  `LIVE_WORK_CONFLICT`, `REMOTE_STATE_UNAVAILABLE`, `IDEMPOTENCY_KEY_REUSED`,
  `INVALID_EVIDENCE_REF`, `REPLAY_ERROR`, `STAGE_HASH_MISMATCH`,
  `BLOCKED_EXTERNAL_MUTATION`, `BLOCKED_CORRUPTION`, `ORPHAN_LOCK_UNPROVEN`,
  `OUTBOX_RETRYABLE`, `OUTBOX_TERMINAL`.

Unknown internal exception маппится в `INTERNAL_ERROR` с safe diagnostic ref; новые public
codes требуют schema-version change и contract test, произвольные message-as-code запрещены.

Human output обязателен как понятный тезисный список:

1. итог (`READ-ONLY`, `DRY-RUN`, `COMMITTED`, `BLOCKED`);
2. exact scope и отдельно D, L, O, V;
3. proofs / hints / invalid / None gaps;
4. safety checks и changed projections;
5. что не было выведено автоматически;
6. следующий допустимый handoff.

Слово «закрыт» без exact subject/scope запрещено. `archived`, `delivered`, `realized`,
`accepted` никогда не используются как синонимы.

## Overview: все insights и personal top-3

Machine overview читает только pinned replay/current views и linked task relations.
Notes, `sprintPhase`, branch/PR и task archive показываются как hints/live-work context,
не как D/L/O evidence.

Agent output имеет фиксированный порядок:

1. короткий снимок counts/conflicts;
2. **все** insights по V-группам `active | archived | unclassified | conflict`;
3. один компактный тезис на insight:
   `Название / id — человеческая суть; D; L coverage; O coverage; V; evidence gap/next action`;
4. `Мой top-3` — три first-person выбора с личной причиной и честной readiness;
5. `Объективный кандидат` — deterministic policy ниже.

V filter — явная navigation policy, не утверждение, что archived delivered/realized.
Personal top-3 — мнение, не lifecycle event и не разрешение стартовать sprint. Нельзя
терять остальные insights, выдавать task archive за delivery или скрывать None.

Objective eligible set по умолчанию:

- representation current V=`active` либо V=None/unclassified; V=`archived` исключается
  только navigation policy, не потому что считается delivered;
- exact Mandate current D=`accepted`;
- есть хотя бы один Slice с L=None и без active Task→Mandate transcription, чей declared
  scoped request покрывает этот Slice;
- Slice с L=`delivered` исключён; L=`not-delivered` требует отдельного owner retry/new-
  revision решения и автоматически не eligible;
- нет Conflict, overlapping active task/worktree/live PR или C7 live-work block.

`priorityWeight: number|null` — advisory metadata Mandate, не D/L/O/V/evidence. Для новых
mandates она pin-ится в DecisionRequest из reviewed score (finite 0..10); для legacy — из
pinned C5 source, а конфликт/отсутствие даёт `null` + diagnostic, не guessed value.
Stable ordering eligible mandates: `priorityWeight` descending (`null` после чисел), затем
decision event `seq` descending, затем `mandateId` by Unicode code-point ascending.
Winner — первый. Hints не меняют readiness/rank; они показываются рядом.

Personal top-3 default eligibility: representations V=`active|unclassified`, current D не
`rejected`, без Conflict. `deferred` допускается как личный стратегический выбор с явной
меткой, но не как objective sprint candidate. Archived можно включить только если
пользователь явно просит historical favorites. Readiness вычисляется только из typed
D/L/O/relations/live-work checks, не из notes/sprintPhase/PR hints.

## Implementation sprint boundary

Implementation заменяет solution-first prototype, но не меняет C1–C5/C7:

- переписать `scripts/lib/insight-ritual.mjs` и `scripts/insight.mjs`: удалить старую
  meta/registry mutation archive path и ambiguous evidence gate;
- добавить pure contract/replay/evidence/migration/overview modules и C7 transactional
  executor/journal/outbox adapter;
- добавить versioned lifecycle store и отдельные rebuildable views, не переписывая
  historical INSIGHT/RESEARCH/REVIEW/task archives;
- обновить `INSIGHT_REGULATION`, четыре canonical skills и все thin mirrors;
- зарегистрировать новый lifecycle skill в `.cursor/skills/README.md`; generated
  `yarn tooling:overview` и его tests должны обнаруживать canonical skill, все mirrors и
  новые CLI commands;
- обновить task registration/closure handoffs и affected verify hooks;
- заменить `scripts/insight-drift.mjs` на thin read-only compatibility adapter, который
  импортирует ту же verify library без скрытого CLI flag; `insight:drift` и evening call сохраняются на один
  deprecation cycle, но старые mention/archive inference и отдельный exit-code contract
  удаляются. Затем consumers переходят на `insight:verify`;
- выполнить C5 legacy migration сначала dry-run + audit, затем execute через C7;
- исправить текущие prototype projections только через migrated events/rebuild, не новой
  ad-hoc записью meta/registry.

Legacy `docs/insights/registry.json` и per-insight `meta.json` pin/hash-ятся в migration
manifest как sealed historical inputs и больше не являются authority. Они не
переписываются задним числом. Новые current/archive compatibility projections живут в
отдельном lifecycle views path и всегда rebuild из BaseContext+EventLog; consumers
переводятся туда, поэтому второго registry/meta source of truth нет.

Вне scope: UI dashboard, database/event bus/CQRS, изменение task archive semantics,
автоматический product outcome inference, удаление historical artifacts, remote deploy.

## Exact testable DoD

- Contract tests покрывают exact C2 enums/subjects, None, no-inference и C4 event/replay.
- DecisionRequest tests покрывают fresh candidate IDs, changed digest/stale request и
  атомарную BaseContext scope + state-aware D operation без duplicate Conflict.
- C3 tests покрывают четыре bases, evidence/hint/invalid, dedup/correlation и пять scenarios.
- Migration fixtures проверяют Hermes; Comms CC1–CC8 + CC9 None; Telegram software +
  operational None; Persona phases 1/1.5 + O None; G/H/I D accepted + L/O None.
- C7 fault injection проходит после каждого authoritative/projection replace; concurrent
  worktrees, retry same/different key, stale lock, unexpected hash и outbox recovery tested.
- Dry-run всех mutating commands byte-for-byte не меняет workspace; deprecated archive
  never writes.
- Mirror test проходит для 4 skills × 4 surfaces; Codex to-sprint существует, Claude path
  resolves, OpenCode full-copy drift устранён.
- `.cursor/skills/README.md` и `yarn tooling:overview` показывают lifecycle skill и exact
  CLI surface; tooling overview test не допускает скрытый/недоступный playbook.
- Pre-push hook fixtures подтверждают exact stdin range/matcher/fallback semantics;
  `SKIP_PREPUSH` не отключает CI/executor gates.
- Affected dependency-manifest test подтверждает, что изменение каждого evidence,
  transcription, mirror/catalog и closure producer path запускает `insight:verify`.
- Overview fixture перечисляет все insights, не выводит L/O из archived/task/mention и
  требует отдельный personal top-3 в skill output contract.
- `insight:verify` ловит projection drift/invalid refs/replay errors и не падает на
  legitimate None/evidence gaps.
- `insight:drift` adapter и evening consumer возвращают те же verify diagnostics без
  mention/archive inference; legacy registry/meta не читаются как authority.
- Targeted script/docs tests, lint/typecheck и repository-required closure review green;
  unrelated pre-existing failures документируются, не маскируются.
- One-time migration dry-run и final manifest имеют independent audit PASS; execute replay
  даёт ожидаемые exact states без исторического rewrite.

## Фактически использованные premises

- C1–C4 exact subject/axes/evidence/history contracts.
- C5 verified migration algorithm, factual candidates/gaps and no-rewrite rule.
- C7 operation/transaction/idempotency/recovery/outbox contract.
- Repository audit: `.cursor` canonical convention; missing Codex to-sprint, broken Claude
  path, stale OpenCode copies; current overview/task/archive inference defects; old
  `archive --task --result` prototype.

C6 не пересматривает значения, subjects, evidence criteria, replay semantics, legacy
classification или transaction boundary predecessors.
