# Обсуждение: FORECAST_ARCHIVE_WIRE_PROMPT

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-01 08:38 UTC · dynin

**Контекст:** docs/prompts/FORECAST_ARCHIVE_WIRE_PROMPT.md
**Вопрос:** Блок forecast-to-archive-core спринта forecast-archive-wire. Нужна ЧИСТАЯ функция отображения forecast-записи в запись архива персоны, файл scripts/lib/sprint-experience/forecast-to-archive.mjs, без fs и сети. Дано: forecast-запись несёт personaId, subject из закрытого множества {cut, stop}, predictedAt, observedAt, deep-frozen поле predicted, поле observed, ref. Запись архива требует поля id, personaId, ts, provenance, source, kind (только verbatim либо summary), text, плюс необязательный class — схема archive-schema.mjs поле class НЕ валидирует. Ответь строго по пунктам: 1) сигнатура функции и полное отображение поле-в-поле, с обоснованием каждого выбора — особенно откуда берётся ts и почему именно оттуда; 2) как построить text так, чтобы запись УЧИЛА автора, а не просто фиксировала: что обязано быть в тексте и в каком порядке, чтобы читающий через месяц понял свой промах без обращения к исходным файлам; 3) чем гарантировать, что deep-freeze поля predicted не теряется на границе адаптера — назови конкретный механизм, а не намерение; 4) какие инварианты обязана проверять сама функция, а какие правильно оставить снаружи, и почему граница именно там; 5) что делать с записью, у которой observedAt отсутствует — исход ещё не наступил: это ошибка входа, легальное «нет» или третье. Ответ должен быть JS с JSDoc, не TypeScript.

**Ответ:**

# Ответ: Функция `forecastToArchive`

Отвечу по пунктам, как просишь.

## 1. Сигнатура и отображение полей

```js
/**
 * forecastToArchive(forecastRecord) → archiveRecord
 *
 * Вход: валидная запись из forecast-record.mjs, прошедшая validateForecastRecord.
 * Выход: объект, готовый к appendArchive (после записи в архив пройдёт recordProblems
 *        и parseArchive без замечаний).
 *
 * @param {object} forecastRecord
 * @param {string} forecastRecord.id - UUID записи прогноза
 * @param {string} forecastRecord.personaId - роль автора (tarasov | angelina | dynin | …)
 * @param {number} forecastRecord.predictedAt - момент, когда прогноз был сделан, мс Unix
 * @param {number} forecastRecord.observedAt - момент, когда наблюдался исход, мс Unix
 * @param {('cut'|'stop')} forecastRecord.subject - род события
 * @param {object} forecastRecord.predicted - deep-frozen объект прогноза
 * @param {object} forecastRecord.observed - объект наблюдения (может быть частичным)
 * @param {string} [forecastRecord.ref] - ссылка на источник (Issue, PR, сеанс)
 *
 * @returns {object} запись архива
 * @returns {string} .id - тот же UUID, что входной (continuity)
 * @returns {string} .personaId - тот же, что на входе
 * @returns {number} .ts - observedAt, если существует; иначе predictedAt
 * @returns {string} .provenance - hardcoded "forecast-archive-wire"
 * @returns {string} .source - "forecast-record-v1"
 * @returns {('verbatim'|'summary')} .kind - всегда 'summary' (структурированный текст)
 * @returns {string} .text - структурированный отчёт о расхождении
 * @returns {string} .class - hardcoded 'forecast'
 */
export function forecastToArchive(forecastRecord) {
  const { id, personaId, predictedAt, observedAt, subject, predicted, observed, ref } = forecastRecord;

  // Обоснование ts: observedAt — это эмпирический момент, когда мы узнали
  // результат. Именно его воспринимает читатель месяц спустя как время события.
  // Если observedAt нет — берём predictedAt (см. пункт 5).
  const ts = observedAt ?? predictedAt;

  // text: структурированный отчёт, который **учит**, а не просто документирует.
  // Читающий спустя месяц должен увидеть:
  // (a) что было предсказано (predicted);
  // (b) что наблюдалось (observed);
  // (c) численное расхождение (если есть);
  // (d) контекст, откуда это взялось (ref).
  const text = buildForecastDeltaText({
    subject,
    predicted,
    observed,
    predictedAt,
    observedAt,
    ref,
  });

  return {
    id,
    personaId,
    ts,
    provenance: 'forecast-archive-wire',
    source: 'forecast-record-v1',
    kind: 'summary',
    text,
    class: 'forecast',
  };
}
```

**Обоснование каждого выбора:**

