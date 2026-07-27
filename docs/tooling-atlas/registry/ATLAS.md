# ATLAS — контейнеры проекта (производный индекс, руками не править)

> Производный · Source: docs/**/workshop.manifest.json + README.md каждого контейнера.
> Пересобрать: `yarn tooling:atlas --render`. Дрейф ловит `yarn tooling:atlas --check`.
> Ссылка = `home` каталога. `docs/tasks` (domain) ≠ `docs/audit/tasks` (report, отчёты про задачи).

Контейнеров: **12** · плоскостей: **3** · семей: **3** · с полным набором из 3 глаголов: **5**.

## Плоскость отчётов (`docs/audit`)

| Контейнер (`home`) | role | Мастерская (глаголы) | kit | Про что |
|--------------------|------|----------------------|-----|---------|
| [docs/audit/bestiary](../../../docs/audit/bestiary/README.md) | — | audit · decompose · ~~inspectElement~~ | kits/witcher | Дом группы **антипаттернов** (звери) и их **бетий** (specimen’ы плохого кода). |
| [docs/audit/git](../../../docs/audit/git/README.md) | — | audit · decompose · ~~inspectElement~~ | — | Специальный контейнер, где агент **легально** хранит промпты, реестры веток и глубокие раз |
| [docs/audit/llm-calls](../../../docs/audit/llm-calls/README.md) | — | audit · decompose · ~~inspectElement~~ | — | Дом группы **гранул evidence** вызовов LLM-процедур (LPC): подлинность + параметры, |
| [docs/audit/tasks](../../../docs/audit/tasks/README.md) | derivative | audit · decompose · ~~inspectElement~~ | — | Слот плоскости `docs/audit/`: здесь лежат **отчёты** (снимки |

## Domain (предметные дома)

| Контейнер (`home`) | role | Мастерская (глаголы) | kit | Про что |
|--------------------|------|----------------------|-----|---------|
| [docs/archivarius](../../../docs/archivarius/README.md) | — | audit · decompose · inspectElement | — | Archivarius (#1330, эпик #1229) — архивариус прожитых сессий Membrana. Источник |
| [docs/cases](../../../docs/cases/README.md) | — | audit · decompose · inspectElement | — | Дом-контейнер кейсов: записанных **удачных** импровизаций и прогонов. Кейс — **зеркало |
| [docs/containers/strategic-docs](../../../docs/containers/strategic-docs/README.md) | — | ~~audit~~ · ~~decompose~~ · ~~inspectElement~~ | — | Статус Affine publish: **frozen** с 2026-07-26; источник — `workshop.catalog.json#surfaceS |
| [docs/evidence](../../../docs/evidence/README.md) | primary | audit · decompose · inspectElement | — | Мастерская индексации вещдоков (#1303, слово капитана 26–27.07): **индекс — суть, |
| [docs/precedents](../../../docs/precedents/README.md) | — | audit · decompose · ~~inspectElement~~ | — | Дом-контейнер прецедентов: единичных задокументированных случаев (симптом → корень → |
| [docs/procedures](../../../docs/procedures/README.md) | — | audit · decompose · inspectElement | — | Дом **определений процедур** — спроектированных сущностей, оперирующих категориями |
| [docs/tasks](../../../docs/tasks/README.md) | primary | ~~audit~~ · ~~decompose~~ · inspectElement | kits/tasks-master | Актуальные **активные** и **архивные** задачи по стандарту |

## Meta (атлас)

| Контейнер (`home`) | role | Мастерская (глаголы) | kit | Про что |
|--------------------|------|----------------------|-----|---------|
| [docs/tooling-atlas](../../../docs/tooling-atlas/README.md) | — | audit · decompose · inspectElement | — | **Контейнер контейнеров** (`plane=meta`). Его группа — сами контейнеры проекта вместе |

