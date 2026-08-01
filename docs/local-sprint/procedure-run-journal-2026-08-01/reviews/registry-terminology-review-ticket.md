# ??????: review ???????????? ? registry-????????

Persona: ozhegov
Block: registry-terminology-review
Plan: docs/sprint/cut/procedure-run-journal-2026-08-01-code-review.json

## ?????? ?????

?? ??????????? ????????????? ?? ????? ????? membrana-local-sprint. ???????? ??? ???? ? ??? code-review verdict: LGTM ??? BLOCK. ???? BLOCK, ????????? ?????????? ????? ? ???????????. ?? ????????????? ?????????? ??????.

## ?????

- ??????? ???????????? ????? membrana-local-sprint ? ?????????? honest/day sprint ??? ?????? ?????????? kind.
- ??????? package script procedure-run:journal ? task registry/config/readme.
- ??????? prompt wording ? kit manifest pins ?? ??????? ??????? ????? ??? ???????????????.

## ????

- scripts/lib/task-registry.mjs
- scripts/tasks-decompose.config.json
- docs/tasks/registry.json
- docs/tasks/README.md
- package.json
- docs/prompts/PROCEDURE_RUN_JOURNAL_SPRINT_PROMPT.md
- docs/prompts/PROCEDURE_RUN_JOURNAL_F1_LOCAL_TRAIL_PROMPT.md
- kits/angelina-morning/MANIFEST.json
- kits/containerization-master/MANIFEST.json
- kits/tasks-master/MANIFEST.json

## File: scripts/lib/task-registry.mjs

```diff
diff --git a/scripts/lib/task-registry.mjs b/scripts/lib/task-registry.mjs
index 2e2117d6..1bff5574 100644
--- a/scripts/lib/task-registry.mjs
+++ b/scripts/lib/task-registry.mjs
@@ -140,7 +140,14 @@ export function validateTaskId(id) {
 }

 const TASK_SIZES = ['S', 'M', 'L'];
-const SPRINT_KINDS = ['day-sprint', 'epic', 'night-build', 'competition-sprint', 'cowork-sprint'];
+const SPRINT_KINDS = [
+  'membrana-local-sprint',
+  'day-sprint',
+  'epic',
+  'night-build',
+  'competition-sprint',
+  'cowork-sprint',
+];

 /**
  * Собрать нормализованную запись карточки из полей CLI (#469 ti-3).

```

## File: scripts/tasks-decompose.config.json

```diff
diff --git a/scripts/tasks-decompose.config.json b/scripts/tasks-decompose.config.json
index 1b415861..ed884f7a 100644
--- a/scripts/tasks-decompose.config.json
+++ b/scripts/tasks-decompose.config.json
@@ -50,7 +50,7 @@
     {
       "name": "Контейнеры, процедуры и мастерские",
       "patterns": [
-        "^(archivarius-|precedent-container|assets-container|network-container|tooling-atlas|procedural-|procedures-corpus|adr-procedure|frame-rails|frames-alive|bridge-room|angelina-codex)"
+        "^(archivarius-|precedent-container|assets-container|network-container|tooling-atlas|procedural-|procedures-corpus|procedure-run-journal|adr-procedure|frame-rails|frames-alive|bridge-room|angelina-codex)"
       ]
     },
     {
@@ -99,6 +99,7 @@
     },
     "kind": {
       "order": [
+        "membrana-local-sprint",
         "day-sprint",
         "night-build",
         "epic",

```

## File: docs/tasks/registry.json

