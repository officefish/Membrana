# ATLAS — контейнеры проекта (производный индекс, руками не править)

> Производный · Обнаружение: `README.md` + `RootPolicy` (§3). Поля мастерской: `workshop.manifest.json`. Неймспейсы: `docs/namespaces/REGISTRY.json`.
> Пересобрать: `yarn tooling:atlas --render`. Дрейф ловит `yarn tooling:atlas --check`.
> Ссылка = `home` каталога. `docs/tasks` (domain) ≠ `docs/audit/tasks` (report, отчёты про задачи).
> **Дом без мастерской — законное состояние**, а не дефект: мастерская есть подтип дома.

Домов: **52** · из них мастерских: **13** · домов без мастерской: **39** · плоскостей: **3** · с полным набором из 3 глаголов: **6**.

## Плоскость отчётов (`docs/audit`)

| Контейнер (`home`) | role | Входной глагол | Мастерская (глаголы) | kit | Про что |
|--------------------|------|----------------|----------------------|-----|---------|
| [docs/audit/bestiary](../../../docs/audit/bestiary/README.md) | — | `yarn bestiary:audit` | audit · decompose · ~~inspectElement~~ | kits/witcher | Дом группы **антипаттернов** (звери) и их **бетий** (specimen’ы плохого кода). |
| [docs/audit/git](../../../docs/audit/git/README.md) | — | `yarn repo:branches` | audit · decompose · ~~inspectElement~~ | — | Специальный контейнер, где агент **легально** хранит промпты, реестры веток и глубокие раз |
| [docs/audit/llm-calls](../../../docs/audit/llm-calls/README.md) | — | `yarn llm-calls:audit` | audit · decompose · ~~inspectElement~~ | — | Дом группы **гранул evidence** вызовов LLM-процедур (LPC): подлинность + параметры, |
| [docs/audit/tasks](../../../docs/audit/tasks/README.md) | derivative | `yarn tasks:audit` | audit · decompose · ~~inspectElement~~ | — | Слот плоскости `docs/audit/`: здесь лежат **отчёты** (снимки |

## Domain (предметные дома)

| Контейнер (`home`) | role | Входной глагол | Мастерская (глаголы) | kit | Про что |
|--------------------|------|----------------|----------------------|-----|---------|
| [docs/archivarius](../../../docs/archivarius/README.md) | — | `yarn archivarius audit` | audit · decompose · inspectElement | — | Archivarius (#1330, эпик #1229) — архивариус прожитых сессий Membrana. Источник |
| [docs/cases](../../../docs/cases/README.md) | — | `yarn case:register --validate` | audit · decompose · inspectElement | — | Дом-контейнер кейсов: записанных **удачных** импровизаций и прогонов. Кейс — **зеркало |
| [docs/containers/strategic-docs](../../../docs/containers/strategic-docs/README.md) | — | — | ~~audit~~ · ~~decompose~~ · ~~inspectElement~~ | — | Статус Affine publish: **frozen** с 2026-07-26; источник — `workshop.catalog.json#surfaceS |
| [docs/evidence](../../../docs/evidence/README.md) | primary | `yarn evidence verify` | audit · decompose · inspectElement | — | Мастерская индексации вещдоков (#1303, слово капитана 26–27.07): **индекс — суть, |
| [docs/precedents](../../../docs/precedents/README.md) | — | `yarn precedent:register --validate` | audit · decompose · ~~inspectElement~~ | — | Дом-контейнер прецедентов: единичных задокументированных случаев (симптом → корень → |
| [docs/procedures](../../../docs/procedures/README.md) | — | `yarn procedures:workshop --audit` | audit · decompose · inspectElement | — | Дом **определений процедур** — спроектированных сущностей, оперирующих категориями |
| [docs/tasks](../../../docs/tasks/README.md) | primary | `yarn task:inspect` | ~~audit~~ · ~~decompose~~ · inspectElement | kits/tasks-master | Актуальные **активные** и **архивные** задачи по стандарту |
| [scripts](../../../scripts/README.md) | — | `yarn scripts:orphans` | audit · decompose · inspectElement | — | Единственный дом группы «скрипты и yarn-обвязка ритуала». Реализация паттерна |

## Meta (атлас)

| Контейнер (`home`) | role | Входной глагол | Мастерская (глаголы) | kit | Про что |
|--------------------|------|----------------|----------------------|-----|---------|
| [docs/tooling-atlas](../../../docs/tooling-atlas/README.md) | — | `yarn tooling:atlas --audit` | audit · decompose · inspectElement | — | **Контейнер контейнеров** (`plane=meta`). Его группа — сами контейнеры проекта вместе |

## Дома без мастерской

Законное состояние (§3): группа есть, оснастка не заведена. Манифесты «для зелени» не заводятся.

| Дом (`home`) | Про что |
|--------------|---------|
| [docs/audit](../../../docs/audit/README.md) | **Двумерный контейнер отчётов**, не склад предметных групп. |
| [docs/actions](../../../docs/actions/README.md) | Каталог **операционных регламентов**, runbooks, lessons learned, smoke-чеклистов и sign-off — в отличие от вре |
| [docs/adr](../../../docs/adr/README.md) | Лёгкая запись архитектурного решения **ниже** консилиум-гейта: когда полный |
| [docs/api/static-registry](../../../docs/api/static-registry/README.md) | This module is the composition-ready read-only transport from Cowork Sprint |
| [docs/bestiary](../../../docs/bestiary/README.md) | Дом бестиария: `BESTIARY.md` — чек-лист ведущего код-ревью |
| [docs/catalog](../../../docs/catalog/README.md) | Живые **продуктово-архитектурные спецификации** для `apps/client` (и в перспективе `apps/cabinet`). Отдельный  |
| [docs/comms](../../../docs/comms/README.md) | Leaf-контур внешних коммуникаций (брендинг, лендинги, деки, инфографика). Топология — **Вариант A**: |
| [docs/datasets/free-v1](../../../docs/datasets/free-v1/README.md) | **Эпик:** #205 free-v1-sound-catalog |
| [docs/datasets/week-2026-06-14](../../../docs/datasets/week-2026-06-14/README.md) | Рабочая папка для матриц и протоколов фаз W1–W5. |
| [docs/device-board-scripts](../../../docs/device-board-scripts/README.md) | Каталог **bundled / community UserCases**, golden JSON и legacy branch exports для `@membrana/device-board`. |
| [docs/device-board-scripts/logs](../../../docs/device-board-scripts/logs/README.md) | Логи **client app** (browser console) теперь здесь: |
| [docs/insights](../../../docs/insights/README.md) | Каталог инсайтов Membrana. Гид агента: `INSIGHT_LIFECYCLE_FOR_AGENTS.md` · |
| [docs/intern](../../../docs/intern/README.md) | Каталог собирает документы одного направления: мягкое подключение |
| [docs/memos](../../../docs/memos/README.md) | День, который не записывает себя, обречён переспрашивать. Вещдоки-мотивы: |
| [docs/namespaces](../../../docs/namespaces/README.md) | Единственный источник истины о членстве в неймспейсе. Заведён 31.07 по |
| [docs/network](../../../docs/network/README.md) | Двое суток диагноз звучал так: «на office-VDS нет исходящего маршрута к LLM, сетевой |
| [docs/patterns](../../../docs/patterns/README.md) | Каталог именованных **рекомендаций** (уровень SHOULD по RFC 2119): мягче интерфейса, |
| [docs/procedure-runs](../../../docs/procedure-runs/README.md) | Дом локального следа исполнения процедур. `docs/procedures/` хранит определения, |
| [docs/procedures/adr](../../../docs/procedures/adr/README.md) | **Определение.** `adr` — процедура фиксации архитектурного решения ниже |
| [docs/procedures/attribution](../../../docs/procedures/attribution/README.md) | **Определение.** Attribution — процедура вычисления и распределения |
| [docs/procedures/bridge](../../../docs/procedures/bridge/README.md) | **Держатель:** Ангелина (`leadPersona` манифеста) — ведущая комнаты (конспект и |
| [docs/procedures/code-review](../../../docs/procedures/code-review/README.md) | Ревью изменений виртуальной командой с **ведущим из пяти** (T3 шторма |
| [docs/procedures/containerization](../../../docs/procedures/containerization/README.md) | **Определение.** Процедура работы **Мастера контейнеризации**: различить оси |
| [docs/procedures/day-sprint](../../../docs/procedures/day-sprint/README.md) | **Определение.** Day-sprint — процедура ведения **дневного** эпика разработки: |
| [docs/procedures/deploy-media-vps](../../../docs/procedures/deploy-media-vps/README.md) | **Определение.** `deploy-media-vps` — процедура разворачивания на media-VPS |
| [docs/procedures/deploy-office-vds](../../../docs/procedures/deploy-office-vds/README.md) | **Определение.** `deploy-office-vds` — процедура разворачивания на выделенный |
| [docs/procedures/hackathon](../../../docs/procedures/hackathon/README.md) | **Определение.** `hackathon` — маршрут разработки для осевой фичи, которая |
| [docs/procedures/meeting](../../../docs/procedures/meeting/README.md) | **Определение.** Заседание — конвергентная процедура: многовопросная материя, |
| [docs/procedures/membrana-leveling](../../../docs/procedures/membrana-leveling/README.md) | **Определение.** Зонтичная процедура **детерминированного выравнивания** общего |
| [docs/procedures/membrana-local-sprint](../../../docs/procedures/membrana-local-sprint/README.md) | **Определение.** `membrana-local-sprint` — каноническая локальная процедура |
| [docs/procedures/one-shot](../../../docs/procedures/one-shot/README.md) | **Определение.** One-shot — процедура **одного прохода** по подобранной (не |
| [docs/procedures/ritual-day](../../../docs/procedures/ritual-day/README.md) | **Определение.** Утренний ритуал — процедура открытия рабочего дня: гигиена |
| [docs/procedures/ritual-dreams](../../../docs/procedures/ritual-dreams/README.md) | **Определение.** Процедура автономного/полуавтономного прогона снов: тик заезда |
| [docs/procedures/ritual-evening](../../../docs/procedures/ritual-evening/README.md) | **Определение.** Вечерний ритуал — процедура закрытия рабочего дня: архивация |
| [docs/procedures/storm](../../../docs/procedures/storm/README.md) | **Определение.** Шторм — дивергентная процедура рождения тезисов: владелец |
| [docs/procedures/weekly-dead-wire](../../../docs/procedures/weekly-dead-wire/README.md) | **Дом процедуры.** Единственная редакция; `AGENTS.md` несёт строку-указатель, а не пересказ. |
| [docs/prompts](../../../docs/prompts/README.md) | **Любая новая крупная задача (M/L)** — сначала процесс: |
| [docs/replit-tasks](../../../docs/replit-tasks/README.md) | Петля «отправить Replit-агенту задание из репо, вернуть работу в `apps/demos/`». |
| [docs/seanses/night-hunt](../../../docs/seanses/night-hunt/README.md) | Автоматические weekly-отчёты от `background-office` (OpenRouter proxy) попадают сюда **через GitHub PR** с lab |

## Предметные инструменты мастерских

Команды из `verbs.domain`; это полноправные двери мастерской, а не скрытые примечания к трём общим глаголам.

| Контейнер (`home`) | Инструмент | Команда | `worksOn` |
|--------------------|------------|---------|-----------|
| [docs/audit/bestiary](../../../docs/audit/bestiary/README.md) | `issueTrap` | — | `docs/audit/bestiary` |
| [docs/audit/git](../../../docs/audit/git/README.md) | `reconcile` | `yarn repo:branches:reconcile` | `docs/audit/git` |
| [docs/audit/git](../../../docs/audit/git/README.md) | `applyRatifiedPlan` | `yarn repo:branches:apply-plan` | `docs/audit/git` |
| [docs/audit/git](../../../docs/audit/git/README.md) | `closeout` | `yarn repo:branches:closeout` | `docs/audit/git` |
| [docs/audit/tasks](../../../docs/audit/tasks/README.md) | `handoffLiveness` | `yarn tasks:handoff-liveness` | `docs/audit/tasks/registry/` |
| [docs/archivarius](../../../docs/archivarius/README.md) | `search` | `yarn archivarius search` | `docs/archivarius` |
| [docs/archivarius](../../../docs/archivarius/README.md) | `ingest` | `yarn archivarius ingest --from ~/.claude/projects` | `docs/archivarius` |
| [docs/cases](../../../docs/cases/README.md) | `portfolio` | `yarn case:portfolio` | `docs/cases` |
| [docs/cases](../../../docs/cases/README.md) | `generalize` | `yarn case:generalize` | `docs/cases` |
| [docs/containers/strategic-docs](../../../docs/containers/strategic-docs/README.md) | `generate` | — | `docs/containers/strategic-docs` |
| [docs/containers/strategic-docs](../../../docs/containers/strategic-docs/README.md) | `publish` | — | `docs/containers/strategic-docs` |
| [docs/containers/strategic-docs](../../../docs/containers/strategic-docs/README.md) | `publishTemplates` | — | `docs/containers/strategic-docs` |
| [docs/containers/strategic-docs](../../../docs/containers/strategic-docs/README.md) | `publishReleases` | — | `docs/containers/strategic-docs` |
| [docs/containers/strategic-docs](../../../docs/containers/strategic-docs/README.md) | `discoverWorkspaces` | — | `strategy.mmbrn.tech` |

## Неймспейсы (проекция реестра)

Правил членства **ноль**. Это НЕ значит «всё припарковано» — значит, правило ещё не написано.

## Примеры вызова

Заполнено у **2** мастерских из **13**. Источник — `usage` в манифесте; здесь производная выжимка.

**Вывод — снимок, а не гарантия.** Рядом с каждым примером дата прогона: сверить его с текущим состоянием машинно нельзя, поэтому показан возраст.

### `yarn repo:branches:apply-plan` — docs/audit/git

dry-run выбирает ровно одну exact-tip цель и подтверждает, что refs, journal и report не изменены

```text
branch salvage dry-run: refs/heads/example-finished-work -> planned
dry-run: refs/journal/report were not changed
```

_замер 2026-07-31_

### `yarn repo:branches:closeout` — docs/audit/git

fail-closed сводит план и journal в воспроизводимый PASS/FAIL с числом мутаций и post-checks

```text
# Branch salvage closeout — branch-salvage-example
status: **PASS**
| Targets | 1 |
| Completed | 1 |
```

_замер 2026-07-31_

### `yarn repo:branches:reconcile` — docs/audit/git

сверяет замороженный inventory с текущими refs и отдельно показывает дрейф базы и каждой цели

```text
# Branch salvage reconciliation
- snapshot: `docs/audit/git/cache/salvage-snapshot.json`
- base moved: no
| `refs/heads/example-finished-work` | `22222222` | `22222222` | unchanged |  |
```

_замер 2026-07-31_

### `yarn scripts:orphans` — scripts

прямой ответ: есть ли бесхозные скрипты и сколько — со знаменателем

```text
scripts:orphans · знаменатель 966 (инструменты ∪ тесты)
⚠ правил членства ноль — сиротство ниже означает «правила ещё нет»
✖ бесхозных 45 из 966
```

_замер 2026-07-31_

### `yarn scripts:sets-of` — scripts

обратный поиск: в каких наборах лежит файл; различает «набора нет», «набор пуст» и «файл ни в одном»

```text
scripts:sets-of scripts/bridge.mjs · состоит в одном наборе
    кит angelina-bridge
```

_замер 2026-07-31_

Без примеров: `docs/archivarius` · `docs/audit/bestiary` · `docs/audit/llm-calls` · `docs/audit/tasks` · `docs/cases` · `docs/containers/strategic-docs` · `docs/evidence` · `docs/precedents` · `docs/procedures` · `docs/tasks` · `docs/tooling-atlas`

