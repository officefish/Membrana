# Обсуждение: block-shot-run-contract-vesnin

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-03 11:21 UTC · vesnin

**Вопрос:** Блок shot-run-contract спринта one-shot-recut. Ты держатель. Зона: новый scripts/lib/one-shot-run.mjs + scripts/one-shot-run.test.mjs, бюджет 320. Исполняются вердикты M2 (акт назначения, ready_to_execute) и часть M1 (три точки записи).

ФАКТУРА ЖУРНАЛА, проверена чтением. buildProcedureRunRecord строит запись с ЗАКРЫТЫМ набором ключей — чужие поля входа НЕ протекают; статус pass без evidence бросает; ledger.leafHash считается по всей записи при сборке. validateProcedureRunRecord лишние ключи НЕ отвергает — проверяет свои поля и пересчитывает leafHash по всей записи. Значит расширение корня полями M2 (shotId · executor · assignedBy · contextRunRef) возможно БЕЗ bump: собрать базу, добавить поля, пересчитать leafHash тем же алгоритмом (run-ledger.leafHash@1 из scripts/lib/run-ledger/), валидатор пройдёт. Резчик отдал решение bump/не-bump тебе.

ШВЫ (ратифицированы нарезкой): one-shot-run НЕ импортирует one-shot-trail и не пишет в его журнал; носитель — docs/procedure-runs/trail/<дата>.jsonl, схема @1, СВОЕГО носителя нет; три точки = три append (старт first-frame · resume owner-ratify · закрытие execute).

РОСТЕР: KnownPersonas для valid_assign НЕ чеканить третьей копией — сегодня вычинен ВТОРОЙ экземпляр устаревшего ростера (PROCEDURE_PERSONAS без тимлида, класс #1644). Импортировать PROCEDURE_PERSONAS из scripts/lib/validate-procedure.mjs — теперь семь персон с зубом на дословность.

Вопросы, по пунктам:
1) Расширение корня без bump через пересборку хеша — принимаешь? Или bump @1.1 честнее? Назови критерий.
2) Форма ready_to_execute как ЧИСТОЙ функции: fs в ней быть не должно. Кандидат: ready_to_execute(record, {contextRun, executeOpenedAt}) → {ok, reason?: 'missing_assign' | 'missing_context_run'}, где contextRun {personaId, at} | null резолвит вызывающий по record.contextRunRef. Строгое предшествование: contextRun.at < executeOpenedAt. Так?
3) Статусы трёх точек: у журнала закрытый список pass/fail/blocked/skipped, pass требует evidence. Что кладём в evidence каждой точки (старт — чек-лист? ратификация — слово владельца чем? закрытие — дифф/PR?) и каким статусом пишется закрытие при failed_oversize (M3: запись с result fail) — status: fail с named gap?
4) Кто держит sequence: три точки одного прогона — sequence 1..3 внутри runId или глобальный по ленте дня? Прочитай форму: sequence положительное целое, валидатор про уникальность молчит.
5) Минимальный набор зубов: подлог назначения (executor вне ростера, assignedBy не teamlead), предшествование НЕстрогое → false, missing различимы, запись проходит validateProcedureRunRecord, pass без evidence бросает, три append дают связный прогон.

**Ответ:**

По пунктам, как держатель контракта.

**1) Bump vs. пересборка хеша.**
Не bump. Схема @1 — набор проверяемых валидатором полей и алгоритм `leafHash`; закрытость набора обеспечивается `buildProcedureRunRecord`, а не валидатором. Раз он лишние ключи не отвергает и пересчитывает leafHash по всей записи — расширение корня новыми полями M2 остаётся в контракте @1. Критерий bump однозначный: (а) меняется алгоритм leafHash, (б) валидатор начинает требовать/запрещать новое поле, (в) ломается обратное чтение старых записей. Ни одно не наступает — оставляем @1.

**2) Форма `ready_to_execute`.**
Принимаю сигнатуру и разделение ответственности: fs — у вызывающего, функция чистая. Уточнения:
- `reason` расширить до `'missing_assign' | 'missing_context_run' | 'context_not_before_execute'` — иначе «нестрогое предшествование» неотличимо от «нет контекста».
- Предшествование строгое: `contextRun.at < executeOpenedAt`; равенство — false.
- `contextRun: null` при непустом `record.contextRunRef` — это `missing_context_run`, не молчаливый ok.

**3) Evidence трёх точек и failed_oversize.**
- Старт (first-frame): `evidence` = ссылка на нарезку/чек-лист резчика (path + sha пункта «швы ратифицированы»).
- Resume (owner-ratify): дословная цитата владельца + timestamp; статус `pass` только при её наличии.
- Закрытие (execute): дифф/PR — `{ prRef | commitSha, filesTouched[] }`.
- `failed_oversize` (M3): статус закрытия — **`fail`** c именованным gap (`gap: 'oversize'`, budget/actual в evidence). `blocked` — это внешняя преграда, не наш случай; `skipped` — не выполняли.

