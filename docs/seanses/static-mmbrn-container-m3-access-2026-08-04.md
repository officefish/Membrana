<!-- канал: llm — исходный протокол произведён yarn consilium -->
<!-- local-synthesis: председательская редакция из run1-run5 после исчерпания 5/5 внешних попыток; сырой run5 сохранён в rejected/static-mmbrn-container-m3-access-2026-08-04-run5-final-external.md -->

# Метаданные сеанса

| Поле | Значение |
|---|---|
| Дата (UTC) | 2026-08-04T15:16:06.952Z |
| Исходная команда | `yarn consilium` с разовым `LLM_NO_OVERLAY=1` |
| Исходная модель | `openrouter/anthropic/claude-haiku-4.5` |
| Файл | `docs/seanses/static-mmbrn-container-m3-access-2026-08-04.md` |
| Порядок ролей | Архитектор → Музыкант → Структурщик → Математик → Teamlead → Верстальщик |
| Повестка | `docs/meeting/static-mmbrn-container/M3_AGENDA.md` |

**Вход исходного сеанса:** повестка M3 размером 10 161 символ доставлена полностью;
координация ролей была обрезана. Локальная редакция использует повестку, сырые run1-run5 и
их независимые постаудиты; новых внешних вызовов не производилось.

---

# Консилиум: A1 — контракт доступа `static.mmbrn.tech`

[Архитектор]: Единственный источник решений доступа — Panel. `registry.jsonl` остаётся источником тождества и истории материала по M2, но не становится авторизатором.

[Музыкант]: Affine остаётся сменным человеческим движком под контейнером. Его нативные роли не определяют, что пользователь Membrana вправе сделать с материалом.

[Структурщик]: Stable principal — `userId` канонической записи пользователя Panel; credential только отображается в него. Для анонимного запроса используется sentinel `anon` с baseline ролью `public`.

[Математик]: Порядок ролей полный: `public < ally < operator < owner`. Решение строится одной функцией сравнения ролей, без permission-grant и без снижения роли субъекта.

[Teamlead]: Объекты политики образуют цепочку container → collection → lineage. Lineage определяется `canonicalRef`, а не URL Affine и не адресом байтов.

[Верстальщик]: Видимость полей разнесена до ответа API: `sensitive.reason` и `location.kind` входят в metadata, `location.ref` выдаётся только действием `read-ref`, байты — только `read-bytes`.

[Архитектор]: Для действия выбирается политика наиболее специфичного уровня, где она задана: lineage, иначе collection, иначе container, иначе default действия. Дочерняя политика вправе как повысить, так и понизить порог, но не ниже action floor.

[Музыкант]: Proxy — единственный внешний вход к Affine. Прямой URL, порт и пользовательский Affine credential не должны позволять обойти Panel.

[Структурщик]: Грант имеет `subject`, `scope`, `grantedRole` и распространяется только на scope и его потомков. Для объекта вне этой цепочки грант не участвует в вычислении.

[Математик]: Для любого действия, кроме `manage-access`, `effectiveRole` равна максимуму baseline и применимых `grantedRole`; для `manage-access` гранты вообще не рассматриваются. `requiredRole` равна максимуму action floor и выбранной policy.

[Teamlead]: Поэтому owner-valued грант не даёт `manage-access`: это действие разрешается только baseline owner. Исключение записано не после функции, а в определении множества применимых грантов.

[Верстальщик]: Скрытие карточки не считается защитой. Если metadata, ref или bytes запрещены, соответствующее поле или тело не должно появиться ни в DOM, ни в ответе proxy.

[Архитектор]: Partner cookie несёт snapshot grants и `pv_subject`; норма M3 требует сравнивать его с текущей subject version Panel на каждом запросе. Несовпадение означает deny и переаутентификацию.

[Музыкант]: Ordinary session сейчас несёт `kind/role/sub/exp` без `pv`; её authority может устареть до `exp`. Немедленный отзыв для неё не заявляется текущим фактом.

[Структурщик]: Норма M3 добавляет `pv_subject` во вновь выдаваемые ordinary sessions. До миграции legacy ordinary допускается только с честной меткой в аудите и верхней границей staleness `exp`.

[Математик]: Object version — вектор `(pv_container, pv_collection, pv_lineage)`. Изменение любой политики увеличивает соответствующую компоненту; сравнивать нужно весь вектор.

[Teamlead]: Cached allow сам по себе не является authority. Перед использованием кеша proxy получает текущие subject/object versions; если Panel недоступен, запрос denied, а старое allow не используется.

