# Промпт: Mintlify — мастерские и процедуры Membrana

> **Task-промпт хакатона**, размер **L**.
> Ожидаемый артефакт: один stacked PR с документацией, генерацией каталогов,
> проверками и marathon-карточкой.
> Реестр: `mintlify-workshops-procedures-hackathon` и H1-H4.

## Контекст

Mintlify покрывает продуктовую документацию, но не объясняет внутренние
мастерские и процедуры. Полная постановка, границы и DoD находятся в
[`MINTLIFY_WORKSHOPS_PROCEDURES_HACKATHON_BRIEF.md`](./MINTLIFY_WORKSHOPS_PROCEDURES_HACKATHON_BRIEF.md).

Связанные источники:

| Документ | Роль |
|----------|------|
| [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) | жизненный цикл задачи |
| [`HACKATHON_REGULATION.md`](../HACKATHON_REGULATION.md) | исторический регламент |
| [`procedures/hackathon/README.md`](../procedures/hackathon/README.md) | канон четырёх передач |
| [`procedures/EXECUTION_PROCEDURE.md`](../procedures/EXECUTION_PROCEDURE.md) | общий интерфейс маршрутов разработки |
| [`procedures/registry.json`](../procedures/registry.json) | канон каталога процедур |
| [`tooling-atlas/registry/ATLAS.md`](../tooling-atlas/registry/ATLAS.md) | обнаружение мастерских и инструментов |

## Промпт целиком

Ты — координатор хакатона `mintlify-workshops-procedures-2026-08-01`.
Исполни ровно четыре последовательные передачи H1-H4 из утверждённого brief.

Каждый этап обязан оставить `stage-completion-checklist` с четырьмя полями:

1. changed artifacts;
2. verification command/result;
3. known gaps;
4. next-stage input.

Следующий этап не начинается до ревью чеклиста предыдущего. Каталоги мастерских
и процедур должны выводиться из живых источников, а не поддерживаться вручную.
Mintlify остаётся доступной проекцией. Не придумывай примеры и не скрывай
отсутствие портфолио, дома или построенной процедуры.

### Definition of Done

Выполни полный чеклист утверждённого brief, scoped tests, Mintlify build/link
check, desktop/mobile render, командное ревью и PR. Создай отдельную активную
L-задачу `workflow-examples-marathon`; не реализуй сам маршрут marathon.

### Порядок ролей

1. **Vesnin, H1:** границы, источники, архитектура проекции.
2. **Ozhegov, H2:** доступный язык и документация мастерских.
3. **Ozhegov, H3:** документация процедур без навязывания частной топологии.
4. **Vesnin, H4:** проверка, marathon-карточка, долги и закрытие.
5. **Dynin:** проверка полноты и машинной сходимости на каждом handoff.
6. **Rodchenko:** визуальная проверка Mintlify в H2-H4.

## Out of scope

Соблюдай Out of scope и stop rules из brief без расширения.

## Проверка после PR

```powershell
node scripts/verify-mintlify-docs.mjs --root apps/docs --links
node scripts/procedural-workshop.mjs --audit
node --test scripts/mintlify-workflow-docs.test.mjs scripts/atlas-discovery.test.mjs scripts/rootpolicy.test.mjs scripts/tooling-atlas.test.mjs scripts/validate-workshop.test.mjs scripts/usage-schema.test.mjs scripts/atlas-usage.test.mjs scripts/task-register.test.mjs scripts/procedural-workshop.test.mjs scripts/procedures-registry.test.mjs scripts/validate-procedure.test.mjs scripts/procedure-home-form.test.mjs scripts/procedure-contract-license.test.mjs
```

---

## Acceptance criteria

- [x] Каталоги генерируются из 14 workshop-манифестов и 24 записей процедур.
- [x] Читатель получает overview, выбор и пошаговый маршрут без знания репозитория.
- [x] `run` отделён от `fixture`, а отсутствие evidence видно на странице.
- [x] `declared-not-built` не представлен исполнимой дверью.
- [x] Активная L-карточка `workflow-examples-marathon` зарегистрирована штатно.
- [x] Mintlify validate, a11y, links и 14 desktop/mobile viewport checks пройдены.
- [x] H1-H3 приняты назначенными рецензентами; H4 требует final review и owner gate.
