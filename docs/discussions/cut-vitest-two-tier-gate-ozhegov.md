# Обсуждение: cut-vitest-two-tier-gate-ozhegov

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-10 11:36 UTC · ozhegov

**Контекст:** C:/Users/USER19~1/AppData/Local/Temp/claude/c--Users-user190825-practice-Membrana-tooling/25c9417e-b1dd-4cc1-a8c0-d7de40958b11/scratchpad/ticket-vitest-gate.md
**Вопрос:** Ты резчик этого спринта. Ответь по пяти вопросам из тикета конкретно и проверяемо: гранулярность мердж-гейта, состав smoke по проверяемому признаку, дом отчёта «что не гонялось», каденция ночи, порядок блоков и out-of-scope. Где предложение координатора неверно — скажи прямо.

**Ответ:**

Ozhegov.

Начну с термина. «Test gate» в ADR-0018 — контейнер над **корпусом scripts** (suffix `.test.mjs`, root `scripts/`). То, что предлагается сейчас — **второй контейнер** над корпусом vitest (`packages/*`, `apps/*`). Это не «расширение», а **вторая словарная статья с той же леммой**. В карточке и в CONTRIBUTING нужно два разных имени: `scripts-gate` и `vitest-gate`. Иначе омоним.

По пяти вопросам:

1. **Гранулярность мердж-гейта — пакетная через turbo, но не «просто `...[base]`».** Файловый import-граф на 430 vitest-файлов + 37 пакетов — самостоятельный M–L, ADR-0018 файловой точности от мердж-гейта не требует. НО предложение координатора в текущем виде **неверно в одной детали**: `turbo run test --filter="...[base]"` повторит дефект #1168 — markdown-правка потянет зависимых. Лечение уже написано: `scripts/prepush-typecheck-scope.mjs` фильтрует изменения по `GLOBAL_CONFIGS` и исключает `.md`. Мердж-гейт vitest должен звать turbo через ту же обёртку, а не turbo напрямую. Доказательство непропуска — то же, что у turbo: граф воркспейса + affected по коду (не по докам).

2. **Состав smoke — по проверяемому признаку, не «важные».** Признак: пакет входит в smoke, если он есть в объединении множеств `dependencies` + `peerDependencies` от `apps/client` и `packages/background-*` (foundation + всё, что грузит клиент и фоновые серверы). Список порождается скриптом `scripts/vitest-smoke-list.mjs` из `package.json`-ов, коммитится как `tests/vitest-smoke.catalog.json`, ревьюится в PR. Не «Ozhegov решил», а «граф решил». Ярус `full` = все 37 пакетов со скриптом `test`.

3. **Отчёт «что не гонялось» — обязательный артефакт джоба, не опция.** Дом: `.github/workflows/ci.yml` шаг после vitest печатает в job summary список пакетов из `full \ smoke` с пометкой `not run in merge gate: <package> — reason: outside smoke closure`. Формат — тот же принцип, что `--list` в scripts-контейнере (`scripts/lib/tests-container.mjs`). Без этого артефакта ярус нелегален по ADR-0018 (условие честности) и повторит «81 проверка молчала недели».

4. **Каденция ночи — отдельный job, не переезд `scheduled-ci.yml`.** Недельный прогон lint+typecheck+build оставить как есть (это другая словарная статья). Ночной vitest-full — новый workflow `vitest-nightly.yml`, `cron: '0 2 * * *'`, только `turbo run test --continue` на всём воркспейсе. Предусловие ADR-0018 держится: включается **после** защиты `main` (ход владельца).

5. **Порядок блоков (cg2):**
   1. Разделить лемму: переименовать в тикете и коде `test-gate` → `scripts-gate` (существует) и `vitest-gate` (новое).
   2. `scripts/vitest-smoke-list.mjs` + коммит `tests/vitest-smoke.catalog.json`.
   3. Обёртка над turbo с фильтром `GLOBAL_CONFIGS` и исключением `.md` (переиспользовать `prepush-typecheck-scope.mjs`).
   4. Правка `.github/workflows/ci.yml`: `turbo run test --filter=<smoke-list>` + job summary «not run».
   5. `vitest-nightly.yml` (ждёт защиты `main` — вне PR).
   6. cg4: раздел «CI & Testing» в CONTRIBUTING описывает **обе** статьи: scripts-gate и vitest-gate, с признаком smoke и адресом отчёта.

   **Out-of-scope спринта:** файловый import-граф для vitest (отдельная карточка, если понадобится); настройка branch protection (ход владельца); миграция `scheduled-ci.yml` — не трогаем.

Риск связанности: `scripts/vitest-smoke-list.mjs` не должен импортировать `packages/*` — только читать `package.json`-ы. Иначе гейт зависит от того, что гейтит.

---
