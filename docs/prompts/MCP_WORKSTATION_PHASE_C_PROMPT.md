# Промпт: MCP — фаза C (GlyphMCP + правило конфиденциальности)

> **Task-промпт**. Размер: **M**. Артефакт: **отчёт в Issue** + опционально PR с чек-листом в `CONTRIBUTING`.
> Реестр: **`mcp-workstation-phase-c`**. План: [`MCP_ROLLOUT_PLAN.md`](../MCP_ROLLOUT_PLAN.md).
> **Зависимость:** `mcp-workstation-phase-a`; **параллельно** с phase-b допустима.

---

## Контекст

Фаза C — рекомендуемый GlyphMCP для Excalidraw-диаграмм в task-промптах. ТЗ §3, §6, тест 7.6. Критично донести **правило конфиденциальности** ([`MCP_INTEGRATION_STRATEGY.md`](../MCP_INTEGRATION_STRATEGY.md) §5).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`TZ_MCP_Servers_Membrana_v3.md`](../TZ_MCP_Servers_Membrana_v3.md) | Этап 3 |
| [`MCP_INTEGRATION_STRATEGY.md`](../MCP_INTEGRATION_STRATEGY.md) | §5 Glyph |
| [`prompts/TASK_PROMPT_TEMPLATE.md`](./TASK_PROMPT_TEMPLATE.md) | Блок MCP в промптах |

**GitHub Issue:** [#53](https://github.com/officefish/Membrana/issues/53)

---

## Промпт целиком

### Кто ты

**Vesnin** + **Rodchenko** (визуальные артефакты для промптов, не UI клиента).

### MCP при выполнении

| Сервер | Использовать | Запрещено в промптах Glyph |
|--------|--------------|----------------------------|
| GlyphMCP | да | имена заказчиков, точные метрики stage-gate, объекты внедрения |

### Что сделать

1. **ТЗ §3** — аккаунт `glyphmcp.dev`, токен в vault, тариф зафиксирован (внутренняя заметка).
2. Добавить `glyph` в локальный MCP-конфиг (`GLYPHMCP_API_TOKEN` в `env` only).
3. **Ознакомить команду** (сообщение / standup): правило обобщённых описаний — ссылка на стратегию §5.
4. Тест **7.6** — диаграмма single-node pipeline (обобщённые слои).
5. Опциональный PR: одна строка в `CONTRIBUTING.md` или `docs/prompts/README.md` — «перед Glyph прочитать §5 MCP_INTEGRATION_STRATEGY».

### Definition of Done

- [ ] Glyph **active** в Cursor.
- [ ] Тест 7.6 пройден; ссылка на диаграмму в Issue (без конфиденциальных данных).
- [ ] Подтверждение ознакомления команды (комментарий Issue или standup).
- [ ] Токен не в git.
- [ ] LGTM Teamlead.

### Out of scope

- Верстка `apps/client` по DESIGN.md.
- Композитный тест 7.7 (задача `mcp-rollout-acceptance`).

### Порядок ролей

1. **Teamlead** — политика конфиденциальности.
2. **Верстальщик** — качество схемы 7.6.

---

## Заметки для постановщика

`yarn task:archive mcp-workstation-phase-c --notes "…"`

---

## Связь с дорожной картой

Иллюстрации для task-промптов детекторов и внешних материалов (pitch).
