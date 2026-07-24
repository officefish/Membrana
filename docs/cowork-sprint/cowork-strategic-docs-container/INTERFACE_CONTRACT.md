# INTERFACE_CONTRACT — контейнер стратегических документов

> Phase 3 Cowork · Интерфейс-консилиум 2026-07-24. Свод трёх EXPECTATIONS (canon-data · generators-validation · engine-renderer) через оркестровку xai/grok-4.20-non-reasoning. Изоляция блоков окончена; ниже — единый контракт стыка для Phase 4 (интеграция адаптерами).

---

### 1. Схема гранулы/шаблона/релиза (каноническая)

```ts
type ExactSemver = string; // строго x.y.z, без ^ ~ >=, проверяется isExactSemver()

type Granule =
  | {
      kind: "literal";
      id: string;
      version: ExactSemver;
      body: string;
      meta?: Record<string, any>;
    }
  | {
      kind: "fn";
      id: string;
      version: ExactSemver;
      exportName: string;
      moduleId: string;           // путь или specifier для резолва
      meta?: Record<string, any>;
    };

type Template = {
  id: string;
  version: ExactSemver;
  slots: Array<{
    granuleId: string;
    version: ExactSemver;        // требуемая версия (pin)
    pin?: Record<string, any>;   // дополнительные параметры в fn-гранулу
  }>;
  meta?: Record<string, any>;
};

type ReleaseManifest = {
  releaseId: string;
  version: ExactSemver;
  templateId: string;
  templateVersion: ExactSemver;
  title: string;
  pins: Record<string, ExactSemver>;   // granuleId → exact version
  status: "release" | "experiment";
  bodyPath: string;
  protectedPaths?: string[];
  meta?: Record<string, any>;
};
```

**Решение по расхождениям:**  
Приоритет — объединённая модель `canon-data` + требования `generators-validation`. Поле `pins` обязательно. `ReleaseSurface` из `engine-renderer` заменяется на `ReleaseManifest` + отдельно `markdown`.

### 2. Контракт рендера

```ts
render(
  template: Template,
  granuleIndex: (id: string, version: ExactSemver) => Granule | undefined
): {
  body: string;                    // полностью собранный markdown
  pins: Record<string, ExactSemver>; // финальные использованные пины
}
```

**Конвенция маркеров границ гранулы (обязательна):**

```markdown
<!-- granule:{{granuleId}}@{{exactVersion}} -->
... содержимое гранулы ...
<!-- /granule -->
```

Маркеры должны присутствовать в `body`. Они используются `canon-data` для `syncGranule` / `extractGranule`.

**Решение:** Приоритет `canon-data`. Renderer получает `granuleIndex` и материализует гранулы сам (или через переданный `renderBody`). Сигнатура `render(template, granuleIndex)` побеждает.

### 3. Контракт office-валидации

**Запрос:**
```ts
{
  payload: {
    template: Template;
    granuleIndex: Record<string, Granule>; // или функция-resolve
    renderedBody?: string;
    pins: Record<string, ExactSemver>;
  }
}
```

**Ответ:**
```ts
{
  ok: boolean;
  reasons?: string[];        // человекочитаемые объяснения
}
```

Валидация происходит **до** записи в `releases/` или `experiments/`.  
`canon-data.valid(template, granuleIndex)` — тонкая обёртка над office-валидацией.

### 4. Инварианты потока

- **Git — единственный источник истины.** При конфликте git-пин всегда побеждает.
- Валидный шаблон + успешная office-валидация → `releases/<releaseId>/`
- Неуспешная валидация → `experiments/<releaseId>/` (карантин)
- Каждая гранула-функция — **чистая функция** `(ctx: any) → string`. Весь I/O (fs, network, office) лежит на краю (адаптеры генератора/рендера).
- Генератор **не мутирует** исходные гранулы и шаблоны.

### 5. Глоссарий стыка

- **Гранула** — атомарная единица контента (`literal` или `fn`).
- **Пин (pin)** — ExactSemver, жёстко фиксирующий версию гранулы в шаблоне/релизе.
- **Шаблон (Template)** — композиция слотов с pinned гранулами.
- **ReleaseManifest** — канонический манифест релиза в `release.json`.
- **Маркер гранулы** — `<!-- granule:id@version --> ... <!-- /granule -->`.
- **Office-валидация** — единственная авторитетная проверка перед записью.
- **GranuleIndex** — duck-type resolver `(id, version) → Granule | undefined`.

### 6. Интеграционный smoke (при склейке адаптерами)

1. `valid(template, granuleIndex)` возвращает `{ok: true}` → в `releases/`, `{ok: false}` → в `experiments/`.
2. Вызов `render(template, index)` возвращает `body` содержащий корректные `<!-- granule:... -->` маркеры и `pins` с exact-версиями.
3. `syncGranule` / `extractGranule` успешно находят и обновляют гранулы по маркерам в сгенерированном теле.
4. Полный цикл `generate → validate → render → write` для валидного и невалидного кейса детерминирован и не мутирует исходные `granules/` и `templates/`.

### 7. Открытые вопросы

- Синкать ли `strategic-docs/.provider-selection.json` и `.sync-manifest.json` как обычные meta-файлы или оставлять их исключительно в ведении `engine-renderer`?
- Нужно ли в `ReleaseManifest` явно хранить `protectedPaths` или достаточно `protectedPaths` из пина релиза?
- Следует ли выносить общие типы (`Template`, `Granule`, `ReleaseManifest`, `ExactSemver`) в отдельный пакет `@cowork/strategic-docs-types` уже на Phase 2?
- Кто отвечает за генерацию `title` релиза — generators-validation или canon-data?
