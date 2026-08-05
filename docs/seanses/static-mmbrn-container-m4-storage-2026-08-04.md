<!-- канал: llm — исходные протоколы произведены yarn consilium -->
<!-- local-synthesis: председательская редакция из run1-run5 после исчерпания 5/5 внешних попыток; сырой run5 сохранён в rejected/static-mmbrn-container-m4-storage-2026-08-05-run5-final-external.md -->

# Метаданные сеанса

| Поле | Значение |
|---|---|
| Каноническая комната | M4 «Хранение и живучесть» заседания `static-mmbrn-container` |
| Локальная сборка | 2026-08-05 после закрытия внешнего бюджета 5/5 |
| Исходный последний вызов | `yarn consilium`, `LLM_NO_OVERLAY=1`, `deepseek/deepseek-chat` |
| Файл | `docs/seanses/static-mmbrn-container-m4-storage-2026-08-04.md` |
| Повестка | `docs/meeting/static-mmbrn-container/M4_AGENDA.md` |
| Корпус | rejected run1, run2, run3, run5; транспортный прецедент run4; независимые постаудиты |

Локальная редакция использует только доставленную повестку, ратифицированные M1-M3,
сохранённые внешние прогоны и их постаудиты. Новых внешних вызовов не производилось.

---

# Консилиум: S1 — хранение и живучесть `static.mmbrn.tech`

[Архитектор]: Выбираю одну topology: FD-1 — выделенный primary storage host/volume для bytes; FD-2 — независимый backup host/volume; FD-3 — отдельный management host/volume для immutable `registry.jsonl` и append-only lifecycle ledger. Office VDS не входит ни в один storage failure domain.

[Teamlead]: FD-1, FD-2 и FD-3 не делят машину, volume, учётную запись или credential. Потеря одного домена не должна лишать одновременно primary bytes, backup bundle и metadata, нужных для restore.

[Музыкант]: Storage-policy classes две: `standard` и `sensitive`. Sensitive bytes шифруются at rest отдельным key namespace; standard также шифруется at rest, но другим namespace. Между классами нет общего ciphertext или credential.

[Математик]: Единственный physical admission predicate: `free_after >= 12 GiB AND used_after / provisioned_capacity < 0.90`. Soft watermark `0.85` только создаёт наблюдаемый alert и не меняет ALLOW.

[Верстальщик]: M4 назначает наблюдаемые значения и вещдоки, но не UI, цвет, текст статуса, endpoint или download flow. Любое представление этих метрик остаётся предметом M5-M6.

[Структурщик]: Для storage records выбирается существующий M2 `location.kind=local`. Непустой `location.ref` имеет форму `static:{class}:{sha256_64hex}`; это адрес внутри storage backend, не URL и не `canonicalRef`.

[Архитектор]: Physical key имеет форму `objects/{class}/{sha256_64hex}`. `class=sensitive`, если M2 record содержит непустой `sensitive.reason`; иначе `class=standard`. Dedup действует только внутри одного class.

[Teamlead]: Разные M2 records и lineages остаются разными identities, даже если ссылаются на один blob. Физическое удаление shared blob разрешено только при нуле live refs после проверки retention, authorization и hold для каждой record.

[Музыкант]: Если standard и sensitive records имеют одинаковый hash, хранятся два объекта в разных class namespaces. Это сознательный отказ от cross-class dedup ради изоляции credential и encryption policy.

[Математик]: Integrity проверяет полный `sha256` и `bytes` вместе после записи, перед чтением, при reconciliation, backup и restore. Mismatch любого поля переводит blob в quarantine и закрывает все refs этого `(class, sha256)`.

[Верстальщик]: Expected absence после подтверждённого удаления отличается от dangling и orphan в storage evidence. Скрытие строки или предупреждение интерфейса не заменяет эту машинную классификацию.

[Структурщик]: Lifecycle ledger хранит события по существующему M2 `id`: `hold`, `hold_release`, `superseded`, `tombstone`, `deletion_authorized`, `deletion_complete`, `quarantine`, checkpoint и reconciliation. Поля M2 не мутируются и не расширяются.

