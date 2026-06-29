# Research-Tree demo — стек

> Документ описывает стек для демо-версии графа знаний Membrana
> (`membrana-knowledge-graph.json` → интерактивное дерево/граф исследований).
>
> **Принцип №1: максимальное переиспользование.** Демо собирается из того, что
> уже есть в монорепо. Цель — **0 новых зависимостей**, кроме одного открытого
> вопроса по управлению состоянием (см. §5, исследуется отдельно).

---

## 1. Канонический стек монорепо (факты из кода)

Сверено с `apps/client/package.json`, `apps/cabinet/package.json`,
`packages/device-board/package.json`, `yarn.lock` на 2026-06-28.

| Слой | Инструмент | Версия | Где используется |
|------|-----------|--------|------------------|
| **UI-рантайм** | React | `^18.3.1` | client, cabinet, device-board (peer) |
| **Бандлер/dev-сервер** | Vite | `^5.3.0` | client, cabinet |
| **Стили** | Tailwind CSS | `^3.4.6` | client, cabinet |
| **UI-компоненты** | DaisyUI | `^4.12.10` | client, cabinet |
| **Язык** | TypeScript | `^5.4.0` | весь монорепо, project references |
| **Менеджер пакетов** | Yarn 4 (Berry) + Corepack | из `packageManager` | монорепо, `nodeLinker: node-modules` |
| **Оркестрация** | Turborepo | из root `package.json` | `yarn turbo run …` |
| **Линт** | ESLint | `^8.57.0` | client, cabinet, пакеты |
| **Тесты unit** | Vitest | `^1.4.0` | client, cabinet, пакеты |
| **Тесты e2e** | Playwright | `^1.52.0` | client |
| **Форматирование** | Prettier | root | весь монорепо |
| **Граф/ноды UI** | `@xyflow/react` | `^12.11.0` | device-board |
| **Авто-layout графа** | `@dagrejs/dagre` | `^3.0.0` | device-board |
| **Постпроцесс CSS** | PostCSS + autoprefixer | `^8.4.39` / `^10.4.19` | client, cabinet |

> ⚠️ `apps/demos/Harmonic-Detector/` — **не эталон**. Это legacy-демо на pnpm
> с собственным lock-файлом, отдельным tsconfig и набором пакетов, не входящих
> в граф зависимостей монорепо. Его стек **не** берётся за образец.

---

## 2. Что нужно демо Research-Tree

Из `KNOWLEDGE_GRAPH_SPEC.md` и `membrana-knowledge-graph.json`:

1. **Рендер графа**: ~60 узлов, рёбра `requires`, кластеризация по `branch`
   (17 веток), слои по `epoch` (E0…E4), квадранты по `facets` (2×2).
2. **Интерактив**: клик по узлу → панель деталей (state, gate, cost, requires);
   фильтры по branch/epoch/state/quadrant; подсветка фронтира
   (`exploring` + `gate.status === 'open'`).
3. **Данные**: статичный JSON на входе (~60 узлов, иммутабельный в рамках сессии).
4. **UI-состояние**: выбранный узел, активные фильтры, viewport графа
   (pan/zoom), свёрнутые/развёрнутые группы.
5. **Визуальные состояния узла**: `fog | available | exploring | established`
   → цвет/стиль; `gate.status === 'open'` → индикатор шлюза.

---

## 3. Маппинг «требование → инструмент» (всё уже в монорепо)

| Потребность демо | Инструмент | Уже есть? |
|------------------|-----------|-----------|
| Рендер нод, рёбер, pan/zoom, мини-карта | `@xyflow/react` | ✅ device-board |
| Авто-раскладка DAG по `requires` | `@dagrejs/dagre` | ✅ device-board |
| Компоненты UI (кнопки, бейджи, панели, темы) | DaisyUI | ✅ client/cabinet |
| Утилитарные классы, цвета состояний | Tailwind | ✅ client/cabinet |
| React + хуки | React 18 | ✅ везде |
| Сборка/dev | Vite | ✅ client/cabinet |
| Типы графа | TypeScript | ✅ везде |
| unit-тесты логики графа (инварианты) | Vitest | ✅ везде |
| Парсинг/валидация JSON графа | нативный TS + Vitest | ✅ без новой зав-ти |