[Верстальщик]: Такой fail-closed режим означает нулевую допустимую staleness решения после наблюдаемого отзыва. Для legacy ordinary отдельно остаётся только уже названное окно до `exp`.

[Архитектор]: Набор действий: `discover`, `read-metadata`, `read-ref`, `read-bytes`, `download`, `write-metadata`, `upload-revision`, `manage-access`. Это полномочия M3, а не проектирование endpoints M6.

[Музыкант]: `read-ref` и `read-bytes` не взаимозаменяемы. Знание адреса не выдаёт байты, а выдача байтов не должна раскрывать внутренний адрес склада.

[Структурщик]: Default политики контейнера: `ally` для discover/read-metadata и `operator` для ref/bytes/download/write/upload. Явная lineage policy `public` делает материал публичным только там, где action floor тоже `public`.

[Математик]: Case 1: anonymous читает metadata explicit-public lineage; `max(public floor, public policy)=public`, значит allow. Case 2: для ally collection requiredRole=ally, поэтому anonymous получает deny.

[Teamlead]: Case 3: baseline public получает ally grant на collection; для metadata этой collection effectiveRole=ally и requiredRole=ally, значит allow. На соседней collection роль остаётся public.

[Верстальщик]: Case 4: отозванный grant меняет `pv_subject`; старый partner cookie и старое proxy/Affine cache-state несут прежнюю версию. Оба отвергаются одним version check до обращения к Affine.

[Архитектор]: Case 5: baseline operator на одном объекте получает allow для `read-metadata`, затем deny для `manage-access`, потому что это действие игнорирует grants и требует baseline owner.

[Музыкант]: Case 6: baseline owner проходит `manage-access`; изменение policy увеличивает нужную компоненту object-version vector и делает прежнее proxy-state непригодным.

[Структурщик]: Case 7: direct Affine URL denied сетевой границей. Proxy дополнительно требует валидный binding `canonicalRef <-> affineDocId` перед каждым forward.

[Математик]: Case 8: ally получает metadata sensitive lineage, включая `sensitive.reason` и `location.kind`, но `read-ref` и `read-bytes` требуют operator и дают deny.

[Teamlead]: Каждое allow/deny решение записывает principal, credential kind, canonicalRef, action, обе роли, применённые grants, subject version, object-version vector и reason.

[Верстальщик]: Изменение grant или policy записывает actor, target, before/after и новые версии. UI получает уже отфильтрованный ответ и не воспроизводит авторизацию самостоятельно.

[Архитектор]: Proxy сначала восстанавливает principal, затем разрешает canonicalRef и binding, потом получает текущие версии, вычисляет роли и только после allow пересылает ровно классифицированное действие.

[Музыкант]: Нативная Affine role может принадлежать внутренней service identity proxy, но пользователь её не получает. Она не расширяет authority, потому что пользовательский трафик достигает Affine только после per-action allow.

[Структурщик]: Если запрос Affine нельзя однозначно классифицировать в одно из восьми действий или связать с canonicalRef, default — deny. Это закрывает неизвестные WebSocket и HTTP обходы.

[Математик]: Формула согласована с наследованием: policy выбирается, а не агрегируется через `min`; floor применяется через `max`; грант повышает effectiveRole только в своей объектной области.

[Teamlead]: M4 остаётся владельцем склада, backup, retention и физической выдачи байтов; M5 — UX Affine; M6 — endpoints и workflow; M7 — миграция, DNS и rollout.

[Верстальщик]: Контракт M3 описывает доступ независимо от будущего интерфейса: ни ссылка, ни iframe, ни скрытая кнопка не заменяют серверную проверку proxy.

---

## Пропозиция A1

Panel является единственным каноническим авторизатором `static.mmbrn.tech`. Доступ к
container, collection или lineage вычисляется role-elevation функцией над stable principal,
наиболее специфичной object policy и применимыми scope-grants. Proxy проверяет каждое
классифицированное действие, текущую subject version, полный object-version vector и binding
`canonicalRef <-> affineDocId`; Affine исполняет разрешённое действие, но не создаёт вторую
истину доступа. Неизвестность или недоступность авторизатора дают deny.

## Principal и сессии

