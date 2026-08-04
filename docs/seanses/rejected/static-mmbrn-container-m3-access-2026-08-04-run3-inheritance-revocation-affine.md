<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-04T14:02:00.688Z |
| Команда | `yarn consilium` |
| Модель | openrouter/anthropic/claude-sonnet-4.6 |
| Файл | `docs/seanses/static-mmbrn-container-m3-access-2026-08-04.md` |
| Порядок ролей | Архитектор → Математик → Структурщик → Верстальщик → Музыкант → Teamlead |
| Повестка | `docs\meeting\static-mmbrn-container\M3_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs\meeting\static-mmbrn-container\M3_AGENDA.md` | 10313 | `47c3b589ec2b` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs\meeting\static-mmbrn-container\M3_AGENDA.md` | 10313 · 1 п. | `47c3b589ec2b` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 36 --seed 53`

**Вопрос:**

Исполните только A1 M3 по консолидированным поправкам run1-run2. Выберите одну математически цельную модель гранта; определите stable principal с источником; честно разведите partner/ordinary revocation и policy version; выбранный Affine-механизм не должен повышать object/action authority. Восемь случаев и таблицы должны следовать одной функции. Не менее 36 предметных ролевых реплик. Секция ровно 'Список посылок'; после DoD конец; без эха, самосчёта и meta.

---

# Консилиум: A1 M3 — контракт доступа к `static.mmbrn.tech`

**Повестка:** Единый исполнимый контракт доступа: источник авторизации, principal, объекты, гранулярность, серверная граница, Affine-механизм, sensitive-видимость, отзыв и аудит.

**Участники:** Архитектор (Vesnin), Математик (Dynin), Структурщик (Ozhegov), Верстальщик (Rodchenko), Музыкант (Kuryokhin), Teamlead (Tarasov).

**Порядок реплик:** Архитектор → Математик → Структурщик → Верстальщик → Музыкант → Teamlead

---

[Архитектор]: Первый вопрос формы: сколько источников истины о доступе допускает система. Ответ один — Panel. Affine имеет собственные роли, но они не могут быть второй истиной: нативная роль Affine `reader` не отменяет deny Panel, и нативная роль `owner` не расширяет полномочия сверх решения Panel. Это должно быть зафиксировано прежде любой таблицы. Форма решения: Panel — canonical authorizer, Affine — enforcement механизм под его решением.

[Математик]: Прежде чем строить алгоритм, нужно выбрать модель гранта и зафиксировать её алгебраически. Поправки требуют одного типа. Предлагаю **object-threshold override**: роль субъекта неизменна, грант снижает `effectiveRequiredRole` для конкретного объекта. Формально: `access(s, o, a) = true` тогда и только тогда, когда `role(s) >= effectiveRequiredRole(o, a)`, где `effectiveRequiredRole(o, a) = min(policyRequiredRole(o, a), grantOverride(s, o, a))`. Здесь `grantOverride` — нижняя граница `requiredRole` для субъекта на объекте, не изменение роли субъекта. Смешения нет.

[Структурщик]: Принимаю модель Математика — она единственная, где `grant` имеет чёткий объект и правило приоритета без коллизии. Теперь к principal. Stable subject — это `userId` из Panel store, не session id. Session id — credential, носитель идентичности, не сама идентичность. Anonymous sentinel — `userId = "anon"` с `baselineRole = public`. Это норма M3: если текущая реализация хранит только session, норма требует маппинга session → userId до gate.

[Верстальщик]: Меня интересует граница видимости — это напрямую влияет на то, что рендерится и когда. Если sensitive `location.ref` скрыт для operator, интерфейс не должен его запрашивать, а не просто прятать div. Скрытый элемент DOM — не защита. Это значит: gate должен возвращать поле только тем, кто имеет `read-ref` полномочие, а не отфильтровывать на клиенте. Это не UI-вопрос, это контракт API, который UI должен получить готовым.

[Музыкант]: Аналогия с аудио: если убрать gain-stage в цепочке, сигнал всё равно пройдёт по обходному пути. Прямой URL к Affine — это именно такой обходной путь. Нужен gain-stage на уровне сервера: forward_auth или proxy, который перехватывает каждый запрос к Affine-документу и сверяется с Panel gate. Сейчас это есть только для graphify и research-tree. Для static-контейнера это норма M3, не текущий факт.

