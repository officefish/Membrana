# Регламент ночных спринтов (Night Build)

> **Night Build** — автономный цикл разработки **между вечерним и утренним ритуалом**: агент (Cursor Cloud / локальный) выполняет **замороженный эпик** без расширения scope, с фиксированными чекпоинтами и утренней передачей (handoff).
>
> Связано: [`DEVELOPER_RHYTHM.md`](./DEVELOPER_RHYTHM.md), [`TASK_PROMPT_WORKFLOW.md`](./prompts/TASK_PROMPT_WORKFLOW.md), [`VIRTUAL_TEAM_PROMPT.md`](./VIRTUAL_TEAM_PROMPT.md).

---

## Когда использовать

| Режим | Когда | Пример |
|-------|--------|--------|
| **Дневной M/L** | Рабочие часы, LGTM человека, prod-smoke | MP1–MP6 Membrane Platform |
| **Night Build** | После `yarn ritual:evening`; до `yarn ritual:day` | Рефакторинг, DRY, lint gate, UI polish без prod |

**Night Build не заменяет:**

- prod-deploy и prod-smoke (только утром или отдельным дневным PR);
- архитектурные изменения `@membrana/core` / `agenda` / `MembraneRegistry` — только ветка **`vesnin`** и явное LGTM Vesnin;
- triage новых Issue «по ходу» — только блокеры из чекпоинта.

---

## Сводная таблица ритуалов

| Момент | Команды | Артефакт |
|--------|---------|----------|
| **Старт ночи** | `yarn night:open --id <epic-id>` | `docs/NIGHT_BUILD_ACTIVE.md` |
| **Во время ночи** | агент по epic-промпту, чекпоинты каждые ~90 мин | `docs/NIGHT_BUILD_LOG.md` (append) |
| **Утро (до day ritual)** | `yarn night:close --id <epic-id>` | `docs/archive/night-build/<date>/HANDOFF.md` |
| **Утро (канон)** | `yarn ritual:day` | `MAIN_DAY_ISSUE` учитывает handoff |

---

## Жизненный цикл Night Build (6 шагов)

```
Вечер code-review → night:open → агент (NB0→NBn) → CI checkpoints → night:close → утро merge/review
```

### Шаг 0. Предусловия (вечер)

1. Выполнен **`yarn ritual:evening`** (или минимум `code-review` + архив ревью).
2. Эпик зарегистрирован в [`docs/tasks/registry.json`](./tasks/registry.json) с `"sprintKind": "night-build"`.
3. Epic-промпт содержит блок **«Night Build — промпт целиком»** и таблицу фаз NB0…NBn.
4. Рабочая ветка создана: `night/<epic-id>-<YYYY-MM-DD>` от актуального **`origin/main`**.

### Шаг 1. Открытие (`yarn night:open`)

Скрипт фиксирует:

- `epicId`, время старта (ISO), ветку, список активных подзадач NB*;
- чеклист предусловий (lint baseline, чистое дерево или явный waiver в комментарии);
- ссылку на epic-промпт.

**Запрещено открывать night build**, если:

- нет epic-промпта или подзадач NB0 в реестре;
- в `NIGHT_BUILD_ACTIVE.md` уже висит незакрытый sprint (без `--force`).

### Шаг 2. Замороженный scope

В epic-промпте обязательны:

| Блок | Содержание |
|------|------------|
| **In scope** | Только фазы NB0–NBn |
| **Out of scope** | Явный список (prod, новые фичи, core/agenda) |
| **Stop rules** | При 2 падениях CI подряд — стоп, handoff с блокером |
| **Роли по фазам** | Кто lead / support (Vesnin, Ozhegov, …) |

Агент **не** добавляет Issue, не меняет `MAIN_DAY_ISSUE`, не архивирует задачи без явной фазы NB.

### Шаг 3. Чекпоинты (каждые ~90 мин или после каждой фазы)

Минимальный набор:

```bash
git status -sb
yarn turbo run lint typecheck test --continue --filter='!@membrana/client'  # или scope из промпта
git add -A && git commit -m "night(<epic-id>): NB<n> <кратко>"   # если есть изменения
git push origin HEAD
```

Append в `docs/NIGHT_BUILD_LOG.md`:

```markdown
## Checkpoint NB<n> — <ISO time>
- Фаза: …
- CI: pass | fail (лог: …)
- Следующий шаг: …
- Блокер: — | описание
```

**Ночью не делаем:** `yarn task:close-github`, prod SSH, `--force` push.

### Шаг 4. Роли виртуальной команды (ночной порядок)

