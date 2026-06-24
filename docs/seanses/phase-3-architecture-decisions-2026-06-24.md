# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-06-24T04:37:54.099Z |
| Команда | `yarn consilium` |
| Модель | claude-haiku-4-5-20251001 |
| Файл | `docs/seanses/phase-3-architecture-decisions-2026-06-24.md` |
| Порядок ролей | Структурщик → Музыкант → Математик → Верстальщик → Teamlead |

**Вопрос:**

Phase 3 после LGTM Phase 2b (comp-mvp-packaging). Три вопроса: (1) Статус user-case-catalog-service — сейчас в apps/client/src/modules/device-board/services/user-case-catalog.ts; остаётся фасадом в client или переезжает в packages/services/usercase-catalog? Критерий: есть ли вторая точка использования кроме device-board? (2) Нужны ли отдельные функции-валидаторы в @membrana/device-board/src/runtime/validators/ или достаточно внешних скриптов verify-usercase-prerun.mjs? Критерий: нужна ли live-валидация при редактировании или только pre-run? (3) Конкурсная упаковка UserCase (USERCASE_COMPETITION_LESSONS) — отдельный тип CompetitionUserCase или обычные шаблоны из packages/background-media/templates/competition/? Критерий: нужна ли спецобработка при запуске конкурсного сценария? Контекст: аудит exec-successor/function-call-resolve LGTM, DEVICE_BOARD_CONCEPT §18.3.1 обновлён, refactor не требуется.

---

# Консилиум: Архитектура Phase 3 — UserCase, валидация, конкурсная упаковка

**Повестка:** Три стратегических вопроса после LGTM Phase 2b (comp-mvp-packaging):
1. Статус `user-case-catalog-service` — остаётся ли в `apps/client/` или переезжает в `packages/services/`?
2. Нужны ли встроенные валидаторы в runtime или достаточно внешних скриптов?
3. Конкурсная упаковка UserCase — отдельный тип или шаблоны?

**Участники:** Структурщик (Ozhegov), Музыкант (Kuryokhin), Математик (Dynin), Верстальщик (Rodchenko), Teamlead (Vesnin).

**Порядок реплик:** Структурщик → Музыкант → Математик → Верстальщик → Teamlead (циклически)

---

[Структурщик]: Начну с вопроса (1). Сейчас `user-case-catalog-service` живёт в `apps/client/src/modules/device-board/services/`. По ARCHITECTURE.md это **не** нарушение — фасад платформы может быть выше плагина — но нам нужно понять масштаб. Если это только для device-board, оставляем на месте как утилиту `module → service`. Если будут вторые потребители (другой модуль, фоновый сервер), пакет переезжает в `packages/services/usercase-catalog-service/`.

[Музыкант]: Согласен, что нужна ясность. Но я бы ещё добавил контекст: конкурсная упаковка (вопрос 3) тоже может быть потребителем. Если в `background-media` будут скрипты, которые генерируют и загружают сценарии, им нужен был бы доступ к каталогу — либо через HTTP к клиенту (плохо), либо через общий сервис. Это аргумент за переезд в `packages/services/`.

[Математик]: Уточню технический момент. Если сервис переезжает в `packages/services/`, то зависимости: `@membrana/core` + возможно `@membrana/device-board` для типов `UserCase`, `UserCaseBlock` и т.п. Нужно проверить, есть ли циклическая зависимость. `device-board` (плагин) → `usercase-catalog-service` (читает каталог) — это OK. Но `usercase-catalog-service` → `device-board` (для типов) создаст цикл?

[Верстальщик]: С типами просто: пакет `@membrana/device-board` уже экспортирует `src/index.ts` все типы (`UserCase`, `UserCaseBlock` и т.д.). Если `usercase-catalog-service` нужны эти типы, он может импортировать из `@membrana/device-board` как из любого другого пакета. Цикла нет, потому что **плагин** (`device-board`) не импортирует из сервисов — только наоборот. Плагин может пользоваться результатом сервиса через пропсы/state.

