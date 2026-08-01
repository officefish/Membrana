# Обсуждение: SUBCONSCIOUS_LIFT_C3_PROMPT

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-01 14:46 UTC · dynin

**Контекст:** docs/prompts/SUBCONSCIOUS_LIFT_C3_PROMPT.md
**Вопрос:** Блок lift-cloud-core спринта subconscious-lift-c3, зона одна: scripts/persona-memory/lib/subconscious-lift.mjs. ЧИСТОЕ ядро: ни fs, ни сети, ни импорта промптов. Порт retrieval — соседний блок, сюда приходит инъекцией. Контракт ратифицирован M3 и переизобретению не подлежит: слоты similar<=5 (MMR внутри), contrast<=3, outsider 1..2 из хвоста по предикату sim<tau_out И id не в similar∪contrast, потолок |items|<=10; ординальные флаги 0/1 hasConflict/hasOwnerQuote/isPinned/classRank(insight|precedent > position > routine)/recencyBucket; comparator лексикографический по флагам и sim-bucket, MMR только на similar; de-dup notAlreadyOperational(id) вычитает всё, чей провенанс уже в оперативной проекции; snippet из summary, полный текст по fullRef только для выбранных; queryPlan обязателен всегда. Инварианты: пустой слот пустой, а не padding; emerged подмножество items; why непусто; rejected влечёт emerged пусто. Ответь строго по пунктам: 1) сигнатуры экспортов и форма Cloud/CloudItem/QuerySpec поле в поле; 2) MMR формулой и как именно ординальные флаги сочетаются с sim-bucket в comparator — что первично и почему; 3) предикат аутсайдера: как считать tau_out в v1, если калибровка это C5 и числа назначать нельзя; 4) какие инварианты обязано проверять само ядро, а какие правильно оставить зубу и почему граница там; 5) что ядро обязано вернуть, когда архив пуст, и чем это отличается от случая «мультизапрос сломан» — обе ситуации дают ноль кандидатов.

**Ответ:**

Слушаю по пунктам.

---

### 1. Сигнатуры и форма контракта

```ts
// Экспорты из subconscious-lift.mjs

export interface CloudItem {
  id: string;                    // уникальный в архиве
  provenance: 'similar' | 'contrast' | 'outsider';
  class?: 'insight' | 'precedent' | 'position' | 'routine';
  lifecycle?: string;            // опционально, из C1 meta
  importance?: number;           // опционально, рейтинг из C2
  snippetRef: { text: string; fullRef: string }; // summary + fullRef
  scores?: {
    similarity: number;          // [0..1] к Q1 или слоту
    ordinalFlags: Record<'hasConflict'|'hasOwnerQuote'|'isPinned'|'classRank'|'recencyBucket', 0|1>;
  };
}

export interface QueryPlan {
  queries: Array<{ axis: 'topic' | 'contrast' | 'dispute'; status: 'ran' | 'skipped'; hitCount: number; reason?: string }>;
  deduped: number;               // сколько исключено notAlreadyOperational
  queryTimeMs: number;
}

export interface Cloud {
  cloudId: string;               // UUID или hash(personaId, topic, ts)
  queryPlan: QueryPlan;
  items: CloudItem[];            // всегда |items| ≤ 10
  emerged: CloudItem['id'][];    // подмножество items[], для персоны
  rejected: boolean;             // true ⇒ emerged = []
  rejectionReason?: string;      // если rejected
}

export async function buildSubconsciousCloud(
  personaId: string,
  topic: string,
  retrievalPort: RetrievalPort,     // инъекция: { query(axis, q) → Promise<Candidate[]> }
  operationalFilter: (id: string) => boolean, // notAlreadyOperational
  opts?: { lambda?: number; tauOutPercentile?: number; }
): Promise<Cloud>
```

**Форма поле в поле:**
- `CloudItem.scores.ordinalFlags` — дискретные 0/1, не проценты; вычисляются по наблюдаемым фактам (есть конфликт в `meta` — флаг 1, нет — 0).
- `snippetRef.text` — **всегда** присутствует (из summary C1); `fullRef` — URL или путь для дотягивания персоной.

