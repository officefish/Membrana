# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-06-28T06:55:11.311Z |
| Команда | `yarn consilium` |
| Модель | claude-haiku-4-5-20251001 |
| Файл | `docs/seanses/closure-review-process-consilium-2026-06-28.md` |
| Порядок ролей | Верстальщик → Структурщик → Математик → Teamlead → Музыкант |

**Вопрос:**

Спроектировать обязательный Team Lead review для закрытия конкретного GitHub Issue или спринта так, чтобы пользователь не повторял просьбу вручную. Определить: единый state machine от implementation-ready через commit/push до review LGTM/BLOCK, merge/Issue close/archive; fail-closed и исключения; review evidence и машиночитаемый manifest; новые prompt/regulation; mjs-команды prepare/review/finalize; идемпотентность и dry-run; интеграцию с task registry и GitHub; skills для Cursor, Claude Code и Codex из одного канонического источника; миграцию без поломки текущих code-review/task:archive/task:close-github; этапы внедрения, тесты и Definition of Done.

---

# Консилиум: обязательный Teamlead review от issue до merge

**Повестка:** Спроектировать state machine для review-цикла (от implementation-ready через commit до LGTM/BLOCK и merge), избежать повторных ручных запросов, определить machine-readable manifest, prompt/regulation, CLI-команды, интеграцию с task registry и GitHub.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Верстальщик → Структурщик → Математик → Teamlead → Музыкант → (повтор)

---

[Верстальщик]: Главный вопрос — **когда** Teamlead должен влезть в процесс? Если Issue закрыт в GitHub, то кто инициирует ревью? Нужен явный trigger: либо commit с определённым префиксом (типа `[review-needed]`), либо PR-автомат, либо manual `yarn review:request`. Без этого ревьюер может пропустить готовый код. Предлагаю привязать к PR: как только код в `main` или в dedicated branch, запускаем state machine.

[Структурщик]: Согласен, но нужна чёткая цепочка артефактов. Сейчас workflow такой: агент напишет код, делает коммит, но нет гарантии, что он соответствует task registry. Мне нужно видеть **машиночитаемый манифест** — JSON или YAML, что скажет: «этот PR закрывает задачу `T-042`, затрагивает пакеты `@membrana/core`, `@membrana/agenda`, нарушает ли он `ARCHITECTURE.md`, требует ли он ревью Математика по алгоритмам». Без манифеста Teamlead будет гадать по коду. Регуляция обязательно → промпт для Cursor, который напоминает заполнить манифест при `git commit`.

[Математик]: Манифест хороший, но не все знают, какие их файлы изменены. Предлагаю **автоматический анализ диффа**: скрипт `yarn review:prepare <issue|pr>` парсит `git diff` и заполняет манифест частично: сам определяет затронутые пакеты, ищет ключевые слова (`FFT`, `algorithm`, `math/`) и предлагает боксы для чека (типа `reviewed_by: ["dynin"]`). Человек только уточняет. Это *prepare-этап*: состояние `preparation_in_progress`.

[Teamlead]: Вот это направление верное. Прорисую state machine целиком:

```
┌─────────────────┐
│ Issue/task open │
└────────┬────────┘
         │
         ├─ `yarn task:archive` → code + PR
         │
         ▼
┌──────────────────────┐
│ implementation_ready │ (в commit или в task registry)
└────────┬─────────────┘
         │
         │ `yarn review:prepare <issue>`
         ▼
┌──────────────────────┐
│ preparation_pending  │ (манифест создан, агент заполнил поля)
└────────┬─────────────┘
         │
         │ агент добавляет reviewed_by / skip_roles
         ▼
┌──────────────────────┐
│ review_requested     │ (манифест финализирован, PR готов)
└────────┬─────────────┘
         │
         │ Teamlead / Структурщик / Математик читают PR
         ▼
   ┌─────────────┬─────────────┐
   │             │             │
   ▼             ▼             ▼
┌──────┐  ┌──────────┐  ┌──────────┐
│ LGTM │  │ BLOCK    │  │ NEEDS_FIX│
└──┬───┘  └────┬─────┘  └────┬─────┘
   │           │             │
   │ `yarn     │ запрос на   │ агент правит
   │ review:   │ правки      │ код, новый
   │ finalize` │ в issue     │ коммит →
   │           │             │ переход
   ▼           │             │
┌──────────┐   │             │
│ merged   │◄──┴─────────────┘
└──────────┘
```

Это **fail-closed**: если Teamlead ничего не сказал, merge не происходит.

