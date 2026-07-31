/**
 * review-gate — шип-гейт: мердж в main только через ревью-вердикт тимлида,
 * привязанный к HEAD SHA (карточка `ship-review-tooth` #924; слово владельца 29.07:
 * «весь код PR-ов, попадающий в main, прогнать через ревью с тимлидом», BLOCK — стоп).
 *
 * Почему по SHA, а не «ревью было»: ревью без привязки к содержанию обходится молча —
 * прогнал на одном коммите, дописал второй, влил неревьюенное. Вердикт принадлежит
 * ИМЕННО той версии кода, которую смотрели; новый коммит протухает вердикт.
 *
 * Три исхода, третий честен:
 *   · pass    — LGTM по текущему HEAD SHA;
 *   · block   — BLOCK по текущему SHA (или вердикт есть, но по другому коммиту);
 *   · unknown — ревью не прогонялось / канал недоступен. НЕ pass: недоступность
 *     проверки никогда не считается её прохождением (тот же закон, что у infra:probe).
 *
 * Обход существует и ГРОМКИЙ: REVIEW_GATE_OVERRIDE=1 требует причины в
 * REVIEW_GATE_OVERRIDE_REASON и попадает в вывод — иначе при мёртвом LLM-канале
 * контур замирает целиком (Anthropic исчерпан до 01.08 — живой риск, не гипотеза).
 *
 * Чистые функции: ни ФС, ни сети — адаптеры снаружи.
 */

export const REVIEW_STATUS_CONTEXT = 'review/teamlead';
export const VERDICT_MARKER = '<!-- review-verdict';

/**
 * Можно ли догнать ревью автоматически (`--ensure`, #1465 Ф2).
 *
 * Догоняем ТОЛЬКО `unknown` — «ревьюер ещё не высказался». `block` — это уже сказанное
 * слово, и переспрашивать его значило бы крутить ревью до нужного ответа; `pass` догонять
 * нечего. Предикат вынесен из CLI, чтобы эта граница проверялась тестом, а не глазами.
 *
 * @param {'pass'|'block'|'unknown'} state
 * @param {boolean} ensure
 */
export function shouldEnsureReview(state, ensure) {
  return Boolean(ensure) && state === 'unknown';
}

/**
 * Разбор вердикта из markdown ревью: маркер несёт SHA и решение.
 * Форма: `<!-- review-verdict sha:<40hex> verdict:LGTM|BLOCK lead:<id> at:<iso> -->`
 * @param {string} md
 * @returns {{sha: string, verdict: 'LGTM'|'BLOCK', lead: string|null, at: string|null} | null}
 */
export function parseVerdict(md) {
  const m = /<!--\s*review-verdict\s+sha:([0-9a-f]{7,40})\s+verdict:(LGTM|BLOCK)(?:\s+lead:(\S+))?(?:\s+at:(\S+))?\s*-->/u.exec(String(md ?? ''));
  if (!m) return null;
  return { sha: m[1], verdict: m[2], lead: m[3] ?? null, at: m[4] ?? null };
}

/** Маркер для записи в файл ревью (обвязка подставляет факты). */
export function renderVerdictMarker({ sha, verdict, lead, at }) {
  return `<!-- review-verdict sha:${sha} verdict:${verdict} lead:${lead ?? 'unknown'} at:${at ?? new Date().toISOString()} -->`;
}

/**
 * Решение гейта.
 * @param {{headSha: string|null, verdict: ReturnType<typeof parseVerdict>, override?: {enabled: boolean, reason?: string}}} input
 * @returns {{state: 'pass'|'block'|'unknown', reason: string}}
 */