| Фаза | Lead | Support | Фокус |
|------|------|---------|--------|
| NB0 Gate | Vesnin | Ozhegov | lint/test, граф зависимостей |
| NB1 DRY | Ozhegov | Dynin, Музыкант | shared playback package |
| NB2 Facade | Ozhegov | Rodchenko | hooks, split page, session reset |
| NB3 Quality | Rodchenko | Dynin, Vesnin | a11y, cache, OpenAPI sketch |

Музыкант подключается только если фаза трогает `BufferPlayer` / seek / clipping.

### Шаг 5. Закрытие ночи (`yarn night:close`)

1. Финальный scoped CI (команда из epic-промпта).
2. Генерация **`docs/archive/night-build/<YYYY-MM-DD>/HANDOFF.md`**:
   - что сделано по NB0…NBn;
   - что не успели;
   - блокеры;
   - рекомендация для `yarn main-day-issue` (продолжить night / merge PR / prod-smoke).
3. Очистка `docs/NIGHT_BUILD_ACTIVE.md` → `status: closed`.
4. **Не** архивировать подзадачи автоматически — только после утреннего LGTM и merge PR (`yarn task:archive <nb-id>`).

### Шаг 6. Утро (Teamlead)

1. Прочитать `HANDOFF.md`.
2. `yarn ritual:day` — standup подмешивает handoff (если скрипт видит свежий архив night-build).
3. Решение: PR `night/*` → `main`, или день 2 night build (`yarn night:open --id … --continue`).

---

## Делегированное исполнение (канон, ADR-0009)

**Исполнитель фаз NB0…NBn по умолчанию — делегированный фоновый субагент**, а не
координатор в основной сессии. Ночной спринт автономен и безнадзорен по определению,
поэтому его логично отдать субагенту, освободив координатора. Механика
`night:open`/`checkpoint`/`close` при этом не меняется — меняется только КТО жмёт.

**Поток:** координатор делает `night:open` → **`yarn always-yes:on`** (scoped
auto-yes, Р7) → **спавнит фоновый субагент** (`run_in_background`,
`isolation: worktree`) с epic-промптом → субагент **наследует профиль разрешений
координатора** и автономно проходит NB0…NBn, чекпойнтит, пишет HANDOFF →
координатор получает уведомление, **верифицирует HANDOFF утром** → `yarn always-yes:off`.

Гардрейлы (Р1–Р6 ADR-0009):

| # | Гардрейл |
|---|----------|
| **Р1** | Делегирование по умолчанию; координатор не нянчит ночь, ждёт уведомления о завершении. |
| **Р2** | **Промпт эпика = контракт**: фазы NB с DoD, **жёсткие инварианты** (что запрещено, СТОП-правила приватности/безопасности явно), вердикт консилиума/ADR. Расплывчатый эпик → расплывчатая ночь. |
| **Р3** | **Human-in-loop шаги — владельцу.** Всё, что требует браузера/глаза/оборудования (визуальная оценка, живой смоук), субагент НЕ фабрикует, а откладывает и отдаёт артефакт. |
| **Р4** | **Утренняя верификация HANDOFF, не слепой мёрж.** Если ночь дала код — адверсариальная верификация. Честный негатив («не встало / утечка») — валидный исход, документируется. |
| **Р5** | **Масштаб:** один субагент = один ограниченный ночной эпик (в пределах контекста). Эпик шире → несколько делегатов или Workflow, не растягивать одного до деградации. |
| **Р6** | **Изоляция обязательна** — worktree, ветка `night/<id>-<date>`; не коллизить с параллельными сессиями. |
| **Р7** | **Scoped auto-yes, не глобальный bypass.** Чтобы владелец реально отошёл — авто-подтверждение на командной поверхности ночи (`permissions.allow`), но опасное держит **механический** `permissions.deny`, НЕ `--dangerously-skip-permissions`. |

**Пресет разрешений** — скилл [`membrana-always-yes`](../.cursor/skills/membrana-always-yes/SKILL.md)
(`yarn always-yes:on|off|status`, реализация `scripts/always-yes.mjs`). Вливает в
локальный `.claude/settings.local.json` широкий `allow` рабочей поверхности
(`Bash(git *)`/`Bash(yarn *)`/`Bash(npx turbo *)`/`Bash(node *)`/`Edit`/`Write`) и
жёсткий `deny` на прод-деплой (перечислен явными префиксами — ведущие wildcard
`Bash(*x*)` в Claude Code ненадёжны), force-push, `git reset --hard`, `ssh`,
`task:close-github`, `Edit/Write(packages/core/**)`.