**4) Sequence.**
Внутри `runId`, 1..3. Глобальный по ленте дня — ложная связность: лента общая для многих прогонов, уникальность валидатор не проверяет, смысл `sequence` — порядок внутри прогона. Уникальность `(runId, sequence)` — зуб в тесте, не в схеме.

**5) Минимальный набор зубов** (принимаю, добавляю два):
- executor вне `PROCEDURE_PERSONAS` → отказ назначения;
- `assignedBy !== 'teamlead'` → отказ;
- `contextRun.at >= executeOpenedAt` → false с `context_not_before_execute`;
- `missing_assign` vs `missing_context_run` различимы;
- запись после расширения M2-полями проходит `validateProcedureRunRecord`;
- `status:'pass'` без evidence бросает на каждой из трёх точек;
- три append читаются как связный прогон (общий `runId`, sequence 1..3, монотонность времени);
- **+ closure при `failed_oversize`: `status:'fail'` с `gap:'oversize'` валиден и не ломает связность прогона;**
- **+ импорт `PROCEDURE_PERSONAS` из `scripts/lib/validate-procedure.mjs` — третьей копии ростера в `one-shot-run.mjs` быть не должно (зуб на дословность: `assert.strictEqual(personas, importedPersonas)`).**

Форма ложится в бюджет 320 без ADR и без консилиума.

---
## 2026-08-03 11:24 UTC · vesnin

**Вопрос:** Ревью блока shot-run-contract на фактическом модуле. Зубов 18, все зелёные с первого прогона; валидатор процедур позеленел — ссылка engines разрешилась.

ВСЕ ТВОИ РЕШЕНИЯ ИСПОЛНЕНЫ: без bump с пересчётом leafHash по полной записи; три причины отказа включая context_not_before_execute с отказом на равенстве; evidence по точкам; закрытие fail с gap oversize законно и связность не рвёт; sequence 1..3 внутри runId с зубом на связность; ростер импортом из validate-procedure, зуб держит tarasov в нём.

ОДНО ДОБАВЛЕНИЕ СВЕРХ ТВОЕГО СПИСКА: buildShotRunRecord бросает на невалидном назначении ДО сборки записи — запись с подложным назначением не рождается вовсе, а не ловится потом. И одна деталь формы: чужой след (personaId следа ≠ executor) отнесён к missing_context_run с текстом «след принадлежит X, исполнитель Y» — не четвёртой причиной: след ИСПОЛНИТЕЛЯ либо есть, либо нет.

Ответь: 1) LGTM или BLOCK; 2) оба решения — принято/отвергнуто; 3) не протёк ли fs или часы в чистый модуль; 4) чего не хватает.

МОДУЛЬ:
/**
 * one-shot-run — контракт записи прогона шота и предикат готовности к исполнению.
 *
 * Спринт `one-shot-recut`, блок `shot-run-contract` (Веснин). Исполняет вердикты M2
 * (акт назначения) и часть M1 (три точки записи) заседания `one-shot-manifest` (03.08).
 *
 * ПРОИЗВОДИТЕЛЬ ЖУРНАЛА (#1649): прогон шота создаётся вызовом, не рукой. Носитель —
 * общая лента `docs/procedure-runs/trail/` (schema `procedure-run-journal@1`), своего
 * носителя у шота нет. Три точки записи на прогон: старт `first-frame` → resume гейта
 * `owner-ratify` → закрытие `execute`.
 *
 * СХЕМА НЕ ПОДНИМАЕТСЯ (приговор держателя): валидатор журнала лишние ключи не отвергает
 * и пересчитывает leafHash по всей записи, значит поля M2 в корне остаются в контракте @1.
 * Критерий будущего bump назван: смена алгоритма хеша, требование/запрет нового поля
 * валидатором, поломка чтения старых записей — ни одно не наступает.
 *
 * ШВЫ (ратифицированы нарезкой):
 * - `one-shot-trail` НЕ импортируется, в его журнал не пишем: тот — история шотов для
 *   анти-цепочки, а не журнал прогонов;
 * - ростер персон НЕ чеканится третьей копией: 03.08 вычинен ВТОРОЙ экземпляр устаревшего
 *   ростера (класс #1644), и здесь стоит импорт из единственного источника.
 *
 * Модуль чист: ни fs, ни часов — запись, время и резолв `contextRunRef` приносит
 * вызывающий. Append делает `appendProcedureRunRecord` журнала.
 */
import { leafHash } from './run-ledger/index.mjs';
import { buildProcedureRunRecord } from './procedure-run-journal.mjs';
import { PROCEDURE_PERSONAS } from './validate-procedure.mjs';