---

### 2. MMR и лексикографический компаратор

**MMR формула (внутри одного слота):**
```
score(a) = λ · sim(a, q_axis) − (1−λ) · max_{b ∈ already_selected} sim(a, b)
```
где `λ` из `opts.lambda` (v1 default: 0.7); выбираем `argmax score(a)` пошагово, пока не исчерпана квота слота.

**Лексикографический компаратор (глобальный рейтинг всех items):**

```ts
function compareCloudItems(a: CloudItem, b: CloudItem): number {
  // Порядок сравнения (первичен → вторичен):
  
  // 1. Слот (provenance): similar > contrast > outsider
  const slotOrder = { 'similar': 0, 'contrast': 1, 'outsider': 2 };
  const slotCmp = slotOrder[a.provenance] - slotOrder[b.provenance];
  if (slotCmp !== 0) return slotCmp;
  
  // 2. Ординальные флаги (лексикографически: isPinned > hasOwnerQuote > hasConflict > classRank > recencyBucket)
  // Каждый флаг 0/1; сравниваем в порядке приоритета
  const flagOrder = ['isPinned', 'hasOwnerQuote', 'hasConflict'];
  for (const flag of flagOrder) {
    const flagCmp = (b.scores?.ordinalFlags[flag] ?? 0) - (a.scores?.ordinalFlags[flag] ?? 0);
    if (flagCmp !== 0) return flagCmp;  // b.flag > a.flag → b выше
  }
  
  // 3. classRank (insight|precedent=2 > position=1 > routine=0; нет класса=−1)
  const rankMap = { 'insight': 2, 'precedent': 2, 'position': 1, 'routine': 0 };
  const rankCmp = (rankMap[b.class] ?? -1) - (rankMap[a.class] ?? -1);
  if (rankCmp !== 0) return rankCmp;
  
  // 4. recencyBucket (новее выше; конкретный формат — из C5 консультировать)
  const recencyCmp = (b.scores?.ordinalFlags['recencyBucket'] ?? 0) - (a.scores?.ordinalFlags['recencyBucket'] ?? 0);
  if (recencyCmp !== 0) return recencyCmp;
  
  // 5. Similarity (внутри `similar` слота тянем MMR; между слотами similarity не сравниваем)
  if (a.provenance === 'similar' && b.provenance === 'similar') {
    return (b.scores?.similarity ?? 0) - (a.scores?.similarity ?? 0);
  }
  
  // 6. Стабильный тайбрейк: id лексикографически
  return a.id.localeCompare(b.id);
}

items.sort(compareCloudItems);
```

**Почему такой порядок первичности:**
- **Слот первичен** — contrast выбран целью фьюжна, outsider — глаз в сторону; подмешивать их с похожими случайно пагубно.
- **Флаги вторичны, similarity третичен** — если элемент помечен `isPinned=1` или `hasOwnerQuote=1`, это сильнее похожести; это стратегический выбор персоны/оператора, не акт анализа.
- **classRank** — забивает просто высокосимилярный рутинный вход в нижнюю половину облака.
- **recencyBucket** — микро-детерминизм.

---

### 3. Предикат аутсайдера и τ_out в v1

**Невозможно назначать числовое τ_out в ядре:** это калибровка C5.

**Решение:** 

```ts
interface RetrievalPort {
  query(axis: 'topic'|'contrast'|'dispute', q: string): Promise<Candidate[]>;
  // Candidate = { id, text, similarity: [0..1] }
  
  // v1 ДОБАВЛЯЕМ:
  getTailThreshold?(): number;  // возвращает τ_out, вычисленный C5
}
```

**Предикат аутсайдера (внутри ядра):**
```ts
const tauOut = retrievalPort.getTailThreshold?.() ?? 0.3; // default-fallback для тестов только
const outsider = candidates.filter(c => 
  c.similarity < tauOut && 
  !selectedIds.has(c.id)  // id ∉ similar ∪ contrast
);
```

