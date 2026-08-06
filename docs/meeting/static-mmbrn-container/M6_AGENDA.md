# M6 — приём и выдача

> Заседание `static-mmbrn-container`, фаза M6. M1-M5 закрыты; M2-M5 ратифицированы:
> [`M1`](../../seanses/static-mmbrn-container-m1-boundary-2026-08-03.md) ·
> [`M2`](../../seanses/static-mmbrn-container-m2-identity-2026-08-03.md) ·
> [`M3`](../../seanses/static-mmbrn-container-m3-access-2026-08-04.md) ·
> [`M4`](../../seanses/static-mmbrn-container-m4-storage-2026-08-04.md) ·
> [`M5`](../../seanses/static-mmbrn-container-m5-affine-role-2026-08-06.md).
> Общий бриф: [`MEETING_BRIEF.md`](MEETING_BRIEF.md).

## Вопрос заседания

**E1 — назначьте один минимальный исполнимый контракт мастерской вещдоков для полного
цикла приёма и разрешённой выдачи: от недоверенных bytes и заявленных metadata до
immutable M2 record, проверяемой достижимости, preview/read/download и аудита. Выберите
одну operation surface, state machine, commit/idempotency model, error taxonomy и
readiness gates. Сохраните M2 identity, M3 per-action authority, M4 storage truth и M5
сменность Affine. Carrier —
`docs/seanses/static-mmbrn-container-m6-intake-delivery-2026-08-06.md`; второй носитель
запрещён. Список посылок обязателен. M7 не решается.**

## Закрытые посылки M1-M5

- Контейнер принимает originals как конкретные bytes; Affine и preview являются сменными
  поверхностями, не source of truth.
- Единица регистрации — файл/архив целиком. Компонент архива получает отдельную запись
  только при независимом поступлении или фактическом предоставлении M6.
- M2 record append-only: обязательны `id`, `sha256`, positive integer `bytes`, `addedAt`,
  `source`, `location {kind,ref}`; опциональны `supersedes`, `sensitive.reason`, `about`,
  `measured`. Любая правка поля создаёт новый `id`.
- `canonicalRef = "urn:mmbrn:static:" + rootId`; дубль bytes не сливает records/lineages;
  редакция продолжает lineage, перенос меняет location новой record с прежним hash.
- `registry.jsonl` — truth регистрации/identity/history. Location — заявление, reachability
  — внешнее состояние, bytes — независимое доказательство.
- Panel авторизует отдельные M3 actions: `discover`, `read-metadata`, `read-ref`,
  `read-bytes`, `download`, `write-metadata`, `upload-revision`, `manage-access`.
  `read-metadata` не выдаёт `location.ref`; ref, bytes и download проверяются раздельно.
- M4: FD-1 primary bytes, FD-2 complete backup, FD-3 registry/lifecycle. До записи нужны
  class-scoped key, capacity/quota admission, hash/bytes verification и fail-closed gates.
  Текущий office VDS остаётся storage NO-GO.
- M5: Affine — optional projection. Любое обращение к нему требует Panel allow и valid
  binding; отсутствие движка не отменяет container/registry/bytes/authority.

## Измеренная фактура мастерской

- `yarn evidence` умеет `add`, `verify`, `list`, `inspect`, `decompose`; manifest объявляет
  audit/decompose/inspect/list, а `kit: null` честно оставлен до server phase.
- `docs/evidence/registry.jsonl` содержит 12 append-only rows; текущие rows используют
  `location.kind=local`. В публичном Git хранится один PDF-чек; sensitive PDF партнёра
  находится вне репозитория с `sensitive.reason` и непереносимым local ref.
- `verify` 06.08 дал: два hash-mismatch для day memo, один unreachable superseded BPLA
  row, остальные reachable; отдельно найдены duplicate hash-группы receipt и BPLA.
  Reachable legacy sensitive local ref не доказывает переносимость или право выдачи.
- README сегодня предписывает «bytes к нам, потом опись», различает
  `ok/hash-mismatch/unreachable/unknown` и оставляет server API пунктом backlog #1303.
- Существующая CLI/README предшествует решениям M2-M5. Совпадение её полей с частью нового
  контракта — факт совместимости, а не разрешение вернуть старую identity/storage model.

## Обязательные решения

1. **Operation surface.** Выбрать закрытый набор операций мастерской. Для каждой указать
   caller intent, M3 action, input identity, result class, mutation/side effect и audit
   evidence. Логический API должен быть пригоден и для CLI, и для server adapter; transport
   выбирается только если без него контракт не исполним, но M7 deployment не проектируется.
2. **Приём и commit point.** Задать state machine от untrusted bytes до durable original и
   immutable registry append. Определить порядок hash/size, sensitivity/class, malware или
   format checks, quota admission, storage verification и registration. Registry не может
   ссылаться на недописанный object; orphan/quarantine не может молча стать registered.
