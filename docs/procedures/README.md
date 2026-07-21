# docs/procedures — процедурный слой (определения)

Дом **определений процедур** — спроектированных сущностей, оперирующих категориями
слоя (виртуальная команда, задача, ответственность, стратегическая цель).
Канон: эпик заседания [`procedural-layer`](../meeting/procedural-layer/EPIC.md)
(Р1–Р5, ратифицирован 2026-07-21); реализация — #781.

## Контракт (вердикт Р1, протокол `m1-home-r2`)

- Один каталог — одна процедура: `docs/procedures/<id>/`.
- Контейнер несёт **`README.md`** (определение + держатель) и **`MANIFEST.json`**
  (`id`, `leadPersona`, `kitVersion`, `engines[]`, `precedents[]`).
- **Кода и тестов в контейнере нет** (Т12): движки живут в плоском `scripts/`,
  связь — только ссылкой из манифеста. Это подвид `manifest-only` паттерна
  [`GROUP_CONTAINERIZATION`](../patterns/GROUP_CONTAINERIZATION.md).
- **Определение ≠ прогон.** Здесь — классы; инстансы (прогоны) живут в своих
  домах (`docs/storm/<id>/`, `docs/meeting/<id>/`, `docs/seanses/`) и не
  мигрируют — на них ссылаются `precedents[]`.
- Зуб заселённости: `validateProcedure(dir)` — `resolvable` ∧ `readmeNonEmpty` ∧
  `manifestSchemaOk`; гоняется в CI (`scripts/validate-procedure.test.mjs`).

## Словарь категорий (Р2)

Источник — [`vocabulary.json`](./vocabulary.json) (единственный машиночитаемый;
ядро закрыто, расширение — ADR + LGTM владельца). Проекция —
[`VOCABULARY.md`](./VOCABULARY.md), генерится `yarn vocabulary:generate`
(руками не правится; дрейф ловит `--check`). Проверки: `check()` по маркерам
`@cat:` и `checkGenus()` по `@op:effect:@cat:имя`
(`scripts/lib/vocabulary-check.mjs`; роды и леммы — вердикт `m2a-rod`).

## Жильцы

| Процедура | Держатель | Статус |
|-----------|-----------|--------|
| [`ritual-evening/`](./ritual-evening/README.md) | Ангелина | первый жилец (Р1) |

Реестр процедур (`registry.json`, статусы `migrated`/`legacy`) появится в Р5;
до него список ведётся этой таблицей.
