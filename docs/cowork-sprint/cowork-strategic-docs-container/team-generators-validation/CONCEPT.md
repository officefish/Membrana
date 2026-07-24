<!-- Cowork block generators-validation · Phase 1 · via xai/grok-4.5 (оркестровка), изоляция соблюдена -->

# generators-validation: внутреннее устройство

## Назначение блока

Блок отвечает за два исполняемых артефакта:

1. **Генератор** — собирает релиз из шаблона + индекса гранул; маршрутизирует результат в `releases/` или `experiments/` (карантин).
2. **Клиент валидации** — серверный запрос к API office; акт валидации определяет маршрут.

Файловая зона:

- `scripts/lib/strategic-docs-generate.mjs` + `strategic-docs-generate.test.mjs`
- `scripts/lib/strategic-docs-validate-client.mjs` + `strategic-docs-validate-client.test.mjs`
- `docs/cowork-sprint/cowork-strategic-docs-container/team-generators-validation/**`

Источник истины — git. Гранула-скрипт = чистая функция; I/O только на краю через адаптер.

---

## 1. Генератор: `generate(template, granuleIndex) → release`

### Сигнатура

```js
/**
 * @typedef {Object} GranuleLiteral
 * @property {"literal"} kind
 * @property {string} id
 * @property {string} version
 * @property {string} body
 */

/**
 * @typedef {Object} GranuleFn
 * @property {"fn"} kind
 * @property {string} id
 * @property {string} version
 * @property {string} exportName  // имя чистого экспорта
 * @property {string} modulePath  // путь модуля-стаба/реализации
 */

/**
 * @typedef {GranuleLiteral | GranuleFn} Granule
 *
 * @typedef {Object} Template
 * @property {string} id
 * @property {string} version
 * @property {Array<{ granuleId: string, version: string, pin?: object }>} slots
 * @property {object} [meta]
 *
 * @typedef {Object} GranuleIndex
 * @property {(id: string, version: string) => Granule | undefined} resolve
 *
 * @typedef {Object} Release
 * @property {string} id
 * @property {string} templateId
 * @property {string} templateVersion
 * @property {"release" | "experiment"} route
 * @property {string} body
 * @property {object} trace          // какие гранулы/версии вошли
 * @property {object} [validation]   // ответ office, если был
 */

/**
 * generate — чистая сборка документа из шаблона и индекса гранул.
 * I/O (чтение файлов, сеть) НЕ выполняет: гранулы-fn исполняет через переданный adapter.
 *
 * @param {Template} template
 * @param {GranuleIndex} granuleIndex
 * @param {GenerateOpts} [opts]
 * @returns {Promise<Release>}
 */
export async function generate(template, granuleIndex, opts = {}) { /* ... */ }

/**
 * @typedef {Object} GenerateOpts
 * @property {IOAdapter} [io]              // край I/O для гранул-fn
 * @property {ValidateClient} [validate]  // клиент office; если нет — route по локальному предикату-стабу
 * @property {(parts: string[], ctx: object) => string} [renderBody] // стаб/сосед: склейка тела
 */
```

### Алгоритм (Phase 1, на стабах)

1. Для каждого `slot` в `template.slots` → `granuleIndex.resolve(slot.granuleId, slot.version)`.
2. Нет гранулы → throw `GranuleResolveError` (генерация не молчит).
3. Материализация слота:
   - `kind: "literal"` → `body` как есть;
   - `kind: "fn"` → `invokeGranuleFn(granule, slot.pin, opts.io)`.
4. Сборка `body` через `opts.renderBody(parts, ctx)` (на стабе — конкатенация с разделителем; контракт соседа — см. EXPECTATIONS).
5. Акт валидации: `opts.validate(template, draftRelease)` → `{ ok, reasons[] }`.
6. Маршрут:
   - `ok === true` → `route: "release"` (целевой путь `releases/`);
   - `ok === false` → `route: "experiment"` (карантин `experiments/`).
7. Возврат `Release` (write в fs — **не** обязанность `generate`; сайд-эффект записи делает edge-runner/CLI).

`generate` сама по себе **детерминирована** при фиксированных `template`, `granuleIndex`, `io`-ответах и `validate`.

---

## 2. Исполнение гранулы-функции как pure + I/O-адаптер

