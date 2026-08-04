<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-04T13:02:20.076Z |
| Команда | `yarn consilium` |
| Модель | openrouter/anthropic/claude-sonnet-4.6 |
| Файл | `docs/seanses/static-mmbrn-container-m3-access-2026-08-04.md` |
| Порядок ролей | Музыкант → Структурщик → Верстальщик → Архитектор → Teamlead → Математик |
| Повестка | `docs\meeting\static-mmbrn-container\M3_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs\meeting\static-mmbrn-container\M3_AGENDA.md` | 9822 | `53ea90b91792` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs\meeting\static-mmbrn-container\M3_AGENDA.md` | 9822 · 1 п. | `53ea90b91792` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --no-memory --min-replies 30 --seed 47`

**Вопрос:**

Исполните только A1 повестки M3 с обязательными поправками run2. Дайте единый непротиворечивый тип гранта и stable principal, честный отзыв старого partner-cookie и Affine delegation, неэскалирующий object/action mapping, полный case 5 и точную эпистемику. Секция ровно 'Список посылок'; после DoD конец; без эха, самосчёта и meta-реплик. Не решайте M4-M7.

---

# Консилиум: A1 — контракт доступа к static.mmbrn.tech (M3, run2)

**Повестка:** A1 M3 — единый исполнимый контракт доступа: principal, объекты, гранты, серверная граница, Affine delegation, sensitive, отзыв, аудит.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Музыкант → Структурщик → Верстальщик → Архитектор → Teamlead → Математик

---

[Музыкант]: Прежде чем идти в схемы — назову острую точку из run1: грант был без объекта, а Affine-mapping открывал больше, чем разрешала Panel. Сигнал без фильтра даёт клиппинг. Здесь то же: если `reader` в Affine читает байты, а Panel разрешила только `read-metadata` — это пробой. Нужен контракт делегации, который явно перечисляет разрешённые actions и не может быть шире Panel-решения.

[Структурщик]: Поддерживаю. Сначала термин — потом контракт. Principal — это стабильный идентификатор субъекта, не session id. Предлагаю поле `sub` формата `user:<uuid>` из аутентификационного токена, для анонима — сентинел `anon`. Cookie и JWT — только credential, не principal. Это устраняет путаницу run1 с `sessionId`. Все таблицы и алгоритм должны работать с `sub`, не с идентификатором сессии.

[Верстальщик]: С UI-стороны критично одно: серверная граница должна быть до любой выдачи данных, а не после рендера карточки. Сейчас `strategic-docs` — UX-скрытие ссылки, но прямой URL `strategy.mmbrn.tech` открыт. Для `static.mmbrn.tech` такого быть не должно: `forward_auth` через `office /v1/panel/gate/:sectionId` должен закрывать и metadata, и `location.ref`, и любой Affine-URL. UI вторичен.

[Архитектор]: Фиксирую форму решения по run2. Выбираем один тип гранта: **role-grant**. Обоснование: Panel уже работает с `role >= minRole`; индивидуальный грант — это понижение минимальной роли для конкретного `sub` на конкретный объект, то есть исключение из baseline, а не второй механизм. Объект гранта — всегда один из трёх уровней: контейнер, коллекция (`collectionId`), lineage (`canonicalRef`). Грант без объекта и без уровня запрещён. Противоречие run1 «контейнерного гранта нет / он есть» снимается: контейнерного гранта нет как отдельного типа, но `minRole` на контейнере задаёт baseline; индивидуальный role-grant на коллекцию или lineage может снизить этот baseline для конкретного `sub`.

[Teamlead]: Принимаю форму. Теперь конфликт правил. Role-grant на более узкий объект побеждает более широкий baseline, если он разрешительнее (allow wins narrower). Но: грант никогда не поднимает субъект выше `owner` и не открывает owner-only объект не-owner-у. `manage-access` не входит в role-grant — это полномочие только роли `owner`. Это закрывает противоречие run1: `manage-access grant разрешён / запрещён` — он не разрешён как grant вообще, он следует только из роли `owner`. Fail-closed default: если `sub` не распознан или авторизатор недоступен — identity `anon`, доступ `deny`.