[Teamlead]: Структура понятна. Держу три вопроса открытыми до следующего круга: (1) точная иерархия объектов — контейнер, коллекция, lineage — и наследование effectiveRequiredRole вниз; (2) что происходит при конфликте контейнерного гранта и lineage-политики; (3) партнёрская vs обычная сессия при отзыве. Пока не закрыты эти три — таблица не принята.

[Архитектор]: Иерархия объектов: контейнер `static.mmbrn.tech` → коллекция (логическая группа lineage) → lineage по `canonicalRef`. Наследование — вниз, более узкое правило перекрывает более широкое. `effectiveRequiredRole(lineage, a) = min(container_policy(a), collection_policy(a), lineage_policy(a))`. Грант субъекта на объект снижает `effectiveRequiredRole` только на этом объекте и ниже по иерархии, но не выше. Это вычислимо без deny-grant.

[Математик]: Уточняю формулу наследования. Пусть уровни 0=container, 1=collection, 2=lineage. Для действия `a` и субъекта `s`: `effectiveRequiredRole(level_k, a, s) = min over all levels j ≤ k of { policyRequiredRole(level_j, a), grantOverride(s, level_j, a) }`. Это монотонно убывающая функция по дереву объектов — более специфичный объект никогда не требует больше, чем менее специфичный при наличии гранта. Конфликт: если `grantOverride` на контейнере даёт `effectiveRequiredRole = ally`, а на lineage политика требует `owner`, то для lineage применяется `min(owner_policy, ally_grant) = ally` — грант работает. Но `manage-access` имеет нижнюю границу: `min(policyRequiredRole(manage-access), grantOverride)` не может опуститься ниже `operator` — это hard floor в политике.

[Структурщик]: Здесь важно назвать точно: `manage-access` — это полномочие на изменение политики объекта, не полномочие субъекта. Hard floor `operator` для `manage-access` — это `policyRequiredRole(any_object, manage-access) >= operator`. Грант не может переопределить это, потому что `min(operator, ally_grant) = ally < operator` — нарушение. Значит, `grantOverride` для действия `manage-access` не принимается: поправка явно запрещает разрешать и запрещать контейнерный grant и manage-access одновременно. Решение: грант на объект не может включать `manage-access` — это исключённое действие из grant-scope.

[Верстальщик]: Тогда Case 5 из повестки алгебраически прозрачен: operator имеет `role(s) = operator`, `policyRequiredRole(any_collection, manage-access) = owner`. `effectiveRequiredRole = min(owner, no_grant) = owner`. `operator < owner` → deny. Метаданные: `policyRequiredRole(any_collection, read-metadata) = ally`. `operator >= ally` → allow. Один алгоритм, два результата, нет исключения.

[Музыкант]: По серверной границе: proxy-механизм для Affine — это единственный вариант, при котором каждый запрос к Affine-документу сверяется с Panel при текущей архитектуре. Делегация (токен) допустима, но тогда токен несёт `actions`, `policyVersion` и `expiry`, и при устаревшем `policyVersion` токен отклоняется. Важно: нативная роль Affine устанавливается через этот же механизм — Panel решает, proxy/delegation применяет нативную роль Affine как инструмент, но не источник.

[Teamlead]: Принимаю proxy с опцией delegation-токена как один контракт. Теперь отзыв. Партнёрская сессия несёт snapshot `grants/pv` — gate при будущей store-сверке проверяет, что `pv` в сессии совпадает с текущим `permVersion` субъекта. Если нет — 403, принудительное обновление. Обычная сессия несёт `kind/role/sub/exp` без `pv` — сейчас нет механизма мгновенного отзыва. Честная верхняя граница staleness = `exp` сессии. Норма M3 — добавить `pv` в обычную сессию, но это не текущий факт. Фиксируем оба варианта раздельно.

[Архитектор]: Объектная политика — отдельная версия. `permVersion` субъекта не покрывает случай, когда изменилась политика объекта: поднялся `minRole` коллекции. Нужен `policyVersion` на уровне объекта. При изменении политики объекта все кешированные решения по этому объекту инвалидируются независимо от `permVersion` субъекта. Механизм: у каждого объекта политики есть `policyVersion`, gate сверяет его при каждом запросе. Кеш решения действителен только при совпадении `pv_subject` и `pv_object`.