[Архитектор]: Container physical budget вычисляется как `B_container=min(P-12 GiB, floor(0.90*P))`, где `P` — provisioned capacity FD-1. Отрицательный или нулевой budget закрывает production admission.

[Teamlead]: До первой записи каждая active collection получает положительный ratified weight `w_c` в quota ledger. Отсутствие weight, пустой набор weights или несходящаяся quota snapshot дают fail-closed DENY.

[Музыкант]: Один shared blob полностью начисляется каждой collection, которая имеет хотя бы одну live record на него. Внутри одной collection повторные refs того же `(class, sha256)` начисляются один раз.

[Математик]: `Q_c=floor(B_container*w_c/sum(w))`; поэтому сумма collection quotas не превышает container budget. `U_c` — сумма `bytes` distinct live blobs collection. Admission требует одновременно `U_c+logical_delta<=Q_c` и physical predicate.

[Верстальщик]: G1 проверяет zero-size baseline: `physical_delta=0`, актуальную quota snapshot и обе части capacity predicate. Каждая production запись повторяет расчёт с фактическим M2 `bytes` и нулевым physical delta при существующем dedup blob.

[Структурщик]: Quota evidence — версия weight snapshot, вычисленные `B_container/Q_c/U_c`, physical delta и результат обеих проверок. Эти значения не назначают способ их будущего отображения.

[Архитектор]: Checkpoint начинает global mutation fence для ingest, registry append, lifecycle events и physical deletion, затем drain всех in-flight writers. После drain фиксируются `checkpoint_id`, `cut_at`, `registry_seq`, `lifecycle_seq` и inventory generation.

[Teamlead]: Snapshot registry/lifecycle и bytes manifest строятся ровно на этих high-water marks. Все перечисленные immutable bytes копируются FD-1→FD-2 и проверяются по `sha256+bytes`.

[Музыкант]: FD-2 хранит encrypted bytes обоих classes, registry snapshot, lifecycle snapshot и manifest. Sensitive backup использует отдельный key namespace; restore drill обязан доказать доступность расшифрования без раскрытия key.

[Математик]: В FD-2 последним пишется immutable `complete.json` с `checkpoint_id`, `cut_at`, high-water marks и hashes всех частей. Затем в live FD-3 append-ится `checkpoint_complete`; только после обоих свидетельств снимается fence.

[Верстальщик]: Restore принимает bundle только при валидном `complete.json`, совпадающих hashes и полном `sha256+bytes` проходе. Живой FD-3 не нужен для доказательства завершённости backup bundle.

[Структурщик]: Checkpoint запускается каждые 12 часов. При abort пишется `checkpoint_abort`, partial bundle не используется, предыдущий complete bundle сохраняется, fence снимается после фиксации abort. RPO gate считает возраст от `cut_at` последнего complete bundle.

[Архитектор]: Active original хранится бессрочно до `deletion_authorized`; superseded revision — минимум 365 дней от `superseded`; backup bundle — минимум 30 дней и до наличия двух более новых complete bundles.

[Teamlead]: Hold имеет приоритет над tombstone, сроком и authorization. `deletion_complete` одной record не удаляет shared blob, пока хотя бы одна другая ref не прошла собственные retention/hold/authorization gates.

[Музыкант]: Panel остаётся единственным авторизатором. `read-ref`, `read-bytes` и `download` проверяются per action по M3; прямой storage access разрешён только internal proxy credential и не создаёт пользовательскую authority. Форму download выбирает M6.

[Математик]: RPO PASS требует `now-cut_at<=24h`. RTO PASS требует измеренный benchmark: `T_restore=t_fixed+protected_bytes/v_verified<=4h`; неизвестные `t_fixed`, `v_verified` или corpus bound дают NO-GO.

[Верстальщик]: Audit log хранит `record_id`, action, actor, timestamp и решение, но не `location.ref`, storage path, raw bytes ref или encryption key. Требование не определяет экран или транспорт.

[Структурщик]: Reconciliation сопоставляет immutable M2 records, lifecycle state и physical inventory: unexpected missing blob — dangling, blob без live M2 ref — orphan, отсутствие с `deletion_complete` всех refs — expected absence.

