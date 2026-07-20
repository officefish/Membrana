# Задание заседания: egress Linear + боевая подводка движка задач

> **Заседание:** `linear-egress-gear-wiring` · заведено 2026-07-20
> Председатель: агент сессии. Аудитор: **отдельный** агент, read-only (S-M5).
> Владелец: druid. Задание после M0 меняется только через `BRIEF_AMENDMENT.md` + LGTM.

---

## Объединяющее задание

**Спланировать и зафиксировать порядок решений, чтобы движок задач `LINEAR_TASKS_GEAR`
получил боевое движение через Linear и подводку спринта: региональные блокировки
(Linear 403 из РФ / MSK office) разруливаются egress’ом через media-VPS в Нидерландах;
до провода — честные stub/фикстуры; спринт согласуется с аксиомами движка
(Issue = счёт, Linear = движение, leadPersona + closure = след).**

Одно на все вопросы заседания.

---

## Вход / доклад

Материал ниже — **доклад на стол**, не решения комнаты. Факты не выдумывать; при
расхождении с первоисточником прав первоисточник.

### 1. Паспорт движка

[`docs/tasks/LINEAR_TASKS_GEAR.md`](../../tasks/LINEAR_TASKS_GEAR.md):

| § | Суть доклада |
|---|---|
| §2 единицы | Центральная задача = **GitHub-issue** (счёт и ответственность). Контейнер = Linear parent (движение, в счёт не входит). Биекция центральная под-задача ⟺ Issue. «Закрыто» = закрытие Issue. |
| §3 субъект | Ответственный = `leadPersona` / `assignee` (принявшая выход). Исполнитель обезличен (`delegate` в API). Ангелина — ведущая персона процессов, не шестая голосующая. |
| §4 след | Ровно два носителя: карточка (`leadPersona`) + артефакт закрытия `{acceptedBy, headRev}`. Коммит/PR следом не являются. |
| §6 снимок | Вход гейтов — **снимок**, не live fetch и не «кэш». Формат `linear-snapshot@1`; производитель — office-батч полным pull; вебхук — только триггер. |
| §9 RU block + media NL egress | Linear `403 RESTRICTED_COUNTRY_BLOCKED` с РФ и с MSK office. Ключ валиден; боевой pull — **только через внешний egress**. Маршрут владельца: туннель через **media-VPS (NL)**. До проводки — фикстуры/stub. |

### 2. Словарь

[`docs/tasks/UNITS_DICTIONARY.md`](../../tasks/UNITS_DICTIONARY.md) — закон имён единиц
счёта и ответственности. Всё, что гейтит или измеряет, импортирует слова отсюда.
Живая проверка API 19.07: поле делегата — `delegate` (не `delegatedAgent` из ресёрча).

### 3. Старый регламент (конфликт с движком)

[`docs/prompts/TASK_PROMPT_WORKFLOW.md`](../../prompts/TASK_PROMPT_WORKFLOW.md) + skill
`membrana-task-lifecycle`: **registry-first**, `githubIssue` часто `null` до/вместо
паспорта. Посев в `AGENTS.md` («register in registry.json») сеет устаревшую модель.
Дикий агент по старому пути заводит незаконную карточку.

### 4. Шторм подводки

[`docs/storm/storm-engine-onboarding-2026-07-19/THESES.md`](../../storm/storm-engine-onboarding-2026-07-19/THESES.md):

- Провода к движку **не сделаны** (T1); движок в main (#675), подключение — следующая работа.
- Развилка «подводка»: **А** провода документов · **Б** тропа входа холодного агента ·
  **В** пересадка процедур на движок. T3≈А, T2≈В; Б в реплике владельца не назван явно.
- Открыто: какие процедуры первыми; порядок с egress (фикстуры сейчас vs ждать провод);
  ведёт ли Ангелина.

### 5. Пилот 20.07 `sec-upgrade-backend-runtime`

Журнал:
[`docs/discussions/linear-tasks-gear-pilot-sec-upgrade-backend-runtime-2026-07-20.md`](../../discussions/linear-tasks-gear-pilot-sec-upgrade-backend-runtime-2026-07-20.md).

Факты эпизода: Issue [#686](https://github.com/officefish/Membrana/issues/686),
PR [#688](https://github.com/officefish/Membrana/pull/688) / docs-архив [#689](https://github.com/officefish/Membrana/pull/689),
closure `{acceptedBy, headRev}`, Linear movement deferred.

Наблюдения O1–O14 (выжимка для порядка, не для пересуживания кода пилота):

| ID | Наблюдение |
|---|---|
| O1 | Карточка с `githubIssue: null` незаконна; старый `task:register` допускает |
| O2 | `promptPath` на MEETING_BRIEF ≠ task-промпт |
| O3–O10 | inventory адаптера / Nest·Fastify / middie — уроки DoD security (не предмет egress) |
| O4 | Нет `task:start` (Issue + biject + stub движения) |
| O5 | AGENTS.md сеет старую модель |
| O6 | Ритуал на dirty не-main; пилот правильно от `origin/main` |
| O8 | MAIN_DAY vs единица работы — конфликт норм; нужен явный override |
| O11 | Junction `node_modules` на sibling worktree ломает major-upgrade |
| O13–O14 | Closure руками; archive на tip main после squash |
| O9 | Owner correction: office → Fastify (идентичный стек) |

Выжимка рефакторинга из журнала: `task:start` · отказ active без Issue · **egress via media NL** ·
посев AGENTS/lifecycle · isolated worktree bootstrap · канон closure path.

### 6. Позиция владельца (вход собрания)

- Все региональные ограничения (Linear и родственные RU-блоки) — через **media-VPS NL**.
- Туннель агент **сам в прод без доступа не поднимает**; собрание — чтобы **спланировать**.
- Цель собрания: порядок решений, не немедленный деплой туннеля.

### 7. Целевая стыковка спринт ↔ движок

| Слой | Канон |
|---|---|
| Спринт | контейнер движения |
| Счёт | GitHub Issue |
| Закрытие Issue | событие для величин и гейтов |
| Acceptance | `{acceptedBy, headRev}` |

---

## Решено владельцем — переспорить нельзя

- Egress для Linear (и родственных RU-блоков) — через **media-VPS NL**, не через попытки
  «починить» MSK office как источник IP.
- Агент / ноут в РФ **не ходит в Linear напрямую**.
- Гейты читают **снимок**, не live fetch (уже в паспорте §6).
- Задача без GitHub Issue **незаконна**.

---

## Границы задания

**Внутри:** порядок решений по архитектуре egress office↔media↔Linear · секреты и trust
boundary · контракт снимка/батча и DoD первого боевого pull · подводка процедур спринта
(`task:start` / контейнер / посев AGENTS.md и lifecycle) · режим до провода (фикстуры/stub)
и критерий снятия stub · согласование спринта с аксиомами движка.

**Снаружи — вердиктов не выносить:** поднятие туннеля в прод без доступа владельца ·
пересмотр аксиом §2–§4 / словаря · пересмотр вердиктов `registry-relocation` и
`team-execution-contour` · форма графа правды · содержание DoD security-пилота #686
(код закрыт; уроки O\* — только как фактура трения процедур).

---

## Фактура, добываемая проверкой, а не решением

Комната не домысливает: живой ответ Linear из media-NL до проводки; точная форма
секретов на VPS (есть ли уже ключ/прокси на media); полный inventory процедур для
пересадки (T2) — если не замерено, вопрос, на это опирающийся, откладывается явно.
