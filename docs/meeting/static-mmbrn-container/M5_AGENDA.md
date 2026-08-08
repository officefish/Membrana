# M5 — роль Affine

> Заседание `static-mmbrn-container`, фаза M5. M1–M4 закрыты; M2–M4 ратифицированы:
> [`M1`](../../seanses/static-mmbrn-container-m1-boundary-2026-08-03.md) ·
> [`M2`](../../seanses/static-mmbrn-container-m2-identity-2026-08-03.md) ·
> [`M3`](../../seanses/static-mmbrn-container-m3-access-2026-08-04.md) ·
> [`M4`](../../seanses/static-mmbrn-container-m4-storage-2026-08-04.md).
> Общее задание: [`MEETING_BRIEF.md`](MEETING_BRIEF.md).

## Вопрос заседания

**F1 — назначьте один минимальный исполнимый контракт Affine как необязательной,
заменяемой человеческой поверхности под `static.mmbrn.tech`. Несущий вход M3 дословно:
`discover`, `read-metadata`, `read-ref`, `read-bytes`, `download`, `write-metadata`,
`upload-revision`, `manage-access`; объекты только container/collection/lineage, annotation
write disabled. Определите способности, классы состояния, независимо назначенный
`requiredProjectionSet`, переносимый binding и доказательство замены без потери адресов,
прав и значимого состояния. Выберите одну модель, дайте обязательные таблицы/cases и
readiness gates. Carrier —
`docs/seanses/static-mmbrn-container-m5-affine-role-2026-08-06.md`; второй носитель
запрещён. Список посылок обязателен. M6–M7 не решаются.**

## Закрытые посылки M1–M4

- `static.mmbrn.tech` — контейнер канонических оригиналов. Affine — сменный человеческий
  движок под ним, а не граница контейнера и не редактор стратегических документов.
- Страница Affine — состояние движка, не канонический материал. Оригиналы, записи
  управления и классификация материалов не зависят от выбранного движка.
- `registry.jsonl` — единственный источник истины о регистрации, record/lineage identity,
  заявленных полях и истории. `canonicalRef = "urn:mmbrn:static:" + rootId` идентифицирует
  lineage и не является URL, storage key или Affine id.
- Смена `location.ref` создаёт новую immutable M2 record в той же lineage. M5 не вправе
  переопределять M2 identity, поля или правила адресной поправки.
- Panel — единственный авторизатор. Proxy проверяет каждое классифицированное действие,
  актуальные версии и binding до обращения к Affine. Пользователь не получает native
  Affine role/token; статической таблицы `Panel role -> Affine role` нет.
- Нативная роль Affine принадлежит только внутренней service identity и является
  технической способностью, а не authority пользователя. Неизвестные action, object,
  identity или binding дают deny.
- M4 назначила отдельные FD-1/FD-2/FD-3 и M2-адрес
  `location.kind=local`, `location.ref=static:{class}:{sha256_64hex}`. Affine не входит в
  storage truth и не может стать источником bytes, retention или lifecycle.
- M1–M4 не выбрали API, transport, ingest/download workflow, preview/OCR pipeline, DNS или
  миграционный rollout.

## Измеренная фактура

- Живой Affine: 82 страницы в private Strategy/Templates/Releases, один участник, повторы
  и 57 PNG/SVG; корпуса оригиналов чеков/PDF нет. Это снимок, не таксономия M5.
- Strategic publish заморожен; редактор строится в Panel. Передачи Panel authority нет.
- M3 требует binding `canonicalRef <-> affineDocId`, но не назначил его владельца, форму,
  историю и переносимость.

## Обязательные решения

1. **Минимальные способности.** Выбрать закрытый vendor-neutral перечень человеческих
   способностей Affine. Для каждой способности указать Panel action из M3, входной объект,
   результат и допустимое состояние движка. «Полноценный редактор» без границы не является
   контрактом.
2. **Классы состояния.** Разделить как минимум canonical originals, registry/lifecycle,
   engine projection, navigation/layout, annotations/comments и cache/session state. Для
   каждого класса назначить source of truth, изменяемость, обязательность экспорта,
   переносимость и допустимость потери. Нельзя одновременно назвать состояние значимым и
   разрешить молча потерять его при замене движка.