```diff
diff --git a/docs/tasks/registry.json b/docs/tasks/registry.json
index fc1546c9..37174025 100644
--- a/docs/tasks/registry.json
+++ b/docs/tasks/registry.json
@@ -1,5 +1,46 @@
 {
   "tasks": [
+    {
+      "id": "procedure-run-journal-f1-local-trail",
+      "title": "F1: локальная лента прогона процедур",
+      "promptPath": "docs/prompts/PROCEDURE_RUN_JOURNAL_F1_LOCAL_TRAIL_PROMPT.md",
+      "githubIssue": null,
+      "linearId": null,
+      "size": "M",
+      "status": "active",
+      "sprintKind": "membrana-local-sprint",
+      "createdAt": "2026-08-01",
+      "archivedAt": null,
+      "leadPersona": "dynin",
+      "supportPersonas": [
+        "vesnin",
+        "ozhegov"
+      ],
+      "notes": "",
+      "archiveNotes": null,
+      "githubIssueClosedAt": null,
+      "parentEpic": "procedure-run-journal-2026-08-01"
+    },
+    {
+      "id": "procedure-run-journal-2026-08-01",
+      "title": "Membrana Local Sprint: журнал прогона процедур",
+      "promptPath": "docs/prompts/PROCEDURE_RUN_JOURNAL_SPRINT_PROMPT.md",
+      "githubIssue": null,
+      "linearId": null,
+      "size": "L",
+      "status": "active",
+      "sprintKind": "membrana-local-sprint",
+      "createdAt": "2026-08-01",
+      "archivedAt": null,
+      "leadPersona": "vesnin",
+      "supportPersonas": [
+        "dynin",
+        "ozhegov"
+      ],
+      "notes": "",
+      "archiveNotes": null,
+      "githubIssueClosedAt": null
+    },
     {
       "id": "branch-salvage-controlled-tooling",
       "title": "Добавить контролируемую процедуру salvage веток",
@@ -74,7 +115,7 @@
         "dynin",
         "kuryokhin"
       ],
-      "notes": "Первый боевой прогон механизма честного спринта (скилл membrana-honest-sprint). План v2 ратифицирован владельцем 30.07 15:55, дайджест 3b5827ab. Частичное окно объявлено ДО старта: два рода следа из четырёх. Критерии теста — mfcc-compare-sprint-TEST-CRITERIA.md, написаны ПОСЛЕ нарезки",
+      "notes": "Первый боевой прогон механизма membrana-local-sprint (бывшее рабочее имя honest-sprint). План v2 ратифицирован владельцем 30.07 15:55, дайджест 3b5827ab. Частичное окно объявлено ДО старта: два рода следа из четырёх. Критерии теста — mfcc-compare-sprint-TEST-CRITERIA.md, написаны ПОСЛЕ нарезки",
       "archiveNotes": null,
       "githubIssueClosedAt": null
     },

```

## File: docs/tasks/README.md

```diff
diff --git a/docs/tasks/README.md b/docs/tasks/README.md
index c37d521d..c5f5dcc0 100644
--- a/docs/tasks/README.md
+++ b/docs/tasks/README.md
@@ -20,6 +20,8 @@

 | ID | Название | Размер | Промпт | GitHub |
 |----|----------|--------|--------|--------|
+| `procedure-run-journal-f1-local-trail` | F1: локальная лента прогона процедур | M | [`PROCEDURE_RUN_JOURNAL_F1_LOCAL_TRAIL_PROMPT.md`](../prompts/PROCEDURE_RUN_JOURNAL_F1_LOCAL_TRAIL_PROMPT.md) | — |
+| `procedure-run-journal-2026-08-01` | Membrana Local Sprint: журнал прогона процедур | L | [`PROCEDURE_RUN_JOURNAL_SPRINT_PROMPT.md`](../prompts/PROCEDURE_RUN_JOURNAL_SPRINT_PROMPT.md) | — |
 | `llm-transport-no-key-class` | llm-транспорт: развести «ключа нет» и «ключ отвергнут» | S | [`LLM_TRANSPORT_NO_KEY_CLASS_PROMPT.md`](../prompts/LLM_TRANSPORT_NO_KEY_CLASS_PROMPT.md) | [#1549](https://github.com/officefish/Membrana/issues/1549) |
 | `mfcc-compare-sprint` | MFCC-ядро: обвязка, детекторы и сравнительный прогон против гармонического на FFT | M | [`mfcc-compare-sprint.json`](../sprint/cut/mfcc-compare-sprint.json) | — |
 | `mfcc-lib-choice` | Выбор MFCC-библиотеки: обоснование до нарезки блоков | S | [`MFCC_LIB_CHOICE_PROMPT.md`](../prompts/MFCC_LIB_CHOICE_PROMPT.md) | — |

```

