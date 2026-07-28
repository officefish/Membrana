<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-28T08:37:54.602Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/memory-subconscious-m6-extractor-2026-07-28.md` |
| Порядок ролей | Музыкант → Teamlead → Верстальщик → Структурщик → Архитектор → Математик |
| Повестка | `docs/meeting/memory-subconscious/M6_AGENDA.md` |

**Вопрос:**

C6: рефакторинг extractor — границы правки, миграция с backfill-вопросом, зубы всех рамок, фазы стройки для оркестрации

---

```text
# Консилиум: C6 — рефакторинг extractor памяти персон

**Повестка:** C6 — границы правки extractor, миграция журналов (backfill из git vs нулевой день), зубы всех рамок C1–C5, фазы стройки для оркестрации без коллизий файлов. C1–C5 ратифицированы — не переоткрываем.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Музыкант → Teamlead → Верстальщик → Структурщик → Архитектор → Математик

---

[Музыкант]: На слух extractor сейчас — mono-take: перезаписал md, выкинул «лишнее», и тишина. Под C1 архив jsonl — master-tape, md — сведение. Нельзя снова сводить поверх мастера. Backfill из git — как dig по старым take: можно, но с честной меткой «restored», иначе provenance врёт.

[Teamlead]: Планка матча: не «улучшить скрипт», а исполнить C1–C5 зубами. Связка: Архитектор — границы модулей; Структурщик — API и homes; Математик — предикаты зубов и selectOperational; Музыкант — слух на recency/вытеснение; Верстальщик — честная пустота проекции для потребителей. Вердикт комнаты обязан дать фазы без общих файлов.

[Верстальщик]: С витрины потребителей (консилиум --with-memory, day-memo persona-trace, team-memory-report) md остаётся читаемым блоком. Если проекция ломает заголовок/секции — это фальшь. Честная пустота: «архив начат с даты D, pre-D не в оперативке» — видима в шапке md, не спрятана в conf.

[Структурщик]: Леммы. **Extractor** — оркестратор такта: collect → rank/select → append archive → project md → emit op-log. **Archive** — per-persona append-only jsonl (C1). **Projection** — md, производная. **importance.json** — вход selectOperational (C2), сейчас объявлен и не читается — это дыра исполнения, не новая норма. Публичный стык: `buildPersonaMemory(root, date) → { markdown, stats, problems }` по образцу оркестрации.

[Архитектор]: Конструкция: не раздувать monolit `persona-memory-extract.mjs` в бога. Режем на пакет/модули с явными границами: `collectCandidates`, `selectOperational`, `appendArchive`, `projectMarkdown`, `emitMemoryOps`. Скрипт вечерней цепочки — тонкий CLI. Потребители md не обязаны знать jsonl, пока проекция стабильна. Пробел C1–C5 не чиним здесь — фиксируем находкой.

[Математик]: Формализую selectOperational без UI:  
`selectOperational(candidates, importance, budget) → {retained, transferred, report}`.  
Инварианты: Σtokens(retained) ≤ budget; pinned ⊆ retained ∨ fail-closed error; transfer сопровождается importanceSnapshot. Предикат erase: отсутствует в алфавите операций. Зуб C1: длина jsonl монотонна на фикстуре append.

[Музыкант]: Backfill-вопрос на слух: dig по git за 27–28.07 даст take, которые отчёт памяти уже «слышит» как вытеснение. Нулевой день без dig — честный silence pre-D, но фикстура «routine вытеснила position мастерской» потеряет вещдок, если не восстановить хотя бы этот кейс. Предлагаю: нулевой снапшот + **точечный** restore по спискам дат/персон из отчёта, не full archaeology.

[Teamlead]: Согласен с точечным restore. Full git-walk — перегруз и риск фальшивого provenance. Решение к столу: (1) migration snapshot «day-zero»; (2) optional backfill-job с depth = окна, где отчёт памяти уже фиксировал loss; (3) каждая restored-запись — `provenance: git-history` + commit sha. Без этого — BLOCK на «как будто всегда было».

[Верстальщик]: В шапке md-проекции после миграции три честных бейджа-строки: `archive_from`, `restored_count`, `operational_budget`. Не UI-кит — текстовая конструкция для людей и RAG. team-memory-report должен видеть diff проекции как сейчас; если секции переименуем — в фазу потребителей отдельным блоком.

[Структурщик]: Homes фиксирую кандидатами (не новые нормы — раскладка исполнения):  
`docs/virtual-team/memory/<persona>.md` — проекция;  
`docs/virtual-team/memory/archive/<persona>.jsonl` — архив;  
`docs/virtual-team/memory/importance.json` — pin/weights вход;  
op-log — по C5 таблице эмиттеров (путь из C5, не изобретаем).  
Граница правки: scripts/persona-memory-extract.mjs + новые modules под `scripts/persona-memory/` или `packages/` — Архитектор скажет слой; чужие киты не трогаем.

