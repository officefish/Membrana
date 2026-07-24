<!-- Cowork block engine-renderer · Phase 1 · via xai/grok-4.5 (оркестровка), изоляция соблюдена -->

# engine-renderer — внутренняя устройство (Phase 1)

## Роль блока
`engine-renderer` — единственная точка, которая:
1. рендерит поверхность стратегического релиза в выбранный оператором движок (Affine / Notion / Coda);
2. выполняет **полный двусторонний sync** `git ↔ provider` с правилом **git wins** при конфликте;
3. на «домашнем месте» (mmbrn.tech-контур) всегда держит либо живой Affine, либо **заглушку-со-ссылкой**, если оператор выбрал не-Affine.

Git — источник истины. Движки только подкрепляют. Canon-data и generators-validation в Phase 1 подменяются стабами; блок проходит `node --test` автономно.

## Файловая зона
```
scripts/lib/strategic-docs-render-adapter.mjs
scripts/lib/strategic-docs-render-adapter.test.mjs
apps/panel/src/sections/strategic-docs/**          # UI выбора провайдера + статус синка
docs/cowork-sprint/cowork-strategic-docs-container/team-engine-renderer/**
```

Чужие зоны не трогаем. Интерфейсы с соседями не согласовываем здесь — только фиксируем допущения в EXPECTATIONS.

---

## Архитектура адаптера

Один модуль-фасад + три провайдер-адаптера за единым интерфейсом.

```js
// scripts/lib/strategic-docs-render-adapter.mjs

/**
 * @typedef {'affine' | 'notion' | 'coda'} ProviderId
 */

/**
 * @typedef {Object} ReleaseSurface
 * @property {string} releaseId          // pin/идентификатор релиза (из canon-data)
 * @property {string} version            // semver или git-sha пина
 * @property {string} title
 * @property {string} markdown           // уже собранное тело релиза (от generators-validation)
 * @property {Record<string, unknown>} [meta]
 */

/**
 * @typedef {Object} RenderResult
 * @property {ProviderId} provider
 * @property {'rendered' | 'stub'} kind
 * @property {string} url                // URL поверхности либо URL актуального движка (для stub)
 * @property {string} [stubMessage]      // человекочитаемый текст заглушки
 * @property {string} localPath          // путь к артефакту/маркеру в git-зоне
 */

/**
 * @typedef {Object} SyncConflict
 * @property {string} path
 * @property {'git' | 'provider'} winner  // всегда 'git' в нашей стратегии
 * @property {string} resolution         // 'kept-git' | 'overwrote-provider'
 */

/**
 * @typedef {Object} SyncResult
 * @property {ProviderId} provider
 * @property {'ok' | 'degraded' | 'failed'} status
 * @property {number} pushed             // git → provider
 * @property {number} pulled             // provider → git (только неконфликтующие)
 * @property {SyncConflict[]} conflicts
 * @property {string} [degradedReason]   // если provider down / auth / network
 */

/**
 * @typedef {Object} ProviderAdapter
 * @property {ProviderId} id
 * @property {(surface: ReleaseSurface, ctx: AdapterContext) => Promise<RenderResult>} render
 * @property {(surface: ReleaseSurface, ctx: AdapterContext) => Promise<SyncResult>} sync
 * @property {(surface: ReleaseSurface, ctx: AdapterContext) => Promise<RenderResult>} stubWithLink
 * @property {(ctx: AdapterContext) => Promise<'up' | 'down' | 'auth-error'>} health
 */

/**
 * @typedef {Object} AdapterContext
 * @property {ProviderId} selectedProvider   // выбор оператора из панели
 * @property {string} affineBaseUrl          // https://affine.mmbrn.tech (самохост)
 * @property {string} workspaceRoot          // git root
 * @property {object} stubs                  // инъекция стабов для тестов
 * @property {(msg: string, meta?: object) => void} log
 */
```

### Фасад (публичные функции модуля)

```js
export function createRenderAdapter(ctx: AdapterContext): {
  /** Рендер поверхности релиза под выбранного провайдера */
  renderRelease(surface: ReleaseSurface): Promise<RenderResult>;

  /** Полный двусторонний sync; git побеждает */
  fullSync(surface: ReleaseSurface): Promise<SyncResult>;

  /** Принудительная заглушка (домашнее место, non-Affine) */
  renderHomeStub(surface: ReleaseSurface): Promise<RenderResult>;

  /** Текущий выбранный провайдер + health */
  status(): Promise<{ provider: ProviderId, health: string, homeMode: 'live' | 'stub' }>;
}
```

