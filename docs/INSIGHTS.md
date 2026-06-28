# Инсайты (Insights)

Стратегический backlog крупных идей — **вне** дневного ритуала, с весом для [`STRATEGIC_PLAN_WEEK.md`](./STRATEGIC_PLAN_WEEK.md).

| Документ | Назначение |
|----------|------------|
| [`prompts/INSIGHT_REGULATION.md`](./prompts/INSIGHT_REGULATION.md) | регламент процесса |
| [`insights/registry.json`](./insights/registry.json) | индекс (машиночитаемый) |

## Жизненный цикл

```text
draft → researched → reviewed → adopted | deferred | rejected
```

## Реестр (2026-06-28)

| ID | Тема | Статус | Weight | Горизонт |
|----|------|--------|--------|----------|
| `insight-sessions-archive` | Архивация сессий AI-агентов | draft | 7.2 | quarter |
| `insight-task-archive-storage` | Хранилище архива задач: append-only vs Postgres | draft | 7.0 | week |

## Источники

| `source` | Кто инициирует |
|----------|----------------|
| `user` | Teamlead / пользователь в чате |
| `consilium` | Консилиум виртуальной команды |
| `packaging-epic` | Пилот из эпика |
| `virtual-team-<role>` | Конкретная роль виртуальной команды |