**Если `getTailThreshold` не определён:** ядро попадает в режим **reduced plan** (в queryPlan строка `{ axis: 'outsider', status: 'skipped', reason: 'tauOut not calibrated (C5)' }`), `outsider` остаётся пустым. **Это явно**, а не молчание.

---

### 4. Инварианты: что проверяет ядро, что — зуб

| Инвариант | Проверяет ядро | Проверяет зуб (тест/fixture) | Обоснование |
|-----------|---|---|---|
| `\|items\| ≤ 10` | **ДА** — пустой слот пустой, padding запрещён; ядро просто останавливает цикл | Да, демонстрирует отказ ядра padding'ить | если ядро padding'ит молчком, дефект обнаружить невозможно |
| `emerged ⊆ items` | **ДА** — ядро отсекает вручную выбранные id за пределами items | Да, попытка подлога вычисляется | механический дефект в интеграции персоны; ядро обязано невозможность механически |
| `why(e) ≠ ∅ ∀e ∈ emerged` | **НЕТ** — ядро лифт не пишет; **персона пишет why** | Да, зуб проверяет что персона написала `why` | `why` — акт персоны, а не артефакт лифта; граница между слоями |
| `rejected ⇒ emerged = ∅` | **ДА** — если `rejected=true`, ядро обнуляет emerged | Да, попытка `reject + emerged` отклоняется | состояние противоречиво механически |
| `queryPlan` присутствует | **ДА** — всегда; пустой `items` с `queryPlan.hitCount[Q1]=0` отличим от `queryPlan=null` | Да, различимость двух сценариев | без плана неотличим отказ от краха |
| `notAlreadyOperational` вычитает эхо | **ДА** — ядро фильтрует `⊇ operationalFilter(id)` | Да, фикстура показывает что архив от опера отличен | без вычитания лифт = эхо; контур не поставлен |

**Граница:** ядро контролирует **структуру и состояние облака как объекта** (размер, подмножества, присутствие полей), **не смысл** (когда персона выбирает `why` — это её интерпретация факта, а не дефект лифта).

---

### 5. Ядро возвращает — два различимых сценария

**Случай А: Архив пуст на все три оси**
```ts
const cloud: Cloud = {
  cloudId: '...',
  queryPlan: {
    queries: [
      { axis: 'topic', status: 'ran', hitCount: 0 },
      { axis: 'contrast', status: 'ran', hitCount: 0 },
      { axis: 'dispute', status: 'ran', hitCount: 0 }
    ],
    deduped: 0,
    queryTimeMs: 42
  },
  items: [],
  emerged: [],
  rejected: false
  // rejectionReason: undefined
};
```
**Признак:** все три `hitCount=0`, `queryPlan.status='ran'` (оси запустились, результата нет).

**Случай Б: Мультизапрос сломан (retrieval вернул ошибку или недоступен)**
```ts
const cloud: Cloud = {
  cloudId: '...',
  queryPlan: {
    queries: [
      { axis: 'topic', status: 'failed', reason: 'retrieval port returned 500', hitCount: 0 },
      { axis: 'contrast', status: 'skipped', reason: 'topic failed, stop cascade', hitCount: 0 },
      { axis: 'dispute', status: 'skipped', reason: 'topic failed, stop cascade', hitCount: 0 }
    ],
    deduped: 0,
    queryTimeMs: 5000
  },
  items: [],
  emerged: [],
  rejected: true,
  rejectionReason: 'mutable retrieval port failed: <детали ошибки>'
};
```
**Признак:** минимум одна `status='failed'` с `reason`, вторые оси `skipped` (каскадный отказ), `rejected=true`.

**Различимость:** в обоих случаях `|items|=0`, но:
- **А:** честный результат поиска; `queryPlan` говорит «ищу, нашли 0».
- **Б:** сбой инфраструктуры; `queryPlan.reason` и `rejected=true` + `rejectionReason` говорят «не смог искать».

---

**Итого:**
- Три глагола (`cloud_query`, `reject`, `surface_invoke`) получат источник из `buildSubconsciousCloud` вызовом.
- Ядро аморфно к смыслу (не знает промптов), только к структуре.
- Персона решает `emerge` или `reject_cloud` — фиксирует акт.

---