[Музыкант]: Но ведь не для каждого PR нужна проверка Teamlead? Типа, исправление опечатки в README или локальная фиксация в одном пакете — уже готово без моего одобрения. Может, нужна система **автоматических пропусков** (skip)? Если PR не трогает границы пакетов и не меняет `ARCHITECTURE.md`, можно ставить `skip_review: true` в манифесте и лететь в `main` с CI-проверкой вместо человека?

[Верстальщик]: Хороший вопрос, но опасно. Я видел, как мелкие правки ломают `DESIGN.md`. Предлагаю компромисс: **автоматический skip только** для конкретных паттернов в манифесте, явно одобренных в [`CONTRIBUTING.md`](./CONTRIBUTING.md). Например:
- Меняется только `docs/*` или `README.md` → `auto_skip: "docs-only"`.
- Меняется только один файл в `src/types.ts` пакета → `auto_skip: "types-only"`.
- Меняется только тесты в `__tests__/` → `auto_skip: "tests-only"`.

Для каждого паттерна указываем, какую роль он пропускает (или все роли). Teamlead всё равно может перевести PR в `review_requested`, если хочет.

[Структурщик]: И каков будет механизм взаимодействия с GitHub? PR создаётся обычным `git push`, но манифест где хранится — в ветке в JSON-файле типа `.review-manifest.json`? И GitHub Actions слушает push, читает манифест, проставляет labels и requests reviewers автоматически?

[Teamlead]: Да, `.review-manifest.json` кладём в корень репо (или в `docs/reviews/`), коммитим рядом с кодом. GitHub Actions срабатывает на `push` к `main` или к `vesnin/*` веткам (в зависимости от процесса), видит манифест, проверяет его схему, и:
1. Прокидывает `reviewed_by` в GitHub request reviewers.
2. Проставляет label вроде `review:pending` или `review:lgtm` (для машиночитаемости).
3. Если `skip_review: true` и паттерн известен — ставит `review:auto-approved` и даёт сигнал CI на merge.
4. При `BLOCK` или `NEEDS_FIX` — переводит в `review:blocked`, добавляет comment с ссылкой на issue с критикой.

Правило: **merge к `main` работает ТОЛЬКО если label `review:lgtm` или `review:auto-approved`**.

[Математик]: Охватим регуляцию. Новый документ `docs/prompts/TEAMLEAD_REVIEW_REGULATION.md` — описание state machine, схема манифеста, правила auto-skip, взаимодействие с GitHub Actions. И отдельный **`TEAMLEAD_REVIEW_PROMPT.md`** для Cursor — напоминание заполнить манифест перед финализацией PR. Плюс обновление [`CONTRIBUTING.md`](./CONTRIBUTING.md) с диаграммой и примерами.

[Музыкант]: А как это связано с `task:archive` и текущим регистром задач? Сейчас задача живёт в `docs/tasks/registry.json`, потом агент пишет код, потом `yarn task:archive`. Где в этом потоке появляется `review:prepare` и манифест?

[Teamlead]: Вот уточнение: `yarn task:archive <id>` больше не финализирует всё сразу. Вместо этого:

1. **Phase 1: Archive** — `yarn task:archive <id>` переносит задачу в `docs/tasks/archive.json`, создаёт PR-черновик (draft).
2. **Phase 2: Prepare** — `yarn review:prepare <pr|issue>` генерирует `.review-manifest.json`, заполняет его анализом диффа, кладёт в ветку.
3. **Phase 3: Review** — PR выходит из draft, проставляются labels, запрашиваются ревьюеры.
4. **Phase 4: Finalize** — `yarn review:finalize <pr>` после LGTM закрывает PR (merge или rebase).

Все фазы идемпотентны: если запустить `review:prepare` два раза, манифест обновится, но не дублируется.

[Верстальщик]: Нужна помощь с UI обратной связи. Когда PR в статусе `review:pending`, кто видит, что происходит? GitHub dashboard покажет label, но пользователю нужно понять: ждёшь ты Структурщика или Математика? Может, сделать **issue-comment** с таблицей статусов (типа «⏳ Структурщик», «✓ Математик одобрил», «Teamlead зарезервировал решение»)?

[Структурщик]: Комментарий хорош, но вот вопрос — кто его пишет? Скрипт `review:prepare`? И кто обновляет при изменении статуса? Надо чтобы одна система источник правды, иначе comment будет врать. Предлагаю: **GitHub Actions пишет comment один раз** при переходе в `review_requested`, затем **обновляет его** при каждом смене статуса (LGTM / BLOCK / NEEDS_FIX). Исходник правды — манифест в ветке + labels на PR.

