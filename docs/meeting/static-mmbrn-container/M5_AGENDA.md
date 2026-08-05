# M5 — роль Affine

> Заседание `static-mmbrn-container`, фаза M5. M1–M4 закрыты; M2–M4 ратифицированы:
> [`M1`](../../seanses/static-mmbrn-container-m1-boundary-2026-08-03.md) ·
> [`M2`](../../seanses/static-mmbrn-container-m2-identity-2026-08-03.md) ·
> [`M3`](../../seanses/static-mmbrn-container-m3-access-2026-08-04.md) ·
> [`M4`](../../seanses/static-mmbrn-container-m4-storage-2026-08-04.md).
> Общее задание: [`MEETING_BRIEF.md`](MEETING_BRIEF.md).

## Вопрос заседания

**F1 — назначьте один минимальный исполнимый контракт Affine как необязательной,
заменяемой человеческой поверхности под `static.mmbrn.tech`: какие способности он даёт,
какое состояние вправе хранить, где живёт переносимая привязка материала к состоянию
движка и какими инвариантами и вещдоками доказывается замена Affine без потери адресов,
прав и значимого пользовательского состояния. Вердикт должен выбрать одну модель
переносимости, дать таблицу способностей и классов состояния, доказать обязательные случаи
и назвать измеримые readiness gates. Carrier —
`docs/seanses/static-mmbrn-container-m5-affine-role-2026-08-05.md`; второй носитель
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

- Живой Affine содержит 82 страницы в трёх private workspaces: Strategy, Templates и
  Releases; участник один. Это снимок текущего дома, а не желаемая таксономия M5.
- В Affine есть повторные imports и 57 PNG/SVG, но нет доказанного корпуса оригиналов чеков
  и внешних PDF. Наличие страницы не доказывает регистрацию материала.
- Публикация стратегических документов в Affine заморожена машинным гейтом. Собственный
  редактор стратегических документов строится в Panel и остаётся вне `static.mmbrn.tech`.
- Affine умеет native workspace/document roles `owner`, `manager`, `editor`, `commenter`,
  `reader`, но передачи Panel identity, grants и revocation в текущем доме нет.
- Ратифицированный M3 уже требует binding `canonicalRef <-> affineDocId` перед forward, но
  ещё не назначил владельца, форму, историю и переносимость binding.

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
   историю и не мутируют M2 identity.
4. **Authority.** Сохранить M3 per-action check, version vector и fail-closed путь. Native
   Affine roles доступны только service identity, не пользователю. Panel deny сильнее
   возможности Affine; техническое native deny не может быть обойдёно выдачей пользователю
   отдельного credential.
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

## Обязательные поправки run1–run2

- Capability использует только восемь дословных M3 actions и сохраняет их предмет. Каждый
  action проверяется отдельно: `read-metadata` не включает `read-ref`. Запрещено применять
  action к новому policy object (например annotation) или превращать `upload-revision` в
  обновление проекции. Неразрешимая способность остаётся disabled, неизвестный action — deny.
- Стратегический документ находится вне контейнера: Case 8 даёт unknown/out-of-container
  object → deny, без вымышленных strategic class или M2 record.
- Запрещены IMPORT, file/bytes flow, codes, API, URL/route, response body, transport и
  пошаговые export/import/deploy/rebuild pipelines. M5 задаёт predicates и свойства
  evidence, не M6/M7 workflow. `canonicalRef` — URN, не URL; bytes FD-1, backup FD-2,
  registry/lifecycle FD-3. Судьбу preview/rendering M5 не решает.
- Назначить `requiredProjectionSet`, не весь registry, и доказать биекцию с active engine
  objects: оба конца существуют, уникальны в обе стороны, лишних/unbound объектов нет.
- Для event ledger дать полный reducer transition contract, scope версии, stale и
  reconciliation. Evidence различает immutable events и reducer output; старые строки не
  «получают» status. Иная модель обязана дать столь же однозначную историю.
- Binding и значимые annotations живут вне движка, но M5 не объявляет их новыми FD-3 stores
  без доказанных backup, retention и restore. Назвать durable ownership boundary и gate
  живучести, совместимый с M4, не меняя M4 topology.
- Annotation contract содержит stable id/version, Panel principal автора, canonical
  serialization/content hash и engine-neutral anchor. Gate требует точное равенство
  portable store, engine export и rehydrated state; unresolved diff не снимается waiver.
- State-table labels согласованы с predicate; rehydration доказывает annotations и биекцию
  bindings/projections нового движка. Native identities равны полному service allowlist;
  evidence задано свойством, не API.
- `## Список посылок` содержит только входные нормы/факты. Meta/self-count запрещены;
  ролевой пункт DoD оставляется внешнему аудиту. После DoD текста нет.

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
