# Эпик: cabinet-scenario-picker-system

> Зарегистрирован 2026-07-08. Координатор: Vesnin (Teamlead). Продуктовая фича по запросу владельца.

## Цель

В кабинете, в выборе сценария устройства, показывать **не только пользовательские, но и
системные сценарии узла (на основании тарифа)**. Внешний вид выбора приблизить к
клиентскому карточному списку (`BoardUserCasePickerModal`).

## Решения (планёрка 2026-07-08)

- **Источник системных сценариев — вариант A: узел объявляет оба.** Узел держит каталог
  UserCases + entitlement; объявляет `user` + разрешённые по тарифу `system` в ЕДИНОМ
  списке (contract-first, как CX3). Кабинет только рендерит. Без дубля каталога на сервере.
- **UI — шареная презентационная карточка.** Извлечь карточку из `BoardUserCasePickerModal`
  в шаренный компонент `@membrana/device-board`; клиент и кабинет рендерят одно (не дрейфуют).
- **Крит.зависимость G1:** тарифные права (`entitledTariffSkus`) сейчас стаб на клиенте
  («stub до cabinet integration», `ClientUserCaseCatalogService`). Нужно прокинуть тариф
  сервер→узел, иначе узел не знает, какие system-сценарии разрешены.

## Ключевое напряжение (зафиксировать)

Право по тарифу — правда **сервера** (кабинет, Prisma `Tariff`); данные каталога системных
сценариев — в **клиентском** бандле (`BUNDLED_USER_CASE_ENTRIES` в device-board). Вариант A
разрешает его так: сервер шлёт узлу его `entitledTariffSkus` (G1), узел фильтрует свой
каталог и объявляет разрешённое.

## Фазы / карточки

| id | Что | Роль | Размер | dependsOn |
|----|-----|------|--------|-----------|
| `csp-1-contract` | Обогатить `BoardScenarioListItem` (@membrana/core): `kind: 'user'\|'system'` + `description?`, `entitlement?`, `branchCount?`, `functionCount?`. Backward-compat: нет `kind` → 'user' (clientVersion handshake) | Ozhegov | S/M | — |
| `csp-2-tariff-to-node` (G1) | Прокинуть тарифные права (`entitledTariffSkus`) сервер→узел на pairing/capture handshake — снять стаб entitlement | Ozhegov+Vesnin | M | — |
| `csp-3-node-declares-system` | Узел объявляет user + entitled-system в едином списке (фильтр каталога по entitledTariffSkus, тег kind) | Ozhegov | M | csp-1, csp-2 |
| `csp-4-shared-card` | Извлечь презентационную карточку из `BoardUserCasePickerModal` в шаренный device-board компонент; клиент рендерит её | Rodchenko | M | csp-1 |
| `csp-5-cabinet-ui` | Кабинет: карточный список «Пользовательские \| Системные» + tariff-бейджи; locked-системные видны неактивными (апселл); `selectScenario` работает | Rodchenko | M | csp-1, csp-4 |
| `csp-6-smoke-docs` | Smoke узел↔кабинет (user+system в кабинете, выбор+run) + docs `DEVICE_BOARD_SERVER_FIRST` | Vesnin | S | csp-3, csp-5 |

## Definition of Done эпика

- `BoardScenarioListItem` расширен (contract-first, backward-compat), границы зелёные
- Узел объявляет user + entitled-system; G1 (тариф→узел) закрыт, стаб entitlement снят
- Шареная карточка в device-board; клиент и кабинет рендерят её (нет визуального дрейфа)
- Кабинет: карточный список сгруппирован «Пользовательские \| Системные», tariff-бейджи,
  locked неактивны; выбор+run системного сценария работает под захватом
- Smoke узел↔кабинет зелёный; docs синхронизированы

## Границы / заметки

- `apps/cabinet` МОЖЕТ импортировать `@membrana/device-board` (нет запрета в `check:boundaries`).
- Entitlement-логика — переиспользовать `ClientUserCaseCatalogService.canApply` (не изобретать).
- Selection persistence уже есть (TD2, `NodeScenarioSelection`) — системные id тоже персистятся.

## Ссылки

- Клиентский эталон: `packages/device-board/src/components/board-usercase-picker-modal.tsx`
- Контракт узла: `board.scenario-list` (CX3), `DeviceScenarioRegistry`
- Каталог+entitlement: `packages/services/usercase-catalog/src/service.ts`
- Тариф: Prisma `Tariff` (background-cabinet)
