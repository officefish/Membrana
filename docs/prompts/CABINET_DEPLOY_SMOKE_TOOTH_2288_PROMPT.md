# Промпт: Смоук выкатки кабинета бьёт тарифы, pair и сетку образа

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **один PR** со smoke-зубом выкатки кабинета.
> Реестр: `id` = `cabinet-deploy-smoke-tooth-2288` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

04.09 `yarn cabinet:deploy:prod` дал зелёный deploy-smoke по `/health`, контейнерам и SPA,
но в production сразу после него две пользовательские двери были красными:
`GET /v1/tariffs` отвечал `503`, а `POST /v1/pair` отвечал `503`/транспортным отказом.
Смоук должен судить не только, что процесс поднялся, но и что кабинетная витрина тарифов,
pair-контур и runtime-образ несут нужные данные.

#2287/#2293 чинит сами дефекты: сетка тарифов должна попадать в image, а media bridge не должен
объявлять JSON-тело там, где тела нет. Эта задача не чинит hotfix, а ставит зуб выкатки:
после `up` и до `pass` smoke обязан краснеть на старом/испорченном образе и зеленеть только,
когда три двери честно работают.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`MAIN_DAY_ISSUE.md`](../MAIN_DAY_ISSUE.md) | Канон дня: hotfix #2287 и support-задача #2288 |
| [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) | Процесс постановки |
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | Issue / PR |
| [GitHub Issue #2288](https://github.com/officefish/Membrana/issues/2288) | Acceptance criteria задачи |
| [GitHub PR #2293](https://github.com/officefish/Membrana/pull/2293) | Смежный hotfix, который не входит в этот PR |

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead).
Перед кодом прочитай `docs/MAIN_DAY_ISSUE.md`, Issue #2288 и текущий deploy-smoke
`scripts/_ssh-cabinet-mp2-smoke.mjs`. Соблюдай
[`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и
[`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить

Расширь production smoke кабинета так, чтобы после подъёма он проверял три реальные двери:

1. `GET /v1/tariffs` **без пользовательской сессии** должен вернуть ровно `401`.
   `503`, `404`, `200` или любой другой код — красный smoke.
2. `POST /v1/pair` с заведомо негодным ключом и непустым JSON body должен вернуть
   доменный отказ: `401`/`404` или `200` с `ok:false`. `400 Body cannot be empty`,
   пустой body, transport parse error и любые `5xx` — красный smoke.
3. Runtime image должен нести тарифную сетку:
   `docker exec cabinet-api test -f /app/docs/tariffs/tariff-grid.json`.

Каждый пункт должен иметь порчу: тест, который показывает, что вчерашний/испорченный сигнал
краснеет до hotfix (`503` на tariffs, `400 Body cannot be empty` на pair, отсутствующий файл
сетки в image).

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Deploy smoke entry | `scripts/_ssh-cabinet-mp2-smoke.mjs` | SSH-запуск production smoke |
| Pure smoke model | `scripts/lib/cabinet-mp2-smoke.mjs` | Сборка remote bash и verdict-логика |
| Script tests | `scripts/_ssh-cabinet-mp2-smoke.test.mjs` | Порча и контракт smoke без SSH |
| Registry/prompt | `docs/tasks/registry.json`, этот файл | След задачи #2288 |

**Запрещено:**

- Не заводить owner/session для no-session tariffs-проверки.
- Не считать `400` на `POST /v1/pair` допустимым доменным отказом.
- Не ослаблять существующие проверки здоровья, логина, мембраны, ключей и SPA.
- Не чинить #2287/#2293 в этом PR.
- Не использовать `--restamp` и не добавлять ослабления без причины в тело PR.

---

### Тесты

| Область | Минимум |
|---------|---------|
| Tariffs no-session | `401` = pass; `503`/`404`/`200` = fail |
| Pair invalid key | `401`/`404` или `200 {ok:false}` = pass; `400 Body cannot be empty`, `5xx`, `200 {ok:true}` = fail |
| Image grid | exit `0` на `test -f` = pass; non-zero = fail |
| Remote script | содержит три новых команды и выполняет их до финального `ALL MP2 SMOKE OK` |

---

### Definition of Done

- [ ] `scripts/_ssh-cabinet-mp2-smoke.mjs` расширен тремя зубами.
- [ ] Порча покрывает три вчерашних сигнала до hotfix.
- [ ] `node --test scripts/_ssh-cabinet-mp2-smoke.test.mjs` зелёный.
- [ ] Релевантный script-test group зелёный или честно указано, почему scope уже.
- [ ] PR body не содержит `--restamp` и не объявляет ослаблений без причины.
- [ ] LGTM Teamlead.

---

### Out of scope

- Hotfix сетки в Dockerfile и media bridge: это #2287/#2293.
- Production deploy, если hotfix-образ ещё не в стволе.
- Новая owner-сессия или e2e happy-path pair с настоящим ключом.

---

### Порядок работы ролей

1. **Teamlead** — сверить Issue #2288, границу с #2293 и DoD.
2. **Структурщик** — вынести чистую verdict-логику из SSH entry.
3. **Математик** — зафиксировать таблицу допустимых/недопустимых статусов.
4. **Музыкант** — сохранить читаемый smoke output: по одной явной секции на зуб.
5. **Верстальщик** — не нужен, UI не трогаем.

---

## Acceptance criteria

- [ ] No-session `GET /v1/tariffs` краснеет на любом коде, кроме `401`.
- [ ] Invalid-key `POST /v1/pair` краснеет на `400 Body cannot be empty` и `5xx`.
- [ ] Runtime image краснеет, если `/app/docs/tariffs/tariff-grid.json` отсутствует.
- [ ] Все три порчи есть в тестах.
- [ ] #2293 упомянут как смежный hotfix, но не правится.

## Заметки для человека-постановщика

После merge: отчёт в Issue → `yarn task:archive cabinet-deploy-smoke-tooth-2288 --notes "…"` и
`yarn task:close-github` по регламенту закрытия.

### Проверка после PR

```bash
node --test scripts/_ssh-cabinet-mp2-smoke.test.mjs
yarn test:scripts:repo
```

---

## Связь с дорожной картой

- Support-задача канона дня 05.09: smoke-гейт для production кабинета после #2287/#2293.
