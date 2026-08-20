# Обсуждение: cut-media-per-device-token-vesnin

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-20 11:12 UTC · vesnin

**Контекст:** docs/prompts/SESSION_V_PER_DEVICE_TOKEN_SPRINT_2026-08-20.md
**Вопрос:** Нарежь реализацию ADR-0028 R1+R2 media-per-device-token: media выдаёт per-device client token при pair/register, PairResponse.mediaToken остаётся строкой с этим ключом, revoke pairedKey каскадно отзывает media key. Запреты: R3/R4, apps/client, PairResponse shape, prod deploy. Учитывай найденный код: PairService.pair возвращает config.MEDIA_API_TOKEN; MediaBridgeService.registerDevice сейчас возвращает device id; NodeKeyService/NodeKeyStore/NodeKeyGuard уже есть; CollectionsController/SamplesController защищены ApiTokenGuard+DeviceGuard; MembraneService.revokeAccessKey уже чистит session/pairingStatus.

**Ответ:**

## Нарезка реализации ADR-0028 Р1+Р2

Принимаю исходные данные:
- **Р1**: per-device token вместо `MEDIA_API_TOKEN` в `PairResponse.mediaToken` (форма поля не меняется).
- **Р2**: revoke `pairedKey` → каскадный отзыв media-ключа.
- Контракт: `NodeKeyService`, `NodeKeyStore`, `NodeKeyGuard` уже есть; `MediaBridgeService.registerDevice` — точка выхода device id.

Вижу несколько уточняющих вопросов перед нарезкой:

### Уточнение 1: поле `audience` в `NodeKey`

Веснин предложил разделить subjects через `audience: 'node' | 'client'`. Текущая таблица `NodeKey` спроектирована под узлы (adr-0027). Какой из трёх путей:

- **А)** Расширить `NodeKey` полем `audience`, guard проверяет его; один subjects-тип в схеме.
- **Б)** Создать отдельную таблицу `ClientDeviceToken` с тем же контрактом (sha256-хеш, ttl, revoke).
- **В)** Держать `NodeKey` для узлов, но добавить метод `NodeKeyStore.createClientKey()`, который пишет в ту же таблицу с предустановленным `audience: 'client'`.

Рекомендуешь какой?

### Уточнение 2: точка регистрации device-token

`MediaBridgeService.registerDevice` сейчас возвращает device id под служебным токеном. Нужна ли **отдельная ручка** для регистрации ключа, или token генерируется **внутри** `registerDevice`? Проверяю контракт:

- Кабинет вызывает `PairService.pair(…)` → тот должен где-то вызвать media и получить per-device token?
- Или: кабинет под служебным токеном вызывает `MediaBridgeService.registerDevice`, затем media возвращает device id, и кабинет сам вызывает `MediaBridgeService.createClientKey(deviceId)`?

### Уточнение 3: ревок в кабинете

`MembraneService.revokeAccessKey` сейчас чистит session/pairingStatus. Должна ли она **одновременно** HTTP-вызвать media для ревока ключа, или ревок — отдельный шаг через кабинетский резчик (`PairingController.revokePairing(…)`) → вызов media guard-ручки?

---

После ответов на эти три пункта я дам вам:
- Нарезку по пакетам (media / cabinet / что трогаем).
- Порядок PR (какой файл первым, зависимости).
- Чек-лист `sprint:gate/experience`.

---
## 2026-08-20 11:12 UTC · vesnin

**Контекст:** docs/prompts/SESSION_V_PER_DEVICE_TOKEN_SPRINT_2026-08-20.md
**Вопрос:** Ответы координатора на развилки: А) расширяем NodeKey полем audience: 'node' | 'client', один store/service с audience в методах; node guard требует audience node, client guard требует audience client. Точка выдачи: registerDevice на media возвращает device id плюс clientKey.raw; для уже существующего mediaDeviceId кабинет вызывает отдельный issueClientKey(deviceId, rotate=true), потому что raw не хранится. Ревок: MembraneService.revokeAccessKey после локального revoke/session cleanup вызывает MediaBridgeService.revokeClientKey(mediaDeviceId), best-effort/awaited как часть каскада без прод-деплоя. Теперь дай финальную нарезку membrana-local-sprint по блокам с персонами, зонами, порядком PR <=400 строк и зубами без Postgres.

**Ответ:**

**Веснин здесь.** Координатор выстроил логику. Согласен с архитектурой — `audience` в NodeKey чист, один контракт, два subject'а. Развожу по нарезке.

## Финальная нарезка membrana-local-sprint (Р1+Р2 ADR-0028)

### Блок 1. Расширение контракта NodeKey в core

**Персона:** Структурщик  
**Зона:** `packages/background-media/src/modules/firebat-node/`  
**Вывод:** тип + хранилище interface