| Поле | Откуда | Почему |
|------|--------|--------|
| `id` | входной | Сохраняем continuity: цепочка прогноз → архив имеет один идентификатор |
| `personaId` | входной | Очевидно: кто делал прогноз |
| `ts` | `observedAt ?? predictedAt` | Дата события для читателя — момент, когда факт стал известен (observedAt). Если исхода ещё нет — зафиксируем хотя бы дату прогноза, но это легальный случай (см. пункт 5) |
| `provenance` | literal | Трассировка происхождения: записи знают, откуда пришли |
| `source` | literal | Версия рода; если формат forecast-record поменяется, поменяем и это |
| `kind` | literal `'summary'` | Text — структурированный (не дословный), поэтому summary |
| `text` | функция `buildForecastDeltaText` | Специальное построение (см. пункт 2) |
| `class` | literal `'forecast'` | По решению модуля рода (разбор в промпте: class ⊥ kind) |

---

## 2. Построение `text` — как учить, не просто фиксировать

```js
/**
 * buildForecastDeltaText({ subject, predicted, observed, predictedAt, observedAt, ref })
 *
 * Возвращает структурированный текст, который спустя месяц помогает автору
 * понять, **где** и **насколько** ошибся прогноз.
 *
 * Порядок и содержание:
 * 1. Заголовок-контекст: род события (cut | stop) и ссылка на источник.
 * 2. Предсказанные значения (в каноническом порядке).
 * 3. Наблюдаемые значения (в том же порядке).
 * 4. Дельта в каждом поле (абс. и отн. расхождение для чисел).
 * 5. Темпоральная разница (predictedAt → observedAt).
 *
 * Структура: строки в одном стиле, поля разделены `;`, числа с единицами.
 */
function buildForecastDeltaText({ subject, predicted, observed, predictedAt, observedAt, ref }) {
  // Заголовок
  const refStr = ref ? ` [${ref}]` : '';
  const lines = [
    `Forecast ${subject}${refStr}`,
    '',
  ];

  // Предсказание
  lines.push('predicted:');
  Object.entries(predicted).forEach(([key, val]) => {
    lines.push(`  ${key}: ${formatValue(val)}`);
  });

  // Наблюдение
  lines.push('');
  lines.push('observed:');
  if (observed && typeof observed === 'object') {
    Object.entries(observed).forEach(([key, val]) => {
      lines.push(`  ${key}: ${formatValue(val)}`);
    });
  } else {
    lines.push(`  (incomplete or missing)`);
  }

  // Дельта — если оба значения числовые, посчитаем расхождение
  lines.push('');
  lines.push('delta:');
  const deltaShown = computeDelta(predicted, observed);
  if (Object.keys(deltaShown).length > 0) {
    Object.entries(deltaShown).forEach(([key, { abs, rel }]) => {
      lines.push(`  ${key}: ${abs} (${rel}%)`);
    });
  } else {
    lines.push('  (no numeric fields to compare)');
  }

  // Темпоральный интервал — как долго ждали исхода
  if (observedAt && predictedAt) {
    const delayMs = observedAt - predictedAt;
    const delaySec = Math.round(delayMs / 1000);
    lines.push('');
    lines.push(`latency: ${delaySec}s (${new Date(observedAt).toISOString()})`);
  }

  return lines.join('\n');
}

function formatValue(val) {
  if (typeof val === 'number') {
    return val.toFixed(2);
  }
  if (typeof val === 'string') {
    return `"${val}"`;
  }
  if (val === null || val === undefined) {
    return 'null';
  }
  return JSON.stringify(val);
}

function computeDelta(predicted, observed) {
  if (!observed || typeof observed !== 'object') {
    return {};
  }

  const result = {};
  Object.entries(predicted).forEach(([key, predVal]) => {
    const obsVal = observed[key];
    if (typeof predVal === 'number' && typeof obsVal === 'number') {
      const abs = obsVal - predVal;
      const rel = predVal !== 0 ? Math.round((abs / predVal) * 100) : 'inf';
      result[key] = { abs, rel };
    }
  });
  return result;
}
```

**Обязательный порядок и содержание:**

1. **Заголовок** с родом события и ref — чтобы одной строкой понять контекст.
2. **Predicted** (весь) — canonical order (как в объекте).
3. **Observed** (весь) — в том же порядке.
4. **Delta** — абс. и отн. расхождение для числовых полей, чтобы не считать вручную.
5. **Latency** — как долго автор ждал результата (это тоже учит).

Эта форма гарантирует, что **спустя месяц читающий может воспроизвести ошибку без обращения к исходным файлам**.

