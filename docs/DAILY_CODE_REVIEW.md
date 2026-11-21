<!-- Сгенерировано: 2026-11-21T20:30:45.048Z (yarn code-review; daily, llm-xai) -->

> Контур ревью (rt-8):
> Режим: работа дня
> Precision: exact
> Период: 3bffbd37994245fdae69354ae58d4a3c57035c9b^..9022db5a5a09b84e010182918f75a8eefb73ee76 (18 коммит(ов))
> ⚠ Oversized (>400 строк, дифф не развёрнут — ревьюить отдельно): 3bffbd37 #2706 (427), 041d423a #2713 (831), d7b938c0 #2717 (459), e6e6483c #2730 (3911), 9022db5a (599)

---

Tier: T1

**[vesnin]:** Ведущий. День = смена магистрали `archive-gc-journal-2588` → `node-permanent-duty` (ручная чеканка) + живой зуб `#2049`/`node:duty-ready` + карта шторма. По бестиарию: B6 на первом `ritual-day` (fail → r2 pass после mint) закрыт честно; B9 на карте дежурства не ловлю — явно «есть = ствол, не live»; B3 риск есть, если DoD шторма сведём к «PR открыт» без «september пишет». **P1:** oversized без развёртки — `#2706` (427), `#2713` (831), `#2717` (459), **`e6e6483c`/#2730 (~3911)**, `9022db5a` (599) — не «зелёные по умолчанию». Живые факты: `#2632` CLOSED, `#2704` MERGED, `#2588`/`#2587` OPEN, `#2049` CLOSED (влито как `#2709`). Вердикт дня: **условно LGTM на ритуал+duty-ready+карту**; **BLOCK-внимание** на неразвёрнутый `#2730` и хвост oversized до merge-доверия.

[Teamlead]: Сводка: утро починило ложный фокус 07.10 → owner-choice `node-permanent-duty`; `#2049` усилил «без человека» = тот же user, что автовход; карта дежурства честно дырявит Студию/TTL 7d/молчание/оповещения. Риски на завтра: не подменить шторм кодом в обход нарезки; не включить cold-archive live (`#2588` OPEN) из инерции; развернуть `#2730`. Утро: прочитать этот review и `MAIN_DAY_ISSUE` (node-permanent-duty); `yarn turbo run test --filter=@membrana/scripts` либо точечно `node --test scripts/node-duty-ready.test.mjs`; `yarn node:duty-ready` на узле (read-only); diff-pass `git show e6e6483c --stat` и критические hunks `#2730`/`#2713`/`#2717`.

[Архитектор]: Граница ADR-0027 b5 (dshow → интерактивная сессия) в duty-ready соблюдена: не SYSTEM-служба, а logon+same user. Карта дежурства правильно отделяет поллер / Студию / cabinet session TTL — это вход шторма, не скрытый ADR. Не плодить «режим сессий прибора» в коде до развилки шторма. Следить, чтобы `#2730` не втащил немой носитель (B8) или дрейф media/office без двери.

[Структурщик]: `judgeTask(text, autologonUser)` + `bareUser` — слабая связанность ок, чистые судьи экспортированы, observe/main тонкие. Фикстура RU с «Состояние **назначенной** задачи» и `firebat-t6\indic` чинит ложно-зелёный на живой Windows — хорошо. Тесты: other user / unread user / disabled / renderTable — критичные ветки рядом. C8: `console.log` только в CLI main — допустимо для field-скрипта. Циклов пакетов нет (scripts ↔ docs).

[Математик]: — (нет FFT/спектра). Логика порогов сна через `acIndexOf`/powercfg без изменений по смыслу; новый user-match — строковое равенство после normalize, не численный край. Замечание: ровно 2ч `pulseOf` cold-archive в диффе дня не закрыт — санитарный долг вчера, не блокер новой магистрали.

[Музыкант]: Захват/dshow не трогали кодом аудио-графа; инвариант «только интерактивная сессия» в доке и судье усилен — ок. Автозапуск Студии и удержание буфера (`stop` only) — дыры карты, не регрессии Web Audio. Не чинить overflow-hold в обход слова владельца.

[Верстальщик]: UI пакетов в развёрнутом диффе нет; a11y cold-archive g6 — вне фокуса. Полевые строки duty-ready — таблица в терминале, не JSX; DESIGN.md не задет.

Итоговый артефакт: `docs/DAILY_CODE_REVIEW.md` (вечер 2026-11-21)  
Definition of Done (утро):  
1. `node --test scripts/node-duty-ready.test.mjs` (или turbo test scripts) — зелёный  
2. Прочитать `MAIN_DAY_ISSUE` = `node-permanent-duty`; не возвращать archive-gc как primary  
3. Diff-pass минимум `e6e6483c`/#2730 + stat `#2713`/`#2717`/`#2706` — запись pass/fail  
4. На узле: `yarn node:duty-ready` (ожидание: таблица 3 проверок; exit 0 или 26 + лекарства)  
5. Шторм/нарезка — по DoD MAIN_DAY, без live `COLD_ARCHIVE_SWEEP_DRY_RUN=false`  

Риски:  
- **P1** — `#2730` ~3911 строк и прочие oversized без развёртки (молчаливый merge-доверие)  
- **P1** — B3: «PR #2049 есть» ≠ прибор сутки пишет (нет Студии at-login, TTL 7d, нет alert «замолчал»)  
- **P2** — `#2588` OPEN / D1 multi-replica; a11y g6; долг `pulseOf` @ ровно 2ч  
- **P2** — assertions/gate freshness уже починены ручной чеканкой; не откатить generator-only магистраль 07.10