# Обсуждение: cut-one-shot-recut-tarasov

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-03 10:12 UTC · tarasov

**Вопрос:** Ты резчик. Нарезка спринта по исполнению четырёх вердиктов заседания one-shot-manifest (03.08, аудит чист). Закрывает #1651. Реши нарезку, кода не пиши.

ЧТО ИСПОЛНЯЕТСЯ. M1: манифест шота — три фрейма (first-frame Веснин с шагами find·stamp-s·predicate-s·checklist чек-листом без держателей; owner-ratify владелец; execute назначается тимлидом), прогоны в общую ленту docs/procedure-runs/ тремя точками, home: none сохраняется. M2: акт назначения — поля корня записи прогона shotId·executor·assignedBy:"teamlead"·contextRunRef; предикат ready_to_execute = valid_assign ∧ context_run_ok, след контекста строго раньше frames[execute].openedAt; false различает missing_assign / missing_context_run. M3: evaluateOneShotS бежит дважды, evaluationMoment ∈ {forecast, fact}; прогноз — гейт, факт — стоп; статус failed_oversize; запись с result: fail кормит анти-цепочку; перерождение — решение владельца. M4: чистая shotThematicBasis(paths) поверх существующего pathFamily → {families, familyCount, basis: 'pathFamily-v1', blind: 'no-graph'}; isHomogeneous — BLOCK; путь замены помечен TODO(graph).

ОБЗОР ЗОНЫ (норма #1573), всё проверено прогоном:
- docs/procedures/one-shot/MANIFEST.json — 50 строк, README — 150 строк;
- scripts/lib/one-shot-s-predicate.mjs — 195 строк, зуб scripts/one-shot-s-predicate.test.mjs — 11 зелёных;
- НАЙДЕНО СВЕРХ обзора шторма: scripts/lib/one-shot-trail.mjs — журнал анти-дробления docs/audit/one-shot-trail.jsonl, ShotRecord {timestamp, path, slug, headRev, status: merged|cancelled}, окно 7 дней, штраф ранга; scripts/lib/one-shot-rank.mjs — ранжирование. Это ИСТОРИЯ шотов для анти-цепочки — предмет НЕ тот же, что запись прогона M2 в docs/procedure-runs/, но пересечение опасное: исполнитель может задублировать. Контракт записи прогона по M1 — {procedureId, runId, startedAt, frames[], closedAt, outcome}, схема журнала прогонов procedure-run-journal@1 уже существует (scripts/lib/procedure-run-journal.mjs) с ручным CLI;
- смежное: #1649 — журнал прогонов без производителя, там предлагается runId обязательным входом артефактов.

Ответь по пунктам.
1) Блоки и зоны. Мой черновик: (а) манифест+README — Ожегов, ~140; (б) контракт записи прогона и ready_to_execute — новый scripts/lib/one-shot-run.mjs + зуб — Веснин, ~280; (в) shotThematicBasis + evaluationMoment в предикате S + зуб — Дынин, ~220. Подтверди или перережь; зоны не должны пересекаться.
2) Шов trail ↔ запись прогона: как исполнителю блока (б) НЕ задублировать историю шотов — что чем остаётся?
3) Шов с procedure-run-journal@1: запись прогона шота — это запись ЭТОГО журнала (schema procedure-run-journal@1, три точки M1 = три append) или свой носитель? Учти #1649.
4) Оценки в строках. Мои прежние занижения известны (трижды из трёх); твоя четвёртая сошлась.
5) DoD каждого блока — проверяемые признаки. Не забудь: зуб на временнОе предшествование contextRunRef; зуб на BLOCK isHomogeneous (поле отсутствует); прогон этого самого спринта должен оставить ПЕРВУЮ запись шота... нет, это спринт, не шот — но запись прогона процедуры по #1649 желательна.
ПЕРСОНЫ — только из семи: tarasov, vesnin, angelina (кода не пишет), dynin, ozhegov, rodchenko, kuryokhin. Выдуманное имя гейт отвергнет E_PERSONA_UNKNOWN.

**Ответ:**

Положение. Аудит чист, обзор сходится, найден сверх-обзорный носитель (one-shot-trail): семантика близка, но предмет иной — историю шотов не тянем в запись прогона. Спринт короткий, четыре вердикта режутся на три непересекающихся блока.

