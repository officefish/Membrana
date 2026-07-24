# ATLAS — контейнеры проекта (производный индекс, руками не править)

> Производный · Source: docs/**/workshop.manifest.json + README.md каждого контейнера.
> Пересобрать: `yarn tooling:atlas --render`. Дрейф ловит `yarn tooling:atlas --check`.
> Ссылка = `home` каталога. `docs/tasks` (domain) ≠ `docs/audit/tasks` (report, отчёты про задачи).

Контейнеров: **8** · плоскостей: **3** · семей: **3** · с полным набором из 3 глаголов: **2**.

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
| [docs/precedents](../../../docs/precedents/README.md) | — | audit · decompose · ~~inspectElement~~ | — | Дом-контейнер прецедентов: единичных задокументированных случаев (симптом → корень → |
| [docs/procedures](../../../docs/procedures/README.md) | — | audit · decompose · inspectElement | — | Дом **определений процедур** — спроектированных сущностей, оперирующих категориями |
| [docs/tasks](../../../docs/tasks/README.md) | primary | ~~audit~~ · ~~decompose~~ · inspectElement | — | Актуальные **активные** и **архивные** задачи по стандарту |

## Meta (атлас)

| Контейнер (`home`) | role | Мастерская (глаголы) | kit | Про что |
|--------------------|------|----------------------|-----|---------|
| [docs/tooling-atlas](../../../docs/tooling-atlas/README.md) | — | audit · decompose · inspectElement | — | **Контейнер контейнеров** (`plane=meta`). Его группа — сами контейнеры проекта вместе |

