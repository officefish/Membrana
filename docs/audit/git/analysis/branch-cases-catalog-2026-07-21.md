# Каталог случаев «ветка → случай» — 2026-07-21

## Meta

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Sprint | `branch-mintlify-engine` F1 (#825) · lead **ozhegov** |
| Входы | [`branch-assortment-coverage-2026-07-21.md`](./branch-assortment-coverage-2026-07-21.md) · [`branch-taxonomy-retrospective-2026-07-21.md`](./branch-taxonomy-retrospective-2026-07-21.md) · грамматика Р4 (`[persona/]kind/slug` + теги формата) · [`FORMATS.md`](../../FORMATS.md) |
| Выход для F2 | одна строка кейса → одна Mintlify-страница/секция cookbook |

Грамматика (канон вперёд, не переименовывать историю):

```text
[<persona>/]<kind>/<slug>
```

Опциональные **теги формата** — отдельный сегмент или префикс формата там, где
формат важнее kind (`storm/…`, `meeting/…`, `night-hunt/…`). Persona — когда нужен
машинный держатель (шип-гейт / leadPersona).

Термины закрытые. MDX в этом файле **нет** — только markdown-каталог.

---

## A. Kind (тип изменения)

| ID | Случай | Рекомендуемая форма | Пример | Антипример |
|----|--------|---------------------|--------|------------|
| K1 | Новая фича / контракт / модуль | `[persona/]feat/<slug>` | `feat/pl-r3-boundary` · `angelina/feat/pl-r1-home` | `feature/scripts-boundary-container` — дубль kind, вне словаря Р4 |
| K2 | Багфикс / регресс / ADR-accepted fix | `[persona/]fix/<slug>` | `fix/adr-0013-accepted` · `vesnin/fix/consilium-premises-gate` | `feat/…` «потому что заодно поправил» |
| K3 | Документация / промпты / контейнер audit | `[persona/]docs/<slug>` | `docs/branch-mintlify-engine` · `docs/board-refactor-update` | `chore/…` для содержательной доки без tooling-скоупа |
| K4 | Реестр / регистрация задач / мелкий infra | `[persona/]chore/<slug>` | `chore/tasks-readme-prompt-links` · `vesnin/chore/procedural-layer-sprint-start` | `docs/…` для чистого package.json-скрипта без prose |
| K5 | Tooling / CI / skills / yarn scripts meta | `tooling/<slug>` или `chore/<slug>` если скоуп tasks | `tooling/meeting-consilium-voice` | агент-префикс `cursor/…` / `codex/…` как «тип» |
| K6 | ~~`feature/*`~~ | **запрещён** | — | любой `feature/*` live — помечать MISSING на ревью (дыра канона, не дыра покрытия) |

---

## B. Формат (ритм работы)

| ID | Случай | Рекомендуемая форма | Пример | Антипример |
|----|--------|---------------------|--------|------------|
| F1 | Шторм (дивергентный) | `[persona/]storm/<slug>` | `angelina/storm/branch-taxonomy-2026-07-21` | `feat/storm-notes` без формат-сегмента |
| F2 | Заседание (конвергентный) | `[persona/]meeting/<slug>` | `vesnin/meeting/procedural-layer` | `docs/meeting-notes` как единственный сигнал формата |
| F3 | Night Sprint / Night Hunt | `night/<slug>` или `night-hunt/<slug>` | open PR `night-hunt/graph-drift-…` (#759) | `feat/night-…` без night-предиката |
| F4 | Truth / кристаллизация | `truth/<slug>` | `truth/crystallization-20-07-worktree` | смешивать с `docs/insight-…` без формата |
| F5 | Day-sprint / именованный спринт-артефакт | `sprint/<slug>` или kind+slug=id карточки | `sprint/ritual-step-manifest-sf` (salvage) | long-lived без карточки в реестре |
| F6 | Competition pack | `comp/<slug>` (+ team suffix) | `comp/comp-detection-alarm-2026-07-10/alpha` | `feat/comp-…` |
| F7 | Cowork Sprint | `cowork/<block-slug>` | *(нет live — см. дыры)* · исторически 2 PR | leftover cowork после GC — не образец |
| F8 | Research | `research/<slug>` или `[persona/]docs/research-<slug>` | *(дыра ассортимента)* | ждать «привычного» префикса из истории |
| F9 | Hackathon | `hackathon/<slug>` (по FORMATS) | *(дыра ассортимента)* | тащить в `feat/` «на скорость» без тега формата |

---

## C. Держатель

| ID | Случай | Рекомендуемая форма | Пример | Антипример |
|----|--------|---------------------|--------|------------|
| H1 | Нужен машинный lead / шип-гейт | `<persona>/<kind>/<slug>` | `angelina/feat/pl-r1-home` · `vesnin/meeting/…` | голый `vesnin` без kind/slug |
| H2 | Слаг = id карточки реестра | `<kind>/<task-id>` (+ persona по leadPersona) | `docs/audit-git-container-followup` · salvage `linear-tasks-gear` | slug ≠ id при активной карточке |
| H3 | Long-lived роль / ритм | закрытое имя дерева/ветки-роли | `developer-rhythm-lifecycle` (wt) | плодить новые long-lived без §7а / реестра ролей |
| H4 | Персона-ветка §7а между задачами | имя персоны (канон TASKS_MANAGEMENT) | `ozhegov` · `dynin` · `vesnin` · `angelina` | GC/`repo:clean` по ним — **никогда** |
| H5 | Агент-исполнитель | **не в имени ветки** | Co-Authored-By в коммите | `cursor/…` · `codex/…` · `claude/…` как держатель |

---

## D. Доставка (hygiene × выбор ветки)

| ID | Случай | Рекомендуемая форма / действие | Пример | Антипример |
|----|--------|--------------------------------|--------|------------|
| D1 | Новая работа от `main` | новая ветка по K/F/H выше | `docs/branch-mintlify-engine` | ветка от чужого stale tip |
| D2 | Уже открыт PR — продолжить | та же ветка open PR (cat.4) | `feat/pl-r4-grammar` (#813) | форк «на всякий» с тем же скоупом |
| D3 | Есть salvage / leftover с уникальной работой | salvage → довести / PR; не копировать | cat.7 / cat.5 из registry | `git branch -D` без ok владельца |
| D4 | Baseline / сравнение | `base/*` (cat.3) — только читать | `base/*` | коммитить продуктовую работу в baseline |
| D5 | Zombie / likely-discard | не брать как образец имени | cat.6 (часто пусто) | «оживить» zombie вместо новой грамматичной ветки |

---

## E. Деревья (worktree)

| ID | Случай | Рекомендация | Пример | Антипример |
|----|--------|--------------|--------|------------|
| T1 | Параллельная сессия | отдельный worktree + своя ветка | `Membrana-codex` ↔ эта ветка | два агента на одном checkout |
| T2 | Canon / sync к main | ff от `origin/main`; main может держать сосед | grok держит `main` | `git checkout main` в чужом wt → fatal |
| T3 | Имя дерева | роль/миссия, не вендор модели | `Membrana-tooling` · `Membrana-product` | `Membrana-openrouter` как единственный сигнал скоупа |

---

## Дыры ассортимента → пометки для F2 cookbooks

Страницы F2 **обязаны** явно сказать «live-примера нет» и дать **синтетический**
канонический пример + антипример из истории:

| Дыра | Страница F2 (черновик id) | Что показать |
|------|---------------------------|--------------|
| `cowork/*` live | `branch-cowork-format` | грамматика + «брать archived PR / day-sprint, не cat.5» |
| `research` | `branch-research-format` | `research/<slug>` вперёд; не ждать прецедента |
| `hackathon` | `branch-hackathon-format` | тег формата сразу; FORMATS слабый ≠ «без имени» |
| `feature/*` | `branch-anti-feature-prefix` | отказ + миграция мысли на `feat/` |

---

## Минимальный набор страниц F2 (вход)

Из DoD F2 — **5** страниц/секций-минимум. Маппинг кейсов → страницы:

| # | Cookbook (slug) | Кейсы-источники | Суть одной страницы |
|---|-----------------|-----------------|---------------------|
| 1 | `branch-kind-dictionary` | K1–K6 | закрытый kind + отказ `feature` |
| 2 | `branch-format-tags` | F1–F6, F8–F9 | формат-сегменты / теги; дыры research/hackathon |
| 3 | `branch-persona-grammar` | H1–H5 | persona vs агент vs §7а |
| 4 | `branch-open-pr-vs-salvage` | D1–D5 | когда продолжать PR / salvage / новая ветка |
| 5 | `branch-anti-feature-agent` | K6 + H5 | антипримеры `feature/*` и agent-prefix |

Доп. страницы — по дырам таблицы выше (cowork/research/hackathon), если F2 расширит бюджет.

---

## Связь с hygiene и ассортиментом

- Каталог **не** заменяет Scenario A/B и не легализует delete.
- Membership представителей — из assortment; при устаревании — обновить coverage, затем кейсы.
- Р4-валидатор (`pl-r4-grammar` #813) — соседний движок зуба; этот каталог — **семантика для людей/агентов** в Mintlify, не второй валидатор.