[Математик]: Зафиксирую алгоритм effective access точно. Входные данные: `sub` (стабильный principal), `objectRef` (контейнер | `collectionId` | `canonicalRef`), `action`. Шаги: (1) определить `baselineRole(sub)` — из cookie/token поле `role`, при невалидном токене — `public`; (2) найти наиболее узкий role-grant на `objectRef` для данного `sub`; если грант есть и `grant.minRole < baselineRole` — эффективная роль = `grant.minRole`; иначе — `baselineRole`; (3) проверить `effectiveRole >= requiredRole(action, objectRef)`; (4) если (3) false — 403; если авторизатор недоступен — 503 с deny. Никакого allow при недоступности.

[Музыкант]: Affine-delegation — продолжу. Контракт делегации: Panel-proxy создаёт токен с полями `{ sub, canonicalRef, affineDocId, allowedActions[], pv, exp }`. `allowedActions` — подмножество Panel-разрешённых actions для данного `sub` на данный `canonicalRef`, не шире. Mapping: `read-metadata` → Affine `commenter`; `read-bytes` → Affine `reader` только если action `read-bytes` разрешён; `write-metadata` → Affine `editor`; `upload-revision` → Affine `editor`; `manage-access` → Affine `owner` — только если `sub` имеет роль `owner` в Panel. Прямой доступ к Affine-URL без этого токена через proxy — запрещён. `ally -> reader` без проверки `read-bytes` — запрещён.

[Структурщик]: Уточню связь `canonicalRef ↔ affineDocId`. Это mapping-таблица в Panel store: `{ canonicalRef, affineDocId, pv }`. При каждом proxy-запросе Panel-proxy проверяет: (a) токен делегации валиден и не истёк; (b) `pv` в токене совпадает с текущим `permVersion(sub)`; (c) `affineDocId` в токене совпадает с записью в mapping-таблице. Если любое условие нарушено — 403, делегация аннулирована. Это закрывает object/action bypass.

[Верстальщик]: Для case 7 — прямой URL Affine: пользователь открывает `affine.mmbrn.tech/doc/<affineDocId>` напрямую. Если Affine-инстанс сконфигурирован принимать запросы только от Panel-proxy (network-level или Affine workspace auth через proxy), прямой URL даст 401/403. Это не UX-решение — это сетевая конфигурация. M5 решит UX, M7 решит DNS и Caddy. Здесь фиксируем только требование: Affine недоступен напрямую без proxy-токена.

[Архитектор]: Sensitive-видимость. Три уровня: (1) факт записи и `metadata` без `location.ref` — видны при `read-metadata`; (2) `sensitive.reason` и `location.kind` — видны при `read-metadata` для `ally` и выше; (3) `location.ref` — видна только при `read-bytes` или явном полномочии `read-ref` (подмножество `read-bytes`); (4) байты — только `read-bytes`. Скрытие `location.ref` не защищает байты: нужен отдельный check на `read-bytes` у складского endpoint. `sensitive` — не отдельный `location.kind`, это флаг на записи.

[Teamlead]: Отзыв. Честная верхняя граница: партнёрская сессия (`sub=user:*`) несёт snapshot `grants` и `pv`. Живой gate читает `pv` из cookie и сравнивает с `permVersion(sub)` из Panel store при каждом запросе. Если `pv` в cookie меньше текущего — gate запрашивает свежий снимок или возвращает 403. Это означает: максимальный staleness = время одного запроса, не TTL сессии. Affine-делегация: токен содержит `pv`; Panel-proxy сравнивает с актуальным `permVersion(sub)` при каждом proxy-запросе. Истёкший или устаревший `pv` — немедленный deny.

