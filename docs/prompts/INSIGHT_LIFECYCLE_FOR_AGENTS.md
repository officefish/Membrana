# Жизненный цикл инсайта — гид для агентов

> **Кому:** Cursor / Claude / Codex / OpenCode, когда пользователь говорит «инсайт»,
> «открой идею», «закрой инсайт», «что уже реализовано», «перейди в спринт».  
> **Не путать с:** task archive (`yarn task:archive`), вечерним ритуалом, консилиумом.  
> **Канон фактов:** meeting C1–C7 → [`docs/meeting/insight-archive-lifecycle/`](../meeting/insight-archive-lifecycle/).  
> **Регламент процесса (артефакты):** [`INSIGHT_REGULATION.md`](./INSIGHT_REGULATION.md).  
> **Навигатор:** [`docs/INSIGHTS.md`](../INSIGHTS.md).

Этот документ — **содержательная карта**. Skills и CLI исполняют её; при споре с
устаревшим текстом в `INSIGHT_REGULATION` (цепочка `draft→…→archived`,
`close --status`, `archive --task`) побеждают вердикты C1–C7 и этот гид.

---

## 1. Что такое инсайт

Инсайт — **стратегическая идея** вне дневного ритма: гипотеза продукта / процесса /
интеграции, которой нужен research, позиция пяти ролей и явное решение, прежде чем
писать код.

| Это | Не это |
|-----|--------|
| Крупная идея с весом для `plan:week` | Исполняемая задача «на сегодня» |
| Мандат + срезы (scope), которые можно принять/отклонить | Консилиум по контракту core (там `yarn consilium`) |
| Доказуемый lifecycle D/L/O/V | «Закрыли Issue — значит идея сделана» |

**Правило размера:** если уже ясно «что кодить завтра» и не нужна внешняя фактура —
это задача (`membrana-task-lifecycle`), не инсайт. Если спор о границах пакетов /
контрактах — консилиум или ADR, не инсайт.

---

## 2. Ментальная модель: четыре оси, не один статус

Старый линейный статус (`draft → researched → reviewed → adopted → archived`) удобен
как **presentation**, но **не является истиной lifecycle**.

Истина — четыре независимые оси (C2):

| Ось | Смысл | На чём лежит | Значения (кроме `None`) |
|-----|--------|--------------|-------------------------|
| **D** | решение | Mandate / revision | `proposed` · `accepted` · `rejected` · `deferred` |
| **L** | поставка | Slice | `delivered` · `not-delivered` |
| **O** | исход / эффект | Slice | `realized` · `not-realized` |
| **V** | видимость в стратегии | representation | `active` · `archived` |

Инварианты, которые агент **не имеет права нарушать словами**:

1. **`None` ≠ «нет».** `None` — нет утверждения. Отрицания — только `not-delivered` /
   `not-realized`.
2. **`V ⇏ D/L/O` и `D/L/O ⇏ V`.** Убрали из активной очереди ≠ «решено» и ≠ «сделано».
3. **`accepted` ≠ transcribed ≠ delivered ≠ realized.** Принятие мандата не создаёт
   задачу; задача не доказывает поставку; поставка не доказывает исход.
4. Task archive, PR/branch, mention, `sprintPhase`, `insightId` сами по себе —
   **hints / relations**, не evidence для L/O.
5. Legacy label **`adopted`** = presentation для **D=`accepted`**, не отдельное
   значение оси D.

Говорить «инсайт закрыт» без указания оси и subject — запрещено. Всегда:
`D(mandate)=…`, `L(slice)=…`, `O(slice)=…`, `V(rep)=…`.

---

## 3. Когда открывать инсайт

Открывай (`yarn insight create`), если выполняется хотя бы одно:

- Пользователь формулирует **крупную идею** после эпика, соревнования, полевого
  опыта или «озарения», и хочет сохранить её **вне** `MAIN_DAY_ISSUE`.
