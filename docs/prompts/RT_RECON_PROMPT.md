# Промпт: RT-RECON — реконструкция хронологии transitions[]

> **Task-промпт для агента-разработчика** (Claude Code / Cursor).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — 20+ промежуточных переходов в transitions[], playhead работает на 5+ точках.
> Реестр: `id` = `rt-recon-s1` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

`apps/demos/Research-Tree/membrana-knowledge-graph.json` содержит массив `transitions[]`
с двумя точками: genesis (2026-05-12) и now (2026-07-01). Архитектура event-sourcing
уже работает: `computeStatesAt(graph, date)` вычисляет состояние графа на любую дату,
UI-тогл в шапке переключает между двумя точками.

Задача — заполнить промежуток реальными датами из git-истории репозитория, чтобы
playhead стал живым таймлайном, а не бинарным переключателем.

Консилиум: `docs/seanses/research-tree-реконструкция-хронологии-сейчас-2026-07-01.md`
Решение консилиума: данные прежде UI, гранулярность по PR/эпохам, не по коммитам.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| `apps/demos/Research-Tree/membrana-knowledge-graph.json` | Единственный источник истины, секция transitions[] |
| `apps/demos/Research-Tree/src/graph/adapter.ts` | computeStatesAt, buildFlowGraph, GENESIS_DATE |
| `apps/demos/Research-Tree/src/graph/types.ts` | GraphTransition interface |
| `apps/demos/Research-Tree/KNOWLEDGE_GRAPH_SPEC.md` | Конвенции графа |
| `apps/demos/Research-Tree/AGENT_TASK.md` | Исходное задание агенту |

**GitHub Issue:** #221

---

## Промпт целиком (для вставки агенту)

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead).
Перед кодом — краткий план. Соблюдай [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить

Заполнить `transitions[]` в `apps/demos/Research-Tree/membrana-knowledge-graph.json`
промежуточными переходами между genesis (2026-05-12) и now (2026-07-01).

Текущие точки в transitions[]:
- 17 genesis-переходов с датой 2026-05-12
- 35 now-переходов с датой 2026-07-01

Нужно добавить 20+ промежуточных переходов с реальными датами из git-истории.

---

### Алгоритм реконструкции

**Шаг 1 — получить хронологию репо:**

```bash
git log --reverse --format="%ad %H %s" --date=short
```

**Шаг 2 — искать ключевые вехи по коммит-сообщениям:**

| Паттерн в сообщении | Соответствующий узел | Переход |
|---------------------|---------------------|---------|
| `audio-engine` | layer.audio-engine | exploring → established |
| `benchmark` / `bench` | layer.benchmark | available → exploring / established |
| `nestjs` / `background-*` | stack.nestjs, stack.prisma-pg | available → established |
| `docker` / `docker-compose` | stack.docker | available → established |
| `vps` / `timeweb` / `deploy` | stack.vps-timeweb, stack.vps-deploy | fog → established |
| `mcp` / `cursor/mcp` | stack.mcp-client | available → established |
| `electron` / `studio` | stack.electron-studio | available → exploring |
| `white-paper` / `WHITE_PAPER` | comm.white-paper | fog → exploring |
| `grant` / `GRANT_REPORT` | comm.grant-report | fog → exploring |
| `trends` / `trends-fft` | layer.trends-fft | available → established |
| `sample-library` / `background-media` | stack.sample-library | fog → established |
| `ollama` | stack.ollama-local | available → established |
| `claude.*api` / `claude:code` | stack.claude-api | available → established |
| `boundaries` / `check:boundaries` | stack.boundaries | exploring → established |
| `linear` | stack.linear-integration | available → established |
| `rag` / `filesystem.*mcp` | stack.rag-operational | available → established |
| `proxy` / `hiddify` | stack.proxy-hiddify | available → established |
| `dev-rhythm` / `ritual` / `morning-care` | process.dev-rhythm | fog → established |
| `virtual.team` / `consilium` | process.virtual-team | exploring → established |
| `stage-gate` / `gate` | process.stage-gate | fog → established |

**Шаг 3 — добавить переходы в transitions[]:**

Формат перехода:
```json
{
  "id": "t-m-NN",
  "nodeId": "<node-id>",
  "to": "exploring|established",
  "date": "YYYY-MM-DD",
  "note": "commit <SHORT_SHA> — <тема коммита>"
}
```

Правила:
- `id`: `t-m-01`, `t-m-02`, ... (m = middle/промежуточные)
- Дата = дата коммита из `git log --date=short`
- Если несколько коммитов подходят — берём самый ранний
- Если дата неточная — добавить `"note": "приблизительно, ближайший PR #NNN"`
- Не добавлять узлы которые уже есть в genesis (2026-05-12) или now (2026-07-01)
- Не нужно охватывать абсолютно все узлы — только те где есть явный git-сигнал

**Шаг 4 — проверить что playhead-тогл работает:**

Убедиться что `computeStatesAt` правильно применяет новые переходы.
Проверить вручную 2-3 промежуточные даты через браузер или console.log.

---

### Архитектура / контракт

| Файл | Что менять |
|------|-----------|
| `membrana-knowledge-graph.json` | Добавить t-m-01..t-m-NN в transitions[] |
| `src/graph/types.ts` | Не менять (GraphTransition уже есть) |
| `src/graph/adapter.ts` | Не менять (computeStatesAt уже есть) |

**Запрещено:**
- Менять состояния узлов (`state` поле на узле)
- Добавлять узлы, менять схему графа
- Выдумывать даты — только из `git log`
- Менять genesis (t-g-*) или now (t-n-*) переходы

---

### Definition of Done

- [ ] 20+ промежуточных переходов добавлено в transitions[]
- [ ] Все даты верифицированы по `git log` (SHA или note)
- [ ] `yarn tsc --noEmit` в Research-Tree чистый
- [ ] Граф корректно отображается при playhead между genesis и now
- [ ] PR с описанием: список добавленных вех и их источники

---

### Out of scope

- UI-скруббер / Timeline компонент
- Переезд transitions[] в отдельный файл
- `@membrana/core` Transition interface
- Заполнение приватных числовых полей (stamina, cost, пороги)

---

## Фазы выполнения

| Фаза | Задача | DoD |
|------|--------|-----|
| **RECON-1** | git log анализ: собрать таблицу коммит→узел→дата | Markdown-таблица 20+ строк |
| **RECON-2** | Заполнить transitions[] промежуточными переходами | JSON валидный, 20+ вех |
| **RECON-3** | Проверить playhead на 3+ промежуточных датах | Визуальная проверка в браузере |
| **RECON-4** | PR + отчёт в Issue #221 | CI зелёный, Closes #221 |

---

## Заметки для постановщика

- Запустить `yarn dev` в `apps/demos/Research-Tree` до начала и после
- Проверить в браузере что тогл `12 мая / 1 июля` работает до начала
- После RECON-2 добавить промежуточную дату в URL (?t=2026-06-01) для проверки
- PR закрывает Issue #221, `yarn task:archive rt-recon-s1`
