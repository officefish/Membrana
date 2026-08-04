# Промпт: Деплой как процедура с прогонами: две процедуры по серверам (office-VDS, media-VPS) + врезка журнала в боевые глаголы

> **Task-промпт** карточки `deploy-procedures`. Размер: **M**. Ожидаемый артефакт: **1 PR**.
> Реестр: `id` = `deploy-procedures` в [`docs/tasks/registry.json`](../tasks/registry.json).
>
> **Статус: исполнен спринтом в день постановки (04.08).** Этот файл — указатель,
> не вторая копия постановки: спринт был поставлен и прожит одной сессией, носители
> истины ниже.

## Носители

| Что | Где |
|-----|-----|
| Слово владельца и нарезка (3 блока, ратификация 16:26Z) | [`docs/sprint/cut/deploy-procedures.json`](../sprint/cut/deploy-procedures.json) |
| Прогон спринта и итог блоков | [`docs/local-sprint/deploy-procedures/OPEN.md`](../local-sprint/deploy-procedures/OPEN.md) |
| Канон формы узла (ACCEPTED, амандмент Р1) | [`docs/adr/ADR-0023-deploy-node-form-one-procedure-per-echelon.md`](../adr/ADR-0023-deploy-node-form-one-procedure-per-echelon.md) |
| Процедуры | [`docs/procedures/deploy-office-vds/`](../procedures/deploy-office-vds/README.md) · [`docs/procedures/deploy-media-vps/`](../procedures/deploy-media-vps/README.md) |
| Движок прогона | [`scripts/deploy-run.mjs`](../../scripts/deploy-run.mjs) (+ зубы `deploy-run.test.mjs`, `deploy-wiring.test.mjs`) |

## Что дальше (вне карточки)

- Первый живой прогон — при первой выкладке рукой владельца (`cabinet:deploy:prod` /
  `vds:run` пишут прогон сами).
- Посервисные специализации процедур — «со временем конкретизируем», слово владельца.
- Дрейф-smoke для media-VPS (Р5), разбор осадка ssh-скриптов (Р4) — отдельные заходы.
