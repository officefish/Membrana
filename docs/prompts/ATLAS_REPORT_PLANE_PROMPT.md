# Промпт: Эпик — плоскость отчётов в атласе (audit ≠ domain)

> **L** · `atlas-report-plane` · [#1097](https://github.com/officefish/Membrana/issues/1097) · lead **vesnin** · craft **ozhegov**  
> Цепь: W0→W4 (`arp-w0-brief` … `arp-w4-closure` · #1098–#1102).  
> Семя: расследование атласа 2026-07-24 + вердикт владельца («ратифицирую» 24.07):  
> `docs/tasks` = контейнер заданий; `docs/audit` = двумерный контейнер отчётов;  
> `docs/audit/tasks` = специализированные отчёты **про** задачи, не второй дом заданий.  
> Паттерны: [`GROUP_CONTAINERIZATION`](../patterns/GROUP_CONTAINERIZATION.md) ·
> [`HOME_WORKSHOP`](../patterns/HOME_WORKSHOP.md) · мета-дом [`docs/tooling-atlas/`](../tooling-atlas/).  
> Стык: спринт [`tasks-workshop`](./TASKS_WORKSHOP_SPRINT_PROMPT.md) (V2: audit/decompose
> вне primary `docs/tasks`) — **не пересматривать** границу глаголов; выразить её в атласе.  
> Инстанс: [`atlas-report-plane-2026-07-24/OPEN.md`](../day-sprint/atlas-report-plane-2026-07-24/OPEN.md).

---

## Контекст

Атлас (`yarn tooling:atlas`) индексирует дома с `workshop.manifest.json` плоским списком.
Манифесты уже различают `role: primary|derivative`, но витрина ATLAS/Mintlify:

1. ставит `docs/tasks` и `docs/audit/tasks` как одноранговые «контейнеры одной природы»;
2. в ссылке показывает `worksOn` (`docs/audit/tasks/registry/`, `docs/tasks/registry.json`)
   вместо **дома** (`home`);
3. семья `audit-family` выводится эвристикой `worksOn.startsWith('docs/audit/')`, без
   явной модели «плоскость отчётов ⊃ слоты по предметной группе».

Итог: агент читает атлас как «два tasks», а не «предмет + отчёт о предмете».

## Вердикты владельца (зафиксировать в OPEN)

1. **`docs/tasks`** — контейнер **непосредственно заданий** (primary / domain).
2. **`docs/audit`** — **двумерный** контейнер **отчётов** (плоскость report-plane):
   оси ≈ «предметная группа» × «вид артефакта отчёта» (registry / analysis / …).
3. **`docs/audit/tasks`** — слот отчётов **по задачам**, не дубль реестра заданий.
4. Рефакторинг — язык канона + агрегатор атласа; **не** переезд карточек задач
   и **не** слияние/удаление `docs/audit/tasks`.

## Инварианты (R1–R7)

1. **R1** Истина заданий — `docs/tasks/registry.json` (+ карточки/промпты). Отчёты
   о них — только под `docs/audit/tasks/`.
2. **R2** Атлас не копирует README; только производный индекс. Ссылки в ATLAS/Mintlify
   ведут на **`home`** (каталог контейнера), не на случайный `worksOn`-хвост.
3. **R3** В индексе видны `role` (`primary` | `derivative` | —) и принадлежность к
   **report-plane** (`docs/audit/*`) vs **domain** vs **meta**.
4. **R4** `docs/audit/tasks` остаётся `role: derivative`, `dependentOn: ["docs/tasks"]`,
   `mirrorsFrom` = worksOn опекуна (`docs/tasks/registry.json`) — зуб
   `check:workshop-dependencies` зелёный.
5. **R5** Не плодить `docs/audit/scripts/`; `scripts/` вне атласа, пока нет мастерской
   (как в TOOLING_ATLAS — кандидат, не дефект этого спринта).
6. **R6** Параллель с Focus `tasks-workshop`: при старте — блок **Also open** в
   `DAY_SPRINT_ACTIVE.md`, Focus чужой не затирать.
7. **R7** Массовые переезды путей / rename домов — вне scope без отдельного слова владельца.

## Фазы

| Фаза | id | Lead | DoD |
|------|-----|------|-----|
| W0 | `arp-w0-brief` #1098 | vesnin | OPEN + Issues + registry + ACTIVE Also open — **done** |
| W1 | `arp-w1-canon` #1099 | ozhegov | Канон 2D: GROUP + `docs/audit/README` + audit/tasks + atlas README (+ ADR при развилке формулировок) |
| W2 | `arp-w2-engine` #1100 | ozhegov | `tooling-atlas.mjs`: home-ссылки, role, report-plane в audit/decompose/render; тесты |
| W3 | `arp-w3-surface` #1101 | ozhegov | `--render` + Mintlify; провода AGENTS/скиллов без «два tasks»; `--check` OK |
| W4 | `arp-w4-closure` #1102 | vesnin | CLOSURE + archive фаз/эпика |

## Out of scope (весь эпик v1)

- Перенос `docs/tasks` под `docs/audit/` или наоборот.
- Включение `scripts/` в атлас (отдельный кандидат).
- Пересмотр V2 tasks-workshop (состав глаголов primary).
- Консилиум core-контрактов (нет новых типов `@membrana/core`).
- Mintlify сверх страницы `tooling/containers.mdx` (каталог-UI).

## Acceptance criteria (эпик)

- [ ] Агент по ATLAS/Mintlify однозначно отличает дом заданий от слота отчётов по задачам.
- [ ] `yarn tooling:atlas --check` зелёный после `--render`.
- [ ] `yarn check:workshop-dependencies` / `validate:workshop` не регрессируют.
- [ ] Канон GROUP + audit README формулирует report-plane без смешения с domain-tasks.
- [ ] CLOSURE + карточки archived.

---

## Промпт целиком (для вставки агенту)

> Всё ниже — задание координатору/исполнителю фазы. Читать OPEN + фазовый промпт.

### Кто ты

Координатор виртуальной команды Membrana (Vesnin). Перед кодом — план 1–2 абзаца +
список файлов. Не расширять scope без Issue. Не затирать Focus `tasks-workshop`.

### Что сделать

Рефакторинг **модели представления** контейнеров в атласе и каноне: audit = плоскость
отчётов; tasks = предмет; audit/tasks = отчёты про задачи. Инварианты R1–R7.

### Запрещено

- `git add -A` при параллельных сессиях; трогать чужой Focus в `DAY_SPRINT_ACTIVE`.
- Менять семантику `mirrorsFrom` / ломать primary-единственность на дом.
- Класть сырые deploy-логи в корень репо.
