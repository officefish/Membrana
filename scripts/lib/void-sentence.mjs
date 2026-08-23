/**
 * Мост «приговор → кладбище» (блок b2 спринта `angelina-hostess-impl`, вердикт M5-GC).
 *
 * ЧТО СОЕДИНЯЕТ. Кладбище (`lib/gc-void.mjs`) читает след вида
 * `{status: 'rejected', verdictClosed: true, rejectedAt, rejectedBy, rejectedReason}`.
 * Приговор выносится в жизненном цикле инсайта — осью решения `D`
 * (`proposed | accepted | rejected | deferred`, каноны заседания `insight-archive-lifecycle`
 * C1–C7), командой `yarn insight decide <id> --set rejected --authority <ref>`. Между ними
 * не было ничего: ядро кладбища ждало формы, которой никто не производил, и потому вечерний
 * проход не мог перенести НИ ОДНОГО следа, сколько бы приговоров ни вынесли.
 *
 * ПОЧЕМУ НЕ «ЗАВЕСТИ СОСТОЯНИЕ ОТВЕРГНУТ». Первый замер спринта смотрел статусы реестров
 * (`active`/`archived`, `adopted`/`draft`/…) и заключил, что терминала отказа нет нигде.
 * Замер был верный, обобщение — нет: канон цикла его несёт. Поэтому здесь мост, а не новое
 * состояние; слово владельца «приговор живёт в жизненном цикле инсайта» исполняется
 * буквально — он там уже живёт.
 *
 * ЧТО ЗНАЧИТ «ВЕРДИКТ ЗАКРЫТ». Проекция цикла даёт оценку двух видов: `Some` — одно живое
 * утверждение, `Conflict` — несколько. Конфликт есть спор, а спор не есть приговор: пока
 * живы два утверждения, вердикта нет. Отозванное (`Revoke`) в живых не числится вовсе.
 *
 * ЧЕГО МОСТ НЕ МОЖЕТ — И ГОВОРИТ ОБ ЭТОМ ВСЛУХ. Журнал цикла детерминирован: в конверте
 * события нет часов, и это осознанно (иначе воспроизведение перестало бы совпадать). Проба
 * показала прямо: поля, дописанные в событие решения, воспроизведение МОЛЧА отбрасывает —
 * утверждение хранит ровно `{assertionId, axis, subjectRef, value, evidenceRef, eventId,
 * seq}`. Значит ни даты приговора, ни ответственного из проекции не достать: `authorityRef`
 * живёт в записи операции, а она пишется в общий git-каталог, вне репозитория и вне
 * вещдоков.
 *
 * Единственный переживающий воспроизведение носитель — `evidenceRef`. Канон объявляет его
 * непрозрачным, и ядро цикла таким его и оставляет; структуру читает ТОЛЬКО этот мост, для
 * себя (см. `docs/void/LIFECYCLE.md`). Не разобралось — мост не угадывает: он возвращает
 * пустые поля и называет их поимённо через `epitaphGaps`. Эпитафия без даты честнее
 * эпитафии с `Date.now`, которую DoD вердикта M5 запрещает прямо («дата из вердикта»).
 *
 * ЯДРО НЕ ЧИТАЕТ ФС: проекция приходит значением. Журнал операций мост не открывает — он
 * для аудита процесса, не для эпитафий, и зависеть от `.git` вещдок не вправе.
 */

/** Ось решения. Приговор — единственное её значение, ведущее на кладбище. */
export const DECISION_AXIS = 'D';
export const SENTENCE_VALUE = 'rejected';

/**
 * Разобрать `evidenceRef` в дату, ответственного и ссылку.
 *
 * Объявленная форма: `at=YYYY-MM-DD;by=<кто>;ref=<куда>` (порядок частей свободный).
 * Строка не этой формы вещдоком остаётся целиком — она кладётся в `ref`, а дата и
 * ответственный объявляются отсутствующими. Догадки здесь опаснее пустоты: эпитафия с
 * выдуманной датой не лечится, а пустая честно зовёт человека.
 *
 * @param {unknown} evidenceRef
 * @returns {{at: string|null, by: string|null, ref: string|null}}
 */