[Математик]: Согласен. Также нужны **мотивационные сообщения** для роли: когда PR требует ревью конкретного человека (допустим, Математика), GitHub Actions пишет в comment что-то вроде «@dynin, требуется твоя проверка: изменения в `src/math/fft.ts`, затронуты FFT-алгоритмы». Это явный запрос.

[Teamlead]: Итак, артефакты нового процесса:

| Артефакт | Путь | Когда создаётся | Кто обновляет |
|----------|------|-----------------|---------------|
| Манифест | `.review-manifest.json` | `yarn review:prepare` | скрипт + агент |
| Comment на PR | — | GitHub Actions (after push) | GitHub Actions + manual override |
| Labels на PR | `review:pending` / `review:lgtm` / `review:blocked` | GitHub Actions | GitHub Actions |
| Регуляция | `docs/prompts/TEAMLEAD_REVIEW_REGULATION.md` | Teamlead один раз | Teamlead при изменении процесса |
| Prompt для Cursor | `docs/prompts/TEAMLEAD_REVIEW_PROMPT.md` | один раз | Teamlead + консилиум |

[Музыкант]: А что насчёт **миграции текущих PR и issue**? Будут ли они конвертироваться в новый формат автоматически, или мы оставляем их старым способом и новый процесс срабатывает только на свежих?

[Верстальщик]: Миграция осторожно. Предлагаю:
- Все текущие PR → label `review:legacy` (они живут по старому процессу).
- Новые PR (после внедрения) → новый процесс.
- Поддержка старого и нового параллельно 1 спринт; потом старый выключаем.

[Структурщик]: Теперь **схема манифеста** `.review-manifest.json`:

```json
{
  "version": "1.0",
  "issue_id": "T-042",
  "pr_number": 123,
  "author": "agent-name",
  "title": "Implement harmonic detector service",
  "packages_affected": ["@membrana/harmonic-detector-service", "@membrana/core"],
  "breaks_architecture": false,
  "breaks_design": false,
  "reviewed_by": ["dynin", "vesnin"],
  "skip_roles": [],
  "auto_skip_pattern": null,
  "status": "review_requested",
  "evidence": {
    "unit_tests_pass": true,
    "e2e_tests_pass": true,
    "lint_pass": true,
    "no_circular_deps": true
  },
  "notes": "Harmonic detector ready for alpha testing on edge devices."
}
```

Поля обязательные:
- `version`, `issue_id`, `pr_number`, `author`, `title`.
- `packages_affected` (автоматический анализ диффа).
- `breaks_architecture` (если да → обязателен `reviewed_by: ["vesnin"]`).
- `reviewed_by` и `skip_roles` (агент заполняет с подсказками).
- `status` (machine state).
- `evidence` (результаты CI).

[Математик]: Ещё нужно учесть **асинхронные роли**. Если агент помечает `reviewed_by: ["dynin", "rodchenko"]`, то Teamlead должен видеть, дождались ли мы их feedback? Предлагаю добавить в манифест:

```json
"reviewers_status": {
  "dynin": "pending",
  "rodchenko": "approved",
  "vesnin": "blocked"
}
```

И GitHub Actions обновляет этот объект при комментарии ревьюера (парсит `/lgtm` или `/block` в comment).

[Teamlead]: Верно. Теперь **CLI-команды** и их flow:

```bash
# Phase 1: Archive (задача завершена кодом)
yarn task:archive T-042
→ task уходит в archive.json, PR-draft создаётся

# Phase 2: Prepare (готовим манифест)
yarn review:prepare --issue T-042
# или
yarn review:prepare --pr 123
→ генерирует .review-manifest.json, анализирует diff,
  предлагает reviewed_by / packages_affected

# Phase 3: Review (запрашиваем ревью)
yarn review:request --pr 123
→ убирает draft, проставляет labels, GitHub Actions пишет comment

# Phase 4: Finalize (LGTM и merge)
yarn review:finalize --pr 123
→ проверяет все status == approved/lgtm,
  мерджит PR, закрывает issue, архивирует task

# Утилиты
yarn review:status --pr 123
→ показывает current state, reviewers_status, evidence

yarn review:dry-run --pr 123
→ не коммитит, только показывает, что произойдёт

yarn review:override --pr 123 --status lgtm
→ для Teamlead: принудительно переводит в LGTM (с комментарием)
```

Все команды идемпотентны и проверяют состояние перед действием.

