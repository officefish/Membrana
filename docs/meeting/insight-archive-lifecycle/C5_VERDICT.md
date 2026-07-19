# ВЕРДИКТ C5

> Режим: ручной председательский resolution по указанию владельца после недоступности
> Anthropic. Основания: `C1_VERDICT.md`–`C4_VERDICT.md`, `C5_TOPIC.md`, внутреннее
> расследование и перечисленные ниже legacy-артефакты.  
> Статус: active; independent read-only audit PASS.

## MigrationDisposition, но не новая lifecycle-ось

```text
MigrationDisposition = verified | partial | unknown | disputed
MigrationDiagnostic = {
  disposition,
  manualReviewRequired: boolean,
  reasons: DiagnosticCode[]
}
```

- Это diagnostic результата миграции, не C2 axis/value/status.
- `verified` означает: immutable scope, typed relations и каждое созданное assertion
  восстановлены из допустимых sources без противоречия.
- `partial` означает: часть scopes/relations/assertions восстановлена, а unsupported
  assessments сохранены как `None`.
- `unknown` означает: exact subject/scope или relation нельзя надёжно восстановить.
- `disputed` означает: pinned sources дают несовместимые identities, scopes или facts;
  `manualReviewRequired=true`, silent winner запрещён.
- Ни disposition, ни confidence, ни task status не создают D/L/O/V assertion.

## Pinned forensic input

Каждый запуск создаёт immutable `MigrationManifest` и фиксирует:

- repository commit и tree digest;
- BaseContext `contextId`, `schemaVersion`, `digest`;
- EventLog `tailSeq`, `tailDigest`;
- migration schema/predicate versions;
- отсортированный список canonical source refs с digest;
- normalisation version и deterministic ordering key.

Одинаковые pinned inputs обязаны давать byte-equivalent manifest, BaseContext delta и
event proposal. Изменившийся input — новый запуск/manifest, не продолжение старого.
Locking и revalidation этих tokens остаются C7.

## Детерминированный алгоритм

1. **Pin.** Зафиксировать все inputs выше; normalise paths, IDs и refs; сортировать по
   `(insightId, revisionId, mandateId, sliceId, sourceKind, canonicalRef)`.
2. **Reconstruct identity/scope.** Из INSIGHT revision и принятого REVIEW claim-set
   создать immutable InsightRevision, Mandate и per-claim Slice. Roadmap без принятого
   REVIEW-мандата не превращать в accepted scope.
3. **Classify links.** Exact historical `task.insightId` плюс совпадающий task prompt/
   REVIEW scope — strong candidate typed relation. `parentEpic`, `dependsOn`, notes,
   `sprintPhase`, PR range и textual mention — только hints до exact corroboration.
4. **Backfill relations.** Создать новую versioned BaseContext с typed identity/scope/
   relation records и provenance на manifest. Старые task/insight/archive records не
   редактировать.
5. **Build EvidenceCandidates.** Для каждого exact SLICE и предполагаемого L/O value
   создать C3 candidate с named/versioned rule, exact result и canonical originRef.
   Classify только как `evidence|hint|invalid`; EvidenceNode создаётся лишь из `evidence`.
6. **Propose events.** D/L/O/V assessments и исправления создавать только exact C4 append
   events без расширения их payload. `MigrationManifest` хранит typed
   `generated/proposes → eventId` provenance edges; L/O event использует существующий
   opaque `evidenceRef`. Любой `Some(L/O)` обязан ссылаться на exact C3 EvidenceNode того
   же TargetClaim. Unsupported assessment остаётся `None`.
7. **Validate/replay.** Прогнать C4 replay на proposed BaseContext + appended events;
   Conflict или ReplayError переводит соответствующую запись в `disputed`, без записи
   silent winner.
8. **Emit report.** Записать disposition per exact subject, generated relations/events,
   excluded hints, uncertainty и manual-review queue. Повторный запуск сверяется с
   manifest digest и не создаёт дубликатов.

BaseContext содержит только pre-existing identities, immutable scopes и typed relations.
Он не получает lifecycle assessments. EventLog остаётся единственным источником migrated
D/L/O/V assertions и corrections.