1) Блоки — подтверждаю с уточнением границ. Пересечений нет.
- (а) Ожегов, ~140: `docs/procedures/one-shot/MANIFEST.json` (три фрейма, first-frame чек-лист find·stamp-s·predicate-s·checklist без держателей, home: none) + README. Не трогает `scripts/lib/*`.
- (б) Веснин, ~280: новый `scripts/lib/one-shot-run.mjs` — контракт записи прогона шота (корневые поля shotId·executor·assignedBy·contextRunRef), `ready_to_execute = valid_assign ∧ context_run_ok`, различение missing_assign/missing_context_run, проверка временнОго предшествования contextRunRef ≺ frames[execute].openedAt + зуб. Не трогает `one-shot-trail.mjs`, не трогает предикат-S.
- (в) Дынин, ~220: чистая `shotThematicBasis(paths)` поверх `pathFamily`, `evaluationMoment ∈ {forecast, fact}` в `scripts/lib/one-shot-s-predicate.mjs` (гейт/стоп, failed_oversize, кормление анти-цепочки) + зуб. `isHomogeneous` без поля → BLOCK; путь замены `TODO(graph)`.

2) Шов trail ↔ запись прогона. Разводим по предмету:
- `one-shot-trail.jsonl` — ИСТОРИЯ шотов для анти-цепочки: {timestamp, path, slug, headRev, status: merged|cancelled}, окно 7 дней, штраф ранга. Пишется при merge/cancel шота, кормится результатом `evaluateOneShotS` (result: fail тоже сюда).
- запись прогона (М2) — жизненный цикл ОДНОГО исполнения манифеста: {procedureId, runId, startedAt, frames[], closedAt, outcome} + shotId·executor·assignedBy·contextRunRef. Живёт в `docs/procedure-runs/`.
Правило исполнителю (б): `one-shot-run.mjs` НЕ импортирует `one-shot-trail.mjs`, не пишет в `one-shot-trail.jsonl`. Связь односторонняя: trail при закрытии шота может ссылаться на runId, но это правит владелец trail (не в этом спринте).

3) Шов с `procedure-run-journal@1`. Запись прогона шота — это запись ЭТОГО журнала, схема та же, три точки M1 = три append (open first-frame → open owner-ratify → open execute; closedAt на закрытии). shotId·executor·assignedBy·contextRunRef — расширение корня в рамках schema@1 (доп. поля, не ломающие валидатор); если валидатор строгий — минорный bump до @1.1 с обратной совместимостью, решает Веснин. С #1649 сходится: runId обязателен на входе, `one-shot-run.mjs` — производитель для этого журнала. Своего носителя не заводим.

4) Оценки. Твои три занижения помню; четвёртая сошлась, но запас держим. (а) 140→170, (б) 280→320 (плюс расширение схемы и зуб на предшествование), (в) 220→240. Итого ~730 против твоих 640 — норма #1573 не трогается, зоны не пересекаются.

5) DoD по блокам.
- (а) Ожегов: MANIFEST.json валиден против схемы манифеста; три фрейма именованы (first-frame/owner-ratify/execute); first-frame содержит чек-лист из четырёх шагов без держателей; home: none явно; README описывает роль каждого фрейма и точку назначения. Прогон spellcheck/линтер зелёный.
- (б) Веснин: `ready_to_execute` возвращает true только при valid_assign ∧ context_run_ok; зуб на missing_assign→false с причиной; зуб на missing_context_run→false с причиной; **зуб на contextRunRef.closedAt ≥ frames[execute].openedAt → false** (предшествование строгое); запись прогона проходит `procedure-run-journal@1`; три append дают frames.length===3 и корректный outcome; интеграционный прогон этого спринта оставляет запись прогона процедуры (по #1649).
- (в) Дынин: `shotThematicBasis(paths)` — чистая, детерминированная, возвращает {families, familyCount, basis:'pathFamily-v1', blind:'no-graph'}; **зуб на BLOCK при отсутствии поля isHomogeneous** (не false, а именно BLOCK/throw с именем правила); `evaluateOneShotS` вызывается дважды с evaluationMoment forecast|fact; forecast→гейт (отказ до исполнения), fact→стоп (failed_oversize + запись result:fail в анти-цепочку); зуб на оба момента; TODO(graph) помечен в коде и в README сервиса.

Связка. (а) Ожегов ↔ Веснин по форме манифеста (Ожегов даёт JSON, Веснин на нём валидирует ready_to_execute). (б) Веснин ↔ Дынин по контракту evaluateOneShotS (Веснин зовёт из execute-фрейма, Дынин гарантирует детерминизм и BLOCK). Ангелина — приёмка вердиктов и резюме. Курёхин и Родченко в спринте не заняты.

Вердикт: **LGTM** на нарезку с уточнениями по п.3 (журнал единый, возможен bump @1→@1.1 — решает Веснин) и по п.4 (оценки подняты). Разрешаю старт.

---