[Архитектор]: Слой: оставить CLI в `scripts/`, чистые куски — `scripts/persona-memory/lib/*.mjs` (как у leveling), без нового npm-пакета в apps. Цена пакета сейчас выше пользы. Контракт CLI стабилен: те же yarn-входы вечерней цепочки. Потребители: фаза P-consumers только если проекция ломает парсеры — иначе zero-touch.

[Математик]: Зубы списком предикатов, не пожеланий:  
1) `∀ append: len(jsonl') = len(jsonl)+k, k≥0` (C1);  
2) `pinned_overflow ⇒ throw` (C2 fail-closed);  
3) фикстура 27.07: position мастерской ∈ retained при том же importance (C2 DoD.9);  
4) `forge_done` на evening_compress без квитанции → fail (C4);  
5) `forge_metrics` / `n/a` записанный как `0` → fail (C5);  
6) erase-op ∈ alphabet ⇒ fail.  
Пороги/веса v2 — вне скоупа: importance читаем as-is.

[Музыкант]: Фазы как такты сессии, без наложений на одну дорожку: сначала лента архива и схема записи, потом select+importance, потом проектор md, потом op-log/зубы, потом миграция, потом потребители если надо. Иначе два агента правят один extract.mjs — клиппинг merge.

[Teamlead]: Оркестрация — как вчерашний образец. Блоки без общих файлов. Назначаю каркас фаз (уточним столом):  
P0 schema+homes stub;  
P1 archive append + monotony tooth;  
P2 selectOperational + importance + pinned tooth + fixture 27.07;  
P3 project md (совместимость);  
P4 op-log emitters + forge teeth C4/C5;  
P5 migration day-zero + optional backfill;  
P6 wire evening step + consumer smoke.  
Стык каждой: `build*(root,date)→{markdown?,stats,problems}`.

[Верстальщик]: P3 — мой интерес: проекция сохраняет читаемый каркас текущего журнала (заголовок персоны, счётчик «N из M», блоки provenance). Не «новый дизайн дневника». Если budget cut — в report-секции видно transferred, не молчаливый truncate.

[Структурщик]: Словарь операций архивной записи (исполнение C1): id, ts, persona, kind, body-ref/summary, importanceSnapshot?, provenance ∈ {extract, git-restore, transfer}. erase — нет в enum. transfer пишет pointer на полный текст в jsonl, md держит сжатое. Граф зависимостей модулей: project читает archive+retained; select не пишет файлы; append — единственный writer jsonl.