/** Единственный законный автор назначения (Т4 шторма 03.08): литерал роли, не PersonaId. */
export const ASSIGNED_BY = 'teamlead';

/** Причины отказа готовности. Закрыт: неразличимые «нет» — болезнь, которую блок лечит. */
export const NOT_READY_REASONS = Object.freeze([
  'missing_assign',
  'missing_context_run',
  'context_not_before_execute',
]);

/** Три точки записи прогона (вердикт M1). Порядок несущий: sequence 1..3 внутри runId. */
export const SHOT_RUN_POINTS = Object.freeze(['first-frame', 'owner-ratify', 'execute']);

/**
 * Проблемы акта назначения. Пусто = назначение валидно.
 *
 * `executor` сверяется с ЕДИНСТВЕННЫМ ростером (`PROCEDURE_PERSONAS`), `assignedBy` —
 * строго литерал роли: PersonaId тимлида здесь был бы второй правдой о том же факте.
 *
 * @param {{shotId?: unknown, executor?: unknown, assignedBy?: unknown, contextRunRef?: unknown}} r
 * @returns {string[]}
 */
export function assignProblems(r) {
  const problems = [];
  if (typeof r?.shotId !== 'string' || r.shotId.trim() === '') problems.push('shotId пуст');
  if (typeof r?.executor !== 'string' || !PROCEDURE_PERSONAS.includes(r.executor)) {
    problems.push(`executor «${String(r?.executor)}» вне ростера (${PROCEDURE_PERSONAS.join('/')})`);
  }
  if (r?.assignedBy !== ASSIGNED_BY) {
    problems.push(`assignedBy «${String(r?.assignedBy)}» — назначает только ${ASSIGNED_BY} (Т4)`);
  }
  if (typeof r?.contextRunRef !== 'string' || r.contextRunRef.trim() === '') {
    problems.push('contextRunRef пуст — след контекста не назван');
  }
  return problems;
}

/**
 * Готовность к исполнению (вердикт M2): назначение валидно И след профильного контекста
 * исполнителя существует И лежит СТРОГО РАНЬШЕ открытия кадра `execute`.
 *
 * Чистая функция: `contextRun` резолвит вызывающий по `record.contextRunRef` — fs здесь
 * нет. Равенство времён — отказ: «одновременно» не есть «раньше».
 *
 * Ложь различима тремя причинами, а не одним «не готов»: слабость honest_pair (#1641) —
 * вердикт, чьё имя обещает больше, чем проверяет предикат, — сюда не переносится.
 *
 * @param {{shotId?: string, executor?: string, assignedBy?: string, contextRunRef?: string}} record
 * @param {{contextRun: {personaId: string, at: string} | null, executeOpenedAt: string}} input
 * @returns {{ok: true} | {ok: false, reason: string, problems: string[]}}
 */
export function readyToExecute(record, { contextRun, executeOpenedAt }) {
  const problems = assignProblems(record);
  if (problems.length > 0) return { ok: false, reason: 'missing_assign', problems };

  if (
    contextRun === null ||
    typeof contextRun?.at !== 'string' ||
    contextRun.personaId !== record.executor
  ) {
    return {
      ok: false,
      reason: 'missing_context_run',
      problems: [
        contextRun === null
          ? `след по адресу ${record.contextRunRef} не разрешился`
          : `след принадлежит «${String(contextRun?.personaId)}», исполнитель — «${record.executor}»`,
      ],
    };
  }

  if (!(contextRun.at < String(executeOpenedAt))) {
    return {
      ok: false,
      reason: 'context_not_before_execute',
      problems: [
        `след контекста ${contextRun.at} не РАНЬШЕ открытия execute ${String(executeOpenedAt)} — равенство тоже отказ`,
      ],
    };
  }

  return { ok: true };
}

/**
 * Запись одной точки прогона шота: база журнала + поля M2 в корне, leafHash пересчитан
 * по ПОЛНОЙ записи тем же алгоритмом — валидатор журнала проходит без bump схемы.
 *
 * `pass` без вещдока бросает сам строитель журнала — здесь это не дублируется.
 *
 * @param {object} input
 * @param {string} input.runId
 * @param {number} input.sequence 1..3 внутри runId (не глобальный по ленте)
 * @param {'first-frame'|'owner-ratify'|'execute'} input.point
 * @param {'pass'|'fail'|'blocked'|'skipped'} input.status
 * @param {string} input.subject
 * @param {string} input.at ISO — часы у вызывающего
 * @param {string[]} input.evidence
 * @param {string[]} [input.gaps]
 * @param {{shotId: string, executor: string, assignedBy: string, contextRunRef: string}} input.assign
 * @returns {Record<string, unknown>}
 */