3. **Idempotency и recovery.** Назвать idempotency key/scope, повтор запроса, crash до/после
   commit, timeout/unknown outcome, cleanup/reconciliation и доказательство ровно одной
   M2 record на один принятый intent. Content duplicate не равен повтору intent.
4. **Identity и revisions.** Сохранить M2 для нового material, duplicate bytes, revision,
   metadata correction, address move и archive component. Никакого upsert старой row,
   вывода lineage из hash или автоматического слияния duplicates.
5. **Sensitivity.** Назначить авторитет классификации и fail-closed состояние при unknown.
   Classification определяет M4 class до durable write, но не становится `location.kind`.
   Sensitive ref хранится в registry и скрывается только M3 action gate.
6. **Проверка.** Развести schema validity, reachability, byte integrity, storage durability,
   authorization и portability. Статус одного измерения не выдаётся за другой; `unknown`
   не PASS. Проверка live tip и исторической row различается без переписывания истории.
7. **Выдача и preview.** Metadata/ref/bytes/download имеют разные M3 gates. Preview —
   derived, non-authoritative и class-preserving; его отсутствие/ошибка не меняет original.
   Запретить direct storage/Affine bypass, ref leakage и cache-as-truth.
8. **Архивы.** Архив принимается целиком. Если M6 фактически предоставляет component,
   определить отдельный bytes/hash/id/lineage, provenance к archive и защиту от path
   traversal, bombs и неограниченного extraction; автоматическая регистрация запрещена.
9. **Errors и audit.** Дать закрытые machine-readable outcomes, retryability и exposure.
   Audit связывает principal, intent/idempotency, action, M2/M4 evidence и решение, не
   раскрывая sensitive ref или bytes неавторизованному caller.
10. **Readiness.** Дать machine predicates/evidence для atomicity, replay/idempotency,
    hash/size, class/quota, registry/storage reconciliation, M3 bypass, preview isolation,
    archive safety и degraded mode. Неизмеренное состояние даёт NO-GO.

## Обязательные случаи

Таблица `Случай | Ожидаемое решение | Источник истины | Вещдок` включает не меньше 14 строк:

1. новый PDF; 2. те же bytes как новое независимое поступление; 3. retry того же intent;
4. новая редакция; 5. metadata correction; 6. address move; 7. sensitive classification
unknown; 8. quota/capacity deny; 9. crash до registry commit; 10. timeout с неизвестным
commit outcome; 11. hash mismatch; 12. unreachable historical row и reachable live tip;
13. metadata allow при ref/bytes/download deny; 14. preview failure; 15. archive component;
16. direct storage или Affine bypass.

## Обязательные таблицы

- **Operations:** operation, M3 action, input, result, mutation, audit evidence.
- **State machine:** state, entry predicate, allowed transition, durable evidence, recovery.
- **Outcomes:** code/class, meaning, retryable, caller exposure, audit consequence.
- **Cases:** по форме выше.
- **Readiness:** gate, machine predicate, evidence, fail result.

## Границы комнаты

- Не решать M7: не переносить 82 Affine pages, не выбирать DNS/Caddy/redirects, rollout,
  live-service edits, migration batch, Issue/PR slicing или production deployment.
- Не менять M1 boundary, M2 fields/lineage/canonicalRef, M3 roles/actions или M4 topology.
- Не считать Affine ingest/storage API каноном и не возвращать strategic editor.
- Не чинить текущие 12 rows, README, CLI или live store внутри протокола; они evidence.
- Не объявлять preview/OCR обязательным для всех media и не извлекать archive components
  без запроса и отдельной регистрации.
- Не выдавать текущую достижимость local path за production readiness.

## Требования к форме

- Не меньше 36 предметных ролевых реплик и не меньше шести от каждой из шести ролей.
- Одна пропозиция E1, один verdict, один carrier. Итог выбирает одну модель.
- `Список посылок` после решения и до DoD содержит только входные нормы/факты.
- Meta/self-count запрещены; ролевой пункт DoD оставляется внешнему аудиту.
- `Definition of Done` — последняя секция; после неё нет текста/footer.

## Definition of Done

- [ ] Выбран один исполнимый operation/state/commit contract мастерской
- [ ] M2 identity, M3 authority, M4 storage и M5 сменность Affine сохранены
- [ ] Intake atomicity, idempotency, crash recovery и reconciliation определены
- [ ] Sensitivity, verification dimensions, preview и archive safety разведены
- [ ] Пять обязательных таблиц и не меньше 14 cases заполнены
- [ ] Readiness имеет machine predicates, evidence и честный NO-GO
- [ ] M7, production migration и текущие rows не исполнены
- [ ] Один carrier, один E1, посылки перед последней секцией DoD
- [ ] Не меньше 36 ролевых реплик и не меньше шести от каждой роли