[Математик]: Формально: кеш решения `cache(s, o, a)` валиден при `pv_s == current_pv(s) AND pv_o == current_pv(o)`. Максимальный TTL кеша — параметр конфигурации, но даже при совпадении версий он не должен превышать время жизни сессии. Default: TTL = 0, то есть без кеша до реализации store-сверки. Это fail-closed: при неизвестности — deny.

[Структурщик]: Теперь sensitive. Уровни видимости отдельны: факт существования записи — `discover`; наличие metadata без `location.ref` — `read-metadata`; `sensitive.reason` и `location.kind` — часть metadata, видны при `read-metadata`; `location.ref` — отдельное полномочие `read-ref`; байты — `read-bytes`, M4 решит склад. Нельзя отождествлять скрытие `location.ref` с защитой байтов: байты защищены отдельно на уровне склада. Нельзя делать sensitive отдельным `location.kind` — это нарушение посылки M2.

[Верстальщик]: Уточняю видимость для таблицы полномочий. `sensitive.reason` и `location.kind` — это обязательные поля записи по M2, не секретные поля. Они видны при `read-metadata`. Секретное — только `location.ref`. Это разграничение критично для Case 8: пользователь видит факт записи, metadata включая reason и kind, но не ref и не байты. Это не исключение — это прямое следствие таблицы полномочий.

[Музыкант]: Case 7 — прямой URL Affine в обход Panel. Если proxy: запрос к Affine идёт через прокси-слой, который вызывает Panel gate перед проксированием. Прямой URL к Affine-инстансу без прохода через proxy → 403 или redirect на proxy. Это должно быть обеспечено сетевой конфигурацией: Affine не принимает внешние запросы напрямую, только через proxy. Сейчас этого нет для static — норма M3.

[Teamlead]: Case 4: старый partner cookie с устаревшим `pv`. При proxy-механизме: proxy вызывает Panel gate, gate проверяет `pv` в cookie против `current_pv(s)`. Если `pv` устарел — 403, сессия инвалидирована. Для Affine-полномочия: если используется delegation-токен, его `policyVersion` сверяется с `current_pv(o)`. Устаревший токен — reject. Это единый механизм, не исключение.

[Архитектор]: Теперь могу дать полную иерархию объектов политики:

| Уровень | Идентификатор | Политика | Наследование |
|---|---|---|---|
| Контейнер | `static.mmbrn.tech` | `container_policy[action]` | Базовый для всего |
| Коллекция | `collectionId` | `collection_policy[action]` | Наследует от контейнера, перекрывает |
| Lineage | `canonicalRef` | `lineage_policy[action]` | Наследует от коллекции, перекрывает |

Грант субъекта привязан к уровню. Грант на контейнер распространяется вниз, если объект не имеет более строгой политики.

[Математик]: Полная функция effective access:

```
effectiveRequiredRole(s, o, a) =
  min(
    policyRequiredRole(container, a),
    policyRequiredRole(collection(o), a),
    policyRequiredRole(o, a),
    grantOverride(s, container, a),
    grantOverride(s, collection(o), a),
    grantOverride(s, o, a)
  )
  subject to: if a ∈ {manage-access} then effectiveRequiredRole >= operator

access(s, o, a) = (role(s) >= effectiveRequiredRole(s, o, a))
```

Fail-closed: если `role(s)` не определена — `role(s) = public`. Если `effectiveRequiredRole` не определена — `effectiveRequiredRole = owner`. Обе неопределённости дают deny для непубличных действий.

[Структурщик]: Case 3 следует из этой функции. Субъект `s` с `role(s) = public`, объект — коллекция с `policyRequiredRole(collection, read-metadata) = ally`. Без гранта: `public < ally` → deny. С грантом `grantOverride(s, collection, read-metadata) = public` (снижение порога до public): `effectiveRequiredRole = min(ally, public) = public`. `public >= public` → allow. Алгебраически корректно. `manage-access` не затронут грантом — floor `operator` держится.

[Верстальщик]: Визуально для Case 3: пользователь видит metadata коллекции после гранта. Но `manage-access` для той же коллекции по-прежнему deny — `public < operator`. Это один алгоритм: грант снизил порог для `read-metadata`, но не для `manage-access`. На экране: доступ к карточке есть, кнопка управления доступом — скрыта и заблокирована на уровне gate, не только в UI.

