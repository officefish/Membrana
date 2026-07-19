# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-19T13:33:10.063Z |
| Команда | `yarn consilium` |
| Модель | claude-opus-4-8 |
| Файл | `docs/seanses/insight-archive-lifecycle-c4-history-model-r2-2026-07-19.md` |
| Порядок ролей | Музыкант → Структурщик → Teamlead → Верстальщик → Математик |
| Повестка | `docs\meeting\insight-archive-lifecycle\C4_REPAIR_TOPIC.md` |

**Вопрос:**

Исправить только C4 после BLOCK: typed EventEnvelope/payloads/correction, deterministic reducer and version-explicit replay, separate assertion-history and V=active|archived|None representation views, measured rebuildable cache boundary. C3 content/C5–C7 не решать. Требуется ВЕРДИКТ C4.

---

# Консилиум: C4-repair — typed history, отдельная V-проекция и детерминированный replay

**Повестка:** Исправить C4 после BLOCK: typed `EventEnvelope`/payloads/correction-семантика, детерминированный reducer и version-explicit replay, раздельные view (assertion-history и V=active|archived|None), измеренная граница rebuildable cache. C3-содержимое и C5–C7 — не решать.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Музыкант → Структурщик → Teamlead → Верстальщик → Математик (циклически)

---

[Музыкант]: По касательной, аудио тут не задет, но ритм event-лога я узнаю — это как маршрут сигнала: один источник (committed ordered log) → эффекты (reducer) → выход (views). Мой флаг из `ritual-inputs-echo`: не смешивать источник и его отражения. Revoke/supersede — это не «archived», это разные шины, как sidechain и мастер. Если свести их в один вид — получим «щелчок» на стыке, как рассинхрон клоков в rt-q3.

[Структурщик]: Начну с термина, иначе спор поплывёт. У нас три разные леммы слиплись под словом «убрать»: **revoke** (утверждение аннулировано — было ошибкой), **supersede** (решение заменено следующей ревизией), **V=archived** (репрезентация ушла в архив как валидное состояние жизненного цикла). Это как омоним «code-review» 16.07 — один носитель, три смысла. C4_AUDIT забраковал именно склейку. Норма: три термина — три поля, три view-проекции, ни одна не выводит D/L/O.

[Teamlead]: Рамку фиксирую сразу, чтобы repair не расползся в C5–C7. Мы правим **только C4** — контракт события, reducer, replay, views, граница кэша. Concurrency, atomicity, workflow, legacy — за границей, помечаем open-map и не трогаем. По конструкции: `EventLog` — несущая стена, всё derived — навесной фасад, который обязан пересобираться из стены. Если корректность зависит от кэша — это декор, притворяющийся конструкцией. Отклоняю такое.

[Верстальщик]: С точки зрения потребителя view — а потребитель это агент и человек в PR — сегодняшняя боль в том, что «отозвано» и «в архиве» выглядят одинаково. Это **мёртвая дверь**: читатель видит запись без текущего значения и не понимает, отменена она или просто архивна. Моя норма из `truth-graph-unify-or-split`: разные сущности — разные блоки с чёткой границей, один главный акцент. Три view = три холста, не один смешанный поток.

[Математик]: Формализую, иначе останется вкусовым. Reducer — это чистая функция `fold: (Event[], targetSchemaVersion) → State`. Требование детерминизма — не тавтология `fold(E)=fold(E)`, а сильнее: для **любого** committed total-order лога и фиксированной target-версии результат единственен и не зависит от момента вызова. Это инвариант `∀E, v: fold(E,v)` определён и total на supported versions. Тавтология владельца в аудите справедлива — я даю операциональный критерий вместо неё.

[Музыкант]: Поддержу Математика живой аналогией: это как рендер трека из проекта. Открыл проект (лог), нажал экспорт (fold) — при одной версии движка получаешь бит-в-бит один и тот же wav. Если два экспорта дают разное — где-то скрытое состояние, недокументированный «магический» плагин в цепочке. C4 обязан такие плагины запретить: reducer без побочных входов, только лог и версия.

[Структурщик]: Тогда фиксирую словарную статью `EventEnvelope`. Обязательные поля: `eventId` (идентичность события), `kind` (`assert|revoke|supersede|reopen`), `schemaVersion` (версия payload-схемы), committed total-order ключ (`seq`), exact target ref, typed `payload`. Способ выдачи `seq` и атомарность — **не здесь**, это C7, ставлю метку open. Envelope — это лемма «что произошло», без «как это записалось конкурентно».

[Teamlead]: Принимаю envelope. Но требую жёсткость по payload'ам, иначе C6 налепит поверх свою форму. `assert`: новый `assertionId`, `axis`, exact subject ref, exact value, опциональный **opaque** `evidenceRef` — содержимое evidence не наше, это C3. `revoke`: target assertion ID. `supersede` (event-only): old decision assertion ID + successor revision ID. `reopen`: old revision ID + new revision ID + идентичность initial-assertion D=`proposed`. Больше в C4 ничего.

