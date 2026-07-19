# RESEARCH: Evidence-gated архивирование реализованных инсайтов

> Сгенерировано `yarn research` (Perplexity API), 2026-07-18.
> Выжимка — вход для решения, а не решение: проверяй утверждения по нашему коду.
## Q1 — Landscape

**Запрос:** Какие state machines и термины используют зрелые product discovery, decision и delivery системы в 2024–2026, чтобы различать принятую идею, начатую реализацию, доставленный scope, достигнутый outcome или benefit и retired либо superseded решение? Нужны первичные спецификации или официальные руководства.

**Выжимка:**

В 2024–2026 годах зрелые системы **product discovery**, **decision** и **delivery** редко используют классические «state machines» (конечные автоматы) в явном виде для треккинга жизненного цикла продукта (идея → outcome → retirement). Вместо этого они применяют **событийно-ориентированные workflows** (event-driven workflows) и концепции **Lifecycle State Models** в рамках инструментов управления (например, Linear, Jira, Azure DevOps), где состояния определяются как **стандартные статусы workflow**, а переходы контролируются через **триггеры** и **intent-based API** [2][9].

Основные термины и модели состояний, разделяющие этапы (идея, реализация, deliver, outcome, retirement), сформулированы в следующих официальных спецификациях и руководствах:

### 1. Основные модели состояний и термины (State & Term Mapping)

| Этап жизненного цикла | Официальный термин (Framework) | Описание состояния (State) | Ключевой критерий перехода |
| :--- | :--- | :--- | : |
| **Идея принята** | **Validated Opportunity** (Opportunity Solution Tree 2.0) [10] | Идея прошла проверку гипотез и приоритизирована в **Opportunity Tree**. Не просто «idea», но «validated». | Наличие данных из тестирования (прототипы, интервью) и подтвержденная ценность для пользователя [7]. |
| **Начат реализация** | **In Delivery** / **In Progress** (Double Diamond 2026) [10] | Активная разработка в рамках **Develop** фазы. | Команда взяла задачу в работу (start of execution), статус сменился на «In Progress» [7]. |
| **Доставленный scope** | **Delivered** / **Released** (Double Diamond 2026) [10] | Функция вышла в продакшн (UX performance prediction before launch). | Код развернут, функционал доступен пользователям (end of delivery). |
| **Достигнутый outcome** | **Outcome Achieved** / **Benefit Realized** (OST 2.0) [10] | Измеренный метрический результат (predictive outcome modeling). | Подтвержденный рост ключевой метрики (а не просто факт релиза) [10]. |
| **Retired/Superseded** | **Deprecated** / **Retired** (Enterprise Lifecycle) [9] | Решение заменено новым или удалено. | Отказ от поддержки (end of support) или переход на новую версию (superseded). |

### 2. Первичные спецификации и официальные руководства

Вот конкретные источники, определяющие эти термины и процессы в 2024–2026:

*   **Opportunity Solution Tree (OST) 2.0**:
    *   **Источник:** *StrategyDriven: The State of Product Design in 2026* [10].
    *   **Специфика:** OST обогащен **predictive value models** и **live UX metric dashboards**. Термин **Outcome** здесь строго отделен от **Delivered scope**: первый — это измеренный эффект, второй — факт выпуска функции. Система не считает работу завершенной, пока не подтвержден Outcome.

*   **The Evolving Double Diamond (2026 Edition)**:
    *   **Источник:** *StrategyDriven: The State of Product Design in 2026* [10].
    *   **Специфика:** Включает фазы **Discover**, **Define**, **Develop**, **Deliver**. Фаза **Deliver** четко разграничивает **UX performance prediction** (перед запуском) и пост-релизный **Outcome**. Модель добавляет **continuous prediction loops**, что позволяет отслеживать переход от Delivery к Outcome автоматически.

*   **Event-Driven State Machine Patterns (Microservices)**:
    *   **Источник:** *Richard Clayton, "Use State Machines!"* [9] (методология, актуальная для 2024–2026 в распределенных системах).
    *   **Специфика:** Рекомендуется использовать **Event Cascades** и **intent-based API**. Состояния (States) моделируются как граф переходов (transitions), где бизнес-логика (например, «идея принята» или «outcome достигнут») форсирует разработчиков явно определять поведения. Это позволяет масштабировать state machines между микросервисами.