[Математик]: Формализую: пусть `pv_cookie` — версия в cookie, `pv_store` — актуальная в Panel store. Условие allow: `pv_cookie == pv_store`. При `pv_cookie < pv_store`: gate возвращает 403, cookie инвалидируется. При недоступности Panel store: fail-closed, 503. Нет сценария, где старый `pv` даёт allow после изменения политики. Для обычной сессии (только `role`, без `grants`): `pv` не нужен, но изменение роли субъекта требует переиздания сессии — значит, смена роли должна инвалидировать старый session token.

[Музыкант]: Case 4 проверяю: грант отозван, `permVersion` вырос. Старый cookie содержит `pv=5`, новый `pv_store=6`. Gate читает `pv_cookie=5`, сравнивает — несовпадение, deny. Affine-делегация содержит `pv=5` — Panel-proxy при следующем запросе сравнивает с `pv_store=6` — несовпадение, 403, токен делегации аннулируется. Оба канала закрыты на первом запросе после отзыва. Нет окна разрешённого устаревшего allow.

[Структурщик]: Case 5: operator (`sub=user:X`, `role=operator`) запрашивает `read-metadata` на `canonicalRef=urn:mmbrn:static:abc`. Алгоритм: `baselineRole=operator`, `requiredRole(read-metadata)=operator` — allow. Тот же `sub` запрашивает `manage-access` — `requiredRole(manage-access)=owner`, `effectiveRole=operator < owner` — deny. Одна строка в таблице случаев, один алгоритм. `manage-access` не входит ни в какой role-grant — только роль `owner`.

[Верстальщик]: Таблицу полномочий по ролям нужно сделать без привязки к Affine. Предлагаю: `discover` — `public`+; `read-metadata` — `ally`+; `read-bytes` — `operator`+ или role-grant с `minRole=operator`; `download` — `operator`+; `write-metadata` — `operator`+; `upload-revision` — `operator`+; `manage-access` — `owner` только, не грантуется. Для sensitive: `read-metadata` видит факт и `location.kind`+`reason` от `ally`+; `location.ref` — только `read-bytes`.

[Архитектор]: Поправка к `discover`: public-материал с `minRole=public` — allow для `anon`. Если материал закрыт (`minRole > public`) — `anon` получает 403, но не 404: существование объекта раскрывается только при `discover >= minRole`. Иначе: `anon` на ally-объект получает 404 или 403 в зависимости от политики раскрытия факта существования. Предлагаю: факт существования (`discover`) скрыт при `effectiveRole < minRole` — возвращаем 404 для не-owner.

[Teamlead]: Принимаю: `discover` fail-closed — 404 при недостаточной роли. Это закрывает case 2 (анонимный запрос ally-материала) и исключает утечку метаданных через 403 vs 404. Owner всегда видит объект независимо от `minRole` — для управления политикой.

[Математик]: Таблица объектов политики и наследования: контейнер (`static.mmbrn.tech`) → коллекция (`collectionId`) → lineage (`canonicalRef`). Наследование: объект наследует `minRole` от родителя, если собственный не задан. Role-grant на дочерний объект может снизить effective `minRole` для конкретного `sub`, но не ниже `public`. Конфликт: если на коллекцию задан `minRole=operator`, а role-grant на конкретную lineage даёт `ally` — выигрывает grant (allow wins narrower). Но: grant не может давать `public` на объект с `minRole=ally` на уровне контейнера — минимальный floor — `public`.

[Музыкант]: Уточню: «allow wins narrower» означает — более специфичный объект имеет приоритет. Грант на lineage приоритетнее policy коллекции, политика коллекции приоритетнее политики контейнера. Но direction: только allow (снижение порога для конкретного sub). Deny-grant не существует в этой модели — нет deny-rules, только floor от родителя. Это важно для вычислимости.

