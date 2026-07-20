# Replit-мост: задание из репозитория → работа в apps/demos

Петля «отправить Replit-агенту задание из репо, вернуть работу в `apps/demos/`».

## Почему через git, а не «API Replit»

У Replit-агента **нет стабильного публичного API** для приёма задания из кода
(программный вызов агента — открытая фича-реквеста, не продукт, на июль 2026). Поэтому
транспорт — **git через сам репозиторий**. Repl подключён к этому GitHub-репо; задание
уезжает веткой, работа возвращается той же веткой. Твой SSH на Replit — это git-креденшл
Repl↔GitHub, отдельно от кредитов агента; отдельный «API-ключ» не нужен.

## Требования

- Repl подключён к `officefish/Membrana` (Version Control → Connect to GitHub) и умеет
  push/pull (Replit не автосинкает — pull перед работой, push после).
- Кредиты Replit-агента пополнены (для самой сборки).

## Петля

```
┌── у тебя (репо) ──────────────┐        ┌── Replit (Repl = этот репо) ──┐
│ yarn replit:task <slug> "..." │──push─▶│ git pull; агент строит в       │
│   → docs/replit-tasks/<slug>  │ ветка  │   apps/demos/<demo>/; commit;  │
│   → ветка replit/<slug>       │◀─push──│   push той же ветки            │
│ yarn replit:pull-demo <slug>  │        └────────────────────────────────┘
│   → apps/demos/<demo>/ + wsp  │
│   → review → PR               │
└───────────────────────────────┘
```

### 1. Отправить задание

```bash
yarn replit:task <slug> "текст задания"           # демо-имя = slug
yarn replit:task <slug> --demo MyDemo --brief-file docs/brief.md
yarn replit:task <slug> "..." --dry-run           # превью брифа без ветки/пуша
```

Кладёт бриф в `docs/replit-tasks/<slug>.md` (с жёсткими рамками: строить ТОЛЬКО внутри
`apps/demos/<demo>/`, стек-канон из `apps/demos/Research-Tree/DEMO_STACK.md`) и пушит
ветку `replit/<slug>`. Ветка создаётся в изолированном worktree — твоё рабочее дерево не
трогается.

### 2. В Replit

```bash
git fetch && git checkout replit/<slug> && git pull
```

Агенту: «Построй по `docs/replit-tasks/<slug>.md`. Всё строго внутри
`apps/demos/<demo>/`». Агент коммитит и пушит **ту же ветку**.

### 3. Забрать работу

```bash
yarn replit:pull-demo <slug> [demoName]
```

Тянет ветку, переносит `apps/demos/<demo>/` в рабочее дерево, регистрирует воркспейс в
`package.json` (`apps/demos/*` тут НЕ вайлдкард — каждый демо поимённо). Оставляет
**застейдженным** — ревью/коммит/PR за тобой. Ничего не коммитит и не мёржит сам.

Дальше: `yarn install` → `yarn workspace @membrana/<demo>-demo build` → code-review →
коммит поимённо → PR.

## Рамки, встроенные в бриф

Агент **обязан** строить только внутри своей папки и в каноне стека — иначе работу
нельзя слить без конфликтов с корнем монорепо. Регистрацию воркспейса делает
`replit:pull-demo` на твоей стороне, не агент.
