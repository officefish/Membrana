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
| **Tier 0** | gitnexus, Git, Filesystem | нет | только gitnexus в `.cursor/mcp.json`; Git/FS — в example |
| **Tier 1** | Perplexity | `PERPLEXITY_API_KEY` | **не** в git; fragment example |
| **Tier 2** | Playwright | Chromium download | fragment example |
| **Tier 3** | Glyph | `uv` + clone вне репо | fragment example |
| **Tier 4** | Chrome MCP, mcp-firewall | — | **не внедряем** v1 |

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
- непубличные credentials `background-office`

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
