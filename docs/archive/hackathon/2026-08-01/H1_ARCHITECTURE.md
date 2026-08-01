# H1 architecture — Mintlify workflow projection

## Решение

Mintlify получает два типа страниц:

1. **редакционные** — объясняют понятия, выбор и сценарий работы;
2. **производные каталоги** — собираются из существующих источников истины.

Закрытые списки мастерских и процедур в MDX вручную не ведутся.

## Источники и адаптеры

| Предмет | Источник | Переиспользуемый адаптер | Проекция |
|---------|----------|---------------------------|----------|
| Мастерские | `README.md` + RootPolicy + `workshop.manifest.json` | `discoverContainers` | `workflow/workshops/catalog.mdx` |
| Процедуры | `docs/procedures/registry.json` + `MANIFEST.json` | `auditProcedures` | `workflow/procedures/catalog.mdx` |
| Навигация | редакционный контракт | `apps/docs/docs.json` | группы Workflow |
| Дрейф | повторный render | `mintlify-workflow-docs --check` | fail до Mintlify build |

## Почему не копия ATLAS.md и REGISTRY.md

ATLAS и REGISTRY отвечают на машинный вопрос «что существует и в каком
состоянии». Mintlify отвечает на читательский вопрос «что это, когда сюда идти и
как выглядит результат». Генератор переиспользует их обнаружение и аудит, но
рендерит доступную форму с командами, примерами и явными пробелами.

## Граница примеров

- `workshop.manifest.json#usage` и `procedure MANIFEST#portfolio` считаются
  подтверждёнными носителями;
- README может дать краткое объяснение, но не доказательство прогона;
- если носителя нет, каталог печатает Warning и адрес marathon-задачи;
- придуманный пример запрещён.
