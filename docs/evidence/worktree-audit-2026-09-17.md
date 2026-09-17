# Вещдок: санитария веток и деревьев — 17.09 (день второй)

**Сессия:** Б · дерево `Membrana-sanitation-b` · ветка `chore/worktree-sanitation-day2-20260917`
**Магистраль:** `worktree-sanitation-day2` (выбор владельца 17.09)
**Инструмент:** `yarn repo:clean` (`scripts/repo-clean.mjs`), источник истины — состояние PR, окно 500 PR.

## Итог

| Что | До сноса | Снесено | После сноса |
|---|---|---|---|
| Локальные ветки | 295 | 39 | 257 |
| Ветки на сервере | 164 | 71 | 92 |
| Рабочие деревья | 64 | 0 | 65 |
| Ошибок сноса | — | 0 | — |

Повторный сухой прогон после сноса: **к удалению 0 локальных, 0 на сервере, 0 деревьев.**
Все деревья из `git worktree list` на месте: каталог отсутствующего дерева не найден ни один.
Состав деревьев не сократился. Добавилось одно, `Membrana-worktree-cards` (сессия В).

Сдвиги «после» не равны простой разности, и снос тут ни при чём:
- локальных 295 − 39 = 256, а стало 257: за время работы кто-то завёл одну ветку;
- на сервере 164 − 71 = 93, а стало 92: одна ветка исчезла с сервера помимо этого сноса.

## Сверка с таблицей задания (шаг 1)

Сухой прогон на стволе `af77ed93` разошёлся с таблицей задания. Работа остановлена и
доложена владельцу. Разбор расхождений (подтверждён владельцем):

| Что | В задании | Замер | Объяснение |
|---|---|---|---|
| Локальные к удалению | 39 | 39 | сошлось |
| На сервере к удалению | 72 | 71 | дефект 1: ветка `angelina/shot/1724-prisma-docker` выпала, её PR #1726 (MERGED) за окном в 500 PR; ветка на сервере осталась |
| `sprint-closed` | 7 | 0 | ошибка в тексте задания: утренний прогон тоже дал 0 (слово владельца) |
| Деревья всего / `unregistered` | 62 / 41 | 64 / 43 | +2 новых дерева сессий: `Membrana-sanitation-b` (Б), `Membrana-orphans` (Г) |
| Локальные / серверные всего | 292 / 162 | 295 / 164 | прибавились за день |

## Шаг 3 — деревья: пропущен по слову владельца

Класс `sprint-closed` пуст, сносить было нечего. Деревья не трогались ни одним вызовом.

## Отказы инструмента — воспроизведение дефекта 3

Шесть деревьев инструмент отнёс к `sprint-open` с пометкой «PR влит, но работа не доехала».
Вершина каждой ветки стоит дальше вершины PR (`rev-list headRefOid..tip` > 0), копии
на сервере нет, поэтому инструмент считает коммиты неотправленными. При этом
**вершина каждой ветки целиком в стволе** (`git merge-base --is-ancestor <ветка> origin/main` → да):
после перебазирования и влития коммиты уже в `main`, отказ ложный. Это дефект 3.
Деревья не тронуты. Записано, не чинилось.

| Дерево | Ветка | Вершина | PR | Сверх вершины PR | В стволе | Незакоммичено |
|---|---|---|---|---|---|---|
| `Membrana-integration` | `cowork/cowork-library-open-api/integration` | `99ea5fdd` | #2267 MERGED | 4 | да | 0 |
| `Membrana-core-waits` | `codex/cabinet-image-context-2287` | `435fbd7c` | #2295 MERGED | 1 | да | 0 |
| `Membrana-hunt-trigger` | `fix/night-hunt-trigger-fail-loud` | `7b38cda2` | #2210 MERGED | 1 | да | 0 |
| `Membrana-obs-meeting` | `fix/morning-sweep-gap` | `354bc339` | #2236 MERGED | 1 | да | 0 |
| `Membrana-weave` | `chore/report-entry-archive` | `29a17a7e` | #2059 MERGED | 1 | да | 0 |
| `Membrana/.worktrees/cabinet-swagger-api` | `codex/cabinet-swagger-fastify-static` | `9bd2c23a` | #2275 MERGED | 1 | да | 1 (`docs/procedure-runs/trail/2026-09-03.jsonl`) |

У последнего дерева, кроме дефекта 3, есть настоящий хвост: одно незакоммиченное изменение
журнала. Даже после починки дефекта инструмент его не снесёт, и это правильно.

## Дефекты инструмента, встреченные сегодня (записаны, не чинились)

