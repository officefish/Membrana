## Контекст

В рабочем дереве `main` накопилось **131 изменение** (`git status --short`): 80 modified, 48 untracked, 2 deleted; суммарный дифф **83 файла, +1387 / −2743**.

Значительная часть — **уже завершённая, но не закоммиченная работа** (миграция `docs-actions-phase-a` помечена `closed`, а её правки висят в дереве; архивы задач `da-*/oc-*/wc-*` лежат untracked).

Отдельно — **риск утечки секрета:** `.env.llm-proxy` лежит untracked и **не покрыт `.gitignore`** → один `git add .` отправит его в историю.

## Идея решения

Гигиенический спринт за 6 фаз (детали и команды — в [`docs/day-sprint/repo-leveling-2026-06-27/OPEN.md`](../blob/main/docs/day-sprint/repo-leveling-2026-06-27/OPEN.md)):

A risk-gate (gitignore secret) → B чистка мусора/дублей → C коммит docs-actions миграции → D коммит готовой работы группами → E сверка sprint-ledger → F verify & seal.

Полная спецификация для агента: [`docs/prompts/REPO_LEVELING_SPRINT_PROMPT.md`](../blob/main/docs/prompts/REPO_LEVELING_SPRINT_PROMPT.md). Реестр: `id` = `repo-leveling`.

## Acceptance criteria

- [ ] `.env.llm-proxy` в `.gitignore`; `git check-ignore` подтверждает; секрета нет в индексе/истории.
- [ ] Артефакты client (`playwright-report/`, `test-results/`), root-логи и дубликаты `device-scenario-*(6/7/8).json` убраны/игнорируются.
- [ ] Миграция docs-actions закоммичена одной атомарной единицей; внутренние ссылки не битые.
- [ ] Готовая работа (архивы+registry, промпты, discussions, тулинг) закоммичена логичными группами; `git status` чистый.
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный; `yarn rag:evening-index` выполнен.

## Связь с дорожной картой

Готовит почву под `dpr-dr0-git-hygiene-gate` (DR0 — gate чистого рабочего дерева в деплое).
