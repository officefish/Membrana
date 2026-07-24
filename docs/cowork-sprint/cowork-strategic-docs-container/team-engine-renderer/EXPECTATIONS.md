<!-- Cowork block engine-renderer · Phase 1 · via xai/grok-4.5 (оркестровка), изоляция соблюдена -->

# Односторонние ожидания engine-renderer к соседям (допущения Phase 1)

## От `canon-data`
1. **Формат релиза (минимум)**, который нам отдадут как SoT-пин:
   ```json
   {
     "releaseId": "string",
     "version": "string",
     "title": "string",
     "pin": "git-sha | tag",
     "paths": ["relative/path/to/doc.md", "..."],
     "protectedPaths": ["..."]
   }
   ```
   `protectedPaths` — пути, которые **никогда** нельзя переписать provider→git (мы опираемся на этот список в `mergeSnapshots`; если списка нет — считаем protected весь pin-набор `paths`).
2. **Выбор провайдера оператором** допускается хранить в git как `strategic-docs/.provider-selection.json`; canon-data не должен считать этот файл «мусором» и не вычищает его при сборке пина.
3. Манифест синка `strategic-docs/.sync-manifest.json` и маркер заглушки `.engine-stub.json` — артефакты нашего блока; ожидаем, что canon их либо игнорирует, либо тащит как meta, но не валидирует жёстко в Phase 1.

## От `generators-validation`
1. На выходе «готовый релиз для рендера» = объект `ReleaseSurface`:
   ```json
   {
     "releaseId": "string",
     "version": "string",
     "title": "string",
     "markdown": "string (уже склеенное тело)",
     "meta": { "pin": "...", "sourcePaths": [] }
   }
   ```
   Мы **не** собираем markdown сами: ожидаем один готовый `markdown` (или явный конкат в этом поле).
2. Generators-validation отдаёт релиз только после своей валидации; мы не повторяем schema-check кроме presence `releaseId|version|markdown`.
3. При отсутствии готового релиза generators должен давать явный пустой/error-объект; мы не ходим в git-дерево документов напрямую, чтобы «дособрать».

## Чего НЕ ждём от соседей в Phase 1
- Любых callback/webhook «провайдер изменился» — sync инициируем мы (панель / CLI).
- Общих TS-пакетов типов: держим свои typedef в адаптере, сверим на Интерфейс-консилиуме.
- UI-слотов в панели кроме нашей секции `strategic-docs/**`.
