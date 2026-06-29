# Sprint prompt: Issue #185 — services → device-board boundary remediation

> Реестр: `issue-185-services-device-board-boundary`
> Parent: `device-board-phase-3` / follow-up к `db-p3-a1-usercase-catalog-service`
> Размер: **M** · режим: day sprint · review tier: **T2**

## Контекст

`node scripts/check-package-boundaries.mjs` на 2026-06-28 фиксирует 8 нарушений правила
`services-no-device-board-imports` в `packages/services/usercase-catalog/`. Одновременно
`docs/SERVICES.md` описывает эту зависимость как platform-facade exception. Issue #185
закрывает это противоречие: код, документация и автоматическая граница должны снова
описывать одну архитектуру.

## Промпт целиком

### Кто ты

Ты — Ozhegov (Структурщик), работающий под архитектурным LGTM Vesnin. Следуй
`AGENTS.md`, `.cursorrules`, `docs/ARCHITECTURE.md`, `docs/SERVICES.md` и регламенту
T2-review. Перед изменениями используй codebase-memory MCP для карты импортов и blast
radius.

### Цель

Устранить все зависимости из `packages/services/usercase-catalog` на
`@membrana/device-board`, сохранив публичное поведение entitlement-фасада и каталога.
Предпочтительный дизайн — вынести нейтральные контракты каталога и минимальный порт
доступа в разрешённый нижележащий слой (`@membrana/core` либо отдельный shared-contract
package). Конкретный слой должен быть подтверждён короткой ADR/consilium-записью до
массового переноса кода.

### Порядок работы

1. Зафиксировать baseline: полный список 8 срабатываний boundary-check и фактические
   import edges по графу.
2. Провести M0–M2 мини-консилиум: сравнить перенос контракта в `core`, выделение shared
   contracts и локальное дублирование. Выбрать один путь с учётом ownership каталога.
3. Перенести только нейтральные типы/порты. `packages/services/usercase-catalog` не
   должен импортировать runtime, типы, alias или build external из device-board.
4. Адаптировать `device-board` как producer/adapter, сохранив обратную совместимость
   экспортов там, где это оправдано.
5. Обновить тесты и архитектурные документы; удалить устаревшее exception из
   `docs/SERVICES.md`.
6. Выполнить scoped CI и T2 code review. Любое изменение публичного контракта — только
   additive или с явно задокументированной миграцией.

### Definition of Done

- [ ] `node scripts/check-package-boundaries.mjs` — green, 0 нарушений
  `services-no-device-board-imports`.
- [ ] Поиск по `packages/services/usercase-catalog` не находит
  `@membrana/device-board`, включая source, tests и Vite config.
- [ ] Unit tests `@membrana/usercase-catalog-service` и `@membrana/device-board` green.
- [ ] Scoped lint/typecheck/build для service, device-board и client green.
- [ ] Entitlement-семантика `bundled | community | entitled | locked` и загрузка
  документов покрыты regression tests.
- [ ] `docs/ARCHITECTURE.md`, `docs/SERVICES.md` и package README согласованы с кодом.
- [ ] T2 review содержит LGTM либо список устранённых замечаний.
- [ ] В Issue #185 приложены выбранное решение, команды проверки и итоговый PR/commit.

### Проверки

```bash
node scripts/check-package-boundaries.mjs
yarn workspace @membrana/usercase-catalog-service test
yarn workspace @membrana/device-board test
yarn turbo run lint typecheck test build \
  --filter=@membrana/usercase-catalog-service \
  --filter=@membrana/device-board \
  --filter=@membrana/client --continue
```

### Out of scope

- UI/UX каталога, тарифная интеграция cabinet и новые UserCase-фичи.
- Изменение competition policy и runtime validators Phase 3 A2/A3.
- Ослабление или allowlist в `check-package-boundaries.mjs` вместо исправления графа.
- Массовая перестройка `@membrana/core`, не необходимая для нейтрального контракта.
