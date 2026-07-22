# ATLAS — контейнеры проекта (производный индекс, руками не править)

> Meta · Date: 2026-07-22 · SHA: 33ba823f · Source: docs/**/workshop.manifest.json + README.md
> Пересобрать: `yarn tooling:atlas --render`. Источник истины — README + манифест каждого контейнера.

Контейнеров: **6** · семей: **3** · с полным набором из 3 глаголов: **2**.

| Контейнер | Семья | Мастерская (глаголы) | kit | Про что |
|-----------|-------|----------------------|-----|---------|
| [docs/audit/bestiary](../../docs/audit/bestiary/README.md) | audit-family | audit · decompose · ~~inspectElement~~ | — | Дом группы **антипаттернов** (звери) и их **бетий** (specimen’ы плохого кода). |
| [docs/audit/git](../../docs/audit/git/README.md) | audit-family | audit · decompose · ~~inspectElement~~ | — | Специальный контейнер, где агент **легально** хранит промпты, реестры веток и глубокие раз |
| [docs/audit/tasks](../../docs/audit/tasks/README.md) | audit-family | audit · decompose · ~~inspectElement~~ | — | Специальный контейнер, где агент **легально** хранит промпты, снимки декомпозиции |
| [docs/precedents](../../docs/precedents/README.md) | domain | audit · decompose · ~~inspectElement~~ | — | Дом-контейнер прецедентов: единичных задокументированных случаев (симптом → корень → |
| [docs/procedures](../../docs/procedures/README.md) | domain | audit · decompose · inspectElement | — | Дом **определений процедур** — спроектированных сущностей, оперирующих категориями |
| [docs/tooling-atlas](../../docs/tooling-atlas/README.md) | meta | audit · decompose · inspectElement | — | **Контейнер контейнеров.** Его группа — сами контейнеры проекта (git-аудит, задачи, |

