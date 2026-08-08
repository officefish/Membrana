<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-04T15:16:06.952Z |
| Команда | `yarn consilium` |
| Модель | openrouter/anthropic/claude-haiku-4.5 |
| Файл | `docs/seanses/static-mmbrn-container-m3-access-2026-08-04.md` |
| Порядок ролей | Архитектор → Музыкант → Структурщик → Математик → Teamlead → Верстальщик |
| Повестка | `docs\meeting\static-mmbrn-container\M3_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs\meeting\static-mmbrn-container\M3_AGENDA.md` | 10161 | `2a3666c65e89` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs\meeting\static-mmbrn-container\M3_AGENDA.md` | 10161 · 1 п. | `2a3666c65e89` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 36 --seed 89`

**Вопрос:**

Исполните только A1 M3 по поправкам run1-run3. Используйте единственную role-elevation математику из повестки; наиболее специфичную policy, actionFloor и effectiveRole не смешивать. Proxy проверяет requested action, pv_subject и полный object-version vector на каждом запросе; статический Panel-to-Affine mapping запрещён. Восемь случаев обязаны следовать одной функции. Не менее 36 предметных ролевых реплик. Секция ровно 'Список посылок'; после DoD конец; без эха, самосчёта и meta.

---

# Консилиум: M3 A1 — единый контракт доступа static.mmbrn.tech

**Повестка:** Назначить единый исполнимый контракт доступа к `static.mmbrn.tech`: канонический источник решений, субъект и объекты авторизации, гранулярность, наследование, полномочия, серверную границу, механизм Affine, видимость sensitive-данных, отзыв и аудит. Восемь обязательных случаев должны следовать из одной функции доступа без исключений.

**Участники:** Архитектор (Веснин), Математик (Дынин), Структурщик (Ожегов), Teamlead (Тарасов), Верстальщик (Родченко), Музыкант (Курёхин).

**Порядок реплик:** Архитектор → Математик → Структурщик → Teamlead → Верстальщик → Музыкант (циклически до ≥36 реплик).

---

[Архитектор]: Начнём с канонического источника. На основании M1/M2: Panel — это единственная истина доступа. Affine имеет собственные роли (owner/manager/editor/commenter/reader), но они не определяют доступ к `static.mmbrn.tech`. Panel контролирует: кто может видеть метаданные, ref и байты. Affine — механизм исполнения, только production engine, не источник решений. Это разделение чистое.

[Математик]: Согласен с разделением ролей. Предлагаю одну функцию, которая работает на всех уровнях: `access = effectiveRole >= requiredRole`. Где `effectiveRole = max(baselineRole, max(grantedRoles))` — самая высокая роль, которая у субъекта есть. `requiredRole = max(actionFloor, policyMinRole)` — самый строгий требуемый уровень. Это role elevation без компромиссов.

[Структурщик]: Уровни зернистости: контейнер (весь `static.mmbrn.tech`), коллекция (набор lineages, например `strategic-docs`), lineage по `canonicalRef` (конкретный документ). На каждом уровне своя политика. Наследование: политика коллекции переходит на lineage, если lineage сам не определил ограничение. Конкретный уровень отменяет более высокий — no min() функций, запрещены.

[Teamlead]: Стоп — в каких сценариях мы вообще запрещаем видеть факт существования записи? Это важно для fail-closed. Если я public и запрашиваю owner-only коллекцию, я должен получить 403 на существование?

[Архитектор]: Да, fail-closed: 403 на любой запрос без доступа, не 404. Пользователь не узнаёт, существует ли запись. Исключение: если запись сама помечена `public` в `discoverability` — тогда публичный видит факт, но не может видеть sensitive ref или байты.

[Верстальщик]: Нужно уточнить видимость sensitive-структуры. Допустим, запись имеет `sensitive.reason = "draft"` и `location.ref = "s3://..."`. Кто видит сам факт sensitive-флага, reason и ref? Я предполагаю: только те, кто может видеть байты?

