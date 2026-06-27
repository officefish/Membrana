# Phase F-fix — инструкция для агента (вставить Клоду в консоли)

> Скопируй **весь блок ниже** (от `=== НАЧАЛО ===` до `=== КОНЕЦ ===`) в начало диалога с агентом в репозитории Membrana. Агент работает локально (есть git/yarn).

```text
=== НАЧАЛО ===

Ты — координатор виртуальной команды Membrana под руководством Vesnin (Teamlead).
Соблюдай docs/prompts/TASK_PROMPT_WORKFLOW.md. Задача: id=repo-leveling, Issue #184.

КОНТЕКСТ
Спринт repo-leveling-2026-06-27 был «закрыт» (8 коммитов), но прогон вечернего ритуала
оборвался и перезаписал поверх sealed-состояния. В рабочем дереве 10 незакоммиченных
изменений; два из них откатывают ключевые результаты спринта. Сами 8 коммитов в HEAD —
корректны, трогать их НЕ нужно. Чинить только рабочее дерево.

ЧТО СЛОМАНО (проверено)
1. .gitignore — в рабочем дереве вырезаны 11 строк Phase A (игнор .env.llm-proxy,
   apps/client/playwright-report/, apps/client/test-results/, .sync-readme-out.txt).
   Сейчас `git check-ignore .env.llm-proxy` → НЕ игнорируется, секрет висит как untracked.
   В HEAD .gitignore эти строки ЕСТЬ (≈строки 103–111). Секрет в историю НЕ попадал.
2. docs/tasks/registry.json — битый JSON, обрезан на строке 9119 (незавершённая запись).
   В HEAD файл валиден.
3. Откаты в scripts/rag-evening-index.mjs, scripts/_daily-standup.mjs,
   scripts/_main-day-issue.mjs, scripts/morning-care.mjs и сдвиг сабмодуля
   apps/demos/Harmonic-Detector — требуют решения keep/discard.
4. В registry статус device-board-server-first = active, хотя CLOSURE.md создан.

ЖЁСТКИЕ ПРАВИЛА
- НЕ делай `git add .` / `git add -A` до шага 1 — застейджишь секрет .env.llm-proxy.
- НЕ коммить .env.llm-proxy (шаблон .env.llm-proxy.example — остаётся).
- НЕ меняй уже существующие 8 коммитов (никакого rebase/amend истории).
- Любую правку registry.json делай только при валидном JSON.

ПЛАН

Шаг 1 — восстановить два критичных файла из HEAD:
    git checkout -- .gitignore docs/tasks/registry.json
Проверь:
    git check-ignore .env.llm-proxy        # должен вывести путь = снова ignored
    node -e "JSON.parse(require('fs').readFileSync('docs/tasks/registry.json','utf8'));console.log('registry OK')"
    git status --short                      # .env.llm-proxy и playwright-report/ должны ИСЧЕЗНУТЬ из вывода

Шаг 2 — разобрать остаток (scripts + сабмодуль):
    git diff scripts/_daily-standup.mjs scripts/_main-day-issue.mjs scripts/morning-care.mjs scripts/rag-evening-index.mjs
    git diff apps/demos/Harmonic-Detector
  Реши по каждому:
   - если изменение осмысленное (полезный результат ритуала) → оставь и закоммить отдельно;
   - если это откат/артефакт обрыва → отбрось: git checkout -- <путь>.
  По сабмодулю: если сдвиг указателя не намеренный → `git submodule update --init apps/demos/Harmonic-Detector`.
  Покажи мне краткий вердикт по каждому файлу перед действием.

Шаг 3 — сверить ledger:
  Открой docs/day-sprint/db-server-first-2026-06-26/CLOSURE.md. Если спринт реально закрыт —
  переключи в registry.json статус device-board-server-first на "closed" (через JSON-safe правку),
  иначе оставь "active" и зафиксируй причину (например prod-gate pending). Затем:
    yarn task:sync-readme

Шаг 4 — финальный seal:
    yarn turbo run lint typecheck test build --continue
    git status --short        # должно быть ПУСТО
  Закоммить починку одним коммитом:
    git add .gitignore docs/tasks/registry.json docs/day-sprint/repo-leveling-2026-06-27/
    # + те scripts/сабмодуль, которые решено сохранить
    git commit -m "chore(repo-leveling): Phase F-fix — restore gitignore secret-gate + repair registry.json after interrupted ritual (refs #184)"
    git push

GATE (всё должно быть true перед закрытием)
- [ ] git check-ignore .env.llm-proxy → ignored
- [ ] .env.llm-proxy НЕ tracked и НЕ в истории (git log --all -- .env.llm-proxy пуст)
- [ ] registry.json парсится; yarn task:sync-readme прошёл
- [ ] turbo lint/typecheck/test/build зелёный
- [ ] git status --short пуст
- [ ] решение по scripts/сабмодулю и по статусу db-server-first принято и зафиксировано

В конце дай короткий отчёт: что восстановил, что решил по scripts/сабмодулю,
итог git status и хеш коммита починки. Затем напомни закрыть Issue #184 отчётом и
`yarn task:archive repo-leveling --notes "..."`.

=== КОНЕЦ ===
```

---

## Памятка постановщику (тебе)

- Если агент в шаге 2 сомневается — самые вероятные `scripts/*` правки это **откаты от обрыва ритуала** → `git checkout --`. Но пусть покажет diff, не угадывает.
- После Phase F-fix спринт можно закрывать: отчёт в Issue #184 → `yarn task:archive repo-leveling`.
- Полный контекст спринта: [`OPEN.md`](./OPEN.md) · промпт [`REPO_LEVELING_SPRINT_PROMPT.md`](../../prompts/REPO_LEVELING_SPRINT_PROMPT.md).