[Верстальщик]: Definition of Done для Phase 1 (Teamlead Review System v1.0):

1. **Регуляция** [`TEAMLEAD_REVIEW_REGULATION.md`](./docs/prompts/TEAMLEAD_REVIEW_REGULATION.md):
   - ✓ State machine (диаграмма + текст).
   - ✓ Схема `.review-manifest.json` (JSON Schema).
   - ✓ Правила auto-skip и паттерны.
   - ✓ Интеграция с GitHub API и Actions.
   - ✓ Примеры (успешный review, BLOCK, skip).

2. **Prompt для Cursor** [`TEAMLEAD_REVIEW_PROMPT.md`](./docs/prompts/TEAMLEAD_REVIEW_PROMPT.md):
   - ✓ Напоминание заполнить манифест.
   - ✓ Примеры `reviewed_by` для разных типов изменений.
   - ✓ Checklist перед `review:request`.

3. **Обновление [`CONTRIBUTING.md`](./CONTRIBUTING.md)**:
   - ✓ Новая секция с диаграммой state machine.
   - ✓ Примеры команд.
   - ✓ Кто может skipnуть review (только Teamlead).

4. **GitHub Actions workflow** (`.github/workflows/review.yml`):
   - ✓ Триггер на push к `main` и `*/`.
   - ✓ Валидация манифеста против JSON Schema.
   - ✓ Проставление labels.
   - ✓ Request reviewers из `reviewed_by`.
   - ✓ Comment с таблицей статусов.
   - ✓ CI-check: не мерджить без `review:lgtm` или `review:auto-approved`.

5. **Скрипты** (`scripts/review.mjs`):
   - ✓ `review:prepare` — diff-анализ, генерация манифеста.
   - ✓ `review:request` — переход из draft.
   - ✓ `review:finalize` — merge + archive.
   - ✓ `review:status` — вывод текущего состояния.
   - ✓ `review:override` — ручное вмешательство Teamlead.
   - ✓ `review:dry-run` — предпросмотр.

6. **Тесты** (`scripts/__tests__/review.test.mjs`):
   - ✓ Успешный путь: archive → prepare → request → finalize.
   - ✓ BLOCK-сценарий: вернуться на правку.
   - ✓ Auto-skip сценарий (только docs).
   - ✓ Идемпотентность (prepare × 2, finalize × 2).
   - ✓ Валидация манифеста (неполный / невалидный).

7. **Миграция**:
   - ✓ Legacy mode: текущие PR помечаются `review:legacy`.
   - ✓ Документ [`REVIEW_MIGRATION_GUIDE.md`](./docs/REVIEW_MIGRATION_GUIDE.md) (1 спринт параллельно, потом old выключаем).

8. **Интеграция с task registry**:
   - ✓ `task:archive` вызывает `review:prepare` автоматически.
   - ✓ Нет дублирования задач (в archive.json нет = в active.json).

[Музыкант]: Я согласен со всем, но очень важно — **пробный run на реальном PR**. Не просто тесты, а реальный проект: выбираем одно из текущих открытых issue, применяем новый процесс, смотрим, работает ли GitHub Actions, не падает ли парсинг диффа, понимает ли Teamlead comment. Если есть проблемы — оседлаем до продакшена.

[Структурщик]: Пробный run — Phase 0, перед полным внедрением. Выбираем небольшую задачу типа добавления типа или рефакторинга в одном пакете. Запускаем новый процесс параллельно со старым (без force-замены), собираем feedback.

[Teamlead]: **Итоговое решение консилиума:**

| Вопрос | Решение |
|--------|---------|
| State machine review? | Fail-closed: 5 state (implementation_ready → preparation_pending → review_requested → LGTM/BLOCK/NEEDS_FIX → merged). Диаграмма + текст в регуляции. |
| Machine-readable manifest? | `.review-manifest.json` в корне / `docs/reviews/`, JSON Schema, обязательные поля: issue_id, packages_affected, breaks_architecture, reviewed_by. |
| Auto-skip mechanism? | Разрешены паттерны (docs-only, types-only, tests-only); явные в CONTRIBUTING.md; только для skip_review = true + известный паттерн. Teamlead может override. |
| GitHub integration? | GitHub Actions парсит манифест, проставляет labels (review:pending / review:lgtm / review:blocked), request reviewers, пишет comment с таблицей. Merge блокируется без review:lgtm. |
| CLI-команды? | yarn review:prepare / review:request / review:finalize / review:status / review:override / review:dry-run. Идемпотентны. |
| New prompts / regulations? | TEAMLEAD_REVIEW_REGULATION.md (state machine + schema + examples) + TEAMLEAD_REVIEW_PROMPT.md (для Cursor); обновление CONTRIBUTING.md. |
| task:archive integration? | task:archive T-042 теперь вызывает review:prepare автоматически (не требует ручного yarning). |
| Migratio strategy? | Legacy mode (label review:legacy для текущих PR) параллельно 1 спринт; потом старый выключаем. Начнём с пробного run на одной задаче. |
| Roles & evidence? | reviewed_by = явный список ролей; reviewers_status = {role: pending/approved/blocked}; evidence = unit/e2e/lint/deps CI-поля. |
| Fail-closed guarantee? | Merge требует label review:lgtm или review:auto-approved; ветка в GitHub требует review-check; без одобрения Teamlead (явно или через auto-skip) — не идёт в main. |