*   **Инструментальная спецификация (Linear + OpenAI Symphony)**:
    *   **Источник:** *YouTube: How I run autonomous coding agents...* [2].
    *   **Специфика:** В современных автономных системах (2024–2026) **Linear** выступает в роли **state machine**, где **discovery** — это этап принятия решения («decide what to build»), а **delivery** — это цикл разработки. Система управляет агентами через весь **dev lifecycle**, используя конечные автоматы для контроля состояний (например, от «idea» до «done»).

### 3. Критическое различие: Scope vs Outcome
В зрелых системах 2026 года ключевое различие, которое вы запрашиваете, реализуется через **отдельные статусы workflow** и **метрические триггеры**:
*   **Scope Delivered** = факт включения функционала в релиз (статус `Done` в трекере).
*   **Outcome Achieved** = факт достижения целевой метрики (статус `Validated` или `Benefit Realized`, который часто автоматизируется через интеграцию с BI-системами и dashboards [10]).

Стандартные **Finite State Machines (FSM)** в классическом понимании (например, UiPath или AWS Step Functions) [3][5] используются для автоматизации процессов, но **не** для терминологического разграничения продуктовых этапов. Для этого используются **жизненные циклы продуктов (Product Lifecycle Models)**, описанные в OST 2.0 и Double Diamond 2026 [10].

**Рекомендация:** Для построения системы используйте модель **Opportunity Solution Tree 2.0** с явными статусами `Validated Opportunity` (идея), `In Delivery` (реализация), `Delivered` (scope) и `Outcome Achieved` (benefit), где переход на последний статус требует подтверждения метрики, а не только релиза [10]. Для retired решений используйте статус `Deprecated` или `Retired` в соответствии с паттерном FSM для управления жизненным циклом [9].

## Q2 — Fit (Membrana)

**Запрос:** Как в requirements traceability и software supply-chain практиках строят доказательство idea или decision → requirement → task graph → reviewed commit или pull request → deployment и acceptance, включая partial delivery, cancelled tasks, дочерние задачи эпика и исторический backfill? Какая минимальная машиночитаемая evidence-модель подходит маленькой agentic-команде с файлами в git?

**Выжимка:**

Для построения доказательства цепочки **idea/decision → requirement → task → reviewed commit/PR → deployment → acceptance** в экспортно-ориентированных практиках (трейсируемость требований и безопасность цепочки поставок) используется ** bidirectional traceability **(двусторонняя трассируемость), где каждый узел графа связан с документированным эвридинтом (evidence) на каждом этапе [1][3]. Минимальная машиночитаемая модель для маленькой agentic-команды с файлами в git — это **стандартизированный Requirements Traceability Matrix **(RTM), реализованный как JSON/YAML файл в корне проекта (или в `docs/`), где связи между `id` узлов зарефренированы через ссылки на git-хеш, PR-номер и тег релиза [4][9].

### 1. Архитектура доказательства (Proof Chain)

Доказательство строится не как линейный отчет, а как **граф связей**, где каждый переход подтверждается конкретным артефактом:

| Этап цепочки | Требуемый Evidence (Доказательство) | Смысл связи (Direction) |
| :--- | :--- | :--- |
| **Idea/Decision** | Запись в meeting-протоколе, ссылка на issue-трекер (feat-запрос), или текст в `CHANGELOG.md` (pre-RS) [5] | **Forward**: Откуда пришло требование (Origin) [4] |
| **Requirement** | Уникальный **ID требования** (например, `REQ-001`), описание, статус, источник [3] | **Link**: Идентификация сущности [3] |
| **Task Graph** | Связь `REQ-001` → `Task_A` (эпик → дочерняя задача), включающая `cancelled tasks` и `partial delivery` (статусы задач) [3] | **Forward**: Где требование реализовано (Implementation) [4] |
| **Commit/PR** | В теле PR или в комментарии коммита: `TICKET: REQ-001` + `Reviewed by: @agent` + Hash коммита [11] | **Link**: Код, реализующий требование [1] |
| **Deployment** | Имя тегa релиза (`v1.2.0`), связь с Hash коммита, артефакт сборки (SBOM) [8] | **Forward**: Где требование в продукте (Product) [4] |
| **Acceptance** | Отчет о тестировании (Test Report), связанный с `REQ-001` и тегом релиза (Verified status) [3][8] | **Backward**: Проверка требования (Verification) [4] |