**Вывод §3: для рендера, layout, UI, сборки и тестов новых зависимостей не нужно.**

---

## 4. Размещение демо в монорепо

Демо — отдельный workspace в `apps/demos/Research-Tree/`, по образцу client/cabinet:

```
apps/demos/Research-Tree/
├── package.json          # @membrana/research-tree-demo, private
├── tsconfig.json         # extends ../../tsconfig.base.json, composite
├── tsconfig.app.json     # paths как в client (на исходники пакетов)
├── vite.config.ts        # alias @membrana/device-board на src
├── tailwind.config.js    # content: ./src + ../../packages/device-board/src
├── postcss.config.js
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── graph/            # типы, парсер, инварианты, layout-маппер
│   ├── components/        # GraphCanvas, NodeCard, DetailPanel, Filters
│   └── state/            # см. §5 (открытый вопрос)
├── membrana-knowledge-graph.json   # уже есть — источник истины
└── KNOWLEDGE_GRAPH_SPEC.md         # уже есть
```

Алиас `@membrana/device-board` → на исходники (`packages/device-board/src/index.ts`),
как сделано в `apps/client/vite.config.ts` — без шага сборки в dev.

---

## 5. Архитектура состояния — РЕШЕНО

> ✅ **Закрыто.** Полное решение и обоснование — в
> [`STATE_ARCHITECTURE.md`](./STATE_ARCHITECTURE.md). Краткое резюме ниже.
>
> После интервью с владельцем продукта жанр задачи сменился: демо — не витрина,
> а зародыш продукта с **git time-travel** для управленцев/инвесторов. Это
> сместило водораздел с «какая state-либа для UI» на «как грузить слепки из
> git и кэшировать их».

**Вердикт — трёхслойная архитектура, +1 новая зависимость:**

| Слой | Инструмент | Новая зав-ть? |
|------|-----------|---------------|
| URL (deep-link для инвесторов) | нативный `useSearchParams` | нет |
| Async (слепки графа из git) | **TanStack Query** (~13 KB gz) | 🆕 **да, обоснована** |
| Canvas (nodes/edges/viewport) | внутренний store `@xyflow/react` | нет (уже в device-board) |
| Transient UI (сайдбар, фильтры) | `useReducer` + Context | нет |

Подробнее — факты кода, обоснование Query, размещение GitHub-клиента в
`background-office` (не в браузере), границы применения — в
[`STATE_ARCHITECTURE.md`](./STATE_ARCHITECTURE.md).

### 5.1 Факты о текущем подходе (из кода)

| Store | Инструмент | Что хранит | Где |
|-------|-----------|-----------|-----|
| `useMembranaStore` | **Zustand** v4.5.2 + `devtools` + `persist` | модули, плагины, prefs | `packages/agenda/src/core/store.ts` |
| `useNodeConnectionStore` | **Zustand** + ручной localStorage | UI-флаги, pairing | `apps/client/src/stores/nodeConnectionStore.ts` |
| `useUserTemplatesZustandStore` | **Zustand** + JSON-persist фасад | шаблоны trends | `apps/client/src/plugins/trends-fft-analyzer/` |
| singleton-state в плагинах | **`useSyncExternalStore`** | mic stream метрики | `apps/client/src/plugins/microphone-stream-viz/` |

**В lock-файле отсутствуют:** jotai, nanostores, valtio, redux, mobx.
Zustand — единственная библиотека состояния в монорепо.

### 5.2 Специфика демо, важная для выбора

