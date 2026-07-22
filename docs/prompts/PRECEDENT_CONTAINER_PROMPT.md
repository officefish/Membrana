# Промпт: контейнер прецедентов + мастерская к нему

> **Task-промпт для агента-разработчика.**
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — дом-контейнер прецедентов + инструмент регистрации + мастерская-манифест.
> Реестр: `id` = `precedent-container` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Источник — инсайт [`insight-precedent-container`](../insights/insight-precedent-container/INSIGHT.md)
(accepted владельцем 22.07, вес ревью 6.6, статус adopted). Прецеденты сегодня лежат
плоско: 4 файла в `docs/precedents/`, ни README-контракта, ни реестра, ни схемы, ни
инструмента. Регистрировать прецеденты нужно уже сейчас.

**Связанные документы:**

- Паттерны: [`GROUP_CONTAINERIZATION`](../patterns/GROUP_CONTAINERIZATION.md),
  [`HOME_WORKSHOP`](../patterns/HOME_WORKSHOP.md) (PR #935) — дом становится **третьим
  живущим жильцом** мастерской.
- Образцы контейнеров: [`docs/audit/git/`](../audit/git/README.md),
  [`docs/audit/tasks/`](../audit/tasks/README.md); их манифесты мастерских — эталон формы.
- Зубы-образцы: `scripts/lib/validate-workshop.mjs`, `scripts/lib/workshop-ownership.mjs`.
- Ревью инсайта: [`REVIEW.md`](../insights/insight-precedent-container/REVIEW.md),
  research [`RESEARCH.md`](../insights/insight-precedent-container/RESEARCH.md) (SRE registry).
- Смежные каталоги (НЕ дублировать): бестиарий [`docs/audit/bestiary/`](../audit/bestiary/README.md),
  журнал уроков `USERCASE_COMPETITION_LESSONS.md`.

**GitHub Issue:** #<номер> (после создания).

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

### Кто ты

Разработчик спринта `precedent-container`. Lead-персона — **ozhegov** (контейнер +
контракт + таксономия), support — **dynin** (скрипт регистрации + валидатор + счётчик рецидива).

### Что построить (продуктовое описание)

Дом-контейнер прецедентов и мастерскую к нему, чтобы прецедент регистрировался одной
командой в общий формат, рецидив класса был виден на осмотре (а не на четвёртом повторе),
а прецедент становился входом фрейма (procedure-frames): класс → упаковка → адресный ремонт.

### Архитектура / контракт

**ПРЕДУСЛОВИЕ (первым делом, до кода) — абзац таксономии.** В README контейнера явно
развести три пересекающихся каталога, иначе получим ложную повторяемость и дубли:
- **прецедент** — единичный случай с root cause и счётчиком рецидива (этот дом);
- **антипаттерн** — обобщённый класс (бестиарий `docs/audit/bestiary/`);
- **урок** — вывод для процесса (`USERCASE_COMPETITION_LESSONS.md`).

**Контейнер** (`docs/precedents/`, паттерн GROUP_CONTAINERIZATION):
- `README.md`-контракт (таблица «что писать / что коммитить») + абзац таксономии.
- **Схема записи прецедента** (из research Q1, SRE registry): `id`, дата, симптом,
  impact, timeline (опц.), root cause, fix/mitigation, prevention/action-items (с owner
  и status), **`class`** (закрытый enum, НЕ свободный текст — иначе счётчик врёт),
  **`canonicalCause`** (нормализованная причина), **`recurrence`**/related (ссылки на
  родственные прецеденты).
- **Снимок-реестр** `registry/PRECEDENTS.md` (overwrite, с Meta: Date/SHA/Source) —
  **производный снимок**, не рукописный источник; источник истины = сами файлы прецедентов.
- `cache/` под gitignore.

**Инструмент регистрации** (dynin): `yarn precedent:register` — **единственная точка
записи**: валидирует запись схемой (`isValid` до записи), пишет файл прецедента по схеме,
пересобирает снимок-реестр. Никакого ручного дублирования формы.

**Счётчик рецидива** (dynin): чистая функция `countByClass(precedents[]) → Map<class,count>`
+ `recurrenceRate`; порог из research (≤15%) — справочный, НЕ блокирующий. Детерминированная
агрегация по `class`/`canonicalCause`. **Никакого ML.**

**Мастерская дома** (ozhegov, паттерн HOME_WORKSHOP): `docs/precedents/workshop.manifest.json`
— `worksOn: docs/precedents`, `kit: null`; глаголы: `audit` (инвентарь прецедентов и
состояний), `decompose` (по классу/рецидиву), `inspectElement` — если делаешь в этом же
спринте, укажи; иначе `null` (⚠ SHOULD, как у веток/задач). Прогнать `yarn validate:workshop`
и `yarn check:workshop-ownership` — зелёные.

**Миграция:** 4 живущих файла `docs/precedents/*.md` привести к схеме **в этой же задаче**
(иначе схема живёт в вакууме без валидатора на реальных данных).

**Запрещено:**

- Свободный текст в `class` — только закрытый enum (иначе ложная повторяемость).
- ML/эвристика для рецидива — только детерминированный счётчик по классу.
- Дублировать бестиарий (антипаттерны) и журнал уроков — таксономия обязательна.
- Рукописный реестр как источник истины — реестр только снимок, источник = файлы.
- Каталог-UI прецедентов — out of scope (deferred, after MVP).
- Переписывать поведение чужих скриптов; трогать процедурную мастерскую и #915.

### Тесты

- `isValid`-валидатор схемы: валидная запись → ok; отсутствие обязательного поля → fail;
  `class` вне enum → fail.
- `countByClass`/`recurrenceRate`: агрегация по классу, рецидив считается, порог справочный.
- `yarn precedent:register` смоук: пишет файл + пересобирает снимок идемпотентно.
- Регистрация тестов в `test:scripts` (package.json).

### Definition of Done

- [ ] README-контракт с **абзацем таксономии** (прецедент/антипаттерн/урок).
- [ ] Схема записи (enum-`class`, `canonicalCause`, `recurrence`/related, action-items с owner/status).
- [ ] `yarn precedent:register` — единственная точка записи, валидатор до записи, пересбор снимка.
- [ ] Снимок-реестр `registry/PRECEDENTS.md` с Meta; `cache/` под gitignore.
- [ ] Счётчик рецидива — чистая детерминированная функция, без ML; тесты.
- [ ] `workshop.manifest.json` (audit+decompose MUST); `yarn validate:workshop` и `check:workshop-ownership` зелёные.
- [ ] 4 живущих прецедента мигрированы в схему; валидатор зелёный на реальных данных.
- [ ] Тесты в `test:scripts`; LGTM Teamlead (vesnin).

### Out of scope

- Процедурная мастерская (3 глагола над 2D-домом) и переезд #915 — задачи эпика home-workshop.
- Механика `frames[]`/`auditPins` — заседание #900.
- Каталог-UI прецедентов — deferred.
- «Умный» детектор рецидива (ML) — не сюда.

### Порядок работы ролей

- **ozhegov** (lead): README-контракт, абзац таксономии, схема записи, манифест мастерской.
- **dynin** (support): `precedent:register`, валидатор `isValid`, счётчик `countByClass`, тесты.
- **Структурщик**: реестр — снимок (regenerated), не рукопись; глаголы — фасады над одним стором, без взаимозависимостей; миграция 4 файлов в этой же задаче.
- **Математик**: `class` из закрытого enum (нормализация ключа), порог рецидива справочный не блокирующий, валидатор до записи.
- **Верстальщик**: снимок-реестр — читаемая таблица с Meta; UI — не сейчас.

### Формат ответа координатора (планирование)

Короткий план: контракт+таксономия+схема (ozhegov) → register+валидатор+счётчик (dynin) →
манифест мастерской + прогон зубов → миграция 4 файлов → тесты. Один PR.

---

## Заметки для человека-постановщика

- Гейт insight→sprint по существу выполнен (вес 6.6, «Следующий шаг» в ревью, LGTM владельца
  «в спринт» 22.07). Типизированный Task→Mandate не создан: CLI не материализует мандат для
  greenfield-инсайта (только `migrate-legacy`/`reopen`) — связь дана через `insightId`,
  типизацию закрыть отдельно через `membrana-insight-lifecycle`, когда/если понадобится ось D.

### Проверка после PR

```bash
yarn precedent:register --help
node --test scripts/precedent-*.test.mjs
yarn validate:workshop && yarn check:workshop-ownership
```
