# Промпт: редактор пользовательских шаблонов trends-fft

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **L**.
> Ожидаемый артефакт: **1 PR** — пользовательские шаблоны сцен в плагине `trends-fft-analyzer`.
> Реестр: `id` = `trends-fft-template-editor` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Плагин `trends-fft-analyzer` (#56) классифицирует акустические сцены по **системным** шаблонам из `@membrana/trends-detector-service`. В v1 редактор и persist пользовательских шаблонов намеренно не входили в scope.

Референс UX и полей — демо `apps/demos/trendsFFT/` (`SoundTemplateEditor`, `patterns.store`, анализ WAV). **Не копировать** демо-код напрямую: перенести идеи в client-плагин с типами сервиса и DaisyUI.

**Зависимость:** `trends-fft-microphone-plugin` (archived).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`TRENDS_FFT_MICROPHONE_PLUGIN_PROMPT.md`](./TRENDS_FFT_MICROPHONE_PLUGIN_PROMPT.md) | Базовый плагин, out of scope редактора |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы client / services |
| [`DESIGN.md`](../DESIGN.md) | UI |

**GitHub Issue:** [#57](https://github.com/officefish/Membrana/issues/57).

---

## Промпт целиком (для вставки агенту)

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план. Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md).

---

### Что построить

1. **CRUD пользовательских шаблонов** `PatternTemplate` (ключ, имя, иконка, цвет, описание, spectral thresholds, temporal patterns).
2. **Persist** в `localStorage` (или существующий механизм agenda/store — по конвенции client).
3. **Редактор** во вкладке «Шаблоны» плагина: создание, правка, удаление; опционально **создание из WAV** (offline FFT-анализ окна → предзаполнение порогов).
4. **Классификация** использует системные + включённые пользовательские шаблоны (`classifyTrends` без изменения контракта, если возможно).
5. Системные шаблоны — read-only; пользовательские — редактируемые.

---

### Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Math / types | `@membrana/trends-detector-service` | `PatternTemplate`, `classifyTrends` — без UI |
| Store | `apps/client/src/plugins/trends-fft-analyzer/` | user templates persist |
| UI | `TrendsTemplateList`, новый `SoundTemplateEditor` | форма, валидация |
| Анализ WAV | reuse `AudioFrameFeed` / offline path | предзаполнение порогов |

**Запрещено:**

- Второй AudioContext в плагине
- Копипаста всего демо `apps/demos/trendsFFT/` без адаптации

---

### Definition of Done

- [ ] Пользовательский шаблон создаётся, сохраняется, участвует в классификации
- [ ] Системные шаблоны нельзя удалить/перезаписать
- [ ] Persist переживает перезагрузку страницы
- [ ] Unit-тесты store/merge templates (минимум)
- [ ] `yarn workspace @membrana/client` typecheck + test green
- [ ] LGTM Teamlead

---

### Out of scope

- Режим `sample-library` для trends-fft
- ML-классификатор
- Синхронизация шаблонов с backend

---

### Порядок работы ролей

1. **Teamlead** — scope, Issue.
2. **Структурщик** — store + граница с service types.
3. **Математик** — валидация порогов, merge с system templates.
4. **Верстальщик** — форма редактора, a11y.

---

## Заметки для человека-постановщика

- Issue: wish/improvement, label `package:client`.
- Референс: `apps/demos/trendsFFT/components/SoundTemplateEditor.tsx` (не коммитить демо в prod paths).
