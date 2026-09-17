# Карточки рабочих деревьев — выдача 17.09.2026 (сессия В)

**Задание:** `docs/prompts/SESSION_V_WORKTREE_CARD_2026-09-17.md` (подкрепление магистрали
`worktree-sanitation-day2`). **Ствол на момент работы:** `62bae613`. **Инструмент:**
`yarn repo:clean` (сухой прогон), предикат `classifyWorktree`
(`scripts/lib/classify-worktree.mjs`). **Шаблон:** `docs/repo/WORKTREE_TEMPLATE.md`,
тест `scripts/worktree-template.test.mjs` (5/5 зелёные, `node --test`).

Деревья **не сносились** — снос у сессии Б. Чужие незакоммиченные правки не тронуты.
Карточка `WORKTREE.md` гитигнорится (`/WORKTREE.md`), поэтому в ствол едут только
шаблон, тест и эта таблица; сами карточки живут в корнях деревьев.

## Как определялся хозяин

Карточка выдавалась **только** при одном из фактов, в порядке силы:

1. `.worktree-owner` в корне дерева (имя сессии · дата) — `cw-homes`, `cw-journal-home`,
   `cw-page-plugins` (сессия Б, коворк server-plugin-pages), `records` (сессия Г).
2. Реестр коворка `docs/COWORK_SPRINT_ACTIVE.md` — `cw-buffer-full` (координатор Б),
   `cw-refusal` / `cw-policy` / `cw-hold` (блоки A/B/C, #2307–#2309).
3. Карточка сессии дня 17.09 (`docs/prompts/SESSION_{B,V,G}_*_2026-09-17.md`) ↔ ветка дерева —
   `sanitation-b` (Б), `orphans` (Г), `worktree-cards` (В, это дерево).
4. Документ, называющий дерево: `docs/HANDOFF.md` от 25.08 (`chart-list` → Г,
   `issue-2046` → В), прецедент 22.08 (`prship-exit-code`), `MAIN_DAY_ISSUE` 17.09
   (`ritual-night`, locked).
5. Путь `~/.codex/worktrees/<hash>/` — дерево создано Codex CLI (два дерева).
6. **PR ветки дерева** (номер, состояние, автор) — когда ничего из 1–5 нет. Хозяин в
   такой карточке записан честно: «спринт #N (автор PR officefish); сессия не названа».
   Это ровно те факты, что перечислены в задании (ветка · PR · дата коммита).

Карточка **не выдавалась**, если у ветки нет PR и нет ни одного факта 1–5, либо HEAD
отвязан от ветки (detached). Все выданные карточки — `kind: sprint`; `canon` не
выдавался ни одному дереву (канон закрыт: `main/tooling/product/codex/cursor`, все пять
карточек уже стояли).

**Что оказалось ненадёжным признаком:** префикс ветки `codex/*`. Деревья
`.worktrees/pr-2216`, `pr-2217`, `prship-2247-early-exit` идут на ветках `codex/*`, а
HEAD-коммиты несут трейлер `Co-Authored-By: Claude …`. Префикс говорит о привычке репо,
не об агенте — в карточках он как источник хозяина не использовался.

## Замер до/после

Числа — из сухого прогона `node scripts/repo-clean.mjs --report <файл>` (yarn Berry не
знает `-s`; отчёты в `%TEMP%`, в ствол не едут). Разница с утренним замером задания
(62 дерева, 41 unregistered на `4542603a`): к полудню деревьев стало 65 — добавились
три дерева сессий дня (Б, В, Г), все три без карточки.
## Таблицы

Столбцы: **Последний коммит** — дата и sha HEAD дерева. **PR** — самый свежий PR ветки (`gh pr list --head`). **Хвосты** — мой замер: незакоммиченных строк `git status`; незапушенных — против `origin/<ветка>`, а если origin-ветки нет — коммитов поверх `origin/main` (инструмент считает иначе, см. находку 6; истина класса — столбец «Класс»). **Оснащено** — есть ли `node_modules` и `.env` (дерево-окружение или одноразовое). **Класс до → после** — из двух сухих прогонов `repo:clean`. Сигнал «дата последней активности по mtime» снят: мой же сбор фактов (`git status` в каждом дереве) обновил индексы, замер испорчен.

## Таблица: карточки выданы (39)

| Дерево | Ветка | Последний коммит | PR | Хвосты | Оснащено | Класс до → после | Карточка |
|---|---|---|---|---|---|---|---|
| `~/.codex/worktrees/547c/Membrana` | `codex/journal-idempotent-2300` | 06.09.2026 `aaa0e0a1` | [#2313](https://github.com/officefish/Membrana/pull/2313) OPEN | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · Codex CLI (дерево создано Codex в ~/.codex/worktrees) |
| `~/.codex/worktrees/de2e/Membrana` | `rescue/codex-cabinet-tariffs-open-prod-20260906` | 16.09.2026 `a65c31c5` | нет | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · Codex CLI (дерево ~/.codex/worktrees); спасательный коммит сделан Claude-сессией (трейлер Claude Opus 5) |
| `Membrana/.worktrees/buffer-stop-permanent-2204` | `codex/buffer-stop-permanent-2204` | 28.08.2026 `ecfa6e43` | [#2229](https://github.com/officefish/Membrana/pull/2229) MERGED | 2 незапуш. | node_modules · — | unregistered → **sprint-closed** | ✅ выдана · спринт #2229 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana/.worktrees/codex-session-b-2283` | `codex/session-b-2283` | 04.09.2026 `6bbc7bd6` | [#2285](https://github.com/officefish/Membrana/pull/2285) MERGED | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · спринт #2285 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana/.worktrees/codex-session-v-2288` | `codex/session-v-2288` | 06.09.2026 `fcd36c5f` | [#2294](https://github.com/officefish/Membrana/pull/2294) MERGED | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · спринт #2294 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana/.worktrees/pr-2216` | `codex/firebat-rate-48k-20260827` | 28.08.2026 `f7566493` | [#2216](https://github.com/officefish/Membrana/pull/2216) MERGED | — | — · — | unregistered → **sprint-open** | ✅ выдана · спринт #2216 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana/.worktrees/pr-2217` | `codex/deploy-preflight-guard-2199-20260827` | 28.08.2026 `632815cc` | [#2217](https://github.com/officefish/Membrana/pull/2217) MERGED | — | — · — | unregistered → **sprint-open** | ✅ выдана · спринт #2217 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana/.worktrees/prship-2247-early-exit` | `codex/prship-2247-fail-closed-exit` | 02.09.2026 `9f26ca11` | [#2263](https://github.com/officefish/Membrana/pull/2263) MERGED | — | — · — | unregistered → **sprint-open** | ✅ выдана · спринт #2263 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana/.worktrees/session2-tails-20260831` | `chore/deploy-trail-media-20260829` | 31.08.2026 `c6632ae3` | [#2235](https://github.com/officefish/Membrana/pull/2235) CLOSED | — | node_modules · — | unregistered → **sprint-closed** | ✅ выдана · спринт #2235 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana/.worktrees/static-container-meeting-delivery` | `codex/archive-static-registry-cowork` | 09.08.2026 `1aebafa7` | [#1829](https://github.com/officefish/Membrana/pull/1829) MERGED | 2 незапуш. | node_modules · — | unregistered → **sprint-closed** | ✅ выдана · спринт #1829 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana/.worktrees/tariff-matrix-2333` | `codex/tariff-matrix-2333` | 09.09.2026 `c82c36cd` | [#2337](https://github.com/officefish/Membrana/pull/2337) MERGED | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · спринт #2337 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana-assets-container-recut` | `codex/assets-container-blocker` | 23.08.2026 `373efe22` | [#2105](https://github.com/officefish/Membrana/pull/2105) MERGED | 1 незапуш. | node_modules · — | unregistered → **sprint-closed** | ✅ выдана · спринт #2105 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana-chart-list` | `chore/trail-20260823-chart-list` | 24.08.2026 `56419e2b` | нет | — | node_modules · .env | unregistered → **sprint-open** | ✅ выдана · сессия Г (магистраль chart-list) — по HANDOFF 25.08 |
| `Membrana-cw-buffer-full` | `chore/network-snapshot-20260908` | 08.09.2026 `7bf93d03` | [#2336](https://github.com/officefish/Membrana/pull/2336) MERGED | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · сессия Б — координатор коворка cowork-buffer-full-stop |
| `Membrana-cw-buffer-integration` | `chore/product-docs-tariffs-from-grid` | 08.09.2026 `bfce789d` | [#2335](https://github.com/officefish/Membrana/pull/2335) MERGED | 3 незапуш. | node_modules · — | unregistered → **sprint-closed** | ✅ выдана · сессия не названа; по имени — интеграционное дерево коворка buffer-full-stop, документом не подтверждено |
| `Membrana-cw-hold` | `cowork/cowork-buffer-full-stop/device-hold` | 06.09.2026 `b420c930` | нет | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · команда блока C коворка cowork-buffer-full-stop (#2309); координатор — сессия Б |
| `Membrana-cw-homes` | `cowork/cowork-server-plugin-pages/homes` | 22.08.2026 `6c08c275` | нет | 1 незапуш. | node_modules · — | unregistered → **sprint-open** | ✅ выдана · сессия Б · коворк cowork-server-plugin-pages · блок homes |
| `Membrana-cw-integration` | `chore/archive-cowork-server-plugin-pages` | 22.08.2026 `e42e3a4c` | [#2069](https://github.com/officefish/Membrana/pull/2069) MERGED | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · сессия не названа; дерево коворка server-plugin-pages (архив коворка — PR #2069) |
| `Membrana-cw-journal-home` | `cowork/cowork-server-plugin-pages/journal-home` | 22.08.2026 `9c0526de` | нет | 1 незапуш. | node_modules · — | unregistered → **sprint-open** | ✅ выдана · сессия Б · коворк cowork-server-plugin-pages · блок journal-home |
| `Membrana-cw-page-plugins` | `cowork/cowork-server-plugin-pages/page-plugins` | 22.08.2026 `62b56fba` | нет | 1 незапуш. | node_modules · — | unregistered → **sprint-open** | ✅ выдана · сессия Б · коворк cowork-server-plugin-pages · блок page-plugins |
| `Membrana-cw-policy` | `cowork/cowork-buffer-full-stop/overflow-policy` | 06.09.2026 `769fbbc8` | нет | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · команда блока B коворка cowork-buffer-full-stop (#2308); координатор — сессия Б |
| `Membrana-cw-refusal` | `cowork/cowork-buffer-full-stop/refusal-contract` | 06.09.2026 `f05e4bdc` | нет | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · команда блока A коворка cowork-buffer-full-stop (#2307); координатор — сессия Б |
| `Membrana-cw-window` | `chore/archive-tariff-matrix-2331` | 09.09.2026 `822cf413` | [#2338](https://github.com/officefish/Membrana/pull/2338) OPEN | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · сессия не названа; по имени — окно коворка buffer-full-stop (#2316), документом не подтверждено |
| `Membrana-deliver-chain-jsonl` | `codex/deliver-chain-jsonl-20260825` | 25.08.2026 `c20ab145` | [#2171](https://github.com/officefish/Membrana/pull/2171) MERGED | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · спринт #2171 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana-deploy-preflight-context` | `codex/deploy-preflight-lint-fix` | 23.08.2026 `f2806fe7` | [#2099](https://github.com/officefish/Membrana/pull/2099) MERGED | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · спринт #2099 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana-friday-duty-tooling` | `codex/friday-duty-tooling-20260826` | 26.08.2026 `8d53673d` | [#2179](https://github.com/officefish/Membrana/pull/2179) MERGED | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · спринт #2179 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana-issue-2046` | `codex/issue-2046-first-capture-rate` | 22.08.2026 `1ab3528a` | [#2065](https://github.com/officefish/Membrana/pull/2065) MERGED | 1 грязн., 3 незапуш. | — · — | unregistered → **sprint-open** | ✅ выдана · сессия В (журнал) — по HANDOFF 25.08 |
| `Membrana-journal-linearization` | `codex/journal-linearization-v2` | 24.08.2026 `5efa5137` | [#2127](https://github.com/officefish/Membrana/pull/2127) MERGED | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · спринт #2127 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana-journal-reconcile-measure` | `codex/journal-reconcile-measure` | 25.08.2026 `7260993c` | [#2157](https://github.com/officefish/Membrana/pull/2157) MERGED | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · спринт #2157 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana-llm-usage-date-ci` | `codex/llm-usage-date-ci` | 23.08.2026 `6ad2cbd8` | [#2084](https://github.com/officefish/Membrana/pull/2084) MERGED | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · спринт #2084 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana-net-panel` | `codex/network-panel-refusal-20260910` | 12.09.2026 `17f5e853` | [#2340](https://github.com/officefish/Membrana/pull/2340) MERGED | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · спринт #2340 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana-night-freshness-20260829` | `codex/night-freshness-head-20260829` | 29.08.2026 `a63e2f17` | [#2231](https://github.com/officefish/Membrana/pull/2231) MERGED | — | node_modules · — | unregistered → **sprint-closed** | ✅ выдана · спринт #2231 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana-night-summary-reader-20260830` | `codex/night-summary-reader-20260830` | 30.08.2026 `3c9f4651` | [#2242](https://github.com/officefish/Membrana/pull/2242) MERGED | — | node_modules · — | unregistered → **sprint-closed** | ✅ выдана · спринт #2242 (автор PR officefish); сессия не названа — .worktree-owner нет, в документах дерево не упомянуто |
| `Membrana-orphans` | `codex/orphan-branches-20260917` | 17.09.2026 `af77ed93` | нет | — | — · — | unregistered → **sprint-open** | ✅ выдана · сессия Г (17.09) — спасение веток без копии на сервере |
| `Membrana-prship-exit-code` | `codex/prship-exit-code` | 22.08.2026 `ecce83b0` | [#2070](https://github.com/officefish/Membrana/pull/2070) MERGED | 1 незапуш. | node_modules · — | unregistered → **sprint-open** | ✅ выдана · сессия не названа; дерево прецедента 2026-08-22-prship-exit-code-wrapper |
| `Membrana-records` | `fix/sanitation-records-2026-08-22` | 22.08.2026 `5472a313` | [#2064](https://github.com/officefish/Membrana/pull/2064) MERGED | — | node_modules · .env | unregistered → **sprint-open** | ✅ выдана · сессия Г (санитария записей 22.08) |
| `Membrana-ritual-night` | `codex/ritual-night-core-20260830` | 30.08.2026 `96088fe2` | [#2243](https://github.com/officefish/Membrana/pull/2243) MERGED | — | node_modules · — | unregistered → **sprint-open** | ✅ выдана · сессия не названа; дерево заблокировано git (locked: initializing) |
| `Membrana-sanitation-b` | `chore/worktree-sanitation-day2-20260917` | 17.09.2026 `af77ed93` | нет | — | — · — | unregistered → **sprint-open** | ✅ выдана · сессия Б (17.09) — снос мёртвых веток и закрытых деревьев |
| `Membrana-worktree-cards` | `codex/worktree-cards-20260917` | 17.09.2026 `62bae613` | нет | — | — · — | unregistered → **sprint-open** | ✅ выдана · сессия В (17.09) — карточки деревьев |

## Таблица: карточки НЕ выданы (4)

| Дерево | Ветка | Последний коммит | PR | Хвосты | Оснащено | Класс до → после | Карточка |
|---|---|---|---|---|---|---|---|
| `Membrana/.worktrees/media-tails-2185-2186` | `(detached)` | 28.08.2026 `b5f7a165` | нет | — | node_modules · — | unregistered → **unregistered** | ❌ нет — detached HEAD — ветки нет, PR не привязать; хозяин не определяется |
| `Membrana-cabinet-swagger` | `codex/cabinet-swagger-api` | 03.09.2026 `e4fe6e3c` | нет | — | — · — | unregistered → **unregistered** | ❌ нет — PR у ветки нет и нет ни одного факта о хозяине (.worktree-owner / реестр коворка / карточка сессии / HANDOFF) |
| `Membrana-claims` | `angelina/work/2026-08-09-tariff-block-c` | 09.08.2026 `61066ed4` | нет | 4 грязн. | node_modules · .env | unregistered → **unregistered** | ❌ нет — PR у ветки нет и нет ни одного факта о хозяине (.worktree-owner / реестр коворка / карточка сессии / HANDOFF) |
| `Membrana-media-tails-2185-2186` | `codex/media-tails-2185-2186-20260826` | 26.08.2026 `b2ac805d` | нет | — | — · — | unregistered → **unregistered** | ❌ нет — PR у ветки нет и нет ни одного факта о хозяине (.worktree-owner / реестр коворка / карточка сессии / HANDOFF) |

## Таблица: карточка уже была (22)

| Дерево | Ветка | Последний коммит | PR | Хвосты | Оснащено | Класс до → после | Карточка |
|---|---|---|---|---|---|---|---|
| `Membrana` | `codex/server-guards-20260825` | 27.08.2026 `6ee489d9` | [#2162](https://github.com/officefish/Membrana/pull/2162) MERGED | 8 грязн. | node_modules · .env | canon → **canon** | была (canon) |
| `Membrana/.worktrees/cabinet-swagger-api` | `codex/cabinet-swagger-fastify-static` | 03.09.2026 `9bd2c23a` | [#2275](https://github.com/officefish/Membrana/pull/2275) MERGED | 1 грязн. | node_modules · .env | sprint-open → **sprint-open** | была (sprint) |
| `Membrana/.worktrees/meeting-static-container-20260803` | `codex/meeting-static-container-20260803` | 08.08.2026 `590ec0db` | нет | — | node_modules · .env | sprint-open → **sprint-open** | была (sprint) |
| `Membrana/.worktrees/Membrana-read-api` | `cowork/cowork-static-registry-read-api/read-api` | 09.08.2026 `44630395` | нет | — | node_modules · .env | sprint-open → **sprint-open** | была (sprint) |
| `Membrana/.worktrees/Membrana-registry-contract` | `cowork/cowork-static-registry-read-api/registry-contract` | 09.08.2026 `cbba747e` | нет | — | node_modules · .env | sprint-open → **sprint-open** | была (sprint) |
| `Membrana/.worktrees/Membrana-registry-index` | `cowork/cowork-static-registry-read-api/registry-index` | 09.08.2026 `d09dc34a` | нет | — | node_modules · .env | sprint-open → **sprint-open** | была (sprint) |
| `Membrana-archivarius` | `parked/archivarius-2026-07-28` | 11.08.2026 `3be51dc6` | нет | — | node_modules · .env | sprint-open → **sprint-open** | была (sprint) |
| `Membrana-codex` | `codex/procedure-run-journal` | 01.08.2026 `350e2d9d` | нет | 92 грязн. | node_modules · .env | canon → **canon** | была (canon) |
| `Membrana-contract` | `cowork/cowork-library-open-api/contract` | 02.09.2026 `b047a20e` | нет | 2 незапуш. | node_modules · .env | sprint-open → **sprint-open** | была (sprint) |
| `Membrana-core-waits` | `codex/cabinet-image-context-2287` | 05.09.2026 `435fbd7c` | [#2295](https://github.com/officefish/Membrana/pull/2295) MERGED | — | node_modules · .env | sprint-open → **sprint-open** | была (sprint) |
| `Membrana-dreams-deploy` | `feat/closure-acceptance-gate` | 24.07.2026 `bd38314c` | нет | — | node_modules · — | sprint-open → **sprint-open** | была (sprint) |
| `Membrana-grok` | `angelina/storm/chart-list-fixes-20260823` | 23.08.2026 `acac1953` | [#2094](https://github.com/officefish/Membrana/pull/2094) MERGED | — | node_modules · .env | canon → **canon** | была (canon) |
| `Membrana-hunt-trigger` | `fix/night-hunt-trigger-fail-loud` | 27.08.2026 `7b38cda2` | [#2210](https://github.com/officefish/Membrana/pull/2210) MERGED | — | — · — | sprint-open → **sprint-open** | была (sprint) |
| `Membrana-installstate` | `chore/registry-sanitation-20260916` | 16.09.2026 `8cb8dc00` | [#2346](https://github.com/officefish/Membrana/pull/2346) MERGED | — | node_modules · .env | unregistered → **unregistered** | была, но `kind: long-lived(неsprint)` парсер не читает → unregistered; не трогал — слово владельца 27.08 (см. находки) |
| `Membrana-integration` | `cowork/cowork-library-open-api/integration` | 03.09.2026 `99ea5fdd` | [#2267](https://github.com/officefish/Membrana/pull/2267) MERGED | — | node_modules · .env | sprint-open → **sprint-open** | была (sprint) |
| `Membrana-key-ttl` | `cowork/cowork-library-open-api/key-ttl` | 02.09.2026 `d59409dd` | нет | 2 незапуш. | node_modules · .env | sprint-open → **sprint-open** | была (sprint) |
| `Membrana-llm-panel` | `codex/llm-procedure-panel` | 11.08.2026 `685e18f0` | нет | 1 незапуш. | — · — | sprint-open → **sprint-open** | была (sprint) |
| `Membrana-obs-meeting` | `fix/morning-sweep-gap` | 29.08.2026 `354bc339` | [#2236](https://github.com/officefish/Membrana/pull/2236) MERGED | — | node_modules · .env | sprint-open → **sprint-open** | была (sprint) |
| `Membrana-ownership` | `cowork/cowork-library-open-api/ownership` | 02.09.2026 `de0005f8` | нет | 2 незапуш. | node_modules · .env | sprint-open → **sprint-open** | была (sprint) |
| `Membrana-product` | `chore/media-rebuild-r1` | 21.08.2026 `83eb5a9f` | [#2057](https://github.com/officefish/Membrana/pull/2057) MERGED | 1 грязн. | node_modules · .env | canon → **canon** | была (canon) |
| `Membrana-tooling` | `angelina/chore/ritual-day-20260917` | 17.09.2026 `62bae613` | [#2349](https://github.com/officefish/Membrana/pull/2349) MERGED | — | node_modules · .env | canon → **canon** | была (canon) |
| `Membrana-weave` | `chore/report-entry-archive` | 21.08.2026 `29a17a7e` | [#2059](https://github.com/officefish/Membrana/pull/2059) MERGED | — | node_modules · .env | sprint-open → **sprint-open** | была (sprint) |

## Счёт классов (сухой прогон `repo:clean`, 65 деревьев)

- до (17.09, до выдачи): canon: 5 · sprint-open: 16 · sprint-closed: 0 · unregistered: 44 · unknown: 0
- после (17.09, после выдачи): canon: 5 · sprint-open: 48 · sprint-closed: 7 · unregistered: 5 · unknown: 0
## Оставшиеся `unregistered` — чего не хватило для карточки

| Дерево | Чего не хватило | Что владельцу решить |
|---|---|---|
| `Membrana/.worktrees/media-tails-2185-2186` | detached HEAD (`b5f7a165` = коммит ствола #2225), ветки нет → PR не привязать; хозяина не назвал никто | дубль по имени с `Membrana-media-tails-2185-2186`; если содержимое не нужно — снос как detached (инструмент даёт `unknown`, снос руками осознанно) |
| `Membrana-media-tails-2185-2186` | ветка `codex/media-tails-2185-2186-20260826` без PR; HEAD внутри ствола, грязи нет; ни `.worktree-owner`, ни упоминания в документах | содержимого вне ствола ноль — кандидат на снос, но право сказать это — у владельца |
| `Membrana-cabinet-swagger` | ветка `codex/cabinet-swagger-api` без PR (PR #2275 шёл с соседней ветки `codex/cabinet-swagger-fastify-static` в `.worktrees/cabinet-swagger-api`); HEAD внутри ствола; хозяина не назвал никто | то же: вне ствола ноль, решение владельца |
| `Membrana-claims` | ветка `angelina/work/2026-08-09-tariff-block-c` без PR; **4 незакоммиченных файла** (чужая работа — не тронуты); документы называют дерево только в списке «лечить» (SESSION_G_ENVIRONMENT_DEBTS 16.08) | чьи 4 файла — спросить; префикс `angelina/` в счёт не шёл (§7а: у персонажей нет своих веток) |
| `Membrana-installstate` | карточка **есть**, но `kind: long-lived (не sprint)` — парсер знает только `canon`/`sprint`, поэтому дерево `unregistered` | это не ошибка автора карточки, а дырка словаря: долгоживущее оснащённое дерево сессии Г (слово владельца 27.08) не влезает ни в `sprint` (снесут после мерджа PR), ни в `canon` (множество закрыто). Варианты: расширить канон именем (нужен ADR, канон закрыт консилиумом) либо принять, что такое дерево живёт под отказом инструмента. Карточку не трогал |

## Находки по дороге

1. **Семь каталогов `Membrana-*` — не рабочие деревья.** `Membrana-angelina`, `-openrouter`,
   `-procedures-core`, `-send-gate`, `-tree-hygiene`, `-tw-v3-axes`, `-tw-v5-validity`:
   в каждом лежит `WORKTREE.md` (`kind: sprint`) и 13–17 файлов, но `.git` нет и
   `git worktree list` их не знает. Это остатки после сноса деревьев (снос убрал git,
   но не каталог). `repo:clean` их не видит по построению — убирать как каталоги, руками,
   после взгляда владельца.
2. **Главное дерево `Membrana` стоит не на `main`**, а на `codex/server-guards-20260825`
   (PR #2162 MERGED 27.08) с 8 незакоммиченными файлами (`.gitattributes`, journal-merge,
   ritual-deliver-to-main, trail 24.08). Карточка у него `canon/main`, класс верный, но
   утренний порядок (#1232: главный checkout = `main`, чистый) им нарушен. Не трогал:
   чужая работа.
3. **`.worktrees/*` внутри главного дерева — 18 деревьев.** Вложенность в снос не
   заявлена; перед сносом любого из них проверять junction (`node_modules/@membrana/*`),
   прецедент 06.08. Три из них (`pr-2216`, `pr-2217`, `prship-2247-early-exit`) без
   `node_modules` вовсе — одноразовые ревью-деревья.
4. **`Membrana-grok` — `kind: canon`, `canonName: cursor`.** Имя в закрытом множестве,
   ветка `angelina/storm/chart-list-fixes-20260823` (PR #2094 MERGED), `.worktree-owner`
   «сессия Г». Класс `canon` законен по коду, но код `canonName` **не проверяет**:
   любое `kind: canon` выводит дерево из-под уборки навсегда. Стоит зуб на
   `canonName ∈ CANON_NAMES` — предложение, не сделано.
5. **Дубли по назначению:** `Membrana-media-tails-2185-2186` ↔ `.worktrees/media-tails-2185-2186`;
   `Membrana-cabinet-swagger` ↔ `.worktrees/cabinet-swagger-api`. По одному делу — по два дерева.
6. **Ложный хвост «PR MERGED, но работа не доехала» — у ~25 деревьев.** После выдачи
   карточек инструмент отнёс к `sprint-closed` только 7 деревьев, а ещё ~25 мёртвых
   оставил в `sprint-open` с причиной «работа не доехала: 1 незапушенный коммит».
   Проверено на `Membrana-net-panel`: вершина дерева `17f5e853` = **squash-коммит
   слияния** PR #2340 (`mergeCommit.oid`), она внутри `origin/main`; но
   `unpushedCount` сверяет вершину с `headRefOid` PR (голова ветки ДО слияния) и
   считает `rev-list headRefOid..tip` = 1. Так выглядит любое дерево, которое после
   мерджа переставили на коммит ствола. Ошибка в безопасную сторону (сноса нет), но
   она сводит на нет цель карточек — сессия Б эти деревья не получит. Починка на
   одну строку в `scripts/repo-clean.mjs::unpushedCount`: если
   `git merge-base --is-ancestor <tip> origin/main` — незапушенного 0 (или сверять
   с `pr.mergeCommit.oid` наравне с `headRefOid`). **Не правил**: инструмент сноса
   сегодня в руках сессии Б, менять его под её прогоном нельзя; отдельным PR.
7. **Прибор дня:** `yarn -s repo:clean` падает — yarn Berry не знает `-s`. Рабочая форма:
   `node scripts/repo-clean.mjs --report <файл>` (или `yarn repo:clean --report <файл>`).

## Что дальше (не сделано, не моя зона)

- Снос `sprint-closed` — сессия Б, `yarn repo:clean --execute --worktrees --report <файл>`,
  по одному дереву с пост-чеком.
- Пять оставшихся `unregistered` и семь мёртвых каталогов — слово владельца.
- Словарь для долгоживущих некононических деревьев (`installstate`) — ADR или заседание.
