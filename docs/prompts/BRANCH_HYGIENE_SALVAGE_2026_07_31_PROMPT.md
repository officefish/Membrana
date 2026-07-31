# Промпт: Разобрать diverged-ветки и сохранить живые коммиты

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **L**, отдельный санитарный спринт.
> Ожидаемый артефакт: **1 audit PR + N delivery PR** только для подтверждённо живых изменений.
> Реестр: `id` = `branch-hygiene-salvage-2026-07-31` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

В репозитории накопилось более 50 diverged-веток с `ahead > 0`, без открытого PR и
вердиктом декомпозера `salvage commits first`. Во многих ветках остался один невлитый
коммит: это может быть как уже перекрытая через squash-merge работа, так и потерянная
доставка. Возраст, имя ветки и `git branch --merged` не являются доказательством.

Нужно построить воспроизводимый реестр и дать каждой ветке один из четырёх вердиктов:
`уже в main`, `живая — влить`, `сломана/устарела — списать`, `нужна доработка`.
Для `уже в main` обязательно указать SHA или PR в `main`; для остальных — SHA
невлитых коммитов и предметное объяснение. Ветки
`ritual/day-2026-07-30` и `ritual/evening-2026-07-29` владелец закрывает отдельно.

**GitHub Issue:** [#1544](https://github.com/officefish/Membrana/issues/1544)

**Связанные документы:**

| Документ | Зачем |
|----------|-------|
| [`../audit/git/AGENT_PROMPT.md`](../audit/git/AGENT_PROMPT.md) | Scenario A и Scenario B category 7 |
| [`../audit/git/README.md`](../audit/git/README.md) | Контракт контейнера git-аудита |
| [`../adr/ADR-0020-worktree-removal-is-controlled-demolition.md`](../adr/ADR-0020-worktree-removal-is-controlled-demolition.md) | Owner-gate и пост-чек после каждого удаления |
| [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) | Регистрация и доставка L-задачи |
| [`CODE_REVIEW_REGULATION.md`](./CODE_REVIEW_REGULATION.md) | Обязательное ревью delivery PR |

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — координатор санитарного L-спринта Membrana под руководством Vesnin
(Teamlead). Работаешь от сохранённого снимка, отделяешь факты Git/GitHub от
эвристик и не удаляешь ветки до явной ратификации владельца.

### Что построить

1. Обновить канонический inventory через `yarn repo:branches`.
2. Пересобрать `docs/audit/git/registry/BRANCHES_DECOMPOSE_LIST.md` командой
   `yarn repo:branches:decompose`.
3. Выполнить Scenario B для category 7 из сохранённого реестра, не пересобирая
   membership вручную.
4. Для каждой salvage-ветки записать ровно один итоговый вердикт и обязательное
   свидетельство.
5. Для закрытого PR применить `membrana-pr-audit`; для живых изменений готовить
   отдельную свежую delivery-ветку от `origin/main`, не оживлять старую ветку
   force-push.
6. После ратификации владельца удалять только подтверждённо перекрытые/списанные
   ветки, по одной, с пост-чеком после каждой операции.

### Контракт артефактов

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Current registry | `docs/audit/git/registry/BRANCHES_DECOMPOSE_LIST.md` | Семь hygiene-категорий, base SHA и totals |
| Dated registry | `docs/audit/git/registry/BRANCHES_DECOMPOSE_LIST-2026-07-31.md` | Неизменяемый исходный снимок спринта |
| Deep analysis | `docs/audit/git/analysis/category-7-attention-2026-07-31.md` | A1–A4 по членам category 7 |
| Verdict ledger | `docs/audit/git/analysis/category-7-salvage-verdicts-2026-07-31.md` | Ветка, commit SHA, verdict, evidence, action |
| Raw cache | `docs/audit/git/cache/` | Gitignored диагностические данные |

**Допустимые вердикты:**

| Вердикт | Минимальное свидетельство |
|---------|---------------------------|
| Уже в `main` | SHA/PR в `main` и совпадающий предмет/patch |
| Живая — влить | SHA невлитых коммитов, применимость к свежему `main`, план delivery PR |
| Сломана/устарела — списать | SHA и проверяемая причина несовместимости/утраты смысла |
| Нужна доработка | SHA, конкретный разрыв контракта и следующий шаг |

**Запрещено:**

- использовать `git branch --merged` как источник истины;
- считать возраст, имя ветки или `ahead == 1` доказательством;
- трогать persona-, baseline-, worktree-active- и open-PR ветки;
- трогать `ritual/day-2026-07-30` и `ritual/evening-2026-07-29`;
- удалять ветку или worktree без отдельного owner-gate;
- удалять несколько целей одним execute-проходом;
- force-push и доставка с устаревшей базы;
- менять продуктовый код «заодно».

### Проверки

| Область | Минимум |
|---------|---------|
| Worktree truth | `yarn neighbors` |
| Raw inventory | `yarn repo:branches` |
| Seven categories | `yarn repo:branches:decompose --report docs/audit/git/registry/BRANCHES_DECOMPOSE_LIST.md` |
| Snapshot shape | Meta, Summary и семь таблиц присутствуют |
| Salvage membership | Берётся только из сохранённого category 7 |
| PR evidence | Закрытые PR проходят `membrana-pr-audit` |
| Deletion safety | Одна цель → execute → пост-чек всех живых деревьев → следующая цель |
| Audit PR | `yarn code-review:pr <N>` и LGTM Teamlead |

### Definition of Done

- [ ] Issue #1544 и task registry описывают этот L-спринт.
- [ ] Канонический и датированный снимки построены от зафиксированного `origin/main`.
- [ ] Для каждого члена category 7, кроме двух ritual-исключений, есть ровно один вердикт.
- [ ] Каждый вердикт содержит проверяемое SHA/PR-свидетельство.
- [ ] Живые изменения доставлены отдельными PR либо зарегистрированы как `нужна доработка`.
- [ ] Удаления, если ратифицированы, выполнены по одной цели с пост-чеком после каждой.
- [ ] Ни один worktree, persona-, baseline- или open-PR branch не затронут.
- [ ] Audit/delivery PR прошли Teamlead review.

### Out of scope

- `ritual/day-2026-07-30` и `ritual/evening-2026-07-29`;
- продуктовая трёхдневка и изменение `MAIN_DAY_ISSUE.md`;
- массовый `repo:clean --execute`;
- удаление рабочих деревьев;
- рефакторинг найденного кода вне отдельной delivery-задачи.

### Порядок работы ролей

1. **Teamlead** — фиксирует scope, owner-gates и финальные вердикты.
2. **Структурщик** — строит Scenario A/B и проверяет принадлежность category 7.
3. **Математик** — сверяет ahead/behind, patch equivalence и полноту ledger.
4. **Музыкант** — ищет смысловое перекрытие через историю PR и артефактов.
5. **Верстальщик** — проверяет читаемость таблиц, ссылок и доказательств.

---

## Acceptance criteria

- [ ] В ledger нет веток без commit SHA и нет вердиктов «по впечатлению».
- [ ] Для `уже в main` указана ссылка на конкретный PR или main SHA.
- [ ] Для каждого удаления записан отдельный пост-чек; пакетного подтверждения нет.
- [ ] Ritual-исключения присутствуют в Meta и отсутствуют среди действий.
- [ ] Количество итоговых строк сходится с category 7 минус явные исключения.

## Заметки для человека-постановщика

После audit PR владелец отдельно ратифицирует:

1. список веток на удаление;
2. список живых delivery-веток;
3. списание устаревших веток.

До этой ратификации допустимы только read-only аудит и commit-friendly артефакты.

### Проверка после PR

```bash
yarn repo:branches:decompose --no-fetch --report docs/audit/git/registry/BRANCHES_DECOMPOSE_LIST.md
yarn code-review:pr <N>
yarn pr:verify <N>
```

---

## Связь с дорожной картой

- Отдельный санитарный L-спринт; не входит в продуктовую трёхдневку.
- Результат уменьшает потерянную доставку и делает веточную историю доказуемой.