3. **Одна модель binding.** Назначить один внешний по отношению к Affine binding ledger,
   его владельца и минимальную engine-neutral запись, связывающую `canonicalRef` с
   конкретным engine object. `affineDocId` не становится `canonicalRef`, `location.ref` или
   M2 record field. Создание, изменение, удаление и reconciliation binding оставляют
   историю, не мутируя M2 identity.
4. **Authority.** Сохранить M3 per-action check, version vector и fail-closed путь. Native
   Affine roles доступны только service identity. Panel deny сильнее Affine; пользователю
   нельзя выдать обходной credential.
5. **Заменяемость.** Точно назвать, что rehydrate-ится из M2/M4/binding/portable state, что
   строится заново, а что является честно disposable. Замена движка не меняет
   `canonicalRef`, M2 storage address, grants, policy versions или audit history.
6. **Degraded mode.** При недоступности Affine контейнер, registry, bytes и authority не
   исчезают. Назвать честно недоступные человеческие функции и запретить fallback, который
   обходит Panel или объявляет cache источником истины.
7. **Readiness.** Дать машинно проверяемые гейты до заявления «Affine заменяем»: полный
   inventory, однозначные bindings, отсутствие dangling/duplicate ownership, классификация
   состояния, экспорт переносимого состояния, rehydration drill, access-bypass test и
   доказательство отсутствия пользовательских native credentials.

## Обязательные поправки run1–run4

- Capability использует ровно восемь actions F1 над container/collection/lineage. Семантика
  M3 неизменна: `read-metadata` не возвращает ref, `read-ref` возвращает только ref,
  `write-metadata` создаёт новую immutable M2 record в той же lineage, `upload-revision`
  означает canonical revision. `manage-access` только owner-only: grants для него запрещены.
  Новые actions/objects запрещены; annotation write остаётся disabled.
- Любое обращение к Affine требует единственного актуального binding. Его отсутствие,
  неоднозначность или stale дают deny всех Affine actions. Прямое non-Affine чтение Panel
  вне M5 и не является исключением. Panel deny означает no-forward; native principals
  должны точно равняться service allowlist.
- Стратегический документ вне контейнера: Case 8 даёт unknown/out-of-container → deny без
  вымышленных class/M2 record. Запрещены file/bytes-through-Proxy, storage pipeline, UI,
  codes, API/route/endpoint, network trace и пошаговые export/import/deploy/rebuild flows.
  Таблица может назвать лишь логическое действие и класс результата. Preview M5 не решает.
- `requiredProjectionSet` независимо задаёт Panel intent. Обязательна тройная проверка:
  `refs(activeLedger) = requiredProjectionSet`,
  `engineIds(activeLedger) = liveEngineObjectSet`; mapping биективен. Deleted/stale/conflict
  rows и связанные только с ними objects не active.
- Binding — immutable event ledger. Event key содержит `(canonicalRef, engineKind,
  engineObjectId)`, `seq` уникален в объявленном stream, `eventType` обязателен. Полностью
  заданы create/replace/delete/stale/conflict/reconcile events; delete/conflict называют
  точные engine ids и seq. Status — reducer output; stored row не мутирует.
- Binding и значимые annotations живут вне движка, но не наследуют FD-3 автоматически.
  Назвать durable owner и численные backup/RPO, retention, restore/RTO thresholds с полями
  evidence. При отсутствии измеренного доказательства readiness честно даёт NO-GO; M4
  topology не меняется и недоказанная живучесть не отмечается выполненной.
- Annotation contract задаёт stable id и version scope, Panel principal автора, canonical
  JSON serialization (UTF-8, порядок ключей/элементов, newline/body normalization), content
  hash и engine-neutral anchor к canonical revision hash и byte/structural span без
  предположения о preview segmentation. Gate требует двустороннее set+hash equality:
  portable store = engine export = rehydrated state; waiver запрещён.
- State labels совпадают с predicates; rehydration заново доказывает annotations и
  биекцию. Cases/readiness наследуют все deny и NO-GO выше, а не объявляют успех по counts.
