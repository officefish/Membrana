# Расследование: жизненный цикл и архивирование инсайтов

> **Дата:** 2026-07-18  
> **Задача:** `insight-archive-lifecycle` · Issue #609 · draft PR #612  
> **Статус:** внутренняя фактура собрана; текущий код PR — проверяемый прототип, не принятое решение.  
> **Следующие ворота:** external deep research → заседание → новый исполнимый спринт.

## Короткий вердикт

Текущий процесс хорошо ведёт инсайт до `adopted` и умеет начать связанную задачу, но не
имеет канонического обратного перехода от закрытых задач к состоянию самого инсайта.
`membrana-insight-to-sprint` заканчивается передачей в task lifecycle; task lifecycle
архивирует **задачу**, а не доказывает реализацию всей идеи или достигнутый результат.

Первый прототип `yarn insight archive` полезен как эксперимент, но его evidence-модель
пока недостаточна для production: даже точный `task.insightId` + `task.status=archived`
не отличает shipped от `wontfix`, branch-only, duplicate и частично закрытого эпика.

## Top-3 находки расследования

1. **Архив задачи семантически неоднозначен.** `TASK_CLOSURE_REGULATION` прямо допускает
   branch-only, `wontfix`, duplicate и документированные defer-исключения. Значит статус
   задачи нельзя использовать как доказательство реализации без outcome и closure manifest.
2. **Нет обратного шва task → insight.** Мост `insight-to-sprint` создаёт task и backlink,
   но после merge ни один канонический шаг не проверяет REVIEW-мандат и не меняет состояние
   инсайта. `insight-drift` дополнительно принимает упоминание ID в notes за связь и называет
   любую архивную задачу «реализован» — это тот же ложноположительный класс.
3. **Не определено, что именно закрывается.** Hermes реализован целиком в принятом срезе;
   Persona Memory имеет shipped фазы 1/1.5, но в самом инсайте остаются фазы 2–3 и ключевая
   калибровка прогноз↔факт. Один терминальный `archived` смешивает «принятый срез доставлен»,
   «вся гипотеза исчерпана» и «идея больше не актуальна».

## Метод

- прочитаны `INSIGHT_REGULATION`, `membrana-insight`, `membrana-insight-to-sprint`,
  `membrana-task-lifecycle`, `TASK_CLOSURE_REGULATION`;
- сопоставлены все 35 записей insight registry со всеми задачами task registry;
- отдельно проверены точные `insightId`, legacy `sprintPhase`, упоминания в notes/prompts,
  active/archived состояния, REVIEW-мандаты и archive cards;
- проверены реальные PR через GitHub и наличие поставленных артефактов в `origin/main`;
- прогнаны 56 script tests и 34 Telegram module tests;
- текущий draft PR разобран как контрпример и прототип evidence gate.

## Фактическая карта процесса

```text
INSIGHT create → research → review → close(adopted/deferred/rejected)
                                  │
                                  └─ membrana-insight-to-sprint
                                     → task prompt + task.insightId + sprintPhase
                                     → task lifecycle → task archived
                                                        │
                                                        └─ обратного канонического шва нет
```

### Что умеет текущий канон

- Insight registry и `meta.json` хранят статус/вес/горизонт.
- REVIEW задаёт «Следующий шаг», scope и запреты.
- `membrana-insight-to-sprint` требует adopted, вес ≥6, конкретный следующий шаг и LGTM
  начать работу сейчас; owner override существует как историческая практика, но не как схема.
- Task registration умеет точный `--insight`, создающий `task.insightId`.
- Task closure требует DoD, LGTM, PR/исключение, Issue-отчёт и archive card.

### Чего нет

- отдельного outcome для task (`shipped | partial | wontfix | duplicate | branch-only`);
- проверки, что весь REVIEW-мандат покрыт задачей или графом задач;
- проверки дочерних задач эпика при ссылке только на архивный parent;
- evidence-манифеста инсайта с PR/SHA, review LGTM, prod-smoke и отложенными частями;
- различия между `implemented`, `realized`, `retired`, `superseded`, `rejected`;
- правила reopen/revoke при новом факте или откате реализации;
- единого шага task closure → insight reconciliation;
- транзакционного обновления registry + meta + навигатора/архивного артефакта.

