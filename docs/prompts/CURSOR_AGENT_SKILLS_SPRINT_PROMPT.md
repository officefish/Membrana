# Промпт (day sprint · active): Cursor / Claude Code — agent skills для Membrana

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** day-sprint **`cursor-agent-skills-sprint-2026-06-22`**  
> **Предшественник:** анализ gaps (2026-06-22) · docs sprint `device-board-docs-post-140-sprint-2026-06-22` (closed)  
> **Статус:** **closed** (2026-06-22)  
> **Пакет:** `.cursor/skills/`, `.claude/` (mirror), `docs/` (индекс, без дублирования rules)

---

## Контекст

Membrana уже имеет:

| Слой | Что есть |
|------|----------|
| **Rules** | `.cursorrules`, `AGENTS.md` — архитектура, границы пакетов, запреты |
| **Task prompts** | `docs/prompts/*`, реестр, `DEVELOPER_RHYTHM.md` |
| **Скрипты** | `yarn ritual:day`, `standup`, `consilium`, `task:archive`, `usercase`, detectors, MCP phases |
| **Built-in Cursor skills** | `review-bugbot`, `review-security`, `create-skill`, Mintlify/ChatPRD plugins |
| **Project skills** | только `membrana-anthropic-cli` |

**Проблема:** операционные workflow (ритуалы, closure M/L задач, virtual team, audio guard, domain playbooks) живут в markdown-регламентах, но агент **не получает узкие playbooks с триггерами**. Rules = always-on; skills = «когда пользователь просит X — выполни Y в этом порядке».

**Цель спринта:** внедрить **8 фаз** project skills в `.cursor/skills/` + зеркало для Claude Code; не дублировать generic review (Bugbot/Security) и не переносить в skills то, что уже в rules.

---

## Product decisions

| ID | Решение |
|----|---------|
| **D-SK-1** | Skills только в **`.cursor/skills/<name>/SKILL.md`** (project scope); personal (`~/.cursor/skills/`) — вне спринта |
| **D-SK-2** | Один skill = одна ответственность; `description` в frontmatter — **триггер** (когда применять + когда **не** применять) |
| **D-SK-3** | Skills **ссылаются** на канон (`docs/…`), не копируют целиком `ARCHITECTURE.md` / `DEVELOPER_RHYTHM.md` |
| **D-SK-4** | Эталон структуры — Cursor built-in [`create-skill`](../../.cursor/skills-cursor/create-skill/SKILL.md) (читать перед каждой фазой) |
| **D-SK-5** | Claude Code: `.claude/skills/` — **thin mirror** (ссылки на project skills), не второй источник правды |
| **D-SK-6** | P2 skills (`rag-operator`, …) — **stub** с defer, если зависимость не в `main` |

---

## Phases

| Phase | Registry id | Size | DoD summary |
|-------|-------------|------|-------------|
| **S0** | `cs-sk-s0-index-bootstrap` | S | `.cursor/skills/README.md`; pointer в `.cursorrules` / `AGENTS.md`; conventions |
| **S1** | `cs-sk-s1-developer-rhythm` | M | `membrana-developer-rhythm` — ritual:day/evening, standup, main-day-issue, read order |
| **S2** | `cs-sk-s2-task-lifecycle` | M | `membrana-task-lifecycle` — register → work → archive → close-github |
| **S3** | `cs-sk-s3-virtual-team-guards` | M | `membrana-virtual-team` + `membrana-audio-engine-guard` |
| **S4** | `cs-sk-s4-service-scaffold` | S | `membrana-service-scaffold` — `/service` по `docs/SERVICES.md` |
| **S5** | `cs-sk-s5-domain-docs` | M | `membrana-device-board-edit` + `membrana-docs-sync` |
| **S6** | `cs-sk-s6-ops-workflows` | M | `membrana-usercase-generation`, `membrana-background-servers`, `membrana-consilium`, `membrana-night-sprint` |
| **S7** | `cs-sk-s7-claude-mirror` | S | `.claude/CLAUDE.md` + mirror skills; `yarn claude:code` note |
| **S8** | `cs-sk-s8-deferred-stubs` | S | stub: `membrana-rag-operator`, `membrana-detector-benchmark`, `membrana-mcp-workstation` |

**Рекомендуемый порядок:** **S0 → S1 → S2 → S3 → S4 → S5 → S6 → S7 → S8**

---

## Архитектура артефактов

| Слой | Путь | Инструмент |
|------|------|------------|
| Project skills | `.cursor/skills/<kebab-name>/SKILL.md` | Cursor Agent auto-discovery |
| Skills index | `.cursor/skills/README.md` | git |
| Claude mirror | `.claude/skills/*/SKILL.md`, `.claude/CLAUDE.md` | `yarn claude:code` |
| Канон (read-only) | `docs/DEVELOPER_RHYTHM.md`, `TASK_PROMPT_WORKFLOW.md`, `VIRTUAL_TEAM_PROMPT.md` | ссылки из skills |
| Реестр | `docs/tasks/registry.json` | `yarn task:archive` |

**Запрещено:**

- Создавать skills в `~/.cursor/skills-cursor/` (reserved Cursor)
- Дублировать generic PR review (использовать `review-bugbot` / `review-security`)
- God-skill «всё про Membrana» — один SKILL = одна зона
- Менять `@membrana/core` / `vesnin` контракты ради skills

### Шаблон каждого SKILL.md

```markdown
---
name: membrana-<topic>
description: >-
  <Что делает>. Use when <триггеры>. Do NOT use for <negative triggers>.
---

# …

## When to use
## When NOT to use
## Context checklist (files to read)
## Commands (yarn …)
## Step-by-step
## Output format
```

---

## Definition of Done (спринт)

- [x] S0–S8 archived в реестре
- [x] `.cursor/skills/README.md` — таблица всех skills + триггеры
- [x] ≥12 project skills (8 P0/P1 полных + 3 P2 stub + anthropic-cli уже есть)
- [x] `.claude/` mirror для S1–S2 минимум; S7 — полный mirror index
- [x] `AGENTS.md` или `.cursorrules` — одна строка «skills: `.cursor/skills/README.md`»
- [ ] LGTM Teamlead

---

## Out of scope

- Personal skills в `~/.cursor/skills/`
- Новые yarn-скрипты (skills оборачивают существующие)
- Cursor Automations / hooks (отдельный эпик)
- Полная миграция rules → skills
- RAG index run (ждём merge `@membrana/rag-service`)

---

## Порядок ролей

1. **Teamlead (Vesnin)** — scope фаз, LGTM, не раздувать skills
2. **Структурщик (Ozhegov)** — границы skill vs rule, `.claude/` mirror
3. **Верстальщик** — —
4. **Математик / Музыкант** — review domain skills (audio-guard, detector stub)

---

## Промпт целиком (для агента)

Ты — координатор Membrana (Vesnin). Задача: **внедрить agent skills** по фазам S0–S8.

1. **S0:** создай `.cursor/skills/README.md` и conventions; обнови pointer в `AGENTS.md`.
2. **S1–S2:** P0 operational skills (rhythm + task lifecycle).
3. **S3–S4:** virtual team format + audio guard + service scaffold.
4. **S5–S6:** domain (device-board, docs) + ops (usercase, background-servers, consilium, night).
5. **S7:** `.claude/` thin mirror.
6. **S8:** deferred stubs (RAG, detectors, MCP).

Перед каждой фазой: прочитай built-in `create-skill` conventions. После фазы: `yarn task:archive <phase-id> --notes "…"`.

Не коммить без явной просьбы пользователя. Не трогать runtime TypeScript кроме опционального pointer в docs.