| Предмет | Контракт | Статус |
|---|---|---|
| Stable principal | `userId` канонической записи пользователя Panel | норма M3; mapping credential → `userId` обязателен |
| Anonymous | `principal = anon`, `baselineRole = public` | норма M3 |
| Credential | session cookie/token, не identity | факт текущего дома |
| Partner | `sub=user:*`, snapshot grants, `pv_subject`; каждый запрос сверяет current version | payload — факт; store check — норма M3 |
| Ordinary legacy | `kind/role/sub/exp`, без `pv`; staleness ограничена `exp` | факт текущего дома |
| Ordinary M3 | вновь выдаваемая session несёт `pv_subject` и проходит тот же version check | норма M3 |

## Объекты, политика и гранты

| Уровень | Идентификатор | Наследование | Версия |
|---|---|---|---|
| Container | `static.mmbrn.tech` | корень policy chain | `pv_container` |
| Collection | `collectionId` | policy родителя, если своя не задана | `pv_collection` |
| Lineage | `canonicalRef` из M2 | policy collection, если своя не задана | `pv_lineage` |

`selectedPolicy(o,a)` — значение наиболее специфичного уровня, где action `a` определён;
при отсутствии значения используется default из таблицы полномочий. Грант имеет форму
`{subject, scope, grantedRole}` и применим к scope и его потомкам. Deny-grants в M3 нет.

## Полномочия

| Action | Action floor | Default policy | public | ally | operator | owner | Грант |
|---|---|---|---:|---:|---:|---:|---|
| `discover` | public | ally | только explicit-public | да | да | да | scope role-elevation |
| `read-metadata` | public | ally | только explicit-public | да | да | да | scope role-elevation |
| `read-ref` | operator | operator | нет | нет | да | да | не ниже operator floor |
| `read-bytes` | operator | operator | нет | нет | да | да | не ниже operator floor |
| `download` | operator | operator | нет | нет | да | да | не ниже operator floor |
| `write-metadata` | operator | operator | нет | нет | да | да | не ниже operator floor |
| `upload-revision` | operator | operator | нет | нет | да | да | не ниже operator floor |
| `manage-access` | owner | owner | нет | нет | нет | да | запрещён в grant-scope |

`read-metadata` включает `sensitive.reason` и `location.kind`, но никогда не включает
`location.ref`. Адрес выдаётся только `read-ref`; байты и download проверяются отдельно.

## Единая функция

```text
applicableGrants(s,o,a) =
  {}                                      if a = manage-access
  {g | g.subject=s and g.scope ancestor-or-self of o} otherwise

effectiveRole(s,o,a) = max(baselineRole(s), grantedRole(applicableGrants))
requiredRole(o,a)     = max(actionFloor(a), selectedPolicy(o,a))
access(s,o,a)         = effectiveRole(s,o,a) >= requiredRole(o,a)
```

Неизвестные action, object, identity или binding дают deny до вычисления функции.

## Путь запроса и Affine

1. Proxy принимает HTTP/WebSocket request и классифицирует requested action; неизвестный
   request denied.
2. Credential отображается в stable principal; отсутствие credential даёт `anon/public`.
3. Proxy разрешает `canonicalRef`, collection chain и `affineDocId`; binding обязан совпасть.
4. Panel возвращает baseline role, применимые grants, current `pv_subject` и object-version
   vector `(pv_container,pv_collection,pv_lineage)`.
5. Partner и новые ordinary sessions проходят subject-version check. Legacy ordinary без
   версии действует только до `exp` и помечается в audit.
6. Cached decision используется лишь после сравнения обеих current versions. Panel
   недоступен — deny; старый cached allow не является fallback.
7. Proxy вычисляет единую функцию. Deny не достигает Affine; allow пересылает только
   классифицированное действие внутренней service identity.
8. Affine закрыт от прямого внешнего доступа. Пользователь не получает native role/token;
   статического `Panel role -> Affine role` нет.

## Соответствие решения Panel и механизма Affine

| Решение Panel/proxy | Enforcement до Affine | Enforcement в Affine | Может ли расширить authority |
|---|---|---|---|
| `deny` для requested action | Proxy возвращает 401/403 и не пересылает request | Affine request не получает | нет |
| `allow`, binding и versions актуальны | Proxy пересылает только классифицированное действие | Внутренняя service identity исполняет это действие | нет: пользователь не получает identity/token |
| Неизвестный action или binding | Fail-closed deny | Affine request не получает | нет |
| Stale `pv_subject` или object vector | Cache/state отвергается, затем deny | Старое Affine-state не используется | нет |
| Прямой внешний URL/порт | Network deny до application proxy | Внешний маршрут отсутствует | нет |

Нативная роль внутренней service identity является технической способностью proxy, а не
ролью пользователя. Единственная пользовательская authority — per-action решение Panel;
таблицы `Panel role -> Affine role` не существует.