- **Данные графа** (~60 узлов) — статичный иммутабельный JSON в рамках сессии.
  Для самих данных store **не нужен**: `import graph from '../membrana-knowledge-graph.json'`.
- **`@xyflow/react` имеет собственный внутренний store** для узлов/рёбер/viewport
  (`useReactFlow`, `useNodesState`, `useEdgesState`) — пан/зум и манипуляции с
  нодами покрываются им самим.
- Реально **свой** state нужен только для малого объёма UI: выбранный узел
  (1 id), активные фильтры (4 поля), подсветка фронтира (1 bool).

→ Классический аргумент «нужен Zustand для shared-состояния между множеством
виджетов» здесь **слабый**: shared-данных почти нет, состояние локальное.

### 5.3 Кандидаты для сравнения (без вердикта)

| Вариант | Плюсы | Минусы | Новая зависимость? |
|---------|-------|--------|---------------------|
| **A. Zustand v4** | единообразие с монорепо; знакомая команда; persist | избыточен для ~6 полей; +1 привычная зав-ть | нет (уже есть) |
| **B. `useReducer` + Context** | ноль зависимостей; нативный React; достаточно для объёма | boilerplate; ре-рендеры при росте | нет |
| **C. Только внутренний store `@xyflow/react`** | минимальный; state живёт там, где ему место | вне графа (фильтры/детали) требует доп. решения | нет |
| **D. Jotai** | atomic state, отлично для фильтров; современнее | новая зав-ть; новый паттерн для команды | **да** |
| **E. nanostores** | framework-agnostic, малый footprint | новая зав-ть; иной паттерн; меньше экосистема React | **да** |

### 5.4 Что должно решить исследование

1. Объём и форма **своего** (не xyflow) состояния после прототипа раскладки.
2. Нужен ли persist (URL query params? localStorage? не нужен?) — у демо нет
   пользовательских данных.
3. Будет ли демо **шаблоном** для будущих UI в монорепо (тогда единообразие
   с Zustand важнее минимализма) или разовой витриной.
4. Сильвер-пул «0 новых зависимостей» (варианты A/B/C) против современных
   альтернатив (D/E).

→ **Решение фиксируется отдельным документом/таском до старта реализации
state-слоя.** До него — рендер и layout можно вести на варианте C (внутренний
store xyflow) + `useState` для панелей, не блокируя исследование.

---

## 6. Резюме: что берём как данное

| Решение | Статус |
|--------|--------|
| React 18 + Vite 5 + TS 5.4 | ✅ принято (канон монорепо) |
| Tailwind 3 + DaisyUI 4 | ✅ принято (канон монорепо) |
| `@xyflow/react` + `@dagrejs/dagre` для рендера/layout | ✅ принято (уже в device-board) |
| Vitest для тестов инвариантов графа | ✅ принято (канон монорепо) |
| Yarn 4 + Turbo, workspace в `apps/demos/` | ✅ принято (канон монорепо) |
| Источник данных — `membrana-knowledge-graph.json` | ✅ принято (уже есть) |
| **State-инструмент** | ⛔ **открыто, исследовать отдельно (§5)** |

**Новых зависимостей: 0** (при вариантах A/B/C по state) или минимально
(1 библиотека, при D/E — только после обоснования исследованием).

---

## 7. Чего НЕ используем и почему

| Инструмент | Почему нет |
|-----------|-----------|
| Next.js / Remix | демо — статичный SPA, серверного рендеринга не нужно; Vite канон |
| Redux Toolkit | в монорепо нет; избыточен для объёма |
| CSS-in-JS (styled-components, emotion) | канон — Tailwind + DaisyUI |
| framer-motion | анимации — через Tailwind/CSS; не тащим без нужды |
| D3.js | рендер графа — на `@xyflow/react`; D3 избыточен |
| Cytoscape.js / vis-network | конкурируют с уже принятым `@xyflow/react` |
| pnpm (как в Harmonic-Detector) | канон монорепо — Yarn 4 |
