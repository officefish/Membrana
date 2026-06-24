# Промпт: редактор пользовательских шаблонов trends-fft

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **L**.
> Ожидаемый артефакт: **1 PR** — пользовательские шаблоны сцен в плагине `trends-fft-analyzer` + расширение scoring при необходимости.
> Реестр: `id` = `trends-fft-template-editor` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Плагин `trends-fft-analyzer` (#56, archived) классифицирует акустические сцены по **системным** шаблонам из `@membrana/trends-detector-service`. Пользовательские шаблоны и редактор — follow-up (#57).

Референс UX: `apps/client/src/plugins/trends-fft-analyzer/components/` (`TrendsTemplateEditor`, `TrendsTemplateList`, `userTemplatesStore`).

**Зависимость:** `trends-fft-microphone-plugin` (archived).

**GitHub Issue:** [#57](https://github.com/officefish/Membrana/issues/57).

**Консилиум команды:** см. раздел [«Консилиум (2026-06-11)»](#консилиум-2026-06-11) — уточнения после постановки заказчиком.

---

## Промпт целиком (для вставки агенту)

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план. Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md).

---

### Что построить (продукт)

1. **CRUD пользовательских шаблонов** во вкладке «Шаблоны» плагина `trends-fft-analyzer`.
2. **Persist** (localStorage или store плагина); ключи пользовательских шаблонов с префиксом `user:` / `USER_`.
3. **Системные шаблоны** — read-only, можно копировать в пользовательский как стартовую точку.
4. **Классификация** — системные + включённые пользовательские (`classifyTrends`).
5. **Редактор** — форма с **тремя вкладками** (см. ниже); валидация min ≤ max, подсказки единиц.
6. **Опционально (stretch):** предзаполнение из WAV или из последнего цикла анализа.

---

### Редактор шаблонов — вкладки и поля

Контракт данных — `PatternTemplate` + `TemporalPatternSpec` в `@membrana/trends-detector-service`, с **одним расширением** для спектра (см. консилиум).

#### Мета (шапка формы, все вкладки)

| Поле | Тип | Примечание |
|------|-----|------------|
| `name` | string | Отображаемое имя |
| `icon` | string | Emoji или короткий символ |
| `color` | string | HEX |
| `description` | string | Краткое описание сцены |

---

#### Вкладка 1 — «Спектр»

Задаёт `thresholds` и долю попадающих тактов.

| Поле UI | Поле в модели | Тип | Ограничения / единицы |
|---------|---------------|-----|------------------------|
| Спектральный центр, мин | `thresholds.centroid.min` | number | Hz, ≥ 0 |
| Спектральный центр, макс | `thresholds.centroid.max` | number | Hz, > min |
| Спектральный поток, мин | `thresholds.flux.min` | number | безразмерный, ≥ 0 |
| Спектральный поток, макс | `thresholds.flux.max` | number | > min |
| Громкость RMS, мин | `thresholds.rms.min` | number | ≥ 0 |
| Громкость RMS, макс | `thresholds.rms.max` | number | > min |
| **Доля тактов в диапазоне** | `thresholds.frameHitRatio` | `{ min, max }` | **Доля 0…1; UI — слайдер/число 50–80 %** |

**Семантика «доля тактов в диапазоне»:** при классификации считается доля замеров окна, у которых **одновременно** `centroid`, `flux` и `rms` попадают в заданные min–max. Шаблон ожидает, что эта доля лежит в `[frameHitRatio.min, frameHitRatio.max]`. По умолчанию при создании шаблона: `{ min: 0.5, max: 0.8 }` (50–80 %). UI не даёт выйти за 50–80 % без явного «расширенного» режима (опционально).

**Расширение сервиса (обязательно в этом PR):**

```typescript
// packages/services/trends-detector/src/types.ts
thresholds: {
  readonly centroid: Bounds;
  readonly flux: Bounds;
  readonly rms: Bounds;
  readonly frameHitRatio?: Bounds; // default { min: 0.5, max: 0.8 } при отсутствии
};
```

Обновить `scoreSpectral` / `buildTemplateMatchBreakdown`: учитывать hit-ratio (вес согласовать с математиком; стартово ~30 % вклада в spectral score, остальное — membership по средним). Unit-тесты на hit-ratio.

---

#### Вкладка 2 — «Временные»

Категориальные поля — **мультивыбор** (чипы / checkbox-group). Значения должны совпадать с тем, что выдаёт `computeTemporalFeatures` (см. `temporalFeatures.ts`).

| Поле UI | Поле в модели | Допустимые значения (multi) |
|---------|---------------|----------------------------|
| Тренд громкости | `temporalPatterns.volumeTrend` | `stable`, `increasing`, `decreasing`, `oscillating` |
| Тренд частоты | `temporalPatterns.frequencyTrend` | то же |
| Долгосрочная стабильность | `temporalPatterns.longTermStability` | `veryLow`, `low`, `medium`, `high`, `veryHigh` |
| Периодичность | `temporalPatterns.periodicity` | `none`, `irregular`, `semiRegular`, `regular` |
| Форма огибающей | `temporalPatterns.envelopeShape` | `impulsive`, `attackDecay`, `sustained`, `pluck`, `complex` |

Пустой мультивыбор = поле не участвует в scoring (как сейчас для отсутствующих spec). Минимум один тренд (громкость или частота) рекомендуется для осмысленного шаблона — валидация мягкая (warning), не блокер.

---

#### Вкладка 3 — «Расширенные»

Числовые диапазоны min–max → `Bounds` в `temporalPatterns`.

| Поле UI | Поле в модели | Единицы |
|---------|---------------|---------|
| Отклонение спектрального центра (σ) | `centroidStd` | Hz |
| Отклонение спектрального потока (σ) | `fluxStd` | безразм. |
| Отклонение громкости (σ) | `rmsStd` | RMS |
| Коэффициент активности | `activityRatio` | 0…1 (UI может показывать %) |
| Средняя длительность тишины | `avgSilenceDuration` | **секунды** (в модели — сек, как в `TemporalFeatures`) |
| Средняя длительность звука (всплеск) | `avgBurstDuration` | **секунды** |
| Частотные скачки: включены | `frequencyJumps.enabled` | boolean |
| Мин. число скачков | `frequencyJumps.minJumpsRequired` | int ≥ 0 |
| Плотность скачков, макс | `frequencyJumps.densityPerSecond.max` | 1/с |

**v1.1 (не блокер DoD):** `peakToAverageRatio` — оставить в системных шаблонах; в редакторе пользователя можно скрыть до запроса.

---

### Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Types + scoring | `packages/services/trends-detector/` | `frameHitRatio`, тесты scoring |
| Store | `apps/client/src/plugins/trends-fft-analyzer/` | persist, merge с `SYSTEM_TEMPLATES` |
| UI | `TrendsTemplateEditor.tsx` (новый), доработка `TrendsTemplateList` | 3 вкладки, CRUD |
| Интеграция | `trendsFftAnalyzerPlugin.ts` | `resolveEnabledTemplates` + user templates |

**Запрещено:** второй AudioContext; прямые импорты между плагинами.

---

### Визуальный дизайн

- Вкладки редактора: тот же паттерн, что `TrendsCollapsibleSection` / tabs в `TrendsFftLabView`.
- Список шаблонов: системные (lock icon) + пользовательские (edit/delete).
- Кнопки: «Создать», «Копировать из системного», «Сохранить», «Отмена».
- a11y: `aria-selected` на вкладках, labels на числовых полях.

---

### Тесты

| Область | Минимум |
|---------|---------|
| Service | hit-ratio scoring, defaults для legacy templates без `frameHitRatio` |
| Store | serialize/deserialize, merge keys, не затирать system |
| UI | smoke: render editor, save draft → persist mock |

---

### Definition of Done

- [ ] Редактор с тремя вкладками и всеми полями из таблиц выше
- [ ] `frameHitRatio` в types + scoring + breakdown + тесты
- [ ] Пользовательский шаблон сохраняется и участвует в `classifyTrends`
- [ ] Системные шаблоны не редактируются и не удаляются
- [ ] Доля тактов в UI ограничена 50–80 % (или с явным advanced override)
- [ ] `yarn workspace @membrana/trends-detector-service test` + `@membrana/client` typecheck/test green
- [ ] LGTM Teamlead

---

### Out of scope

- `sample-library` mode для trends-fft
- ML-классификатор
- Backend sync шаблонов
- Полный порт legacy UI без адаптации под DaisyUI и plugin state

---

### Порядок работы ролей

1. **Teamlead** — scope, согласование расширения types.
2. **Математик** — `frameHitRatio` в scoring, веса, fixtures.
3. **Структурщик** — store, merge templates, plugin wiring.
4. **Верстальщик** — форма, вкладки, валидация.
5. **Музыкант** — smoke с микрофоном / WAV prefill (если успеваем).

---

## Консилиум (2026-06-11)

Постановка заказчика (три вкладки редактора) обсуждена виртуальной командой. **Итоги внесены в промпт выше.**

| Роль | Позиция |
|------|---------|
| **Vesnin (Teamlead)** | Расширение `thresholds.frameHitRatio` — в scope #57, иначе поле «50–80 % тактов» некуда привязать в scoring. WAV-prefill — stretch, не блокер. Копирование системного шаблона — must для UX. |
| **Ozhegov (Структурщик)** | `UserTemplateStore` в плагине; ключи `user:<slug>`; при classify — ` [...SYSTEM, ...enabledUser]`. Черновик формы (`EditorDraft`) отделить от `PatternTemplate` до нажатия «Сохранить». |
| **Dynin (Математик)** | Hit-ratio: доля тактов, где centroid ∧ flux ∧ rms ∈ bounds; membership по факту vs ожидаемому `frameHitRatio`. Legacy templates без поля — default `{0.5, 0.8}` или не штрафовать (score=1 для ratio). Средние по спектру оставить в spectral score. |
| **Музыкант** | Prefill: (1) «Из последнего анализа» — взять `lastResult.samples` + `temporalFeatures`; (2) из WAV — offline через существующий feed. Подписать единицы: σ в Hz / RMS, длительности в сек. |
| **Rodchenko (Верстальщик)** | Три вкладки = `role="tablist"`; компактные `table-sm` для bounds; предупреждение при min≥max; цвет шаблона — color input + preview chip. |

**Отложено по консилиуму:** `peakToAverageRatio` в UI редактора (v1.1); `modulated` в трендах — только если появится в `analyzeTrend` (сейчас нет в детекторе, не добавлять в UI до расширения math).

---

## Заметки для человека-постановщика

- Issue: [#57](https://github.com/officefish/Membrana/issues/57), labels `enhancement`, `package:client`.
- После правок промпта: `yarn task:sync-readme` не обязателен (id не менялся).
- Референс полей: `packages/services/trends-detector/src/data/system-templates.ts`.
