# Промпт: MCP — фаза A на рабочей станции (gitnexus, Git, Filesystem)

> **Task-промпт** для исполнителя (разработчик / агент с доступом к Windows-станции).
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md). Размер: **M**.
> Ожидаемый артефакт: **отчёт в GitHub Issue** + активные MCP-серверы (без обязательного PR).
> Реестр: **`mcp-workstation-phase-a`**. План: [`MCP_ROLLOUT_PLAN.md`](../MCP_ROLLOUT_PLAN.md).
> **Зависимость:** merge `mcp-repo-bootstrap`.

---

## Контекст

Фаза A стратегии ([`MCP_INTEGRATION_STRATEGY.md`](../MCP_INTEGRATION_STRATEGY.md) §8): навигация по коду и датасетам. Runbook: ТЗ этапы 1, 4, 5, 6 (частично — без Perplexity/Glyph), 9.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`TZ_MCP_Servers_Membrana_v3.md`](../TZ_MCP_Servers_Membrana_v3.md) | Этапы 1, 4–6, 9 |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | §1e детекторы для теста 7.3 |
| [`DATASET.md`](../DATASET.md) | Каталог для Filesystem |

**GitHub Issue:** [#51](https://github.com/officefish/Membrana/issues/51)

---

## Промпт целиком

### Кто ты

Исполнитель под координацией **Vesnin**. Зона **Ozhegov** (граф кода) + **Dynin** (датасеты).

### MCP при выполнении

Цель задачи — **включить** эти серверы локально:

| Сервер | Использовать |
|--------|--------------|
| gitnexus | да |
| Git MCP | да |
| Filesystem | да |
| Perplexity / Playwright / Glyph | нет (следующие фазы) |

### Что сделать

1. **ТЗ §1** — Node LTS ≥18, Git, `uv`; проверить `node -v`, `git -v`, `uv -v`.
2. **ТЗ §4** — `npm install -g gitnexus`; из корня Membrana: `gitnexus analyze`; проверить `gitnexus status` / `gitnexus list`.
3. **ТЗ §5** — зафиксировать абсолютные пути репо и `datasets/`.
4. **ТЗ §6 + §9** — в `%USERPROFILE%\.cursor\mcp.json` (и при необходимости Claude Desktop) подключить **только** gitnexus, git, filesystem по шаблону из merged PR `mcp-repo-bootstrap`. Перезапуск Cursor (Quit из трея).
5. **Приёмка** — в Cursor выполнить промпты тестов **7.3, 7.4, 7.5** (ТЗ §7); сохранить выдержки в комментарий Issue.

### Definition of Done

- [ ] Три сервера **active** в Cursor → Settings → MCP.
- [ ] MCP Log без ошибок старта при открытии Composer.
- [ ] Тесты 7.3, 7.4, 7.5 — пройдены (краткий отчёт в Issue).
- [ ] Секреты не попали в git / чаты.
- [ ] Teamlead LGTM по Issue.

### Out of scope

- Perplexity, Playwright, Glyph (задачи phase-b/c).
- Изменение прикладного кода Membrana.

### Порядок ролей

1. **Структурщик** — gitnexus + Git.
2. **Математик** — Filesystem / datasets.
3. **Teamlead** — приёмка отчёта.

### Out of scope (повтор для ясности)

Коммиты в репозиторий не обязательны, кроме опциональной правки путей в личном fork документации.

---

## Заметки для постановщика

1. Старт только после merge **`mcp-repo-bootstrap`**.
2. `yarn task:archive mcp-workstation-phase-a --notes "Issue #N, тесты 7.3–7.5 OK"`.

### Проверка

```powershell
gitnexus list
# Cursor: MCP → gitnexus, git, filesystem = active
```

---

## Связь с дорожной картой

Подготовка к верификации контрактов `DroneDetector` перед stage-gate.