```js
/**
 * @typedef {Object} IOAdapter
 * @property {(req: IORequest) => Promise<IOResponse>} exec
 *
 * @typedef {Object} IORequest
 * @property {string} op          // "readText" | "httpGet" | ...
 * @property {object} args
 *
 * @typedef {Object} IOResponse
 * @property {unknown} data
 * @property {object} [meta]
 */

/**
 * Гранула-fn экспортирует ЧИСТУЮ функцию:
 *   (input: { pin, ctx }, io: { exec }) => output: { body: string, trace?: object }
 * Прямых fs/network/Date/Math.random внутри гранулы быть не должно.
 * Любой I/O — только через io.exec. В тестах io — мок.
 */
export async function invokeGranuleFn(granule, pin, io = pureIoThrow) {
  const mod = await import(granule.modulePath); // в проде — заранее резолвнутый реестр; в стабе — динамический import фикстуры
  const fn = mod[granule.exportName];
  if (typeof fn !== "function") throw new TypeError(`granule fn missing: ${granule.id}@${granule.version}`);
  const out = await fn({ pin, ctx: { granuleId: granule.id, version: granule.version } }, io);
  if (!out || typeof out.body !== "string") throw new TypeError("granule fn must return { body: string }");
  return out;
}

/** Дефолтный io: любой вызов — ошибка (гарантия pure-пути без края). */
export const pureIoThrow = {
  async exec() { throw new Error("I/O not allowed without adapter"); }
};
```

**Инвариант под тестом:** гранула-fn с мок-`io` детерминированна; без `io` при попытке I/O падает; повторный вызов с тем же `pin` и теми же ответами `io` → тот же `body`.

---

## 3. Маршрутизация release / experiment (карантин)

| Предикат валидности | `route`        | Целевой каталог (edge) | Доступ агентов                          |
|---------------------|----------------|------------------------|-----------------------------------------|
| valid               | `"release"`    | `releases/`            | штатный                                  |
| invalid             | `"experiment"` | `experiments/`         | только по спец-разрешению (карантин)    |

- Генератор **не** пишет на диск: возвращает `Release.route`. Edge/CLI делает `git add` в нужный каталог.
- Карантин — это не «мусорка», а read-only контур экспериментов: тот же формат `Release`, но флаг маршрута и отдельное дерево.
- Повторная валидация experiment после правок шаблона/гранул может перевести следующий generate в `release` (история — в git).

```js
export function routeFor(valid) {
  return valid ? "release" : "experiment";
}
```

---

## 4. Клиент валидации → office (стаб-контракт)

Файл: `scripts/lib/strategic-docs-validate-client.mjs`.

### Сигнатуры

```js
/**
 * @typedef {Object} ValidationRequest
 * @property {string} templateId
 * @property {string} templateVersion
 * @property {object} templateSnapshot   // сериализуемый шаблон
 * @property {object} draft              // { body, trace }
 * @property {string} [requestId]
 *
 * @typedef {Object} ValidationResponse
 * @property {boolean} ok
 * @property {string[]} reasons
 * @property {string} [validatorVersion]
 * @property {string} [requestId]
 *
 * @typedef {Object} ValidateClientOpts
 * @property {string} baseUrl            // стаб: "http://127.0.0.1:0" + injected fetch
 * @property {typeof fetch} [fetchImpl]  // DI для тестов
 * @property {number} [timeoutMs]
 */

/**
 * @param {ValidationRequest} req
 * @param {ValidateClientOpts} opts
 * @returns {Promise<ValidationResponse>}
 */
export async function validateViaOffice(req, opts) { /* POST {baseUrl}/v1/office/validate */ }

/** Удобный фасад под generate opts.validate */
export function makeValidateClient(opts) {
  return async (template, draftRelease) => {
    const res = await validateViaOffice({
      templateId: template.id,
      templateVersion: template.version,
      templateSnapshot: template,
      draft: { body: draftRelease.body, trace: draftRelease.trace },
    }, opts);
    return res;
  };
}
```

### Стаб-контракт HTTP

- **Метод/путь:** `POST /v1/office/validate`
- **Request JSON:** `ValidationRequest`
- **Response 200 JSON:** `ValidationResponse`
- **Response 4xx/5xx:** клиент бросает `ValidationTransportError`; генератор **не** маскирует под `ok: false` (транспорт ≠ невалидность).
- **Стаб-эндпоинт (исполняемый, свой):** в тестовом файле или рядом — minimal http server / handler:

