# ВЕРДИКТ C7

> Режим: ручной председательский resolution по указанию владельца после недоступности
> Anthropic. Основания: `C2_VERDICT.md`, `C3_VERDICT.md`, `C4_VERDICT.md`,
> `C7_TOPIC.md`.  
> Статус: active; independent read-only audit PASS.

## OperationPlan и preconditions

До любого write строится immutable `OperationPlan`:

```text
OperationPlan = {
  operationId,
  requestKey,
  requestDigest,
  baseContext: { contextId, schemaVersion, digest },
  eventLog: { tailSeq, tailDigest },
  repo: { commonGitDir, worktree, branch, head, treeDigest },
  targetSubjects[],
  targetPaths[],
  proposedBaseContextVersion,
  proposedEvents[],
  projectionPaths[],
  inputRefsAndDigests[]
}
```

Plan normalisation и ordering versioned. После получения lock тот же набор tokens
проверяется дважды: immediately before authoritative apply и immediately before commit.
Любое отличие возвращает deterministic `STALE_PRECONDITION`; operation не перетаргетируется
на новые inputs автоматически.

## Repo-shared exclusive lock и live-work guard

- Lock хранится под `git rev-parse --git-common-dir`, а не внутри отдельного worktree.
  Поэтому все worktrees одного repository видят один lifecycle lock.
- Atomic create lock record содержит `operationId`, request key/digest, PID, host,
  worktree, branch/HEAD, actor, startedAt и journal path.
- До plan и повторно под lock проверяются canonical `yarn neighbors`, worktrees,
  target-path dirty/untracked state, unpushed commits и live PR scopes.
- Detected overlap по subject/scope или target path блокирует write. Не связанная dirty
  работа записывается в plan, но не даёт права менять её файлы.
- Недоступность обязательного remote/live-PR source означает fail-closed. Отдельный
  attributed owner override может заменить только недоступный read источника зафиксированным
  snapshot; он не отменяет обнаруженный overlap и не является stale-lock override.
- После lock plan полностью перестраивается/сверяется, чтобы pre-lock observation не
  использовался как authority.

## Idempotency и event allocation

`requestKey` — caller-provided stable key одного намерения. Журнал/ledger связывает его с
`requestDigest` и итогом:

- тот же key + тот же digest возвращает recorded result и не создаёт events/files again;
- тот же key + другой digest возвращает `IDEMPOTENCY_KEY_REUSED`;
- новый key всегда проходит полный C3/C4 validation; он не маскирует repeated revoke,
  reused assertion ID или stale subject как harmless retry.

Для принятого plan `operationId`, event IDs и созданные assertion/revision IDs выводятся
детерминированно из `(requestKey, requestDigest, ordinal, eventKind)`. `seq` резервируется
от pinned `tailSeq` только под exclusive lock. Retry не может получить новые IDs.

## Authoritative и projection boundary

- Новая immutable BaseContext version и append EventLog — authoritative transaction.
- Registry/meta/archive representation/views/cache — non-authoritative projections,
  полностью rebuildable из committed BaseContext + EventLog.
- Projection files входят в operation/recovery journal и обязаны быть приведены к
  committed generation, но их частичная материализация не меняет semantic commit.
- Readers обязаны сверять generation/context/log head; stale projection не может быть
  принята как authority.

## Prepare → apply → commit journal

Transaction journal располагается в repo-shared common git area на том же volume и имеет
append-only states `PREPARING → PREPARED → APPLYING → COMMITTED → PROJECTED → DONE` либо
`ABORTED/BLOCKED`.

### Prepare

1. Проверить C3 refs и C4 replay proposed state.
2. Для каждого authoritative/projection path сохранить canonical path, before digest,
   after digest и durable before/after blob; для отсутствующего файла — explicit
   `ABSENT` marker.
3. Записать staged temp files на том же volume, flush их и journal; никакой target file
   ещё не меняется.
4. Записать `PREPARED` только после верификации всех staged hashes.

### Apply и authoritative commit

1. Под lock повторно проверить весь pinned token set.
2. Atomic replace authoritative BaseContext/version pointer и EventLog каждым staged
   file, после каждого шага append progress record и flush.
3. Проверить after hashes и выполнить replay уже из target files.
4. Непосредственно перед commit marker ещё раз проверить pinned repo/request tokens и
   ожидаемый новый authoritative head. Изменение даёт rollback до commit.
5. Записать durable `COMMITTED` marker с new BaseContext digest, EventLog tail/digest и
   replay result. Это semantic commit boundary.
6. Rebuild/replace projections, проверить generation, записать `PROJECTED`, затем `DONE`.

