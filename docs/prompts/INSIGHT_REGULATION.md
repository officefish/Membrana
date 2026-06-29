# Инсайт (Insight) — регламент

> **Версия:** 0.1 (2026-06-25)  
> **Спринт:** `insight-process-registration-2026-06-25`  
> **Промпт review:** [`INSIGHT_REVIEW_PROMPT.md`](./INSIGHT_REVIEW_PROMPT.md)  
> **Ритм:** [`docs/DEVELOPER_RHYTHM.md`](../DEVELOPER_RHYTHM.md) · **не** входит в `ritual:day` / `ritual:evening`

---

## Назначение

**Инсайт** — крупная идея или стратегическое наблюдение, которое:

- не является исполняемой M/L-задачей сразу;
- требует внешней фактуры (Perplexity) и позиции виртуальной команды;
- влияет на **недельную** стратегию (`yarn plan:week`), а через неё — опционально на день.

| | Task (M/L) | Инсайт | Consilium |
|---|------------|--------|-----------|
| Горизонт | день–спринт | неделя–квартал | разовый спор |
| DoD | merge + `task:archive` | RESEARCH + REVIEW + статус | протокол `docs/seanses/` |
| Ритм | `ritual:day` / evening | по запросу + `plan:week` | по необходимости |

---

## Жизненный цикл

```text
draft → researched → reviewed → adopted | deferred | rejected
```

| Статус | Смысл |
|--------|--------|
| `draft` | Идея описана в `INSIGHT.md` |
| `researched` | `RESEARCH.md` заполнен (Perplexity) |
| `reviewed` | `REVIEW.md` — пять ролей, оценки /10 |
| `adopted` | Teamlead LGTM; вес ≥ порога для `plan:week` |
| `deferred` | отложено; остаётся в registry |
| `rejected` | не внедряем; архив допустим |

`adopted` **не** создаёт task автоматически. Эпик/task — отдельное решение Teamlead.

---

## Артефакты

| Путь | Назначение |
|------|------------|
| `docs/INSIGHTS.md` | навигатор |
| `docs/insights/registry.json` | машиночитаемый индекс |
| `docs/insights/<id>/INSIGHT.md` | промпт инсайта (идея + контекст) |
| `docs/insights/<id>/RESEARCH.md` | 2–3 Perplexity-запроса + выжимка |
| `docs/insights/<id>/REVIEW.md` | review команды |
| `docs/insights/<id>/meta.json` | статус, вес, horizon, даты |

**ID:** `kebab-case`, префикс `insight-` рекомендуется (`insight-operator-smoke-ci-gate`).

---

## Research — каскад Perplexity

При `yarn insight:research <id>` (или агент по skill):

1. **Скрипт + `PERPLEXITY_API_KEY`** в корневом `.env` — HTTP API Perplexity (`pplx-…`).
2. **Cursor MCP Perplexity** — если (1) недоступен: агент выполняет те же 3 запроса через MCP и дописывает `RESEARCH.md`.
3. **Ручной fallback** — `yarn insight:research <id> --dry-run` печатает запросы; человек вставляет ответы в `RESEARCH.md`.

Шаблон запросов (генерируется из `INSIGHT.md`):

| # | Тип | Цель |
|---|-----|------|
| Q1 | Landscape | кто делает X, open-weights, 2024–2026 |
| Q2 | Fit | стыковка с Membrana (Web Audio, edge, zero-shot) |
| Q3 | Risk | latency, cost, privacy, лицензии |

---

## Review — оценка команды

`yarn insight:review <id>` — Anthropic API, пять ролей из [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md).

Каждая роль обязана дать:

- **Внедрять?** да / нет / позже
- **Этап:** сейчас | неделя | месяц | после MVP | never
- **Оценка приоритета:** **1–10** (как team-evening-feedback)
- **Зависимости:** пакеты / эпики

**Вес инсайта** (`meta.json.weight`): среднее арифметическое пяти оценок, округление до 0.1.

Порог для `plan:week`: **weight ≥ 6.0** и статус `adopted` или `reviewed` с рекомендацией Teamlead.

---

## Команды

```bash
yarn insight help
yarn insight create <slug> --title "…" [--source user|epic]
yarn insight list [--status draft]
yarn insight research <id> [--dry-run]
yarn insight review <id> [--dry-run]
yarn insight close <id> --status adopted|deferred|rejected [--weight N]
```

Требования API:

- `insight:review` — `ANTHROPIC_API_KEY` (как `yarn standup`)
- `insight:research` — `PERPLEXITY_API_KEY` или MCP / ручной fallback

---

## Связь с неделей

`yarn plan:week` подмешивает блок **«Активные инсайты»** из `docs/insights/registry.json` (вес ≥ 6, статус `adopted` или `reviewed`).

Инсайты **не** попадают в `MAIN_DAY_ISSUE` автоматически. Teamlead может сослаться вручную.

---

## Team insights (инсайты виртуальной команды)

По аналогии с пользовательским инсайтом (фаза J), каждая **роль** может предложить стратегическую идею в своей зоне.

### Источник (`meta.json.source`)

| Значение | Роль |
|----------|------|
| `virtual-team-vesnin` | Teamlead |
| `virtual-team-ozhegov` | Структурщик |
| `virtual-team-dynin` | Математик |
| `virtual-team-kuryokhin` | Музыкант |
| `virtual-team-rodchenko` | Верстальщик |

### Workflow

1. Пользователь или координатор: «инсайт от /ozhegov: …» (или роль формулирует в блоке `[Структурщик]:`).
2. `yarn insight create <slug> --title "…" --source virtual-team-ozhegov`
3. Агент дополняет `INSIGHT.md` от лица роли (проблема в зоне ответственности).
4. `yarn insight research <id>` → `yarn insight review <id>` — **все пять ролей** голосуют (инициатор не получает veto).
5. `yarn insight close <id> --status …`

### Отличие от consilium

| | Insight | Consilium |
|---|---------|-----------|
| Цель | одна идея → вес для недели | спор → протокол |
| Инициатор | user или одна роль | координатор |
| Выход | adopted/deferred + weight | consensus в `docs/seanses/` |

Рекомендуемый ритм: **batch** из 5 инсайтов (по одному от роли) или 1–2 роли за сессию — по запросу Teamlead.

---

## Cursor / агент

- Skill: [`.cursor/skills/membrana-insight/SKILL.md`](../../.cursor/skills/membrana-insight/SKILL.md)
- Триггеры: «инсайт», `yarn insight:`, сохранить идею, strategic backlog
- **Не** подменять: `membrana-consilium`, `membrana-task-lifecycle`, `membrana-developer-rhythm`

---

## Definition of Done (один инсайт)

- [ ] `INSIGHT.md` — проблема, гипотеза, scope
- [ ] `RESEARCH.md` — 3 запроса + выжимка (каскад Perplexity)
- [ ] `REVIEW.md` — 5 ролей, оценки /10, средний вес
- [ ] `meta.json` + `registry.json` синхронизированы
- [ ] Статус `adopted` | `deferred` | `rejected` зафиксирован Teamlead
