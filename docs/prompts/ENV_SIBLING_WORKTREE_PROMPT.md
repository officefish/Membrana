# Промпт: .env из sibling-worktree — git-common-dir + честный 401

> **Task-промпт для агента-разработчика.**
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **S**. Ожидаемый артефакт: **1 PR** — слоёная загрузка `.env`
> (корень репо через git-common-dir + локальный поверх), 401-диагностика, грабли.
> Реестр: `id` = `env-sibling-worktree` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

#567: `resolveDotEnvPath` идёт **вверх** от cwd. Работает для вложенного worktree
(`root/.worktrees/x`), но 8 worktree лежат **соседями** корня
(`practice/Membrana-openrouter` и т.д.) — вверх от них корневой `.env` не найти
никогда; подхватывается локальный, где нужной переменной нет. Живой инцидент:
`telegram:swallow` → 401 «Invalid token» при живом токене в другом `.env`.
Точечный NB4-фикс (`resolveOfficeToken` сканирует worktree) закрыл только
OFFICE-токен; generic-случай (ANTHROPIC_API_KEY и любой другой ключ) жив.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| GitHub Issue #567 | Эпизоды, эскиз git-common-dir, таблица приоритетов |
| [`scripts/_anthropic-env.mjs`](../../scripts/_anthropic-env.mjs) | `resolveDotEnvPath`/`loadDotEnv` — место фикса |
| [`scripts/anthropic-env.test.mjs`](../../scripts/anthropic-env.test.mjs) | Тест вложенной раскладки; сюда — sibling-кейс |
| [`scripts/lib/office-token.mjs`](../../scripts/lib/office-token.mjs) | NB4-прецедент (граница: только worktree ЭТОГО репо) |

**GitHub Issue:** #567.

---

## Промпт целиком (для вставки агенту)

### Что построить

1. `_anthropic-env.mjs`:
   - `repoRootDotEnvPath(cwd)` — корневой `.env` через
     `git rev-parse --path-format=absolute --git-common-dir` → `<root>/.env`;
     вне git-репо → null.
   - `resolveDotEnvPaths(cwd)` — цепочка загрузки: `MEMBRANA_ENV_PATH` → только он;
     иначе `[корневой, ближайший-вверх]` (без дублей).
   - `loadDotEnv` грузит цепочку по порядку: **корень первым, локальный поверх** —
     локальные переопределения живут, корень закрывает дыры. Ровно это чинит
     инцидент: локальный `.env` без `OFFICE_API_TOKEN` больше не прячет корневой.
   - `resolveDotEnvPath` (совместимость) — как раньше ближайший вверх, но при
     полном промахе возвращает корневой.
2. `telegram-swallow.mjs`: при 401 печатать, какие `.env` загружены
   (`resolveDotEnvPaths`) и из какого источника взят токен (`source` уже есть) —
   отказ называет корень, не симптом (#567 п.2).
3. Грабля в `AGENTS.md`: «`.env` из sibling-worktree не находится вверх;
   с фикса — слоёная загрузка корень+локальный; `MEMBRANA_ENV_PATH` — штатный
   явный обход» (п.3; вторая грабля про пайп/exit уже записана ранее).

### Тесты (норма #539: регрессия проверяется возвратом бага)

| Область | Минимум |
|---------|---------|
| sibling-раскладка | Настоящий `git worktree add` сосед-корня во временном репо; **тест обязан краснеть до фикса**: ключ только в корневом `.env` виден из sibling |
| приоритет | Локальный `.env` переопределяет корневой по общим ключам; `MEMBRANA_ENV_PATH` бьёт обоих |
| вне git | Каталог без репо — поведение как раньше (вверх, без падений) |

### Definition of Done

- [ ] Sibling-тест красный на старом коде (зафиксировать прогоном), зелёный на новом.
- [ ] Старые тесты `anthropic-env.test.mjs` зелёные без правок ожиданий.
- [ ] 401 в swallow называет цепочку `.env` и источник токена.
- [ ] Грабля в AGENTS.md. LGTM Teamlead.

### Out of scope

- Копирование `.env` по worktree (отвергнуто в issue: 8 копий секрета).
- Правка `resolveOfficeToken` (NB4-механизм остаётся как есть).
- `net:http` проба (#595 п.2) — другой спринт.

---

## Заметки для человека-постановщика

1. После merge — отчёт в #567 (пп.1–2 закрыты, грабля п.3 записана).
2. Закрытие: `yarn task:archive env-sibling-worktree --notes "PR #…"`.

### Проверка после PR

```bash
node --test scripts/anthropic-env.test.mjs
```