```js
// стаб-логика (исполняемая в тесте):
// ok ⇔ templateSnapshot.slots.length > 0
//    && draft.body.includes("---") // стаб-маркер сборки
//    && !templateSnapshot.meta?.forceInvalid
export function stubOfficeValidateHandler(reqBody) {
  const reasons = [];
  if (!reqBody?.templateSnapshot?.slots?.length) reasons.push("empty slots");
  if (typeof reqBody?.draft?.body !== "string" || !reqBody.draft.body.includes("---")) {
    reasons.push("body missing stub separator");
  }
  if (reqBody?.templateSnapshot?.meta?.forceInvalid) reasons.push("forceInvalid");
  return { ok: reasons.length === 0, reasons, validatorVersion: "stub-office-1", requestId: reqBody.requestId };
}
```

Клиент в тесте поднимает стаб-сервер (или вызывает handler через fake `fetchImpl`) и проверяет round-trip.

---

## 5. Сборка на СТАБ-гранулах (без canon-data / engine-renderer)

Тестовые фикстуры живут в зоне блока (или inline в `.test.mjs`):

```js
const stubIndex = {
  resolve(id, version) {
    const key = `${id}@${version}`;
    return stubGranules[key]; // map литералов и fn-фикстур
  }
};

// literal
stubGranules["g.intro@1.0.0"] = { kind: "literal", id: "g.intro", version: "1.0.0", body: "# Intro\n" };

// fn pure
// fixtures/granule-echo.mjs → export function echo({ pin }, io) { return { body: `ECHO:${pin?.text ?? ""}` }; }
stubGranules["g.echo@1.0.0"] = {
  kind: "fn", id: "g.echo", version: "1.0.0",
  exportName: "echo", modulePath: new URL("./fixtures/granule-echo.mjs", import.meta.url).pathname
};
```

Стаб-`renderBody` (пока нет engine-renderer):

```js
function stubRenderBody(parts) {
  return parts.join("\n---\n");
}
```

---

## 6. Тест-план (`node --test`, зелёный без соседей)

### `strategic-docs-generate.test.mjs`

| # | Кейс | Ожидание |
|---|------|----------|
| G1 | literal-only шаблон + stub render | `body` сконкатенирован, `trace` содержит id@version |
| G2 | slot → unknown granule | `GranuleResolveError` |
| G3 | fn-гранула без io, fn не зовёт io | pure ok, body детерминирован |
| G4 | fn-гранула зовёт `io.exec`, io = pureIoThrow | throw |
| G5 | fn-гранула + mock io (фиксированный ответ) | body зависит от io; повтор — тот же body |
| G6 | validate → ok | `route === "release"` |
| G7 | validate → not ok (`forceInvalid`) | `route === "experiment"` |
| G8 | generate без записи в fs | после generate нет side-effect путей (функция pure w.r.t. fs) |
| G9 | порядок slots = порядок parts | стабильный trace/order |

### `strategic-docs-validate-client.test.mjs`

| # | Кейс | Ожидание |
|---|------|----------|
| V1 | fake fetchImpl / local stub server: valid payload | `ok: true`, `reasons: []` |
| V2 | `meta.forceInvalid` | `ok: false`, reasons непустой |
| V3 | HTTP 500 | `ValidationTransportError`, не `{ok:false}` |
| V4 | невалидный JSON ответа | transport/protocol error |
| V5 | `makeValidateClient` + `generate` integration на стабах | маршрут experiment/release согласован с office-стабом |

### Чистота гранул-функций

- Отдельный тест: модуль фикстуры `echo` / `echoWithIo` не импортирует `fs`/`node:fs`/`process.env` (статическая проверка исходника regex/whitelist) **или** контрактный тест «два вызова — один результат».
- Запрет I/O по умолчанию — через `pureIoThrow` (G4).

### Критерий DoD Phase 1

- `node --test scripts/lib/strategic-docs-generate.test.mjs scripts/lib/strategic-docs-validate-client.test.mjs` — exit 0.
- Нет импортов из пакетов/путей canon-data и engine-renderer.
- Стаб office — исполняемый (handler + client round-trip).
- Невалидный шаблон → `route: "experiment"`.

---

## 7. Граница ответственности (кратко)

```
template + granuleIndex + io + validate
            │
            ▼
     generate(...)  ──► Release { body, route, trace, validation }
            │
            ▼
   edge CLI (вне блока): write → releases/ | experiments/
```

Блок **не** владеет схемой канона, **не** владеет git-write политикой агентов, **не** реализует production-renderer: только generate-pipeline, pure-invoke, validate-client, route flag.
