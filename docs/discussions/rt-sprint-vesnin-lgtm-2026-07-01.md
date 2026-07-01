# Vesnin LGTM Review — Research Tree Sprint · 2026-07-01

**PR:** #220 · **Branch:** chore/backlog-cleanup-s1-clean

---

## Ответы на 5 вопросов Vesnin-а

### 1. Где находится research-tree-demo?

`apps/demos/Research-Tree/` — standalone workspace **вне** `packages/services/`.
Зарегистрирован в корневом `package.json` как `"apps/demos/Research-Tree"` (явно, не через glob).
Импортирует только: ReactFlow, dagre, daisyUI. Ни одного `@membrana/*` — нулевая связность с основной архитектурой.

### 2. Интерфейсы Transition и computeStatesAt

Живут **локально** в `apps/demos/Research-Tree/src/graph/`:

```ts
// types.ts
export interface GraphTransition {
  id: string;
  nodeId: string;
  to: NodeState;          // 'fog' | 'available' | 'exploring' | 'established'
  date: string;           // YYYY-MM-DD
  note?: string;          // "sha — commit message"
}

// adapter.ts
export function computeStatesAt(graph: KnowledgeGraph, date: string): Record<string, NodeState>
```

Не экспортируются в core — специфичны для Research Tree.

### 3. Скрипт rt:day-report

- Путь: `scripts/rt-day-report.mjs` (корневой scripts/)
- Зависимости: только Node.js stdlib (`fs`, `child_process`, `path`) + `git numstat` через `execSync`
- Читает `apps/demos/Research-Tree/membrana-knowledge-graph.json` напрямую через `fs.readFileSync`
- Никаких import из пакетов — утилита, а не сервис

### 4. Где лежат отчёты

`docs/archive/rt-day-reports/YYYY-MM-DD/DAY_GIT_FLOW.md` + `DAY_COMPONENT_REPORT.json`

Коммитятся **намеренно** как архивные артефакты (как `docs/archive/daily-day/`).
CI их не регенерирует. Размер: ~2-4 кб на дату, 17 дат = ~50 кб суммарно.

### 5. Intent — инструмент для команды

Research Tree — **developer insight tool**, не клиентская фича.
Цель: понять историю проекта через граф знаний, путешествие по хронологии (playhead).
UI (`apps/demos/Research-Tree`) — визуализация для команды, аналог DESIGN_LOG.md только в интерактивной форме.

---

## Оригинальное ревью Vesnin-а

✅ Концепция event-sourcing для собственной истории — elegantный способ анализировать себя.
✅ 17 дат с DAY_GIT_FLOW.md — практически проверено.
✅ Не нарушает основную архитектуру (boundaries соблюдены).
✅ Скрипт и сервис разделены.

**Ожидаемый вердикт после ответов:** LGTM (нет блокеров, архитектурные границы чистые).
