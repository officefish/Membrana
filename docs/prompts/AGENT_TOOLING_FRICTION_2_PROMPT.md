# Промпт: agent-tooling-friction-2 — 7 инструментов против трения агентских сессий

> **Task-промпт для агента-разработчика.** Размер: **M** (зонтик, 7 независимых ti).
> Реестр: `id` = `agent-tooling-friction-2`. Issue: [#469](https://github.com/officefish/Membrana/issues/469).
> Консилиум-гейт пройден ДО кода: [`agent-tooling-friction-2-2026-07-14.md`](../seanses/agent-tooling-friction-2-2026-07-14.md)
> (22 реплики) + research [`agent-tooling-friction-2-research-2026-07-14.md`](../seanses/agent-tooling-friction-2-research-2026-07-14.md).
> Предшественник: #433 (`AGENT_TOOLING_FRICTION_PROMPT.md`) — форма и уроки наследуются.

## Порядок (дешевле→дороже, мёрж по готовности)

### ti-6 — mojibake/BOM-гард (S)
Расширить `docs:lint`: (а) BOM в `docs/**/*.md` и `scripts/**/*.mjs`; (б) сигнатуры
двойной перекодировки кириллицы («РЎ», «вЂ», «Рё» — биграммы, не встречающиеся в
легитимном тексте). Фикстуры с BOM/кракозябрами в тестах. Триггер: 3 инцидента PS 5.1
за 14.07 (MEMORY.md, review-file BOM, NUL-литерал).

### ti-5 — persona:memory --all + хвост ритуала (S)
Флаг `--all` в `persona-memory-extract.mjs` (цикл по `PERSONA_ROLE_LABELS`, `--check`
для всех). Хвост в `ritual:evening`: ПОСЛЕ `archive:daily-day`, ДО `code-review`,
`|| true`-семантика (сломанный рефреш не роняет ритуал). Журналы впитывают протоколы
дня до вечерней оценки.

### ti-7 — единая ошибка LLM-кредита (S)
Все LLM-обёртки (consilium, ask, insight, code-review, task:review:run,
team-evening-feedback) при «credit balance is too low» печатают одну строку:
`Anthropic без кредита → фолбэк: <--secretary-file | --review-file | --dry>`.
Распознавание по телу ответа; хелпер — общая функция в lib.

### ti-4 — yarn neighbors (S)
Сводка соседних сессий ТОЛЬКО из существующих сигналов: коммиты `origin/main` за N
часов (default 4), открытые PR, active-карточки реестра за сегодня, свежие
remote-ветки, `git worktree list`. Компактная таблица, статус словом, без ANSI.
Координационный файл НЕ вводить — карточка реестра остаётся единственным claim.
+ строка в скилл `membrana-task-lifecycle`: «перед регистрацией — `yarn neighbors`».
Триггер: коллизия скоупа #452/#454.

### ti-3 — yarn task:register (M)
`--id --title --issue --size --kind --lead [--insight]` → валидация полей по схеме
карточки → детерминированная вставка в начало `tasks[]` (конвенция «свежие сверху») →
`insight:drift`-чек. При отказе push: `pull --rebase` + **полная перегенерация
вставки** (ephemeral regeneration, research Q1) — ручной merge исключён.
**Формат registry.json НЕ менять** (миграция = insight task-archive-storage).

### ti-2 — consilium --secretary-file / insight review --review-file (M)
Оффлайн-канал протоколов: скрипт принимает готовый md, валидирует канон чистыми
функциями — (1) метаданные-таблица; (2) реплик `[Роль]:` ≥ min (20/5); (3) каждая
роль ≥1; (4) секция консенсуса/итога; (5) для инсайт-ревью — таблица голосования
парсится, средний балл сходится. Оборачивает метаданными (канал «secretary»),
кладёт в seanses/REVIEW.md той же формой, что API-путь. Регресс-фикстуры — живые
протоколы 14.07 (quality-control-contour, cowork-sprint-format, REVIEW инсайта
office-panel-qa-section) + синтетический невалидный.

### ti-1 — yarn task:review:ship <id> --pr N (M, последним)
One-shot после squash-мёржа, **обёртка** над `lib/task-closure-review.mjs`
(инварианты runner'а — immutable per-SHA, fail-closed evidence — НЕ ослаблять):
1. `gh pr view N --json mergeCommit` → точный squash-SHA; **нет mergeCommit → стоп
   до любых действий с worktree** (fail-closed, TLS-мигания gh — ретрай-подсказка).
2. База = родитель mergeCommit (`git show -s --format=%P`) — НЕ «HEAD перед pull»
   (класс ошибок «чужие коммиты в диапазоне», см. #451 14.07).
3. Main ушёл вперёд → чеки на **detached checkout mergeCommit**, возврат на main.
4. prepare → run (`--check` набор + `--review-file` при недоступном API) → finalize
   → bookkeeping-коммит с rebase-retry.
5. Печать каждого шага хореографии ДО выполнения — при падении на шаге N видно,
   где встал и как докатить руками.
Чистые функции деривации — под тесты на фикстурах gh-ответов; золотой кейс —
живой #451 (merge d452582d, main уехал на 2f9dd521).

## Запреты (консилиум, дословно)

- `lib/task-closure-review.mjs` не переписывать — только обёртка.
- Формат `registry.json` не менять.
- Координационные файлы не вводить.
- Секреты не печатать, `.env` не писать; ship не делает деплоев.
- Out of scope: file-per-entry реестр, cowork:phase/close, LLM-фичи в любом ti.

## DoD (per ti + общий)

- [ ] Каждый ti: тесты в `test:scripts`, вывод «статус словом» без ANSI.
- [ ] `yarn test:scripts` и `yarn docs:lint` зелёные после каждого мёржа.
- [ ] Отчёт в Issue #469; closure review LGTM на финальный SHA.
