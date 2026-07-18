---
name: membrana-always-yes
description: >-
  Scoped auto-yes профиль разрешений Claude Code (ADR-0009 Р7): авто-подтверждение
  рабочей поверхности (git/yarn/turbo/node/Edit/Write) при жёстком deny на опасное
  (прод-деплой, force-push, git reset --hard, ssh, close-github, правки @membrana/core).
  По умолчанию включён в ночном спринте, явно включается в дневном — «отойти от
  компьютера». НЕ глобальный --dangerously-skip-permissions. Use при подготовке
  делегированного ночного агента или автономной дневной сессии.
---

# always-yes — scoped auto-yes (ADR-0009 Р7)

Канон решения: [`docs/adr/ADR-0009-night-sprint-delegated-execution.md`](../../../docs/adr/ADR-0009-night-sprint-delegated-execution.md) Р7.
Реализация: [`scripts/always-yes.mjs`](../../../scripts/always-yes.mjs).

## Суть

Чтобы владелец реально **отошёл от компьютера**, агент авто-подтверждает рутину, но
**физически не может** сделать запрещённое. Это НЕ `--dangerously-skip-permissions`:
инварианты держит **механический `deny`**, а не добросовестность агента.

| | Что |
|---|---|
| **allow** (авто-yes) | `Bash(git *)`, `Bash(yarn *)`, `Bash(npx turbo *)`, `Bash(node *)`, `Edit`, `Write` |
| **deny** (жёсткий стоп) | force-push, `git reset --hard`, `*:deploy:prod` (cabinet/office/media/device-board), rollback:prod, `ssh`, `_ssh-office-prod-up`, `task:close-github`, `Edit/Write(packages/core/**)` |

**`deny` > `allow` во ВСЕХ режимах Claude Code** (даже bypass) и проверяется до
режима — поэтому широкий allow безопасен рядом с точечным deny.

## Команды

```bash
yarn always-yes:on       # влить профиль в .claude/settings.local.json
yarn always-yes:off      # снять РОВНО свои записи (ручные allow оператора сохраняются)
yarn always-yes:status   # включён / выключен
```

- Пишет в **локальный** `.claude/settings.local.json` (gitignored) — разрешения это
  машинно-локальный концерн. Источник истины профиля — константа в скрипте (трекается).
- **Разрешения подхватываются при СТАРТЕ сессии** → после `:on` перезапусти Claude Code.
- Идемпотентно; `:off` не трогает ручные разрешения и `env`.

## Ночной спринт — включён ПО УМОЛЧАНИЮ

По ADR-0009 фазы NB исполняет делегированный фоновый субагент. **Субагент наследует
`settings.local.json` координатора** (Claude Code: субагент судится теми же правилами,
что родитель). Поэтому:

1. Координатор перед спавном ночного агента: `yarn always-yes:on`.
2. Спавнит делегата (background, worktree) — тот наследует профиль, идёт автономно.
3. Утром после верификации HANDOFF: `yarn always-yes:off` (если дневная сессия не хочет авто-yes).

Ночь не может задеплоить прод / force-push / тронуть core — `deny` их блокирует без
промпта, а `ask`-подобного человека ночью нет.

## Дневной спринт — ЯВНО

«Ухожу от компьютера на автономный прогон» → `yarn always-yes:on`, перезапуск сессии.
Вернулся / нужен контроль → `yarn always-yes:off`. Прод-деплой при активном профиле
заблокирован намеренно — сними профиль для ручного owner-gated деплоя.

## Границы и безопасность

- **`deny` — backstop (defense-in-depth), не единственная гарантия.** Основной гард
  ночи — жёсткие инварианты в промпте эпика (ADR-0009 Р2).
- **Ведущие wildcard `Bash(*x*)` в Claude Code НЕ надёжны** — прод-команды в deny
  перечислены явными префиксами. **Новый `*:deploy:prod` скрипт — дописать в
  `ALWAYS_YES_PROFILE.deny`** (`scripts/always-yes.mjs`), иначе он попадёт под широкий
  `Bash(yarn *)` allow.
- Скилл сам разрешения не переключает (ограничение Claude Code) — только `yarn`-тумблер.
- Не коммить `.claude/settings.local.json` (gitignored) — профиль локальный.
