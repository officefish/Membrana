# WORKTREE_CLASSES — единый словарь классов рабочих деревьев

> Спринт `worktree-hygiene-order` (#717 ⟺ DRU-234). Источники: консилиум
> `tier2-git-hygiene-multi-agent-2026-07-20` (ядро), заседание M1 (K2 lifecycle),
> [ADR-0014](./adr/ADR-0014-worktree-base-branch-sync.md) (K1 синхрон).
> Всё, что считает или гейтит деревья, обязано импортировать значения слов отсюда
> (и из кода-носителя), а не вводить свои.

Две оси — **непересекающиеся словари об одном дереве**. Lifecycle отвечает на
вопрос «жив ли носитель работы» (можно ли снести дерево), синхрон — «свежа ли
позиция» (что делать с базовой веткой). Ни один класс одной оси не выводится из
классов другой; конфликт имён исключён по построению.

## Ось 1 — lifecycle (K2): судьба дерева

Носитель кода: [`scripts/lib/classify-worktree.mjs`](../scripts/lib/classify-worktree.mjs)
(`classifyWorktree`). Потребители: `yarn repo:clean` (снос + отчёт классов),
merge-гейт `pr:ship` (подсказка после мерджа). Вход — карточка `WORKTREE.md`
(поле `kind`) + состояние PR (не `git branch --merged`: squash слепит).

| Класс | Смысл | Действие |
|---|---|---|
| `canon` | каноническое долгоживущее дерево (`main/tooling/product/codex/cursor` — множество закрыто) | сносу не подлежит никогда |
| `sprint-closed` | `kind=sprint` ∧ PR merged/closed ∧ нет незакоммиченного ∧ нет незапушенного | кандидат к сносу — `repo:clean --execute --worktrees` **руками** |
| `sprint-open` | `kind=sprint`, работа жива (открытый PR / нет PR / грязь / незапушенное) | не трогать |
| `unregistered` | дерева нет в `WORKTREE.md`-регистрации | хвост регистрации — разбор человеку |
| `unknown` | состояние PR недоступно (сеть/gh) или detached HEAD | **не сносить** (fail-closed) |

Время в предикате не участвует (кандидат «по возрасту» отвергнут M1: ложное
срабатывание на тихой живой работе).

## Ось 2 — синхрон базы (K1): свежесть позиции против origin/main

Носитель кода: [`scripts/lib/worktree-sync-check.mjs`](../scripts/lib/worktree-sync-check.mjs)
(`checkWorktreeSync`). Потребитель: `yarn worktree:sync` (шаг `ritual:day`).
Область: только легитимные деревья оси 1 (`canon`, `sprint-open`); `main`
исключён (identity). Пороги — `scripts/worktree-sync.config.json`.

| Класс | Смысл | Действие |
|---|---|---|
| `fresh` | behind == 0 | ничего |
| `ff-able` | behind > 0 ∧ чисто ∧ ahead == 0 | авто `git merge --ff-only origin/main` (только canon; громкий лог) |
| `diverged` | ahead > 0 (свои коммиты в базе) | только сигнал: rebase руками, авто-мутация запрещена |
| `dirty` | рабочее дерево грязное | только сигнал владельцу (`\|writers\|≤1`) |

`stale` — не класс, а флаг отчёта (danger-цвет): `behind ≥ 10` ∨ возраст общего
предка `≥ 7 дн` (пороги из конфига). Находка расхождения ≠ ненулевой exit.

## Связь осей

- Ось 1 **поставляет область** оси 2: синхронятся `canon` и `sprint-open`;
  `sprint-closed`/`unregistered` — зона `repo:clean`, не синхрона; `unknown` — ничья
  (ни сноса, ни мутации).
- Ось 2 никогда не влияет на судьбу дерева: `diverged`/`dirty`/`stale` — не повод
  для сноса, только сигнал.

## Регистрация и владение

- Карточка `WORKTREE.md` в корне дерева — носитель различителя `kind: canon | sprint`;
  пишется атомарно при `yarn worktree:bootstrap` (create без записи = хвост).
- `.worktree-owner` — advisory-замок (имя агента + дата) поверх mandatory-lock git
  (разные базовые ветки: `main`, `base/tooling`, `base/product`, `base/codex`,
  `base/cursor` — голые имена конфликтовали бы с пространствами `tooling/*` и т.п.).
- Оба файла per-tree, не версионируются (`.gitignore` + `info/exclude`).
- `gc.auto 0` на общем конфиге: авто-gc при 4 конкурентных агентах запрещён,
  gc — руками и только из main-checkout.
