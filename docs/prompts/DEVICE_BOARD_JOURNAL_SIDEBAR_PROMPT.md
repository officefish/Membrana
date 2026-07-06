# Промпт: вкладка «Журнал» и ресайз правого сайдбара device-board

> **Task-промпт для агента-разработчика** (Claude Code / Cursor).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — вкладки «Узлы | Журнал» в правом сайдбаре доски + drag-ресайз ширины.
> Реестр: `id` = `device-board-journal-sidebar` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

В режиме захвата устройства (запущенные лупы, server-first capture v2) оператор работает
в device-board и сейчас видит в правом сайдбаре только метаданные выбранного узла
(runtime inspection портов). Диагностика хода лупов требует консоли браузера или
`Копировать/Скачать` трассу из шапки — неудобно в поле.

Уже есть: in-memory ring buffer scenario-трассы на клиенте
(`apps/client/src/modules/device-board/scenarioTraceBuffer.ts`, 10k строк, подписка),
прокинутый в `ScenarioRuntimeHost` (count/copy/download/clear/subscribe) и в
graph-контекст (`scenarioTraceLineCount`). Не хватает доступа к самим строкам из UI
и места для их отображения.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы модулей |
| [`DESIGN.md`](../DESIGN.md) | UI-канон |
| `.cursor/skills/membrana-client-logs-parsing/SKILL.md` | Формат строк трассы (`[INFO] message {ctx}`) |
| `.cursor/skills/membrana-device-board-edit/SKILL.md` | Правила правок device-board |

**GitHub Issue:** — (по практике day-sprint: реестр + промпт, без Issue).

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead).
Перед кодом — краткий план (1–2 абзаца + список файлов). Соблюдай
[`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить (продуктовое описание)

1. **Две вкладки в правом сайдбаре доски** — «Узлы» (текущий инспектор/палитра/runtime-inspection,
   без изменений поведения) и «Журнал» (живой хвост scenario-трассы). Переключение доступно
   всегда; главный сценарий — во время работы лупов оператор переключается между метаданными
   узлов и журналом, не покидая борд.
2. **Вкладка «Журнал»**: живой хвост буфера трассы (follow-tail: автоскролл к низу, отключается
   при ручном скролле вверх, включается при возврате к низу); счётчик строк; кнопки
   Копировать / Скачать / Очистить (реиспользуют существующие host-функции); в DOM — только
   хвост (последние ~500 строк), полный буфер — через копирование/скачивание; пустое состояние
   с подсказкой.
3. **Ресайз ширины сайдбара**: drag-ручка на левой кромке; минимум **240px** (совсем сужать
   нельзя), максимум **50% ширины экрана**; двойной клик по ручке — сброс к дефолтной ширине;
   выбранная ширина переживает перезагрузку (localStorage). Свёрнутое состояние (`w-10`)
   не затрагивается.

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Буфер трассы | `apps/client/.../scenarioTraceBuffer.ts` | `getScenarioTraceLines(): readonly string[]` — кэшированный снапшот (identity меняется только при мутации; контракт `useSyncExternalStore`) |
| Host-контракт | `packages/device-board/src/runtime/host.ts` | опциональный `getScenarioTraceLines?` рядом с существующими trace-методами |
| Клиентский host | `apps/client/.../createScenarioRuntimeHost.ts` | прокинуть функцию из буфера |
| Graph-контекст | `packages/device-board/src/context/device-board-graph-context.tsx` | стабильные `getScenarioTraceLines` / `subscribeScenarioTrace` / `clearScenarioTrace` (useCallback от `runtimeHost`; пустой host → стабильный `EMPTY_TRACE_LINES`) |
| UI журнал | `packages/device-board/src/components/board-journal-panel.tsx` | подписка через `useSyncExternalStore` **внутри панели** — строки не проходят через state контекста |
| UI сайдбар | `packages/device-board/src/components/board-right-sidebar.tsx` | таб-бар, ветка журнала, drag-ресайз |
| Логика ресайза | `packages/device-board/src/components/right-sidebar-resize.ts` | pure: clamp ширины, парсинг localStorage — покрыто unit-тестами |
| Shell | `packages/device-board/src/components/device-board-shell.tsx` | прокинуть новые props из graph-контекста |

**Запрещено:**

- Класть строки журнала в state graph-контекста (ре-рендер всего борда на каждую строку).
- Импортировать клиентский буфер в `packages/device-board` напрямую (только через host-контракт).
- Менять формат строк трассы (`[INFO] message {ctx}` — контракт `yarn logs:parse`).
- Трогать левый сайдбар и логику runtime-inspection.

### Визуальный дизайн

- Таб-бар DaisyUI (`tabs tabs-boxed tabs-xs`) в шапке сайдбара рядом с кнопкой сворачивания;
  на вкладке «Журнал» — badge с числом строк.
- Журнал: `font-mono text-[11px]`, перенос длинных строк (`break-all`), фон `bg-base-200/30`.
- Ручка ресайза: 1.5px-зона `cursor-col-resize` на левой кромке, подсветка `primary` на hover/drag,
  `role="separator"` + aria-label (a11y).

### Тесты

| Область | Минимум |
|---------|---------|
| `right-sidebar-resize.ts` | clamp (min / max 50% / узкий viewport / округление), парсинг storage (мусор → null) |
| `scenarioTraceBuffer.ts` | стабильность снапшота между мутациями, инвалидация на append/clear |
| Регресс | существующие тесты device-board и client зелёные |

### Definition of Done

- [ ] Во время запущенного сценария переключение «Узлы ↔ Журнал» работает; журнал живой (follow-tail).
- [ ] После остановки сценария журнал показывает трассу последнего запуска до следующего старта.
- [ ] Копировать / Скачать / Очистить работают из вкладки.
- [ ] Ресайз: не уже 240px, не шире 50vw, переживает перезагрузку, двойной клик сбрасывает.
- [ ] Свёрнутый сайдбар и режим без runtime-host (studio/демо) не ломаются (журнал пуст, не падает).
- [ ] Unit-тесты выше зелёные; `yarn turbo run lint typecheck test --filter=@membrana/device-board --filter=@membrana/client` — зелёный.
- [ ] LGTM Teamlead (closure review).

### Out of scope

- Фильтрация/поиск по журналу, уровни логов, виртуализация списка.
- Персистентность журнала между перезагрузками (буфер in-memory — как есть).
- Ресайз левого сайдбара.
- Изменение состава событий трассы (что логируется — не трогаем).

### Порядок работы ролей

1. **Teamlead** — план, контроль границ host-контракта.
2. **Структурщик** — прокидка через host/контекст без утечки клиентских импортов в пакет.
3. **Верстальщик** — таб-бар, панель журнала, ручка ресайза, a11y, пустые состояния.
4. **Математик** — pure-логика clamp + тесты.
5. **Музыкант** — smoke в runtime с микрофоном (лупы пишут в журнал, UI не лагает).

---

## Заметки для человека-постановщика

1. Запись в `docs/tasks/registry.json` (`status: active`, id `device-board-journal-sidebar`).
2. После merge: `yarn task:archive device-board-journal-sidebar --notes "PR #N, …"`.

### Проверка после PR

```bash
yarn turbo run lint typecheck test --filter=@membrana/device-board --filter=@membrana/client
# вручную: запустить сценарий в device-board, вкладка «Журнал», ресайз до половины экрана и до минимума
```

---

## Связь с дорожной картой

- Удобство оператора в режиме захвата (server-first capture v2) — поддержка полевой
  диагностики лупов без DevTools; смежно с `membrana-client-logs-parsing` (тот же буфер).