[Архитектор]: Readiness до production требует capacity/quota baseline, write-read-hash, независимый complete backup, restore drill, auth bypass deny, reconciliation, RPO age, RTO benchmark и доступность FD-3.

[Teamlead]: Office VDS с 9.46 GiB свободного места проваливает абсолютный минимум 12 GiB и остаётся NO-GO. Наличие процесса или включённого backup без successful restore evidence не считается PASS.

[Музыкант]: Sensitive readiness дополнительно проверяет encryption at rest, отдельный credential namespace, backup/decrypt round-trip и отсутствие direct public access. Провал любого шага блокирует sensitive ingest.

[Математик]: Все thresholds имеют единицы bytes или seconds; ratios вычисляются из одного `P`. Измерения checkpoint age, restore throughput и protected corpus bound сохраняются рядом с gate verdict.

[Верстальщик]: M4 не выбирает workspace Affine, визуализацию, формы, HTTP-коды, signed URL, TTL, endpoints, upload/download pipeline, DNS или миграционный UX. Эти решения остаются в M5-M7.

[Структурщик]: Пропозиция S1 связывает существующую M2 identity, M3 per-action authority и три независимых storage domains, не превращая Affine, `canonicalRef` или интерфейс в источник истины bytes.

---

## Пропозиция S1

`static.mmbrn.tech` хранит immutable bytes на выделенном FD-1, независимый complete backup
на FD-2 и immutable registry с append-only lifecycle на FD-3. Storage address использует
валидную M2 пару `location.kind=local`, `location.ref=static:{class}:{sha256_64hex}`.
Любая запись, выдача, checkpoint, restore и deletion выполняются fail-closed по контрактам
ниже; Affine остаётся сменным человеческим движком и не входит в storage truth.

## Storage classes, copies и failure domains

| Предмет | Domain | Носитель | Независимость | Encryption | Retention |
|---|---|---|---|---|---|
| Standard primary bytes | FD-1 | dedicated storage host/volume, `objects/standard/{sha256}` | отдельные machine, volume, account, credential | at rest, standard key namespace | active бессрочно; superseded ≥365 дней |
| Sensitive primary bytes | FD-1 | isolated namespace `objects/sensitive/{sha256}` | credential policy отделена от standard | at rest, sensitive key namespace | active бессрочно; superseded ≥365 дней |
| Complete backup bundles | FD-2 | независимый backup host/volume | не делит machine, volume, account, credential с FD-1/FD-3 | оба classes зашифрованы раздельно | ≥30 дней и ≥2 более новых complete bundles |
| Registry + lifecycle | FD-3 | dedicated management host/volume | не делит machine, volume, account, credential с FD-1/FD-2 | at rest, management key namespace | append-only history бессрочно |

Потеря failure domain — недоступность или утрата содержимого/credential соответствующего
домена. Кеш, реплика на той же машине или partial checkpoint backup не являются.

## Object key, M2 и integrity

- `class=sensitive` iff `sensitive.reason` — непустая строка; иначе `class=standard`.
- Physical key: `objects/{class}/{sha256_64hex}`; overwrite запрещён.
- M2 address: `location.kind=local`, `location.ref=static:{class}:{sha256_64hex}`.
- `canonicalRef` идентифицирует lineage и не участвует в key/ref.
- Dedup действует внутри class; identities M2 records и lineages не объединяются.
- `sha256` и `bytes` проверяются вместе post-write, pre-read, reconciliation, backup и restore.
- Mismatch закрывает все refs blob и помещает его в blob-scoped quarantine.
- Shared blob удаляется только при нуле live refs после retention, authorization и hold для
  каждой ссылающейся M2 record.

## Quota, watermark и admission

Обозначения:

- `P` — provisioned capacity FD-1;
- `B_container=min(P-12 GiB, floor(0.90*P))`;
- `w_c>0` — ratified weight active collection из versioned quota ledger;
- `Q_c=floor(B_container*w_c/sum(w))`;
- `U_c` — logical bytes distinct live `(class, sha256)` refs collection;
- `physical_delta=0`, если blob уже существует, иначе M2 `bytes` входящей record;
- `logical_delta=0`, если collection уже ссылается на blob, иначе M2 `bytes`.