## Состояние данных

На проверяемой ветке после снятия трёх ложных архивов:

| Метрика | Значение | Что означает |
|---|---:|---|
| Всего инсайтов | 35 | полный machine registry |
| adopted / archived / deferred / draft / researched | 18 / 4 / 3 / 9 / 1 | rejected сейчас нет |
| Инсайты без точного task backlink | 30 | исторический мост почти нигде не соблюдался |
| Legacy `sprintPhase` без точного backlink | 7 | фаза часто была research/review, а не implementation |
| Инсайты с mention-only связями | 13 | notes/prompt дают наводку, но не evidence |
| Строки в `docs/INSIGHTS.md` | 18 из 35 | ручной навигатор отстал от registry |
| Архивные задачи | 550 | один бинарный статус покрывает разные исходы |

Дополнительные несогласованности:

- `insight-live-neural-combined-detector` имеет `adopted`, но числового веса нет;
- статический `docs/INSIGHTS.md` продолжал показывать три пилота archived после возврата
  registry/meta в adopted;
- INSIGHT.md исторически показывает adopted даже после предложенного архивирования;
- `insight-drift` считает связь по `notes` допустимой и выводит `archived` как «реализован»;
- `meta.json` и registry сейчас совпадают, но прототип пишет их двумя отдельными rename,
  поэтому падение между операциями оставляет расхождение;
- повторный archive сразу возвращает «already archived» и не валидирует meta/evidence заново.

## Доступность процесса агентам

| Поверхность | Факт |
|---|---|
| Cursor | канонический `membrana-insight-to-sprint` существует |
| Claude | delegate существует, но путь `../../.cursor/...` из вложенной папки неверен |
| Codex / `.agents` | `membrana-insight-to-sprint` отсутствует |
| Archive | отдельного канонического skill до draft PR не было ни у одной поверхности |

Следствие: требование «все агенты соблюдают один lifecycle» раньше было невыполнимо
технически, независимо от качества текста скилла.

## Аудит кандидатов на закрытие

### Точно нельзя считать закрытыми

- `insight-operator-smoke-ci-gate`
- `insight-async-v2-product-narrative`
- `insight-competition-catalog-pipeline`

Их `sprintPhase` — фазы пилотного спринта **создания/research/review самих инсайтов**.
У фаз нет `insightId`, task prompt общий (`INSIGHT_PROCESS_SPRINT_PROMPT`), а отдельные
implementation tasks по REVIEW не зарегистрированы. Все три возвращены в `adopted`.

### Сильнейшее доказательство полного принятого среза

- **`insight-hermes-liaison-agent` → `hermes-brief`.** Точный backlink, REVIEW дословно
  ограничивает первый шаг детерминированным сборщиком, task prompt переносит запреты,
  PR #316 merged (`72f8ef79…`), LGTM записан, скрипт/тест/агент существуют, тесты зелёные.

### Реализация есть, но архивный манифест требует нормализации

- **`insight-comms-contour-topology`.** CC1–CC9 действительно поставлены PR #254–256,
  #258–262 и #264 с отдельными LGTM. Но parent archive note пишет диапазон «#254–264»:
  #257 не является PR, #263 — чужой PR presence. У parent исторически не было `insightId`,
  он добавлен post factum; девять child tasks backlink не имеют. Для строгого evidence нужны
  явный список child tasks + точные merge SHA, а не архивный parent и диапазон.
- **`insight-telegram-work-reports`.** MVP day/evening digest поставлен PR #431 + hotfix,
  E2E smoke записан, 34 module tests и script tests зелёные. Но task archive явно оставляет
  фазу 2 LLM-пересказ; решение, закрывает ли shipped MVP весь инсайт, зависит от выбранной
  семантики archive.
