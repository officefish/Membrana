# Промпт: Контролируемая процедура salvage веток

> **Task-промпт для агента-разработчика.**
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **M**. Ожидаемый артефакт: один tooling PR.
> Реестр: `branch-salvage-controlled-tooling`.

## Контекст

Спринт #1544 доказал, что `repo:branches` и `repo:branches:decompose` хорошо
строят инвентарь, но между snapshot и ратифицированным удалением нет
канонического контура. Разовая обвязка удалила 182 refs с 2730 ADR-0020
пост-проверками, однако содержала захардкоженный ledger и однажды остановилась
между мутацией и записью события.

Нужно превратить наработку в общую, fail-closed и crash-safe процедуру. Она не
выносит semantic verdict и не удаляет worktree.

**GitHub Issue:** [#1561](https://github.com/officefish/Membrana/issues/1561)

| Документ | Зачем |
| --- | --- |
| [`../audit/git/AGENT_PROMPT.md`](../audit/git/AGENT_PROMPT.md) | Контейнер и Scenario A/B |
| [`../adr/ADR-0020-worktree-removal-is-controlled-demolition.md`](../adr/ADR-0020-worktree-removal-is-controlled-demolition.md) | Пост-чек всех живых деревьев |
| [`CODE_REVIEW_REGULATION.md`](./CODE_REVIEW_REGULATION.md) | Обязательное ревью |
| [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md) | Закрытие задачи |

## Промпт целиком

### Кто ты

Ты координатор tooling-спринта Membrana под руководством Vesnin. Развиваешь
существующий контейнер `docs/audit/git` и не создаёшь второй источник истины.

### Что построить

1. `yarn repo:branches:reconcile` для read-only сверки frozen snapshot с
   текущими refs, moved/new/absent состояниями и local/remote twins.
2. `yarn repo:branches:apply-plan` для исполнения ровно одной ref-операции из
   ратифицированного exact-tip плана.
3. `yarn repo:branches:closeout` для проверки полноты journal и итоговой
   бухгалтерии.
4. Добавить tip SHA, base SHA, generatedAt и явную twin-диагностику в
   существующие inventory/decompose.

### Шесть фреймов

| # | Frame | Гейт |
| ---: | --- | --- |
| 1 | Freeze snapshot | JSON содержит base SHA, generatedAt и tip каждой ref |
| 2 | Reconcile | unchanged / absent / moved / new и exact / moved twins |
| 3 | Ratify plan | owner gate, evidence, exact expected tip, protected refs |
| 4 | Prepare one ref | worktree guard, protected guard, live-tree snapshot, journal `prepared` |
| 5 | Mutate one ref | одна local или remote ref; batch отсутствует |
| 6 | Post-check / closeout | ref absent, protected unchanged, все live trees чисты, terminal event |

### Архитектура

| Слой | Путь | Ответственность |
| --- | --- | --- |
| Pure/state machine | `scripts/lib/branch-salvage-procedure.mjs` | schema, hash, reconcile, one-ref execution, closeout |
| Git/fs adapter | `scripts/lib/branch-salvage-runtime.mjs` | refs, worktrees, atomic journal/report |
| CLI | `scripts/repo-branches-{reconcile,apply-plan,closeout}.mjs` | аргументы и exit codes |
| Existing inventory | `scripts/repo-branches*.mjs`, `scripts/lib/repo-branches*.mjs` | tip/base metadata и twin table |
| Procedure docs | `docs/audit/git/`, branch skills | операторский контракт |

**Запрещено:**

- удалять worktree;
- автоматически решать, что ветка перекрыта или устарела;
- semantic cherry-pick/replay живого кода;
- исполнять больше одной ref-мутации за запуск;
- исполнять план без `ownerGate.status=ratified`;
- принимать короткий или сдвинувшийся SHA;
- продолжать после ADR-0020 finding;
- изменять plan после появления journal с его hash.

### Контракт plan

Plan JSON содержит `schemaVersion`, `id`, frozen `baseSha`, `ownerGate`,
`protectedRefs[]` и `targets[]`. Target задаёт полный ref, полный expected tip,
action (`delete-local-ref` или `delete-remote-ref`), verdict и evidence.

Execute требует `--plan`, `--journal`, `--report`, а также ровно один
`--target <ref>` или `--next`. Dry-run является default.

### Тесты

| Область | Минимум |
| --- | --- |
| Reconcile | unchanged / absent / moved / new; exact и moved twins |
| Plan | schema, ratification, full SHA, action/ref consistency, hash drift |
| Executor | dry-run, exact-tip stop, held stop, one ref, protected refs |
| Recovery | падение после delete оставляет `prepared`; повтор завершает post-check |
| ADR-0020 | missing/error/new tracked deletion останавливают контур |
| Closeout | counts, unresolved prepared, plan hash, protected drift |
| Existing tools | обновлённые inventory/decompose tests |

### Definition of Done

- [ ] M-карточка и Issue #1561 активны.
- [ ] Три команды добавлены в `package.json`, имеют `--help`, JSON и Markdown evidence.
- [ ] `apply-plan --execute` не имеет batch-пути и требует ratified exact-tip plan.
- [ ] Journal пишется atomically до мутации и позволяет recovery.
- [ ] После каждой мутации проверяются все live worktrees и protected refs.
- [ ] `closeout` fail-closed при любом незакрытом/красном событии.
- [ ] `repo:branches:decompose` больше не скрывает twins одним числом.
- [ ] Procedure docs и Cursor/Claude/Agents skill синхронизированы.
- [ ] Script tests, registry sync и scoped lint проходят.
- [ ] Exact-SHA Teamlead review: LGTM.

### Out of scope

- Фактическое удаление refs в рамках тестирования.
- Удаление worktree и расширение `repo:clean`.
- Автоматический поиск смыслового перекрытия в `main`.
- Автоматическое создание/ратификация plan из LLM-вердиктов.
- Доставка живых изменений из старой ветки.

### Порядок ролей

1. **Teamlead** фиксирует owner-gate и запреты.
2. **Структурщик** проверяет один state-machine и отсутствие второго inventory.
3. **Математик** сверяет counts, hash и terminal completeness.
4. **Музыкант** проверяет, что продуктовые/runtime области не затронуты.
5. **Верстальщик** проверяет читаемость evidence и переносимые ссылки.

## Acceptance criteria

- [ ] Повтор реального сбоя «delete прошёл, процесс упал» закрыт тестом recovery.
- [ ] Moved twin никогда не становится delete-target без нового plan.
- [ ] Один вызов execute не может изменить две refs.
- [ ] Closeout воспроизводит число mutating operations и live-tree checks.

## Проверка после PR

```bash
node --test scripts/repo-branches.test.mjs scripts/repo-branches-decompose.test.mjs scripts/branch-salvage-procedure.test.mjs
yarn task:sync-readme --check
yarn code-review:pr <N>
yarn pr:verify <N>
```
