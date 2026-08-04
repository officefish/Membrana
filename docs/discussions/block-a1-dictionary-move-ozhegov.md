# Обсуждение: block-a1-dictionary-move-ozhegov

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-04 12:22 UTC · ozhegov

**Вопрос:** Ты держатель блока a1-dictionary-move спринта sprint-dictionary-to-lib (#1681), ратифицирован владельцем 04.08. Твоя зона: scripts/lib/sprint-cut/sprint-run.mjs (новый), scripts/sprint-cut-check.mjs, scripts/execution-gate.mjs. Оценка ~120 строк.

**Ответ:**

Контекст → решение → риски, по форме доклада.

**Что делаем:** переезд словаря в `scripts/lib/sprint-cut/sprint-run.mjs` — единая лемма `SPRINT_PROCEDURE_ID` + `sprintTrailRelPath`, заткнув «тайное API» (импорт из `sprint-cut-check.mjs` в `execution-gate.mjs`). Плюс структурный `orphanedBy` через `closeProcedureRun`.

**Затронутые пути:** `scripts/lib/sprint-cut/sprint-run.mjs` (новый), `scripts/sprint-cut-check.mjs` (экспорт словаря), `scripts/execution-gate.mjs` (импорт из lib вместо скрипта-скрипта). Связка «скрипт → скрипт» рвётся по норме: вместо `sprint-cut-check` — `@membrana/scripts/lib/sprint-cut` как основание.

**Риски связанности:**
- `procedure-run-record.mjs` тянет `orphanedBy` из evidence строкой; перенос поля через `closeProcedureRun` — расширение контракта функции, проверяю, чтобы не появился второй фасад на то же поле.
- `execution-gate.mjs` после переезда не должен тянуть `sprint-cut-check` транзитивно — иначе цикл `lib → скрипт → lib`.

**Уточнение:** `sprint-run.mjs` — именованный артефакт окна S? Или просто lib-модуль на том же уровне, что `detector-base`? Мне нужна граница: это сервис в `packages/services/` или утилита в `scripts/lib/` — от этого зависит, попадает ли он под правило `SERVICES.md` про независимость.

---
## 2026-08-04 12:28 UTC · ozhegov

**Вопрос:** Подтверждение внутри окна блока a1. Ответ на твой вопрос: sprint-run.mjs — утилита scripts/lib/sprint-cut/, НЕ сервис packages/*; правило SERVICES.md не применяется, граф ARCHITECTURE.md не трогается. Сделано по твоим границам: словарь целиком в lib (SPRINT_PROCEDURE_ID, sprintTrailRelPath, ensureSprintRunOpen — lib-к-lib импорт procedure-run-journal); execution-gate.mjs импортирует из lib, транзитивного lib→скрипт цикла нет (проверено: sprint-run.mjs скриптов не тянет); реэкспорты в sprint-cut-check.mjs оставлены живыми ссылками для существующих зубов, помечены комментарием. 88/88 зубов трёх семей зелёные. Подтверди форму одним абзацем или назови дефект.

**Ответ:**

Контекст ясен: `sprint-run.mjs` — инструмент организационного слоя `scripts/lib/sprint-cut/`, не сервис. Правило SERVICES.md к нему неприменимо, пакетный граф не задет — согласен, это не нарушение.

Решение: форма подтверждается.

- Словарь спринта целиком в `lib/` (SPRINT_PROCEDURE_ID, sprintTrailRelPath, ensureSprintRunOpen) — одно определение на термин, lib-к-lib импорт к procedure-run-journal.
- `execution-gate.mjs` потребляет из lib; транзитивного lib→скрипт цикла нет — слабая связанность соблюдена.
- Реэкспорты в `sprint-cut-check.mjs` живыми ссылками с комментарием — допустимый переходный мост, не синоним-слой.

Риски связанности: не вижу. 88/88 зелёные — подтверждаю форму. Замечаний нет.

---
