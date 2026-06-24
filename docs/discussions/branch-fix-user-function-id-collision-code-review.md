<!-- Сгенерировано: 2026-06-24 (branch review, pre-PR) -->

Tier: T2

[Teamlead]: Ветка `fix/user-function-id-collision` — **P0 data-loss bug** в CGF F1: вторая функция из marquee-collapse получала тот же `fn-1`, что и первая. `commitActiveFunctionDraft` обновлял **все** черновики с совпадающим id → редактирование второй функции перезаписывало первую. Фикс минимален: `existingFunctionIds` в pure `collapseSelectionToFunction` + передача из `collapseMarqueeToFunction`. Регрессионный тест на `fn-1` → `fn-2`. Границы пакетов не нарушены. **LGTM** после зелёного CI на `@membrana/device-board`.

[Структурщик]: **C1/C3** — правки только в `packages/device-board` (graph + context). API расширен опциональным `existingFunctionIds` без breaking change; `usercase-competition-pack` по-прежнему передаёт явный `functionId`. Порядок в `collapseMarqueeToFunction` корректен: `commitActiveFunctionDraft` → collapse с reserved ids → append draft. Дублирование id в массиве drafts больше не возможно при UI-пути. ✅

[Математик]: —

[Музыкант]: —

[Верстальщик]: UI не затронут; баг проявлялся в graph state / function layer. Пользовательский сценарий «вторая функция через объединение» восстановлен. ✅

---

**Итоговый артефакт:**  
Исправление коллизии id пользовательских функций при повторном `collapseSelectionToFunction` из device-board UI.

**Definition of Done:**
```bash
yarn workspace @membrana/device-board run test -- src/graph/collapse-to-function.test.ts
yarn workspace @membrana/device-board run lint
yarn turbo run typecheck --filter=@membrana/device-board
```

**Риски:** P2 — уже сохранённые сценарии с дублирующим `fn-1` в `functions[]` требуют ручного пересоздания второй функции или отката документа; автомиграция не в scope.

**Вердикт:** **LGTM**