```
PR ≤80 строк:
  - NodeKey.audience: 'node' | 'client' (обязательное поле)
  - NodeKeyStore interface: 
    { issue(audience, ...): Promise<string>
      validate(raw, audience): Promise<NodeKey>
      revoke(id, audience?): Promise<void> }
  - NodeKeyGuard параметризуется audience
  - Зубья в памяти (в тестах уже работает, хранилище за интерфейсом)
```

**Выход:** Issue #XXXX (deps: none), готово к реализации в Блоке 2.

---

### Блок 2. Media: issueClientKey + revokeClientKey в MediaBridgeService

**Персона:** Структурщик + Музыкант (по цене контракта, не коду)  
**Зона:** `packages/background-media/src/services/media-bridge-service.ts`  
**Вывод:** два метода, в памяти

```
PR ≤120 строк:
  - MediaBridgeService.registerDevice(cabinetToken, metadata):
    { deviceId, clientKeyRaw }
    → NodeKeyStore.issue(audience: 'client')
    → ключ выдаётся один раз (clientKeyRaw не хранится)
  
  - MediaBridgeService.issueClientKey(deviceId, rotate=false):
    { clientKeyRaw } | null
    → если rotate && существует старый → revoke(old, 'client')
    → NodeKeyStore.issue(audience: 'client')
  
  - MediaBridgeService.revokeClientKey(deviceId):
    void (best-effort)
    → NodeKeyStore.revoke(где audience='client' и deviceId)
  
  Зубья: in-memory NodeKeyStore, no Postgres
```

**Выход:** PR #XXX, требует Блока 1; `@membrana/core` контракт вверх не дублируется.

---

### Блок 3. Cabinet: PairResponse + вызовы media при парринге

**Персона:** Музыкант (cabinet-сервис)  
**Зона:** `packages/background-office/src/modules/cabinet/pair.service.ts`  
**Вывод:** вызовы bridge, PairResponse.mediaToken остаётся строкой

```
PR ≤150 строк:
  - PairService.pair(...):
    1. registerDevice() на MediaBridgeService
    2. получить clientKeyRaw
    3. PairResponse.mediaToken = clientKeyRaw
    4. больше не MEDIA_API_TOKEN; вернуть
  
  - Хранение: deviceId куда-то в паiredKey (может быть доп. поле,
    может быть в serialized meta — координатор решает за свой код)
  
  - Зубья: MediaBridgeService.registerDevice() моках returns
    { deviceId: 'test-dev-1', clientKeyRaw: 'ck_...' }
```

**Выход:** PR #YYY, требует Блока 2; `@membrana/core` вверх не бежит.

---

### Блок 4. Cabinet revoke cascade: pairedKey.revoke → media.revokeClientKey

**Персона:** Музыкант (cabinet-сервис)  
**Зона:** `packages/background-office/src/modules/cabinet/pair.service.ts` (revoke path)  
**Вывод:** единая точка каскада

```
PR ≤100 строк:
  - PairService.revoke(pairedKeyId):
    1. локальный revoke/cleanup (существующее)
    2. извлечь mediaDeviceId из pairedKey.metadata || стол
    3. await MediaBridgeService.revokeClientKey(mediaDeviceId)
       (best-effort: error → log, не throw)
    4. вернуть
  
  - Зубья: service mock, MediaBridgeService.revokeClientKey()
    успешно/ошибка-not-found — оба пути
```

**Выход:** PR #ZZZ, требует Блока 3; cascade полный.

---

### Блок 5. Guard: NodeKeyGuard с audience на обеих сторонах

**Персона:** Структурщик  
**Зона:** 
  - media: `packages/background-media/src/modules/firebat-node/guard.ts`
  - cabinet: `packages/background-office/src/guards/` (если нужен)

```
PR ≤80 строк (media guard):
  - NodeKeyGuard(audience: 'node' | 'client'):
    validate(token) → NodeKeyStore.validate(token, audience)
    → если audience не совпадает → 403
    → иначе payload
  
  - Использование в media (upload/collections):
    @UseGuards(NodeKeyGuard('client'))
  
  - Использование на узлах (если они ещё за весниным-scope):
    @UseGuards(NodeKeyGuard('node'))
  
  - Зубья: в памяти, оба пути
```

**Выход:** PR #WWW, требует Блока 1; guard готов.

---

### Очередность PR (по графу зависимостей)

```
1️⃣  Блок 1: контракт NodeKey + interface NodeKeyStore
    ↓ (depends)
2️⃣  Блок 2: MediaBridgeService методы
    ↓ (depends)
3️⃣  Блок 3: Cabinet pair + PairResponse.mediaToken
    ↓ (depends)
4️⃣  Блок 4: Cabinet revoke cascade
5️⃣  Блок 5: Guard (параллельно 4️⃣, depends от 1️⃣)
```

Каждый PR ≤400, фактически ≤150. **Зубья без Postgres** — NodeKeyStore in-memory в тестах, реальное хранилище (если окажется нужным дальше) выносится в отдельный epic после раскатки.

**Issues:** #1 при первом PR (Блок 1), в нём же ссылка на ADR-0028. Владелец ратифицирует нарезку в чате **перед кодом**.

---
