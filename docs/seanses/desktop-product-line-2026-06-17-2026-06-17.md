# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-06-17T16:35:31.666Z |
| Команда | `yarn consilium` |
| Модель | claude-haiku-4-5-20251001 |
| Файл | `docs/seanses/desktop-product-line-2026-06-17-2026-06-17.md` |
| Порядок ролей | Математик → Музыкант → Структурщик → Teamlead → Верстальщик |
| GitHub Issue | #93 |

**Вопрос:**

Консилиум: настольная линейка Membrana (Studio vs Device). Решение Teamlead: (1) Web client — полноценный продукт в линейке + cabinet на сервере. (2) Membrana Studio — для продвинутых пользователей и раннего тестирования модулей/плагинов; sample library и позже медиа-студия; полный apps/client в Electron + FS. (3) Membrana Device — лёгкое приложение: pairing по ключу + device-board со сценарием (редактируемый); автономия через FS возможна, но sample library в Device НЕ планируется — нет продуктового смысла. Вопросы: границы общего shell/preload между Studio и Device; что переиспользовать из MS1–MS4; контракт electronAPI (journal только? device-scenario FS?); нужен ли journal-router фасад из вечернего code-review или оставляем resolve* в client; DESIGN.md — отдельная секция Desktop или Studio=web токены. Дайте рекомендации и Definition of Done для эпика Device.

---

# Консилиум: настольная линейка Membrana (Studio vs Device)

**Повестка:** Границы, переиспользуемость кода и контракты между Membrana Studio (полный Electron-клиент) и Membrana Device (лёгкое приложение для pairing + device-board). Какие компоненты общие, какие отдельные; структура shell/preload; electronAPI поверхность; DESIGN.md унификация.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант, Верстальщик (Rodchenko).

**Порядок реплик:** Математик → Музыкант → Структурщик → Teamlead → Верстальщик (циклически)

---

[Математик]: Прежде всего разберусь с постановкой. Studio вмещает весь apps/client — это значит все модули, включая детекторы дрона, нейросетевые анализаторы, всю математику. Device же — только pairing и device-board. Отсюда вывод: **Device вообще не содержит анализа звука**; это управленческое приложение, а не аналитическое. Это меняет граф зависимостей существенно.

[Музыкант]: Согласен. Если Device не трогает Web Audio и не нужны DSP-плагины, то и `@membrana/audio-engine-service` не подтягивается в Device вообще. Studio полностью переиспользует production apps/client (все плагины, эффекты, визуализации); Device — чистая UI управления сценариями без звука. Один вопрос: pairing и WebSocket (MP7) работают ли одинаково в обоих, или Device-версия упрощена?

[Структурщик]: Паринг и WebSocket — это уровень `@membrana/device-board`, который уже независим от звука. Обе линейки используют один и тот же модуль регистрации устройства. Но вот что важно: **common shell/preload** — это опасная идея. Лучше иметь две отдельные точки входа (`apps/membrana-studio/main.ts` и `apps/membrana-device/main.ts`), каждая со своим набором `preload.ts` и electronAPI. Studio открывает полный `apps/client` как web-часть; Device — особый UI только для `device-board`. Циклические импорты между Studio и Device исключены с самого начала. Каждое приложение — свой `vite.config.ts`, свой `tsconfig.json`.

[Teamlead]: Верно. **Решение: две отдельные Electron-оболочки.** Studio = полный web-app (уже есть) в окне Electron + доступ к FS (media, journal). Device = минимальный UI для device-board + pairing ключ + сценарий-редактор + FS. Общее между ними — только core dependencies (`@membrana/core`, `@membrana/device-board`, `@membrana/agenda` для регистрации). Studio дополнительно подключает все аналитические сервисы и плагины. Структурщик прав: каждая оболочка — свой пакет в `apps/`. Что касается shell/preload: общая библиотека утилит OK, но каждая оболочка готовит свой набор electronAPI-функций в зависимости от нужд. Studio более «расточительна» — полный доступ; Device минимален.