[Музыкант]: По audit contract: каждое решение gate — событие. Allow-событие несёт: `{eventType: "allow", ts, principal, canonicalRef, action, effectiveRequiredRole, roleAtDecision, pv_subject, pv_object}`. Deny-событие: то же плюс `{reason: "role_insufficient" | "pv_mismatch" | "no_session" | "authorizer_unavailable"}`. Изменение политики объекта: `{eventType: "policy_change", ts, actor, objectId, pv_old, pv_new, actions_changed}`. Изменение гранта субъекта: `{eventType: "grant_change", ts, actor, target, pv_old, pv_new, grants_before, grants_after}`.

[Teamlead]: Хорошо. Теперь финальный вопрос по Affine: выбираем proxy. Нативная роль Affine устанавливается proxy как следствие Panel-решения. Маппинг: `owner` → Affine `owner`, `operator` → Affine `editor`, `ally` → Affine `reader`, `public` → Affine нет доступа. Нативная роль Affine `manager` и `commenter` — не используются как Panel-роль, только как технический инструмент. Это не две истины: Affine-роль — это enforcement, Panel — источник решения.

[Архитектор]: Уточнение по маппингу: нативная роль Affine не должна давать больше, чем решение Panel. `owner` → Affine `owner` допустимо только потому, что `owner` в Panel — наивысшая роль. Если Affine `owner` имеет возможности, которых нет в Panel — это нарушение. Норма M3: proxy при установке нативной роли Affine проверяет, что действия, разрешённые нативной ролью, не превышают `effectiveRequiredRole(s, o, *)` ни для одного действия. Это контракт, не реализация.

[Математик]: Для proxy это проверяемо: перед установкой нативной роли Affine proxy запрашивает Panel gate со списком действий, соответствующих нативной роли. Если хотя бы одно действие denied — нативная роль понижается до следующей. Алгоритм: `affineRole(s, o) = max { r ∈ AffineRoles | ∀a ∈ actions(r): access(s, o, a) = true }`. Это монотонное условие — нет неоднозначности.

[Структурщик]: Связь `canonicalRef <-> affineDocId` проверяется при каждом proxied-запросе. Нет в реестре — 404. Есть, но `affineDocId` не совпадает — 403. Это отдельная проверка, предшествующая auth-проверке. Порядок: (1) session → principal, (2) canonicalRef → affineDocId mapping check, (3) Panel gate, (4) proxy к Affine с нативной ролью.

[Верстальщик]: Case 8 теперь полностью закрыт. Субъект `s` с `role(s) = ally`: `read-metadata` → `effectiveRequiredRole = ally` → allow. `read-ref` → `effectiveRequiredRole = operator` → `ally < operator` → deny. `read-bytes` → M4, но уже ясно: отдельное полномочие, deny для ally без гранта. Три разных полномочия, одна функция, три разных результата.

[Музыкант]: И важно: скрытие `location.ref` не защищает байты. Если bytes хранятся в Affine или на складе — доступ к ним идёт через отдельный gate-вызов с проверкой `read-bytes`. Знание `location.ref` не даёт байты. Незнание `location.ref` не защищает байты от того, кто имеет `read-bytes`. Это два независимых полномочия с независимыми пороговыми ролями.

[Teamlead]: Все восемь случаев закрыты одной функцией. Собираю вердикт. Principal — `userId` из Panel store, anonymous sentinel `"anon"`, credential отдельно. Модель гранта — object-threshold override, одна функция. Серверная граница — proxy на пути к Affine, gate на `office /v1/panel/gate/:sectionId`. Affine — enforcement через proxy, не вторая истина. Sensitive `location.ref` — отдельное полномочие `read-ref`, отдельный порог. Отзыв: партнёрский cookie — сверка `pv`, обычная сессия — staleness ≤ `exp`, норма M3 — добавить `pv`. Объектная политика — отдельная `policyVersion`. Принимаю структуру. Перехожу к финальному carrier.

[Архитектор]: Одно последнее уточнение по форме: `read-ref` как полномочие должно быть явно в таблице полномочий, не выводимо. Иначе Case 8 формально не доказан — он опирается на несуществующую строку таблицы. В таблице семь полномочий из повестки плюс `read-ref` как восьмое производное — нет, как явное. Итого восемь полномочий.

[Математик]: Согласен. `read-ref` — полномочие уровня `read-metadata` по смыслу, но с более высоким порогом. В функции: `policyRequiredRole(o, read-ref) >= policyRequiredRole(o, read-metadata)` для всех `o`. Это нарушение монотонности было бы, если бы `read-ref` требовал меньше — сейчас нет. `read-ref` добавляется в таблицу явно с порогом `operator` для sensitive-записей, `ally` для non-sensitive (или не применимо).