### Диспетчеризация `renderRelease`
```
if selectedProvider === 'affine':
    health = affine.health()
    if health == 'up' → affine.render(surface)
    else              → degrade: RenderResult(kind='stub', url=affineBaseUrl, stubMessage=degraded)
else:
    // домашнее место mmbrn.tech НЕ занимает чужой движок
    home = affine.stubWithLink(surface)   // заглушка со ссылкой на актуальный URL notion/coda
    // параллельно (fire-and-forget в Phase 1 — стаб) дергаем provider.render для «актуального» места
    return home
```

### `stubWithLink` (контракт)
- Всегда возвращает `kind: 'stub'`.
- `url` — deep-link на документ/воркспейс **актуального** провайдера оператора (не Affine).
- `stubMessage` — фиксированный шаблон:  
  `«Рабочая поверхность: {provider}. Открыть: {url}. Локальный Affine-контур не активен по выбору оператора.»`
- `localPath` — маркер-файл в git (например `strategic-docs/.engine-stub.json`), чтобы git оставался источником правды о выборе.

### `fullSync` — стратегия «git wins»
```
1. healthcheck provider; if down → SyncResult(status='degraded', degradedReason=...)
2. snapshot git-side  (release markdown + meta + pins)
3. snapshot provider-side (через stubs/API)
4. diff по путям/блокам:
     - only-git      → push to provider          (pushed++)
     - only-provider → pull to git               (pulled++), EXCEPT если path ∈ protected git pins
     - both, differ  → CONFLICT: keep git, overwrite provider (conflicts += {winner:'git'})
5. атомарно записать манифест синка в git:
     strategic-docs/.sync-manifest.json
     { releaseId, provider, ts, conflicts, pushed, pulled }
6. return SyncResult
```

Инварианты:
- никогда не переписываем git-пины провайдером;
- provider-only контент, не конфликтующий с пинами, **может** приехать в git (как draft-слой), но не в release pin;
- повторный `fullSync` идемпотентен на одинаковых снимках.

### Деградация (провайдер лёг)
| Ситуация | render | sync | panel status |
|---|---|---|---|
| Affine up, selected=affine | live render | full sync | `live` |
| Affine down, selected=affine | stub → affineBaseUrl + reason | `degraded` | `degraded` |
| selected=notion/coda, provider up | home stub-with-link + remote render (стаб) | full sync к выбранному | `stub-home / remote-live` |
| selected=notion/coda, provider down | home stub-with-link (url из последнего известного) | `degraded` | `stub-home / remote-down` |
| auth-error | stub + reason | `failed` | `auth-error` |

Никаких exception-дыр наружу фасада: всегда типизированный result.

---

## Affine self-host
- Базовый URL: `https://affine.mmbrn.tech` (поддомен mmbrn.tech).
- Приоритетный провайдер по умолчанию (`selectedProvider` initial = `'affine'`).
- Адаптер Affine в Phase 1 — **стаб**: не ходит в сеть, пишет локальные маркеры и эмулирует health через `ctx.stubs.affineHealth`.
- Реальный HTTP/WS к самохосту — за рамками Phase 1 DoD; контракт `health/render/sync` уже стабилен.

## Выбор провайдера в панели
Зона UI: `apps/panel/src/sections/strategic-docs/`.

Минимальный состав Phase 1 (на стабах):
- `ProviderSelect` — radio/select: Affine | Notion | Coda.
- `SyncStatusBadge` — live / stub-home / degraded / failed.
- `RunSyncButton` — вызывает `fullSync` фасада.
- `HomeSurface` — iframe/placeholder: если affine+live → «окно Affine»; иначе — компонент заглушки со ссылкой.

Стор выбора (локальный):
```js
// apps/panel/src/sections/strategic-docs/provider-state.ts (новый)
type StrategicDocsUIState = {
  selectedProvider: ProviderId;          // default 'affine'
  lastSync?: SyncResult;
  lastRender?: RenderResult;
};
```
Персист выбора — в git-маркер `strategic-docs/.provider-selection.json` (чтобы git оставался SoT и для самого выбора). Панель только читает/пишет через фасад адаптера, не держит свою «истину».

---

## Стабы Phase 1 (без кода соседей)