- Нужна **внешняя фактура** (рынок / практики / риски) до решения команды.
- Нужна **позиция пяти ролей** и вес для недельного плана, а не сразу код.
- Роль виртуальной команды предлагает идею (`--source virtual-team-<role>`).

Не открывай, если:

- Это уже scoped M/L с task-промптом → `membrana-task-lifecycle`.
- Это архитектурный спор границ → `membrana-consilium` / ADR.
- Это вечернее ретро дня → `membrana-team-evening-feedback`.
- Пользователь просит «покажи очередь инсайтов» → `membrana-insight-overview`
  (read-only, без create).

---

## 4. Как правильно открывать (путь идеи → решение)

Skill: **`membrana-insight`**.

```text
create → заполнить INSIGHT.md → research → review → decide(D)
```

| Шаг | Команда / действие | Сервис | Результат |
|-----|-------------------|--------|-----------|
| 1. Create | `yarn insight create <slug> --title "…" [--source user\|virtual-team-<role>]` | CLI | папка `docs/insights/<id>/`, запись в registry (навигация) |
| 2. Describe | править `INSIGHT.md` (Scope In/Out, риски, вопрос) | агент + человек | pre-decision artifact |
| 3. Research | `yarn insight research <id>` | **Perplexity** (`PERPLEXITY_API_KEY`) или Cursor **MCP Perplexity** / `--dry-run` + ручная вставка | `RESEARCH.md` |
| 4. Review | `yarn insight review <id>` | **Anthropic** (`ANTHROPIC_API_KEY`, как standup) | `REVIEW.md`, оценки 1–10, «Следующий шаг» |
| 5. Decide | `yarn insight decide <mandate-id> --set accepted\|rejected\|deferred --request-key <key> --authority <ref>` затем `--execute` | lifecycle store (C4/C7) | **только ось D** |

### Правила шага Decide

- До `decide` нет lifecycle-истины по D (кроме `proposed` после reopen).
- Mutating-команды **по умолчанию dry-run**; запись только с `--execute` после
  authority и PASS gates.
- **Запрещено:** `yarn insight close --status adopted|…` — hard error, без writes.
- После `accepted` **не** создавай task молча. Переход в разработку — отдельный
  осознанный шаг (см. §6).

Presentation-статусы `draft / researched / reviewed` в registry/meta — удобные метки
для людей; **не** подменяй ими replayed D/L/O/V из `yarn insight status`.

---

## 5. Когда и как «закрывать»

«Закрыть» — омоним. Разведи три разных закрытия.

### 5.1 Закрыть решение (ось D)

**Когда:** research + review готовы, Teamlead/владелец выбирает судьбу мандата.

| Исход | `--set` | Смысл |
|-------|---------|--------|
| Берём в работу стратегии | `accepted` | мандат принят; спринт ещё не начат |
| Не сейчас | `deferred` | осознанная пауза, не «забыли» |
| Не берём | `rejected` | явное нет |

Команда: `yarn insight decide …` (+ `--execute`).  
Skill: `membrana-insight`.

### 5.2 Закрыть поставку / исход (оси L и O)

**Когда:** по связанным задачам есть **typed evidence** (не «PR смержен» в чате), и
нужно зафиксировать delivered/not-delivered и/или realized/not-realized **по Slice**.

| Недостаточно | Нужно |
|--------------|--------|
| `yarn task:archive` | C3 EvidenceNode того же TargetClaim |
| mention в PR / notes | exact EvidenceCandidates → classify → AssertL/AssertO |
| «все фазы done» в markdown | `yarn insight reconcile` с request-файлом |

Команда: `yarn insight reconcile <id> --request <file>` (dry-run → `--execute`).  
Skill: **`membrana-insight-lifecycle`**.

Routine reconcile **не** создаёт Revoke. Если current уже Some другого value —
handoff на `correct`, не «перезаписать».

**Запрещено:** `yarn insight archive --task … --result …` — hard error.

