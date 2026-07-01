# Research-Tree — Архитектура состояния

**Статус:** РЕШЕНО (закрыто 2026-07-01)  
**Ссылка:** §5 DEMO_STACK.md

---

## Решение: трёхслойная архитектура

| Слой | Инструмент | Новая зависимость? |
|------|-----------|-------------------|
| URL (deep-link для инвесторов) | нативный `useSearchParams` | нет |
| Async (слепки графа из git) | **TanStack Query** v5 (~13 KB gz) | 🆕 **да** |
| Canvas (nodes/edges/viewport) | внутренний store `@xyflow/react` | нет |
| Transient UI (сайдбар, фильтры, выбранный узел) | `useReducer` + Context | нет |

**Итог: +1 зависимость** (`@tanstack/react-query`). Все остальные слои покрыты тем, что уже есть в монорепо.

---

## Почему TanStack Query для git time-travel

Демо — не статичная витрина, а **зародыш продукта для управленцев и инвесторов** с функцией просмотра истории графа в разрезе git-коммитов. Это меняет жанр задачи:

- Данные графа загружаются **асинхронно** с сервера (GitHub API → конкретный SHA коммита)
- Необходим **кэш** слепков (один и тот же SHA запрашивается при навигации по истории)
- **Background-refetch** при переходе между датами
- **Error/loading states** для каждого слепка

TanStack Query решает все четыре пункта из коробки. Zustand (уже в монорепо) для этого не предназначен. `useReducer` + `useEffect` + ручной кэш — это заново написать подмножество Query с худшим DX.

### Где живёт GitHub-клиент

GitHub API вызывается **не из браузера** (CORS, rate limit) — клиент живёт в `packages/background-office`. Браузер запрашивает `/api/graph?sha=<SHA>`, который проксирует вызов к GitHub. TanStack Query в браузере кэширует ответы по `['graph', sha]`.

---

## Почему не Zustand для этого слоя

Zustand v4 — отличный выбор для синхронного клиентского состояния (`useMembraneStore` в agenda). Для async-данных с кэшированием его нужно расширять вручную (middleware, stale/revalidate логика). Это дублирование функциональности Query без выигрыша.

---

## Transient UI — `useReducer` + Context

Объём своего (не xyflow) состояния минимален:

```typescript
interface UIState {
  selectedNodeId: string | null;
  filters: {
    states: NodeState[];   // fog | available | exploring | established
    epochs: Epoch[];       // E0..E4
    branches: string[];
  };
  highlightFrontier: boolean;
}
```

Три поля, нет shared-виджетов с глубоким пробросом — `useReducer` + один Context достаточно. Zustand здесь избыточен, Jotai — новая зависимость без необходимости.

---

## Canvas state

`@xyflow/react` хранит nodes/edges/viewport через `useNodesState` / `useEdgesState` / `useReactFlow`. Дублировать это в отдельном store не нужно.

---

## URL state

Выбранный узел и активные фильтры сериализуются в search params для deep-link (`?node=stack.mcp-client&epoch=E1`). `useSearchParams` (React Router или нативный браузерный API) — без новых зависимостей.

---

## Фазы внедрения

| Фаза | Что делаем | State |
|------|-----------|-------|
| S1 Bootstrap (✅) | scaffold, статичный JSON | `import graph from '...'` |
| S2 State decision (эта) | типы UIState, QueryClient setup | структура определена |
| S4 Render MVP | GraphCanvas, NodeCard, фильтры | `useReducer` + Context |
| S5 Git time-travel | GitHub API, история слепков | TanStack Query |

TanStack Query устанавливается сейчас (`package.json`), но QueryClient реально используется в S5.

---

## Итоговые константы выбора

| Вопрос | Ответ |
|--------|-------|
| Нужен ли persist? | нет — демо без пользовательских данных |
| Шаблон для будущих UI? | нет — демо изолировано в `apps/demos/` |
| Единообразие с монорепо важнее минимализма? | нет, для async-слоя Query обоснована |