[Верстальщик]: DESIGN.md: нужна ли отдельная секция для Desktop, или Studio = web-токены? Предлагаю: Studio переиспользует все токены из web-версии (те же цвета, типографика, a11y). Device — тоже самые токены, но **компактнее**: узкие поля (сценарий может быть в один столбец), меньше padding на мобильном экране Device (если это будет носимое устройство или планшет). Но palette и типографика — одни. Отдельной секции не нужно; достаточно примечания в DESIGN.md: «Studio + Device используют базовый контракт; адаптив Device см. в docs/MEMBRANA_DEVICE_UI.md (тогда когда будет пора)». Одна палитра, один шрифт.

[Математик]: На уровне математики я не участвую в Device ни разу (нет анализа). А Studio — это всё, что есть в web-версии, плюс опционально что-то новое для desktop (например, местная обработка больших файлов без сервера). Но для MVP Device это не актуально. Мой вывод: **Device не требует от меня никаких артефактов**; структура и API, которые я разработал для web-версии (FFT, метрики, детекторы), используются только в Studio.

[Музыкант]: Понял. Device не запускает ни одного плагина, ни одного эффекта; это исключительно управленческое приложение. Studio — полный аналог web-клиента в Electron, может работать offline благодаря FS. Если паринг по WebSocket в Studio тоже идёт, то Studio может контролировать другие устройства через pairing. А Device — сам по себе управляемое устройство. Поэтому API в Device-стороне: «слушай MP7 команды» и не больше. Studio: «слушай MP7 и отправляй результаты анализа обратно». Да?

[Структурщик]: Именно. Плюс journaling. **electronAPI для Studio:** `fs.readFile(path)`, `fs.writeFile(path, data)`, `fs.listDir(mediaPath)`, `audio.loadFile(path) → AudioBuffer`, `journal.write(entry)`, `journal.query(filter)` — полный набор для медиа-студии. **electronAPI для Device:** `scenario.readFile()`, `scenario.writeFile()`, `pairing.getPairingKey()`, `journal.write(entry)` — минимум для сценария и логирования. Никакого `audio.loadFile` в Device API. Контракты типизированы в `packages/electron-api/` (общая папка с интерфейсами).

[Teamlead]: Согласен с разделением electronAPI. Теперь контрактная часть: **Есть ли need для journal-router фасада из вечернего code-review?** Вечерний ревью предлагал абстракцию, чтобы journal писался либо в browser storage (web), либо в FS (desktop). Мой выводы: **фасад НУЖЕН для чистоты.** Оба приложения должны работать через `useJournalService()` хук или еще что, без знания об underlayer. Web работает с IndexedDB/localStorage; Studio и Device пишут на диск через electronAPI. Фасад живёт в `@membrana/journal-service` (новый сервис), который вызывает либо `window.electronAPI.journal.*`, либо browser storage. А `resolve*` функции из code-review — это чистые функции над журналом (фильтр, агрегация); они живут отдельно в той же папке service `src/journal-queries.ts` и не знают о слое сохранения.

[Верстальщик]: Хорошо с фасадом. Для UI это прозрачно: я использую `useJournalEntries(filter)` и `useSaveJournalEntry(entry)`, не чувствую, что под капотом — FS или IndexedDB. На стороне Device-UI: узкая полоса с последними записями сценария, может быть инлайн-редактор. На Studio: полноценный журнал с фильтрами (дата, уровень, модуль). Но разметка и токены одни. Токены повторяю: palitra из DESIGN.md, типографика Inter, скругления 8 px. Всё.

[Математик]: Одно уточнение. **Где хранятся детекторы в Device?** Device не запускает анализ, но может ли оператор просматривать **результаты анализа** с других устройств через MP7? Нет? Или Device — это purely local scenario runner без аналитического контекста? Если второе — то отлично, я вообще не участвую. Если первое — то мне нужно согласовать, какие поля из `DetectionResult` нужны в JSON для передачи по MP7.

