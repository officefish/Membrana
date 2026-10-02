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

## Проверки ревью (02.10)

Ревью тимлида поставило BLOCK на `fc3bb4ce` по двум P1. Ревьюер читает только дифф; оба пункта сведены к
командам и перепрогнаны в дереве `Membrana-installstate` 02.10 на голове `fc3bb4ce` при чистом рабочем дереве.

### P1-1 «Индексация fileIdsList → fileInfos не верифицирована»

Предикат **`fileIdsList` не использует** — в манифесте tsc это список для `referencedMap`. Версии берутся
позиционно: `fileNames[i] ↔ fileInfos[i]`, так tsc 5.x пишет `.tsbuildinfo` (E10 фазы 1: для `src/index.ts`
`fileInfos[i].version` = `sha256(текст)` побайтно). Тело — `scripts/lib/dist-freshness.mjs`, дословно:

```js
53  export function manifestSources(buildInfo, { rootDir = './src' } = {}) {
54    const names = Array.isArray(buildInfo?.fileNames) ? buildInfo.fileNames : [];
55    const infos = Array.isArray(buildInfo?.fileInfos) ? buildInfo.fileInfos : [];
56    const prefix = `${normalizeSlashes(rootDir).replace(/\/+$/u, '')}/`;
58    names.forEach((rawName, i) => {
59      const name = normalizeSlashes(rawName);
60      if (!name.startsWith(prefix) || name.includes('/node_modules/')) return;
61      const info = infos[i];
62      const version = typeof info === 'string' ? info : info?.version;
…
82  export function judgeDistFreshness({ manifest, current, distPresent }) {
83    if (!Array.isArray(manifest)) return { state: FRESHNESS.ABSENT, files: [] };
84    if (!distPresent) return { state: FRESHNESS.DIST_MISSING, files: [] };
85    const lookup = current instanceof Map ? (k) => current.get(k) : (k) => current?.[k];
87    for (const { name, version } of manifest) {
88      const hash = lookup(name);
89      if (hash === undefined) files.push({ name, reason: 'хеш исходника не подан — сравнивать нечем' });
90      else if (hash === null) files.push({ name, reason: 'исходник удалён, манифест его ещё знает' });
91      else if (hash !== version) files.push({ name, reason: 'содержимое исходника не совпадает с манифестом' });
```

Индекс `i` берётся один раз в `manifestSources` (:58–62): имя из `fileNames[i]`, версия из `fileInfos[i]`; дальше
`judgeDistFreshness` работает уже парами `{name, version}` и ищет хеш по имени (:87–88). `current` строит CLI
`scripts/verify-dist-fresh.mjs`: `:89` `manifestSources(JSON.parse(.tsbuildinfo), { rootDir })`, `:98`
`current.set(name, hashSourceText(readFileSync(abs)))` по каждому имени манифеста, `:101`
`judgeDistFreshness({ manifest, current, distPresent })`.

Перепрогон (команда → вывод):

| Команда | Вывод |
|---|---|
| `node --test scripts/lib/dist-freshness.test.mjs` | `ℹ tests 9` · `ℹ pass 9` · `ℹ fail 0` |
| `echo "// e51-probe" >> packages/plugin-contracts/src/index.ts` → `node scripts/verify-dist-fresh.mjs` | `✖ stale @membrana/plugin-contracts` · `пакетов 34: fresh 33 · stale 1 · dist_missing 0 · absent 0` · `КРАСНЫЙ: dist отстал от исходников` · **exit 1** |
| `git checkout -- packages/plugin-contracts/src/index.ts` → `node scripts/verify-dist-fresh.mjs` | `пакетов 34: fresh 34 · stale 0 · dist_missing 0 · absent 0` · **exit 0** |

Индексация проверена живым состоянием: одна правка одного файла → ровно один `stale` с именем этого файла, откат →
34 `fresh`. Был бы индекс смещён — красным стал бы другой файл или все 14 исходников пакета.

### P1-2 «Сценарий должен изолировать TURBO_CACHE_DIR»

Изолирует. `scripts/turbo-stale-dist-scenario.mjs`, дословно:

```js
147    const cacheDir = mkdtempSync(join(tmpdir(), 'turbo-stale-dist-'));
148    const env = { ...process.env, TURBO_CACHE_DIR: cacheDir, TURBO_TELEMETRY_DISABLED: '1' };
149    const turboBuild = () => run(yarnBin(), ['turbo', 'run', 'build', `--filter=${pkg}`, '--output-logs=errors-only'], { env });
…
186        rmSync(cacheDir, { recursive: true, force: true });
```

Все обращения к turbo идут только через `turboBuild()` (:158, :165, :174) — с `env`, где `TURBO_CACHE_DIR` указывает
во временный каталог. Остальные `run()` — `git` (:104 `ls-files`, :141 `status`, :180 `checkout --`) и `tsc -b --force`
(:170, :182) — кеш turbo не читают и не пишут. Каталог удаляется в `finally` (:186). Замер фазы 2: общий кеш главного
дерева до и после прогонов сценария на стволе и на ветке — 22 089 записей (рост до ~22 300 позже дали только честные
записи шагов пред-пуша после правки 34 `package.json`).

## Перерезка b1 (02.10) — слово владельца «tsc -p + снять ссылку»

