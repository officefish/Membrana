# Промпт: Cold-start мастера контейнеризации: три паттерна + мета-уровень (контейнер контейнеров)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **S**.
> Ожидаемый артефакт: **1 PR** — документные правки скилла и README кита, кода нет.
> Реестр: `id` = `containerization-coldstart-sync` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Cold-start-промпт Мастера контейнеризации отстал от репозитория на один такт. Паттерны и
дома росли инкрементально (21.07 — `GROUP_CONTAINERIZATION` + `PINNED_SUBGRAPH_VERSIONING`;
22.07 — `HOME_WORKSHOP` из заседания `home-workshop`, вердикты Ф1–Ф5; следом — спринт
`tooling-atlas` с контейнером контейнеров), а скилл и README кита обновляются **отдельным
движением** и остались на двух паттернах.

Проверено в холодной сессии 23.07: третий паттерн находится только через `ls docs/patterns/`,
а на вопрос «где контейнер контейнеров» из скилла не выводится ничего — поиск даёт двух
кандидатов (`docs/procedures/` и `docs/tooling-atlas/`), разводить их приходится вручную.
В автономном прогоне (ночной спринт, cron, office) заметить пробел некому.

Уже есть и трогать не нужно: сами паттерны в [`docs/patterns/`](../patterns/README.md)
(там уже все три, и `HOME_WORKSHOP` несёт готовый навигатор по осям), контейнер
[`docs/tooling-atlas/`](../tooling-atlas/README.md) с рабочей мастерской, `MANIFEST.json`
кита.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`docs/patterns/README.md`](../patterns/README.md) | Источник истины: три паттерна и их суть |
| [`HOME_WORKSHOP.md`](../patterns/HOME_WORKSHOP.md) | Навигатор по трём осям — брать формулировки оттуда, не сочинять |
| [`docs/tooling-atlas/README.md`](../tooling-atlas/README.md) | Контейнер контейнеров: определение и границы |
| [`CONTAINERIZATION_MASTER_PROMPT.md`](./CONTAINERIZATION_MASTER_PROMPT.md) | Роль мастера, версия |
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | Issue / PR |

**GitHub Issue:** [#993](https://github.com/officefish/Membrana/issues/993)

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana**. Lead задачи — **Ожегов** (владелец пина
кита), support — **Дынин**. Перед правками — краткий план (1–2 абзаца + список файлов).
Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и
[`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить (продуктовое описание)

1. **Три паттерна вместо двух** в скилле `membrana-containerization-master`:
   `description` (frontmatter), cold-start шаг 3, Hard rules — везде, где зашито «two
   patterns» / «оба». Порядок и формулировки осей брать из навигатора `HOME_WORKSHOP`:
   пространство → время/идентичность → операции.
2. **Раздел «Мета-уровень»** в скилле: контейнер контейнеров — `docs/tooling-atlas/`
   (группирует все дома вообще, рекурсивно включая себя); `docs/procedures/` — тоже
   контейнер контейнеров, но двумерный (элемент сам контейнер), и плоский инструмент на
   нём ломается. Это ровно дефект №2 паттерна `HOME_WORKSHOP` — сослаться, не пересказывать.
3. **`yarn tooling:atlas`** в таблицу Tools скилла.
4. **README кита** — [`kits/containerization-master/README.md`](../../kits/containerization-master/README.md):
   строка 3 «опираясь на два паттерна» → три; cold-start шаг 3 «Оба паттерна» → все три.

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Канон скилла | `.cursor/skills/membrana-containerization-master/SKILL.md` | Единственное место правки скилла |
| Зеркало | `.claude/skills/membrana-containerization-master/SKILL.md` | Тонкое зеркало — только ссылка, содержимое НЕ дублировать |
| Кит | `kits/containerization-master/README.md` | Счёт паттернов в cold-start |

**Запрещено:**

- Копировать содержание паттернов в скилл — только ссылка + одна строка сути (иначе
  эхо-дрейф, против которого сам паттерн).
- Трогать `kits/containerization-master/MANIFEST.json` — правки идут в документах, которых
  нет в `pins`; обновление пина было бы отдельным ревьюируемым коммитом.
- Заводить код/тесты в `kits/` и `docs/procedures/`.
- Наполнять зеркало `.claude/skills/` содержимым.

---

### Тесты

| Область | Минимум |
|---------|---------|
| Кит | `yarn kits:audit --id containerization-master` — без дрейфа (пины не менялись) |
| Атлас | `yarn tooling:atlas --audit` — 6 контейнеров, битых 0 |
| Слои | `yarn check:layer-direction` — зелёный |

Автотестов задача не добавляет: правки документные.

---

### Definition of Done

- [ ] В `SKILL.md` три паттерна с осями — в `description`, cold-start и Hard rules.
- [ ] В `SKILL.md` есть раздел «Мета-уровень» (атлас + двумерность `docs/procedures/`) и
      `yarn tooling:atlas` в Tools.
- [ ] `kits/containerization-master/README.md` не утверждает «два паттерна».
- [ ] `MANIFEST.json` кита в диффе отсутствует.
- [ ] Зеркало `.claude/skills/` осталось тонким.
- [ ] Проверка холодной сессией: по одному только скиллу агент отвечает на «где контейнер
      контейнеров» и «какие паттерна разработки контейнеров» без grep по репозиторию.
- [ ] LGTM Teamlead.

---

### Out of scope

- Спринт `procedure-frames` (#900), `frames[]` и пин отрезков.
- Пины Mintlify cookbooks в `docs/audit/git/pins/`.
- Достройка `inspectElement` четырём контейнерам с ⚠ в `tooling:atlas --audit`
  (bestiary, git, tasks, precedents) — отдельная задача.
- Автопроверка «число паттернов = заявленному» (кандидат в профилактику, см. ниже) —
  решение владельца, не часть этой карточки.

---

### Порядок работы ролей

1. **Ожегов (lead)** — формулировки осей и мета-уровня: короткая человеческая строка на
   каждый паттерн, без жаргона и без копий.
2. **Дынин (support)** — сверка со `state of repo`: что реально лежит в `docs/patterns/`
   и `docs/tooling-atlas/` на момент правки.
3. **Структурщик** — границы: где ссылка, где строка сути; тонкость зеркала.
4. **Teamlead** — LGTM, проверка холодной сессией из Definition of Done.

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: …
[Ожегов]: …
[Дынин]: …
[Структурщик]: …

Итоговый артефакт: …
Definition of Done: …
```

---

## Заметки для человека-постановщика

1. GitHub Issue [#993](https://github.com/officefish/Membrana/issues/993) (`imperfection`) —
   ссылка на этот файл.
2. Запись в `docs/tasks/registry.json` (`status: active`) — сделана
   `yarn task:register --id containerization-coldstart-sync`.
3. После merge: отчёт в Issue → `yarn task:archive containerization-coldstart-sync --notes "…"`.

**Открытый вопрос к владельцу (в issue помечен как обсуждаемый):** нужна ли профилактика
корня — проверка, что число паттернов в `docs/patterns/` совпадает с заявленным в скилле и
README кита. Естественное место — `yarn kits:audit` либо `yarn tooling:atlas --audit`.
Без неё промпт снова отстанет на следующем паттерне.

### Проверка после PR

```bash
yarn kits:audit --id containerization-master
yarn tooling:atlas --audit
yarn check:layer-direction
```

---

## Связь с дорожной картой

- Оснащение мастера контейнеризации — эпик `kits-containerization-master`.
- Смежное: спринт `tooling-atlas` (контейнер контейнеров, ACTIVE) — его результат
  и есть то, чего не знает скилл.
