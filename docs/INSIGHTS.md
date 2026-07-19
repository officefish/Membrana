# Инсайты (Insights)

Стратегический backlog крупных идей — **вне** дневного ритуала, с весом для [`STRATEGIC_PLAN_WEEK.md`](./STRATEGIC_PLAN_WEEK.md).

| Документ | Назначение |
|----------|------------|
| [`prompts/INSIGHT_REGULATION.md`](./prompts/INSIGHT_REGULATION.md) | регламент процесса |
| [`insights/registry.json`](./insights/registry.json) | индекс (машиночитаемый) |
| [`insights/README.md`](./insights/README.md) | структура папок |
| [`prompts/INSIGHT_PROCESS_SPRINT_PROMPT.md`](./prompts/INSIGHT_PROCESS_SPRINT_PROMPT.md) | спринт регистрации (closed) |

## Команды

```bash
yarn insight help
yarn insight create <slug> --title "…" [--source user|virtual-team-<role>]
yarn insight list
yarn insight research <id>
yarn insight review <id>
yarn insight close <id> --status adopted|deferred|rejected
yarn insight archive <id> --task <task-id> --result "…" [--execute]
```

Skill: [`.cursor/skills/membrana-insight/SKILL.md`](../.cursor/skills/membrana-insight/SKILL.md)

## Жизненный цикл

```text
draft → researched → reviewed → adopted | deferred | rejected → archived
```

`adopted` означает «идея принята», а не «реализация завершена». `archived` ставится
только evidence-gated командой после архивирования связанных задач и проверки живых
PR/worktree; артефакты инсайта не удаляются.

## Реестр (2026-06-29)

| ID | Тема | Статус | Weight | Горизонт |
|----|------|--------|--------|----------|
| `insight-operator-smoke-ci-gate` | Operator smoke pre-merge gate | archived | 7.0 | week |
| `insight-async-v2-product-narrative` | Async topology как продуктовая история | archived | 6.6 | month |
| `insight-competition-catalog-pipeline` | Competition → catalog pipeline | archived | 6.6 | week |
| `insight-loop-engineering-competition-test` | Loop engineering + breakpoints | deferred | 6.8 | month |
| `insight-agent-scenario-builder` | AI-агент UserCase (3 режима, токены) | adopted | 7.8 | quarter |
| `insight-slide-fullscreen-presentation` | Slide object + fullscreen slides + export | adopted | 7.8 | month |
| `insight-server-forwarding` | Server forwarding + RAG + cabinet tokens | adopted | 7.8 | quarter |
| `insight-sunrise-flash` | Sunrise flash 06:00, topic cloud, news digest | adopted | 6.6 | month |
| `insight-task-archive-storage` | Хранилище архива задач: append-only vs Postgres | **adopted** | 7.6 | week |
| `insight-sessions-archive` | Архивация сессий AI-агентов | **adopted** | 6.8 | quarter |
| `insight-ghost-task-closure-invariant` | Issue closure must account for every active registry child | draft | 8.2 | week |

### Виртуальная команда (2026-06-25)

| ID | Роль | Weight |
|----|------|--------|
| `insight-vesnin-adopted-epic-bridge` | Vesnin (Teamlead) | 7.0 | **epic-candidate** → 2026-06-26 |
| `insight-ozhegov-server-function-registry` | Ozhegov (Структурщик) | 7.4 |
| `insight-dynin-chain-log-golden-oracle` | Dynin (Математик) | 7.2 |
| `insight-kuryokhin-recorder-session-fsm` | Kuryokhin (Музыкант) | 7.2 |
| `insight-rodchenko-operator-density-mode` | Rodchenko (Верстальщик) | 7.0 |

### MCP Tooling consilium (2026-06-27)

| ID | Тема | Статус | Weight |
|----|------|--------|--------|
| `insight-mcp-searxng-private-search` | SearXNG keyless приватный поиск | draft | — |
| `insight-mcp-hindsight-agent-memory` | Hindsight обучающаяся память агента | draft | — |

Полный индекс: [`insights/registry.json`](./insights/registry.json).

## Источники

| `source` | Кто инициирует |
|----------|----------------|
| `user` | Teamlead / пользователь в чате |
| `consilium` | Консилиум виртуальной команды |
| `packaging-epic` | Пилот из эпика (G–I) |
| `virtual-team-vesnin` | Teamlead (Vesnin) |
| `virtual-team-ozhegov` | Структурщик |
| `virtual-team-dynin` | Математик |
| `virtual-team-kuryokhin` | Музыкант |
| `virtual-team-rodchenko` | Верстальщик |

**Инсайты команды:** каждая роль формулирует идею в своей зоне; агент создаёт `insight create … --source virtual-team-<role>`, затем тот же цикл research → review (все 5 ролей голосуют). См. [`INSIGHT_REGULATION.md`](./prompts/INSIGHT_REGULATION.md) § Team insights.