**Повод.** CI PR #2555 (прогон 36999810878, голова `370751ae`) упал в `usercase-catalog-service#build`:
`../../device-board/src/graph/collapse-to-function.ts(259,35): error TS7006: Parameter 'item' implicitly has an 'any' type`.
Разбор показал не латентную ошибку типов, а **гонку записи dist**:

| Факт | Свидетельство |
|---|---|
| `--force` пересобирает соседей из `references` | `tsc -b --force --dry --verbose` в usercase-catalog: `Project '../../core/tsconfig.json' is being forcibly rebuilt`, то же `../../device-board`; у 24 из 34 пакетов есть `references`, все транзитивно упираются в core → в полном прогоне `core/dist` переписывается 25 раз параллельно с читателями |
| В CI две сборки писали один dist одновременно | лог: `11:16:09.30 ##[group]@membrana/device-board:build · cache miss`, `11:16:11.70 usercase-catalog-service:build … TS7006`; тип `inputPins: readonly ScenarioFunctionPin[]` (:25) из `@membrana/core` (:2) читался из `core/dist/index.d.ts` в момент перезаписи |
| Ссылка usercase-catalog → device-board мёртвая | `grep '@membrana/' src` → только `@membrana/core` (3 импорта); в `dependencies` device-board нет → turbo сборки не упорядочивает; добавлена 24.06 (`2294051e`) |
| Латентных ошибок нет | `tsc -b --force` по одному во всех 34 пакетах (лимит 120 с на пакет) — **34/34 зелёные**; в usercase-catalog одиночный `tsc -b --force` — exit 0 |
| Гонка локально не воспроизводится | 3× `turbo run build --force --concurrency=10` на 8 задачах (40/41/52 с) и 1× полный (44 задачи, 198 с) в изолированном кеше — 0 ошибок; окно гонки на раннере CI шире |

**Новый предмет b1.** В 34 сборках `tsc -b --force` → `tsc -p tsconfig.json` (хвосты `&& vite build` и
`yarn prepare &&` сохранены: 15 · 18 · 1). Не-build режим сверяет содержимое, а не mtime (E8; E5.1-состояние →
экспорт в dist **1**), пишет манифест `.tsbuildinfo` (предмет зуба b2), **соседей не трогает** — ни гонки, ни чужих
пересборок; при отсутствующем dist настоящей зависимости падает громко (`core/dist` убран → `TS2307 Cannot find
module '@membrana/core'`, exit 2), мёртвую ссылку без dist игнорирует (exit 0). В зону b1 добавлен
`packages/services/usercase-catalog/tsconfig.json` — снята `{ "path": "../../device-board" }`. Предикат конфиг-зуба
`buildScriptTrustsTsbuildinfo` не менялся: `tsc -p tsconfig.json` он уже считал честным (тест утверждает это явно).
Ратификация переподписана инструментом словом владельца (`--ratify --at 2026-10-02T17:02:24+03:00`, digest
`70558221…`), акт `recut_act` в ленте, `sprint:cut` → `contract`.

**Порча и проверки после перерезки (дерево Membrana-installstate):**

| Проверка | Вывод |
|---|---|
| конфиг-зуб `build-scripts-tsbuildinfo-trust.test.mjs` | ветка (`tsc -p`): `ℹ tests 7 · pass 7 · fail 0`; на стволе (`tsc -b`) — красный, 34 находки (замер 02.10 утром, предикат тот же) |
| сценарий E5 на стволовом состоянии (plugin-contracts `"build": "tsc -b"`) | `экспорт после промаха: НЕТ … после replay: НЕТ → ОТРАВЛЕНО`, exit 1 |
| сценарий E5 на ветке (`tsc -p tsconfig.json`) | `после промаха: есть … после replay: есть → ЧИСТО`, exit 0; остатков в `src` нет |
| `yarn verify:dist-fresh` после полной сборки | `пакетов 34: fresh 34 · stale 0 · dist_missing 0 · absent 0` |
| dist и `.d.ts` каждого из 34 на месте | у 31 пакета файл `types` существует; у `background-cabinet`/`-media`/`-office` поля `types` нет по устройству (приложения NestJS), их `main` существует; потерь emit от ухода с `-b` нет |
| `tsc -p tsconfig.json` в usercase-catalog без ссылки на device-board | exit 0 |
| полная `yarn turbo run build --force --concurrency=4`, изолированный кеш, 44 задачи | ствол `tsc -b`: **2 м 14,8 с** · ветка `tsc -b --force`: **3 м 14,0 с** (+59 с) · ветка `tsc -p`: **2 м 12,6 с** — быстрее исходного ствола, ошибок 0 |

**Сверка с прогнозом перерезки:** ожидали «быстрее нынешних +59 с» — получили −61 с к `--force` и −2 с к стволу.
Опровержение (`tsc -p` теряет emit references) не наступило: dist/`.d.ts` всех 34 на месте, зуб свежести 34 fresh.

## Не one shot

Два предмета (сборочный контур 34 пакетов + новый прибор-зуб), две персоны с непересекающимися зонами,
сценарий-порча, который трогает кеш и исходники и обязан изолироваться и откатываться, шесть развилок на
ратификацию владельца, точка перерезки после b1.
