# Стратегия интеграции MCP в Membrana

> Runbook: [`TZ_MCP_Servers_Membrana.md`](./TZ_MCP_Servers_Membrana.md)  
> План фаз: [`MCP_ROLLOUT_PLAN.md`](./MCP_ROLLOUT_PLAN.md)  
> Сценарии и fallback: [`MCP_USAGE.md`](./MCP_USAGE.md)  
> Консилиум: [`seanses/mcp-servers-rollout-2026-06-09.md`](./seanses/mcp-servers-rollout-2026-06-09.md)

---

## Принцип: отсутствие ключа не блокирует команду

**Обязательное правило:** каждый MCP-сервер, требующий API-ключа, billing или внешней установки, является **опциональным**. Работа над Membrana (код, PR, CI, #47 Single-Node) **не зависит** от успешного старта такого сервера.

| Уровень | Серверы | Ключ / setup | В committed config |
|---------|---------|--------------|-------------------|
| **Tier 0** | gitnexus, Git, Filesystem, **codebase-memory-mcp** | нет | gitnexus в `.cursor/mcp.json`; codebase-memory-mcp в `.claude/.mcp.json` (auto-install) |
| **Tier 1** | Perplexity, **headroom** (пилот) | `PERPLEXITY_API_KEY`; headroom — `uv` + Rust | **не** в git; fragment example; headroom venv в `tools/headroom-venv/` |
| **Tier 2** | Playwright | Chromium download | fragment example |
| **Tier 3** | Glyph | `uv` + clone вне репо | fragment example |
| **Tier 4** | Chrome MCP, mcp-firewall | — | **не внедряем** v1 |
| **Tier 5** | Linear | OAuth (`mcp-remote`, без ключа в git) | fragment example (keyless) |

**Если сервер не стартует:** отключить его в Cursor/Claude (Settings → MCP) или удалить блок из **локального** конфига. Использовать fallback из [`MCP_USAGE.md`](./MCP_USAGE.md).

**CI:** проверяем только **bootstrap-артефакты** (`yarn mcp:verify-bootstrap`) — без ключей и без запуска MCP-процессов.

---

## Цепочка задач (Issues)

| Фаза | id реестра | Issue | PR обязателен |
|------|------------|-------|---------------|
| Bootstrap | `mcp-repo-bootstrap` | #50 | да |
| Workstation A | `mcp-workstation-phase-a` | #51 | нет (отчёт в Issue) |
| Workstation B | `mcp-workstation-phase-b` | #52 | нет |
| Workstation C | `mcp-workstation-phase-c` | #53 | нет |
| Acceptance | `mcp-rollout-acceptance` | #54 | нет |

Зависимости: #50 → #51 → (#52 ∥ #53) → #54.

**Приоритет:** не выше **#47 Single-Node Detection First**. MCP — инфраструктурный трек.

---

## §5. Конфиденциальность

Не отправлять через MCP / внешние API:

- содержимое `.env`, API-ключи, токены
- приватные WAV и сырые записи микрофона
- непубличные credentials `background-office` и `background-media` (`X-Membrana-Token`, device scope)

Research по DSP — только обезличенные ссылки на публичные статьи. Датасеты — пути в `datasets/`, не бинарники в Perplexity.

---

## §7. Acceptance (Issue #54)

Композитный gate «MCP развёрнут для команды»:

1. Tier 0 active на ≥1 рабочей станции (gitnexus smoke).
2. `yarn mcp:verify-bootstrap` зелёный в CI.
3. Для Tier 1–3: либо smoke-тест пройден, либо в Issue зафиксирован **осознанный skip** с указанием fallback (см. MCP_USAGE).
4. Задачи `mcp-repo-bootstrap` … `mcp-workstation-phase-c` archived; запись в standup или archive дня.

---

## §8. Фазы A–C (workstation)

### Фаза A — навигация (без ключей)

gitnexus, Git MCP, Filesystem MCP. Fallback: `rg`, IDE search, `yarn ask`.

### Фаза B — research и браузер (ключи опциональны)

Perplexity, Playwright. Fallback: ручной поиск, `cursor-ide-browser`, локальный Chrome.

### Фаза C — outline кода (setup опционален)

Glyph ([`TZ_MCP_Servers_Membrana.md`](./TZ_MCP_Servers_Membrana.md) §3). Fallback: gitnexus, `yarn mcp:verify-bootstrap`, tree/ripgrep.

---

## Связь с Anthropic CLI

Скрипты `yarn ask`, `yarn consilium`, `yarn plan:day` используют `ANTHROPIC_API_KEY` — **отдельно** от MCP Perplexity.

| Сценарий | Нет `ANTHROPIC_API_KEY` | Fallback |
|----------|-------------------------|----------|
| Утренний план | `yarn morning-care --no-anthropic` | |
| Standup | `yarn standup:dry` | |
| MAIN_DAY_ISSUE | `yarn main-day-issue --allow-missing-standup` | ручное редактирование |
| Консилиум | протокол в чате / вручную | `docs/seanses/` |
| Research | нет Perplexity MCP | docs, GitHub, arXiv вручную |

---

## §9. Спринт mcp-agent-tooling-2026-06-27

> Консилиум: [`docs/discussions/mcp-agent-tooling-consilium-2026-06-27-PROTOCOL.md`](./discussions/mcp-agent-tooling-consilium-2026-06-27-PROTOCOL.md)

| Фаза | Инструмент | Статус | Версия | Ограничения |
|------|-----------|--------|--------|-------------|
| M1 | codebase-memory-mcp | **active** | 0.8.1 | offline, MIT; граф 26 936 узлов / 60 872 рёбра |
| M2 | headroom-ai[mcp] | **пилот** | 0.27.0 | только `logs:parse` + RAG-чанки; `@membrana/core` — вне компрессии; gate: экономия ≥40% на 2/3 выводов |
| M3 | searXNG | **deferred** | — | Perplexity закрывает нишу; вернуть при keyless DSP-ресёрче |
| M4 | hindsight | **deferred** | — | mini-spike отдельно; Vectorize-хостед — §5-запрет |

**Открытые Issue:**
- #185 `arch: services→device-board boundary violation` — 8 нарушений в `packages/services/usercase-catalog`, pre-existing

**Хуки установлены (codebase-memory-mcp):**
- `PreToolUse` — Grep/Glob search-graph augmenter (non-blocking)
- `SessionStart` — напоминание об MCP при старте/resume/clear/compact
- `rag-evening-index.mjs` — инкрементальный граф-апдейт после RAG (Tier 0 fallback: `tools/bin/`)