[Архитектор]: Границы правки — явным allowlist:  
Трогаем: extract CLI, lib/*, schema архива, importance read-path, evening step wiring, тесты/фикстуры.  
Не трогаем: C1–C5 тексты норм, UI, RAG-алгоритм всплытия (C3 retrieval-порт — только вызов/заглушка surface_invoke по C4 леммам), пороги v2.  
Находка: если consumers парсят md regex-ом без контракта — зафиксировать, не «улучшать» молча.

[Математик]: Миграция численно. Day-zero: для каждой persona прогнать текущий md → N записей jsonl с provenance `migration-snapshot`, sha содержимого. Backfill optional: `git log -p -- docs/virtual-team/memory/<p>.md` ограниченный date-range из memory-report loss; дедуп по hash(body); не восстанавливаем то, что уже в day-zero. Depth default = даты loss-отчёта 27–28.07, не «вся история репо».

[Музыкант]: C3 на слух: extractor не судья всплытия. Лифт — morning_warmup/surface_invoke; extract только кладёт архив и operational stack. Не тащить MMR в extract — будет второй дирижёр. Хватит emit, что candidates/retained готовы для порта.

[Teamlead]: Подтверждаю: C3 в C6 = не реализовать облако, а не сломать шов. Зуб — «extract не вызывает rank-as-judge сверх selectOperational». Кто полезет MMR в extract — BLOCK. Дальше по backfill: делаем day-zero обязательно; backfill — отдельный блок P5b, выключаемый флагом, default on для окна loss.

[Верстальщик]: Для day-memo и consilium: пока md path тот же — zero UI. Если появится archive-only persona без md — честный stub md «projection empty, archive N», не 404-тишина в RAG.

[Структурщик]: Контракт стыка оркестратора:  
`buildArchive(root,persona,date)`, `buildSelection(...)`, `buildProjection(...)`, `buildMigration(...)` — разные entry, общий `root`. Оркестратор `persona-memory-extract.mjs` вызывает по порядку, пишет problems[]. Параллель между персонами — да (разные файлы); параллель стадий на одной persona — нет.

[Архитектор]: Рекомендация формы: один оркестратор, четыре lib-модуля + migration-cli. Тесты — рядом `scripts/persona-memory/*.test.mjs` или в принятом test runner репо. ADR не нужен: укладываемся в ARCHITECTURE scripts-ритуалов. Нужен короткий TASK prompt с фазами P0–P6 и allowlist файлов.

[Математик]: Фикстура 27.07 — золотой вектор: candidates включают routine-day flood + position-workshop; importance pin на workshop; budget как в проде 5K; ожидаем workshop ∈ retained. Pinned overflow: pins суммарно > budget ⇒ problems.code=`pinned_overflow`, exit≠0. n/a-vs-zero: metrics отсутствует ⇒ `n/a` в report, никогда `0`.

[Музыкант]: Вечерний тракт: extract остаётся после ласточки (#569). Не двигать место в цепочке в C6 — иначе day-memo/persona-trace поедут. C4 evening_compress — квитанция от extract stats+archive append; forge_done без файла квитанции — красный.

[Teamlead]: Место в цепочке не двигаем. Исполнение C4 — эмит квитанции и зуб, не redesign evening. Связка на код: Математик+Структурщик P1–P2; Структурщик+Архитектор P0/P3; Математик P4 teeth; migration P5 — Структурщик+Математик; wire P6 — Teamlead приёмка. Верстальщик — review проекции и stub.

[Верстальщик]: Принимаю review-гейт на snaphot md до/после на одной persona: визуально те же секции, plus честные meta-строки миграции. Без «красивой» перестройки типографики журнала.

[Структурщик]: Потребители: team-memory-report (diff md), day-memo persona-trace, consilium memory — фаза P6a smoke: read path существует, parse не падает. Если report считает «вытеснение» только по diff md — после archive он обязан уметь читать transferred из stats/report (находка: возможно расширение report; не колонизируем C5 метрики сверх эмиттеров).

[Архитектор]: Находка к сшивке (не решаем): team-memory-report может остаться md-only и потерять сигнал transfer-quality. Пометить `finding: report-transfer-blind`. В C6 минимум — stats.json рядом или секция в md report, чтобы не врать нулем.

[Математик]: op-log verbs по C5 — эмиттеры в таблице, extractor пишет только свои: например `memory.select`, `memory.transfer`, `memory.project`, `memory.archive_append`. Чужие verbs не куём. Зуб: unit на «нет verb вне whitelist emitter map».

[Музыкант]: Итог по backfill для слуха команды: master-tape с day-zero + restore loss-window 27–28.07 с `git-restore`. Остальное не откапываем — музей в git и так лежит. Иначе сессия утонет в archaeology.

[Teamlead]: Фиксирую backfill-вердикт: **да, ограниченный**; не full history. Depth = loss-window по memory-report (27–28.07) + явный flag `--backfill-since`. Default миграции: snapshot all personas from current md. Принимаем к столу.

[Верстальщик]: Принимаю. В md: `restored_from_git: N (since YYYY-MM-DD)`. Пусто N=0 — тоже видно.

[Структурщик]: Принимаю allowlist и homes. Добавляю: importance.json read fail-closed если файл повреждён (JSON parse error → problems, не silent empty pins).

[Архитектор]: Принимаю форму lib+CLI, фазы P0–P6, находку report-transfer-blind. Новых пакетов monorepo нет.

[Математик]: Принимаю предикаты зубов и фикстуры. v2 веса не трогаем. selectOperational — чистая функция, I/O снаружи.

[Музыкант]: Принимаю: extract не дирижёр C3; цепочка вечера на месте; backfill loss-window.

[Teamlead]: Матч сыгран по плану. Вердикт: **исполнять** по таблице решения. LGTM на форму после TASK prompt с DoD зубов. BLOCK только если кто-то переоткроет C1–C5 нормы или полезет full-git museum в default path.

[Верстальщик]: Ещё раз: потребители без сюрприза path — часть DoD smoke, не «потом».

[Структурщик]: Параллель агентов: persona-parallel ok; stage-parallel на одном файле — запрет в TASK. pr:ship per phase block.

[Архитектор]: Сшивка M6 → task registry card `persona-memory-extractor-c6` с фазами как подзадачами — на Тарасове после протокола.

[Математик]: Definition of Done зубов — машинные тесты, не чеклист «вручную послушали». Каждая рамка C1–C5: ≥1 red-fixture → green after fix.

---

## Список посылок

| # | Посылка | Тип |
|---|---------|-----|
| 1 | C1–C5 ратифицированы 28.07: архив jsonl первичен, md=проекция; selectOperational в extractor; один retrieval-порт (лифт≠судья); леммы evening_compress/morning_warmup/surface_invoke; op-log verbs и запреты forge | норма |
| 2 | `scripts/persona-memory-extract.mjs` перезаписывает md целиком, отбор «~33 из 239» под ~5K, candidates из `docs/seanses`; `importance.json` объявлен, не читается | факт |
| 3 | Вызов extractor — шаг persona-memory вечерней цепочки (после ласточки, #569) | факт |
| 4 | Текущие md — единственный live-носитель; вытесненное 27–28.07 восстановимо из git-диффов; memory-report уже учитывает такие loss | факт |
| 5 | Зубы-требования рамок: фикстура 27.07 (C2 DoD.9), pinned overflow fail-closed, forge_done (C4), forge_metrics и n/a-vs-zero (C5), append-монотонность (C1); erase отсутствует | норма |
| 6 | Образец оркестрации: фазы со стыком `buildX(root,date)→{markdown,stats,problems}`, блоки без общих файлов, оркестратор отдельным тактом | факт |
| 7 | Потребители выхода: team-memory-report (diff md), day-memo persona-trace, consilium `--with-memory` / persona-RAG — читают md | факт |
| 8 | Пороги/веса/эталоны — v2; UI — вне; новые нормы контрактов в C6 запрещены; пробелы → находка к сшивке | норма |
| 9 | BRIEF memory-subconscious включает C6 как рефакторинг extractor: границы, миграция, зубы, фазы | факт |

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Границы правки | **Allowlist:** CLI `persona-memory-extract.mjs`, `scripts/persona-memory/lib/*` (collect, selectOperational, appendArchive, projectMarkdown, emitOps), schema/homes архива, read `importance.json`, evening wiring, тесты/фикстуры. **Не трогаем:** тексты норм C1–C5, UI, MMR/облако C3 как судью, веса v2, место шага в вечерней цепочке. |
| Форма модулей | Тонкий CLI-оркестратор + lib-модули в `scripts/persona-memory/`; без нового apps/packages npm. Стык: `build*(root,date)→{markdown?,stats,problems}`. |
| Миграция / backfill | **Обязателен day-zero snapshot** текущих md → jsonl (`provenance: migration-snapshot`). **Ограниченный backfill** loss-window 27–28.07 (и `--backfill-since`): `provenance: git-restore` + commit sha; дедуп по hash; **не** full-history default. |
| Проекция и потребители | md path и читаемая структура сохраняются; meta: `archive_from`, `restored_count`, budget/transfer видно. P6 smoke потребителей; правки consumers — только если smoke красный. Находка: `report-transfer-blind` → сшивка, не тихий redesign report. |
| Зубы (все рамки) | C1 monotony jsonl + no-erase; C2 pinned fail-closed + fixture 27.07 retained; C3 extract ≠ retrieval-judge; C4 forge_done/квитанции; C5 forge_metrics + n/a-vs-zero + whitelist verbs. Все — автотестами. |
| Фазы стройки (оркестрация) | **P0** schema+homes stub · **P1** archive append+tooth · **P2** selectOperational+importance+pinned+fixture 27.07 · **P3** project md · **P4** op-log+C4/C5 teeth · **P5** migration day-zero · **P5b** optional backfill · **P6** evening wire + consumer smoke. Параллель: по persona да; по стадиям одной persona нет. |
| C3/C4 scope в C6 | Не реализуем облако всплытия; шов: extract готовит archive/operational; warmup/surface — леммы/квитанции/эмит, без переноса шага evening. |
| Вердикт | **Исполнять** по фазам; завести task-card после протокола. |

**Принятие:**  
[Teamlead] Принимаю · [Архитектор] Принимаю · [Структурщик] Принимаю · [Математик] Принимаю · [Музыкант] Принимаю · [Верстальщик] Принимаю.

**Definition of Done (C6 only):**

1. Архив `docs/virtual-team/memory/archive/<persona>.jsonl` append-only; md — проекция; erase API отсутствует (тест).
2. `selectOperational` — чистая функция; `importance.json` читается; pinned overflow → exit≠0; фикстура 27.07 green.
3. Миграция: day-zero для всех персон с журналом; backfill loss-window воспроизводим флагом; provenance различен.
4. Зубы C4/C5 red-fixtures green; op-log только whitelist emitter map.
5. Evening step вызывает новый оркестратор; путь md для consumers не ломкий (smoke day-memo / memory-report / consilium-memory).
6. Фазы P0–P6 закрыты без пересечения file-owners; `problems[]` не пустой при fail-closed.
7. Находки (`report-transfer-blind` и пробелы C1–C5 если всплывут) записаны к сшивке, не «починены» новыми нормами в PR.

---

*Реплик в диалоге: 42; каждый участник высказался не менее одного раза.*
```