```text
ALLOW <=>
  free_after = P - used_physical - physical_delta >= 12 GiB
  AND (used_physical + physical_delta) / P < 0.90
  AND U_c + logical_delta <= Q_c
```

Soft watermark `0.85` создаёт alert, но не меняет ALLOW. Неизвестные capacity, weights,
collection, `bytes` или quota snapshot дают DENY. G1 использует `physical_delta=0`; каждая
production запись использует фактические deltas.

## Backup, restore, RPO и RTO

Checkpoint запускается каждые 12 часов:

1. Включить global fence для ingest, registry/lifecycle append и deletion; drain in-flight.
2. Зафиксировать `checkpoint_id`, `cut_at`, `registry_seq`, `lifecycle_seq`, inventory generation.
3. Построить snapshots и manifest ровно на high-water marks.
4. Скопировать перечисленные bytes, snapshots и manifest FD-1/FD-3→FD-2.
5. Проверить hashes артефактов и `sha256+bytes` каждого blob.
6. Последним в FD-2 записать immutable `complete.json` со всеми hashes и `cut_at`.
7. Append `checkpoint_complete` в live FD-3.
8. Снять fence.

При ошибке partial bundle невалиден; после `checkpoint_abort` fence снимается, предыдущий
complete bundle остаётся. Restore не зависит от live FD-3: он валидирует `complete.json`,
hashes, high-water marks и все bytes в изолированной среде.

- RPO gate: `now-cut_at<=24h`.
- RTO gate: `t_fixed+protected_bytes/v_verified<=4h`, где все три значения взяты из
  последнего полного drill. Нет измерения или bound — NO-GO.
- Restore drill: минимум раз в 30 дней, а также до первого production ingest и миграции.

## Retention, deletion и reconciliation

| Состояние | Bytes rule | Lifecycle evidence |
|---|---|---|
| Active original | бессрочно до explicit authorization | отсутствие complete deletion chain |
| Superseded revision | минимум 365 дней от `superseded` | `superseded` timestamp |
| Hold | блокирует deletion независимо от срока | unmatched `hold` без `hold_release` |
| Tombstone | только намерение; bytes остаются | `tombstone` |
| Authorized deletion | требуется для каждой ref blob | `deletion_authorized(record_id)` |
| Physical deletion | только ноль live refs | `deletion_complete` для всех refs |
| Expected absence | удаление полностью доказано | complete deletion chain |
| Dangling | record есть, blob неожиданно отсутствует | alert `dangling_detected` |
| Orphan | blob есть, live record отсутствует | alert `orphan_detected`, manual review |

Registry rows не изменяются и не удаляются. Lifecycle ledger append-only и ссылается только
на существующий M2 `id`; вымышленные поля M2 не вводятся.

## Server, access и encryption

- Panel — единственный авторизатор; proxy проверяет M3 decision для каждого `read-ref`,
  `read-bytes` и `download` action отдельно; transport/download flow выбирает M6.
- External direct access к FD-1/FD-2/FD-3 запрещён storage policy; знание ref не даёт bytes.
- Все classes шифруются at rest; sensitive и standard используют разные key namespaces.
- Передача между внутренними domains защищена и аутентифицирована; transport выбирает M6.
- Audit хранит `record_id`, action, actor, timestamp, verdict, но не ref/path/key/raw bytes.

## Обязательные случаи