## Backfill и исправления

- Historical registry/meta/archive/INSIGHT/REVIEW и старые task cards не переписываются.
- Backlink, которого исторически не было, фиксируется новой typed relation
  `Task → Mandate` с `relationOrigin=migration`, `manifestRef`, source refs и confidence
  diagnostic. Это не притворяется исходным `task.insightId`.
- `mention`, `notes`, `sprintPhase`, parent archive или PR existence сами по себе — hint.
- Ошибочный imported assertion исправляется append-парой `Revoke(old)` + `Assert*(new)`.
- Ручное решение создаёт exact C4 correction events без дополнительных payload fields;
  actor, reason и refs живут в новом immutable manifest/operation provenance, typed edges
  которого указывают на event IDs. Прошлый manifest не меняется.

## Forensic classification четырёх кандидатов

### Hermes liaison agent

| Поле | Решение |
|---|---|
| Exact closure scope | Принятый REVIEW-мандат `hermes-brief`: детерминированный `yarn hermes:brief` и тонкий read-only agent; будущие LLM summary/packer/orchestrator исключены из этого mandate |
| D | `Some(accepted)` для exact mandate/revision |
| L | `Some(delivered)` per reconstructed accepted Slice после C3 nodes из task acceptance rule, PR #316 merge SHA `72f8ef79b0f6b59e153954407a1a7b9cd881485b`, LGTM и проверенных артефактов/tests |
| O | `None`: отдельного versioned outcome criterion/window/result в sources нет |
| V | `Some(archived)` для legacy insight/meta representation — direct observed source; это навигация, не следствие завершённого mandate, не доказательство L/O и не закрытие stable insight identity |
| Diagnostic | `verified`, manual review не требуется при совпадении pinned digests |

Будущая гипотеза создаёт новый mandate/revision. Она не переоткрывает и не мутирует
доставленный `hermes-brief` scope.

### Comms contour topology

| Поле | Решение |
|---|---|
| Exact closure scope | REVIEW-вариант A, immutable child scope CC1–CC9; parent summary не является одним delivery proof |
| D | `Some(accepted)` для exact CC1–CC9 mandate |
| L | Восемь отдельных `Some(delivered)` для CC1–CC8 после создания C3 nodes из acceptance rules и exact PR/LGTM/merge-SHA pairs: #254, #255, #256, #258, #259, #260, #261, #262. Для CC9 — `None`: PR #264 существует, но требуемая сверка v0.1 против Storybook/UI не подтверждена |
| O | `None` для всех девяти slices: product outcome criteria/results не зафиксированы |
| V | `Some(archived)` для direct legacy insight/meta representation; CC9 gap не выводит другое V и archive не является девятым proof |
| Diagnostic | `partial`; CC1–CC8 verified после manifest/replay, CC9 unverified и остаётся `None` |

Legacy range `#254–264` исключается как evidence: #257 отсутствует, #263 относится к
чужой работе. Post-factum `parent.insightId` и девять children без backlink не
переписываются. Новая BaseContext version связывает каждый child task с exact Slice/
Mandate через manifest provenance и точный SHA. PR #264 и его LGTM остаются candidate/hint
для CC9, пока named acceptance rule со Storybook/UI не даст affirmative result. Если
владелец отдельно решит вернуть representation в active-навигацию, это новый attributed
manifest + exact `Revoke`/`AssertV(active)`, не inference из CC9.

### Telegram work reports

| Поле | Решение |
|---|---|
| Exact closure scope | Только принятый MVP day/evening digest mandate из task prompt; phase 2 LLM-пересказ не входит в delivered scope |
| D | `Some(accepted)` для MVP mandate; для phase 2 — `None`, пока нет отдельного принятого mandate |
| L | `Some(delivered)` только для software/config/test/ritual-wiring slices после C3 nodes из PR #431/hotfix, versioned task acceptance rules и tests. Operational delivery-smoke Slice — `None`: `sent=true` без message_id либо owner observation не доказывает фактическую доставку |
| O | `None`: ни technical wiring, ни `sent=true` не являются отдельным product outcome evidence |
| V | `Some(archived)` для direct legacy insight/meta representation; operational gap и phase 2 сами по себе не выводят V |
| Diagnostic | `partial`: software slices имеют сильные candidates, operational acceptance и future phase не закрыты |