**Ключевые принципы для сложных сценариев**:
*   **Partial Delivery & Cancelled Tasks**: В модели RTM статус требования должен отражать не просто «закрыто», а «частично реализовано» или «отклонено», с явным указанием задач, которые ведут к этому статусу (например, `Task_A` — `done`, `Task_B` — `cancelled`) [3].
*   **Дочерние задачи эпика**: Эпик разбивается на дочерние задачи, каждая из которых трассируется к конкретному под-требованию или части большого требования. Связь `Epic → Subtask → Requirement` должна быть явно описана в JSON-модели [3].
*   **Historical Backfill**: При историческом заполнении данных (backfill) критически важно сохранить **immutable ID** (постоянный уникальный код) для требования, чтобы связи с новыми коммитами не ломались [10]. Связь `Requirement ID` → `Commit Hash` должна быть зафиксирована в момент backfill, даже если решение было принято раньше [3].

### 2. Минимальная машиночитаемая Evidence-модель (JSON Schema)

Для команды, работающей в git, избыточность внешних инструментов (как Intland или Xray) нецелесообразна. Модель должна быть **файловой (file-based)**, храниться в `docs/traceability.json` или `requirements/traceability.yaml`, и поддерживаться агентами автоматически.

**Рекомендуемая структура (JSON)**:

```json
{
  "schema_version": "1.0",
  "requirements": [
    {
      "id": "REQ-001",
      "description": "Агенты должны обрабатывать частичные доставки",
      "source": "decision_meeting_2026-01",
      "status": "partial",
      "trace_links": [
        {
          "type": "task",
          "id": "TASK-EPIC-01",
          "status": "done",
          "child_tasks": [
            {"id": "TASK-01-A", "status": "done", "commit_hash": "a1b2c3d"},
            {"id": "TASK-01-B", "status": "cancelled", "reason": "scope_change"}
          ]
        },
        {
          "type": "commit",
          "hash": "a1b2c3d",
          "pr_number": 42,
          "reviewer": "@agent-checker"
        },
        {
          "type": "deployment",
          "tag": "v1.2.0-alpha",
          "sbom_ref": "sbom-2026-01.json"
        },
        {
          "type": "acceptance",
          "test_report": "test-report-2026-01.md",
          "result": "verified_partial"
        }
      ]
    }
  ]
}
```

**Почему это минимально и эффективно**:
1.  **Уникальные ID**: Использование «просто, уникального, произвольно назначенного кода» (например, `REQ-001`) — это лучший метод для персистентности ссылок [10].
2.  **Git-native ссылки**: `commit_hash`, `pr_number`, `tag` — это прямые ссылки на существующие артефакты в git, что обеспечивает **audit-ready verification evidence** без необходимости вентилирования внешних API [8].
3.  **Автоматизация**: Агенты могут легко парсить этот JSON, обновлять статусы (`status`) при закрытии PR или тегировании релиза, и проверять полноту цепочки (пустая ячейка в матрице — сигнал о пропущенной связи) [4][9].
4.  **Support for Backfill**: Модель позволяет добавлять новые `trace_links` к старым `REQ`, не меняя структуру самого требования, что критично для historical backfill [3].

### 3. Практика интерпретации в Software Supply-Chain

В контексте безопасности цепочки поставок (Security of Software Supply Chain) трассируемость отвечает на вопросы аудитора: «Почему было сделано изменение?», «Какой код изменился?», «Проверен ли код?», «И в продакшене ли он?» [11].

*   **Для агентов**: Правила linting (например, `gitlint` или `commitlint`) могут проверять, что в теле коммита или PR есть ссылка на `REQ-ID` (например, заголовок `feat: implement REQ-001`).
*   **Для аудитов**: Генерация отчета (например, через `jq` или простой Python-скрипт) из `traceability.json` в формат HTML/Markdown, который визуализирует граф и показывает статусы (done, cancelled, partial), позволяет мгновенно продемонстрировать **governed baselines** и **audit-ready** цепочку [8].

Эта модель заменяет сложные таблицы Excel (которые трудно поддерживать автоматически) на структурированный файл, который является частью кодовой базы, обеспечивая **continuous traceability** вместо одноключевой документации [3].

## Q3 — Risk
> ⚠ **Иероглифы в тексте** — брак генерации модели; читать особенно внимательно.


