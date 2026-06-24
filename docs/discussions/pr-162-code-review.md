<!-- Сгенерировано: 2026-06-24 (PR #162 review, refresh после follow-up) -->

Tier: T1

[Teamlead]: PR #162 — три итерации UX правого сайдбара в ветке `function`: (1) палитра была недостижима — exclusive ternary `showFunctionInspector`; вынесен `BoardNodePalettePanel`, `clearSelection()` при «+»; (2) палитра «залипала» на группах/нодах — `showFunctionPinPanel` только при `selectedNodeId === null`; (3) function-input/output держали pin+palette — отдельный `showFunctionPinInspectorOnly` (pins без палитры) + сброс stale IO selection при уходе с ветки `function`. Scope: `@membrana/device-board` UI only. **LGTM** после зелёного CI.

[Структурщик]: **C1** — `board-right-sidebar.tsx` (state machine панелей), `device-board-shell.tsx` (selection lifecycle). Graph/context/runtime без изменений. DRY: одна `BoardNodePalettePanel` для handler и function. ✅

[Математик]: —

[Музыкант]: —

[Верстальщик]: **C5** — итоговая матрица function-редактора: пустой канвас → pin inspector + палитра; function-input/output → только pin inspector (`pinEditSide`); группа/Print/… → инспектор ноды как на handler-ветках; handler-ветки без регрессии. ✅

---

**Итоговый артефакт:**  
Стабильный правый сайдбар в редакторе пользовательской функции: палитра доступна, инспектор нод и групп не блокируется, IO не залипает.

**Definition of Done:**
```bash
yarn workspace @membrana/device-board build
yarn workspace @membrana/device-board test
```

**Operator smoke:**
- «+» в пользовательских функциях → pin + палитра
- Print/группа внутри функции → инспектор ноды
- Input/Output → только pins
- On start / Main после function → обычный сайдбар

**Риски:** P2 — узкий sidebar при pin+palette на пустом канвасе (scroll).

**Вердикт:** **LGTM**