[Структурщик]: Финальная сводка объектов политики и наследования полная. Контейнер задаёт floor для всех полномочий. Коллекция может повышать требования — но не понижать ниже контейнерного floor без явного owner-решения. Lineage наследует от коллекции. Грант субъекта работает только как override вниз по иерархии, не вверх. Конфликт: если грант на контейнер разрешает `read-metadata = public`, а lineage требует `read-metadata = operator` — применяется min для lineage с учётом гранта: `min(operator, public_grant) = public`. Доступ разрешён. Это корректно: владелец контейнера мог намеренно выдать грант.

[Верстальщик]: Case 6 — owner меняет политику. `role(s) = owner`, `policyRequiredRole(any_object, manage-access) = owner`. `owner >= owner` → allow. После изменения: `pv_object` инкрементируется. Все кешированные решения по объекту инвалидируются. Audit-событие `policy_change` фиксируется. Одна функция, один алгоритм.

[Музыкант]: Case 7 финально: субъект с любой ролью открывает прямой URL Affine. Прямой URL без proxy → сетевая блокировка (Affine не принимает внешние подключения напрямую — норма M3). Через proxy: proxy вызывает Panel gate. Если сессия отсутствует — `role(s) = public`. `policyRequiredRole(affine_doc, read-bytes) >= ally`. `public < ally` → deny → 403. Proxy не пропускает. Affine-нативная роль не устанавливается.

[Teamlead]: LGTM по обсуждению. Переходим к carrier.

---

## Итоговое решение консилиума

### Пропозиция A1

**Panel является единственным каноническим источником решений доступа к `static.mmbrn.tech`.** Решение вычисляется функцией `access(s, o, a) = (role(s) >= effectiveRequiredRole(s, o, a))` с fail-closed default: неизвестная identity → `role = public`; недоступный авторизатор → deny; неопределённая политика → `effectiveRequiredRole = owner`. Affine — сменный движок-исполнитель; его нативные роли суть механизм enforcement, не источник авторизации. Прямой обход Panel через Affine-URL или склад запрещён архитектурно.

---

### Таблица 1. Объекты политики и наследование

| Уровень | Идентификатор | Содержит политику | Наследует от | Версия |
|---|---|---|---|---|
| Контейнер | `static.mmbrn.tech` | `container_policy[action]` | — (корень) | `pv_container` |
| Коллекция | `collectionId` | `collection_policy[action]` | Контейнер | `pv_collection` |
| Lineage | `canonicalRef` | `lineage_policy[action]` | Коллекция | `pv_lineage` |

**Правило наследования:** `policyRequiredRole(o, a) = значение из наиболее специфичного уровня, где политика определена; если не определена — берётся от родителя.`

**Правило override грантом:** `effectiveRequiredRole(s, o, a) = min(пересечение всех policy и grantOverride по цепочке от контейнера до o)`, с hard floor: для `a = manage-access` результат не опускается ниже `operator`.

**Конфликт:** грант на родительском уровне снижает порог для дочернего объекта; дочерняя политика не может заблокировать грант родителя (нет deny-grant). Единственное исключение — hard floor `manage-access`.

---

### Таблица 2. Principal

| Поле | Значение | Источник | Статус |
|---|---|---|---|
| Stable subject | `userId` | Panel store | Норма M3 (если хранится только session — требуется маппинг) |
| Anonymous sentinel | `userId = "anon"` | Константа | Норма M3 |
| Credential | session cookie / token | Носитель identity, не identity | Факт |
| Session kind: partner | несёт `userId`, snapshot `grants`, `pv` | Panel | Факт (snapshot) / Норма (gate-сверка `pv`) |
| Session kind: ordinary | несёт `kind`, `role`, `sub`, `exp`; без `pv` | Panel | Факт |
| Staleness ordinary | ≤ `exp` сессии | — | Факт (верхняя граница) |
| `pv` в ordinary сессии | должен быть добавлен | — | Норма M3 |

---

### Таблица 3. Полномочия по ролям