- **`insight-persona-persistent-memory`.** Фазы 1 и 1.5 поставлены PR #422/#461, пять
  журналов и memory-by-default существуют, тесты зелёные. Однако INSIGHT оставляет фазы
  2–3, а REVIEW называет калибровку прогноз↔факт ценностным ядром. Терминально архивировать
  весь инсайт без решения о судьбе этих фаз преждевременно.

### Остальные

Для остальных 31 записей нет одновременно точного backlink, однозначного shipped outcome
и проверки покрытия REVIEW. Они остаются активными состояниями; текстовые упоминания —
только кандидаты для отдельной forensic-миграции.

## Оценка draft-прототипа `yarn insight archive`

### Что в нём полезно

- dry-run по умолчанию и явный `--execute`;
- точный `task.insightId` вместо совпадения текста или `sprintPhase`;
- active linked task блокирует переход;
- provenance сохраняется в registry/meta, папка INSIGHT/RESEARCH/REVIEW не удаляется;
- негативные и mutation tests зелёные.

### Что не позволяет считать его production-ready

1. Принимает любой исход task archive как shipped.
2. Не проверяет исходный статус инсайта и допустимый state transition.
3. Не проверяет REVIEW/DoD coverage и child graph эпика.
4. Не различает delivery принятого среза и исчерпание всей идеи.
5. `archiveResult` — свободный текст без merge SHA, review manifest и prod evidence.
6. Open PR/worktree проверяются человеком отдельно и подвержены TOCTOU между dry-run/execute.
7. Две файловые записи не образуют транзакцию; idempotent path скрывает drift.
8. Не создаёт самостоятельную archive card/event; история живёт только в мутированных полях.
9. Не определены supersede, revoke, partial, cancelled и reopen.
10. Не обновляет/не генерирует все пользовательские представления из одного источника.

## Вопросы для external deep research

### Q1 — Landscape

Какие state machines и термины используют зрелые product discovery / decision / delivery
системы в 2024–2026, чтобы различать принятую идею, начатую реализацию, доставленный scope,
достигнутый outcome/benefit и retired/superseded решение? Нужны первичные спецификации или
официальные руководства, а не общие блоги.

### Q2 — Fit / evidence

Как в traceability и software supply-chain практиках строят доказательство
`idea/decision → requirement → task graph → reviewed commit/PR → deployment/acceptance`,
включая partial delivery, cancelled tasks, дочерние задачи эпика и исторический backfill?
Какая минимальная машиночитаемая evidence-модель подходит маленькой agentic-команде?

### Q3 — Risk / archive integrity

Какие паттерны безопасны для аудируемого lifecycle на файлах в git: append-only events против
мутации текущего состояния, derived views, optimistic concurrency/transactions, idempotency,
reopen/revoke/supersede и human override? Какие failure modes возникают при терминальном
`archived` и автоматической дедукции результата из task status?

## Кандидаты вопросов заседания

M0 должен определить DAG, после чего каждый вопрос обсуждается отдельно:

1. Что является объектом закрытия: весь INSIGHT, конкретный REVIEW-мандат или outcome?
2. Какие состояния нужны вместо одного `archived`, какие из них терминальны и обратимы?
3. Каков минимальный evidence contract для single task, эпика, deploy-gated и non-delivery исхода?
4. Как мигрировать legacy-связи и что делать с Hermes/Comms/Telegram/Persona без переписывания истории?
5. Где хранить историю: mutable registry/meta, append-only event, archive card; какие views производные?
6. Как замкнуть agent workflow и сделать одинаковый skill/guard для Cursor, Claude и Codex?
7. Как обеспечить атомарность, live-work checks, rollback/reopen и защиту от drift?

## Stop rule до заседания

- не merge draft PR #612;
- не архивировать новые инсайты;
- не считать четыре текущих archived окончательно ратифицированным набором;
- разрешены только read-only аудит, research-артефакт и подготовка meeting brief;
- после заседания текущий код либо переписывается под вердикты, либо удаляется как неудачный
  прототип; решение не выводится из самого прототипа.