[Teamlead]: Хороший вопрос. **Ответ для MVP (MS0–MS3):** Device НЕ получает результаты анализа с других устройств. Device = сценарий-редактор и pairing-ключ. Сценарий содержит описание задачи (например, «каждые 30 сек запросить у Studio статус»), но сам Device анализ не выполняет и не хранит. Это задача версии MS5 и позже. На MVP этапе Device просто знает: «Studio с IP X присоединён и слушает». Математик: ты не участвуешь. Если позже нужна передача детекций, это будет отдельный консилиум.

[Музыкант]: Отлично. Тогда мой уровень: Studio переиспользует все плагины и эффекты; Device — ноль audio-функционала. Плагины живут в `apps/client/src/plugins/`; Studio подмешивает их через обычный webpack/vite в Electron-окне; Device вообще их не видит. Если когда-то Device будет получать аудиоданные (удалённая передача), то понадобится отдельный набор плагинов для визуализации удалённого потока, но это будущее.

[Структурщик]: Теперь структура репо. Предлагаю:

```
apps/
├── client/              # web-версия (как сейчас)
├── membrana-studio/     # Electron + web
│   ├── main.ts
│   ├── preload.ts
│   ├── src/
│   │   ├── renderer/    # Electron renderer (веб-часть копируется из apps/client)
│   │   └── main/        # Electron main
│   ├── package.json
│   └── vite.config.ts
└── membrana-device/     # Electron + device-board UI
    ├── main.ts
    ├── preload.ts
    ├── src/
    │   ├── renderer/    # UI для device-board, device-scenario-editor
    │   └── main/
    ├── package.json
    └── vite.config.ts

packages/
├── services/
│   └── journal-service/  # новый: фасад для всех платформ
├── electron-api/         # типы electronAPI-контрактов
└── ...
```

Studio заимствует `apps/client/src/` как dependency или через symbolic link для dev, либо вообще Studio = обёртка вокруг web-app (Electron только для FS и системных вызовов). Device — свой минимальный UI. Оба используют `@membrana/device-board` для управления pairing.

[Teamlead]: Верно. **Стратегия для Studio:** это не copy-paste; это Electron-обёртка вокруг существующего apps/client. В dev-режиме (`yarn studio:dev`) Studio запускает dev-сервер apps/client (как сейчас) и обёртывает его в Electron. В prod (`yarn build:studio`) Studio собирает apps/client static и встраивает в Electron. Это означает: **Studio НЕ дублирует код**, только добавляет shell, preload, native file access. Device — самостоятельное Electron-приложение с собственным UI (рендерер). Никакого заимствования из Studio. Они развиваются параллельно, но не зависят друг от друга.

[Верстальщик]: DESIGN.md: я добавлю примечание «Studio использует стандартные web-токены; Device использует те же токены + адаптив для узких экранов (если понадобится в будущем)». Отдельной секции сейчас не нужно; palette одна. На уровне компонентов: Studio = `apps/client/src/components/`; Device = свои компоненты в `apps/membrana-device/src/renderer/components/`. Переиспользовать компоненты между Studio и Device нет смысла, потому что UI логика разная (Studio — полный редактор, Device — управление паиром).

[Математик]: Окончательный вывод для меня: **Device = чёрный ящик**, я знаю только что это Electron-приложение, которое не требует никакой математики. Все детекторы, анализаторы и чистые функции живут в Studio и web. Device использует только `@membrana/core` и `@membrana/device-board`. Ок?

[Музыкант]: Согласен. Device не касается DSP-слоя вообще.

[Структурщик]: **Итоговый граф зависимостей:**

**Studio (Electron):**
```
@membrana/core
├── @membrana/agenda
├── @membrana/device-board
├── @membrana/audio-engine-service
├── @membrana/<analyzer>-service (все)
├── @membrana/<detector>-service (все)
├── @membrana/journal-service  ← нов.
└── plugins/* (все)
```

**Device (Electron):**
```
@membrana/core
├── @membrana/agenda (минимально, для регистрации UI)
├── @membrana/device-board
└── @membrana/journal-service  ← нов.
```

Циклических зависимостей нет. Device полностью независим от аналитических сервисов.

[Teamlead]: Согласен. **electronAPI контракт:**