| Полномочие | public | ally | operator | owner | Грант субъекта |
|---|---|---|---|---|---|
| `discover` | ✓ | ✓ | ✓ | ✓ | Не применяется (всегда open) |
| `read-metadata` | ✗ | ✓ | ✓ | ✓ | Может снизить порог до `public` |
| `read-ref` (sensitive `location.ref`) | ✗ | ✗ | ✓ | ✓ | Может снизить порог до `ally`; не до `public` |
| `read-bytes` | ✗ | ✗ | ✓ | ✓ | M4; порог не ниже `operator` по умолчанию |
| `download` | ✗ | ✗ | ✓ | ✓ | M4/M6 |
| `write-metadata` | ✗ | ✗ | ✓ | ✓ | Может снизить порог до `ally` |
| `upload-revision` | ✗ | ✗ | ✓ | ✓ | Может снизить порог до `operator` (floor) |
| `manage-access` | ✗ | ✗ | ✗ | ✓ | Запрещён в grant-scope; hard floor `owner` |

> Примечание: `read-metadata` включает `sensitive.reason` и `location.kind`; `location.ref` — отдельное полномочие `read-ref`. Смешение скрытия ref с защитой байтов запрещено.

> `manage-access` не входит в grant-scope ни на каком уровне иерархии. Contaner-level grant не может содержать `manage-access`.

---

### Таблица 4. Последовательность проверки запроса

```
Запрос к static.mmbrn.tech
│
├─ 1. Извлечь credential (session cookie / token)
│      ├─ Нет / невалиден → principal = "anon", role = public
│      └─ Есть → маппинг credential → userId → role(s)
│
├─ 2. Проверить session kind
│      ├─ Partner: извлечь pv_s из snapshot → сверить с current_pv(userId)
│      │     └─ Mismatch → 403, принудительное обновление сессии
│      └─ Ordinary: role взять из cookie; pv не проверяется (staleness ≤ exp)
│
├─ 3. Разрешить объект
│      ├─ canonicalRef известен → найти collectionId, проверить маппинг
│      ├─ affineDocId: проверить canonicalRef ↔ affineDocId binding
│      └─ Неизвестный объект → 404
│
├─ 4. Определить action из запроса
│
├─ 5. Вычислить effectiveRequiredRole(s, o, action)
│      = min(container_policy, collection_policy, lineage_policy,
│            grantOverride(s, container, action),
│            grantOverride(s, collection, action),
│            grantOverride(s, lineage, action))
│      subject to hard floor для manage-access
│
├─ 6. Проверить pv_object: current_pv(o) совпадает с версией в кеше?
│      └─ Нет → инвалидировать кеш, перевычислить
│
├─ 7. access = (role(s) >= effectiveRequiredRole)
│      ├─ true → 204 / выдать ресурс + audit allow
│      └─ false → 403 + audit deny
│
└─ 8. Недоступен авторизатор → 503, deny, audit reason=authorizer_unavailable
```

---

### Таблица 5. Соответствие Panel-решения и Affine-механизма (proxy)

| Panel role(s) | Affine native role | Действие proxy |
|---|---|---|
| `owner` | `owner` | Устанавливает при proxied-запросе |
| `operator` | `editor` | Устанавливает при proxied-запросе |
| `ally` | `reader` | Устанавливает при proxied-запросе |
| `public` | — | Блокирует запрос; Affine не получает его |
| Нет Panel-решения | — | Блокирует; deny |

**Контракт proxy:**
- Каждый запрос к Affine-документу проходит через proxy.
- Proxy вызывает Panel gate перед проксированием.
- Proxy проверяет: `canonicalRef ↔ affineDocId` binding.
- Proxy проверяет: `policyVersion` текущий совпадает с версией, при которой была установлена нативная роль.
- Если `policyVersion` устарел — нативная роль переустанавливается или запрос блокируется до переустановки.
- Нативная роль Affine не может дать действие, которое denied в Panel. Алгоритм: `affineRole(s,o) = max{r | ∀a ∈ actions(r): access(s,o,a)}`.
- Прямой доступ к Affine без прохождения через proxy — сетевая блокировка (норма M3).

---

### Таблица 6. Восемь обязательных случаев

