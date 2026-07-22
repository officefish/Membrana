# ATLAS — контейнеры проекта (производный индекс, руками не править)

> Производный · Source: docs/**/workshop.manifest.json + README.md каждого контейнера.
> Пересобрать: `yarn tooling:atlas --render`. Дрейф ловит `yarn tooling:atlas --check`.

Контейнеров: **6** · семей: **3** · с полным набором из 3 глаголов: **2**.

| Контейнер | Семья | Мастерская (глаголы) | kit | Про что |
|-----------|-------|----------------------|-----|---------|
| [docs/audit/bestiary](../../../docs/audit/bestiary/README.md) | audit-family | audit · decompose · ~~inspectElement~~ | — | Дом группы **антипаттернов** (звери) и их **бетий** (specimen’ы плохого кода). |
| [docs/audit/git](../../../docs/audit/git/README.md) | audit-family | audit · decompose · ~~inspectElement~~ | — | Специальный контейнер, где агент **легально** хранит промпты, реестры веток и глубокие раз |
| [docs/audit/tasks](../../../docs/audit/tasks/README.md) | audit-family | audit · decompose · ~~inspectElement~~ | — | Специальный контейнер, где агент **легально** хранит промпты, снимки декомпозиции |
| [docs/precedents](../../../docs/precedents/README.md) | domain | audit · decompose · ~~inspectElement~~ | — | Дом-контейнер прецедентов: единичных задокументированных случаев (симптом → корень → |
| [docs/procedures](../../../docs/procedures/README.md) | domain | audit · decompose · inspectElement | — | Дом **определений процедур** — спроектированных сущностей, оперирующих категориями |
| [docs/tooling-atlas](../../../docs/tooling-atlas/README.md) | meta | audit · decompose · inspectElement | — | **Контейнер контейнеров.** Его группа — сами контейнеры проекта (git-аудит, задачи, |