[Структурщик]: Audit contract. Обязательные поля для события allow/deny: `{ eventType: "allow"|"deny", ts, sub, objectRef, action, effectiveRole, pv, reason }`. Для события изменения политики: `{ eventType: "policy-change", ts, actor, objectRef, prevMinRole, newMinRole, prevGrants, newGrants, pv }`. Хранилище — реализация. Обязательность: каждый gate-запрос пишет событие; каждое изменение политики пишет событие до применения.

[Верстальщик]: Path запроса от identity до выдачи: (1) извлечь credential из cookie/header; (2) валидировать подпись, извлечь `sub` и `role`/`grants`/`pv`; невалидный — `sub=anon`, `role=public`; (3) сравнить `pv_cookie` с `pv_store(sub)`; несовпадение — 403 + инвалидация; (4) определить `effectiveRole` по алгоритму (baseline + narrowest grant); (5) проверить `effectiveRole >= requiredRole(action, objectRef)`; (6) 204 (allow) или 403/404 (deny); (7) записать audit-событие.

[Архитектор]: Для Affine: отдельный путь через Panel-proxy. (1)–(4) — те же; (5) дополнительно: проверить mapping `canonicalRef → affineDocId`; (6) выдать короткоживущий токен делегации `{ sub, canonicalRef, affineDocId, allowedActions[], pv, exp: now+300s }`; (7) Panel-proxy форвардит запрос в Affine с Affine-native role из mapping; (8) при каждом следующем proxy-запросе — повторить проверку `pv`. Токен делегации — не сессия, максимальный TTL 5 минут.

[Teamlead]: Закрываю обсуждение. Все восемь случаев покрыты единым алгоритмом. Один тип гранта (role-grant), один principal (`sub`), один авторизатор (Panel), Affine — механизм исполнения без второй истины, `pv`-синхронизация устраняет staleness. Выношу вердикт: A1 принят. Carrier — `docs/seanses/static-mmbrn-container-m3-access-2026-08-04.md`.

[Математик]: Принимаю. Алгоритм вычислим, нет неопределённых ветвей. Единственная реализационная деталь вне M3: хранилище `pv_store` — Panel store, его доступность является fail-closed условием, не опциональной проверкой.

[Музыкант]: Принимаю. Affine-mapping не повышает полномочий: `allowedActions` в токене делегации строго подмножество Panel-allow для данного `sub`.

[Структурщик]: Принимаю. Термины однозначны: `sub`, `role-grant`, `canonicalRef`, `pv`. Нет синонимов, нет двойных механизмов.

[Верстальщик]: Принимаю. Серверная граница — `office /v1/panel/gate/:sectionId` и Panel-proxy — закрывает и прямые URL, и Affine-обход.

[Архитектор]: Принимаю. Форма решения держит конструкцию без декора.

---

## Итоговое решение консилиума

### Пропозиция A1

Единственным каноническим авторизатором доступа к `static.mmbrn.tech` является **Panel**. Нативные роли Affine — механизм исполнения делегации, не источник авторизационного решения. При любой неопределённости identity или недоступности Panel — fail-closed (deny).

---

### Таблица объектов политики и наследования

| Уровень | Идентификатор | minRole-baseline | Наследование | Role-grant возможен |
|---|---|---|---|---|
| Контейнер | `static.mmbrn.tech` | задаётся явно | — | Нет (задаёт floor) |
| Коллекция | `collectionId` | от контейнера если не задан | от контейнера | Да — для `sub` |
| Lineage | `canonicalRef` | от коллекции если не задан | от коллекции | Да — для `sub` |

**Наследование:** дочерний объект наследует `minRole` родителя если собственный не задан. Role-grant на более узкий объект снижает effective `minRole` для конкретного `sub` (allow wins narrower). Deny-grant отсутствует. Grant не поднимает субъект выше `owner`; grant не открывает owner-only объект.

---

### Stable principal

| Поле | Значение | Источник |
|---|---|---|
| `sub` | `user:<uuid>` | аутентификационный токен (JWT/cookie) |
| anonymous sentinel | `anon` | отсутствующий или невалидный credential |
| credential | cookie / Authorization header | только носитель, не principal |