Если владелец отдельно выберет V=`active`, current view исправляется append
`Revoke(legacy V)` + `AssertV(active)`, а не изменением `meta.json` задним числом и не
автоматически из open scope. `telegram-digests-v2` без exact typed relation остаётся
backfill candidate/hint и не подтверждает phase 2 автоматически.

### Persona persistent memory

| Поле | Решение |
|---|---|
| Exact closure scope | Два принятых mandates: phase 1 и phase 1.5/all-personas; phases 2–3 и calibration prediction↔fact остаются вне их immutable scope |
| D | `Some(accepted)` для phase 1 и phase 1.5 mandates; для будущих phases без отдельного принятого mandate — `None` |
| L | `Some(delivered)` per accepted Slice после C3 nodes из task rules, PR #422/#461 exact merge SHAs, LGTM, journals/default injection и tests |
| O | `None`: улучшение deliberation/calibration не измерено named/versioned outcome criteria в declared window |
| V | `Some(archived)` для direct legacy insight/meta representation; shipped/open phases не используются для вывода V |
| Diagnostic | `partial`: delivery coverage принятых scopes есть, outcome и future scopes отсутствуют |

Отдельное owner navigation decision V=`active`, если оно будет принято, оформляется новым
manifest provenance и exact append correction events. Фраза «persistent memory delivered»
не расширяется на calibration/value outcome.

## Ложные архивы G/H/I

| Insight | D | L | O | V | Migration result |
|---|---|---|---|---|---|
| `insight-operator-smoke-ci-gate` | `Some(accepted)` для принятого REVIEW-mandate | `None` | `None` | `Some(active)` | `partial`; pilot task — creation/research/review hint |
| `insight-async-v2-product-narrative` | `Some(accepted)` для принятого REVIEW-mandate | `None` | `None` | `Some(active)` | `partial`; pilot task не транскрибирует implementation scope |
| `insight-competition-catalog-pipeline` | `Some(accepted)` для принятого REVIEW-mandate | `None` | `None` | `Some(active)` | `partial`; pilot task не является delivery evidence |

Их `ins-pilot-*` archive facts сохраняются как история задач, но typed Task→Mandate
implementation relation не создаётся. Любой migrated V=`archived` отзывается, затем
добавляется V=`active`. Отсутствие implementation evidence не превращается в
`not-delivered`.

## Фактически использованные sources и uncertainty

- `docs/discussions/insight-lifecycle-investigation-2026-07-18.md` — полный registry/task/
  PR audit и выявленные false positives;
- соответствующие `docs/insights/<id>/INSIGHT.md`, `REVIEW.md`, `meta.json`;
- task registry records и archive cards для `hermes-brief`, `comms-contour-environment`,
  CC1–CC9, `telegram-ally-reports`, `persona-memory-phase1`,
  `persona-memory-all-personas`, `ins-pilot-g/h/i-*`;
- task prompts как кандидаты named/versioned delivery acceptance rules;
- exact PR/LGTM/merge SHA facts, артефакты и test results, перечисленные расследованием.

Uncertainty сохраняется явно:

- конкретные Slice IDs и EvidenceNode IDs должны быть получены deterministic generator,
  а не придуманы этим текстом;
- Telegram hotfix ref и все per-Slice acceptance predicates должны пройти digest pinning;
  `sent=true` не повышается до EvidenceNode без message_id/owner observation;
- Comms CC9 остаётся L=`None`, пока нет affirmative Storybook/UI acceptance result;
- Comms relation backfill является новым forensic relation, а не историческим backlink;
- O остаётся `None` во всех четырёх кейсах до появления exact C3 outcome evidence;
- V — отдельный наблюдаемый/навигационный assertion и не подтверждает
  closure/delivery/outcome; future roadmap или coverage не меняют V автоматически.

## Граница C5

C5 не определяет CLI, agent presentation, CI enforcement, locking, transaction journal,
TOCTOU или crash recovery. Это остаётся C6/C7.
