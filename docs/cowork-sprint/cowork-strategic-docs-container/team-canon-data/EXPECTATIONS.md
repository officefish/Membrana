<!-- Cowork block canon-data · Phase 1 · сгенерировано через xai/grok-4.5 (оркестровка), изоляция соблюдена -->

# Односторонние ожидания canon-data от соседей

Формулирую как **мои допущения** на стыке. Это не договорённость, а то, под что я строю модель. Если у соседа иначе — ломается только адаптер, не pure-ядро.

## От `generators-validation`

1. **Перед записью** релиза/эксперимента вызывается мой `valid(template, granuleIndex)`.  
   - `ok: true` → путь `docs/containers/strategic-docs/releases/<id>/`  
   - `ok: false` → путь `…/experiments/<id>/` (или как сосед назовёт; мне важно, что invalid не попадает в releases).
2. **Индекс гранул** сосед собирает сам (fs/git) и передаёт в `valid` аргументом. Модель fs не читает.
3. **Формат манифеста релиза**, который сосед пишет, совместим с `release.json` выше: `templateId`, `templateVersion`, `pins: { [granuleId]: exactSemver }`, `status`, `bodyPath`. Лишние поля — ок, недостающие `pins` — ломают будущий `syncGranule`.
4. Генератор **не мутирует** гранулы и шаблоны. Только читает → пишет релиз/эксперимент.

## От `engine-renderer`

1. Рендер вставляет **маркеры границ гранулы** в тело релиза:
   ```
   <!-- granule:<id>@<version> -->
   ...фрагмент...
   <!-- /granule -->
   ```
   Без маркеров `syncGranule`/`extractGranule` на его выводе не работают — мой пруф на стабах маркеры ставит сам, на реальном рендере жду того же контракта.
2. Рендер **уважает пины** шаблона: берёт ровно `granuleId@version = pin`, не «latest».
3. Сигнатура, под которую я готовлю данные (допущение):
   ```js
   render(template, granuleIndex) → { body: string, pins: Record<string,string> }
   ```
   Pure или с I/O — мне всё равно; на входе те же `template` + `granuleIndex`, что и у `valid`.
4. Renderer **не бампит** версии гранул и не переписывает `granule.json`. Только собирает body.

## Общее для обоих

- Exact semver в пинах, без диапазонов.
- Гранула-function исполняется как pure `(ctx) → string`; если нужен I/O — сосед оборачивает адаптером **до** вызова, внутрь гранулы I/O не протекает.
- Сводная JSON-схема гранулы/шаблона официально фиксируется на Интерфейс-консилиуме; до него соседи могут опираться на поля из CONCEPT как на draft wire-format.
- Точка импорта модели: `scripts/lib/strategic-docs-model.mjs` (`valid`, `syncGranule`, `isExactSemver`, `granuleKey`).