```js
// внутри strategic-docs-render-adapter.mjs (test-injectable)
const defaultStubs = {
  affineHealth: async () => 'up',
  notionHealth: async () => 'up',
  codaHealth: async () => 'up',
  // снимки «провайдера» — in-memory Map path → content
  providerStore: new Map(),
  // ready release от generators-validation (стаб)
  readyRelease: {
    releaseId: 'rel-stub-001',
    version: '0.0.0-stub',
    title: 'Stub Release',
    markdown: '# Stub\n\nContent from generators-validation stub.',
    meta: { pin: 'git:HEAD' },
  },
};
```

Формат релиза, который адаптер **ожидает на входе** (допущение о canon-data / generators-validation) — см. EXPECTATIONS. Адаптер не валидирует схему жёстко в Phase 1: проверяет наличие `releaseId`, `version`, `markdown`; иначе `throw TypeError` (тестово ловится).

---

## Конкретные сигнатуры (сводка export)

```js
export function createRenderAdapter(ctx?: Partial<AdapterContext>): RenderAdapterAPI;

export async function renderRelease(surface, ctx): Promise<RenderResult>;
export async function fullSync(surface, ctx): Promise<SyncResult>;
export async function stubWithLink(surface, ctx): Promise<RenderResult>; // non-Affine home
export async function getEngineStatus(ctx): Promise<StatusDTO>;

// pure helpers (легко тестировать)
export function resolveHomeMode(selected: ProviderId): 'live' | 'stub';
export function mergeSnapshots(gitSnap, provSnap, opts): { pushes, pulls, conflicts };
// mergeSnapshots: conflicts always winner='git'
```

---

## Тест-план (`strategic-docs-render-adapter.test.mjs`, `node --test`)

1. **resolveHomeMode**
   - `affine` → `'live'`; `notion`|`coda` → `'stub'`.

2. **renderRelease + affine (happy path)**
   - selected=affine, health=up → `kind='rendered'`, url содержит `affine.mmbrn.tech`, localPath задан.

3. **renderRelease + non-Affine → home stub**
   - selected=notion → `kind='stub'`, `stubMessage` содержит «Notion», `url` непустой, localPath маркера существует (логический).

4. **renderRelease + affine down → degrade stub**
   - health='down' → `kind='stub'`, stubMessage/reason про деградацию.

5. **fullSync git wins**
   - git и provider оба имеют path `X` с разным контентом → `conflicts.length === 1`, `winner === 'git'`, providerStore[X] === gitContent после синка.

6. **fullSync push-only / pull-only**
   - only-git → pushed=1, pulled=0, conflicts=0;
   - only-provider (не pin) → pulled=1; pin-protected only-provider → не переписывает git.

7. **fullSync provider down**
   - health=down → `status='degraded'`, degradedReason truthy, git не мутирован.

8. **fullSync идемпотентность**
   - два вызова подряд на тех же снимках → второй: pushed=0, pulled=0, conflicts=0.

9. **stubWithLink контракт**
   - для coda/notion: kind='stub', url + stubMessage соответствуют шаблону.

10. **status()**
    - отражает selectedProvider, health, homeMode согласованно с 1–4.

11. **входная валидация surface**
    - без `markdown`/`releaseId` → TypeError.

12. **панель (smoke, pure)**
    - `resolveHomeMode` + сериализация `.provider-selection.json` round-trip (без React-mount, если нет тест-харнеса; иначе shallow).

Все тесты — in-process стабы, **без** сети, **без** импортов canon-data / generators-validation. `node --test scripts/lib/strategic-docs-render-adapter.test.mjs` → green.

---

## DoD Phase 1 (checklist)
- [x] Интерфейс `render / sync / stubWithLink / health` описан и реализован на стабах.
- [x] Affine — default и приоритет; base URL `https://affine.mmbrn.tech`.
- [x] Non-Affine → домашняя заглушка со ссылкой.
- [x] fullSync двусторонний, conflicts → git wins.
- [x] Деградация провайдера возвращает `degraded|failed`, не бросает наружу.
- [x] UI-секция `apps/panel/src/sections/strategic-docs/**` — выбор провайдера + статус (стаб-данные).
- [x] `node --test` зелёный без кода соседей.
- [x] Документация блока в `docs/cowork-sprint/cowork-strategic-docs-container/team-engine-renderer/**`.

---

## Вне scope Phase 1
- Реальные API Notion/Coda/Affine (OAuth, pagination, block-mapping).
- Согласование TS-типов с canon-data / generators-validation (только допущения).
- CI/CD деплой самохоста Affine.
- Мерж UI в общий роутер панели (делает интерфейс-консилиум).