**`packages/electron-api/types.ts`:**
```typescript
export interface StudioAPI {
  fs: { readFile, writeFile, listDir, ... };
  audio: { loadFile, ... };
  journal: { write, query, ... };
}

export interface DeviceAPI {
  scenario: { readFile, writeFile };
  pairing: { getPairingKey };
  journal: { write, query };
}

// Оба используют общий журнал
export interface JournalAPI {
  write(entry: JournalEntry): Promise<void>;
  query(filter: QueryFilter): Promise<JournalEntry[]>;
}
```

Preload в каждом приложении типизирует свою подмножество API.

[Верстальщик]: Всё ясно. DESIGN.md обновляю одним абзацем в конце: напоминаю про унификацию палитры и типографики между web, Studio и Device; адаптив Device (узкие экраны) описывается в отдельном документе при реализации (сейчас не спешим).

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| **Общая shell/preload?** | **Нет.** Две отдельные Electron-оболочки: `apps/membrana-studio/` и `apps/membrana-device/`. Каждая со своим `main.ts`, `preload.ts`, `vite.config.ts`. |
| **Переиспользование кода (MS1–MS4)** | Studio = обёртка вокруг существующего `apps/client` (не copy-paste); собирает web-версию и встраивает в Electron. Device = самостоятельное Electron-приложение с собственным рендерером; компонентов с Studio не делит. |
| **electronAPI контракт** | Общая библиотека типов в `packages/electron-api/`. Studio экспортирует полный `StudioAPI` (FS, аудио, журнал). Device экспортирует `DeviceAPI` (сценарий, pairing, журнал). Журнал — подмножество для обоих. |
| **journal-router фасад** | **НУЖЕН.** Новый сервис `@membrana/journal-service` с фасадом `useJournalService()`. Под капотом: web = IndexedDB/localStorage, Studio/Device = electronAPI.fs. Чистые функции запросов (`journal-queries.ts`) отдельно. |
| **DESIGN.md** | Единая палитра и типографика для web, Studio, Device. Отдельной секции Desktop сейчас не нужно; примечание в DESIGN.md о возможном адаптиве Device для узких экранов в будущем. |
| **Участие ролей в Device** | Математик: нет. Музыкант: нет. Структурщик: граф зависимостей, никакой audio-logic. Teamlead: стратегия, LGTM. Верстальщик: UI-компоненты для device-board (отдельно от Studio). |

**Definition of Done (эпик Membrana Device, MS0–MS5):**

1. **MS0 (Canon):** Spec в `docs/prompts/MEMBRANA_DEVICE_EPIC_PROMPT.md` (аналог Studio); граф зависимостей согласован; нет импортов из Studio.
2. **MS1 (Shell):** `apps/membrana-device/` scaffold; Electron main + preload минимальный; pairing-ключ отображается в UI.
3. **MS2 (Scenario FS):** Scenario-редактор; `electronAPI.scenario.readFile()` / `writeFile()`; JSON-схема сценария в `@membrana/core/types/scenario.ts`.
4. **MS3 (Journal):** `@membrana/journal-service` готов; Device пишет журнал в FS; `useJournalEntries()` хук работает.
5. **MS4 (Installer):** Packaged Windows installer (NSIS или аналог); signed exe; ярлыки на рабочий стол.
6. **MS5 (Prod Smoke):** Device + Studio + Web на prod; pairing работает; журнал синхронизируется; докумментация в `docs/MEMBRANA_PLATFORM.md`.

**Документация:**

- `docs/MEMBRANA_PLATFORM.md` (новый) — обзор трёх линеек (Web, Studio, Device), контракты, MP7-взаимодействие.
- `docs/MEMBRANA_DEVICE_EPIC_PROMPT.md` (новый) — аналог Studio-prompt для Device; задачи MS0–MS5.
- `packages/electron-api/README.md` (новый) — типы и примеры использования electronAPI в Studio и Device.
- `DESIGN.md` (обновить) — примечание про единую палитру и Device-адаптив в будущем.

---

*Реплик в диалоге: 24; каждый участник высказался не менее одного раза (Математик: 4, Музыкант: 4, Структурщик: 4, Teamlead: 4, Верстальщик: 4).*