---

## 3. Deep-freeze на границе адаптера — конкретный механизм

```js
/**
 * Гарантия: поле `predicted` остаётся глубоко замороженным на границе адаптера.
 *
 * Механизм: мы НЕ копируем predicted в выходную запись.
 * Вместо этого архив сохраняет ТОЛЬКО `text` (строка),
 * а `predicted` остаётся в исходной forecast-записи (которая уже frozen).
 *
 * Если позже понадобится восстановить predicted из архива, это будет отдельная
 * операция: архив хранит `text` как доказательство, а `predicted` извлекается
 * из исходного forecast-record по id.
 */

// В `forecastToArchive` we do NOT include `predicted` в выходной объект.
// Text синтезируется один раз из frozen-объекта и сохраняется как строка.

export function forecastToArchive(forecastRecord) {
  // ... (как выше, но явно)

  // ❌ НЕПРАВИЛЬНО: return { ..., predicted: forecastRecord.predicted };
  // ✅ ПРАВИЛЬНО: predicted не выходит из этой функции как поле архива.

  return {
    id,
    personaId,
    ts,
    provenance: 'forecast-archive-wire',
    source: 'forecast-record-v1',
    kind: 'summary',
    text,  // ← Это строка, синтезированная один раз.
    class: 'forecast',
    // predicted не здесь.
  };
}
```

**Конкретная гарантия:**
- `predicted` в forecast-записи = `Object.freeze(predicted)` на входе.
- `forecastToArchive` читает из frozen-объекта (не пишет).
- На выходе `text` — это строка, синтезированная один раз.
- Машинально невозможно изменить frozen-объект, и на границе его нет; текст неизменяем.
- Целостность: если нужен исходный `predicted`, берём его из forecast-записи (которая сохранена в промежуточном журнале или в памяти спринта).

---

## 4. Инварианты функции vs. снаружи

**Функция сама проверяет (внутри `forecastToArchive`):**

```js
// Эти инварианты входного контракта:
// - forecastRecord.personaId ∈ { tarasov, angelina, dynin, … }
// - forecastRecord.subject ∈ { cut, stop }
// - forecastRecord.predictedAt и observedAt либо number, либо undefined (для observedAt)

// Зачем проверять внутри:
// 1. validateForecastRecord на входе уже их ловит, но нам дешевле упасть
//    с явной ошибкой ("forecast subject must be cut or stop"), чем потом
//    строить бессмысленный текст с undefined значениями.
// 2. Это гарантирует, что выход никогда не содержит невалидный текст.
// 3. Фикс проблемы близко к источнику.

if (!['cut', 'stop'].includes(forecastRecord.subject)) {
  throw new Error(`forecastToArchive: invalid subject "${forecastRecord.subject}"`);
}
if (typeof forecastRecord.predictedAt !== 'number') {
  throw new Error('forecastToArchive: predictedAt must be number (Unix ms)');
}
if (forecastRecord.observedAt !== undefined && typeof forecastRecord.observedAt !== 'number') {
  throw new Error('forecastToArchive: observedAt must be number or undefined');
}
if (typeof forecastRecord.personaId !== 'string' || forecastRecord.personaId.trim() === '') {
  throw new Error('forecastToArchive: personaId must be non-empty string');
}
```

**Снаружи проверяет (в `sprint-experience.mjs` при вызове):**

```js
// Это работа авторов и CI:
// - validateForecastRecord (уже сделано до forecastToArchive).
// - После forecastToArchive: recordProblems(archiveRecord) — это функция
//   из archive-schema.mjs, которая проверяет корректность архивной записи.
// - appendArchive(...) — синтаксис JSON и append-only.
```

**Граница здесь потому что:**
- Входной контракт (forecast-запись) — это ответственность вызывающего (sprint-experience.mjs).
- Внутренние инварианты (subject ∈ {cut, stop}) — ответственность функции.
- Выходной контракт (архивная запись) — проверяет снаружи (recordProblems).
- Это разделение позволяет **локализировать ошибки** и не смешивать три уровня валидации.

---

## 5. Случай, когда `observedAt` отсутствует — что это?

**Вердикт: это ЛЕГАЛЬНОЕ состояние, не ошибка входа и не ошибка функции.**

**Обоснование:**

Forecast-запись может быть создана в момент `predictedAt`, но исход может так и не наступить (окно всё ещё открыто, спринт не завершился, event ещё в будущем). В этом случае:

- `observedAt` = `undefined`.
- Запись имеет право на существование в архиве (она задокументирует открытый прогноз).
- `ts` будет

---
