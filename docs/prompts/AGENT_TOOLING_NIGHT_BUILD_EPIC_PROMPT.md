# Night Build: инструменты агента (agent-tooling)

| Поле | Значение |
|------|----------|
| **Epic id** | `agent-tooling-night-build` |
| **sprintKind** | `night-build` |
| **Дата** | ночь 2026-07-08 |
| **Ветка** | `night/agent-tooling-night-build-2026-07-08` (base `main`) |
| **Контекст** | По итогам плотной сессии 2026-07-08 (~26 PR): точки трения агента — ручной PR-флоу, stale-dist, autostash ревью-артефакта, дубль wire-контракта, слепые ритуалы. Ночь добавляет tooling, чтобы следующие сессии шли быстрее и без класса этих ошибок. |

---

## Night Build — промпт целиком

Добавить агентский tooling (скрипты/хуки/скиллы). **Инвариант ночи:** работа на
`night/`-ветке; опасные скрипты (`pr:ship`, `deploy:when-green`) — только с `--dry-run`
по умолчанию, проверка на synthetic; **ночь НЕ мёржит в main и НЕ деплоит** — HANDOFF
человеку утром. Каждый новый скрипт — с unit-тестом и регистрацией в `test:scripts`.

### In scope (фазы)

| Фаза | Что | Файлы | Lead / Support |
|------|-----|-------|----------------|
| **NB0 Gate** | Baseline scoped CI (`test:scripts` + client) зелёный; заморозить конвенции (commit-trailer, ветка `night/`, PR-флоу). Кода нет. | — | Vesnin / Ozhegov |
| **NB1** | `.gitignore` `docs/discussions/uncommitted-code-review.md` (артефакт `code-review --uncommitted`) — убрать autostash-трение | `.gitignore` | Ozhegov |
| **NB2** | `yarn pr:ship` — ветка+commit+push+PR+squash-merge+ff-sync (autostash-safe). Default `--dry-run`, гуарды (не на main, clean после). Тест на synthetic. | `scripts/pr-ship.mjs`(+test), `package.json` | Ozhegov / Vesnin |
| **NB3** | `yarn build:affected` — turbo `--filter` пересборка dist изменённых `@membrana/*` перед typecheck/тестом (kill stale-dist) | `scripts/build-affected.mjs`(+test), `package.json` | Ozhegov |
| **NB4** | `yarn verify:wire-sync` — core-ESM ↔ `background-cabinet` CJS wire-копия синхронны (event-types + BoardScenarioListItem); в pre-push | `scripts/verify-wire-sync.mjs`(+test), `.githooks/pre-push`, `package.json` | Ozhegov / Dynin |
| **NB5** | Сузить pre-push typecheck до affected (turbo `--filter`) + `commit-msg` хук (Co-Authored-By трейлер + conventional) | `.githooks/pre-push`, `.githooks/commit-msg` | Ozhegov |
| **NB6** | `yarn deploy:when-green` (ждать CI green на HEAD → **печатать** команду, не авто-деплой) + `yarn prisma:migration <name>` (оффлайн migrate-diff из git-схемы) | `scripts/deploy-when-green.mjs`, `scripts/prisma-migration-new.mjs`(+tests), `package.json` | Ozhegov / Dynin |
| **NB7** | `yarn tasks:archive-closed` (архив карточек с закрытыми GH-иссью, `--dry-run` default) + `lib/git-day-context.mjs` (общий «работа за сегодня» для review/feedback/plan) | `scripts/tasks-archive-closed.mjs`(+test), `scripts/lib/git-day-context.mjs` | Ozhegov / Vesnin |
| **NB8** | Docs (`AGENTS.md` — новые скрипты/хуки) + тонкие скиллы `membrana-ship` и `membrana-tooling-doctor` | `AGENTS.md`, `.claude/skills/*`, `.cursor/skills/*` | Vesnin / Ozhegov |

### Out of scope (ночью не трогать)

- Реальные merge/deploy/push-в-main (`pr:ship`/`deploy:when-green` — только dry-run/synthetic).
- Прод-SSH; `task:close-github`; новые GitHub Issue.
- Продуктовый код: `@membrana/core` контракты, `agenda`, `MembranaRegistry`, UI. Только tooling.

### Stop rules

- 2 подряд падения scoped CI → checkpoint `fail`, стоп фазы, блокер в HANDOFF.
- Любой скрипт без `--dry-run`-дефолта, делающий необратимое → стоп, не коммитить.
- Ночь **не мёржит в main** и **не деплоит** — только night-ветка + HANDOFF.

### Чекпоинты (после каждой фазы)

```bash
yarn test:scripts
yarn turbo run lint typecheck --continue --filter=<изменённый пакет>
```
Новый скрипт без unit-теста в `test:scripts` = фаза не закрыта.