`sessionId` не является principal и не используется в алгоритме.

---

### Алгоритм effective access

```
function effectiveAccess(sub, objectRef, action):
  1. credential → validate → sub ("anon" if invalid), role, grants[], pv_cookie
  2. if sub != "anon": compare pv_cookie with pv_store(sub)
       if pv_cookie < pv_store → deny 403, invalidate credential
  3. baselineRole = role  // public | ally | operator | owner
  4. narrowestGrant = find role-grant where grant.sub==sub
       AND grant.objectRef is most-specific ancestor-or-equal of objectRef
     if found AND grant.minRole < baselineRole:
       effectiveRole = grant.minRole
     else:
       effectiveRole = baselineRole
  5. requiredRole = policy(action, objectRef)
  6. if effectiveRole >= requiredRole → allow 204
     else if action == "discover" AND effectiveRole < minRole(objectRef) → deny 404
     else → deny 403
  7. if Panel store unavailable → deny 503 (fail-closed)
  8. write audit event
```

---

### Таблица полномочий по ролям

| Полномочие | public | ally | operator | owner | Грантуется role-grant |
|---|---|---|---|---|---|
| `discover` | ✓ (public objects) | ✓ | ✓ | ✓ | Да — снижает порог |
| `read-metadata` | — | ✓ | ✓ | ✓ | Да |
| `read-bytes` | — | — | ✓ | ✓ | Да |
| `download` | — | — | ✓ | ✓ | Да |
| `write-metadata` | — | — | ✓ | ✓ | Да |
| `upload-revision` | — | — | ✓ | ✓ | Да |
| `manage-access` | — | — | — | ✓ | **Нет** — только роль `owner` |

Для sensitive-записей: факт записи + `location.kind` + `sensitive.reason` видны при `read-metadata` (ally+); `location.ref` — только при `read-bytes` (operator+); байты — только `read-bytes`.

---

### Последовательность проверки запроса

```
Запрос
  │
  ▼
[1] Извлечь credential (cookie / header)
  │
  ▼
[2] Валидировать подпись → sub, role, grants[], pv_cookie
    невалидный → sub=anon, role=public
  │
  ▼
[3] Если sub != anon: pv_cookie == pv_store(sub)?
    НЕТ → 403 + инвалидация credential
  │
  ▼
[4] Определить effectiveRole (baseline + narrowest role-grant)
  │
  ▼
[5] effectiveRole >= requiredRole(action, objectRef)?
    ДА → 204 (allow)
    НЕТ → 404 (discover denied) / 403 (action denied)
  │
  ▼
[6] Panel store недоступен → 503 (fail-closed, deny)
  │
  ▼
[7] Записать audit-событие
```

---

### Таблица соответствия Panel → Affine

| Panel effectiveRole | Разрешённые Panel actions | Affine native role в токене делегации | Условие |
|---|---|---|---|
| `ally` | `discover`, `read-metadata` | `commenter` | allowedActions не включает `read-bytes` |
| `operator` | + `read-bytes`, `download`, `write-metadata`, `upload-revision` | `editor` | allowedActions включает `read-bytes` |
| `owner` | + `manage-access` | `owner` | только если Panel role = `owner` |

Токен делегации: `{ sub, canonicalRef, affineDocId, allowedActions[], pv, exp: now+300s }`.
Mapping `canonicalRef → affineDocId` — Panel store. При каждом proxy-запросе: (a) токен не истёк; (b) `pv` в токене == `pv_store(sub)`; (c) `affineDocId` совпадает с mapping. Нарушение любого → 403.

Affine недоступен напрямую без proxy-токена (сетевое ограничение, не UX).

---

### Таблица восьми обязательных случаев