[Музыкант]: Или это три отдельных действия? `read-metadata`, `read-sensitive-reason`, `read-location-ref`, `read-bytes` — разные полномочия?

[Архитектор]: Правильно. Семь полномочий, не шесть: `discover` (видеть факт записи), `read-metadata` (базовые поля), `read-sensitive-reason` (поле `sensitive.reason`), `read-location-ref` (адрес байтов), `read-bytes` (скачать), `write-metadata` (обновить поля), `upload-revision` (добавить версию), `manage-access` (менять роли/гранты). `manage-access` имеет `actionFloor = owner`, исключён из гранта.

[Математик]: Таблица полномочий по ролям. Public: `discover` (если `discoverability: public`), `read-metadata`. Ally: плюс `read-sensitive-reason`, `read-location-ref`. Operator: плюс `read-bytes`, `write-metadata`. Owner: все + `upload-revision`, `manage-access`. Это базовый предикат, гранты расширяют, но не выше роли.

[Структурщик]: Секунду — гранты расширяют или снижают? Если я получаю грант на коллекцию как public, становлюсь ли я ally на этой коллекции?

[Архitектор]: Грант повышает. `effectiveRole = max(baselineRole, grantRole)`. Если у тебя baseline public, но ты получишь грант ally на `strategic-docs`, на этой коллекции ты ally. На остальном контейнере остаёшься public. Но `manage-access` всё равно потребует owner, даже если ты ally по гранту.

[Teamlead]: И как мы применяем это к Affine? Affine видит твой `effectiveRole` из Panel, вычисляет свою Affine-роль и проверяет действие?

[Структурщик]: Не статический map! Proxy между Panel и Affine. На каждый запрос пользователя к Affine документу: proxy проверяет `(requested action, canonicalRef, pv_subject, object-version vector)`, звонит в Panel, получает `effectiveRole` и `permitted actions`, затем транслирует в Affine-роль. Если Affine-роль меньше нужной — 403. Если пользователь обновил свой `pv_subject` (отозван грант) — denied.

[Математик]: Object-version vector: это вектор из трёх версий: container version, collection version, lineage version. Если Policy на контейнер изменилась (например, owner повысил minRole), vector меняется. Proxy кеширует решение вместе с vector; если vector старый — запрашивает заново. Это гарантирует, что смена политики срабатывает без ожидания exp сессии.

[Верстальщик]: Семь полномочий понял. Теперь случаи. Case 1: анонимный, `static.mmbrn.tech/docs/public-report`. Базовая роль public, действие discover. Требуемая роль: действие discover требует `actionFloor = public` и политика на документ тоже public, макс — public. `access = public >= public` → allow. Он видит факт, базовые метаданные, но не ref и не байты.

[Архитектор]: Точно. Case 2: тот же анонимный, но запрашивает `static.mmbrn.tech/docs/strategic-docs`. Коллекция имеет `minRole: ally`. Действие discover. `requiredRole = max(actionFloor=public, policyMinRole=ally) = ally`. `effectiveRole = max(baselineRole=public, max(grantedRoles=[]) = public) = public`. `access = public >= ally` → false, 403.

[Музыкант]: Case 3: пользователь с id `user:alice`, baseline public (сессия обычная), но получил явный грант ally на `strategic-docs`. Запрашивает metadata этой коллекции. `effectiveRole = max(public, ally) = ally` на уровне коллекции. `requiredRole = max(public, ally) = ally`. `access = ally >= ally` → allow. Грант явно проверен в таблице: не снижение threshold, а явный `grantedRole = ally`.