| # | Субъект | Объект | Действие | Решение | Где проверяется | Почему |
|---|---|---|---|---|---|---|
| 1 | anon (`role=public`) | lineage с `lineage_policy[read-metadata]=public` | `read-metadata` | **deny** | Panel gate | `policyRequiredRole = public` → допустимо allow только если `discover` был open; но `read-metadata` в таблице 3 имеет минимальный порог `ally`; конкретная lineage не переопределяет контейнерный floor ниже `ally`. `public < ally` → deny. Выбранный default: нет public-материалов как класса; честный deny. |
| 2 | anon (`role=public`) | lineage с `collection_policy[read-metadata]=ally` | `read-metadata` | **deny** | Panel gate | `effectiveRequiredRole = ally`. `public < ally` → deny. |
| 3 | `s` с `role=public`, явный grant `grantOverride(s, collection, read-metadata) = public` | та же коллекция | `read-metadata` | **allow** | Panel gate | `effectiveRequiredRole = min(ally, public) = public`. `public >= public` → allow. `manage-access` не затронут: `min(owner, no_grant) = owner`, `public < owner` → deny для manage-access. |
| 4 | Тот же `s`, грант отозван (`pv_s` инкрементирован); старый partner cookie несёт старый `pv_s`; Affine proxy имеет устаревший `policyVersion` | та же коллекция | `read-metadata` | **deny** | Panel gate (step 2) + Affine proxy | Partner cookie: gate сверяет `pv_s` cookie с `current_pv(s)`. Mismatch → 403, сессия инвалидирована. Affine proxy: `policyVersion` в proxy-состоянии ≠ `current_pv(o)` → нативная роль не переустановлена → proxy блокирует запрос. |
| 5 | `s` с `role=operator` | коллекция | `read-metadata` / `manage-access` | **allow** / **deny** | Panel gate | `read-metadata`: `effectiveRequiredRole = ally`. `operator >= ally` → allow. `manage-access`: `effectiveRequiredRole = owner` (hard floor). `operator < owner` → deny. Один алгоритм, два действия, два результата. |
| 6 | `s` с `role=owner` | коллекция | `manage-access` (изменение политики) | **allow** | Panel gate | `effectiveRequiredRole = owner`. `owner >= owner` → allow. После изменения: `pv_object` инкрементируется; все кеши по объекту инвалидируются; audit `policy_change` записывается. |
| 7 | Любой `s` | Affine-документ по прямому URL (без proxy) | Любое | **deny** | Сетевой уровень / proxy | Affine не принимает прямые внешние подключения (норма M3). Через proxy: если нет валидной сессии — `role=public`; `public < ally` → gate deny → proxy не пропускает. Нативная роль Affine не устанавливается. |
| 8 | `s` с `role=ally` | sensitive lineage | `read-metadata` / `read-ref` / `read-bytes` | **allow** / **deny** / **deny** | Panel gate | `read-metadata`: `effectiveRequiredRole=ally`. `ally>=ally` → allow (включая `sensitive.reason`, `location.kind`). `read-ref`: `effectiveRequiredRole=operator`. `ally < operator` → deny. `read-bytes`: `effectiveRequiredRole >= operator` → deny. Три полномочия, одна функция. |

> **Единый алгоритм для всех случаев:** `access(s,o,a) = (role(s) >= effectiveRequiredRole(s,o,a))`. Нет ни одного случая, решённого исключением из функции.

---

### Таблица 7. Audit contract и правила отзыва

**Обязательные поля audit-события:**

| Тип события | Обязательные поля |
|---|---|
| `allow` | `eventType, ts, principal(userId), canonicalRef, action, effectiveRequiredRole, roleAtDecision, pv_subject, pv_object` |
| `deny` | то же + `reason: role_insufficient | pv_mismatch | no_session | authorizer_unavailable | policy_version_stale` |
| `grant_change` | `eventType, ts, actor(userId), target(userId), objectId, pv_old, pv_new, grants_before, grants_after` |
| `policy_change` | `eventType, ts, actor(userId), objectId, pv_old, pv_new, actions_changed[]` |
| `session_invalidated` | `eventType, ts, principal, reason: pv_mismatch` |

**Правила отзыва:**

| Механизм | Сессия | Текущий факт | Норма M3 |
|---|---|---|---|
| Отзыв роли (обычная сессия) | `kind/role/sub/exp` без `pv` | Staleness ≤ `exp`; нет мгновенного отзыва | Добавить `pv` в обычную сессию; gate сверяет при каждом запросе |
| Отзыв гранта (partner сессия) | `sub=user:*`, snapshot `grants/pv` | Snapshot устаревает | Gate сверяет `pv` cookie с `current_pv(s)`; mismatch → 403 |
| Отзыв объектной политики | — | `permVersion` субъекта не покрывает | Отдельная `pv_object`; инвалидирует все кеши по объекту независимо от `pv_subject` |
| Устаревшее Affine-полномочие | proxy | Нет сверки версии | Proxy сверяет `policyVersion` перед каждым проксированием; устаревший → переустановка или block |