| # | Субъект | Объект | Действие | Решение | Где проверяется | Почему |
|---|---|---|---|---|---|---|
| 1 | `anon` | lineage с `minRole=public` | `discover` + `read-metadata` | **allow** | gate шаг 5: `public >= public` | effectiveRole=public, requiredRole=public — условие выполнено |
| 2 | `anon` | lineage с `minRole=ally` | `discover` | **deny 404** | gate шаг 6: `public < ally` | effectiveRole=public < minRole=ally → 404, факт существования не раскрывается |
| 3 | `sub=user:X`, `role=public` | коллекция с `minRole=ally`, role-grant `{sub: user:X, objectRef: collectionId, minRole: ally}` | `read-metadata` | **allow** | gate шаг 4: grant снижает minRole; шаг 5: `ally >= ally` | narrowest grant даёт effectiveRole=ally, requiredRole=ally — allow |
| 4 | `sub=user:X`, cookie `pv=5`; `pv_store=6` (грант отозван); Affine-токен `pv=5` | коллекция / Affine doc | любое | **deny 403** | gate шаг 3: `pv_cookie != pv_store`; proxy шаг b: `pv_token != pv_store` | Оба канала закрыты на первом запросе после отзыва; нет окна устаревшего allow |
| 5 | `sub=user:Y`, `role=operator` | lineage `canonicalRef=urn:mmbrn:static:abc` | `read-metadata` → allow; `manage-access` → deny | **allow / deny** | gate шаг 5 дважды: `operator >= operator` (allow); `operator < owner` (deny) | `manage-access` не грантуется; требует role=owner; один алгоритм, одна проверка |
| 6 | `sub=user:Z`, `role=owner` | контейнер | `manage-access` | **allow** | gate шаг 5: `owner >= owner` | effectiveRole=owner, requiredRole(manage-access)=owner — allow |
| 7 | любой `sub` | Affine doc URL напрямую | GET без proxy-токена | **deny 401/403** | Affine network layer / proxy | Affine сконфигурирован принимать запросы только от Panel-proxy; прямой URL не проходит без валидного токена делегации |
| 8 | `sub=user:W`, `role=ally` | sensitive lineage | `read-metadata` (allow) → видит факт, `location.kind`, `sensitive.reason`; `location.ref` → deny; `read-bytes` → deny | **allow read-metadata; deny ref+bytes** | gate шаг 5: `ally >= ally` (allow metadata); `ally < operator` (deny read-bytes и ref) | `location.ref` требует `read-bytes`; скрытие ref ≠ защита байтов; оба проверяются отдельно |

Все восемь решений следуют из одного алгоритма (шаги 1–7 выше), без исключений.

---

### Минимальный audit contract и правила отзыва

**Audit event allow/deny:**
```
{
  eventType: "allow" | "deny",
  ts: ISO8601,
  sub: string,           // "anon" для анонима
  objectRef: string,     // canonicalRef | collectionId | container
  action: string,
  effectiveRole: string,
  pv: number | null,
  reason: string         // "role-baseline" | "role-grant" | "pv-mismatch" | "unavailable" | ...
}
```

**Audit event policy-change:**
```
{
  eventType: "policy-change",
  ts: ISO8601,
  actor: string,         // sub владельца
  objectRef: string,
  prevMinRole: string,
  newMinRole: string,
  prevGrants: Grant[],
  newGrants: Grant[],
  newPv: number
}
```
Событие policy-change пишется до применения изменения.

**Правила отзыва:**
- Изменение политики → `permVersion(sub)++` → следующий запрос с `pv_cookie < pv_store` → deny 403.
- Смена роли субъекта → переиздание session token (старый инвалидируется).
- Affine-делегация: TTL max 300s + `pv`-проверка на каждом proxy-запросе.
- Panel store недоступен → fail-closed 503, без fallback на кеш.
- Неизвестный `sub` → `anon`, `role=public`, fail-closed.
- Устаревшая делегация (`pv` не совпадает) → 403 без повтора.

---

## Список посылок

