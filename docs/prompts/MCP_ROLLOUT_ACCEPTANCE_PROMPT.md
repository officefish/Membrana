# Промпт: MCP — финальная приёмка внедрения (gate)

> **Task-промпт**. Размер: **M**. Артефакт: **отчёт + запись «MCP развёрнут»** в `STRATEGIC_PLAN_DAY.md` (опц. PR).
> Реестр: **`mcp-rollout-acceptance`**. План: [`MCP_ROLLOUT_PLAN.md`](../MCP_ROLLOUT_PLAN.md).
> **Зависимость:** phase-a и phase-b **обязательны**; phase-c **рекомендуется** (для 7.6 в 7.7).

---

## Контекст

Definition of Done «MCP развёрнут» — [`MCP_INTEGRATION_STRATEGY.md`](../MCP_INTEGRATION_STRATEGY.md) §7. Композитный сценарий **тест 7.7** (ТЗ §7): gitnexus → Git → Filesystem → Glyph → сводка stage-gate readiness.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`TZ_MCP_Servers_Membrana_v3.md`](../TZ_MCP_Servers_Membrana_v3.md) | §7.7, §8, итоговые результаты |
| [`DETECTOR_BENCHMARK.md`](../DETECTOR_BENCHMARK.md) | Контекст stage-gate |
| [`DEVELOPER_RHYTHM.md`](../DEVELOPER_RHYTHM.md) | Запись в план дня |

**GitHub Issue:** [#54](https://github.com/officefish/Membrana/issues/54)

---

## Промпт целиком

### Кто ты

**Vesnin** (приёмка) + **Ozhegov** + **Dynin** — коллективная верификация по ТЗ 7.7.

### MCP при выполнении

| Сервер | Использовать |
|--------|--------------|
| gitnexus, Git, Filesystem | да |
| Glyph | да (обобщённые метки на диаграмме) |
| Perplexity, Playwright | не обязательны для 7.7 |

### Что сделать

1. Убедиться, что задачи `mcp-repo-bootstrap`, `mcp-workstation-phase-a`, `mcp-workstation-phase-b` в реестре **archived** (phase-c — желательно).
2. В Cursor выполнить **тест 7.7** дословно из ТЗ (отчёт готовности к stage-gate).
3. Сохранить эталонный `claude_desktop_config` с плейсхолдерами в **vault** команды (Bitwarden / 1Password) — ТЗ §8.
4. Добавить в `docs/STRATEGIC_PLAN_DAY.md` (или через `yarn plan:day` на следующий день) строку: «MCP-окружение развёрнуто, дата, исполнитель».
5. Опциональный PR: `docs/archive/mcp-rollout-acceptance-<date>.md` — краткий протокол (без секретов).
6. Закрыть Issue 5; архивировать **`mcp-rollout-acceptance`**.

### Definition of Done

- [ ] Тест **7.7** пройден без ручного вмешательства; протокол в Issue.
- [ ] Шесть серверов active (или задокументировано исключение Glyph с обоснованием).
- [ ] Vault: example-конфиг с плейсхолдерами.
- [ ] Запись в стратегическом плане дня.
- [ ] Все задачи цепочки MCP в реестре archived.
- [ ] LGTM Teamlead.

### Out of scope

- Прохождение stage-gate 1→2 по метрикам детекторов (отдельная программа).
- mcp-firewall, Chrome MCP.

### Порядок ролей

1. **Структурщик** — gitnexus + Git в 7.7.
2. **Математик** — Filesystem.
3. **Teamlead** — сводка и LGTM.

### Формат отчёта в Issue

```markdown
## MCP rollout acceptance — YYYY-MM-DD

- Исполнитель: …
- Тест 7.7: pass / fail
- Серверы active: perplexity, playwright, gitnexus, git, filesystem, glyph
- Vault: да / нет
- Задачи реестра: bootstrap, phase-a, phase-b, phase-c, acceptance — archived
```

---

## Заметки для постановщика

`yarn task:archive mcp-rollout-acceptance --notes "Gate OK, Issue #N"`

После этого цепочка MCP считается **завершённой**; дальнейшая эксплуатация — по [`MCP_INTEGRATION_STRATEGY.md`](../MCP_INTEGRATION_STRATEGY.md) §7 (reindex gitnexus).

---

## Связь с дорожной картой

Инструментальная готовность к верификации семейства детекторов на одном узле.