[Teamlead]: Верно. Итак, вопрос (1) решается просто: если нужна вторая точка (background-media или другой модуль) → переезжаем в `packages/services/usercase-catalog-service/`. Если нет → остаётся. Предлагаю: **переезжаем сейчас**, это даст гибкость на Phase 3 и позже. Решение не требует рефактора плагина, только маршрутизация импорта в `apps/client/src/modules/device-board/`.

[Структурщик]: Со вторым вопросом. Валидаторы. Сейчас есть `verify-usercase-prerun.mjs` (скрипт). Вариант A: выделяем чистые функции в `@membrana/device-board/src/runtime/validators/` (типа `validateUserCaseStructure`, `validateBlockLinks`), скрипт их вызывает, плагин может вызывать при редактировании live. Вариант B: только скрипты, валидация — забота build-time и pre-run. Я голосую за **A** — функции в runtime. Причина: если пользователь в device-board редактирует сценарий (добавляет блок, меняет связь), он должен видеть ошибку live, не после запуска.

[Музыкант]: Поддерживаю A. Плюс: ошибки в конфигурации блоков (неверная частота, выходящие за пределы параметры) лучше ловить во время редактирования. Если это DSP-цепочка (вопрос Phase 4), user должен сразу видеть: «эта частота недопустима для этого фильтра». Без live-валидации будет разочарование.

[Математик]: Добавлю техническое условие. Валидаторы должны быть **чистыми функциями** (вход: структура UserCase, выход: список ошибок). Без побочных эффектов, без Web Audio, без DOM. Я их размещу в той же папке `runtime/validators/` и соберу экспорт в `src/index.ts`. Это позволит использовать их и в скриптах, и в runtime интерпретатора.

[Верстальщик]: Согласен. С UI стороны: если валидаторы возвращают список ошибок, я их покажу как inline-подсказки в device-board (типа, красная обводка блока + tooltip). Нужен контракт: ошибка должна содержать `blockId` или `pinId` и текст. Это сделано?

[Teamlead]: Нет, это часть work-item для Phase 3. Итак, вопрос (2) решение: **выделяем валидаторы в `@membrana/device-board/src/runtime/validators/`**, экспортируем как часть runtime-API. Скрипт `verify-usercase-prerun.mjs` будет вызывать их, плагин использует live. Definition of Done: unit-тесты на валидаторы, integration-тест скрипта, UI-покрытие в device-board модуле.

[Структурщик]: Третий вопрос — самый интересный. Конкурсная упаковка. `USERCASE_COMPETITION_LESSONS.md` описывает alpha/beta/gamma-сценарии. Вариант A: отдельный класс `CompetitionUserCase extends UserCase`, требует версионирования (v1, v2…). Вариант B: обычные UserCase, загруженные из фиксированной папки `packages/background-media/templates/competition/`. Я предлагаю **B + флаг**. Обычный UserCase, но с полем `meta.isCompetitionTemplate: true`. Это проще и не требует новой архитектуры.

[Музыкант]: Но есть важное уточнение. Конкурсный сценарий — это не только структура блоков, это ещё **ограничения**: например, нельзя удалять блоки, только менять параметры. Или таймауты на выполнение (чтобы никто не зависал). Если это просто флаг, где хранятся правила запуска?

[Математик]: Правильный вопрос. Предлагаю добавить в `UserCase.meta` поле `executionPolicy: 'free' | 'competition'`. При `competition`:
- Блоки не удаляются (readOnly).
- Timeout на выполнение (600 сек по умолчанию).
- Логи отправляются на сервер для верификации.

Это всё можно контролировать в runtime без отдельного класса.

[Верстальщик]: С UI: если `isCompetitionTemplate`, то кнопки удаления блоков скрывать, показывать счётчик времени в footer, добавить warning: «Это конкурсный сценарий, изменения будут учтены». Согласен с флагом + policy. Это чище, чем наследование класса.