| # | Посылка | Тип |
|---|---|---|
| 1 | `static.mmbrn.tech` — полноценный контейнер Membrana; Affine — сменный движок, не граница контейнера | **норма** (M1) |
| 2 | `registry.jsonl` — источник истины о регистрации, record/lineage identity и истории | **норма** (M2) |
| 3 | `canonicalRef = "urn:mmbrn:static:" + rootId` однозначно идентифицирует lineage, не является публичным URL | **норма** (M2) |
| 4 | Sensitive-запись хранит `location.kind`, непустой `location.ref`, `sensitive.reason`; M3 решает видимость `location.ref` | **норма** (M1/M2) |
| 5 | Смена адреса или движка не меняет байтовое и lineage-тождество | **норма** (M2) |
| 6 | Panel определяет полный порядок ролей `public < ally < operator < owner` | **факт** (измеренная реализация) |
| 7 | Доступ к разделу вычисляется как `role >= minRole` или индивидуальный грант на `sectionId`; грант не открывает owner-only раздел | **факт** (измеренная реализация) |
| 8 | Изменение грантов пользователя увеличивает `permVersion` и пишет audit-запись в Panel | **факт** (измеренная реализация) |
| 9 | `office /v1/panel/gate/:sectionId` возвращает 204/403/404; невалидная сессия → identity `public` | **факт** (измеренная реализация) |
| 10 | `forward_auth` существует только для `graphify` и `research-tree` (minRole: operator); для `static.mmbrn.tech` — не существует | **факт** (измеренная реализация) |
| 11 | `strategic-docs` (minRole: ally) — UX-доступ к карточке и ссылке; прямой URL `strategy.mmbrn.tech` не защищён серверно | **факт** (измеренная реализация) |
| 12 | Affine имеет независимые workspace privacy и роли; передачи identity, решений Panel и отзывов грантов в Affine сейчас нет | **факт** (измеренная реализация) |
| 13 | Партнёрская сессия (`sub=user:*`) несёт snapshot `grants` и `pv`; обычная сессия — `kind`, `role`, `sub`, `exp`; gate использует cookie-derived role/grants без сверки с store | **факт** (измеренная реализация) |
| 14 | Panel — единственный канонический авторизатор; Affine roles — механизм исполнения, не вторая истина | **норма** (A1, M3) |
| 15 | Principal — `sub` формата `user:<uuid>`; anonymous sentinel — `anon`; credential (cookie/token) ≠ principal | **норма** (A1, M3) |
| 16 | Единственный тип гранта — role-grant с объектом и `minRole`; `manage-access` не грантуется, только роль `owner` | **норма** (A1, M3) |
| 17 | Fail-closed: недоступный авторизатор → 503 deny; неизвестный `sub` → `anon`; `pv`-несовпадение → 403 | **норма** (A1, M3) |
| 18 | `pv_cookie` сравнивается с `pv_store(sub)` при каждом запросе; несовпадение → deny без staleness-окна | **норма** (A1, M3) |
| 19 | Affine-делегация: токен `{ sub, canonicalRef, affineDocId, allowedActions[], pv, exp }`; TTL max 300s; `allowedActions` — строгое подмножество Panel-allow | **норма** (A1, M3) |
| 20 | `location.ref` видна только при `read-bytes`; скрытие ref ≠ защита байтов | **норма** (A1, M3) |

---

## Definition of Done

- [x] Один вопрос A1 и один carrier
- [x] Назван один канонический источник решений (Panel) и статус Affine roles (механизм исполнения)
- [x] Определены субъект (`sub`/`anon`), объекты (контейнер/коллекция/lineage), гранулярность, наследование и конфликт правил
- [x] Разведены полномочия и sensitive-видимость
- [x] Серверная граница (gate + proxy) закрывает прямой обход
- [x] Отзыв (`pv`-синхронизация), fail-closed и audit contract исполнимы
- [x] Восемь случаев доказаны единым алгоритмом
- [x] M4–M7 не решены