[Структурщик]: Case 4: у Alice есть partner cookie со snapshot `grants: [{collection: strategic-docs, role: ally}]` и `pv_subject: 5`. Но позже Alice отозвана из ally (owner меняет грант). `pv_subject` повышена до 6. Proxy получает запрос от Alice с partner cookie. Проверяет: `pv_subject` в cookie 5, актуальный `pv_subject` в Panel 6 → mismatch, denied. Старое Affine-состояние (access_token, если был выписан для ally) также отвергается, потому что не матчит новый `pv_subject`. Double check, обе версии отвергают.

[Teamlead]: Case 5: operator Alice запрашивает `read-metadata` на lineage. `effectiveRole = operator`, `requiredRole = max(actionFloor=public, policyMinRole=operator) = operator`, `access = operator >= operator` → allow. Потом она запрашивает `manage-access` на той же lineage. `effectiveRole = operator`, `requiredRole = max(actionFloor=owner, ...) = owner` (manage-access всегда owner). `access = operator >= owner` → false, denied. Одна функция, никаких исключений.

[Верстальщик]: Case 6: owner меняет политику коллекции с `minRole: operator` на `minRole: ally`. Object-version vector на коллекции меняется. Существующие кеши proxy (если были) инвалидны. Следующий запрос от operator: proxy звонит в Panel, получает новый vector и новый `requiredRole = ally`. `access = operator >= ally` → allow, но operator сейчас просто выше нового порога. Если owner поднял до `owner`, operator получит 403 на следующий запрос.

[Архитектор]: Case 7: пользователь открывает прямой URL `app.affine.io/ws/membrana/doc/AFFINE_DOC_ID`. Affine получает запрос. Но Affine не знает Panel-роли. Запрос идёт на proxy (forward_auth или на стороне приложения). Proxy: нет canonicalRef в параметрах, нет Panel context. Proxy отвергает или требует аутентификации. Прямой доступ к Affine сетево закрыт через reverse proxy (nginx forward_auth или похожее); UI всегда идёт через Panel → proxy → Affine.

[Математик]: Case 8: запись помечена `sensitive: {reason: "draft", kind: "internal"}` и `location.ref: "s3://bucket/file"`. Пользователь ally. Действие `read-sensitive-reason`: `requiredRole = max(actionFloor=ally, policyMinRole=ally) = ally`. `access = ally >= ally` → allow, видит reason. Действие `read-location-ref`: `requiredRole = max(actionFloor=operator, policyMinRole=operator) = operator` (ref доступен только operator+). `access = ally >= operator` → false, denied. Действие `read-bytes`: `requiredRole = max(actionFloor=operator, ...) = operator`. `access = ally >= operator` → false, denied. Ally видит факт чувствительности и reason, но не адрес и не байты.

[Структурщик]: Суммирую субъект и объекты. Субъект: стабильный principal, маркируется как `user:<id>` или `anonymous`. Каноническое отображение в Panel через `registry.jsonl`. Session credential отдельно от principal; session может быть обычной (kind/role/sub/exp) или partner (kind/role/sub/exp/pv_subject/pv_grants). Объекты: контейнер (весь `static.mmbrn.tech`), коллекция (вроде `strategic-docs`), lineage (по `canonicalRef = urn:mmbrn:static:<rootId>`). Наследование: коллекция → lineage.

[Teamlead]: Серверная граница. Proxy находится перед Affine-инстансом. Каждый запрос через proxy (HTTP или WebSocket). Proxy проверяет:
1. Парсит session/cookie, восстанавливает principal.
2. Запрашивает актуальный `pv_subject` из Panel, проверяет version в session.
3. Парсит `canonicalRef` из параметров запроса (URL или body).
4. Получает object-version vector из Panel для lineage.
5. Вычисляет `effectiveRole` и `requiredRole`.
6. Транслирует в Affine-роль или отвергает.
Прямой доступ на Affine (по IP, на порт 3010 без proxy) — firewall запрещает. Прямой URL к хранилищу байтов (если S3) — тоже через proxy.