[Верстальщик]: По `evidenceRef` — согласен, что opaque, и с витрины это правильно: view показывает «есть свидетельство» как ссылку-бейдж, не разворачивая контент. Иначе C4 начнёт диктовать, как рисовать C3, а мы схему C3 не знаем. Это честная мёртвая дверь: ссылка ведёт наружу, C4 не притворяется, что знает, что за ней.

[Математик]: Теперь correction-семантика — численно чистая. Коррекция = append `revoke(old)` + `assert(new)`. Никакого rewrite/delete: лог монотонно растёт, `|E|` только увеличивается. Корреляция двух событий допустима как метаданные, но **атомарность их пары** — это C7, я её здесь не гарантирую. Инвариант C4: прошлые события иммутабельны, `E[i]` после commit не меняется никогда.

[Музыкант]: Это ровно «не перезаписывай мастер» из моего опыта `truth-graph-q1`. Приняли, свели, зафиксировали — новая версия кладётся **поверх**, оригинал жив. Revoke — это не стёртая дорожка, это дорожка, помеченная mute в истории. Слышно, что она была, слышно, что заглушена. C4 хранит и то и другое.

[Структурщик]: Теперь раздельные views — это критическая точка, здесь C4 и провалился. **View A** (assertion-history/current): над assert/revoke/supersede, показывает историю и текущее активное утверждение по оси. **View B** (representation): строго по active V assessment → `active | archived | None`. И жёсткое правило нормы: revoked ≠ archived, superseded ≠ archived. `None` — легитимное третье значение, не пустота-ошибка. Ни один view не выводит D/L/O.

[Teamlead]: Вот это `None` — несущий элемент, а не удобство. Отсутствие active V assessment — это **явное состояние**, а не «забыли посчитать». В аудите нас поймали на том, что unclassified растворялся. По конструкции: три значения V (`active|archived|None`) — три честные двери, каждая оправдана. LGTM на такую проекцию.

[Верстальщик]: С витрины `None` = «Не классифицировано», отдельный бейдж, не серая пустота. Как `unlabeled` в DESIGN.md — `badge badge-neutral`, честный текст «Не установлено». Читатель сразу видит: это не архив и не активно, это неопределённость. Один главный акцент на текущее V, история — вторичным блоком, приглушённо. Никакого смешанного потока revoke+archive в одной колонке.

[Математик]: Version-explicit replay: `replay(log, targetSchemaVersion)`. Upcast'ы обязаны быть pure, deterministic, **total** на supported versions, композициональны и path-independent — то есть `upcast(v1→v3) = upcast(v2→v3) ∘ upcast(v1→v2)`. Это не косметика: без path-independence два маршрута апгрейда дадут разный результат, и детерминизм reducer'а рухнет. Semantically preserving: upcast меняет форму, не смысл. Past events не rewrite — upcast применяется **при чтении**, лог остаётся в исходных версиях.

[Музыкант]: Path-independence — это как цепочка конвертеров семплрейта: 44.1→48→96 должно дать то же, что 44.1→96 напрямую, иначе на каждом стыке копится артефакт. Математик прав, это несущее требование, не украшение.

[Структурщик]: Теперь граница кэша — и здесь я держу норму жёстко. `EventLog` остаётся **authoritative**, единственный источник истины. Snapshot/cache — только discardable, rebuildable, non-authoritative derived-оптимизация. Корректность **не зависит** от кэша: удали кэш — система пересобирает состояние из лога и даёт тот же ответ. CQRS/bus/saga не вводить — это преждевременная архитектура, C6/C7.

[Teamlead]: И «measured» — не пустое слово. Владелец в аудите требовал: граница кэша **измерена**, а не назначена магическим числом. Значит C4 не фиксирует «кэшируем N событий», а фиксирует **правило**: кэш вводится только после benchmark, показавшего стоимость full-replay, и его размер — производная от измерения, не константа в промпте. До benchmark — кэша нет, только чистый replay. Это конструктивно честно.

[Математик]: Подтверждаю численно. Граница кэша — это функция от измеренной величины `cost(full_replay) = f(|E|)`. Пока `|E|` мал и `cost` приемлема — кэш не нужен, он был бы декором. Кэш оправдан, только когда benchmark показал `cost > threshold`, и тогда его параметр выводится из данных, а не из вкуса. Инвариант корректности от кэша не зависит: `fold(E)` с кэшем ≡ `fold(E)` без кэша.

[Верстальщик]: С потребительской стороны это тоже правильно: кэш невидим для читателя view. View всегда показывает результат, будто он пересобран из лога — есть кэш или нет, картинка идентична. Иначе получим «щелчок» на экране при инвалидации кэша, а это ложь состояния.