| Случай | Ожидаемое решение | Где проверяется | Вещдок |
|---|---|---|---|
| 1. Новый небольшой чек, capacity и quota в норме | ALLOW; write; `sha256+bytes` PASS; append M2 record | admission + post-write integrity | quota calculation, storage inventory, immutable registry row |
| 2. Collection quota превышена | DENY до write | quota ledger + admission | `U_c`, `logical_delta`, `Q_c`, deny verdict |
| 3. Primary проходит soft, затем hard watermark | soft alert; hard DENY | capacity gate | used ratio, alert, deny verdict |
| 4. Считанные sha256 или bytes не совпали | quarantine blob; DENY всех refs | integrity gate | expected/actual sha256 и bytes, quarantine event |
| 5. Sensitive PDF вне Git | sensitive namespace; encrypted; direct deny | class derivation + storage policy | M2 sensitive record, key namespace evidence, bypass test |
| 6. Primary failure | restore complete bundle в RPO/RTO | restore drill | complete marker, drill timings, zero mismatches |
| 7. Backup есть, restore не доказан | readiness FAIL | restore gate | отсутствие successful drill evidence |
| 8a. Superseded deletion при hold | DENY deletion независимо от срока | lifecycle reducer | hold без release, blocked deletion event |
| 8b. Superseded deletion до 365 дней без hold | DENY до истечения retention | lifecycle reducer + clock | `superseded` timestamp, calculated age `<365d`, deny event |
| 9. Ref известен, `read-bytes`/`download` нет / direct bypass | DENY | M3 per-action gate + storage policy | proxy deny и direct-access deny evidence |
| 10. Office VDS имеет 9.46 GiB free | migration NO-GO | zero-size G1 | measured free bytes и failed absolute predicate |

## Readiness gates

| Gate | PASS condition | Текущее честное состояние |
|---|---|---|
| G1 Capacity + quota | zero-size physical predicate PASS; versioned weights/quotas сходятся | office VDS FAIL; новый FD-1 не измерен |
| G2 Write/read/hash | test object round-trip, `sha256+bytes` PASS | не доказано |
| G3 Complete backup | independent FD-2 `complete.json` и все hashes PASS | не доказано |
| G4 Restore drill | full isolated restore, zero mismatch | не доказано |
| G5 Auth bypass | direct access DENY; M3 per-action checks PASS | не доказано для нового storage |
| G6 Reconciliation | zero unexplained dangling/orphan | не доказано |
| G7 RPO | `now-cut_at<=24h` | нет complete checkpoint |
| G8 RTO | measured formula `<=4h` для protected corpus | throughput/bound не измерены |
| G9 FD-3 | registry/lifecycle append, snapshot и restore PASS | новый FD-3 не provisioned |
| G10 Sensitive | encrypt/backup/decrypt round-trip и credential isolation PASS | не доказано |

Один FAIL или unknown блокирует production ingest и миграцию; NO-GO нельзя называть PASS.

## Список посылок

| Посылка | Маркировка |
|---|---|
| Affine — сменный движок под контейнером, не склад и не источник истины | ратифицированная норма M1 |
| `registry.jsonl` — истина регистрации, M2 record/lineage identity и истории | ратифицированная норма M2 |
| `canonicalRef` не URL/key; `location.kind/ref` обязательны; sensitive — отдельное поле | ратифицированная норма M2 |
| Panel — единственный авторизатор; `read-ref`, `read-bytes` и `download` проверяются раздельно | ратифицированная норма M3 |
| Office VDS имеет 9.46 GiB free при минимуме 12 GiB | измеренный факт |
| Каталог backup пуст; успешного restore нет | измеренный факт |
| В Affine 82 страницы и 57 служебных PNG/SVG, но нет корпуса чеков/PDF | измеренный факт |
| В публичном Git один чек; sensitive PDF партнёра вне repo без storage path | измеренный факт |
| До решения M4 нельзя увеличивать архив originals на office VDS | норма повестки M4 |
| Full hash, class-scoped dedup, shared-ref deletion, quota, cut marker и RPO/RTO constraints обязательны для carrier | норма повестки M4 |

## Definition of Done

- [x] Один вопрос S1 и один canonical carrier
- [x] Выбраны одна topology и независимые FD-1, FD-2, FD-3
- [x] M2 kind/ref, key, immutability, class-scoped dedup и integrity непротиворечивы
- [x] Sensitive isolation и direct bypass согласованы с M3
- [x] Capacity, container budget, collection quota и logical charge вычислимы
- [x] Complete checkpoint, restore, RPO/RTO formula и drill исполнимы
- [x] Active/superseded/backup retention, hold и shared-blob deletion определены
- [x] Десять случаев и десять readiness gates имеют машинные вещдоки
- [x] M5-M7 не решены
