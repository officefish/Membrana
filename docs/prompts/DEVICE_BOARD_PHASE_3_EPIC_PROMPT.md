# Промпт: Device-board Phase 3 — catalog, validators, competition

> **Task-эпик** после консилиума [`phase-3-architecture-decisions-2026-06-24`](../seanses/phase-3-architecture-decisions-2026-06-24.md).
> Реестр: `device-board-phase-3` · подзадачи `db-p3-a1-*` … `db-p3-a3-*`.
> Размер эпика: **L** · ветка спринта: `feat/device-board-phase-3` (или `techies68` после merge hotfix).

---

## Контекст

Phase 2b (`comp-mvp-packaging`) — LGTM. Аудит `exec-successor` / `function-call-resolve` — refactor не требуется ([`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) §18.3.1).

Phase 3 закрывает три архитектурных решения консилиума:

| Wave | id | Фокус | Lead |
|------|-----|-------|------|
| **A1** | `db-p3-a1-usercase-catalog-service` | `@membrana/usercase-catalog-service` | Ozhegov |
| **A2** | `db-p3-a2-runtime-validators` | `runtime/validators/` + live UI | Dynin + Rodchenko |
| **A3** | `db-p3-a3-competition-restrictions` | `executionPolicy` + competition templates | Kuryokhin + Rodchenko |

**Зависимости:** A1 ∥ A2; A3 после A2.

**Не делаем в Phase 3:** merge в `main`, Transport RFC (T3), trends calibration (T1–T2) — параллельные потоки MAIN_DAY_ISSUE.

---

## Промпт целиком (для вставки агенту)

### Кто ты

Координатор виртуальной команды Membrana (Vesnin). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md), [`ARCHITECTURE.md`](../ARCHITECTURE.md), [`SERVICES.md`](../SERVICES.md).

### A1 — usercase-catalog-service

**Цель:** перенести `ClientUserCaseCatalogService` из `apps/client/src/modules/device-board/user-case-catalog-service.ts` в `packages/services/usercase-catalog/`.

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Bundled index | `@membrana/device-board` `src/catalog/` | `UserCaseCatalogService`, summaries |
| Entitlement facade | `@membrana/usercase-catalog-service` | tariff/bundled/community, `canApply`, `loadDocumentIfEntitled` |
| Client module | `apps/client/.../device-board/` | UI hooks, settings gate — импорт из сервиса |

**Зависимости пакета:** `@membrana/core`, `@membrana/device-board` (типы + catalog). Циклов нет.

**DoD A1:**
- [ ] Пакет `@membrana/usercase-catalog-service` (service.ts, types.ts, hooks.ts, index.ts, tests).
- [ ] Client импортирует из `@membrana/usercase-catalog-service`; старый файл удалён.
- [ ] Alias в `apps/client/vite.config.ts` + `tsconfig.app.json`; reference в root `tsconfig.json`.
- [ ] Строка в `packages/services/README.md` + `docs/SERVICES.md` (platform facade).
- [ ] `yarn workspace @membrana/usercase-catalog-service test` green.

### A2 — runtime validators

**Цель:** чистые валидаторы в `packages/device-board/src/runtime/validators/`.

| Функция | Вход | Выход |
|---------|------|-------|
| `validateUserCaseStructure` | document / subgraph | `{ isValid, errors[] }` |
| `validateBlockLinks` | graph edges | `{ isValid, errors[] }` |

Контракт ошибки: `{ blockId?, pinId?, message }`.

**DoD A2:**
- [ ] Модули + unit-тесты; экспорт из `device-board/src/index.ts`.
- [ ] `verify-usercase-prerun.mjs` вызывает валидаторы.
- [ ] Live UI: inline ошибки на canvas (Rodchenko).
- [ ] `DEVICE_BOARD_CONCEPT.md` — Validation layer.

### A3 — competition mode

**Цель:** флаги `meta.isCompetitionTemplate` + `meta.executionPolicy: 'free' | 'competition'`.

**DoD A3:**
- [ ] Типы в `@membrana/core` или device-board manifest (additive).
- [ ] Шаблоны alpha/beta/gamma → `packages/background-media/templates/competition/`.
- [ ] Runtime: readOnly blocks, timeout 600s, server log stub.
- [ ] UI: скрыть delete, timer footer, warning badge.
- [ ] `DEVICE_BOARD_CONCEPT.md` — Competition mode.

### Запрещено

- Новый `AudioContext` / Web Audio вне `audio-engine-service`.
- Прямая регистрация модулей в store (только `MembranaRegistry`).
- Отдельный класс `CompetitionUserCase` (решение консилиума: флаг + policy).

### CI

```bash
yarn turbo run lint typecheck test build --filter=@membrana/usercase-catalog-service --filter=@membrana/device-board --filter=@membrana/client --continue
```

---

## Ссылки

| Документ | Назначение |
|----------|------------|
| [`phase-3-architecture-decisions-2026-06-24.md`](../seanses/phase-3-architecture-decisions-2026-06-24.md) | Протокол консилиума |
| [`db-pcd-nb1-runtime-dry-audit-2026-06-21.md`](../discussions/db-pcd-nb1-runtime-dry-audit-2026-06-21.md) | Runtime DRY audit |
| [`DEVICE_BOARD_USERCASES_EPIC_PROMPT.md`](./DEVICE_BOARD_USERCASES_EPIC_PROMPT.md) | U9 catalog baseline |