---

## Итоговое решение консилиума

| Аспект | Решение |
|--------|---------|
| **State machine** | 5-state (implementation_ready → preparation_pending → review_requested → LGTM/BLOCK/NEEDS_FIX → merged); fail-closed (без LGTM не мерджится) |
| **Machine-readable manifest** | `.review-manifest.json` в корне; JSON Schema; обязательные: issue_id, packages_affected, breaks_architecture, reviewed_by, status, evidence |
| **Auto-skip** | Явные паттерны (docs-only, types-only, tests-only) в CONTRIBUTING.md; требует skip_review:true + известный паттерн; Teamlead может overridе |
| **GitHub Actions** | Триггер на push; валидация манифеста; labels (review:pending/lgtm/blocked); request reviewers; comment с таблицей; блок merge без review:lgtm |
| **CLI-команды** | yarn review:prepare (diff-анализ, манифест) / review:request (выход из draft, labels) / review:finalize (merge + archive) / review:status / review:override / review:dry-run; все идемпотентны |
| **Документация** | TEAMLEAD_REVIEW_REGULATION.md (диаграмма, schema, примеры) + TEAMLEAD_REVIEW_PROMPT.md (напоминание Cursor) + обновление CONTRIBUTING.md |
| **task:archive интеграция** | yarn task:archive T-042 автоматически вызывает review:prepare; не требует ручного запуска |
| **Миграция** | Legacy mode (review:legacy для текущих PR); параллельно 1 спринт; пробный run на одной задаче перед продакшеном |
| **Reviewers tracking** | reviewed_by (явный список ролей); reviewers_status объект {role: pending/approved/blocked}; обновляется GitHub Actions при комментариях |
| **Fail-closed** | Merge требует review:lgtm или review:auto-approved label; ветка require-review check в GitHub; без явного одобрения Teamlead или валидного skip — код не идёт в main |

**Definition of Done:**

1. **Регуляция & промпты:**
   - [ ] `docs/prompts/TEAMLEAD_REVIEW_REGULATION.md` — state machine (диаграмма + текст), schema `.review-manifest.json`, правила auto-skip, GitHub integration, примеры.
   - [ ] `docs/prompts/TEAMLEAD_REVIEW_PROMPT.md` — для Cursor: напоминание манифеста, checklist, примеры reviewed_by.
   - [ ] Обновлена [`CONTRIBUTING.md`](./CONTRIBUTING.md) с диаграммой state machine, примерами команд, migration notes.

2. **GitHub Actions workflow:**
   - [ ] `.github/workflows/review.yml` — триггер, валидация, labels, request reviewers, comment, CI-check.
   - [ ] JSON Schema валидации (`docs/schemas/review-manifest.schema.json`).

3. **CLI-скрипты:**
   - [ ] `scripts/review.mjs` — review:prepare / request / finalize / status / override / dry-run.
   - [ ] Интеграция с `task:archive` (автоматический `review:prepare` call).

4. **Тесты:**
   - [ ] `scripts/__tests__/review.test.mjs` — успешный путь, BLOCK, auto-skip, идемпотентность, валидация.

5. **Миграция:**
   - [ ] `docs/REVIEW_MIGRATION_GUIDE.md` — legacy mode, параллель 1 спринт, переключение.
   - [ ] **Пробный run** на одной реальной задаче (Phase 0 перед продакшеном).

6. **Интеграция:**
   - [ ] task:archive→review:prepare связь работает.
   - [ ] GitHub API calls работают (require-check, labels, reviewers).
   - [ ] Нет дублирования задач в registry.

---

*Реплик в диалоге: 25; каждый участник высказался минимум дважды; консенсус достигнут.*