**Запрос:** Какие паттерны безопасны для аудируемого lifecycle на файлах в git: append-only events против мутации текущего состояния, derived views, optimistic concurrency, idempotency, reopen, revoke, supersede и human override? Какие failure modes возникают при терминальном archived и автоматической дедукции результата из task status?

**Выжимка:**

Из предоставленных поисковых результатов **недостаточно информации** для прямого ответа на вопрос о безопасности конкретных паттернов (append-only, optimistic concurrency, idempotency и др.) для «аудируемого lifecycle» в Git, так как источники описывают общие принципы работы Git (хеширование SHA-1, жизненный цикл файла: untracked → modified → staged) и общие практики безопасности (не коммитить секреты), но не анализируют специфические архитектурные паттерны аудита и управления состоянием в контексте Git-репозиториев[2][3][6].

Однако, основываясь на фундаментальных принципах Git, подтвержденных в результатах, можно дать технический вывод:

1.  **Почему append-only безопасен, а мутация состояния — рискована для аудита:**
    *   **Append-only (только добавление):** Поскольку Git использует криптографические SHA-1 хеши для идентификации всех объектов, любая модификация существующего файла меняет его хеш, что немедленно обнаруживается при проверке целостности[2]. В паттерне append-only новые события просто добавляются как новые коммиты, сохраняя неизменную (immutable) публичную историю, что соответствует правилу «публичная история неизменна, атомарна и легко прослеживаема»[6]. Это обеспечивает **полную аудитируемость** (auditable), так как историческое состояние никогда не перезаписывается.
    *   **Мутация текущего состояния:** Попытка изменить («мутить») текущее состояние файла (например, через `git commit --amend` или перезапись истории в публичной ветке) нарушает принцип неизменности публичной истории[6]. В контексте аудита это создает **failure mode** потери доказательной цепочки, так как старое состояние заменено новым, и хеш файла меняется, что может быть интерпретировано как повреждение или неавторизированное изменение监测系统[2].

2.  **Остальные паттерны (derived views, optimistic concurrency, idempotency, reopen, revoke, supersede, human override):**
    *   В результатах поиска нет данных о их применимости именно к Git-файлам для аудита.
    *   *Логический вывод (инференция):* Паттерны вроде **idempotency** (идентичность) и **optimistic concurrency** (оптимистичная конвергенция) обычно относятся к системам управления транзакциями баз данных, а не к файловой системе Git, где конкуренция решается через блокировку (lock) или merge-конфликты.
    *   Паттерны **revoke**, **supersede**, **reopen** в Git реализуются не как изменение старого коммита, а как создание новых коммитов, которые логически «суперседируют» (отменяют) или «возвращают» состояние, что технически является формой **append-only** с семантическими метками.

3.  **Failure modes при терминальном archived и автоматической дедукции:**
    *   **Терминальный archived (архивирование):** Если архивирование подразумевает удаление истории из активной ветки или изменение хешей (например, сжатие `git gc` без проверки), возникает риск **нарушения целостности данных** (data integrity violation), так как Git автоматически проверяет целостность при каждой операции[2].
    *   **Автоматическая дедукция результата из task status:** Главный **failure mode** — это **расхождение состояния (state divergence)**. Если статус задачи (например, в CI/CD) автоматически дедуктируется в результат файла без явного человеческого подтверждения (human override), система может ошибочно зафиксировать неверный результат как итоговый коммит. Поскольку Git делает любую модификацию заметной через хеш[2], ложная дедукция создаст «фантомный» коммит, который невозможно незаметно исправить без перезаписи истории (что запрещено для публичных веток)[6].

**Резюме:** Для аудируемого lifecycle в Git единственным гарантированно безопасным паттерном является **append-only events** (добавление новых событий), так как он полностью согласуется с криптографической моделью целостности Git и принципом неизменности публичной истории[2][6]. Мутация текущего состояния, **revoke**, **supersede** и **human override** в Git-реализации должны быть реализованы как *новые коммиты* (append-only), а не как изменение старых файлов. Failure modes при автоматической дедукции заключаются в создании некорректных, но криптографически верных коммитов, нарушение цепочки аудита.

*Примечание: Уточнение деталей по паттернам optimistic concurrency, idempotency и reopen в контексте Git требует специализированных источников, не представленных в текущем поиске.*

## Верификация по первичным и официальным источникам

