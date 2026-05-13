# Визуальные и структурные соглашения: модули и плагины

Документ задаёт **обязательные** правила разметки и размещения настроек, чтобы интерфейс оставался единообразным после рефакторингов в `@membrana/agenda` и `apps/client`.

---

## 1. Каноническая оболочка модуля (agenda)

**Где живёт оболочка:** `packages/agenda/src/ui/core/ModuleRenderer.tsx` и `packages/agenda/src/ui/core/ModuleHeader.tsx`.

**Как устроено:**

- Корневая разметка рендера: колонка с отступами между блоками (`flex flex-col gap-6`).
- Сверху всегда рендерится **`ModuleHeader`** с `title={module.name}` и `description={module.description}` из метаданных модуля в store.
- Тело модуля рендерится **ниже** заголовка, внутри **`React.Suspense`** с запасным экраном «Загрузка модуля…».

**Чеклист для автора модуля:**

- [ ] Компонент модуля принимает `ModuleProps` из `packages/agenda/src/core/types.ts` и не пытается «подменить» глобальный заголовок приложения.
- [ ] **Не дублировать** крупный заголовок с именем модуля (`h1`/`h2` с тем же текстом, что в `module.name`), если модуль показывается через `ModuleRenderer`: заголовок уже выводит `ModuleHeader`.
- [ ] Внутри модуля допустимы подзаголовки секций, подписи к виджетам, статусы — но не второй «главный» титул модуля.
- [ ] Тяжёлый UI модуля оформляйте как **`React.lazy`** в регистрации модуля (см. комментарий к полю `Component` в `Module`), чтобы сработал `Suspense` в `ModuleRenderer`.

---

## 2. Внутренний «карточный» паттерн клиента (`card`)

**Назначение:** визуально отделить рабочую область модуля от фона дашборда и согласоваться с DaisyUI.

**Ориентир по коду:** например `apps/client/src/modules/microphone/MicrophoneModule.tsx` — обёртка вида:

- внешний контейнер: классы уровня `card bg-base-100 border border-base-200 shadow-sm rounded-box w-full`;
- внутри: `card-body` с адаптивными отступами (`p-4 md:p-6`) и вертикальным ритмом (`gap-4`).

**Чеклист:**

- [ ] Основное содержимое модуля — в одной (или нескольких согласованных) `card`, а не «сырой» блок на всю ширину без границы, если нет веской причины.
- [ ] Семантика DaisyUI (`badge`, `btn`, `toggle` и т.д.) — в духе существующих модулей; не смешивать произвольные цвета Tailwind там, где в проекте уже принята палитра `base-*` / `primary`.

---

## 3. Настройки плагинов: только сайдбар «Плагины»

**Поток данных UI:**

1. `apps/client/src/App.tsx` передаёт в `Dashboard` проп `renderPluginSidebarDetails`.
2. `packages/agenda/src/ui/layout/Dashboard.tsx` прокидывает его в `Sidebar`.
3. `packages/agenda/src/ui/panels/Sidebar.tsx` передаёт его в `PluginsList` как **`renderPluginDetails`** (имя пропа в списке — `renderPluginDetails`).
4. `packages/agenda/src/ui/core/PluginsList.tsx` для каждого плагина в раскрывающемся блоке **`<details>` («Настройки»)** вызывает `renderPluginDetails?.(args)`; если вернулось `null`/`undefined`, показывается запасной просмотр JSON конфига.

**Точка расширения в клиенте:** `apps/client/src/pluginSidebarDetails.tsx` — функция **`renderPluginSidebarDetails`**: по `args.pluginId` (и при необходимости `args.moduleId`) возвращайте JSX панели настроек или `null`, чтобы сработал fallback.

**Тип аргументов:** `PluginSidebarDetailsArgs` в `packages/agenda/src/core/types.ts` (`moduleId`, `pluginId`, `pluginName`, `config`).

**Чеклист:**

- [ ] Параметры плагина, которые пользователь меняет вручную (радиокнопки, слайдеры, пресеты), размещайте в **сайдбаре**, а не копируйте ту же панель в основное тело модуля.
- [ ] Дублирование в теле модуля допустимо только при **явном обосновании** (например, дублирование критичного статуса для режима без сайдбара на узком экране — и то по согласованию).
- [ ] Новый плагин с кастомными настройками: добавить ветку в `pluginSidebarDetails.tsx` и при необходимости вынести виджет в `apps/client/src/plugins/...`.

