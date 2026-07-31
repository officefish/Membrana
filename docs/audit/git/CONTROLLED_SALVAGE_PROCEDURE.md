# Контролируемый salvage branch refs

Каноническая процедура исполнения уже принятых владельцем решений по веткам.
Она продолжает inventory/decompose мастерской и не выносит semantic verdict.

| Инструмент | Роль |
| --- | --- |
| `yarn repo:branches` | заморозить inventory с `baseSha`, `generatedAt`, полными tip SHA |
| `yarn repo:branches:reconcile` | read-only сверить snapshot с текущими refs и twins |
| `yarn repo:branches:apply-plan` | проверить и исполнить ровно одну ref-операцию |
| `yarn repo:branches:closeout` | fail-closed проверить journal и итоговые refs |

Скилл оператора: `membrana-branch-salvage`.
Пример схемы: [`examples/controlled-salvage-plan.example.json`](./examples/controlled-salvage-plan.example.json).

## Шесть фреймов

| # | Frame | Выход / гейт |
| ---: | --- | --- |
| 1 | Freeze snapshot | JSON с base SHA, generatedAt и полным tip каждой ref |
| 2 | Reconcile | unchanged / absent / moved / new и exact / moved twins |
| 3 | Ratify plan | `ownerGate.status=ratified`, evidence, exact tips, protected refs |
| 4 | Prepare one ref | live-tree snapshot и atomic journal event `prepared` |
| 5 | Mutate one ref | одна local или remote ref; batch-пути нет |
| 6 | Post-check / closeout | ref absent, protected unchanged, все live trees без новых tracked deletions |

## Операторский проход

### 1. Freeze

```powershell
yarn repo:branches --json --report docs/audit/git/cache/salvage-snapshot.json
```

Snapshot является evidence, а не разрешением на удаление.

### 2. Reconcile

```powershell
yarn repo:branches:reconcile `
  --snapshot docs/audit/git/cache/salvage-snapshot.json `
  --report docs/audit/git/cache/salvage-reconcile.md
```

`moved`, `new` и moved twin возвращаются в анализ. Дрейф `baseSha` видим в отчёте:
инструмент не подменяет им semantic verdict и не обновляет plan автоматически.

### 3. Ratify

Человек создаёт plan по схеме примера. Для каждой цели обязательны:

- полный ref (`refs/heads/...` или `refs/remotes/origin/...`);
- полный 40-символьный `expectedTip`;
- согласованное с ref действие;
- verdict и evidence;
- общий список `protectedRefs`;
- `ownerGate.status=ratified`, `ratifiedBy`, время и evidence ратификации.

После первого journal event plan неизменяем: journal хранит SHA-256 его
канонического JSON. Любая правка plan делает продолжение невозможным.

### 4–6. Одна цель

Dry-run по умолчанию:

```powershell
yarn repo:branches:apply-plan `
  --plan docs/audit/git/cache/salvage-plan.json `
  --journal docs/audit/git/cache/salvage-journal.json `
  --target refs/heads/example
```

Исполнение требует report:

```powershell
yarn repo:branches:apply-plan `
  --plan docs/audit/git/cache/salvage-plan.json `
  --journal docs/audit/git/cache/salvage-journal.json `
  --target refs/heads/example `
  --execute `
  --report docs/audit/git/cache/salvage-example.md
```

Вместо `--target` допустим `--next`; одновременно их передавать нельзя.
Один запуск может мутировать не более одной ref.

До мутации процедура проверяет exact tip, held worktree и protected refs, затем
атомарно пишет `prepared`. После мутации она проверяет отсутствие ref,
неизменность protected refs и все живые worktrees по ADR-0020. Любая находка
останавливает контур и остаётся в journal.

Если процесс упал после delete, повтор с той же целью увидит `prepared` и
отсутствующую ref, выполнит post-check и запишет terminal `recovered-deleted`.
Повторно удалять ref он не будет.

## Closeout

```powershell
yarn repo:branches:closeout `
  --plan docs/audit/git/cache/salvage-plan.json `
  --journal docs/audit/git/cache/salvage-journal.json `
  --report docs/audit/git/cache/salvage-closeout.md
```

Closeout завершается ошибкой при несовпадении plan hash, незакрытом `prepared`,
красном terminal event, сохранившейся target ref или дрейфе protected ref.
Отчёт воспроизводит количество целей, мутаций и live-tree checks.

## Жёсткие границы

- Worktree не удаляется этой процедурой.
- `main`, `master`, `base/*` и persona refs защищены схемой и не могут быть target.
- Нет batch execute, force-push, cherry-pick и автоматического semantic verdict.
- Короткий или сдвинувшийся SHA не принимается.
- Moved twin требует нового plan; старый target не переносится.
- После ADR-0020 finding продолжение запрещено.
- `cache/**` не коммитится; tracked example описывает только восстанавливаемую схему.
