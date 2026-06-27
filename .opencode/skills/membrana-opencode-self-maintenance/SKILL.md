---
name: membrana-opencode-self-maintenance
description: "Maintains the Membrana OpenCode layer itself: how to add or fix a skill (.opencode/skills/<name>/SKILL.md), a command (.opencode/command/<name>.md), an agent (.opencode/agents + prompts), and opencode.json (instructions, skills.paths, references). Use when the user wants to add/edit an OpenCode skill or command, fix OpenCode config, register a new operator workflow, or mentions opencode.json, .opencode, SKILL.md format, or command auto-discovery. Do NOT use for running rituals (membrana-developer-rhythm) or domain skills."
---
# Membrana OpenCode self-maintenance

Канон: [`opencode.json`](../../../opencode.json) · эталоны: `.opencode/skills/membrana-task-lifecycle/SKILL.md`, `.opencode/agents/membrana-review.md`.

**Владелец:** **Структурщик** + **Верстальщик** — структура `.opencode/`, читаемость для агента.

## When to use

- Добавить/починить OpenCode **skill**, **command**, **agent** или **config**.
- Зарегистрировать новый operator-workflow в OpenCode-слое.
- Пользователь: «opencode.json», «.opencode», «формат SKILL.md», «auto-discovery команд».

## When NOT to use

- Запуск ритуалов → `membrana-developer-rhythm`.
- Доменные задачи (device-board, audio, detectors) → соответствующие skills.

## Структура `.opencode/`

```text
.opencode/
  skills/<name>/SKILL.md     # frontmatter name+description + body
  command/<name>.md          # frontmatter description + body-промпт (auto-discovered)
  agents/<name>.md           # frontmatter (mode, model, permission) + {file:prompt}
  prompts/<name>.txt         # тело промпта агента
opencode.json                # instructions, skills.paths, references, plugin
```

## Добавить skill

1. `mkdir .opencode/skills/membrana-<name>` → `SKILL.md`.
2. Frontmatter: `name` (== имя директории), `description` — триггеры **и** «Do NOT use … (другой skill)».
3. Body: `When to use` / `When NOT to use` / `Commands` (таблица) / `Agent workflow`.
4. `skills.paths` в `opencode.json` уже включает `.opencode/skills` — доп. правок не нужно.

## Добавить command

1. `.opencode/command/<name>.md` с frontmatter `description` (+ опц. `agent`, `model`).
2. Body — промпт-инструкция; обёртывай **существующий** `yarn`-скрипт, без новой логики.
3. Авто-дискаверинг: OpenCode подхватывает `.opencode/command/*.md` без правок config.

## Добавить agent

1. `.opencode/agents/<name>.md` — frontmatter (`mode: subagent`, `model`, `permission`), тело `{file:./.opencode/prompts/<name>.txt}`.
2. Создай `.opencode/prompts/<name>.txt`.

## Verify

```bash
node -e "JSON.parse(require('fs').readFileSync('opencode.json','utf8')); console.log('opencode.json OK')"
ls .opencode/command/*.md
```

## Инварианты

- Команды — **тонкие обёртки** над `package.json` скриптами (D-OC-1).
- Не ломать schema `opencode.json` (валидный JSON, известные поля).
- Описания skills — с явными триггерами и границами («Do NOT use»).
