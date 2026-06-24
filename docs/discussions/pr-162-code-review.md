<!-- Сгенерировано: 2026-06-24 (PR #162 review) -->

Tier: T1

[Teamlead]: PR #162 — UX-регрессия в редакторе пользовательской функции: правая панель в ветке `function` показывала только `BoardFunctionPinInspector`, палитра нод была в недостижимой ветке `else` ternary. Исправление: вынесен `BoardNodePalettePanel`, в function-режиме — stack (инспектор pins сверху, палитра снизу); при «+» в сайдбаре — `clearSelection()` перед `createUserFunction()` (как у «Открыть редактор»). Scope — только `@membrana/device-board` UI. **LGTM** после зелёного CI.

[Структурщик]: **C1** — изменения локализованы в `board-right-sidebar.tsx` (композиция панелей) и `device-board-shell.tsx` (сброс selection). Границы пакетов не нарушены; graph/context без правок. DRY: палитра не дублируется — один компонент для handler и function веток. ✅

[Математик]: —

[Музыкант]: —

[Верстальщик]: **C5** — layout: `flex-col overflow-hidden`, pin inspector в scrollable `flex-1`, палитра `shrink-0 border-t`. Палитра остаётся видимой при входе через «+»; на обычных ветках поведение без изменений (палитра при отсутствии selection). P2 follow-up: при выборе palette-ноды внутри function editor инспектор ноды по-прежнему не показывается (pin inspector перехватывает ветку) — отдельный UX-тикет при необходимости. ✅

---

**Итоговый артефакт:**  
Палитра нод снова доступна в редакторе пользовательской функции; сброс selection при создании функции.

**Definition of Done:**
```bash
yarn workspace @membrana/device-board build
yarn workspace @membrana/device-board test
```

**Риски:** P2 — узкий sidebar при длинном списке pins + полной палитре; scroll на pin-блоке смягчает. P2 — node inspector внутри function body при selected node (не в scope PR).

**Вердикт:** **LGTM**