Многофайловой atomic rename не предполагается. Атомарность обеспечивается exclusive lock,
before/after journal, однозначным commit marker и deterministic recovery.

## Crash recovery matrix

Recovery всегда сначала получает тот же repo-shared lock и проверяет journal/hashes.

| Наблюдаемое состояние | Единственное действие |
|---|---|
| Нет `PREPARED`, targets имеют before hashes | Удалить verified temp files, `ABORTED` |
| `PREPARED/APPLYING`, все authoritative targets = before | Очистить stage, `ABORTED` |
| `PREPARED/APPLYING`, допустимая смесь exact before/after | Восстановить все authoritative targets из before blobs, verify, `ABORTED`; новый запуск получает новый plan либо повторяет тот же key |
| Все authoritative targets = after, `COMMITTED` отсутствует | Повторить replay; если он exact expected — durable roll-forward `COMMITTED`, иначе восстановить before и `ABORTED` |
| `COMMITTED`, authoritative targets = after, projections stale/partial | Никогда не rollback events; rebuild projections, затем resume outbox |
| `COMMITTED`, authoritative digest не совпадает | `BLOCKED_CORRUPTION`, никаких автоматических overwrite/rollback |
| Любой target имеет digest вне before/after set | `BLOCKED_EXTERNAL_MUTATION`, сохранить lock/journal для ручного расследования |

До `COMMITTED` допустим только physical rollback незакоммиченной transaction. После
`COMMITTED` прежние events никогда не удаляются/переписываются: semantic correction —
новая атомарная operation с `Revoke + Assert*`; reopen — новый C4 `Reopen` с fresh
revision/ID и D=`proposed`. Git revert файла EventLog не является lifecycle correction.

## Stale lock и override

Lock считается orphaned не по возрасту одному. Recovery обязан доказать, что owner process/
host lease не жив, найти journal, сверить operation tokens и классифицировать crash state.

- Автоматическое reclaim возможно только для доказанно orphaned lock и известного
  recoverable before/after state.
- Ручной stale-lock override записывает actor, time, reason, old lock/journal digests и
  recovery decision в provenance ledger.
- Override лишь разрешает recovery/release orphaned lock. Он не обходит pinned-version,
  C3 evidence/reference validation, C4 replay, live-work guard или unexpected-file hash.
- Неизвестный owner, пропавший journal или неожиданный digest — deterministic BLOCK,
  не повод удалить lock.

## External side effects

Git push, GitHub Issue/PR comments/labels/close и другие network effects находятся вне
filesystem atomic boundary.

- В committed operation создаётся durable outbox record с idempotency key, exact desired
  remote effect и authoritative commit refs.
- Worker выполняет outbox только после `COMMITTED`, сохраняет remote receipt и безопасно
  повторяет запрос.
- Network failure оставляет `pending/failed-retryable`; он не откатывает BaseContext/
  EventLog.
- Remote semantic rejection становится `failed-terminal` и требует отдельного решения,
  но не rewrite локальной истории.
- Push никогда не используется как промежуточный шаг до semantic commit.

## Deterministic failure codes

Минимальный закрытый набор: `LOCKED`, `STALE_PRECONDITION`, `LIVE_WORK_CONFLICT`,
`REMOTE_STATE_UNAVAILABLE`, `IDEMPOTENCY_KEY_REUSED`, `INVALID_EVIDENCE_REF`,
`REPLAY_ERROR`, `STAGE_HASH_MISMATCH`, `BLOCKED_EXTERNAL_MUTATION`,
`BLOCKED_CORRUPTION`, `ORPHAN_LOCK_UNPROVEN`, `OUTBOX_RETRYABLE`,
`OUTBOX_TERMINAL`.

Каждый failure содержит operation/request refs, observed/expected digests и journal ref;
секреты и raw env values в журнал не попадают.

## Фактически использованные premises

- C2: exact typed assertions, no cross-axis inference, immutable subject/scope,
  event-only supersede, reopen creates new revision.
- C3: L/O assertions требуют exact EvidenceNode; C7 валидирует refs, но не меняет
  predicates/criteria.
- C4: pinned BaseContext + append-only EventLog, typed validation/replay, committed events
  no rewrite/delete, projections/cache non-authoritative.
- C7 topic: concurrent worktrees/live PR, retries, partial multi-file failure, TOCTOU,
  external effects и stale locks являются обязательными operational failure modes.

## Граница C7

C7 не классифицирует legacy-кейсы, не выбирает migration dispositions и не определяет
agent-facing CLI, красивые отчёты или skill wording. Это остаётся C5/C6.