export function parseEvidenceRef(evidenceRef) {
  const empty = { at: null, by: null, ref: null };
  if (typeof evidenceRef !== 'string' || evidenceRef.trim() === '') return empty;
  const raw = evidenceRef.trim();
  const parts = raw.split(';').map((p) => p.trim()).filter(Boolean);
  const out = { at: null, by: null, ref: null };
  let structured = false;
  for (const part of parts) {
    const m = /^(at|by|ref)=(.+)$/u.exec(part);
    if (!m) continue;
    structured = true;
    const [, key, value] = m;
    if (key === 'at') out.at = /^\d{4}-\d{2}-\d{2}$/u.test(value.trim()) ? value.trim() : null;
    else out[key] = value.trim() === '' ? null : value.trim();
  }
  if (!structured) return { at: null, by: null, ref: raw };
  if (!out.ref) out.ref = null;
  return out;
}

/**
 * Собрать приговорённые следы из проекции жизненного цикла.
 *
 * @param {{currentAssessments?: Record<string, {kind?: string, assertion?: object, assertionIds?: string[]}>}} projection
 * @returns {Array<{subjectRef: string, status: string, verdictClosed: boolean, rejectedAt: string|null, rejectedBy: string|null, rejectedReason: string|null, verdict: string|null, assertionId: string|null, disputed: boolean}>}
 */
export function sentencesFromProjection(projection) {
  const assessments = projection?.currentAssessments ?? {};
  const out = [];
  for (const [key, value] of Object.entries(assessments)) {
    if (!key.startsWith(`${DECISION_AXIS}:`)) continue;
    const subjectRef = key.slice(DECISION_AXIS.length + 1);

    if (value?.kind === 'Conflict') {
      // Спор — не приговор. След называется, но на кладбище не идёт: `verdictClosed: false`
      // закрывает его в `isDead`, а `disputed` даёт порту сказать об этом словом, а не молчать.
      out.push({
        subjectRef,
        status: SENTENCE_VALUE,
        verdictClosed: false,
        rejectedAt: null,
        rejectedBy: null,
        rejectedReason: null,
        verdict: null,
        assertionId: null,
        disputed: true,
      });
      continue;
    }
    if (value?.kind !== 'Some') continue;
    const assertion = value.assertion ?? {};
    if (assertion.value !== SENTENCE_VALUE) continue;

    const evidence = parseEvidenceRef(assertion.evidenceRef);
    out.push({
      subjectRef,
      status: SENTENCE_VALUE,
      verdictClosed: true,
      rejectedAt: evidence.at,
      rejectedBy: evidence.by,
      rejectedReason: null,
      verdict: evidence.ref,
      assertionId: typeof assertion.assertionId === 'string' ? assertion.assertionId : null,
      disputed: false,
    });
  }
  return out.sort((a, b) => a.subjectRef.localeCompare(b.subjectRef));
}

/**
 * Чего не хватает следу до полной эпитафии.
 *
 * Возвращает ИМЕНА недостающих полей, а не «неполно»: читатель должен узнать, что чинить,
 * не открывая исходник. Пустой список — эпитафия полна.
 *
 * @param {{rejectedAt?: string|null, rejectedBy?: string|null, verdict?: string|null, disputed?: boolean}} sentence
 * @returns {string[]}
 */
export function epitaphGaps(sentence) {
  const gaps = [];
  if (sentence?.disputed) gaps.push('вердикт не закрыт: живо более одного утверждения (спор)');
  if (!sentence?.rejectedAt) gaps.push('дата приговора (at=YYYY-MM-DD в evidenceRef)');
  if (!sentence?.rejectedBy) gaps.push('ответственный (by=… в evidenceRef)');
  if (!sentence?.verdict) gaps.push('ссылка на вердикт (ref=… в evidenceRef)');
  return gaps;
}

/**
 * Готов ли след к переносу с полной эпитафией.
 * @param {object} sentence
 * @returns {boolean}
 */
export function epitaphReady(sentence) {
  return epitaphGaps(sentence).length === 0;
}