---

## 4. Шина микрофона и поздняя подписка (replay)

**Файл:** `apps/client/src/modules/microphone/microphoneStreamHub.ts`.

**Правило:** при подписке `subscribeMicrophoneStream(moduleId, listener)` слушатель **сразу** получает последнее опубликованное значение потока (в т.ч. `null`), если оно уже было — см. `lastStreamByModule` и комментарий в коде про replay.

**Чеклист для плагинов на поток:**

- [ ] Подписываться в `install()` плагина, отписываться в возвращаемом callback.
- [ ] Не предполагать, что первое событие придёт «только после следующего» `publishMicrophoneStream`: стартовое состояние может прийти из replay.

**Согласование с кодом agenda:** в `packages/agenda/src/core/store.ts` переключение активности плагина (`activatePlugin` / `deactivatePlugin` / `togglePlugin`) сейчас меняет только флаги в Zustand и **не** вызывает `plugin.install()` / teardown контракта плагина. Пункт про `install()` выше описывает **целевой** жизненный цикл для подписок на внешние хабы; до выравнивения store с этим контрактом подписку можно инициировать из другого места, где гарантированно вызывается `install()` (например при первой загрузке модуля), либо отдельно синхронизировать с `active` в UI.

---

## 5. Tailwind: `content` и монорепозиторий

**Файл:** `apps/client/tailwind.config.js`.

Классы из импортируемых пакетов (`@membrana/agenda`, виджеты визуализации и т.д.) попадают в финальный CSS **только если** пути к их `*.{ts,tsx}` указаны в массиве **`content`**.

**Сейчас в конфиге клиента сканируются в том числе:**

- `../../packages/agenda/src/**/*.{ts,tsx}`
- `../../packages/core/src/**/*.{ts,tsx}`
- `../../packages/device-board/src/**/*.{ts,tsx}`
- `../../packages/libs/audioDataViz/src/**/*.{ts,tsx}`

**Чеклист:**

- [ ] Добавили новый пакет с React-компонентами и классами Tailwind/DaisyUI — **добавьте путь** в `content` клиента (или в общий конфиг, если он унифицирован).
- [ ] После добавления пути пересоберите/перезапустите dev-сервер, чтобы JIT подхватил классы.

**Связанное:** список тем daisyUI в том же файле должен быть согласован с `ThemeSelector` и типом темы в провайдере (см. комментарии в `tailwind.config.js`).

---

## 6. Краткая карта файлов

| Область | Путь |
|--------|------|
| Оболочка и заголовок модуля | `packages/agenda/src/ui/core/ModuleRenderer.tsx`, `ModuleHeader.tsx` |
| Список плагинов и `<details>` настроек | `packages/agenda/src/ui/core/PluginsList.tsx` |
| Сайдбар и вкладки «Модули» / «Плагины» | `packages/agenda/src/ui/panels/Sidebar.tsx` |
| Сборка layout | `packages/agenda/src/ui/layout/Dashboard.tsx` |
| Клиент: мост настроек плагинов | `apps/client/src/pluginSidebarDetails.tsx`, `apps/client/src/App.tsx` |
| Типы пропов и сайдбара плагина | `packages/agenda/src/core/types.ts` |
| Tailwind content | `apps/client/tailwind.config.js` |
| Пример `card` в модуле | `apps/client/src/modules/microphone/MicrophoneModule.tsx` |
| Шина потока микрофона | `apps/client/src/modules/microphone/microphoneStreamHub.ts` |

---

## 7. Итоговый чеклист перед PR

- [ ] Нет дублирующего главного заголовка модуля при использовании `ModuleRenderer` / `ModuleHeader`.
- [ ] Основной контент модуля в `card` (или осознанно иначе, с кратким комментарием в PR).
- [ ] Настройки плагина — в `renderPluginSidebarDetails` / `pluginSidebarDetails.tsx`, без лишнего дубля в теле модуля.
- [ ] Новые пакеты с UI учтены в `tailwind.config.js` → `content`.
- [ ] Подписки на разделяемые потоки учитывают replay (где применимо).
