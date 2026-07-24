# Промпт: процедурная мастерская — три глагола над 2D-домом

> Спринт `procedural-workshop` · M · lead ozhegov, support dynin.
> Из эпика заседания [`home-workshop`](../meeting/home-workshop/EPIC.md): закрывает дыру
> T10 (у процедурного дома было 0 из 3 глаголов) и служит предусловием переезда #915.
> **Исполнено в этом же спринте** — ниже спецификация как запись, не to-do.

## Что построено

Мастерская дома `docs/procedures/` (паттерн [`HOME_WORKSHOP`](../patterns/HOME_WORKSHOP.md)) —
**первый полностью оснащённый жилец** (все три глагола, включая inspectElement).

- **`workshop.manifest.json`** дома процедур: `worksOn: docs/procedures`, `kit: null`;
  глаголы `audit`/`decompose`/`inspectElement` → `yarn procedures:workshop --audit|--decompose|--inspect`.
- **`audit`** (`scripts/lib/procedural-workshop.mjs`): инвентарь — сверка `container.value`
  реестра с реальностью + `validateProcedure`. Классы состояния: built-valid,
  declared-not-built (бэклог), drift-declared-missing / drift-built-undeclared (роняют CI).
  Замер 22.07: 8 построено-валидно, 8 объявлено-не-построено, 0 дрейфа.
- **`decompose`** (`--by holder|status|kit`): раскладка процедур по правилу (полиморфизм
  верхнего этажа 2D-дома).
- **`inspectElement`** (`--inspect <id>`): рассмотрение одной процедуры вглубь — её второе
  измерение (engines/precedents/kitVersion подграфа манифеста). Полиморфная рекурсия по
  **цепочка кадров** по полосам `preflight` → `frames` → `post` с держателями и числом пинов; плюс подграф манифеста (engines/precedents/kitVersion).

## Границы (осознанные)

- Рекурсия ВГЛУБЬ кадра (по пинам-гранулам через `auditPins`) — за отдельной задачей; здесь кадры показываются списком по полосам.
- Операции обзора — чтение, идемпотентны (вердикт Ф3 home-workshop).
- 8 объявленных-не-построенных процедур — легальный бэклог, не дефект.

## Definition of Done — выполнено

- [x] `workshop.manifest.json` (три глагола); `validate:workshop` и `check:workshop-ownership` зелёные.
- [x] `procedures:workshop --audit|--decompose|--inspect` работают на реальном доме.
- [x] Чистое ядро + 8 тестов (`scripts/procedural-workshop.test.mjs`); всего 30/30 по мастерским.
- [x] Дыра T10 закрыта: у процедурного дома теперь 3 из 3 глаголов.