> Этот раздел добавлен после output-gate Q3. Утверждения Perplexity выше не принимаются
> автоматически: Q1 опирается на вторичные материалы, Q3 сам признал недостаток источников.

### 1. Archive не является outcome

- GitHub различает причины закрытия issue: **completed** и **not planned**, а также
  показывает reopened отдельно. Один `closed` не доказывает delivery:
  [Closing an issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/administering-issues/closing-an-issue),
  [Filtering projects](https://docs.github.com/en/enterprise-cloud@latest/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/filtering-projects).
- Linear архивирует закрытые issues после состояний **completed, canceled или auto-closed**,
  хранит их для истории и позволяет восстановить. Для parent/project архив блокируется,
  пока дочерние элементы не доступны для архива:
  [Delete and archive issues](https://linear.app/docs/delete-archive-issues).

**Вывод для заседания:** `archived` — состояние хранения/видимости, ортогональное
результату. Нужен отдельный outcome (`delivered`, `partial`, `cancelled`, `not_planned`),
а не попытка вывести outcome из archive.

### 2. Решение, его реализация и подтверждение — разные сущности

MADR 4.0 предлагает decision status `proposed | rejected | accepted | deprecated | … |
superseded by ADR-…`, а подтверждение реализации/соответствия выносит в отдельный раздел
`Confirmation`: [MADR template](https://adr.github.io/madr/).

**Вывод:** состояние идеи/решения нельзя схлопывать с evidence реализации. `accepted`,
`superseded` и `deprecated` описывают решение; confirmation описывает исполнение.

### 3. Одного backlink недостаточно

OSLC Requirements Management задаёт разные типизированные связи: `implementedBy`,
`trackedBy`, `validatedBy`, `satisfiedBy`, `affectedBy`:
[OSLC RM 2.1 Vocabulary](https://docs.oasis-open.org/oslc-domains/oslc-rm/v2.1/cs01/part2-requirements-management-vocab/oslc-rm-v2.1-cs01-part2-requirements-management-vocab.html).

SLSA provenance — attestation о **конкретных artifacts**: subject, digest, build definition,
resolved dependencies, builder/run details. Она позволяет проверить, что artifact произведён
ожидаемым способом; task status такой гарантии не даёт:
[SLSA Provenance](https://slsa.dev/spec/v1.2/provenance).

W3C PROV разделяет `Entity`, `Activity`, `Agent` и связи `wasGeneratedBy`, `wasDerivedFrom`,
`wasAssociatedWith`, `wasRevisionOf`, `wasInvalidatedBy`:
[PROV-O](https://www.w3.org/TR/prov-o/),
[PROV Constraints](https://www.w3.org/TR/prov-constraints/).

**Вывод:** минимальный evidence bundle должен иметь типизированные рёбра, а не только
`implementationTaskIds`: mandate/requirement → tracked task graph → implementation artifact
→ validation/acceptance, плюс actor и timestamp.

### 4. Append-only полезен, но не бесплатен

Microsoft Event Sourcing описывает append-only event store как source of truth, derived
materialized views, optimistic concurrency, idempotent consumers и compensating events.
Там же прямо сказано, что pattern сложен, миграция дорога и для большинства простых систем
традиционное хранение достаточно:
[Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing).

**Вывод:** для Membrana разумен небольшой append-only lifecycle log с производным текущим
view, если заседание подтвердит цену аудита. Полноценный event-sourcing framework не нужен.
Reopen/revoke/supersede должны быть новыми intent-событиями или компенсирующими записями;
проекции обязаны быть воспроизводимы и защищены sequence/version check.

## Итог external research

1. Внешние источники опровергают базовую гипотезу draft-прототипа: `archived task`
   не является достаточным evidence shipped outcome.
2. Самая устойчивая модель разделяет три оси: **decision status**, **delivery/outcome status**
   и **archive/visibility status**.
3. Evidence должен быть типизированным графом/набором attestations; точный `insightId` —
   необходимая трасса, но только одно ребро `trackedBy`, не доказательство реализации.
4. Append-only история с derived view хорошо закрывает аудит и reopen, но должна остаться
   маленькой и детерминированной; сложность полноценного event sourcing здесь избыточна.
5. Точный набор состояний и судьбу четырёх спорных инсайтов внешняя фактура не решает —
   это вопросы заседания и владельческого мандата.
