# docs/audit/git — контейнер git-аудита

Специальный контейнер, где агент **легально** хранит промпты, реестры веток и глубокие разборы по гигиене git-репозитория Membrana — и **ассортимент** веток для покрытия жанров работы (рефактор спринта, code review). Реализация паттерна [`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md).

Канонический операторский промпт: [`AGENT_PROMPT.md`](./AGENT_PROMPT.md).

### Движок (server-first)

| | |
|---|---|
| **Engine** | **Mintlify** — источник правды страниц: [`apps/docs`](../../../apps/docs/) |
| **Зачем** | инструкции с примерами «какая ветка под какой случай» для агентов |
| **Пин** | подграф этих инструкций (`path → SHA`), паттерн [`PINNED_SUBGRAPH_VERSIONING`](../../patterns/PINNED_SUBGRAPH_VERSIONING.md) — **не** registry веток и **не** `kits/` |
| **Спринт** | `branch-mintlify-engine` (#823); кейсы → [`analysis/branch-cases-catalog-*.md`](./analysis/) → cookbooks |
| **Навигация** | группа `Git — branch cases` в [`apps/docs/docs.json`](../../../apps/docs/docs.json) |

Cookbooks (один клик из контейнера):

| Страница | Путь |
|----------|------|
| Kind dictionary | [`apps/docs/git/cookbooks/branch-kind-dictionary.mdx`](../../../apps/docs/git/cookbooks/branch-kind-dictionary.mdx) |
| Format tags | [`apps/docs/git/cookbooks/branch-format-tags.mdx`](../../../apps/docs/git/cookbooks/branch-format-tags.mdx) |
| Persona grammar | [`apps/docs/git/cookbooks/branch-persona-grammar.mdx`](../../../apps/docs/git/cookbooks/branch-persona-grammar.mdx) |
| Open PR vs salvage | [`apps/docs/git/cookbooks/branch-open-pr-vs-salvage.mdx`](../../../apps/docs/git/cookbooks/branch-open-pr-vs-salvage.mdx) |
| Anti `feature/*` / agent | [`apps/docs/git/cookbooks/branch-anti-feature-agent.mdx`](../../../apps/docs/git/cookbooks/branch-anti-feature-agent.mdx) |

Markdown-каталог случаев (без MDX): [`analysis/branch-cases-catalog-2026-07-21.md`](./analysis/branch-cases-catalog-2026-07-21.md).

### PINNED_SUBGRAPH (подграф инструкций)

Манифест: [`pins/branch-instructions.manifest.json`](./pins/branch-instructions.manifest.json) ·
аудит: `yarn audit:branch-instructions-pin` (`--write` — осознанное обновление пина).

Чеклист [`PINNED_SUBGRAPH_VERSIONING`](../../patterns/PINNED_SUBGRAPH_VERSIONING.md):

1. ✅ Единица версии — подграф cookbooks + `docs.json` + каталог случаев (манифест `nodes`).
2. ✅ Пины — git blob SHA (`git hash-object`); копий файлов нет.
3. ✅ Аудит полноты: `yarn audit:branch-instructions-pin` (таблица ok/drift/missing).
4. ✅ Режимы: `modeDefault: latest` (dev); `--mode pinned` запрещает `--write`.
5. ✅ Обновление пина — отдельный коммит манифеста после `--write`.
6. ✅ Владелец пина: `docs/audit/git` (поле `owner` в манифесте).
7. ✅ Дрейф — табличный вывод + exit 1.
8. ⚠ Hygiene-реестр контейнера **не** пинится (паттерн: контейнеры вне области; здесь — только engine-инструкции по решению владельца / #823).

Три измерения:

| Измерение | Вопрос | Орган |
|-----------|--------|-------|
| **Гигиена** | Можно ли трогать / salvage / GC? | `registry/BRANCHES_DECOMPOSE_LIST.md` · Scenario A/B |
| **Ассортимент** | Есть ли представитель жанра работы? | `analysis/branch-assortment-coverage-*.md` · Scenario Assortment |
| **Кейсы → engine** | Какую форму имени взять под случай? | `analysis/branch-cases-catalog-*.md` → Mintlify cookbooks |

## Соответствие паттерну GROUP_CONTAINERIZATION

1. ✅ Выделенный каталог `docs/audit/git/`; audit-cache не в корне репо.
2. ✅ README-контракт с таблицей «что писать / в git?» (ниже).
3. ✅ Overwrite-реестр `registry/BRANCHES_DECOMPOSE_LIST.md` с Meta; dated — опционально.
4. ✅ `cache/` под gitignore.
5. ✅ `yarn repo:branches:decompose --report` пишет реестр сам; источник истины назван: сам git (`origin/main`, worktree, gh PR).
6. ✅ `AGENT_PROMPT.md`, Scenario B с HARD GATE.
7. ✅ Никаких delete/force без явного ok; `repo:clean --execute` только по слову владельца; персоны — никогда.
8. ✅ Провода: `AGENTS.md`, `docs/audit/README.md`, `docs/CONTRIBUTING.md` («Гигиена веток»), скиллы `membrana-branch-audit` / `membrana-branch-decompose`.

## Layout

```
docs/audit/git/
  README.md           — этот файл (контракт контейнера)
  AGENT_PROMPT.md     — setup агента (канон)
  registry/           — снимки декомпозиции веток (коммитим markdown)
  analysis/           — глубокие разборы категорий (коммитим markdown)
  cache/              — сырой JSON / промежуточные дампы (gitignore)
```

## Что можно писать сюда

| Путь | Что | В git? |
|------|-----|--------|
| `AGENT_PROMPT.md`, `README.md` | Промпт и контракт | да |
| `registry/BRANCHES_DECOMPOSE_LIST.md` | Канонический текущий реестр 7 категорий (overwrite) | да |
| `registry/BRANCHES_DECOMPOSE_LIST-YYYY-MM-DD.md` | Опциональный dated-архив того же снимка | да |
| `registry/*.json` (опционально) | Machine-readable twin реестра | лучше в `cache/` |
| `analysis/category-N-attention-YYYY-MM-DD.md` | Deep analysis категории N | да |
| `analysis/branch-assortment-coverage-YYYY-MM-DD.md` | Карта покрытия жанров (ассортимент) | да |
| `analysis/branch-cases-catalog-YYYY-MM-DD.md` | Каталог случаев «ветка → случай» (вход Mintlify F2) | да |
| `pins/branch-instructions.manifest.json` | PINNED_SUBGRAPH path→SHA инструкций Mintlify | да |
| `analysis/branch-push-history-YYYY-MM-DD.md` | Снимок осей имён / истории пушей | да |
| `analysis/*-review-lens-*.md` | Линза для CR / ship | да |
| `cache/**` | Сырые JSON, churn dumps, временные артефакты | **нет** (gitignore) |

## Retention

- Markdown-снимки `registry/` и `analysis/` — **коммитим**: полезны как история аудита (как `docs/reports/night-triage/`).
- Старые dated-файлы не удалять автоматически; при разрастании — архивировать по решению владельца.
- `cache/` — локальный scratch; не считать источником истины.

## Как вызвать агента

1. Открыть чат / сессию на ветке от `main` (или в worktree).
2. Приложить / указать: `docs/audit/git/AGENT_PROMPT.md`.
3. Сценарии:
   - **A:** «Собери реестр веток по категориям» → перезаписывает `registry/BRANCHES_DECOMPOSE_LIST.md` (опционально dated `BRANCHES_DECOMPOSE_LIST-YYYY-MM-DD.md`).
   - **B:** «Глубокий разбор категории N». **HARD GATE:** категория (1–7 или ясное имя) обязана быть в **текущем** сообщении. Иначе STOP: спросить какую из 1–7; **ничего** не писать в `analysis/`; **не** запускать `git diff`/churn. Запрещено угадывать из истории сессии. Только после явной категории → `registry/BRANCHES_DECOMPOSE_LIST.md` → `analysis/…`.
   - **Assortment:** «карта покрытия» / «ассортимент веток» → по актуальному registry строит/обновляет `analysis/branch-assortment-coverage-YYYY-MM-DD.md` (жанры kind/формат/держатель/доставка). Не удаляет ветки. Не путать с B.

Связанный tooling: `yarn repo:branches:decompose`, скилл `membrana-branch-decompose`.
Ассортимент-орган: `branch-assortment-sprint` (#801, закрыт).
Движок инструкций: `branch-mintlify-engine` (#823).
Указатель в процессе: [`docs/CONTRIBUTING.md`](../../CONTRIBUTING.md) → «Гигиена веток».