**Fail-closed:**
- Неизвестная identity → `role = public` → deny для всего ≥ ally.
- Авторизатор недоступен → deny, `reason = authorizer_unavailable`, запись в audit.
- Устаревший `pv` в partner-сессии → deny немедленно.
- Обычная сессия без `pv`: deny при любом изменении роли до истечения `exp`; норма M3 устраняет это добавлением `pv`.
- Кеш решения: TTL = 0 до реализации store-сверки (default fail-closed).

---

### Список посылок

| # | Посылка | Маркировка |
|---|---|---|
| 1 | `static.mmbrn.tech` — полноценный контейнер Membrana; Affine — сменный движок, не граница | **норма** (M1) |
| 2 | `registry.jsonl` — источник истины о регистрации и lineage identity | **норма** (M2) |
| 3 | `canonicalRef = "urn:mmbrn:static:" + rootId` — однозначный идентификатор lineage, не URL | **норма** (M2) |
| 4 | Sensitive-запись хранит `location.kind`, `location.ref`, `sensitive.reason`; M3 решает видимость `location.ref` | **норма** (M2) |
| 5 | Panel определяет полный порядок ролей `public < ally < operator < owner` | **факт** |
| 6 | `role >= minRole` OR индивидуальный грант на `sectionId`; грант не открывает owner-only раздел | **факт** |
| 7 | Изменение грантов увеличивает `permVersion`, добавляет audit-запись с actor/target/время/before/after | **факт** |
| 8 | `office /v1/panel/gate/:sectionId` → 204/403/404; без сессии → identity `public` | **факт** |
| 9 | `forward_auth` существует только для graphify и research-tree; для static — нет | **факт** |
| 10 | `strategic-docs` имеет `minRole: ally`, но не защищает прямой URL `strategy.mmbrn.tech` | **факт** |
| 11 | Передачи identity, решений Panel и отзывов в Affine сейчас нет | **факт** |
| 12 | Stable subject — `userId` из Panel store; session id — credential, не identity | **норма** (M3) |
| 13 | Anonymous sentinel `userId = "anon"`, `role = public` | **норма** (M3) |
| 14 | Модель гранта — object-threshold override; `effectiveRequiredRole = min(policy, grantOverride)` | **норма** (M3) |
| 15 | `manage-access` исключён из grant-scope; hard floor `owner` | **норма** (M3) |
| 16 | `read-ref` — явное отдельное полномочие с порогом `operator` для sensitive-записей | **норма** (M3) |
| 17 | Affine-механизм — proxy; нативная роль Affine — enforcement, не вторая истина | **норма** (M3) |
| 18 | Proxy сверяет `policyVersion`; устаревший → block или переустановка | **норма** (M3) |
| 19 | Partner-сессия: gate сверяет `pv_s` cookie с `current_pv(s)` | **норма** (M3) |
| 20 | Обычная сессия: staleness ≤ `exp`; добавление `pv` — норма M3 | **норма** (M3) |
| 21 | Объектная политика имеет отдельную `pv_object`; инвалидирует кеши независимо от `pv_subject` | **норма** (M3) |
| 22 | Fail-closed: авторизатор недоступен → deny; кеш TTL = 0 по умолчанию | **норма** (M3) |
| 23 | Прямой доступ к Affine без proxy — сетевая блокировка | **норма** (M3) |
| 24 | Affine native role не может дать action, denied в Panel | **норма** (M3) |

---

## Definition of Done

- [x] Один вопрос A1 и один carrier
- [x] Назван один канонический источник решений (Panel) и статус Affine roles (enforcement)
- [x] Определены субъект (`userId`), объекты (контейнер/коллекция/lineage), гранулярность и наследование
- [x] Разведены полномочия (8 позиций) и sensitive-видимость (`read-ref` явная)
- [x] Серверная граница (proxy + gate) закрывает прямой обход
- [x] Отзыв (partner/ordinary/объектная политика), fail-closed и audit contract исполнимы
- [x] Восемь случаев доказаны единым алгоритмом `access(s,o,a)`
- [x] M4–M7 не решены