[Teamlead]: Собираю вердикт. DoD — **только contract-level**: убираем implementation API, конкретные тесты, UI-labels, reviewer roles — это C6. Логические посылки только C1_VERDICT, C2_VERDICT, C4_TOPIC и M0/DEPS; чужие сессии и персона-журналы — не основания решения. Open-map явный: C5 legacy, C6 workflow/UX/enforcement/implementation, C7 concurrency/idempotency/atomicity/recovery. Все принимают?

[Структурщик]: Принимаю. Термины разведены, границы пакета-контракта чистые, view B с `None` закрывает дыру аудита.

[Математик]: Принимаю. Детерминизм дан операционально, upcast path-independent, граница кэша — производная от benchmark, а не константа.

[Музыкант]: Принимаю, по касательной, но ритм лога и запрет на rewrite-мастера — верные.

[Верстальщик]: Принимаю. Три view — три честных холста, `None` виден, кэш невидим.

[Teamlead]: LGTM. Фиксирую **ВЕРДИКТ C4**.

---

## ВЕРДИКТ C4

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| **EventEnvelope** | Typed, обязательные поля: `eventId`, `kind ∈ {assert, revoke, supersede, reopen}`, `schemaVersion`, committed total-order `seq`, exact target ref, typed `payload`. Способ выдачи `seq`/атомарность → **C7 (open)**. |
| **payload: assert** | новый `assertionId`, `axis`, exact subject ref, exact value, опциональный **opaque** `evidenceRef` (схема/кардинальность/критерии evidence → C3, не C4). |
| **payload: revoke** | target assertion ID. |
| **payload: supersede** (event-only) | old decision assertion ID + successor revision ID. |
| **payload: reopen** | old revision ID + new revision ID + идентичность initial-assertion с D=`proposed`. |
| **Correction-семантика** | append `revoke(old)` + `assert(new)`. Корреляция допустима как метаданные; atomicity/idempotency пары → **C7**. Rewrite/delete запрещён; committed events иммутабельны. |
| **Deterministic reducer** | `fold: (Event[], targetSchemaVersion) → State`. Единственный результат для любого committed total-order лога + target-версии; total на supported versions; без побочных входов. Критерий сильнее тавтологии `fold(E)=fold(E)`: определён и single-valued для всех E. |
| **View A (assertion-history/current)** | над assert/revoke/supersede; история + текущее активное утверждение per axis+subject. |
| **View B (representation)** | строго по active V assessment → `active \| archived \| None`. `None` — легитимное третье состояние. **revoked ≠ archived, superseded ≠ archived.** |
| **Инвариант views** | Ни один view не выводит D/L/O. |
| **Version-explicit replay** | `replay(log, targetSchemaVersion)`. Upcasts: pure, deterministic, total на supported versions, композициональны, **path-independent**, semantically preserving. Past events не rewrite; upcast применяется при чтении. |
| **Граница кэша** | `EventLog` — authoritative. Snapshot/cache — discardable, rebuildable, non-authoritative. Корректность от кэша не зависит. Граница/размер — **измерена** через benchmark `cost(full_replay)=f(\|E\|)`, не фиксированное число; до benchmark кэша нет. CQRS/bus/saga не вводить. |
| **Open-map** | C3 content, C5 legacy, C6 workflow/UX/enforcement/implementation, C7 concurrency/idempotency/atomicity/recovery — **не решены здесь**. |
| **Посылки** | Только C1_VERDICT, C2_VERDICT, C4_TOPIC, M0/DEPS. Чужие сессии/персона-журналы — не основания. |

**Definition of Done (contract-level, без implementation API / тестов / UI-labels / reviewer roles):**

- Определён typed `EventEnvelope` со всеми обязательными полями и четырьмя `kind`; способ атомарного assignment `seq` явно отложен в C7.
- Заданы exact typed payloads для `assert` / `revoke` / `supersede` / `reopen`; `evidenceRef` — opaque optional, C3-схема не фиксируется.
- Correction определён как `revoke(old)+assert(new)` без rewrite/delete; committed-иммутабельность зафиксирована.
- Reducer-контракт даёт единственный результат на committed total-order log + target schema version (не тавтология).
- Определены **раздельные** view: assertion-history/current и representation с V ∈ `active|archived|None`; revoked/superseded явно ≠ archived; views не выводят D/L/O.
- `replay(log, targetSchemaVersion)` с pure/total/path-independent/semantically-preserving upcasts; past events не переписываются.
- Граница non-authoritative cache задана как rebuildable/discardable и **measured** (benchmark-производная), а не константа; корректность независима от кэша.
- Sources ограничены разрешёнными посылками; open-map (C3 content, C5–C7) зафиксирован без принятия решений за них.

---

*Реплик в диалоге: 26; каждый участник высказался не менее одного раза.*