## File: package.json

```diff
diff --git a/package.json b/package.json
index c08ad3dd..efe65a08 100644
--- a/package.json
+++ b/package.json
@@ -235,6 +235,7 @@
     "case:portfolio": "node scripts/case-portfolio.mjs",
     "case:generalize": "node scripts/case-generalize.mjs",
     "procedures:registry": "node scripts/procedures-registry.mjs",
+    "procedure-run:journal": "node scripts/procedure-run-journal.mjs",
     "procedures:license": "node scripts/procedures-license.mjs",
     "procedures:workshop": "node scripts/procedural-workshop.mjs",
     "audit:concentrate": "node scripts/audit-concentrate.mjs",

```

## File: docs/prompts/PROCEDURE_RUN_JOURNAL_SPRINT_PROMPT.md

```md
# Промпт: Membrana Local Sprint: журнал прогона процедур

> **Task-промпт для агента-разработчика**.
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **L**.
> Ожидаемый артефакт: **1 membrana-local-sprint** — локальная лента F1 сейчас, далее провод в реальные процедуры.
> Реестр: `id` = `procedure-run-journal-2026-08-01`.

---

## Контекст

Хендоф 2026-08-01 назвал первый приоритет: **журнал прогона процедур**. Дефект дня
31.07: механизмы показывали, что шаг отработал, но не проверяли, что шаг покрыл
свой предмет. Результат — находки пропадали вместе с временными файлами, ревью
не видело магистраль дня, доставка вечера краснела на собственном дефекте.

В репозитории уже есть `run-ledger`: Merkle/Ed25519-цепь для доказуемой истории.
Этот спринт не переписывает её. Он добавляет прикладной execution trail: запись
`procedureId/runId/status/subject/evidence/gaps`, которую можно предъявить до
появления полноценного проигрывателя процедур.

**Связанные документы:**

| Документ | Зачем |
|----------|-------|
| [`HANDOFF.md`](../HANDOFF.md) | Приоритет и формулировка дефекта |
| [`docs/procedures/membrana-local-sprint`](../procedures/membrana-local-sprint/README.md) | Процедура ведения этого спринта |
| [`docs/procedures/README.md`](../procedures/README.md) | Разница: определения процедур vs инстансы |
| [`RUN_LEDGER_PROMPT.md`](./RUN_LEDGER_PROMPT.md) | Предыдущий криптографический слой |
| [`scripts/lib/run-ledger/README.md`](../../scripts/lib/run-ledger/README.md) | Что уже есть и не пишется заново |

**GitHub Issue:** — (локальный старт без Issue).

---

## Промпт целиком

### Кто ты

Ты — координатор виртуальной команды Membrana. Ведущий — **Vesnin**; F1 держит
**Dynin**, потому что предмет — форма записи, инварианты и тесты. Соблюдай
`membrana-local-sprint`: это local sprint instance, не одиночная задача.

### Что построить

Открыть membrana-local-sprint `procedure-run-journal-2026-08-01` и провести первую фазу:

1. **F1 local trail** — `docs/procedure-runs/trail/*.jsonl` + CLI append/check/report.
2. Запись должна называть предмет покрытия (`subject`), evidence и gaps.
3. `pass` без evidence запрещён.
4. Запись получает `run-ledger` leaf hash, но не выдаёт себя за серверный checkpoint.

### Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Дом инстансов | `docs/procedure-runs/` | README + будущие JSONL trails |
| Библиотека | `scripts/lib/procedure-run-journal.mjs` | build/validate/read/summarize |
| CLI | `scripts/procedure-run-journal.mjs` | append/check/report |
| Тесты | `scripts/procedure-run-journal.test.mjs` | offline node:test |
| Sprint instance | `docs/local-sprint/procedure-run-journal-2026-08-01/OPEN.md` | OPEN и фазы |

### Definition of Done

- [ ] Эпик и F1-фаза зарегистрированы в `docs/tasks/registry.json`.
- [ ] `OPEN.md` membrana-local-sprint создан; `LOCAL_SPRINT_ACTIVE.md` обновлён.
- [ ] Локальный trail умеет append/check/report.
- [ ] `pass` без evidence падает тестом.
- [ ] Summary называет gaps поимённо.
- [ ] `node --test scripts/procedure-run-journal.test.mjs scripts/run-ledger.test.mjs` зелёный.

### Out of scope

- Серверный архив прогонов.
- Автоматический проигрыватель процедур.
- Подпись checkpoint приватным ключом сервера.
- Провод во все существующие процедуры за один PR.

---

## Acceptance criteria

- [ ] Есть локальный JSONL-home для procedure run trail.
- [ ] CLI проверяет записи и печатает report.
- [ ] Leaf hash строится через существующий `run-ledger`.
- [ ] Membrana Local Sprint OPEN/ACTIVE/LOG отражают старт.

## Заметки для человека-постановщика

Закрытие: после PR и LGTM архивировать F1, затем эпик либо закрыть, либо оставить
с явными F2/F3.

```

## File: docs/prompts/PROCEDURE_RUN_JOURNAL_F1_LOCAL_TRAIL_PROMPT.md

```md
# Промпт: F1: локальная лента прогона процедур

> **Task-промпт для агента-разработчика**.
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — минимальный локальный journal для прогонов процедур.
> Реестр: `id` = `procedure-run-journal-f1-local-trail`.

---

## Контекст

F1 — первый блок membrana-local-sprint `procedure-run-journal-2026-08-01`. Он закрывает
самую острую дыру: прогон процедуры должен оставить след, который называет не
только факт запуска, но и предмет покрытия. Если предмет не покрыт, gap должен
жить в журнале, а не в памяти сессии.

`run-ledger` уже реализован и даёт leaf hash / Merkle / checkpoint. F1 использует
только leaf hash как стабильный отпечаток записи; серверные подписи и consistency
proof — вне этой фазы.

---

## Промпт целиком

### Кто ты

Ты — координатор виртуальной команды Membrana. Ведущий F1 — **Dynin**. Держи
границы: локальная лента, pure Node scripts, без новых зависимостей.

### Что построить

1. `docs/procedure-runs/README.md` — дом и контракт JSONL.
2. `scripts/lib/procedure-run-journal.mjs`:
   - `buildProcedureRunRecord(input, opts)`
   - `validateProcedureRunRecord(record)`
   - `appendProcedureRunRecord(repoRoot, trailRelPath, record)`
   - `readProcedureRunTrail(repoRoot, trailRelPath)`
   - `summarizeProcedureRunTrail(records)`
3. `scripts/procedure-run-journal.mjs`:
   - `append`
   - `check`
   - `report`
4. `package.json`: `procedure-run:journal`.
5. `scripts/procedure-run-journal.test.mjs`.

### Контракт записи

Минимальная запись:

```json
{
  "schema": "procedure-run-journal@1",
  "sequence": 1,
  "at": "2026-08-01T05:00:00.000Z",
  "runId": "ritual-evening-2026-08-01",
  "procedureId": "ritual-evening",
  "status": "blocked",
  "subject": "delivery frame covered generated artifacts",
  "coverage": {
    "evidence": [],
    "gaps": ["bridge digest missing"]
  },
  "ledger": {
    "algorithm": "run-ledger.leafHash@1",
    "leafHash": "..."
  }
}
```

`status=pass` без `coverage.evidence[]` запрещён.

### Definition of Done

- [ ] Record builder валидирует required-поля и status enum.
- [ ] `pass` без evidence запрещён.
- [ ] `blocked/fail/skipped` могут нести named gaps.
- [ ] JSONL append/read работает.
- [ ] Report печатает gaps поимённо.
- [ ] `node --test scripts/procedure-run-journal.test.mjs` зелёный.

### Out of scope

- Проверка существования файлов evidence.
- Серверный checkpoint и ключи.
- Интеграция в `ritual-evening-run.mjs`.

---

## Acceptance criteria

- [ ] Тесты F1 проходят offline.
- [ ] Новых npm-зависимостей нет.
- [ ] CLI usable через `node scripts/procedure-run-journal.mjs`.

```

## File: kits/angelina-morning/MANIFEST.json

```diff
diff --git a/kits/angelina-morning/MANIFEST.json b/kits/angelina-morning/MANIFEST.json
index 0cff061c..0f4087d0 100644
--- a/kits/angelina-morning/MANIFEST.json
+++ b/kits/angelina-morning/MANIFEST.json
@@ -67,7 +67,7 @@
     "scripts/lib/strategy-horizon.mjs": "d92be708a73158a69b788063e78afeed7eb6b992",
     "scripts/lib/swallow-delivery-ledger.mjs": "bc0466723d3f14fdcc8a8738cf545a38a3632be9",
     "scripts/lib/swallow-mirror.mjs": "03a516933aeb65082246f31ca6f630d6e88dc869",
-    "scripts/lib/task-registry.mjs": "2e2117d614ea69448bc132856da35c2f53aca8b4",
+    "scripts/lib/task-registry.mjs": "1bff557471f239c7b5075aecbdf5b16dac750842",
     "scripts/lib/tasks-readme-engine.mjs": "3a45a41f5e17587bc54b85011eeacbeffa7c264b",
     "scripts/lib/truth-graph.mjs": "54f1c23e0f0449e4adde145aa2d2633030baa22a",
     "scripts/lib/worktree-demolition.mjs": "f5ae3efad3607f7a049dc7a644ef6b562616c5db",

```

## File: kits/containerization-master/MANIFEST.json

```diff
diff --git a/kits/containerization-master/MANIFEST.json b/kits/containerization-master/MANIFEST.json
index 215d3537..49926598 100644
--- a/kits/containerization-master/MANIFEST.json
+++ b/kits/containerization-master/MANIFEST.json
@@ -30,7 +30,7 @@
     "scripts/lib/strategic-docs-loader.mjs": "0a9a951e2d842f6e9feca9d901e816a3e6be6e8f",
     "scripts/lib/strategic-docs-model.mjs": "46d0f79141539fb11ba0e0d27677fb9c5642e5d4",
     "scripts/lib/strategic-docs-render-adapter.mjs": "b371d78628326455a90a61c99a38f891caeaf36f",
-    "scripts/lib/task-registry.mjs": "2e2117d614ea69448bc132856da35c2f53aca8b4",
+    "scripts/lib/task-registry.mjs": "1bff557471f239c7b5075aecbdf5b16dac750842",
     "scripts/lib/tasks-audit.mjs": "e4a22ef66e482168060a3cc7af56b91d757cac47",
     "scripts/lib/tasks-decompose.mjs": "76db4ed957044028ed543db464cb73cbb086806d",
     "scripts/lib/tasks-readme-engine.mjs": "3a45a41f5e17587bc54b85011eeacbeffa7c264b",

```

## File: kits/tasks-master/MANIFEST.json

```diff
diff --git a/kits/tasks-master/MANIFEST.json b/kits/tasks-master/MANIFEST.json
index 5ddde9fb..bee3ac43 100644
--- a/kits/tasks-master/MANIFEST.json
+++ b/kits/tasks-master/MANIFEST.json
@@ -26,7 +26,7 @@
     "scripts/lib/task-invariants-links.mjs": "f6f45f2a1101a5291eb4dc935e33f79ede5a2798",
     "scripts/lib/task-invariants.mjs": "1813edbb3f75fbf02bf67973e13fedf60643c668",
     "scripts/lib/task-readme-check.mjs": "07490f7c3ed2d4fab0fef88b1b7c503ddf37c464",
-    "scripts/lib/task-registry.mjs": "2e2117d614ea69448bc132856da35c2f53aca8b4",
+    "scripts/lib/task-registry.mjs": "1bff557471f239c7b5075aecbdf5b16dac750842",
     "scripts/lib/task-tools.mjs": "e0d70928fe4be4018549221f8dfd4229d8f1024f",
     "scripts/lib/task-validity-links.mjs": "73c2463a78c7c43f1adfec88fcc006d630a9b5fe",
     "scripts/lib/task-validity.mjs": "624a2812312966b3727c76e9ede90a05bfd2311a",

```
