# Промпт: актуализация Mintlify-доки device-board (detection-узлы basn + editor UX)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M** (эпик из 3 фаз).
> Ожидаемый артефакт: **1–2 PR** — обновлённая публичная документация `apps/docs` (Mintlify).
> Реестр: `id` = `mintlify-docs-refresh` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Публичная операторская документация Membrana живёт в `apps/docs` (Mintlify) и последний раз
обновлялась **2026-06-27** (последний коммит в `apps/docs`; на аккаунте Mintlify это выглядит
как «37 файлов, 2 недели назад»). С тех пор:

1. **Эпик #323 (basn, PR #324–#328, merged 2026-07-09)** добавил в палитру device-board
   5 узлов detection-цепочки — ни один не отражён в node reference.
2. **Editor UX** изменился: вкладки «Узлы | Журнал» + drag-resize правого сайдбара (#269),
   слот журнала-телеметрии хоста c разведением трейсов (#285), матрица кнопок под захватом
   (#283), борд-лок и авто-открытие сценария под захватом (#276), capture badges (CT5).
   Страницы `editor/overview.mdx` и `editor/edit-and-navigation.mdx` писались до этого.

Кабинет, capture-runtime и тариф — **не** предмет публичной доки device-board, их не трогаем.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`DOCUMENTATION_WORKFLOW.md`](../DOCUMENTATION_WORKFLOW.md) | Регламент публикации: слои, порядок node page, RAG-ритуал |
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| [`packages/device-board/DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) | Архитектурный канон (конвенции make-*, пины §5) |
| [`BOARD_ALARM_SCENARIO_NODES_EPIC_PROMPT.md`](./BOARD_ALARM_SCENARIO_NODES_EPIC_PROMPT.md) | Спецификация 5 узлов (basn) |
| [`docs/catalog/client/prompts/modules/device-board.md`](../catalog/client/prompts/modules/device-board.md) | Agent truth; одна строка-ссылка при смене контракта |
| `.cursor/skills/membrana-docs-sync/SKILL.md` | Чеклист верификации после правок |

**GitHub Issue:** [#330](https://github.com/officefish/Membrana/issues/330).

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

**Фаза mdr-1 — detection node pages (M).**
5 новых MDX-страниц в `apps/docs/device-board/nodes/`:

| Узел | Модуль | Что описывает страница |
|------|--------|--------------------------|
| `make-ensemble-analysis` | `packages/device-board/src/graph/make-ensemble-analysis-node.ts` | второй детектор: DSP-ансамбль на окне → EnsembleAnalysisRef (host-мост) |
| `make-detection-fusion` | `.../make-detection-fusion-node.ts` | 2–4 анализа → DetectionFusion {combinedScore, agreement} |
| `branch-on-detection` | `.../branch-on-detection-node.ts` | exec-ветвление detected/not по combinedScore ≥ threshold |
| `make-proximity-trend` | `.../make-proximity-trend-node.ts` | «дистанция» ближе/дальше/lost — условие жизни alarm-loop |
| `make-combined-report` | `.../make-combined-report-node.ts` | N анализов + TrackRef → единый ReportRef (async report-build) |

Сырьё: `scenario-node-inspector-notes.ts` (PR #329), модули узлов, тесты executor'ов,
эпик-промпт basn. Формат страницы — как существующие `nodes/*.mdx` (входы/выходы,
поведение, ограничения, связанные узлы). В `apps/docs/docs.json` — новая группа
**«Nodes — detection & alarm»** после «Nodes — journal & reports».
Cookbook-страница полной цепочки (аудиопоток → 2 детектора → fusion → branch → alarm-loop
→ combined report) — по образцу существующих cookbooks, одна страница.

**Фаза mdr-2 — editor pages refresh (S).**
Ревизия `editor/overview.mdx` и `editor/edit-and-navigation.mdx`:
вкладки «Узлы | Журнал» + drag-resize; слот журнала-телеметрии хоста («Журнал» = телеметрия,
трейсы → «Трейс»); поведение борда под захватом (матрица кнопок: работает → только Stop,
пауза заблокирована; борд-лок с авто-открытием сценария; badges). Проверить скриншоты/
примеры на соответствие текущему UI — устаревшие формулировки переписать, не накапливать
«историю версий» в тексте.

**Фаза mdr-3 — verify + RAG + publish (S).**
`yarn docs:lint` и `yarn catalog:verify-client` зелёные; строка-ссылка в
`docs/catalog/client/prompts/modules/device-board.md` при необходимости; RAG-ритуал по
`DOCUMENTATION_WORKFLOW.md` (incremental index + smoke query по новым терминам, напр.
`yarn rag:query "branch-on-detection combinedScore"`); после merge — проверить на аккаунте
Mintlify, что деплой подхватил новые страницы.

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Публикация | `apps/docs/**/*.mdx`, `apps/docs/docs.json` | операторская дока, node reference |
| Agent truth | `docs/catalog/client/prompts/modules/device-board.md` | одна строка-ссылка, без дублирования |
| Канон | `DEVICE_BOARD_CONCEPT.md` | **не редактируется** в этом спринте |
| Верификация | `scripts/verify-mintlify-docs.mjs` | `yarn docs:lint` (--links) |

**Запрещено:**

- Дублировать канон CONCEPT в Mintlify — только операторское поведение и ссылки.
- Трогать кабинет/capture/тариф-доку и код (`packages/`, `apps/cabinet`).
- Менять `scenario-node-inspector-notes.ts` — это источник, не цель.
- Node 25+ для локального preview (`sharp` падает); preview — Node 20–24, `yarn docs:dev`.

---

### Тесты

| Область | Минимум |
|---------|---------|
| Ссылки | `yarn docs:lint` (internal links) зелёный |
| Каталог | `yarn catalog:verify-client` зелёный |
| Навигация | все новые страницы в `docs.json`, без orphan MDX |
| RAG | smoke query возвращает новые страницы в top hits |

---

### Definition of Done

- [ ] 5 страниц узлов + группа «Nodes — detection & alarm» в `docs.json`.
- [ ] Cookbook полной detection-цепочки.
- [ ] `editor/overview` и `edit-and-navigation` отражают текущий UX (вкладки, журнал, захват).
- [ ] `yarn docs:lint` + `yarn catalog:verify-client` зелёные.
- [ ] RAG-индекс обновлён, smoke query проходит (или явный defer в archiveNotes, если `rag:index` недоступен).
- [ ] Деплой на аккаунте Mintlify обновился (проверка после merge).
- [ ] LGTM Teamlead.

---

### Out of scope

- Atlan glossary (терминов basn там нет; шаг пропускаем осознанно).
- ChatPRD update-prd (PRD device-board-mvp-docs не меняет фазу).
- Переструктурирование существующего node reference; visual parity с DESIGN.md.
- Документация кабинета, capture-runtime, тарифов, detection-ensemble-service как пакета.

---

### Порядок работы ролей

1. **Teamlead (Vesnin)** — план, объём страниц, приёмка DoD.
2. **Структурщик** — соответствие страниц реальным контрактам узлов (пины, типы, host-мост).
3. **Математик (Dynin)** — корректность описания fusion/proximity (combinedScore, agreement, lost).
4. **Музыкант** — операторская точка зрения: сценарий alarm-loop читается без кода.
5. **Верстальщик** — структура MDX, навигация, единообразие с существующими страницами.

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: …
[Структурщик]: …
[Математик]: …
[Музыкант]: …
[Верстальщик]: …

Итоговый артефакт: …
Definition of Done: …
```

---

## Заметки для человека-постановщика

1. GitHub Issue: [#330](https://github.com/officefish/Membrana/issues/330).
2. Реестр: эпик `mintlify-docs-refresh` + фазы `mdr-1-detection-node-pages`,
   `mdr-2-editor-pages-refresh`, `mdr-3-verify-rag-publish` (`status: active`).
3. После merge: отчёт в Issue → `yarn task:archive <id> --notes "PR #…, краткий итог"`
   по каждой фазе, затем эпик.

### Проверка после PR

```bash
yarn docs:lint
yarn catalog:verify-client
yarn rag:query "branch-on-detection combinedScore"   # если rag:index доступен
```

---

## Связь с дорожной картой

- Эпик #323 (basn) закрыт — этот спринт закрывает его документационный хвост.
- Регламент: `DOCUMENTATION_WORKFLOW.md` шаг «3. Mintlify» для новых узлов палитры.
- Готовит node reference к соревнованию по сборке графа (device-board-hackathon / comp-packaging).