> Deny-лист — это Р2/Р3 инварианты как барьер тула, а не текст в промпте: `deny` >
> `allow` во всех режимах Claude Code. Прод, force-push, SSH и правки `@membrana/core`
> невозможны даже при авто-yes на рутине. Backstop, не единственная гарантия —
> основной гард ночи остаётся Р2 (жёсткие инварианты промпта).

**Шаблон промпта ночного агента** (передаётся при спавне субагента):

```
Ты — исполнитель ночного спринта <epic-id>. Работаешь в worktree <path>, ветка night/<epic-id>-<date>.
Пройди фазы NB0…NBn ИЗ epic-промпта <path-to-prompt> строго по порядку.
ЖЁСТКИЕ ИНВАРИАНТЫ (СТОП при нарушении): <из промпта — приватность/безопасность/scope>.
После каждой фазы: scoped CI → commit night(<epic-id>): NB<n> … → yarn night:checkpoint --phase NB<n> --status pass|fail.
Human-in-loop шаги (визуальная оценка, живой смоук) НЕ выполняй — отдай артефакт и отметь в HANDOFF.
Финал: yarn night:close --id <epic-id> с честным HANDOFF (сделано / не успел / блокеры / рекомендация).
Честный негатив лучше выдуманного успеха. Не трогай prod, не мёржи, не архивируй задачи.
```

---

## Ветки и PR

| Элемент | Правило |
|---------|---------|
| Ветка | `night/<epic-id>-<YYYY-MM-DD>` |
| Base | `main` |
| PR title | `night(<epic-id>): <краткое>` |
| Merge | Утром после LGTM; CI full `yarn turbo run lint typecheck test build --continue` |
| Prod | Только отдельным дневным PR + smoke из deploy runbook |

---

## Отличия от дневного task workflow

| | День (M/L) | Night Build |
|---|------------|-------------|
| Фокус | `MAIN_DAY_ISSUE` | `NIGHT_BUILD_ACTIVE.md` + epic NB* |
| Prod-smoke | По регламенту фазы | **Запрещён** |
| Scope | Уточняется в чате | **Заморожен** в промпте |
| Архивация | Вечером `task:archive` | Утром после merge |
| Code-review | Вечером генерируется | Утро: handoff + опционально `code-review` |

---

## Definition of Done (Night Build эпик)

- [ ] Все фазы NB0…NBn либо **done** (commit + checkpoint), либо **explicitly deferred** в HANDOFF.
- [ ] Scoped CI green на конец ночи (scope в epic-промпте).
- [ ] `HANDOFF.md` в архиве; `NIGHT_BUILD_ACTIVE` closed.
- [ ] Нет prod-deploy из night branch.
- [ ] Утренний LGTM Vesnin на merge или на вторую ночь.

---

## Команды

| Команда | Действие |
|---------|----------|
| `yarn night:open --id <epic-id>` | Старт sprint, `NIGHT_BUILD_ACTIVE.md` |
| `yarn night:open --id <epic-id> --force` | Перезаписать активный sprint |
| `yarn night:open --id <epic-id> --continue` | Продолжить с HANDOFF (день 2) |
| `yarn night:checkpoint --phase NB<n> --status pass\|fail` | Append в `NIGHT_BUILD_LOG.md` |
| `yarn night:close --id <epic-id>` | Handoff + закрытие active |
| `yarn task:list` | NB* подзадачи в реестре |

---

## Шаблон epic-промпта

См. [`docs/prompts/CABINET_MP4_HARDENING_NIGHT_BUILD_EPIC_PROMPT.md`](./prompts/CABINET_MP4_HARDENING_NIGHT_BUILD_EPIC_PROMPT.md) — эталон первого Night Build эпика.

---

## Версия

- **v1.2** (2026-07-16) — Р7 оформлен скиллом [`membrana-always-yes`](../.cursor/skills/membrana-always-yes/SKILL.md) (`yarn always-yes:on|off`): scoped auto-yes включён по умолчанию в делегированном ночном спринте (субагент наследует профиль), явно — в дневном.
- **v1.1** (2026-07-15) — секция «Делегированное исполнение» (ADR-0009): фазы NB0…NBn исполняет фоновый субагент в worktree, гардрейлы Р1–Р7 (вкл. scoped auto-yes), шаблон промпта ночного агента и пресет `permissions`.
- **v1.0** (2026-06-14) — регламент, команды `night:*`, эпик cabinet MP4 hardening.

Изменения — PR с `/architect` и LGTM Vesnin.