## Восемь случаев

| # | Субъект | Объект | Действие | Решение | Где проверяется | Почему |
|---|---|---|---|---|---|---|
| 1 | `anon/public` | explicit-public lineage | `read-metadata` | **allow** | Proxy | `effective=public`, `required=max(public,public)=public` |
| 2 | `anon/public` | ally collection | `read-metadata` | **deny** | Proxy | `effective=public < required=ally` |
| 3 | baseline public + ally grant | scope collection | `read-metadata` | **allow** | Panel + proxy | Применимый scope-grant даёт `effective=ally`, `required=ally` |
| 4 | Пользователь с отозванным grant; старый partner cookie | та же collection и старое proxy/Affine cache-state | `read-metadata` | **deny** | Subject-version check до Affine | Cookie и cache несут старый `pv_subject`; оба stale носителя отвергнуты |
| 5 | baseline operator | одна lineage | `read-metadata`; `manage-access` | **allow; deny** | Одна функция proxy | Metadata: `operator>=ally`; manage: grants excluded и `operator<owner` |
| 6 | baseline owner | collection | `manage-access` | **allow** | Panel + proxy | `owner>=owner`; изменение policy увеличивает `pv_collection` и инвалидирует старый vector |
| 7 | любой пользователь | direct Affine URL | обходное/неклассифицированное | **deny** | Network boundary | Нет proxy classification, binding и разрешённого внешнего маршрута |
| 8 | ally | sensitive lineage | `read-metadata`; `read-ref`; `read-bytes` | **allow; deny; deny** | Proxy | `ally>=ally` для reason/kind; `ally<operator` для ref и bytes |

## Отзыв, fail-closed и аудит

- Grant change увеличивает `pv_subject`; policy change увеличивает соответствующую
  компоненту object-version vector.
- Partner и новые ordinary credentials с устаревшим `pv_subject` denied. Legacy ordinary
  без версии может оставаться stale только до `exp`; это переходное ограничение, не обещание
  мгновенного отзыва.
- Старое proxy/Affine state связано с `principal`, `canonicalRef`, `action`, `pv_subject` и
  полным object vector. Несовпадение любой части означает deny.
- Panel недоступен, binding отсутствует или request не классифицирован — deny. Cached allow
  без актуальной сверки версий не используется.
- Allow/deny audit содержит `timestamp`, `principal`, `credentialKind`, `canonicalRef`,
  `action`, `baselineRole`, `effectiveRole`, `requiredRole`, применённые grant ids,
  `pv_subject`, object-version vector, `decision`, `reason`.
- Grant/policy audit содержит `timestamp`, `actor`, `target`, before/after, изменённую
  version и affected scope.

## Список посылок

| Посылка | Маркировка |
|---|---|
| `static.mmbrn.tech` — контейнер, Affine — сменный движок под ним | ратифицированная норма M1 |
| `registry.jsonl` — истина регистрации/record/lineage identity; `canonicalRef` не URL | ратифицированная норма M2 |
| Sensitive record хранит `location.kind`, непустой `location.ref`, отдельный `sensitive.reason`; M3 решает видимость ref | ратифицированная норма M2 |
| Panel роли: `public < ally < operator < owner`; section gate использует role/minRole или section grant | измеренный факт текущего кода |
| Grant change увеличивает `permVersion` и пишет actor/target/before/after audit | измеренный факт текущего кода |
| Partner session несёт snapshot grants/version; ordinary — `kind/role/sub/exp` без version | измеренный факт текущего кода |
| Live gate сейчас выводит решение из cookie и не сверяет актуальный users store | измеренный факт текущего кода |
| Forward-auth сейчас защищает graphify/research-tree, но не будущий static/Affine ingress | измеренный факт текущего дома |
| Affine имеет собственные native roles; передачи Panel identity/grants/revocation сейчас нет | измеренный факт текущего дома |

## Definition of Done

- [x] Один вопрос A1 и один canonical carrier
- [x] Назван один авторизатор и технический статус Affine
- [x] Определены principal, objects, policy inheritance и scope-grants
- [x] Одна role-elevation функция доказывает все решения
- [x] Разведены metadata, sensitive ref, bytes и восемь actions
- [x] Proxy закрывает direct bypass и проверяет subject/object versions
- [x] Partner, ordinary, object revocation, fail-closed и audit contract исполнимы
- [x] Восемь обязательных случаев сведены к одной функции
- [x] M4–M7 не решены