export function buildShotRunRecord({ runId, sequence, point, status, subject, at, evidence, gaps = [], assign }) {
  if (!SHOT_RUN_POINTS.includes(point)) {
    throw new Error(`точка «${String(point)}» вне трёх точек прогона (${SHOT_RUN_POINTS.join(' · ')})`);
  }
  const problems = assignProblems(assign);
  if (problems.length > 0) {
    throw new Error(`назначение невалидно: ${problems.join('; ')}`);
  }
  const base = buildProcedureRunRecord({
    procedureId: 'one-shot',
    runId,
    sequence,
    status,
    subject,
    at,
    evidence,
    gaps,
    frameId: point,
  });
  const extended = {
    ...base,
    shotId: assign.shotId,
    executor: assign.executor,
    assignedBy: assign.assignedBy,
    contextRunRef: assign.contextRunRef,
  };
  delete extended.ledger;
  extended.ledger = { algorithm: 'run-ledger.leafHash@1', leafHash: leafHash(extended) };
  return extended;
}

/**
 * Связность прогона по трём записям: общий runId, sequence ровно 1..3, точки в порядке
 * M1, время монотонно, назначение не меняется между точками (исполнитель один — Т3).
 *
 * Закрытие со статусом `fail` и gap `oversize` — ЗАКОННЫЙ исход (M3: красный факт
 * сохраняет запись, а не стирает её), связность он не рвёт.
 *
 * @param {Array<Record<string, any>>} records записи одного runId в порядке ленты
 * @returns {string[]} пусто = прогон связен
 */
export function shotRunProblems(records) {
  const problems = [];
  if (!Array.isArray(records) || records.length !== SHOT_RUN_POINTS.length) {
    return [`точек ${Array.isArray(records) ? records.length : 0} из ${SHOT_RUN_POINTS.length}`];
  }
  const runIds = new Set(records.map((r) => r?.runId));
  if (runIds.size !== 1) problems.push(`runId не един: ${[...runIds].join(', ')}`);
  records.forEach((r, i) => {
    if (r?.sequence !== i + 1) problems.push(`точка ${i + 1}: sequence ${String(r?.sequence)}`);
    if (r?.frameId !== SHOT_RUN_POINTS[i]) {
      problems.push(`точка ${i + 1}: кадр «${String(r?.frameId)}», ждали «${SHOT_RUN_POINTS[i]}»`);
    }
    if (i > 0 && !(String(records[i - 1]?.at) < String(r?.at))) {
      problems.push(`точка ${i + 1}: время не монотонно`);
    }
  });
  const keys = ['shotId', 'executor', 'assignedBy', 'contextRunRef'];
  for (const k of keys) {
    if (new Set(records.map((r) => r?.[k])).size !== 1) {
      problems.push(`${k} меняется между точками — исполнитель один на весь шот (Т3)`);
    }
  }
  return problems;
}

**Ответ:**

1) **LGTM.**

2) Решения:
- **Бросок до сборки записи** в `buildShotRunRecord` — принято. Форма правильная: подложное назначение не должно рождать полу-запись, которую потом ловят по leafHash. Отказ на входе, а не на выходе.
- **Чужой след → `missing_context_run`** — принято. Четвёртой причины быть не должно: контракт предиката — «след ИСПОЛНИТЕЛЯ либо есть, либо нет». Различение внутри одной причины даётся текстом problems, а не именем reason. NOT_READY_REASONS остаётся тройкой — закрытым множеством.

3) **Не протекло.** Модуль держит границу: `at`, `executeOpenedAt`, `contextRun` приходят снаружи; резолв `contextRunRef` — обязанность вызывающего, о чём сказано в шапке и в JSDoc `readyToExecute`. Импорты — `run-ledger` (чистый хеш), `procedure-run-journal` (строитель без fs), `validate-procedure` (ростер). Ни `fs`, ни `Date.now`, ни `performance.now`.

4) Чего не хватает — по мелочи, не блок:
- Сравнение времён строковым `<` работает на нормализованном ISO-Z, но в модуле это не заявлено контрактом. Одна строка в JSDoc `at`: «ISO-8601 в UTC, лексикографически сравнимый (…Z, миллисекунды опц.)» — и договор закрыт без рантайм-проверки.
- `NOT_READY_REASONS` экспортируется, но нигде не сверяется с фактическими `reason` в `readyToExecute`. Это не дефект модуля — это зуб теста: «каждый reason из массива достижим, других нет». Пусть Тарасов навесит.
- В `shotRunProblems` при `records.length !== 3` возврат ранний — остальные инварианты не проверяются. Это осознанно (нет смысла), но стоит одной строкой в JSDoc: «при неверной длине проверка обрывается».

Форма выдерживает нагрузку. Пускай в `main`.

---
