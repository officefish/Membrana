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
```

Skill: [`.cursor/skills/membrana-insight/SKILL.md`](../.cursor/skills/membrana-insight/SKILL.md)

## Реестр (2026-06-25)

| ID | Тема | Статус | Weight |
|----|------|--------|--------|
| `insight-operator-smoke-ci-gate` | Operator smoke pre-merge gate | adopted | 7.0 |
| `insight-async-v2-product-narrative` | Async topology как продуктовая история | adopted | 6.6 |
| `insight-competition-catalog-pipeline` | Competition → catalog pipeline | adopted | 6.6 |
| `insight-loop-engineering-competition-test` | Loop engineering + breakpoints | deferred | 6.8 |
| `insight-agent-scenario-builder` | AI-агент UserCase (3 режима, токены) | adopted | 7.8 |
| `insight-slide-fullscreen-presentation` | Slide object + fullscreen slides + export | adopted | 7.8 |
| `insight-server-forwarding` | Server forwarding + RAG + cabinet tokens | adopted | 7.8 |
| `insight-sunrise-flash` | Sunrise flash 06:00, topic cloud, news digest | adopted | 6.6 |

### Виртуальная команда (2026-06-25)

| ID | Роль | Weight |
|----|------|--------|
| `insight-vesnin-adopted-epic-bridge` | Vesnin (Teamlead) | 7.0 | **epic-candidate** → 2026-06-26 |
| `insight-ozhegov-server-function-registry` | Ozhegov (Структурщик) | 7.4 |
| `insight-dynin-chain-log-golden-oracle` | Dynin (Математик) | 7.2 |
| `insight-kuryokhin-recorder-session-fsm` | Kuryokhin (Музыкант) | 7.2 |
| `insight-rodchenko-operator-density-mode` | Rodchenko (Верстальщик) | 7.0 |

Полный индекс: [`insights/registry.json`](./insights/registry.json).

## Источники

| `source` | Кто инициирует |
|----------|----------------|
| `user` | Teamlead / пользователь в чате |
| `packaging-epic` | Пилот из эпика (G–I) |
| `virtual-team-vesnin` | Teamlead (Vesnin) |
| `virtual-team-ozhegov` | Структурщик |
| `virtual-team-dynin` | Математик |
| `virtual-team-kuryokhin` | Музыкант |
| `virtual-team-rodchenko` | Верстальщик |

**Инсайты команды:** каждая роль формулирует идею в своей зоне; агент создаёт `insight create … --source virtual-team-<role>`, затем тот же цикл research → review (все 5 ролей голосуют). См. [`INSIGHT_REGULATION.md`](./prompts/INSIGHT_REGULATION.md) § Team insights.