### 5.3 Убрать из активной стратегии (ось V)

**Когда:** идея не должна светиться в активной очереди / overview как «живая», но это
**не** утверждение о решении или поставке.

Команда:

```bash
yarn insight visibility <representation> --set active|archived --reason "…" \
  --request-key <key> --authority <ref>
```

Skill: `membrana-insight-lifecycle`.

`V=archived` **не значит** «сделано». Часто корректно: D=`accepted`, L/O=`None`,
V=`archived` (отложили видимость) или наоборот — реализованные срезы при V=`active`.

### 5.4 Переоткрыть / заменить решение

| Действие | Команда | Эффект |
|----------|---------|--------|
| Новая ревизия мандата | `yarn insight reopen …` | новый ID, D=`proposed`; transcription не переносится |
| Связь старого решения с преемником | `yarn insight supersede …` | event-only link, без mute history |
| Исправить ошибочный assert | `yarn insight correct …` | не rewrite прошлых событий |

Исторические артефакты и committed events **не переписываются**.

---

## 6. От принятого инсайта к спринту

Skill: **`membrana-insight-to-sprint`**.

Gate (все обязательны):

1. Replayed **D=`accepted`** на exact Mandate (не «в registry написано adopted»).
2. `weight ≥ 6.0` (порог `plan:week`).
3. В `REVIEW.md` есть конкретный **«Следующий шаг»**.
4. Явный LGTM человека/Teamlead **начать спринт сейчас**.

Дальше: транскрипция REVIEW → task-промпт → `docs/tasks/registry.json` с
`insightId` / exact `mandateId` → работа по `membrana-task-lifecycle`.

`Task→Mandate` — единственная typed relation. Она **не** ставит L/O/V.

После закрытия задач lifecycle инсайта **не** обновляется сам — нужен
`reconcile` (+ при необходимости `visibility`).

---

## 7. Сопутствующие сервисы и поверхности для агентов

### 7.1 CLI (единый вход)

```bash
yarn insight help
yarn insight list
yarn insight create|research|review          # путь идеи (artifacts)
yarn insight decide                          # D
yarn insight status <id> [--json]            # replay D/L/O/V + gaps
yarn insight overview [--json]               # полный read-only снимок
yarn insight reconcile|visibility|correct|reopen|supersede|migrate-legacy
yarn insight verify                          # enforcement / drift adapter
```

Совместимость: `yarn insight:drift` — thin adapter к verify, **без** старых
выводов «из mention/archive».

Все lifecycle-transitions: **default dry-run**.

### 7.2 Внешние / API-сервисы

| Сервис | Когда | Ключ / доступ | Fallback |
|--------|-------|---------------|----------|
| **Perplexity** | `research` — Landscape / Fit / Risk | `PERPLEXITY_API_KEY` | Cursor MCP `user-perplexity` или `--dry-run` + ручная запись в `RESEARCH.md` |
| **Anthropic** | `review` — 5 ролей | `ANTHROPIC_API_KEY` (+ proxy-паттерны репо) | dry-run / ручной REVIEW по `INSIGHT_REVIEW_PROMPT.md` |
| **Office** | не обязателен для create/research/review; нужен для части ритуалов/swallow | `OFFICE_API_TOKEN` | не блокирует lifecycle decide/reconcile локально |
| **RAG** | контекст при обсуждении / Hermes | operative без OpenAI; archive — `OPENAI_API_KEY` | не источник истины D/L/O/V |

### 7.3 Skills (четыре узких + соседи)

