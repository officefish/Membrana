# Обсуждение: SUBCONSCIOUS_LIFT_C3_PROMPT

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-01 14:53 UTC · dynin

**Контекст:** docs/prompts/SUBCONSCIOUS_LIFT_C3_PROMPT.md
**Вопрос:** Блок lift-cloud-tooth спринта subconscious-lift-c3, зона одна: scripts/persona-memory/lib/subconscious-lift.test.mjs, node --test. Ядро уже написано и экспортирует: SLOT_KINDS, QUERY_AXES, SLOT_QUOTAS {similar:5,contrast:3,outsider:2}, CLOUD_MAX=10, FLAG_ORDER, CLASS_RANK, AXIS_STATUS, ordinalFlags, simBucket, compareCandidates, mmrSelect(pool,limit,{lambda,similarityBetween}), buildSubconsciousCloud({personaId,topic,retrieve,notAlreadyOperational,similarityBetween,lambda,tauOut,cloudId}), planHealth(queryPlan). Решения ядра, которые зуб обязан закрепить: сбой оси retrieval НЕ выставляет rejected (это акт персоны, лифт его не совершает — нарушение есть BLOCK по M3); лямбда и tau_out без умолчаний, отсутствие tau_out даёт ЧЕСТНО пустой слот аутсайдеров с причиной в плане; ядро не знает времени и не генерирует cloudId. Ответь по пунктам, коротко: 1) перечисли поимённо тесты, которые обязаны быть, и что именно каждый утверждает — сгруппируй по инвариантам DoD; 2) какой тест поймал бы возврат лифтом акта персоны, если бы кто-то это вернул; 3) как проверить, что пустой слот не добивается padding'ом, не завися от порядка кандидатов; 4) какой тест различает архив пуст и мультизапрос сломан, и почему одного planHealth недостаточно; 5) назови ДВА свойства, которые легко написать зелёными по ошибке — то есть тест пройдёт при сломанном ядре.

**Ответ:**

*Dynin кивает над документацией, делая пометки.*

Ладно, вижу контракт. Зуб по трём глаголам, лифт и акт за ролями, облако как вход персоне. Считаю вслух.

## 1. Тесты по инвариантам DoD

**Граница лифт/персона (акт не за лифтом):**
- `test("лифт не выставляет rejected")` — `buildSubconsciousCloud()` не возвращает `rejected`, даже если retrieval упал; вместо этого `queryPlan` помечает ось `FAILED`, облако пусто, но структура стоит.
- `test("если лифт вернул rejected, это BLOCK")` — assertion: returned object не имеет поля `rejected`. Тест *не ловит* возврат персоной (это её дело); ловит, что ядро его не производит.

**Квоты и слоты (пустой слот ≠ padding):**
- `test("пустой слот similar остаётся пустым")` — если retrieval вернул < 5 кандидатов, `items.filter(x => x.class === 'similar').length <= 5` и ровно столько, сколько вернулось.
- `test("outsider не добивается до 2, если кандидаты кончились")` — если всего 7 кандидатов и 5 уехали в similar+contrast, outsider получает 0 (или 1, если есть), **не 2**.
- `test("contrast и similar не пересекаются")` — `Set(similar.map(x=>x.id)).intersection(Set(contrast.map(x=>x.id))).size === 0`.

**Максимальный размер облака:**
- `test("|items| <= 10")` — `cloud.items.length <= 10` всегда.
- `test("|outsider| <= 2")` — `items.filter(x => x.class === 'outsider').length <= 2`.

**queryPlan и диагностика:**
- `test("queryPlan присутствует для пустого архива")` — `cloud.queryPlan` существует, хоть `items === []`. Пример: `{ Q1: { status: 'EMPTY', hits: 0 }, Q2: 'SKIPPED', … }`.
- `test("queryPlan различает EMPTY от FAILED")` — если retrieve вернул ошибку, `status: 'FAILED'`; если вернул пустой массив, `status: 'EMPTY'`. Это два разных текста.

**De-dup:**
- `test("notAlreadyOperational вычитает эхо")` — если `notAlreadyOperational` вернул `false` для id, этот id в `items` не появляется.

**Ordinality и сортировка:**
- `test("ordinalFlags стабильны")` — `compareCandidates` по одному и тому же облаку даёт один и тот же порядок, независимо от порядка вызова.
- `test("simBucket правилен")` — кандидаты с `sim >= threshold` в одном bucket, с `sim < threshold` в другом.

**Ядро не пишет why и не пишет O:**
- `test("облако не имеет поля 'why'")` — `cloud.items[0].why === undefined`.
- `test("облако не имеет поля 'operationalId'")` — никакой связи с оперативной проекцией.

---

## 2. Тест на возврат персоной акта