- `## Список посылок` содержит только входные нормы/факты. Meta, self-count и заявления
  аудитора запрещены. Ролевой пункт DoD остаётся `[ ]` для внешнего аудита; carrier не
  закрывает его сам. DoD — последняя секция, после неё нет текста или footer.

## Обязательные случаи

Итоговая таблица имеет колонки `Случай`, `Ожидаемое решение`, `Источник истины`,
`Вещдок` и включает не меньше десяти строк:

1. Affine недоступен, но metadata, `location.ref` и bytes существуют независимо;
2. Affine удалён и заменён другим движком без смены canonicalRef, address и grants;
3. `affineDocId` изменился при том же материале: binding получает историю, M2 identity не
   мутирует;
4. native Affine reader существует, но Panel запрещает requested action;
5. Panel разрешает action, а native user role его не умеет: работает только service
   identity, пользователю credential не выдаётся;
6. binding отсутствует, неоднозначен или stale;
7. две импортированные страницы претендуют на один canonicalRef;
8. попытка редактировать стратегический документ через Affine;
9. перед заменой найдено несинхронизированное значимое annotation/comment state;
10. cache/session/layout state потеряно после замены и заранее классифицировано как
    disposable либо переносимое.

## Обязательные таблицы вердикта

- **Способности:** capability, M3 action, input identity, output, allowed engine mutation,
  forbidden authority.
- **Состояние:** state class, owner/source of truth, canonical/derived, portable/disposable,
  export/rebuild rule, loss consequence.
- **Binding:** owner, key, engine kind/id, status/version/history, reconciliation rule;
  использовать только реально назначенные M5 поля, не выдавать их за поля M2.
- **Случаи:** по форме выше.
- **Readiness:** gate, machine predicate, evidence, fail result.

## Границы комнаты

- Не проектировать M6: endpoints, HTTP-коды, routes, request/response schema, upload,
  download, preview/OCR, signed URL, TTL, hash pipeline или транспорт.
- Не исполнять M7: DNS/Caddy, домены, redirects, inventory migration, перенос 82 страниц,
  production rollout, issue/PR или изменение live services.
- Не проектировать второй интерфейс и не возвращать Affine роль стратегического редактора;
  Panel editor остаётся отдельным продуктом.
- Не превращать текущие Strategy/Templates/Releases в обязательную таксономию, не
  канонизировать дубли и не объявлять текущие 82 страницы материалами контейнера.
- Не изобретать поля M2, не менять M3 authority и не включать Affine в M4 storage truth.
- M5 определяет контракт и критерии заменяемости, но не выбирает следующий движок и не
  выполняет миграцию.

## Требования к обсуждению и форме

- Не меньше 36 предметных ролевых реплик и не меньше шести от каждой из шести ролей:
  Архитектор, Teamlead, Структурщик, Математик, Верстальщик, Музыкант.
- Реплики развивают решение, а не повторяют повестку; self-count, meta и заявления
  аудитора запрещены.
- Одна пропозиция F1, один verdict и один carrier. Альтернативы допустимы в обсуждении, но
  итог обязан выбрать одну модель.
- `Список посылок` расположен после решения и до DoD; в нём закрытые нормы, измеренные
  факты и нормы этой повестки не смешиваются с выводами M5.
- `Definition of Done` — последняя секция и последняя содержательная часть carrier. `[x]`
  ставится только для действительно выполненного пункта.

## Definition of Done

- [ ] Выбран один минимальный vendor-neutral контракт Affine
- [ ] Способности, классы состояния и binding описаны обязательными таблицами
- [ ] Источники истины M2/M4 и authority M3 не переданы Affine
- [ ] Значимое переносимое и допустимо disposable состояние разведены без скрытой потери
- [ ] Десять обязательных случаев имеют ожидаемое решение и вещдок
- [ ] Readiness gates машинно проверяемы и включают rehydration и access bypass
- [ ] M6–M7 и стратегический редактор не спроектированы
- [ ] Один carrier, один F1, список посылок до последней секции DoD
- [ ] Не меньше 36 ролевых реплик и не меньше шести от каждой роли
