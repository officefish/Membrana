# Обсуждение: plugin-results-bridge-b4

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-19 09:31 UTC · dynin

**Вопрос:** Блок b4 спринта plugin-results-bridge: в media нет входа, зовущего host.request — добавляю POST /v1/devices/:deviceId/collections/:collectionId/plugins/:pluginId/request (ApiTokenGuard+DeviceGuard), который собирает PluginContext: runId UUID v7 (переношу uuidV7 из scripts/plugin-run-mfcc.mjs в @membrana/plugin-handlers как общий помощник), fingerprints — тем же mfccFingerprintsOf по тем же deps, что у executor (регистратор держит deps и отдаёт contextFor(pluginId, collectionId, trigger)), resumeMode 'fresh', trigger из закрытого PLUGIN_TRIGGERS (тело запроса, умолчание collections.sample_added), payload {collectionId, occurredAt}. Сид onResult собирает RunRecord {...result, address, fingerprints, resumeMode} и зовёт мост; исход моста — в лог именем. Заглушки (не mfcc) — request отвечает 400 «прогон не определён». Как математик: что в этой форме недетерминировано или двоится? чем покрыть зубами?

**Ответ:**

Считаю форму по швам, где может протечь детерминизм и/или задвоиться запись.

[память:подсознание] emerge dynin-2026-08-17-server-plugin-foundation-m6r-first-wave — там я уже фиксировал состав RunRecord и адрес (pluginId, version, collectionId, runId, mountTarget); текущий b4 — ровно вход, порождающий такую запись, и швы совпадают.
[память:подсознание] emerge dynin-2026-07-23-llm-procedure-channels-m4a-agent-usage — там же схема идемпотентности через клиентский eventId и dedupe; здесь ровно этот приём нужен для повторов POST /request.

Где двоится или плывёт:

1. **runId генерится на сервере при каждом POST.** Ретрай клиента = два прогона одного события. Нужен ключ идемпотентности от вызывающего (`requestId` в теле или `Idempotency-Key` в заголовке) + окно dedupe в регистраторе: `(deviceId, pluginId, collectionId, requestId) → runId`. UUID v7 оставляем, но он — следствие ключа, а не корень.
2. **trigger + payload не связаны контрактом.** `PLUGIN_TRIGGERS` закрыт — хорошо; но `payload` при `sample_added` обязан нести `sampleId`/`occurredAt`, при других — другое. Заведи дискриминированное объединение `RequestBody = { trigger: T; payload: PayloadOf<T> }` и валидатор на входе, иначе fingerprints будут считаться от «почти одинакового» входа.
3. **fingerprints зависят от deps executor'а.** Если `contextFor` берёт deps «сейчас», а executor — «тогда», при обновлении deps между постановкой и исполнением два соседних запроса дадут разные отпечатки на одинаковом входе. Замораживай снимок deps в момент создания контекста и клади его хэш в RunRecord (`depsSnapshotId`).
4. **resumeMode: 'fresh' зашит.** Это политика, а не константа математики. Оставь параметром запроса с умолчанием `fresh`; иначе идемпотентность и resume будут конфликтовать (см. п.1).
5. **Заглушки отвечают 400 «прогон не определён».** Семантически это 404/501 (нет реализации для pluginId), а 400 — ошибка ввода. Смешение кодов ломает метрики по логам («исход моста именем»).
6. **uuidV7 переезжает в @membrana/plugin-handlers.** Проверь монотонность в пределах процесса (счётчик внутри той же миллисекунды) и явный источник времени (`now()` инъектится) — иначе тесты недетерминированы, а сортировка по runId иногда врёт.
7. **Гонка sid onResult vs. мост.** Если onResult собирает RunRecord и зовёт мост асинхронно, а следующий request приходит раньше — нужен happens-before на `(pluginId, collectionId, requestId)`: одна запись, одно применение.

Зубами покрыть (минимальный набор тестов чистых функций):

- `deriveRunId(requestId, salt) → uuidV7` — детерминирован при равных входах, монотонен во времени.
- `validateRequest(trigger, payload)` — таблица: все `T ∈ PLUGIN_TRIGGERS` × валидные/битые payload.
- `mfccFingerprintsOf(sample, deps)` — устойчивость: две попытки на одном входе → равные отпечатки; смена `depsSnapshotId` → отпечатки меняются.
- `buildRunRecord(result, address, fingerprints, resumeMode)` — форма и обязательные поля; отказ при отсутствии `depsSnapshotId`.
- Идемпотентность моста: два вызова с одним `requestId` → одна запись в mountTarget (property-тест на 1000 повторов со случайной задержкой).

Что НЕ сказано: я не трогаю авторизацию (ApiTokenGuard+DeviceGuard — доверяю) и не оцениваю стоимость 501 vs 404 для наблюдаемости — это к Структурщику.

Уточню одно: `requestId` — вводим сейчас в b4, или откладываем и живём с риском дублей до следующего блока?

---