| Skill | Ответственность |
|-------|-----------------|
| `membrana-insight` | create → research → review → **decide(D)** |
| `membrana-insight-to-sprint` | accepted Mandate → Task→Mandate + task-промпт |
| `membrana-insight-lifecycle` | status, reconcile L/O, visibility V, correct/reopen/supersede/migrate |
| `membrana-insight-overview` | read-only: все инсайты тезисами, gaps, personal top-3, objective candidate |
| `membrana-task-lifecycle` | исполнение и archive **задачи** (не инсайта) |
| `membrana-task-closure-review` | LGTM/BLOCK SHA → candidates для evidence (ещё не L/O assert) |
| `membrana-consilium` | архитектурный спор **до** кода; не замена insight review |
| `membrana-deep-research` | deep research для **спринта** с внешним неизвестным; для инсайта обычно хватает `insight research` |

Канон skills — `.cursor/skills/*/SKILL.md`. Claude/Codex/OpenCode — thin mirrors.

### 7.4 Read-only обзор (ежедневный вопрос «что с инсайтами?»)

Skill: `membrana-insight-overview` → `yarn insight overview`.

Обязательный ответ агента: counts → **все** записи по V-группам → на каждый:
смысл + D + L + O + V + gap → блоки **«Мой top-3»** и **«Объективный кандидат»**
отдельно. Personal top-3 **не** создаёт event и **не** стартует спринт.

---

## 8. Типичные сценарии (шпаргалка)

| Ситуация пользователя | Что делать |
|-----------------------|------------|
| «Запиши идею про X» | `membrana-insight`: create → INSIGHT.md → research → review → decide |
| «Что у нас по инсайтам?» | `membrana-insight-overview` |
| «Приняли — начинай спринт» | gate §6 → `membrana-insight-to-sprint` → task lifecycle |
| «Задачу заархивировали — инсайт сделан?» | **Нет.** `status` → при evidence `reconcile`; V отдельно |
| «Убери из активной очереди» | `visibility --set archived` (не decide, не archive --task) |
| «Передумали после rejected/accepted» | `reopen` (новая revision) или `supersede` + новый decide |
| «Почини ложный delivered» | `correct` с authority; не silent overwrite |
| «Старый registry врёт» | `status` / lifecycle views; `migrate-legacy` только по C5 manifest |

---

## 9. Формат ответа агента по lifecycle

Любой human report после mutating или status:

1. итог и режим (dry-run / execute / read-only);
2. exact scope (insight / mandate / slice / representation);
3. **отдельно** D, L, O, V (с `None`, если нет assertion);
4. evidence vs hints vs invalid;
5. safety / projection diff;
6. что **не** было выведено автоматически;
7. следующий handoff (skill + команда).

---

## 10. Жёсткие запреты

- `insight close --status …` и `insight archive --task --result …` — не вызывать и не
  «обходить» alias’ами.
- Выводить L/O из task archive / PR / «все упомянули insightId».
- Ставить V автоматически «если все slices delivered».
- Называть весь insight delivered по одной фазе/задаче.
- Мутировать legacy `registry.json` / `meta.status` как source of truth lifecycle.
- Смешивать insight lifecycle с `ritual:day` / `ritual:evening`.
- Создавать task из `accepted` без LGTM и skill `insight-to-sprint`.

---

## 11. Карта документов

| Документ | Роль |
|----------|------|
| **Этот файл** | содержательный гид агента: когда открывать/закрывать, сервисы |
| [`INSIGHT_REGULATION.md`](./INSIGHT_REGULATION.md) | артефакты папки, research/review, вес, team insights |
| [`INSIGHT_REVIEW_PROMPT.md`](./INSIGHT_REVIEW_PROMPT.md) | формат REVIEW |
| [`INSIGHT_ARCHIVE_LIFECYCLE_PROMPT.md`](./INSIGHT_ARCHIVE_LIFECYCLE_PROMPT.md) | task-промпт внедрения C1–C7 (история #609/#677) |
| C1–C7 `*_VERDICT.md` | непреложные контракты осей, evidence, CLI, safety |
| [`docs/INSIGHTS.md`](../INSIGHTS.md) | навигатор + команды |
| [`docs/insights/README.md`](../insights/README.md) | структура папок |

При конфликте: **C1–C7 verdict > этот гид > regulation presentation > registry notes**.
