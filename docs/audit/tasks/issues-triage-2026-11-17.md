# Триаж открытых Issue — 2026-11-17

> Шаг 0.7 стратегии [`RETURN_STRATEGY_2026-11.md`](../../strategy/RETURN_STRATEGY_2026-11.md) (хвост Х6).
> Снимок: `gh issue list --state open --limit 300` на 17.11 — **230** открытых Issue; ствол `cd352fa5`…`ba1cd0d1`.
> Метод: пять read-only аудиторов по ~46 Issue — тело и последние комментарии, влитые PR (`gh pr list --state merged --search`),
> `git log origin/main --grep`, наличие заявленного в коде. Выборочная перепроверка оркестратором: состояние MERGED у 12 опорных PR
> из (а) подтверждено `gh pr view`.
> **Ничего не закрыто.** Это список-предложение ведущей; закрытие — её/владельца слово. Сомнительное отнесено в (в) с пометкой.

## Итог

| Вердикт | Число |
|---|---|
| (а) исполнено — есть влитой PR/коммит | **69** |
| (б) устарело / дубль | **12** |
| (в) живое | **149** — фаза 0: 8, фаза 1: 5, фаза 2А: 8, фаза 2Б: 7, бэклог: 121 |

Фаза 1 включает три Issue спринта уборщика и понижения тарифа (#2587, #2588, #2632) — по поручению не разбирались, живые.

## (а) Исполнено — предлагаю закрыть со ссылкой на свидетельство

| № | Заголовок | Вердикт | Свидетельство |
|---|---|---|---|
| [#187](https://github.com/officefish/Membrana/issues/187) | headroom proxy-perf замер на живом сеансе (C6 #186) | а · исполнено | PR #220 (5830327c): docs/insights/insight-headroom-server-deploy/proxy-perf-report-real.json, total_requests=105, savings задокументирован (4.9%) в INSIGHT.md; issue-тюнинг при <20% не проверен |
| [#396](https://github.com/officefish/Membrana/issues/396) | Drift-Anchor контур DA0–DA4: детерминированный якорь | а · исполнено | PR #414 (87d4237e, DA4/DA5 code-anchor + CI-гейт + divergence), #418 (88d515e1, office drift-anchor ADR 0004), #419 data-anchor; закрытие эпика решено владельцем 13.07 (см. тело #420), остаток вынесен в #420 |
| [#407](https://github.com/officefish/Membrana/issues/407) | tooling: pr:ship / pre-push устойчивость к сломанному yarn-state | а · исполнено | pr:ship = node scripts/pr-ship.mjs (без yarn-обёртки); pre-push YARN_READY: при отсутствии node_modules yarn-проверки честно пропускаются (4e6e659c, #1280/#1272 Ф4). Случай «node_modules есть, .yarn-state.yml нет» отдельно не проверен |
| [#408](https://github.com/officefish/Membrana/issues/408) | tooling: исполняемый one-shot деплой office | а · исполнено | scripts/_ssh-office-prod-up.mjs (chmod +x office-stack.sh, office.env → .env.docker, build+up, probe здоровья #2583) + обёртка yarn vds:run deploy-office-vds (4c40f23f, #1717) |
| [#409](https://github.com/officefish/Membrana/issues/409) | tooling: llm-reachability диагностика + гео-блок RU-хостов | а · исполнено | yarn llm:probe — матрица доступности провайдеров напрямую и через прокси (d8fe05db, #436 / спринт #433), классификатор исходов #1805 (0a426ccc) |
| [#533](https://github.com/officefish/Membrana/issues/533) | Препроцессор-гейт посылок MAIN_DAY_ISSUE (код первичен) | а · исполнено | PR #532 (fdc05d05): scripts/main-day-probe.mjs, впаян в ritual:day и morning-ritual-steps.json; работоспособность подтверждена в #576 |
| [#558](https://github.com/officefish/Membrana/issues/558) | rt-6 гейт полноты повестки: ложное срабатывание | а · исполнено | PR #603 (e97a9aee, NB3 «rt-6 честен про метку vs вердикт (#558)») + #624 (517ce1c0, rt-6 судит вердикт через hasVerdictSection) |
| [#569](https://github.com/officefish/Membrana/issues/569) | Ласточки: линза Ожегова + «ок» владельца + память после отправки | а · исполнено | PR #637 (d03b4724): автоотправка снята, память персон после показа (#569 треб.3); yarn telegram:swallow руками + авто-extract после sent=true; норма в CLAUDE.md, практикуется (#2080, #2146) |
| [#582](https://github.com/officefish/Membrana/issues/582) | Норма: пайп съедает exit-код | а · исполнено | AGENTS.md:165 — грабли «cmd | tail; echo $?» с PIPESTATUS[0] (#567/#582), внесено a4088d04 (#649) |
| [#584](https://github.com/officefish/Membrana/issues/584) | scripts/ не покрыт линтом | а · исполнено | PR #1848 (54e394c8): yarn lint:scripts — ESLint по scripts/**/*.mjs с парсером ESM и храповиком в CI (#1264) |
| [#586](https://github.com/officefish/Membrana/issues/586) | Дайджест: у вложения нет гейта свежести | а · исполнено | PR #672 (fd184aad): в attachDocument() добавлен «ГЕЙТ СВЕЖЕСТИ ВЛОЖЕНИЯ» (explainStaleness, maxAgeDays 0, --allow-stale); сам дайджест ещё и снят с автоотправки |
| [#592](https://github.com/officefish/Membrana/issues/592) | Эпик: генератор стратегии дня — от списка задач к горизонту | а · исполнено | S1–S4, S6, S7 — be1c40a2 + #625; S5 — коммит 2e479f2f (заморозка мёртвого крона, #592 S5); карточка strategy-day-generator архивирована 17.11 (PR #596). Веха горизонта — отдельно Х7/шаг 0.8 |
| [#615](https://github.com/officefish/Membrana/issues/615) | Эпик: Док 2 — вечерний аудитор + генератор отчёта | а · исполнено | PR #630 (9cecd0af, yarn audit:evening, фаза 3) после #614/#623; шаг audit-evening в evening-ritual-steps.json, docs/DAILY_AUDIT.md пишется (последний — 08.10) |
| [#698](https://github.com/officefish/Membrana/issues/698) | Формат ШТОРМА: предикаты, кодекс Ангелины, механизм вдоха | а · исполнено | PR #704 (4f5be064, Р1–Р3: storm-predicates, storm-codex, storm-breath); Р4-подводка — STORM_REGULATION.md и скилл membrana-storm (#711); боевые штормы прошли (#771, #1660) |
| [#705](https://github.com/officefish/Membrana/issues/705) | Тулинг 20.07: worktree:bootstrap, --kind meeting, gitleaks | а · исполнено | п.1 yarn worktree:bootstrap (c626f956, #682); п.2 kind meeting (66270c9b, #1596); п.3 gitleaks локально мягкий, зуб в CI — решено намеренно (pre-commit, #1002) |
| [#741](https://github.com/officefish/Membrana/issues/741) | Эпик: Ангелина — хозяйка утра (абсорбция барьерного раннера) | а · исполнено | заседание ратифицировано #751 (273b6659); реализация #769 (ac9e9b0e, M4-H + M5-GC) и #2091 (angelina-hostess-impl); утро — morning:gate с двумя гейтами, kits/angelina-morning |
| [#761](https://github.com/officefish/Membrana/issues/761) | Кит: неймспейс скриптов с версией по подграфу (SHA-пины) | а · исполнено | паттерн PINNED_SUBGRAPH_VERSIONING (#770, 8d7ef4f1); kits/ с 7 китами (dream-master #863–#869, containerization-master #911, tasks-master, tests-master…), yarn kits:audit / kits:pins |
| [#781](https://github.com/officefish/Membrana/issues/781) | Эпик: процедурный слой Р1–Р5 | а · исполнено | все фазы-дети #782–#786 CLOSED (Р3 = PR #808 ae2582d6); эпик-контейнер просто не закрыт |
| [#788](https://github.com/officefish/Membrana/issues/788) | Спринт достройки утра: доклад по задачам (Ф1–Ф3) | а · исполнено | PR #809 (823d4c4d) — Ф1/Ф2/Ф3; боевая приёмка Ф1 — PR #917; остатки M3-S/M4-R поглощены позднейшей ручной ласточкой |
| [#936](https://github.com/officefish/Membrana/issues/936) | Спринт «мостик»: открытие/закрытие комнаты, попугай | а · исполнено | PR #941 (72f72997); шаг bridge-close в evening-ritual-steps.json |
| [#956](https://github.com/officefish/Membrana/issues/956) | test:scripts — вынести список из package.json | а · исполнено | PR #1285 (#1263, 7386df0a): test:scripts → scripts/test-scripts-run.mjs, набор из дерева; далее #1315 |
| [#981](https://github.com/officefish/Membrana/issues/981) | Оживление фреймов — Верстальщик: рендер цепочки | а · исполнено | PR #1045 (e53a0db1): мастерская рендерит цепочку кадров, «— кадров нет —» |
| [#1007](https://github.com/officefish/Membrana/issues/1007) | Epic: LLM procedure channels + usage panel | а · исполнено | фазы #1008–#1011 CLOSED; PR #1021 (8ba495bb), проводка ритуала #1117, вечер через резолвер #1243 |
| [#1013](https://github.com/officefish/Membrana/issues/1013) | Грабля: bare fetch не читает HTTPS_PROXY | а · исполнено | AGENTS.md:321 «Голый fetch не читает HTTPS_PROXY — undici+ProxyAgent» (PR #1452), плюс yarn net:http/net:diag |
| [#1015](https://github.com/officefish/Membrana/issues/1015) | Грабля: пересборка ветки без reset --hard | а · исполнено | PR #1177: yarn pr:recreate + грабля AGENTS.md:172 (cherry-pick на ветку от origin/main); git:fresh-branch |
| [#1143](https://github.com/officefish/Membrana/issues/1143) | strategic-docs: fn-гранулы end-to-end | а · исполнено | PR #1193 (9aa243b0): нормализация kind fn|function в strategic-docs-generate.mjs, fn-гранула (render.mjs) в боевом релизе readme-main |
| [#1146](https://github.com/officefish/Membrana/issues/1146) | cowork Phase 5 не закрывает ACTIVE-маркер | а · исполнено | PR #1506 (8031c542): yarn cowork:close против застрявшего флага ACTIVE |
| [#1211](https://github.com/officefish/Membrana/issues/1211) | Артефакты вечера не доезжают до main | а · исполнено | PR #1551 (721540c6): шаги ritual-artifacts + deliver-to-main в evening-ritual-steps.json; вечерние артефакты в стволе до 08.10 (#2648) |
| [#1303](https://github.com/officefish/Membrana/issues/1303) | Мастерская индексации вещдоков | а · исполнено | PR #1325 (2df7d0c8) ядро+CLI, PR #1405 (b8c2ee47) опись/индекс/приём; yarn evidence |
| [#1347](https://github.com/officefish/Membrana/issues/1347) | Ремонт LLM-каналов: процедуры через панельную цепочку | а · исполнено | PR #1348 (6cf66ff1): yarn ask → procedureId ask, зуб llm-calls:audit; дефолт team-evening-feedback в llm-procedure-defaults.json |
| [#1363](https://github.com/officefish/Membrana/issues/1363) | Рефакторинг генератора стратегии по кейсу live-strategy-synthesis | а · исполнено | #1371 (ec6daa25) драйвер yarn day:plan из живых источников + пять слотов; доработка #1551. Источников 4, а не 7 — пересмотреть при закрытии |
| [#1366](https://github.com/officefish/Membrana/issues/1366) | Память команды: отчёт + две памяти (оперативная/подсознание) | а · исполнено | #1391 (4b8d3cc3) append-only архив персон; #1635 retrieval подсознания; #1636 акт emerge/reject; отчёт #1367 |
| [#1368](https://github.com/officefish/Membrana/issues/1368) | Механика всплытия: MMR + мультизапрос + serendipity + суммаризация | а · исполнено | #1635 (f7337aec) subconscious-retrieval (MMR/serendipity в коде), #1636 emerge-act; калибровка весов не сверялась |
| [#1398](https://github.com/officefish/Membrana/issues/1398) | telegram:file — отправка md-документов через office | а · исполнено | #1407 (be52d3ba): yarn telegram:file в package.json |
| [#1411](https://github.com/officefish/Membrana/issues/1411) | Зверь «Мёртвый провод»: зубы на связь | а · исполнено | #1585 (b1bb89db) предикат связи + зуб, #1645 (387e35e3) сторож мёртвых проводов; yarn dead-wire:check |
| [#1542](https://github.com/officefish/Membrana/issues/1542) | Курёхин в ask по слову владельца | а · исполнено | #1551 (721540c6): voices.registry callable [ask, consilium], ask-persona читает реестр через lib/personas.mjs |
| [#1545](https://github.com/officefish/Membrana/issues/1545) | Гейт честного спринта не зовёт адаптер | а · исполнено | #1551 (721540c6) гейт 8/8 на живых данных; петля опыта по живым файлам — #1592, #1658, #1849 (sprint:experience --plan --traces) |
| [#1567](https://github.com/officefish/Membrana/issues/1567) | Включить mfcc-analyzer-test в реестр плагинов | а · исполнено | #1562 (ff5b73d5): registerClientModules регистрирует createMfccAnalyzerTestPlugin, зависимость в apps/client/package.json |
| [#1626](https://github.com/officefish/Membrana/issues/1626) | Журнал прогонов процедур без производителей и читателей | а · исполнено | производитель #1680 (49457c26, procedure-run:record, fail/orphaned), вечерний раннер пишет журнал (ADR-0022), читатель #1863 (d56094d1), суд монотонности sequence |
| [#1703](https://github.com/officefish/Membrana/issues/1703) | Золотой зуб окна слеп к stride-перестановкам | а · исполнено | #1748 (c1faf505) квадратичный кейс в sample-window.test.ts |
| [#1744](https://github.com/officefish/Membrana/issues/1744) | Десятка хендофа без проверяемого маркера | а · исполнено | #1922 (d52f821d) yarn task:handoff — сверка каждой строки по реестру/Issue; практика маркеров #1785 |
| [#1792](https://github.com/officefish/Membrana/issues/1792) | Правило ревизии корпуса: находка vs названный долг | а · исполнено | #2201 (07913a0d): isAdr0025Debt + MODERATOR_IN_HOLDER_MARK рядом с производителем причины, зуб в procedure-personas.test |
| [#1961](https://github.com/officefish/Membrana/issues/1961) | Эпик: плагинная основа сервера (server-plugin-foundation) | а · исполнено | PR-1 #1965 (ee40ba3b), PR-2/PR-4 #1969 (864581c7), PR-3 #1975 живой след, мост #1981; галочки в теле не проставлены |
| [#1998](https://github.com/officefish/Membrana/issues/1998) | Узел как устройство: Firebat сам держит канал (firebat-node-device) | а · исполнено | b4 #2006, b5 #2007, b7 приёмка #2010, первая запись по заданию с сервера #2012 |
| [#2039](https://github.com/officefish/Membrana/issues/2039) | Разбор сеанса: двадцать опорных звуков (плагин session-digest) | а · исполнено | плагин и меры влиты #2040/#2041/#2051/#2056 (21.08), панель в обоих близнецах #2169/#2170 (25.08) |
| [#2049](https://github.com/officefish/Membrana/issues/2049) | Узел к дежурству: сон/гибернация, автовход, предикат готовности | а · исполнено | предикат node:duty-ready #2165 (d936a9c0); живой суд готовности в #2311; настройка узла — руки владельца, дежурства шли с 04.09 (машинно не сверено) |
| [#2083](https://github.com/officefish/Membrana/issues/2083) | Нет двери ручной чеканки магистрали в morning-gate | а · исполнено | #2085 (23.08) fix(morning-gate): дверь ручной чеканки магистрали |
| [#2109](https://github.com/officefish/Membrana/issues/2109) | Чистка наборов от дублей: показывать пары и ждать слова | а · исполнено | ядро #2164, витрина #2167, панель «Дубли набора» в обоих близнецах #2168 (25.08) |
| [#2110](https://github.com/officefish/Membrana/issues/2110) | Библиотека: отбор по промежутку плагином, инверсия, асинхронная подпись | а · исполнено | #2124 (b1), #2126 (b2), #2129, #2130, кабинет-близнец #2155; приёмка на проде 26.08 (#2177) |
| [#2113](https://github.com/officefish/Membrana/issues/2113) | Журнал: перечитывание всей ленты на каждую пробу | а · исполнено | #2127 fix(journal): linearize live journal reads, merge 5efa5137 (24.08); хвост вынесен в #2131 |
| [#2147](https://github.com/officefish/Membrana/issues/2147) | Неделя без повторов: пять зубов под классы 24.08 | а · исполнено | все пять зубов: #2152, #2156, #2158/#2160/#2198/#2215, #2154, #2159/#2163 (25–27.08) |
| [#2177](https://github.com/officefish/Membrana/issues/2177) | Симметрия библиотеки с журналом: плагины справа, сворачивание | а · исполнено | #2184 (26.08), доводка #2190; приёмка владельца на проде (#2188/#2203) |
| [#2180](https://github.com/officefish/Membrana/issues/2180) | Долг ревью 25.08: пять кодовых PR — таблица находок | а · исполнено | таблица собрана, P0/P1 кода — ноль; карточки из находок заведены #2183 (26.08) |
| [#2185](https://github.com/officefish/Membrana/issues/2185) | prismaSampleReader читает пробы без устройства | а · исполнено | #2192 fix: scope media sample reads (29a18a99): listSamples/readAudio фильтруют по deviceId |
| [#2186](https://github.com/officefish/Membrana/issues/2186) | media без журнального контракта плагинов | а · исполнено | #2192 (29a18a99): GET/PATCH :collectionId/plugins с состоянием в реестре дома |
| [#2188](https://github.com/officefish/Membrana/issues/2188) | Библиотека: левый сайдбар вне свёртки; действия у строк выборки | а · исполнено | #2190 (26.08); приёмка владельца на проде 26.08 (#2203) |
| [#2199](https://github.com/officefish/Membrana/issues/2199) | Страж живого сеанса vs .env старого образца | а · исполнено | #2217 (632815cc) — страж называет источник и запасную дверь в тексте отказа |
| [#2200](https://github.com/officefish/Membrana/issues/2200) | Ревизия шести открытых PR старше недели | а · исполнено | исполнено 26.08: три закрыты, вердикты в комментарии; новый набор старых PR — в Х3 стратегии |
| [#2218](https://github.com/officefish/Membrana/issues/2218) | Удаление через модалку: что уходит и гипотеза ценности | а · исполнено | #2232 (29.08) окно подтверждения со списком и гипотезой ценности |
| [#2237](https://github.com/officefish/Membrana/issues/2237) | Экспорт разметки Studio выдаёт разметку экрана за набор | а · исполнено | #2244 (31.08) файл разметки объявляет полноту, приём отказывает на неполном |
| [#2250](https://github.com/officefish/Membrana/issues/2250) | Множественное удаление в панели чарт-листа | а · исполнено | #2255 (01.09) удаление пачкой с отбором строк и защитой |
| [#2297](https://github.com/officefish/Membrana/issues/2297) | Прод: в базе один тариф из трёх | а · исполнено | прод починен 06.09 (комментарий); проекция матрицы 21.09 (#2366), живой переход free→checkpoint 01.10 (#2538/#2541) |
| [#2302](https://github.com/officefish/Membrana/issues/2302) | Вывезти пролёт дрона 05.09 из буфера в набор | а · исполнено | #2312 (09.09) вывоз в набор drone-flyby-2026-09-05-2152; кандидат второй очереди — по слову владельца |
| [#2329](https://github.com/officefish/Membrana/issues/2329) | Канон тарифов: буфер одинаков на всех тарифах | а · исполнено | матрица тарифов #2334/#2337: буфер 512 МиБ/2 ГиБ/4 ГиБ; прод приведён 21.09; понижение — ADR-0031 |
| [#2362](https://github.com/officefish/Membrana/issues/2362) | Ночная охота design-drift не видит файлы компонентов | а · исполнено | #2441 (08233de9) заземлил дела graph и design-token-drift: измерение по исходникам и tailwind.config |
| [#2369](https://github.com/officefish/Membrana/issues/2369) | Регистрация в кабинете по промокоду из панели (эпик) | а · исполнено | Влиты #2393, #2396, #2397, #2401, #2409 (ADR-0029), #2428, #2429/#2430; живая приёмка на проде 24.09 (september|free-v1|536870912, офис redeem ok); остаток вынесен в #2432–#2438 |
| [#2440](https://github.com/officefish/Membrana/issues/2440) | Ночная охота: два дела из трёх не могут найти дрейф | а · исполнено | PR #2441 (08233de9, заземлены два дела) + #2454 (553bde43, третье дело отказывает без предмета), оба 25.09 |
| [#2525](https://github.com/officefish/Membrana/issues/2525) | Кеш turbo восстанавливает устаревший dist вместе с .tsbuildinfo | а · исполнено | PR #2555 (b17f5871): tsc -b --force в сборках пакетов + сторож verify:dist-fresh; смена способа сборки и Dockerfile'ы выделены в #2557 |
| [#2580](https://github.com/officefish/Membrana/issues/2580) | Office: база архивариуса 10 дней без пользователя | а · исполнено | Все три блока спринта влиты 04.10: #2582 (генератор + громкий отказ вместо change-me), #2583 (проба выкатки), #2585 (эскалация красной серии вечера); починка прода руками 04.10. Issue не закрыт |

## (б) Устарело или дубль — предлагаю закрыть с причиной

| № | Заголовок | Вердикт | Причина |
|---|---|---|---|
| [#605](https://github.com/officefish/Membrana/issues/605) | Эпик: регламент утреннего ритуала + фоновый агент-барьер | б · устарело/дубль | перекрыто #741: барьерный раннер абсорбирован «хозяйкой утра» — #769 (ac9e9b0e, M4-H), #2091; yarn morning-ritual:run убран из package.json, утро — yarn morning:gate (два гейта) |
| [#685](https://github.com/officefish/Membrana/issues/685) | Утро 20.07: post-ritual hygiene | б · устарело/дубль | разовый снимок состояния 20.07 (ветка, draft #684, CURRENT_TASK): за четыре месяца устарел, live-смысла не несёт |
| [#747](https://github.com/officefish/Membrana/issues/747) | smoke(dreams): боевой чеклист 4 провайдеров через OpenRouter | б · устарело/дубль | перекрыто: живость моделей снов проверяется ночью по настоящему реестру (#1835, 80b1129d, спринт dreams-models-liveness); маршруты из чеклиста сменились (grok-4-fast снят) |
| [#918](https://github.com/officefish/Membrana/issues/918) | Фрейм ласточки: полное зеркало 5 блоков | б · устарело/дубль | направление пересмотрено: формат зафиксирован PR #1427 (блок — одна строка, эмодзи после метки; инвариант в swallow-mirror.mjs), ласточка пишется руками через линзу (CLAUDE.md) |
| [#958](https://github.com/officefish/Membrana/issues/958) | yarn pr:landed — squash-aware проверка | б · устарело/дубль | перекрыто: pr:verify (state=MERGED ∧ mergeCommit, #1166) и alreadyInBase в pr:ship --merge-only (#1320) |
| [#984](https://github.com/officefish/Membrana/issues/984) | frames-sprint: Linear под-задачи руками не создавать | б · устарело/дубль | норма поглощена ADR-0017 (доска Linear — зеркало GitHub) и LINEAR_TASKS_GEAR (биекция); спринт frames-alive в прошлом |
| [#988](https://github.com/officefish/Membrana/issues/988) | LLM-тулы: мягкая обработка лимита Anthropic | б · устарело/дубль | перекрыто: процедуры идут панельной цепочкой с фолбэками (#1021, #1348), isCreditExhausted+CREDIT_FALLBACKS в _anthropic-env.mjs (#1883) |
| [#1208](https://github.com/officefish/Membrana/issues/1208) | Мостик: тетрадь наблюдений 25.07 | б · устарело/дубль | тетрадь без DoD; пункты разнесены по прецедентам/долгам, контур записи вечера закрыт шагом deliver-to-main (PR #1551) |
| [#2284](https://github.com/officefish/Membrana/issues/2284) | Узел к живому дежурству 04.09 | б · устарело/дубль | разовое событие 04.09 прошло; приборы (наблюдатель буфера, суд ключа) влиты #2311 |
| [#2368](https://github.com/officefish/Membrana/issues/2368) | Пусковик ночной охоты: расписание GitHub не срабатывает с 19.09 | б · устарело/дубль | Симптом снят сам: gh run list night-hunt-office-trigger.yml — schedule success ежедневно 05.11–16.11; код пусковика не менялся с #2357 |
| [#2492](https://github.com/officefish/Membrana/issues/2492) | Две несовместимые подписи moveSamplesBatch в #2488 и #2489 | б · устарело/дубль | Развилку решил порядок мерджа: оба PR влиты 27.09, в стволе подпись #2488 (storage-backend.ts:100, sampleIds/toCollectionId/options); вопрос как развилка устарел |
| [#2498](https://github.com/officefish/Membrana/issues/2498) | Словарь причин остатка объявлен дважды (сервер/клиент) без сверки | б · устарело/дубль | Дубль #2493: тот же словарь MoveBatchStayReason, те же два адреса; ведётся там |

## (в) Живое

### Фаза 0 (8)

| № | Заголовок | Вердикт | Что осталось |
|---|---|---|---|
| [#618](https://github.com/officefish/Membrana/issues/618) | registry-reaper: носитель и каденция ревизии реестра | в · 0 | носитель фактически есть (yarn tasks:audit + скилл membrana-tasks-audit), каденция не решена; решение естественно ложится на шаг 0.7 |
| [#2022](https://github.com/officefish/Membrana/issues/2022) | Гейт secret-parser-built: критерий 3 — акт владельца | в · 0 | критерии 1–2 — #2032; веха всё ещё стоит в day-horizon.json (Х7); закрыть актом владельца или снять при смене вехи (шаг 0.8) |
| [#2148](https://github.com/officefish/Membrana/issues/2148) | Сторож диска: калибровка, перевыпуск токена, уборка media-VPS | в · 0 | руки владельца; диск media 80% на 17.11 — уборка Docker и перевыпуск токена бота не подтверждены |
| [#2219](https://github.com/officefish/Membrana/issues/2219) | repo:clean не сносит дерево с пустым «работа не доехала:» | в · 0 | classify-worktree.mjs:120 не менялся; вероятно тот же корень, что дефект 3 #2350 — объединить; мешает сносу деревьев (Х5) |
| [#2350](https://github.com/officefish/Membrana/issues/2350) | repo:clean: влитое дерево выглядит неотправленным + 3 дефекта | в · 0 | дефект 3 и дефект 7 (полуснос) не починены (classify-worktree.mjs не менялся с 21.09); блокирует уборку деревьев Х5 |
| [#2490](https://github.com/officefish/Membrana/issues/2490) | Доски спринтов объявляют несуществующий фокус (DAY/LOCAL_SPRINT_ACTIVE) | в · 0 | DAY_SPRINT_ACTIVE.md не правился с 25.07 (#1188), Focus всё ещё tasks-workshop-2026-07; LOCAL обновлён 08.10 (#2640). Нужна ревизия очереди |
| [#2509](https://github.com/officefish/Membrana/issues/2509) | core.hooksPath абсолютным путём в главное дерево | в · 0 | Дрейф локального .git/config на машине владельца (prepare ставит относительный путь); чинится одной командой при уборке деревьев. В репо исправлять нечего, живой конфиг не проверен |
| [#2623](https://github.com/officefish/Membrana/issues/2623) | media: @fastify/busboy 3.2.0 → 3.2.1 (два DoS) | в · 0 | В yarn.lock по-прежнему 3.2.0 (строка 986); шаг 0.1 стратегии, нужна рука владельца |

### Фаза 1 (5)

| № | Заголовок | Вердикт | Что осталось |
|---|---|---|---|
| [#2066](https://github.com/officefish/Membrana/issues/2066) | Жизненный цикл соглашения: понижение тарифа, заморозка, выгрузка | в · 1 | в основном перекрыт ADR-0031 + #2587/#2588; остаток — уборщик архива #2632 (g1a–g7); пункт «массовая выгрузка» сверить с ADR-0031 и закрыть как дубль |
| [#2587](https://github.com/officefish/Membrana/issues/2587) | Понижение тарифа с заморозкой: блок 1 | в · 1 | магистраль понижения — по поручению не трогать |
| [#2588](https://github.com/officefish/Membrana/issues/2588) | Понижение тарифа: блок 2 (уборка архива по сроку) | в · 1 | магистраль понижения — по поручению не трогать |
| [#2611](https://github.com/officefish/Membrana/issues/2611) | Кабинет: цепочка миграций не разворачивается на пустую БД | в · 1 | К1–К3 не исправлены (20260612120000_tariff_quota_rename на месте, миграции NodeDeviceCapture нет); найдено сухим прогоном #2610 к выкатке холодного архива |
| [#2632](https://github.com/officefish/Membrana/issues/2632) | Уборщик холодного архива с журналом заданий | в · 1 | фаза 1 стратегии, блоки g1a–g7; не трогать |

### Фаза 2А (8)

| № | Заголовок | Вердикт | Что осталось |
|---|---|---|---|
| [#563](https://github.com/officefish/Membrana/issues/563) | MP7 WS prod-smoke: msg timeout на journal.append | в · 2А | не проверено: фикса нет; scripts/_ssh-cabinet-mp7-prod.mjs local-only (gitignored, в репо нет), повторного прогона не найдено — нужен живой прогон cabinet:mp7:prod |
| [#2328](https://github.com/officefish/Membrana/issues/2328) | Студия: главный поток затыкается при вкладке «Трейс» | в · 2А | корень не назван; PR #2339 (разбор g1) открыт и входит в ревизию старых PR фазы 0 |
| [#2532](https://github.com/officefish/Membrana/issues/2532) | Шесть предупреждений высокого уровня по electron (Студия ^39.8.9) | в · 2А | Разбора задетости нет; electron по-прежнему ^39.8.9; триаж c155c189 (ветка codex, не в стволе) electron не разбирает. До выпуска Studio dist |
| [#2540](https://github.com/officefish/Membrana/issues/2540) | Studio: окно «Сервер недоступен» показывает константу вместо причины | в · 2А | частично: #2550 (b1, причина доходит до окна); живая приёмка b2 владельцем в dev-Studio не зафиксирована, closure-PR нет |
| [#2563](https://github.com/officefish/Membrana/issues/2563) | Studio: бейдж назначенного каталога в библиотеке | в · 2А | Поле dataset переехало в #2569/#2572; systemDatasetBadgeText и бейдж в SampleLibraryModule не сделаны |
| [#2565](https://github.com/officefish/Membrana/issues/2565) | Шапка доски уже ~1000 px: левая группа исчезает | в · 2А | BOARD_HEADER_CONTENT_OFFSET_CLASS pl-[clamp(14rem,18vw,20rem)] без изменений; нужен замер на приборе |
| [#2571](https://github.com/officefish/Membrana/issues/2571) | Studio при старте читает буфер целиком: 209 запросов на 8360 проб | в · 2А | refresh() по-прежнему тянет все пробы; #2572/#2574 убрали лишнее чтение при открытии и ложное состояние, но не полный обход на старте |
| [#2573](https://github.com/officefish/Membrana/issues/2573) | Панель микрофона на старте показывает запасное локальное хранилище | в · 2А | storageMode стартует с browser-limited-fallback, loadState в хаб мост не публикует |

### Фаза 2Б (7)

| № | Заголовок | Вердикт | Что осталось |
|---|---|---|---|
| [#565](https://github.com/officefish/Membrana/issues/565) | Паспорт детектора (ROC/AUC/CI/EER) в «Контроле качества» | в · 2Б | пакета @membrana/detection-metrics-service нет; есть только benchmark-измеритель (#2529) — AUC/CI/EER/рабочие точки не построены |
| [#1413](https://github.com/officefish/Membrana/issues/1413) | Паспорт тракта (rig) в метаданных треков | в · 2Б | rigId/паспорта тракта в коде нет; нужен до накопления пилотного корпуса |
| [#1414](https://github.com/officefish/Membrana/issues/1414) | Полевой стенд: режим, программа испытаний, телеметрия | в · 2Б | частично: пульс дежурства и детектор тишины #2137; программы испытаний и сессионной нарезки нет |
| [#1704](https://github.com/officefish/Membrana/issues/1704) | spectral-flux: регрессионный зуб Δ спектра и контракт без padding | в · 2Б | зубов «известная Δ → flux» и «нет padding/re-windowing» не найдено |
| [#1941](https://github.com/officefish/Membrana/issues/1941) | Слепота корпуса держится прозой, а не гардом | в · 2Б | vdr:blind (#1940) провенанс из манифеста не выносит, --reveal нет; важно для пилотной разметки |
| [#2037](https://github.com/officefish/Membrana/issues/2037) | Разрядность записи: 16 → 24 бита до накопления корпуса? | в · 2Б | решение не принято; надо до пилота 30–35 записей |
| [#2361](https://github.com/officefish/Membrana/issues/2361) | curated-drone-templates.json живёт в двух местах | в · 2Б | оба файла в стволе и уже различаются (cmp: строка 4) — выбрать источник истины до benchmark:detectors |

### Бэклог (121)

| № | Заголовок | Вердикт | Что осталось |
|---|---|---|---|
| [#7](https://github.com/officefish/Membrana/issues/7) | Unit-тесты store/registry в @membrana/agenda | в · бэклог | в packages/agenda только scenario-async-job-hub.test.ts; тестов store/registry нет (аудит 30.06 RESIDUAL, на main без изменений) |
| [#8](https://github.com/officefish/Membrana/issues/8) | Smoke-тесты регистрации модулей/плагинов в apps/client | в · бэклог | теста на registerClientModules.ts нет; все пункты приёмки открыты |
| [#10](https://github.com/officefish/Membrana/issues/10) | Unit-тесты чистой математики fft-analyzer-service | в · бэклог | частично: тесты есть для metrics-flux/low-band/loudness/sound-quality/threshold; на fft.ts и statistics.ts и edge cases тестов нет |
| [#27](https://github.com/officefish/Membrana/issues/27) | client: Storybook и a11y для FFT/Oscilloscope; graceful degradation | в · бэклог | в репо нет ни одного *.stories.* / storybook; a11y и поведение без Web Audio не задокументированы |
| [#33](https://github.com/officefish/Membrana/issues/33) | ui: a11y telemetry-journal, сверка с DESIGN, Storybook | в · бэклог | частично: есть aria-expanded/aria-label у пейджера; aria-live, role=region, htmlFor у полей не сделаны |
| [#34](https://github.com/officefish/Membrana/issues/34) | docs: edge cases FFT и допущения окна | в · бэклог | README fft-analyzer описывает окно v0.1, но NaN/Infinity/пустой буфер/не-степень-2/DC/Nyquist не описаны; зависит от #10 |
| [#236](https://github.com/officefish/Membrana/issues/236) | ST7: tray/global-shortcut аварийный стоп при свёрнутой Studio | в · бэклог | в apps нет Tray/globalShortcut; сделано только смягчение SC1 (ba4b1f16, backgroundThrottling=false + фокус окна) |
| [#410](https://github.com/officefish/Membrana/issues/410) | tooling: sprint:register scaffold + test:affected | в · бэклог | частично: scaffold покрыт yarn task:start (gh issue create + реестр); test:affected в package.json нет (есть только build:affected) |
| [#411](https://github.com/officefish/Membrana/issues/411) | tooling: git-divergence warn-hook для параллельных сессий | в · бэклог | частично: скрипт yarn git:check-divergence влит (5bd6c9c4, #412); WARN-проводка в .githooks не сделана (явно отложена #412) |
| [#420](https://github.com/officefish/Membrana/issues/420) | Полевой data-anchor по реальным записям (privacy-развилка) | в · бэклог | сознательно отложено владельцем: нужен консилиум и LGTM по privacy-модели до кода; кода нет |
| [#476](https://github.com/officefish/Membrana/issues/476) | tooling-needs 12–14.07: merge-driver, pr:land, office:ssh, mojibake… | в · бэклог | частично: п.1–2 (#512 merge-driver реестра, pr:ship в worktree), п.3 office:ssh (#488), п.6 гард main в pre-push (#1232), п.7 комментарий в .gitignore; не найдены п.4 (mojibake в pre-commit) и п.5 (tier в --review-file) |
| [#537](https://github.com/officefish/Membrana/issues/537) | Экстракты сессий агентов как свидетельство для ритуала | в · бэклог | экстрактор сессий как вход main-day-probe не найден; есть смежное (скилл case-mining, указатели sessionId+uuid в графе правды), но не этот контур |
| [#539](https://github.com/officefish/Membrana/issues/539) | Эпик ritual-trust-contour: достоверность планирования и закрытия | в · бэклог | частично: #532, #672 (манифест вечера S+F), #624 и др. влиты; дочерние #621/#581/#583 ещё открыты — эпик не закрываем |
| [#548](https://github.com/officefish/Membrana/issues/548) | tooling-needs 16.07: T1–T8 | в · бэклог | частично: T1/T2/T4 в #553 (9f40d1f9); остались T3 (инкрементальный docker office) и T5 (graphify per-family) |
| [#576](https://github.com/officefish/Membrana/issues/576) | ЭПИК: граф правды — архитектура, реестр процессов, охлаждение | в · бэклог | частично: ядро #577 (ce68e386), yarn truth verify/cool/review, truth cool в вечерней цепочке; явного реестра зависимых процессов и закрытия по 4 требованиям не найдено |
| [#581](https://github.com/officefish/Membrana/issues/581) | code-review судит по MAIN_DAY_ISSUE без пробника посылок | в · бэклог | в scripts/code-review.mjs нет вызова main-day-probe/probeAssertions |
| [#583](https://github.com/officefish/Membrana/issues/583) | pr:ship: PR на ветке со squash-смёрженной базой раздувается | в · бэклог | проверки «база смёржена сквошем» в pr-ship.mjs нет; branch-base-freshness (#640/#644) ловит только отставание от origin/main |
| [#588](https://github.com/officefish/Membrana/issues/588) | Грабли: /tmp в git-bash ≠ /tmp для node; python-heredoc молчит | в · бэклог | частично: норма про python/heredoc есть (AGENTS.md:155); нормы про /tmp → скретчпад в AGENTS.md не найдено |
| [#617](https://github.com/officefish/Membrana/issues/617) | Док 3 (DAILY_MEMOIZATION) — навигатор по памяти, не начат | в · бэклог | вероятно перекрыто DAY_MEMO (#1380, 9090f74a: yarn day:memo, шаг вечера) — сверить с замыслом (раздельные RAG-индекс и анализ сессий) и закрыть с причиной |
| [#621](https://github.com/officefish/Membrana/issues/621) | Судьба STRATEGIC_PLAN_DAY.md — легаси-вход генераторов | в · бэклог | генераторы утра файл уже не читают, он помечен «вещдок»; но его читают team-evening-feedback-ritual.mjs и архиватор — судьба (удалить/void) ждёт слова владельца |
| [#641](https://github.com/officefish/Membrana/issues/641) | Норма: хендофф на поток, HANDOFF.md только указатели | в · бэклог | в AGENTS.md/.cursorrules нормы нет; docs/HANDOFF.md по-прежнему перезаписывается целиком (последний — 25.08) |
| [#745](https://github.com/officefish/Membrana/issues/745) | Шторм: замечания по первому прогону — фон, вдохи, дивергенция | в · бэклог | сомнительно: практика штормов поправилась (пустой старт в OPEN 21.08, потолок 7 вдохов), но правки процедуры/скилла после #745 не найдены (скилл не менялся с #711) |
| [#768](https://github.com/officefish/Membrana/issues/768) | GC: telegram-ritual-digest осиротел — кандидат в docs/void | в · бэклог | скрипт и yarn telegram:digest:* на месте, в docs/void/registry.json его нет — перенос с эпитафией не сделан |
| [#800](https://github.com/officefish/Membrana/issues/800) | layer-direction: зуб на data-рёбра readFileSync + наблюдатели | в · бэклог | не сделано: layer-rules.json blindSpots по-прежнему ссылается на #800 |
| [#915](https://github.com/officefish/Membrana/issues/915) | Мастерская тасков: человекочитаемый ревью-список этапов | в · бэклог | инструмента пересказа этапов по карточке реестра в main нет |
| [#933](https://github.com/officefish/Membrana/issues/933) | АВАРИЯ: таймауты office, server-first | в · бэклог | сомнительно: июльская авария, office отвечает 200; DoD (0 таймаутов/сутки, алерт владельцу) свидетельством не подтверждён — сверить и закрыть или переформулировать |
| [#957](https://github.com/officefish/Membrana/issues/957) | pr:ship: гейт свежести базы + пропуск sync-checkout | в · бэклог | частично: пропуск sync при базе в чужом дереве есть (isBaseHeldElsewhere, guard base-free); гейт branch:check-base в pr:ship не вшит |
| [#959](https://github.com/officefish/Membrana/issues/959) | Эпик: контейнер имущества (три яруса) | в · бэклог | карточка assets-container active, перерезка 23.08; живой приёмки И5 нет |
| [#963](https://github.com/officefish/Membrana/issues/963) | insight decide: первый мандат для greenfield-инсайта | в · бэклог | UNKNOWN_SUBJECT по-прежнему бросается в insight-lifecycle-ops.mjs; команды материализации нет |
| [#979](https://github.com/officefish/Membrana/issues/979) | Оживление фреймов — Ожегов: контракт+код+начинка | в · бэклог | частично: morning-wiring #955, фреймы #1045; подписей над contentHash в ritual-day/MANIFEST.json нет |
| [#980](https://github.com/officefish/Membrana/issues/980) | Оживление фреймов — Дынин: резолв-предикаты | в · бэклог | частично: auditPins PR #953; audit-on-start/block-on-drift в коде не найден |
| [#989](https://github.com/officefish/Membrana/issues/989) | Сетевые ретраи gh в pr:ship и issue create | в · бэклог | ретраев транзиентных ошибок gh в pr-ship.mjs нет |
| [#990](https://github.com/officefish/Membrana/issues/990) | Грабля: git show ref:path манглит путь | в · бэклог | строки-грабли в AGENTS.md нет, обёртки нет (XS) |
| [#1012](https://github.com/officefish/Membrana/issues/1012) | yarn linear:issue — proxy-aware CLI Linear | в · бэклог | не сделано (есть только linear:movement-audit); ценность сомнительна — Linear вторичен (зеркало) |
| [#1048](https://github.com/officefish/Membrana/issues/1048) | Зуб релевантности вердикта заседания | в · бэклог | scoreRelevance/аналога в scripts нет |
| [#1049](https://github.com/officefish/Membrana/issues/1049) | yarn meeting:run — прогон фаз заседания | в · бэклог | есть только meeting:status/meeting:audit; meeting:run нет |
| [#1050](https://github.com/officefish/Membrana/issues/1050) | yarn env:diff — сверка отпечатков ключей | в · бэклог | скрипта env:diff нет |
| [#1104](https://github.com/officefish/Membrana/issues/1104) | tasks:decompose --by health | в · бэклог | разблокировано (#1061 CLOSED), но оси health в tasks-decompose.config.json нет |
| [#1105](https://github.com/officefish/Membrana/issues/1105) | Бестиарий: «лиса в курятнике» (self-validation) | в · бэклог | в docs/bestiary/BESTIARY.md (B1–B10) и docs/audit/bestiary зверя нет |
| [#1142](https://github.com/officefish/Membrana/issues/1142) | strategic-docs: canon-data.valid TypeError без skeleton | в · бэклог | баг жив: strategic-docs-model.mjs:134 template.skeleton.includes без гварда (XS) |
| [#1144](https://github.com/officefish/Membrana/issues/1144) | strategic-docs: реальные README/AGENTS/CLAUDE через контейнер | в · бэклог | частично: PR #1193 — README гранулирован; AGENTS/CLAUDE по-прежнему stubs |
| [#1145](https://github.com/officefish/Membrana/issues/1145) | strategic-docs: открытые вопросы INTERFACE_CONTRACT | в · бэклог | решения по (а)–(г) не найдены; вопрос-реестр, кандидат на закрытие решением |
| [#1212](https://github.com/officefish/Membrana/issues/1212) | Ревизия скиллов против процедур | в · бэклог | предиката сверки скилл↔процедура нет (есть только skill-status/verify-skill-mirrors) |
| [#1227](https://github.com/officefish/Membrana/issues/1227) | Лицензия контракта: парсер как выдающий орган | в · бэклог | частично: procedures:license (эпик #1220) — только процедурный слой; прецеденты/каталоги/киты не лицензируются |
| [#1229](https://github.com/officefish/Membrana/issues/1229) | Эпик: архивация сессий и прецедентов в базу офиса | в · бэклог | частично: архиватор сессий #1335/#1357, archivarius:push и шаг archivarius-evening; прецеденты в базе офиса — не сделано |
| [#1230](https://github.com/officefish/Membrana/issues/1230) | Аудит дня как концентрат, включая сессии | в · бэклог | частично: концентрат PR #1242 (#1238 CLOSED), но сессий в audit-concentrate.mjs нет |
| [#1305](https://github.com/officefish/Membrana/issues/1305) | Переезд Affine на static.mmbrn.tech | в · бэклог | частично: живая опись INV-1 PASS (#1934/#1935); deploy/affine (.env.example, compose.yml) всё ещё на strategy.mmbrn.tech |
| [#1306](https://github.com/officefish/Membrana/issues/1306) | Ремонт цепочки code-review: overlay усекает звенья | в · бэклог | частично: печать цепочки/обход overlay #1311; resolveEffective по-прежнему overlay[id] ?? default (замещение, не дополнение) |
| [#1312](https://github.com/officefish/Membrana/issues/1312) | Формат «Оркестрация хендофф» — спека | в · бэклог | есть инсайт insight-handoff-orchestration и HANDOFF-файлы; регламента/скилла формата нет |
| [#1350](https://github.com/officefish/Membrana/issues/1350) | Эпик: стройка мостика (bridge-command-post) | в · бэклог | очереди 1–2 (#1351, #1352) CLOSED; очередь 3 (#1353) не завершена |
| [#1353](https://github.com/officefish/Membrana/issues/1353) | Мостик · очередь 3: кейсы на печать + пульт | в · бэклог | частично: кейсы — #1355, #1376; пульт M5 (assertCarrier, CarrierState) в коде отсутствует |
| [#1393](https://github.com/officefish/Membrana/issues/1393) | Инфра-полиси + infra:probe + маршрут Voyage | в · бэклог | частично: #1400 полиси и infra:probe, #1426; ч.3 маршрут Voyage/эмбеддинги не решён (в полиси «консилиум при C3») |
| [#1412](https://github.com/officefish/Membrana/issues/1412) | Паттерн «портфолио» удачных примеров | в · бэклог | частично: #1600 поле portfolio в MANIFEST процедур; портфолио персоны и фрейм знакомства не сделаны |
| [#1416](https://github.com/officefish/Membrana/issues/1416) | Процедура «холодный старт»: штампы, hermes→origin, базовые киты | в · бэклог | частично: Ф0–Ф1 #1420 (795bd4f1); Ф2 полиси базовых китов (двухтактная загрузка) не начата |
| [#1467](https://github.com/officefish/Membrana/issues/1467) | Депо: провод к каждому инструменту мастерской | в · бэклог | частично: #1552/#1559/#1563/#1569/#1574 (норма порядка, пол сессии, атлас); поштучный осмотр инструментов не завершён |
| [#1468](https://github.com/officefish/Membrana/issues/1468) | Честный рефакторинг спринта: исполнители через сервер, аудитор | в · бэклог | частично: ратификация + коворк #1501; исполнители через серверные вызовы и модерация не доведены (сомнительно) |
| [#1533](https://github.com/officefish/Membrana/issues/1533) | Вечерняя процедура: кадры не исполняются, карта ролей, два документа | в · бэклог | частично: в манифесте вечера есть evening-door и deliver-to-main; раннер по-прежнему исполняет evening-ritual-steps.json, а не кадры; Ф1–Ф9 поштучно не сверены |
| [#1539](https://github.com/officefish/Membrana/issues/1539) | Утренняя процедура: генератор не знает выбор владельца и др. | в · бэклог | частично: _main-day-issue читает morning-gates-state (У1); У2–У4 не сверены |
| [#1540](https://github.com/officefish/Membrana/issues/1540) | pr:ship оставляет дерево на main; ревью до PR не засчитано | в · бэклог | частично: Ш1 закрыт (умолчание с 08.08, #1759 в pr-ship.mjs); Ш2 — review-gate видит только маркер на PR, ревью --branch не засчитывается |
| [#1550](https://github.com/officefish/Membrana/issues/1550) | Ревью большого диффа — вердикт не по содержанию | в · бэклог | частично: требование 1 — #1557 (ca5d1730); требования 2–4 (отделить код от документов и др.) остаются |
| [#1565](https://github.com/officefish/Membrana/issues/1565) | Спринт на плагин: обязательный последний блок «включение» | в · бэклог | норма применяется в практике (block-lift-persona-act), но в регламент/sprint:cut машинно не записана |
| [#1572](https://github.com/officefish/Membrana/issues/1572) | Свести два детектора к одной механике серии (threshold-test на N) | в · бэклог | threshold-test.ts по-прежнему с тремя поимёнными метриками centroid/flux/rms |
| [#1573](https://github.com/officefish/Membrana/issues/1573) | Норма: блок обзора «что уже есть» перед нарезкой | в · бэклог | на норму ссылаются утренние документы, но в регламенте/sprint:cut она машинно не записана |
| [#1599](https://github.com/officefish/Membrana/issues/1599) | Procedure delivery: guard матрицы и политика разреза поставки | в · бэклог | машинного guard на development-matrix и записанной политики разреза не найдено |
| [#1608](https://github.com/officefish/Membrana/issues/1608) | Ворота качества документа вечера covered(doc) | в · бэклог | uncoveredCards/coverageVerdict в коде нет; шага kind:gate для покрытия нет |
| [#1609](https://github.com/officefish/Membrana/issues/1609) | Вход вечернего ревью: тройка вместо consumes: [] | в · бэклог | шаг code-review в evening-ritual-steps.json всё ещё consumes: [] |
| [#1712](https://github.com/officefish/Membrana/issues/1712) | fft-analyzer: deprecation-политика + baseline экспортов в CI | в · бэклог | есть только @deprecated-пометки без срока выпила; baseline-снапшота экспортов в CI нет |
| [#1736](https://github.com/officefish/Membrana/issues/1736) | Каскад Ангелины ложно протухает после squash | в · бэклог | freshness() в angelina-cascade.mjs по-прежнему сравнивает version раньше digest |
| [#1755](https://github.com/officefish/Membrana/issues/1755) | review:oversized: голова очереди — номер Issue, а не PR | в · бэклог | prOf всё ещё берёт последнюю (#N); класса «номер не резолвится» в отчёте нет |
| [#1786](https://github.com/officefish/Membrana/issues/1786) | deps:watch не дедупит advisories по GHSA | в · бэклог | в scripts/deps-watch.mjs дедупа нет (последняя правка #1642) |
| [#1787](https://github.com/officefish/Membrana/issues/1787) | Переназначение 20 фреймов: держатель и модератор (Р3 ADR-0025) | в · бэклог | замер 17.11: 20 фреймов с angelina в holder, поле moderator — 0; код ADR-0025 (#2201) готов, переназначения нет |
| [#1790](https://github.com/officefish/Membrana/issues/1790) | sprint:cut не умеет ратифицировать перерезку | в · бэклог | sprint-cut-check.mjs всё ещё отказывает при стоящей ratification; второго пути нет (перерезка 2632 шла скриптом в scratchpad) |
| [#1838](https://github.com/officefish/Membrana/issues/1838) | Адаптер наката описи читает архив целиком (~2 ГиБ) | в · бэклог | archive-inventory.mjs restore: readFileSync(archivePath) на месте |
| [#1862](https://github.com/officefish/Membrana/issues/1862) | scripts:registry: ложные missing (glob, .py) | в · бэклог | SCRIPT_CODE_EXTS = .mjs/.js/.cjs, .py и glob не различаются |
| [#1918](https://github.com/officefish/Membrana/issues/1918) | CODE_RE промокода расходится с документацией в позиции 0 | в · бэклог | tariff.controller.ts:82 CODE_RE прежний |
| [#1982](https://github.com/officefish/Membrana/issues/1982) | plugin-contracts: карман payload vs passthrough | в · бэклог | DTO по-прежнему .passthrough() со ссылкой на #1982; решение Архитектора не принято |
| [#2005](https://github.com/officefish/Membrana/issues/2005) | NodeKeyService: убрать null as never в зубах | в · бэклог | node-key.service.test.ts:42 по-прежнему null as never |
| [#2072](https://github.com/officefish/Membrana/issues/2072) | Свидетельство из неявного контекста: одолженный vitest; pr:ship --pr N | в · бэклог | частично: --pr N сделан в #2152 (зуб 2 #2147); прямой запуск чужого бинаря vitest по-прежнему даёт ложный зелёный |
| [#2092](https://github.com/officefish/Membrana/issues/2092) | Модуль преобразования звука (кадрирование·выравнивание·зачистка) | в · бэклог | статус «в планах», не начинать без разговора; кода нет (возможно ближе к 2Б — подготовка эталонных записей) |
| [#2097](https://github.com/officefish/Membrana/issues/2097) | sprint:experience умеет только фикстурные стабы | в · бэклог | живые спринты сентября пишут опыт (--plan/--segments), но лекарство в execution-gate.mjs:207 всё ещё «yarn sprint:experience» без пути — сверить и, вероятно, закрыть правкой текста |
| [#2104](https://github.com/officefish/Membrana/issues/2104) | Пользовательские интеграции: ИИ на ключах пользователя | в · бэклог | обсуждение; кода и модуля нет |
| [#2117](https://github.com/officefish/Membrana/issues/2117) | Эпик: магистраль наблюдаемости (logging-observability-cut) | в · бэклог | куски A–D влиты (#2138, #2139/#2140, #2118); остался кусок E — Sentry #2122 |
| [#2122](https://github.com/officefish/Membrana/issues/2122) | Кусок E: контейнер Сентри на офисе | в · бэклог | частично: план + спящий чекан INC #2143; контейнера нет, ждёт CPU/RAM офиса |
| [#2131](https://github.com/officefish/Membrana/issues/2131) | Журнал: явный full reconcile для server-delete после incremental sync | в · бэклог | следов в стволе нет; нужен именованный низкочастотный reconcile |
| [#2203](https://github.com/officefish/Membrana/issues/2203) | Приёмка владельца не оставляет машинного следа | в · бэклог | возможно частично: #2556 (доказательства результата в вечернее ревью), #2530; машинной записи приёмки владельца не найдено |
| [#2238](https://github.com/officefish/Membrana/issues/2238) | Завести рабочее дерево стоит ~40 минут | в · бэклог | тёплого пула/оценки в регламенте нет; связано с запретом junction (агент не ставит yarn install) |
| [#2277](https://github.com/officefish/Membrana/issues/2277) | Срок и ротация ключа: носитель масштаба мембраны поверх узлов | в · бэклог | срок и ротация ключа узловые; ротация на одном узле не гасит ссылки других — безопасностный долг |
| [#2319](https://github.com/officefish/Membrana/issues/2319) | Полный буфер: эпизод переполнения живёт в памяти media | в · бэклог | #2534 прямо оставил #2319 вне объёма; в schema.prisma носителя эпизода нет |
| [#2320](https://github.com/officefish/Membrana/issues/2320) | Полный буфер: поллер firebat держит задание в аренде при отказе | в · бэклог | следов исправления в стволе нет |
| [#2321](https://github.com/officefish/Membrana/issues/2321) | Полный буфер: библиотека кабинета хрупка к новым колонкам | в · бэклог | следов исправления/зуба в стволе нет |
| [#2322](https://github.com/officefish/Membrana/issues/2322) | Полный буфер: лишний запрос квоты при публикации удержания | в · бэклог | следов исправления нет; сверить с #2541 (лёгкий запрос предела) |
| [#2323](https://github.com/officefish/Membrana/issues/2323) | Полный буфер: прибор не узнаёт о смене тарифа | в · бэклог | частично: #2541 — прибор читает новый предел после смены (приёмка 01.10, #2538); факт перехода tariffChangedAt не доставляется — возможно закрыть |
| [#2325](https://github.com/officefish/Membrana/issues/2325) | Клиент: два тест-файла «No test suite found» | в · бэклог | файлы на node:test, а vitest включает src/**/*.test.ts и passWithNoTests — расхождение живо |
| [#2345](https://github.com/officefish/Membrana/issues/2345) | Ревью утверждает «красные тесты» без замера | в · бэклог | возможно частично: #2530 (зуб утверждений), #2556; прямого закрытия петли не найдено — нужен замер |
| [#2366](https://github.com/officefish/Membrana/issues/2366) | Сид кабинета в образе мёртв (seed.mjs → scripts/lib) | в · бэклог | обход руками на проде 21.09; seed.mjs всё ещё импортирует ../../../scripts/lib, Dockerfile scripts/ не копирует |
| [#2374](https://github.com/officefish/Membrana/issues/2374) | LLM-транспорт: длинный не-потоковый ответ рвётся через ~158 с, нужен streaming | в · бэклог | Потокового режима в транспорте нет; ни PR, ни коммита |
| [#2375](https://github.com/officefish/Membrana/issues/2375) | Панель: вход через GitHub отвечает 200 с Location вместо 302 | в · бэклог | panel-auth.controller.ts:111 без изменений (void res.redirect(url)); живьём не перепроверено |
| [#2402](https://github.com/officefish/Membrana/issues/2402) | Кабинет: AuthContext.register дублирует цепочку login | в · бэклог | В origin/main дубль на месте (AuthContext.tsx:50-59); в главном дереве незакоммиченная правка этого файла на ветке Codex, она не в стволе |
| [#2403](https://github.com/officefish/Membrana/issues/2403) | Ревью PR: четыре прогона на #2401 дали четыре разных P1 | в · бэклог | частично: #2409 (ADR-0029 как контракт для ревью); схождение ревью к контракту не решено, класс продолжен в #2584 |
| [#2436](https://github.com/officefish/Membrana/issues/2436) | Порядок сборки под turbo: кабинет собирается раньше dist соседа | в · бэклог | Корень исходного симптома не назван (комментарий 25.09); зуб соседнего дефекта — в открытом PR #2451 (решение по старым PR фазы 0) |
| [#2446](https://github.com/officefish/Membrana/issues/2446) | Утренние гейты теряются молча: откат при смене ветки, freeze сбрасывает оба | в · бэклог | scripts/morning-gate.mjs:74 всё ещё обнуляет magistral и swallow; состояние по-прежнему файлом в репо |
| [#2459](https://github.com/officefish/Membrana/issues/2459) | Счёт прогонов в ленте: локально уникальный или глобально монотонный | в · бэклог | частично: #2481 объявил инвариант; сам PR пишет «не закрывается — развилка контракта за владельцем» |
| [#2472](https://github.com/officefish/Membrana/issues/2472) | Очередь заданий узла без производителя: безголовый тракт спит | в · бэклог | POST node/tasks/queue по-прежнему не зовётся нигде, кроме verify-swagger и тестов |
| [#2478](https://github.com/officefish/Membrana/issues/2478) | Дерево потеряло 2542 файла (оптимизатор Windows?) — защита работы | в · бэклог | Защиты несохранённой работы нет; причина — гипотеза, не подтверждена |
| [#2483](https://github.com/officefish/Membrana/issues/2483) | node:link-state: ложный binding-split на второй мембранной ноде | в · бэклог | node-link-state.mjs:341 по-прежнему читает одну привязку на все ноды |
| [#2484](https://github.com/officefish/Membrana/issues/2484) | startOverflowHoldVitals нигде не подключён: «жизнь после остановки» выключена | в · бэклог | Функция по-прежнему только в index.ts и своих тестах; #2534/#2541 переделали окно «Буфер полон» — сверить, не перекрыли ли они смысл |
| [#2485](https://github.com/officefish/Membrana/issues/2485) | ADR-0030: вещдок прогона scenario trace (фризы при разборке) | в · бэклог | частично: #2508 (fix sync flush, Relates); docs/adr/ADR-0030 в статусе DRAFT — ждёт LGTM владельца |
| [#2486](https://github.com/officefish/Membrana/issues/2486) | Ворота удаления читают прибор один раз за жизнь приложения | в · бэклог | OverflowWindowHost.tsx:86 — useMemo(..., []) на месте |
| [#2487](https://github.com/officefish/Membrana/issues/2487) | Трейлер pr:ship вшивает имя модели константой | в · бэклог | pr-ship.mjs:58 и pr-ship.test.mjs:53 всё ещё держат «Claude Opus 4.8» |
| [#2493](https://github.com/officefish/Membrana/issues/2493) | Набор причин move-batch чеканится дважды через границу пакетов | в · бэклог | Дубль на месте: move-batch-plan.ts:53 и media-library/types.ts:204, в plugin-contracts не вынесено |
| [#2494](https://github.com/officefish/Membrana/issues/2494) | Одиночный перенос пробы не считает место в userStorage | в · бэклог | SamplesService.move() (samples.service.ts:324) квоту и axisRefuses по-прежнему не зовёт |
| [#2497](https://github.com/officefish/Membrana/issues/2497) | Окно переноса (745 строк) продублировано в два дома | в · бэклог | Оба MoveAllToCollectionDialog.tsx (кабинет и клиент) на месте, в device-board не вынесено |
| [#2515](https://github.com/officefish/Membrana/issues/2515) | sprint:experience: predictedAt < observedAt сравнивается строками | в · бэклог | forecast-record.mjs:158 — по-прежнему сравнение строк |
| [#2542](https://github.com/officefish/Membrana/issues/2542) | Списки персон: один источник и именованные фильтры | в · бэклог | частично: #2544 — только документ фазы 1 (таблица объявлений); переход на единый источник не сделан |
| [#2545](https://github.com/officefish/Membrana/issues/2545) | Хвост #2543: машинный предикат ревью блоков; зеркала скиллов | в · бэклог | Ни предиката, ни сверки зеркал; PR нет |
| [#2554](https://github.com/officefish/Membrana/issues/2554) | apps/client tsconfig.app.json не ссылается на media-library-service | в · бэклог | В tsconfig.app.json media-library по-прежнему не упомянута |
| [#2557](https://github.com/officefish/Membrana/issues/2557) | Сборка пакетов без доверия к .tsbuildinfo: tsc -p, Dockerfile'ы через turbo | в · бэклог | Вынесено из #2555 словом владельца; не начато |
| [#2584](https://github.com/officefish/Membrana/issues/2584) | Ревью тимлида: новые блокеры на каждом прогоне — круг без конца | в · бэклог | Ни починки, ни PR; дополнения 05–06.10 (#2593, круговая блокировка #2603/#2606) |
| [#2597](https://github.com/officefish/Membrana/issues/2597) | network:bare-fetch принимает комментарии за вызовы | в · бэклог | check-bare-fetch.mjs не менялся с #1921; комментарии не отфильтровываются |
| [#2601](https://github.com/officefish/Membrana/issues/2601) | sprint:cut: последовательные блоки на одном файле и блок >400 с причиной | в · бэклог | В cut-plan.mjs нет ни причины размера, ни учёта закрытых блоков; lib/sprint-cut не менялся с #1857 |
| [#2615](https://github.com/officefish/Membrana/issues/2615) | Вечерний фидбек не проверяет утверждения об отсутствии | в · бэклог | В feedback-claims нет проверки утверждений об отсутствии через ls-tree |

## Что не проверено

- Живьём на проде и на узлах ничего не проверялось (вход в панель через GitHub #2375, узел Firebat #2049, диск media #2148, MP7 smoke #563, авария office #933) — вердикты по коду, истории и состоянию PR/Issue.
- Тесты и сборки не запускались.
- Комментарии Issue читались выборочно (тело и последние 2–3), не полные ленты.
- Многосоставные Issue (#1533, #1539, #1467, #1468, #592, #476) сверены не по каждому пункту; помечены «частично» в (в).
- Отдельные толкования аудиторов, требующие взгляда ведущей до закрытия: #2369 (живая приёмка — по памяти проекта), #705 (gitleaks мягкий локально — толкование), #1143 (fn-гранула без отдельного smoke), #2049 (настройку узла делает владелец).
- Кандидаты на закрытие из (в) после сверки ведущей: #617 (вероятно перекрыт DAY_MEMO #1380), #2066 (перекрыт ADR-0031 — не сверён пункт «выгрузка»), #2323 (частично #2541), #933, #1012, #1145 (малоценные — закрыть словом).