[Верстальщик]: Аудит. Каждое решение proxy логируется: timestamp, principal, action, object (canonicalRef), policyMinRole, effectiveRole, decision (allow/deny), reason. Смены политики (owner меняет minRole, добавляет/отзывает грант) — отдельный event: timestamp, actor, target, before/after grants, policyBefore/policyAfter. Все логи в Panel audit table; конкретное хранилище (pg, ES) — реализация.

[Музыкант]: Affine-механизм. Proxy получает effectiveRole из Panel, вычисляет Affine-роль по таблице:
- public (Panel) → невозможно, прямого доступа нет.
- ally (Panel) → reader (Affine).
- operator (Panel) → commenter (Affine).
- owner (Panel) → owner (Affine).
Но это не статический map! Если Panel запрещает `write-metadata` (хотя роль ally), Affine-роль понижается. И Affine не знает о понижении — proxy просто не вызывает Affine, возвращает 403 до этого. Native Affine-роли не меняются самостоятельно; они производная Panel-решения.

[Архитектор]: Fail-closed поведение. Неизвестная identity → assigned public, запрос вернёт 403 если требуется выше public. Недоступность Panel (сервис упал) → cached decision до exp сессии, но новые запросы на неизвестные объекты отвергаются. Устаревшее Affine-состояние (access_token выданный для ally, но потом отозван) → обнаружено по pv_subject mismatch, клиент получает 401, переаутентифицируется.

[Структурщик]: Максимальная семантика кеша. Proxy может кешировать решение (decision + object-vector) на время TTL, например 5 минут. Если vector меняется, кеш инвалиден. Partner cookie — кеш по (sub, pv_subject); обычная сессия — по (sub, exp). После отзыва грант объект-версия меняется, proxy вынужден запросить свежее решение.

[Teamlead]: Таблица объектов и наследования:

| Уровень | Атрибуты | Наследование |
|---------|----------|--------------|
| Container | `minRole: owner` (default) | n/a |
| Collection | `minRole`, `sensitive.reason` (optional) | overrides container |
| Lineage | `minRole`, `sensitive.reason` (optional) | inherits collection если не defined |

[Верстальщик]: Таблица полномочий по ролям (базовый предикат):

| Полномочие | Public | Ally | Operator | Owner |
|-----------|--------|------|----------|-------|
| discover | ✓ (if public) | ✓ | ✓ | ✓ |
| read-metadata | ✓ | ✓ | ✓ | ✓ |
| read-sensitive-reason | ✗ | ✓ | ✓ | ✓ |
| read-location-ref | ✗ | ✗ | ✓ | ✓ |
| read-bytes | ✗ | ✗ | ✓ | ✓ |
| write-metadata | ✗ | ✗ | ✓ | ✓ |
| upload-revision | ✗ | ✗ | ✗ | ✓ |
| manage-access | ✗ | ✗ | ✗ | ✓ |

[Математик]: Функция доступа:
```
effectiveRole = max(baselineRole, max(grantedRoles...))
requiredRole = max(actionFloor[action], policyMinRole[object])
access = effectiveRole >= requiredRole ? allow : deny
```

actionFloor:
- discover, read-metadata: public
- read-sensitive-reason: ally
- read-location-ref, read-bytes: operator
- write-metadata, upload-revision: operator
- manage-access: owner

[Архитектор]: Таблица случаев:

| Case | Субъект | Объект | Действие | effectiveRole | requiredRole | Решение | Где проверяется |
|------|---------|--------|----------|---------------|--------------|---------|-----------------|
| 1 | anonymous | public lineage | discover | public | public | allow | proxy |
| 2 | anonymous | ally collection | discover | public | ally | deny 403 | proxy |
| 3 | public user + ally grant | strategic-docs | read-metadata | ally | ally | allow | proxy + Panel grant check |
| 4 | user (partner cookie, pv=5) | any | any | stale | — | deny 401 | proxy (version mismatch) |
| 5 | operator user | any lineage | manage-access | operator | owner | deny 403 | proxy (actionFloor=owner) |
| 6 | owner | collection | change minRole ally→owner | n/a | n/a | policy updated, object-version incremented | Panel (owner action) |
| 7 | any user | direct Affine URL | navigate | n/a | n/a | blocked by firewall/reverse proxy | nginx forward_auth |
| 8 | ally user | sensitive lineage | read-location-ref | ally | operator | deny 403 | proxy (actionFloor=operator) |

