<!-- Сгенерировано: 2026-06-24 (PR #162 review) -->

Tier: T1

[Teamlead]: PR #162 — UX-регрессия в редакторе пользовательской функции: правая панель в ветке `function` показывала только `BoardFunctionPinInspector`, палитра нод была в недостижимой ветке `else` ternary. Исправление: вынесен `BoardNodePalettePanel`, в function-режиме — stack (инспектор pins сверху, палитра снизу); при «+» в сайдбаре — `clearSelection()` перед `createUserFunction()` (как у «Открыть редактор»). Scope — только `@membrana/device-board` UI. **LGTM** после зелёного CI.

[Структурщик]: **C1** — изменения локализованы в `board-right-sidebar.tsx` (композиция панелей) и `device-board-shell.tsx` (сброс selection). Границы пакетов не нарушены; graph/context без правок. DRY: палитра не дублируется — один компонент для handler и function веток. ✅

[Математик]: —

[Музыкант]: —

[Верстальщик]: **C5** — layout: `flex-col overflow-hidden`, pin inspector в scrollable `flex-1`, палитра `shrink-0 border-t`. `showFunctionPinPanel` — pin+palette только без selection; function-input/output → pin inspector без палитры; palette/group/прочие ноды → инспектор ноды. ✅

---

**Итоговый артефакт:**  
Палитра нод снова доступна в редакторе пользовательской функции; сброс selection при создании функции.

**Definition of Done:**
```bash
yarn workspace @membrana/device-board build
yarn workspace @membrana/device-board test
```

**Риски:** P2 — узкий sidebar при длинном списке pins + полной палитре; scroll на pin-блоке смягчает.

**Вердикт:** **LGTM**
