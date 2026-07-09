# Промпт: Wire-контракт core↔CJS — кодоген вместо ручной копии

> **Task-промпт для агента-разработчика.**
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md). Размер: **M**.
> Ожидаемый артефакт: **1 PR** — генератор + перегенерированная копия + freshness-гейт.
> Реестр: `id` = `wire-contract-codegen`. GitHub Issue: #320. Задача 3 плана дня 2026-07-09.

---

## Контекст

`packages/background-cabinet/src/domain/node-realtime-wire.ts` — ручная CJS-копия
контрактов `packages/core/src/contracts/node-realtime/` (573 строки, 12 импортёров в
background-cabinet). Причина копии: core ESM-only (`"type": "module"`, exports без
`require`), NestJS-кабинет — CJS (`module: Node16`). Дублирование укусило дважды
2026-07-08; существующий `yarn verify:wire-sync` сверяет только значения событий и поля
`BoardScenarioListItem` — не весь контракт.

**Решение команды (вариант B):** копия становится **генерируемым артефактом** из
core-исходников; freshness-check вместо частичной эвристики. Dual-build core (вариант A) —
осознанно out of scope.

**Установленные факты:**
- Все импорты 6 core-файлов внутренние (`./x.js`), внешних нет.
- Коллизий экспортируемых имён между файлами нет.
- Приватный `isRecord` дублируется в `parse.ts` и `validate-payloads.ts` (нужна дедуп).
- В копии один экспорт, которого нет в core: `parseHealthPongPayload` → апстрим в core.

---

## Промпт целиком (для вставки агенту)

### Кто ты

Координатор виртуальной команды Membrana под Vesnin. Ведёт **Структурщик (Ozhegov)**,
детерминизм генератора — **Математик (Dynin)**.

### Что построить

1. **Апстрим в core:** `parseHealthPongPayload` → `packages/core/src/contracts/node-realtime/validate-payloads.ts`
   (+ экспорт в `index.ts` + unit-тест). Core = строгое надмножество wire-копии.
2. **Генератор** `scripts/generate-wire-contract.mjs`:
   - конкат core-файлов в порядке зависимостей: `envelope → board-events → capture-events → events → parse → validate-payloads`;
   - strip строк внутренних `import ... from './x.js'`;
   - дедуп **идентичных** top-level деклараций (нормализация whitespace; неидентичные
     дубли → fail с внятной ошибкой, никакого молчаливого выбора);
   - баннер: `GENERATED FROM packages/core/src/contracts/node-realtime/ — DO NOT EDIT. Run: yarn wire:generate`;
   - чистые функции экспортированы, unit-тесты: идемпотентность (2 прогона → байтово
     идентично), дедуп идентичных, fail на неидентичных.
3. **Перегенерировать** `node-realtime-wire.ts` генератором (checked-in artifact).
4. **`verify:wire-sync` → freshness-check:** генерируем в память → байтовое сравнение с
   checked-in файлом; расхождение = exit 1 c подсказкой `yarn wire:generate`. Старую
   эвристику удалить (freshness строго сильнее). Скрипт уже в pre-push — новый гейт
   наследует защиту.
5. **`yarn wire:generate`** в корневой `package.json`.

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| core (канон) | `packages/core/src/contracts/node-realtime/*` | единственный источник контракта |
| генератор | `scripts/generate-wire-contract.mjs` | детерминированная сборка CJS-копии |
| артефакт | `packages/background-cabinet/src/domain/node-realtime-wire.ts` | generated, не редактируется руками |
| гейт | `scripts/verify-wire-sync.mjs` | freshness-check (pre-push) |

**Запрещено:**
- Менять упаковку core (dual-build ESM+CJS) — out of scope.
- Менять 12 импортёров background-cabinet (генерат — надмножество прежней копии).
- Молчаливая дедупликация неидентичных деклараций.
- Терять баннер GENERATED при перегенерации.

### Тесты

| Область | Минимум |
|---------|---------|
| core | unit `parseHealthPongPayload` (валид/битые входы) |
| генератор | идемпотентность; дедуп идентичных; fail неидентичных; strip импортов |
| гейт | verify:wire-sync зелёный на свежем, красный на подпорченном артефакте (ручная проверка) |
| регрессия | typecheck/test core + background-cabinet зелёные |

### Definition of Done

- [ ] `node-realtime-wire.ts` генерируется (`yarn wire:generate`), баннер на месте.
- [ ] `verify:wire-sync` = freshness-check, зелёный; сверяет весь контракт.
- [ ] `yarn turbo run typecheck test --filter=@membrana/core --filter=@membrana/background-cabinet` зелёный.
- [ ] 12 импортёров без изменений; миграций нет.
- [ ] Unit генератора (идемпотентность/дедуп/fail) зелёные.
- [ ] LGTM Teamlead.

### Out of scope

- Dual-build core (вариант A) — отдельный спринт при необходимости.
- Изменение самого контракта node-realtime (типы/события).
- Прод-деплой кабинета (генерат идентичен по поведению — деплой по обычному окну).

### Порядок ролей

1. **Teamlead** — scope, LGTM.
2. **Структурщик** — апстрим, генератор, гейт (ведёт).
3. **Математик** — детерминизм/идемпотентность, ревью дедупа.

---

## Заметки для человека-постановщика

1. GitHub Issue #320.
2. registry.json (`status: active`, `size: M`, `githubIssue: 320`, `leadPersona: ozhegov`).
3. После merge: отчёт в Issue → `yarn task:archive wire-contract-codegen --notes "PR #…"`.

### Проверка после PR

```bash
yarn wire:generate && git diff --exit-code packages/background-cabinet/src/domain/node-realtime-wire.ts
yarn verify:wire-sync
yarn turbo run typecheck test --filter=@membrana/core --filter=@membrana/background-cabinet
```

---

## Связь с дорожной картой

- WHITE_PAPER §7 (открытый стабильный контракт наблюдений/событий), принцип §3.5.
- STRATEGIC_PLAN_DAY 2026-07-09 Задача 3; риск P1 из ревью #302/#303/#310.
