# Membrana Local Sprint OPEN: stale-dist-turbo-cache-2525

| Поле | Значение |
|------|----------|
| Sprint | `stale-dist-turbo-cache-2525` |
| Procedure | `membrana-local-sprint` |
| Issue | [#2525](https://github.com/officefish/Membrana/issues/2525) — кеш turbo восстанавливает устаревший dist вместе с `.tsbuildinfo` «актуально»; пересборка не помогает, предпуш падает на экспортах, которых нет только в кеше |
| Registry | карточка НЕ заведена (фаза 1 — разбор и план; регистрация `sprintKind: membrana-local-sprint` — после ратификации, руками ведущей) |
| Cut | [`stale-dist-turbo-cache-2525.json`](../../sprint/cut/stale-dist-turbo-cache-2525.json) — **НЕ ратифицирован**; ратифицирует только владелец (`yarn sprint:cut --plan docs/sprint/cut/stale-dist-turbo-cache-2525.json --ratify --at <ISO>` по его явному слову) |
| Cutter | vesnin → [`cut-stale-dist-turbo-cache-2525-vesnin.md`](../../discussions/cut-stale-dist-turbo-cache-2525-vesnin.md) · лента актов [`trail/stale-dist-turbo-cache-2525.jsonl`](../../sprint/cut/trail/stale-dist-turbo-cache-2525.jsonl) |
| Lead | vesnin (b1) · dynin (b2) |
| Support | angelina (гейт, модератор) |
| Branch / tree | `fix/stale-dist-turbo-cache-2525` от `origin/main` `75668adb` · `Membrana-installstate` |
| Status | OPEN · фаза 1 (разбор + план) 02.10 — код не тронут, PR не открыт |

## Симптом

- 29.09 (#2525, ведущая): предпуш падает в `background-media` — `TS2339: Property 'DETECTOR_BATCH_MANIFEST' does not
  exist on type 'typeof import(".../plugin-handlers/dist/index")'`. Экспорт в `plugin-handlers/src/index.ts:138` есть,
  CI зелёный. `yarn turbo run build --force` не помогает; `tsc -b --force` в пакете помогает **до следующего пуша**
  (предпуш переписывает `dist/index.d.ts` в 20:12, экспорта 0). Вылечил только `yarn clean` в пакете + `turbo build
  --force`. Четыре пуша в двух деревьях (`Membrana-orphans`, `Membrana-sanitation-b`) за день.
- 01.10 (#2538, `CLOSURE.md:68-69, 182-183`): `plugin-contracts` dist от 08.09 без `BatchCollection*`,
  `media-library-service` без `MoveBatch*` и `refreshQuota`; лечение `yarn clean` → `turbo --force`.
- 02.10 (#2540, `OPEN.md:206`): `tsc -b` клиента падал на `refreshQuota`/`readAt` — dist `media-library-service` от
  30.09 при исходниках 01.10; хватило `turbo run build --filter=… --force`.
- 30.09 — бенчмарк ансамбля, та же картина (со слов задания; отдельного вещдока в дереве не найдено).

## Устройство (путь → строка)

| Что | Где |
|---|---|
| Выходы сборки включают манифест tsc | `turbo.json` → `tasks.build.outputs: ["dist/**", ".tsbuildinfo"]`; `tasks.typecheck.outputs: [".tsbuildinfo"]` (без `inputs`) |
| Входы сборки | `tasks.build.inputs: ["src/**", "tsconfig*.json", "package.json", vite/postcss/tailwind-конфиги, index.html]`, `dependsOn: ["^build"]` |
| Инкрементальный tsc | `tsconfig.base.json` `incremental: true`; пакеты `composite: true`, `tsBuildInfoFile: ./.tsbuildinfo`, `outDir: ./dist` |
| Сборки пакетов | 34 на `tsc -b`: 15 чистых, 18 `tsc -b && vite build`, 1 `yarn prepare && tsc -b` (список — зона b1 в нарезке) |
| typecheck пакетов | 30× `tsc --noEmit` (пишет тот же `.tsbuildinfo`), 3× `… && tsc -p tsconfig.test.json` (test-конфиги `incremental:false`, не пишут) |
| Общий кеш деревьев | `turbo run build` печатает «Remote caching disabled, **using shared worktree cache**»; кеш в `C:/Users/user190825/practice/Membrana/.turbo/cache` (git common dir главного дерева), **22 089 записей**, у worktree своего `.turbo/cache` нет |
| Предпуш | `.githooks/pre-push` (hooksPath — абсолютный путь на главное дерево) → `scripts/prepush-typecheck-scope.mjs` → `yarn turbo run typecheck --filter ...<pkg>` → `^build` через тот же общий кеш |
| CI | `.github/workflows/ci.yml:126` `yarn turbo run lint typecheck build --continue` на чистом раннере; `actions/cache` (:57-60) хранит только Yarn-кеш — ни dist, ни `.tsbuildinfo`, ни `.turbo` |
| References клиента | `apps/client/tsconfig.app.json` — 22 пакета, `media-library` среди них нет (зависимость в `package.json` есть) |

## Замеры (ствол `75668adb`, 02.10 10:20–10:35 МСК, turbo 2.9.12, TypeScript 5.9.3)

Все записи в кеш — в изолированном `TURBO_CACHE_DIR` (scratchpad). Общий кеш: 22 089 записей до и после, не тронут.
Пакет-подопытный — `@membrana/plugin-contracts`; исходник возвращён `git checkout --`, dist пересобран честно.

| # | Команда | Вывод | Вывод для механики |
|---|---|---|---|
| E1b | усечь `dist/index.d.ts`, удалить `.tsbuildinfo`, `yarn turbo run build --filter=@membrana/plugin-contracts` | `cache hit, replaying logs 27468ec1136edd07`; оба файла восстановлены, mtime `2026-10-02 10:21:49` = момент replay | replay переписывает выходы и ставит mtime «сейчас»: манифест после любого replay новее всех исходников |
| E2 | `echo 'export const PORCHA_2525_E2 = 1' >> src/index.ts; touch -d 2026-09-01 src/index.ts; tsc -b --verbose` | `Project 'tsconfig.json' is up to date because newest input 'src/batch-collection-run.ts' is older than output '.tsbuildinfo'`; экспорта в dist **0** | `tsc -b` (TS 5.9) сверяет содержимое ТОЛЬКО если исходник новее манифеста по mtime |
| E2b | то же, `touch src/index.ts` (mtime сейчас), `tsc -b --verbose` | `out of date because output '.tsbuildinfo' is older than input 'src/index.ts'`; экспорт **1** | подтверждение E2 с обратной стороны |
| E2c | то же состояние, что E2, `tsc -b --force` | экспорт **1** | `--force` игнорирует mtime-суд |
| E3 | правка + `tsc --noEmit` (путь typecheck), затем `tsc -b --verbose` | в манифесте `affectedFilesPendingEmit: [[71,51]]`; `out of date because buildinfo file '.tsbuildinfo' indicates that some of the changes were not emitted`; экспорт **1** (и при старом mtime — E3b) | typecheck — **не** отравитель |
| E5.0 | изолированный кеш, `turbo run build` | `cache miss, executing 27468ec1136edd07` | честная запись |
| E5.1 | новый экспорт, mtime исходника старше манифеста, `turbo run build` | `cache miss, executing 0ae2d98063e00df3` (хеш сменился — turbo честен), `tsc -b` молча пропустил, экспорта в dist **0** | **запись 0ae2d980 отравлена**: старый dist под новым хешем |
| E5.2 | `turbo run build --force` | `cache bypass, force executing 0ae2d98063e00df3`; экспорт **0** | `--force` turbo не лечит: tsc -b снова «up to date» (= #2525) |
| E5.3 | `tsc -b --force` в пакете → `turbo run build` | **1** → `cache hit, replaying logs 0ae2d98063e00df3` → **0**, манифест mtime 10:27:15 | «помогает до следующей отправки» (= замер ведущей 29.09) |
| E5.4 | `yarn workspace … clean` → `turbo run build --force` → `turbo run build` | **1** (запись перезаписана) → hit → **1** | лечение из #2525; общий кеш — одно лечение чинит все деревья |
| E7 | удалить `dist/index.d.ts` при свежем манифесте, `tsc -b --verbose` | `up to date because newest input … is older than output '.tsbuildinfo'`; файл **не** восстановлен | tsc -b на dist не смотрит → **убрать `.tsbuildinfo` из outputs недостаточно**: replay вернёт старый dist, локальный честный манифест скажет «всё эмитено» |
| E8 | состояние E2, `tsc -p tsconfig.json` | экспорт **1** | не-build режим сверяет содержимое |
| E9 | `tsc -b --force` vs `tsc -b` (no-op) | core 2895 / 1067 мс; plugin-handlers 2699 / 1107 мс | цена `--force` ≈ +1,7 с на пакет на промах |
| E10 | `fileInfos[i].version` для `src/index.ts` vs `sha256(текст)` | `5f3e00e6…9027e3` = `5f3e00e6…9027e3` побайтно; в `fileNames` 242 файла, из них 14 в `src/` | зуб свежести по содержимому дёшев |
| E11 | правка с обычным mtime → `turbo run build` ×5 (и `--no-daemon`) | `cache miss` 5/5; `--daemon` помечен `[DEPRECATED] The daemon is no longer used for turbo run`; `core.fsmonitor` не задан | ошибка хеша turbo отпадает |
| E12 | `turbo run build --filter=@membrana/plugin-handlers --dry=json` | hash включает `src/**`, `tsconfig*.json`, `package.json`, зависимости `^build`; `globalCacheInputs.files = ['.env', '.gitattributes', 'tsconfig.base.json']` | входы хеша полные |

## Механизм

1. **Replay общего кеша** кладёт `dist/**` и `.tsbuildinfo` с mtime «сейчас» (E1b) — в любое дерево с теми же входами.
2. **`tsc -b` верит mtime**: пока манифест новее исходников, содержимое не сверяется и ничего не эмитится (E2);
   на существование dist он не смотрит (E7).
3. **turbo сохраняет то, что лежит в `dist`** после задачи — даже если `tsc -b` ничего не переписал. Промах кеша с
   пропущенным эмитом даёт запись «новые входы → старый dist» (E5.1). Запись **самоподтверждается**: `--force` turbo
   запускает тот же `tsc -b` с тем же вердиктом (E5.2), replay возвращает отраву поверх ручного `tsc -b --force` (E5.3).
4. **Кеш общий для всех деревьев** (turbo 2.9 «shared worktree cache»): одна отравленная запись = падение предпуша во
   всех деревьях с теми же исходниками (29.09 — четыре пуша в двух деревьях); и одно `clean + --force` чинит все (E5.4).

**Почему CI не ловит:** чистый раннер без dist/манифеста/кеша — каждая сборка полный честный эмит (`ci.yml:126`,
кеш `actions/cache` только Yarn, :57-60). **Почему предпуш не ловит, а падает:** он честно собирает через turbo
`^build`, но из общего кеша, где лежит отрава.

**Что неизвестно — пусковой момент первого отравления.** Условие входа: манифест на диске новее изменённых исходников,
но описывает старые. Отпали: typecheck (E3), test-конфиги (`incremental:false`), ошибка хеша (E11), fsmonitor,
копирование dist скриптами (только `studio-build.mjs` копирует `apps/client/dist`). Остаются кандидаты (не замерены):
гонка replay с параллельной сменой ветки в том же дереве (класс инцидента 09.07, «чужая сессия переключила ветку»),
иной источник старого mtime у исходников. **Починка от пускового момента не зависит**: промах кеша становится полным
эмитом, и запись «новые входы → старый dist» образоваться не может.

**Второй, простой подвид (#2540):** `tsc -b` клиента перестраивает только проекты из `references`
(`apps/client/tsconfig.app.json`, 22 пакета); `media-library` там нет → её dist читается из `node_modules` как есть.
Лечится одним `--force`; в спринт не входит (отдельный билет на references), но зуб b2 его показывает.

## Существующий инструмент

- `membrana-tooling-doctor` шаг 3 — «`yarn build:affected` — пересобрать dist изменённых пакетов (убрать stale-dist
  перед typecheck)». Это пересборка, не проверка, и она идёт через тот же `tsc -b` — отраву не лечит (E5.2).
- `scripts/studio-package.mjs:4,65` — класс «stale dist» закрыт turbo-замыканием `--filter=app...` (#2147/№5) — тот
  же `tsc -b`.
- Зуба «dist ≠ исходники по содержимому» в дереве нет (`verify:*` с dist/fresh — ноль).

## Блоки

| Блок | Персона | Зона | Оценка |
|------|---------|------|-------:|
| b1 `build-never-trusts-tsbuildinfo` | vesnin | `turbo.json` (не меняется, кроме развилки 2) · 34 `package.json` пакетов со сборкой `tsc -b` (явный список в нарезке) · новые `scripts/turbo-stale-dist-scenario.mjs`, `scripts/build-scripts-tsbuildinfo-trust.test.mjs` | 240 |
| b2 `dist-freshness-tooth` | dynin | новые `scripts/lib/dist-freshness.mjs` (+test), `scripts/verify-dist-fresh.mjs` · корневой `package.json` (провод `verify:dist-fresh`) · `.cursor/skills/membrana-tooling-doctor/SKILL.md`, `.claude/skills/membrana-tooling-doctor/SKILL.md` · `.githooks/pre-push` — **только по развилке 3** | 280 |

Порядок b1 → b2. b2 читает тот же `.tsbuildinfo`, который b1 обязался оставить в outputs. Зоны не пересекаются
(корневой `package.json` — b2; `packages/**/package.json` — b1).
**Точка перерезки — после b1:** если `tsc -b --force` ломает `vite build` на 18 vite-пакетах или `yarn prepare` в rag,
либо полный `turbo build` растёт сверх +90 с — стоп, перерезка на обёртку-сторож по содержимому (развилка 1) до b2.

## Прогноз до исполнения

| Блок | Что даст | Чем проверяется | Чем опровергается |
|------|----------|-----------------|-------------------|
| b1 | 34 сборки пакетов — `tsc -b --force` (`… --force && vite build`, `yarn prepare && tsc -b --force`): промах кеша = полный эмит, запись «новые входы → старый dist» невозможна. `.tsbuildinfo` остаётся в outputs как манифест. Сценарий-зуб `turbo-stale-dist-scenario.mjs --package <name>`: E5.0→E5.3 в изолированном `TURBO_CACHE_DIR`, отказ при незакоммиченных правках пакета, откат исходника и честный dist, ОТРАВЛЕНО/ЧИСТО → exit 1/0. Конфиг-зуб: сборка `tsc -b` без `--force` — находка; `build.outputs` содержит `.tsbuildinfo` | сценарий на стволе `75668adb` — **ОТРАВЛЕНО** (после `tsc -b --force` и replay экспорта 0), на ветке — **ЧИСТО**; конфиг-зуб: 34 находки на стволе, 0 на ветке; полный `yarn turbo run build` на ветке зелёный; +≈1,7 с на пакет на промах, в CI ≈ +1 мин на полной сборке | `--force` ломает `vite build`/`yarn prepare` — перерезка на обёртку; сценарий зелёный на стволе — E5 не воспроизводится из скрипта: стоп и разбор, не правка ожиданий |
| b2 | Чистый предикат `judgeDistFreshness({ buildInfo, sources, distPresent })` → `fresh | stale(files[]) | dist_missing | absent` без fs/часов; CLI `yarn verify:dist-fresh [--filter <pkg>]` обходит composite-пакеты, сравнивает sha256 исходников под `rootDir` (BOM снимается как у tsc, переводы строк не нормализуются) с `fileInfos[].version`, таблица + exit 1; шаг в обоих SKILL.md doctor | предикат красный на `version ≠ sha256` и на «манифест есть, dist нет» (E7), `absent` без манифеста, `fresh` на совпадении; живой прогон на E5.1-состоянии красный с именем файла; на честном дереве после `turbo build` — зелёный по всем 34 пакетам | зелёный на E5.1 — сравнение не по тому полю (индексация `fileInfos` через `fileNames`/`fileIdsList`) — стоп; ложный красный на честном дереве — манифест и dist разошлись (replay без манифеста по развилке 2) — объявлять `absent`, не `stale` |

## BLOCK-условия (резчик)

- **b1:** любая из 34 сборок пакетов осталась `tsc -b` без `--force` (или иного полного эмита на промахе);
  `.tsbuildinfo` убран из `build.outputs` без слова владельца по развилке 2; сценарий трогает общий кеш (без
  изолированного `TURBO_CACHE_DIR`) или оставляет пакет с правками/непересобранным dist; сценарий зелёный на стволе
  (зуб без предмета); тронуты сборки `apps/*`.
- **b2:** предикат читает ФС/часы (судит по mtime); отсутствие манифеста или dist выдаётся как `fresh`; зуб красный на
  честном дереве после `turbo build`; провод в pre-push без слова владельца по развилке 3; второй писатель правды о
  свежести рядом с `build:affected` без ссылки друг на друга.

## Вердикт резчика (vesnin, прогон контекста 02.10)

Конспект — [`cut-stale-dist-turbo-cache-2525-vesnin.md`](../../discussions/cut-stale-dist-turbo-cache-2525-vesnin.md),
акт `cut_context_run` 02.10 07:46Z в ленте. **Нарезка годится:** b1 — починка в точке отравления, b2 — наблюдатель;
граф b1 → b2, зоны чистые («packer vs observer»). **Корень верен** — петля replay → mtime → `tsc -b` → старый dist под
новым хешем, доказана E5. **Porcha достаточна** при условии: оба зуба запускаются на **чистом стволе**, незакоммиченные
правки пакета — отказ. **Способ — `tsc -b --force`** в 34 сборках (форма соответствует функции: «пересчитать, не верь
кешу»; обёртка требует поддержки зуба, `tsc -p` теряет инкрементальность references). **`.tsbuildinfo` в outputs
оставить** как манифест для b2 (E7). **Общий кеш деревьев оставить** (после b1 отрава не образуется, одно лечение чинит
все деревья); CI изолирован по факту. **Приложения — без `--force`.** Добавлено резчиком: **b2 блокируется до зелёного
b1** (иначе зуб ловит ещё не излеченную отраву и путает предмет); провод зуба в предпуш — «если возможно сразу» либо в
doctor — оставлен развилкой 3 владельцу. Не входит — подтверждено, включая references клиента (отдельный билет).

## Что НЕ входит

- Чужая резолюция `node_modules/@membrana/*` в соседнее дерево (#1647/#1725) — `prepush-typecheck-scope` уже понижает
  вердикт; не трогается.
- 30 typecheck-скриптов `tsc --noEmit` — пишут тот же манифест, но не отравляют (E3); не трогаются.
- Сборки приложений `apps/*` (`tsc -b && vite build`, у клиента 22 references: `--force` пересобирал бы их все,
  +60 с) — не трогаются (развилка 5).
- CI — честен, не меняется. `build:affected` — остаётся.
- Обновление turbo, remote cache, отключение общего кеша деревьев — развилка 4, не в спринте.
- Чистка 22 089 записей общего кеша — не нужна: правка `package.json` меняет хеши всех 34 сборок, старые записи
  обходятся. (Место на диске — отдельный вопрос владельцу.)
- Отсутствие `media-library` в references клиента (подвид #2540) — отдельный билет.
- Поиск пускового момента первого отравления — не продолжается: починка от него не зависит.

## Развилки на слово владельца

1. **Способ «промах = полный эмит»**: `tsc -b --force` в 34 сборках (умолчание: ноль нового кода, +1,7 с на пакет на
   промах) · обёртка-сторож по содержимому перед `tsc -b` (сохраняет инкрементальность, +1 node-процесс в каждой
   сборке, тот же предикат, что в b2) · `tsc -p tsconfig.json` (сверяет содержимое — E8; не строит references,
   для `media-library`/`background-media` положиться на `^build`).
2. **`.tsbuildinfo` в `build.outputs`**: оставить как манифест (умолчание; E7 — удаление петлю не рвёт, зубу нужен
   предмет) · убрать (предложение #2525; тогда зуб b2 после replay объявляет `absent`).
3. **Зуб свежести**: только `yarn verify:dist-fresh` + шаг doctor (умолчание) · ещё и в pre-push перед typecheck
   (≈1 с; предпуш и так идёт через turbo `^build`; ценность — подвид #2540 при прямом `tsc`).
4. **Общий кеш деревьев** (turbo 2.9): оставить (умолчание: после b1 отрава не образуется, одно лечение чинит все
   деревья) · `TURBO_CACHE_DIR` на дерево (изоляция радиуса, холодные сборки медленнее). В репозитории кеш ничем не
   настраивается — turbo нашёл его сам по git common dir.
5. **Сборки приложений**: оставить `tsc -b` (умолчание) · тоже `--force` (+60 с на сборку клиента).
6. **References клиента без `media-library`** — отдельный билет (умолчание) · одна строка в b1.

## Не one shot

Два предмета (сборочный контур 34 пакетов + новый прибор-зуб), две персоны с непересекающимися зонами,
сценарий-порча, который трогает кеш и исходники и обязан изолироваться и откатываться, шесть развилок на
ратификацию владельца, точка перерезки после b1.