[Teamlead]: Согласен. Вопрос (3) решение: **конкурсные сценарии — обычные UserCase с `meta.isCompetitionTemplate` и `executionPolicy`**. Шаблоны хранятся в `packages/background-media/templates/competition/` и загружаются через media-сервис. При загрузке в device-board плагин проверяет флаг и применяет restrictions в UI и runtime. Это позволяет добавлять новые конкурсные пакеты без смены архитектуры.

[Структурщик]: Уточним граф зависимостей на Phase 3:

| Модуль | Зависит от | Статус |
|--------|-----------|--------|
| `apps/client/src/modules/device-board/` | `@membrana/device-board` (плагин) + `@membrana/usercase-catalog-service` | ✅ OK (переезд A1) |
| `@membrana/usercase-catalog-service` | `@membrana/core` + `@membrana/device-board` (типы) | ✅ OK (новый пакет, A1) |
| `@membrana/device-board` (плагин) | runtime/validators → чистые функции | ✅ OK (A2) |
| `background-media` | templates/competition (JSON) | ✅ OK (A3) |

Структура соблюдается.

[Музыкант]: Замечу про Phase 3.A timeline. Если мы добавляем execution-policy и competition-restrictions, то device-board плагин должен получить апдейт на ревью Teamlead перед реализацией. Это означает, что вопрос (3) требует task в `docs/tasks/registry.json` с явным описанием restrictions.

[Математик]: Согласен. Добавлю: валидаторы (вопрос 2) и execution-policy (вопрос 3) — это разные work-item'ы. Валидаторы — Phase 3.A1 (validation layer). Конкурсная упаковка — Phase 3.A3 (execution policy + restrictions). Разработчик, который берёт A3, должен сначала выполнить A1 (зависимость).

[Верстальщик]: С UI-стороны: когда таски появятся в Linear, я буду ждать формального одобрения Teamlead на form-решение для каждого. Device-board уже большой, нужна осторожность с новыми состояниями (readOnly-блоки, timer, restrictions-badge).

[Teamlead]: Верно. Итоговое решение консилиума:

---

## Итоговое решение консилиума

| Вопрос | Решение | Work Item | Owner |
|--------|---------|-----------|-------|
| **(1) Статус user-case-catalog-service** | Переезжает в `packages/services/usercase-catalog-service/`. Зависимости: `@membrana/core` + `@membrana/device-board` (типы). **Нет цикла.** | Phase 3.A1 (archival+migration) | Структурщик |
| **(2) Валидаторы UserCase** | Выделяются в `@membrana/device-board/src/runtime/validators/` (чистые функции). Экспортируются в `src/index.ts`. Используются скриптом + плагином live. | Phase 3.A2 (validators + live-UI) | Математик + Верстальщик |
| **(3) Конкурсная упаковка** | Обычные UserCase с флагом `meta.isCompetitionTemplate` и `executionPolicy: 'competition'`. Шаблоны в `background-media/templates/competition/`. Restrictions (readOnly-блоки, timeout, логи) в runtime и UI. | Phase 3.A3 (competition-restrictions) | Музыкант + Верстальщик + Структурщик |

**Definition of Done:**

### Phase 3.A1: Миграция usercase-catalog-service
- [ ] Новый пакет `packages/services/usercase-catalog-service/` с `package.json`, `tsconfig.json`, `vite.config.ts`.
- [ ] Экспорт типов и функций через `src/index.ts`.
- [ ] Unit-тесты (загрузка каталога, кэширование).
- [ ] Обновлена маршрутизация импортов в `apps/client/src/modules/device-board/`.
- [ ] Документация в `SERVICES.md` (zoneDescription, dependencies).
- [ ] ✅ LGTM Vesnin.