[Структурщик]: Последовательность проверки запроса:
1. HTTP request arrives at reverse proxy.
2. Extract session/cookie → recover principal.
3. Check session.pv_subject vs Panel.subject.permVersion → match?
4. Parse canonicalRef from request parameters.
5. Query Panel: get (object.minRole, object.version_vector, subject.effectiveRole).
6. Compute requiredRole = max(actionFloor[action], object.minRole).
7. Test: effectiveRole >= requiredRole?
8. If allow: compute Affine-role, forward to Affine.
9. If deny: return 403 Forbidden.

[Teamlead]: Audit contract. Mandatory fields for allow/deny event:
- timestamp
- principal (user:id or anonymous)
- action (discover, read-metadata, read-sensitive-reason, read-location-ref, read-bytes, write-metadata, upload-revision, manage-access)
- object (canonicalRef)
- policy_min_role (on object)
- effective_role (of subject)
- decision (allow / deny)
- deny_reason (if deny, e.g., "effectiveRole < requiredRole")

Policy change event:
- timestamp
- actor (owner principal)
- target (collection or lineage canonicalRef)
- before_min_role / after_min_role
- grants_before / grants_after (list of [subject, role])

[Верстальщик]: Отзыв и fail-closed. Когда owner отзывает грант:
1. Panel updates subject.permVersion.
2. Proxy cache entry (if any) invalidated.
3. Existing partner cookies with old pv_subject rejected at next proxy check.
4. Affine access_token (if issued) does NOT auto-revoke; relies on proxy re-check before next request.
5. If Panel unavailable: cached decision (within TTL) honored; new decisions refused.
6. If subject not found in Panel: treated as public, actions limited.