export function reviewGateDecision({ headSha, verdict, override, scope } = {}) {
  if (override?.enabled) {
    const reason = String(override.reason ?? '').trim();
    if (!reason) {
      return {
        state: 'block',
        reason: 'обход шип-гейта запрошен без причины — REVIEW_GATE_OVERRIDE=1 требует REVIEW_GATE_OVERRIDE_REASON (молчаливый обход = дыра, ради которой гейт и строился)',
      };
    }
    return { state: 'pass', reason: `ОБХОД владельца: ${reason} — ревью тимлида НЕ проходилось, факт записан в вывод` };
  }
  if (!headSha) {
    return { state: 'unknown', reason: 'HEAD SHA не определился — к чему привязывать вердикт, неизвестно (git недоступен?)' };
  }
  if (!verdict) {
    return { state: 'unknown', reason: `ревью тимлида по этому PR не найдено — прогнать: yarn code-review:pr <N> (вердикт привяжется к ${headSha.slice(0, 8)})` };
  }
  // ПОРЯДОК ВЕТОК НЕСУЩИЙ (найдено ревью 31.07). «Вердикт не о ЭТОМ коде» строже, чем
  // «код прочитан не весь»: протухший вердикт — это суждение о ДРУГОЙ версии, и никакая
  // полнота диффа его не воскрешает. Поэтому проверка SHA стоит ПЕРЕД проверкой среза;
  // поменять их местами значило бы отпускать протухшее в `unknown`, то есть в путь
  // «догнать ревью», вместо честного `block`.
  if (!sameSha(verdict.sha, headSha)) {
    return {
      state: 'block',
      reason: `вердикт протух: смотрели ${verdict.sha.slice(0, 8)}, на ветке ${headSha.slice(0, 8)} — после ревью появились коммиты; перепрогнать ревью`,
    };
  }
  // #1550: вердикт по СРЕЗУ диффа — не вердикт, В ЛЮБУЮ СТОРОНУ.
  //
  // Симметрия здесь несущая. Ложный BLOCK стоит круга; ложный LGTM пропускает в ствол
  // дефект из непоказанной части — а канон прямо ставит «ошибку в сторону остановки»
  // дешевле «ошибки в сторону мерджа». Пропускать зелёный по срезу значило бы оставить
  // ровно ту дыру, ради которой гейт и построен.
  //
  // Исход `unknown` для этого и есть: «ревью не прогонялось — НЕ pass». Слить его с
  // `block` нельзя — это тот же класс, на котором 30.07 пойман `meeting:audit`
  // («нарушений 0» на пустом корпусе), а 31.07 гейт спринта отдавал код 2 вместо
  // вердиктов. Живой повод: PR #1551 — дифф 212 879 символов при пороге 120 000;
  // ревьюер получил 56%, четыре прогона на одном коде дали ЧЕТЫРЕ непересекающихся
  // набора обвинений, и все проверяемые оказались о коде, которого ему не показали.
  //
  // Ослабления ворот нет: `unknown` НЕ пропускает. Он требует ревью по диффу, который
  // влезает, то есть резки PR на части. Это починка, а не поблажка.
  if (scope?.truncated) {
    return {
      state: 'unknown',
      reason:
        `вердикт ${verdict.verdict} вынесен ПО СРЕЗУ: ревьюеру ушло ${scope.sentChars ? `${scope.sentChars} символов` : 'неизвестно сколько'} диффа, ` +
        'остальное он не видел — это не суждение о коде. Резать PR на части, влезающие в порог (#1550)',
    };
  }
  if (verdict.verdict === 'BLOCK') {
    return { state: 'block', reason: `тимлид дал BLOCK по ${headSha.slice(0, 8)} — устранить замечания и перепрогнать ревью (жёсткий стоп, слово владельца 29.07)` };
  }
  return { state: 'pass', reason: `LGTM тимлида (${verdict.lead ?? 'lead'}) по ${headSha.slice(0, 8)}` };
}

/**
 * Метка среза из артефакта ревью (#1550). Пишет её writeReviewMarkdown, когда дифф
 * не влез в порог; читает гейт, чтобы не принять непрочитанное за суждение.
 * @param {string} md тело артефакта ревью
 * @returns {{ truncated: boolean, sentChars: number|null }}
 */
export function scopeFromBody(md) {
  const m = String(md ?? '').match(SCOPE_MARKER_RE);
  return m ? { truncated: true, sentChars: Number(m[1]) } : { truncated: false, sentChars: null };
}

/**
 * Единственное определение формата метки среза: пишущая и читающая стороны делят ЕГО,
 * а не совпадающие строки в двух файлах. По образцу пары `renderVerdictMarker` ↔
 * `parseVerdict` в этом же модуле.
 *
 * Найдено ревью 31.07 (P1): исходно метку писал `writeReviewMarkdown` шаблонной строкой,
 * а читал гейт своим регэкспом. Пока согласованы — работает; правка формата в одном месте
 * тихо ломает другое. Скрытая связанность через строку — та же болезнь, что весь день:
 * два потребителя с собственными копиями одного знания.
 */
const SCOPE_MARKER_RE = /<!--\s*review-scope:\s*truncated\s+sent=(\d+)\s*-->/u;

/**
 * @param {{ sentChars: number|null }} scope
 * @returns {string}
 */
export function renderScopeMarker({ sentChars }) {
  return `<!-- review-scope: truncated sent=${sentChars ?? 0} -->`;
}

/** Сравнение SHA с учётом коротких форм (7+ hex). */
export function sameSha(a, b) {
  const x = String(a ?? '').toLowerCase();
  const y = String(b ?? '').toLowerCase();
  if (!x || !y) return false;
  const n = Math.min(x.length, y.length);
  return n >= 7 && x.slice(0, n) === y.slice(0, n);
}

/** Состояние → commit status GitHub (context REVIEW_STATUS_CONTEXT). */
export function statusFromDecision(decision) {
  if (decision.state === 'pass') return { state: 'success', description: decision.reason.slice(0, 140) };
  if (decision.state === 'block') return { state: 'failure', description: decision.reason.slice(0, 140) };
  return { state: 'pending', description: decision.reason.slice(0, 140) };
}