1. **Окно 500 PR.** Воспроизведён: `angelina/shot/1724-prisma-docker` (PR #1726 MERGED) не
   попала в список к удалению и осталась на сервере.
2. **Сравнение с несуществующей копией на сервере.** Воспроизведён: `fatal: ambiguous argument
   'origin/<ветка>..<ветка>'` — 44 строки в первом сухом прогоне, 46 во втором (утром 25).
   Отказов из-за него нет, это шум.
3. **Перебазированная вершина считается неотправленной.** Воспроизведён на шести деревьях выше.

## Что осталось за границей задания (не трогалось)

- **103 локальные ветки** без PR и без копии на сервере: их разбирает сессия Г.
- **44 дерева `unregistered`** (без карточки): разбор владельцем.
- **`Membrana-ritual-night`**: заблокировано (лок от 29.08), блокировка не снималась.
- **5 деревьев `canon`**: сносу не подлежат.

## Снесено поимённо

### Локальные ветки (39)

| Ветка | PR | Состояние |
|---|---|---|
| `angelina/chore/ritual-day-20260903` | #2270 | MERGED |
| `angelina/chore/ritual-day-20260904` | #2280 | MERGED |
| `angelina/chore/ritual-day-20260905` | #2291 | MERGED |
| `angelina/chore/ritual-day-20260906` | #2301 | MERGED |
| `angelina/chore/ritual-day-20260908` | #2330 | MERGED |
| `angelina/chore/ritual-day-20260916` | #2344 | MERGED |
| `angelina/chore/ritual-day-mint-20260904` | #2282 | MERGED |
| `angelina/chore/ritual-day-mint-20260905` | #2292 | MERGED |
| `angelina/chore/ritual-day-mint-20260906` | #2303 | MERGED |
| `angelina/chore/ritual-day-tail-20260906` | #2304 | MERGED |
| `angelina/chore/ritual-evening-20260902` | #2268 | MERGED |
| `angelina/chore/ritual-evening-20260903` | #2278 | MERGED |
| `angelina/chore/ritual-evening-20260904` | #2289 | MERGED |
| `angelina/chore/ritual-evening-20260905` | #2298 | MERGED |
| `angelina/chore/ritual-evening-20260907` | #2326 | MERGED |
| `angelina/chore/ritual-evening-20260912` | #2341 | MERGED |
| `angelina/chore/ritual-evening-20260916` | #2347 | MERGED |
| `angelina/chore/ritual-evening-tail-20260903` | #2279 | MERGED |
| `angelina/chore/ritual-evening-tail-20260904` | #2290 | MERGED |
| `angelina/chore/ritual-evening-tail-20260905` | #2299 | MERGED |
| `angelina/chore/ritual-evening-tail-20260907` | #2327 | MERGED |
| `angelina/docs/meeting-buffer-full-stop-20260906` | #2306 | MERGED |
| `angelina/docs/storm-buffer-full-stop-20260906` | #2305 | MERGED |
| `angelina/docs/storm-tariff-close-20260908` | #2332 | MERGED |
| `chore/cowork-buffer-full-stop-archive` | #2317 | MERGED |
| `codex/cabinet-hotfix-2287` | #2293 | MERGED |
| `codex/cabinet-swagger-docs` | #2272 | MERGED |
| `codex/cabinet-swagger-prod-docs` | #2274 | MERGED |
| `codex/open-api-door-2271` | #2276 | MERGED |
| `codex/tariff-self-select-2281` | #2286 | MERGED |
| `cowork/cowork-buffer-full-stop/integration` | #2314 | MERGED |
| `feat/buffer-full-operator-window-2310` | #2316 | MERGED |
| `feat/duty-2284` | #2311 | MERGED |
| `feat/flyby-2302` | #2312 | MERGED |
| `feat/smart-cleanup-gate-2318` | #2324 | MERGED |
| `feat/tariff-matrix-2331` | #2334 | MERGED |
| `fix/exit-code-default-2247` | #2265 | CLOSED |
| `fix/porcha-2264-detached-head` | #2269 | MERGED |
| `fix/prship-tooth-behavioural-2247` | #2264 | MERGED |

### Ветки на сервере (71)

| Ветка | PR | Состояние |
|---|---|---|
| `angelina/chore/persona-memory-20260822` | #2080 | MERGED |
| `angelina/chore/ritual-day-20260820` | #2016 | MERGED |
| `angelina/chore/ritual-day-20260823` | #2082 | MERGED |
| `angelina/chore/ritual-day-20260904` | #2280 | MERGED |
| `angelina/chore/ritual-evening-20260808` | #1817 | MERGED |
| `angelina/chore/ritual-evening-20260822` | #2079 | CLOSED |
| `angelina/chore/ritual-evening-20260823` | #2108 | MERGED |
| `angelina/chore/storm-tickets-home-20260822` | #2073 | MERGED |
| `angelina/chore/tasks-audit-tooling-20260811` | #1865 | CLOSED |
| `angelina/docs/post-document-20260822` | #2075 | MERGED |
| `angelina/docs/storm-tariff-close-20260908` | #2332 | MERGED |
| `angelina/fix/handoff-xai-correction` | #1728 | CLOSED |
| `angelina/work/2026-08-08-adr0025` | #1793 | CLOSED |
| `angelina/work/2026-08-08-archivarius-dump` | #1815 | MERGED |
| `angelina/work/2026-08-08-feedback-claims` | #1801 | MERGED |
| `angelina/work/2026-08-08-review-diff-base` | #1807 | MERGED |
| `angelina/work/2026-08-08-tariff-reason` | #1813 | MERGED |
| `angelina/work/2026-08-09-handoff` | #1825 | MERGED |
| `angelina/work/2026-08-09-restore` | #1821 | MERGED |
| `angelina/work/2026-08-09-restore-close` | #1822 | MERGED |
| `chore/acceptance-t311` | #1976 | MERGED |
| `chore/archive-scoreboard-ladder` | #1751 | MERGED |
| `chore/day-2026-08-15` | #1939 | CLOSED |
| `chore/deploy-safestorage-archive` | #2055 | MERGED |
| `chore/magistral-2026-08-19` | #1980 | MERGED |
| `chore/morning-paper-2026-08-18` | #1964 | MERGED |
| `chore/premises-recut-1961` | #1973 | MERGED |
| `chore/registry-audit-stale-2026-08-09` | #1823 | CLOSED |
| `claude/night-triage-1786145409723` | #1780 | CLOSED |
| `claude/night-triage-1786231809251` | #1818 | CLOSED |
| `claude/night-triage-1786318211128` | #1830 | CLOSED |
| `claude/night-triage-1786404610224` | #1841 | CLOSED |
| `codex/core-waits-night-20260830` | #2245 | MERGED |
| `codex/journal-linearization` | #2123 | CLOSED |
| `codex/media-per-device-token` | #2029 | CLOSED |
| `codex/ritual-night-frame-20260829` | #2239 | CLOSED |
| `codex/static-foundation-cowork-open` | #1826 | CLOSED |
| `codex/static-foundation-cowork-open-v2` | #1827 | MERGED |
| `codex/static-inventory-export` | #1806 | MERGED |
| `docs/session-b-plan-2026-08-20` | #2017 | MERGED |
| `duty/firebat-readiness-20260828` | #2226 | MERGED |
| `feat/buffer-stop-word` | #2214 | CLOSED |
| `feat/capture-sidecar` | #1986 | CLOSED |
| `feat/capture-sidecar-check` | #1996 | CLOSED |
| `feat/duty-2284` | #2311 | MERGED |
| `feat/firebat-node-b2-node-key` | #2003 | MERGED |
| `feat/firebat-node-b3-poll-api` | #2004 | MERGED |
| `feat/library-duplicates-b2` | #2167 | MERGED |
| `feat/obs-sentry-plan` | #2141 | CLOSED |
| `fix/day-journal-close` | #2193 | CLOSED |
| `fix/evening-findings-journal` | #2173 | MERGED |
| `fix/exit-code-default-2247` | #2265 | CLOSED |
| `fix/feedback-frame-2107` | #2133 | CLOSED |
| `fix/field-capture-env-lookup` | #1977 | MERGED |
| `fix/firebat-node-error-word` | #2011 | MERGED |
| `fix/labels-export-partial-2237` | #2244 | MERGED |
| `fix/media-dockerignore-plugin-deps` | #2008 | MERGED |
| `fix/morning-manual-magistral` | #2085 | MERGED |
| `fix/playback-hang-timeout` | #2189 | MERGED |
| `fix/porcha-2264-detached-head` | #2269 | MERGED |
| `fix/prship-size-threshold` | #2191 | CLOSED |
| `fix/prship-size-threshold-r2` | #2194 | CLOSED |
| `meeting/duty-node-2026-08-21` | #2060 | CLOSED |
| `night-hunt/design-drift-1786518039791` | #1876 | CLOSED |
| `night-hunt/graph-drift-1786437037316` | #1846 | MERGED |
| `night-hunt/services-api-drift-1786359635917` | #1831 | MERGED |
| `recreate/pr-1986` | #1990 | CLOSED |
| `sprint/angelina-hostess-impl` | #2087 | CLOSED |
| `sprint/execution-procedure-interface` | #1756 | MERGED |
| `sprint/lazy-close-scope-ship` | #1757 | MERGED |
| `sprint/review-honesty` | #1731 | MERGED |