### Phase 3.A2: Валидаторы + live-UI
- [ ] Папка `@membrana/device-board/src/runtime/validators/` с функциями: `validateUserCaseStructure`, `validateBlockLinks`, `validateBlockParameters` (для DSP-цепочек позже).
- [ ] Каждый валидатор возвращает `{ isValid: boolean; errors: Array<{ blockId?; pinId?; message }>; }`.
- [ ] Unit-тесты (валидация некорректных структур, граничные случаи).
- [ ] Integration-тест: `verify-usercase-prerun.mjs` вызывает валидаторы и выводит список ошибок.
- [ ] UI: inline-подсказки в device-board (красная обводка блока + tooltip с ошибкой).
- [ ] Контракт ошибок документирован в `DEVICE_BOARD_CONCEPT.md` §19 (Validation layer).
- [ ] ✅ LGTM Vesnin + Rodchenko (UI-покрытие).

### Phase 3.A3: Конкурсная упаковка (execution policy + restrictions)
- [ ] Поле `meta.executionPolicy: 'free' | 'competition'` добавлено в `UserCase` type.
- [ ] Шаблоны alpha/beta/gamma упакованы в `packages/background-media/templates/competition/` (JSON).
- [ ] Runtime: при запуске сценария с `executionPolicy: 'competition'` применяются:
  - Блоки readOnly (UI и runtime).
  - Timeout = 600 сек (configurable per template).
  - Логирование результатов на сервер (сохранение для верификации).
- [ ] Device-board UI: кнопки удаления блоков скрыты, счётчик времени в footer, warning-badge.
- [ ] Unit-тесты (enforcement timeout, readOnly-режим).
- [ ] Smoke-тест: запуск alpha-сценария, проверка timeout и логирования.
- [ ] Документация в `DEVICE_BOARD_CONCEPT.md` §20 (Competition mode).
- [ ] ✅ LGTM Vesnin + Kuryokhin (execution) + Rodchenko (UI).

**Зависимости между work-item'ами:**
- A2 (валидаторы) → A3 (должны использоваться при загрузке конкурсного шаблона).
- A1 (service) может идти параллельно с A2 и A3.

---

[Структурщик]: Спасибо за ясность. Я вношу в запись: **A1 требует обновления ARCHITECTURE.md §1a** (добавить `usercase-catalog-service` в примеры пакетов-сервисов). SERVICES.md обновляю я.

[Музыкант]: Запомнил timeline: A1 первой (миграция), затем A2 и A3 параллельно. Если в A3 понадобятся лучшие практики для timeout-обработки, проконсультируюсь с Динским про асинхронный runtime.

[Математик]: Да, поговорим про async-execution при необходимости. Но базовый timeout — это просто секундомер. Ничего сложного. Валидаторы (A2) я начну с сигнатур: входит структура, выходит список ошибок. Без побочных эффектов.

[Верстальщик]: Поняли. Буду ждать form-solution от Teamlead перед вёрсткой A2 и A3 UI. С readOnly-блоками нужно аккуратнее — они могут конфликтовать с drag-and-drop. Может потребоваться новое состояние в device-board-context.

[Teamlead]: ✅ **Консилиум принимает все три решения.** Создаю 3 work-item'а в `docs/tasks/registry.json`: A1 (usercase-catalog-service), A2 (validators), A3 (competition-restrictions). Начало Phase 3 — завтра 09:00 с A1 миграцией. A1 — владелец Структурщик (Ozhegov), сроки EOD. A2 — владелец Математик (Dynin), сроки +1 день, в параллель с A1. A3 — владелец Музыкант (Kuryokhin) + Верстальщик (Rodchenko), сроки +2 дня. Ревью LGTM по завершении. Документация (ARCHITECTURE, SERVICES, DEVICE_BOARD_CONCEPT) — параллельно с кодом. Все согласны?

[Структурщик]: Согласен. 👍

[Музыкант]: Согласен. 👍

[Математик]: Согласен. 👍

[Верстальщик]: Согласен. 👍

---

*Реплик в диалоге: 30; все пять участников высказались не менее одного раза. Консилиум завершён единогласным принятием решений.*