```ts
test("если кто-то вернул облако с rejected, это BLOCK", () => {
  const cloud = buildSubconsciousCloud({...});
  const hasRejectedField = 'rejected' in cloud;
  assert.ok(!hasRejectedField, 
    `BLOCK: лифт не должен иметь поля 'rejected'; это акт персоны`);
});
```

Или более изящно (в духе M3):
```ts
test("границу лифт/персона нарушить нельзя механически", () => {
  const cloud = buildSubconsciousCloud({...});
  // rejected — только в персоне
  assert.deepEqual(
    Object.keys(cloud).filter(k => ['rejected', 'emerged', 'why'].includes(k)),
    [],
    `cloud должно быть readonly для персоны; акт — её работа`
  );
});
```

---

## 3. Проверка: пустой слот, не зависимо от порядка

```ts
test("outsider не добивается, независимо от shuffle входа", () => {
  const cands = [...pool].sort(() => Math.random() - 0.5); // shuffle
  const result = mmrSelect(cands, { limit: 2, lambda: 0.7, ... });
  
  assert.ok(result.length <= 2, `limit=2 соблюдается после shuffle`);
  // Повтор с другим shuffle:
  for (let i = 0; i < 5; i++) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const r = mmrSelect(shuffled, { limit: 2, ... });
    assert.equal(r.length, result.length, `детерминирован по размеру после MMR`);
  }
});
```

Ключ: **`mmrSelect` вернёт `k` кандидатов ≤ limit**, и это число стабильно, т.е. пустота не замаскирована случайностью.

---

## 4. Тест: архив пуст VS. мультизапрос сломан

```ts
test("различимы пустой архив и сломанный запрос по queryPlan", () => {
  // Сценарий 1: архив действительно пуст
  const empty = buildSubconsciousCloud({
    retrieve: async (axis) => ({ hits: 0, items: [] }),
    ...
  });
  assert.equal(empty.queryPlan.Q1.status, 'EMPTY', `архив пуст — статус EMPTY`);
  assert.equal(empty.items.length, 0);
  
  // Сценарий 2: retrieval сломан (выкидывает ошибку)
  const failed = buildSubconsciousCloud({
    retrieve: async (axis) => { throw new Error('DB connection lost'); },
    ...
  });
  assert.equal(failed.queryPlan.Q1.status, 'FAILED', `retrieval сломан — статус FAILED`);
  assert.equal(failed.items.length, 0);
  
  // Различимы:
  assert.notEqual(empty.queryPlan.Q1.status, failed.queryPlan.Q1.status);
});
```

**Почему `planHealth` недостаточно:** он проверяет наличие плана, но не **различает причину**. `planHealth({ Q1: { status: 'EMPTY' } })` = true И `planHealth({ Q1: { status: 'FAILED' } })` = true. Нужна лексема внутри плана.

---

## 5. Два свойства, ловушки — зелёные при сломанном ядре

**Ловушка 1: `compareCandidates` за счёт случайности или недетерминированного компаратора**

```ts
test("ordinality детерминирована", () => {
  const cloud1 = buildSubconsciousCloud({ ... });
  const cloud2 = buildSubconsciousCloud({ ... }); // тот же вход
  assert.deepEqual(cloud1.items.map(x => x.id), 
                    cloud2.items.map(x => x.id),
    `два вызова с одинаковым входом дают один порядок`);
});
```

**Ловушка:** ядро случайно покидает порядок несвязанным с флагами — тест зелёный, потому что `Math.random` в тесте даст одинаковое «случайное» число. Нужен assert на **сам компаратор**:

```ts
test("compareCandidates не использует Math.random", () => {
  const a = { id: '1', ordinalFlags: [1, 0], sim: 0.8 };
  const b = { id: '2', ordinalFlags: [1, 0], sim: 0.8 };
  const cmp1 = compareCandidates(a, b);
  const cmp2 = compareCandidates(a, b);
  assert.equal(cmp1, cmp2, `компаратор детерминирован на одном входе`);
});
```

**Ловушка 2: `simBucket` скрывает граничный случай**

```ts
test("simBucket граница правильна при sim === threshold", () => {
  const threshold = 0.5;
  const onThreshold = { id: '1', sim: 0.5 };
  const above = { id: '2', sim: 0.501 };
  const below = { id: '3', sim: 0.499 };
  
  assert.equal(simBucket(onThreshold.sim, threshold), 'above'); // или 'below'?
  assert.equal(simBucket(above.sim, threshold), 'above');
  assert.equal(simBucket(below.sim, threshold), 'below');
});
```

**Ловушка:** если ядро случайно завязало `sim > threshold` вместо `sim >= threshold` (или наоборот), тест может проходить, потому что границу никто не проверял. Нужна именно граница (equality case).

---

*Dynin убирает бумагу.*

Вывод: тесты строятся от контракта (queryPlan как лицо диагностики, outsider не добивается, лифт не пишет акт). Две ловушки — недетерминированность компаратора и недопроверка boundary. Оба поимённо.

---