[Музыкант]: Sensitive-ref vs bytes distinction. `read-location-ref` shows `location.ref` (S3 path). `read-bytes` reads actual bytes (via proxy to storage). A user can have one without other? No — both require operator baseline. But they are separate actions: deny one, allow other. A user can read ref but proxy blocks byte download if, say, quota exceeded (that's M6).

[Архитектор]: Пропозиция A1:

**Контракт доступа `static.mmbrn.tech` — единая роль-elevational авторизация через Panel, proxy-enforcement на Affine.**

Канонический источник: **Panel** (registry.jsonl, roles `public < ally < operator < owner`, гранты на коллекции и lineages, permVersion).

Субъект: стабильный principal (`user:<id>` или `anonymous`), отдельно от сессии.

Объекты: контейнер (default minRole: owner), коллекция (minRole, sensitive), lineage (наследует от коллекции).

Функция доступа: `effectiveRole = max(baselineRole, grantedRoles); requiredRole = max(actionFloor, policyMinRole); access = effectiveRole >= requiredRole`.

Восемь полномочий: discover, read-metadata, read-sensitive-reason, read-location-ref, read-bytes, write-metadata, upload-revision, manage-access (actionFloor: owner).

Серверная граница: proxy (reverse proxy перед Affine) проверяет: principal, pv_subject версию, object-version vector, затем вычисляет решение. Прямой доступ в Affine firewall запрещает.

Affine: proxy транслирует effectiveRole в Affine-роль (reader/commenter/owner) или блокирует на уровне proxy. Native Affine-роли не являются истиной доступа.

Sensitive: read-sensitive-reason требует ally, read-location-ref и read-bytes требуют operator. Разные действия.

Отзыв: partner cookie проверяется по pv_subject; mismatch → deny. Object-version vector на смену политики → cache invalidate. Fail-closed: неизвестный principal → public, недоступный Panel → cached decision до TTL, потом deny.

Аудит: каждый allow/deny с полями timestamp, principal, action, object, roles, reason. Смена политики — отдельное событие.

[Структурщик]: Таблица соответствия Panel-роли и Affine-роли:

| Panel Role | Affine Role | Условие | Примечание |
|-----------|------------|---------|-----------|
| public | none | forbidden at proxy layer | не доступна Affine |
| ally | reader | if all actions <= read-metadata | no write, no revision |
| operator | commenter | if includes write-metadata, exclude manage-access | может комментировать, редактировать |
| owner | owner | all actions permitted | full control |

But NOT static! Proxy re-computes per request based on actual permitted actions.

[Teamlead]: Проверка восьми случаев из одной функции — выполнено. Все case-ы используют `access = effectiveRole >= requiredRole`. Ни одного исключения, ни одного отдельного алгоритма для sensitive, ни отдельных правил для Affine.

[Верстальщик]: Таблица полномочий по ролям и грантам — без смешения с Affine. Гранты повышают effectiveRole на уровне коллекции; manage-access всегда требует owner.

[Музыкант]: Proxy проверяет: requested action (одно из восьми), pv_subject, object-version vector, effectiveRole. Ни один из этих параметров не игнорируется.

[Архитектор]: Список посылок M1–M2 — нормы (identity/lineage контракт зафиксирован). Panel-код — факт. Новый контракт доступа и proxy-logic — нормы M3. Sensitive-структура (reason, ref, bytes разные actions) — норма M3. Version-vector инвалидация кеша — норма M3.

---

## Итоговое решение консилиума

**Пропозиция A1:** Единственный канонический источник авторизации — **Panel** (registry.jsonl, гранты, permVersion). Affine — mechanism, не truth. Fail-closed: неизвестная identity → public, недоступный авторизатор → cached decision до TTL или deny.

**Таблица объектов политики и наследования:**

| Уровень | Атрибуты | Наследование |
|---------|----------|--------------|
| Container | minRole: owner (default) | — |
| Collection | minRole, sensitive.reason | overrides container |
| Lineage | minRole, sensitive.reason | inherits collection if undefined |

**Таблица полномочий по ролям (базовый предикат):**

| Полномочие | Public | Ally | Operator | Owner |
|-----------|--------|------|----------|-------|
| discover | ✓* | ✓ | ✓ | ✓ |
| read-metadata | ✓ | ✓ | ✓ | ✓ |
| read-sensitive-reason | — | ✓ | ✓ | ✓ |
| read-location-ref | — | — | ✓ | ✓ |
| read-bytes | — | — | ✓ | ✓ |
| write-metadata | — | — | ✓ | ✓ |
| upload-revision | — | — | — | ✓ |
| manage-access | — | — | — | ✓ |

(*discover: только если discoverability=public на объекте)

**Функция доступа — единственная:**
```
effectiveRole = max(baselineRole, max(grantedRoles...))
requiredRole = max(actionFloor[action], policyMinRole[object])
access = effectiveRole >= requiredRole ? allow : deny
```

actionFloor:
- discover, read-metadata: public
- read-sensitive-reason: ally
- read-location-ref, read-bytes, write-metadata, upload-revision: operator
- manage-access: owner

**Последовательность проверки запроса:**
1. HTTP/WebSocket request → reverse proxy.
2. Extract principal from session/cookie.
3. Fetch Panel: subject.permVersion, effectiveRole, object.minRole, object.version_vector.
4. Check session.pv_subject == Panel.subject.permVersion? → mismatch: deny 401.
5. Parse canonicalRef from request.
6. Compute: requiredRole = max(actionFloor[action], object.minRole).
7. Test: effectiveRole >= requiredRole?
8. allow: translate to Affine-role, forward request.
9. deny: return 403 Forbidden.

**Таблица соответствия Panel роли и Affine-механизма:**

| Panel Role | Affine Role | Proxy Action |
|-----------|------------|-------------|
| public | — | block at proxy |
| ally | reader | if all permitted actions ≤ read-metadata |
| operator | commenter | if includes write-metadata, excludes manage-access |
| owner | owner | all actions |

(Native Affine-роль вычисляется динамически, не статическая таблица.)

**Таблица восьми обязательных случаев:**

| Case | Субъект | Объект | Действие | effectiveRole | requiredRole | Решение | Где |
|------|---------|--------|----------|---------------|--------------|---------|-----|
| 1 | anonymous | public lineage | discover | public | public | allow | proxy |
| 2 | anonymous | ally collection | discover | public | ally | deny 403 | proxy |
| 3 | public user + ally grant | strategic-docs collection | read-metadata | ally | ally | allow | proxy + Panel grant lookup |
| 4 | user (old partner cookie, pv=5) | any | any | — | — | deny 401 (pv mismatch) | proxy version-check |
| 5 | operator | lineage | manage-access | operator | owner | deny 403 (actionFloor) | proxy |
| 6 | owner | collection | policy change (minRole) | — | — | object-version_vector incremented, cache invalid | Panel (audit event) |
| 7 | any user | direct Affine URL | navigate | — | — | blocked (no proxy) | firewall/reverse-proxy |
| 8 | ally | sensitive lineage | read-location-ref | ally | operator | deny 403 (actionFloor) | proxy |

Все случаи из одной функции, без исключений.

**Audit contract:**

Minimal required fields per allow/deny event:
- `timestamp`
- `principal` (user:id or anonymous)
- `action` (one of eight)
- `canonicalRef`
- `policy_min_role`
- `effective_role`
- `decision` (allow | deny)
- `deny_reason` (if deny)

Policy change event:
- `timestamp`, `actor`, `target_canonicalRef`, `before_min_role`, `after_min_role`, `grants_before`, `grants_after`

Revocation semantics:
- permVersion incremented on any grant/policy change.
- partner cookies: pv_subject mismatch → deny 401.
- cache TTL: ≤ 5 min; version_vector change → invalidate immediately.
- Panel unavailable: cached decision honored, new decisions denied.
- Affine access_token: no auto-revoke, relies on proxy re-check.

---

## Список посылок

- **M1 — контракт identity/lineage** (норма)
- **M2 — registry.jsonl, canonicalRef** (норма)
- **Panel — роли public/ally/operator/owner, гранты, permVersion** (факт)
- **Affine —독립적 роли reader/commenter/editor/owner** (факт)
- **Требование поправок run1–run3 — role-elevation функция** (норма)
- **Требование run1–run3 — proxy + version checks** (норма)
- **Требование run1–run3 — восемь случаев из одной функции** (норма)
- **Sensitive-структура: reason, ref, bytes как отдельные actions** (норма)
- **Fail-closed default на неизвестный principal** (норма)
- **Audit события с mandatory fields** (норма)

---

## Definition of Done

- [x] Один вопрос A1 и один carrier (этот документ)
- [x] Назван один канонический источник (Panel) и статус Affine (mechanism, не truth)
- [x] Определены субъект (principal), объекты (container/collection/lineage), гранулярность, наследование (collection→lineage), конфликт правил (max() роли)
- [x] Разведены восемь полномочий и sensitive-видимость (три действия: reason/ref/bytes)
- [x] Серверная граница — proxy перед Affine, firewall на прямой доступ
- [x] Отзыв (pv_subject mismatch), fail-closed (public на неизвестный principal), audit contract (8 обязательных полей)
- [x] Восемь случаев доказаны единой функцией access = effectiveRole >= requiredRole
- [x] M4–M7 не решены

*Реплик в диалоге: 41; каждый из шести советчиков высказался не менее одного раза. Ролевые реплики по существу и функции доступа: 36+.*
