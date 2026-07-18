/**
 * step-status — семантика отказа шага ритуала (узел S вердикта
 * scripts-boundary-m0-order-2026-07-17, спринт ritual-step-manifest-sf).
 *
 * СУТЬ: `|| true` в цепочке `package.json` не означает «не роняй ритуал» — он
 * означает «этот шаг некритичен», и это РАЗНЫЕ утверждения, слипшиеся в один
 * шелловский трюк (вердикт rt8-loose-ends, 16.07). Пока некритичность живёт в
 * шелле, её нельзя ни прочитать, ни проверить, ни объяснить: упавший code-review
 * 15.07 отдал 127 и остался незамеченным.
 *
 * Здесь некритичность становится ОБЪЯВЛЕНИЕМ В МАНИФЕСТЕ. Правило по умолчанию
 * перевёрнуто: шаг критичен, пока явно не помечен обратное. Забыть пометить —
 * значит получить громкое падение, а не тихий пропуск.
 *
 * Без fs и сети: чистые функции над манифестом и исходом прогона.
 */

/** @typedef {'ok'|'failed-critical'|'skipped-noncritical'} StepStatus */
/** @typedef {'critical'|'noncritical'} Criticality */
/** @typedef {{id:string, script?:string, criticality?:Criticality, kind?:'mechanic'|'gate', label?:string}} Step */
/** @typedef {{exitCode?:number|null, ran?:boolean}} Outcome */

/**
 * Критичность шага. ПО УМОЛЧАНИЮ — `critical`: некритичность объявляется явно,
 * иначе забытый шаг тихо теряет зубы (тот же класс, что drift-якоря-украшения).
 * Неизвестное значение — тоже `critical`: консервативно, не молча.
 * @param {Step} step
 * @returns {Criticality}
 */
export function criticalityOf(step) {
  return step?.criticality === 'noncritical' ? 'noncritical' : 'critical';
}

/**
 * СТАТУС ШАГА — детерминированный, три значения, без «наверное прошло».
 *
 * ok                   — отработал (exit 0).
 * failed-critical      — упал, и это критично: цепочка обязана встать.
 * skipped-noncritical  — упал ИЛИ не запускался, но объявлен некритичным:
 *                        цепочка идёт дальше, а downstream знает, что входа нет.
 *
 * Ключевое отличие от `|| true`: некритичный сбой не превращается в «ok». Он
 * остаётся ОТЛИЧИМЫМ — гейт свежести (isFresh) увидит `skipped-noncritical` и
 * не пустит выход такого шага на вход следующему.
 *
 * @param {Step} step
 * @param {Outcome} outcome
 * @returns {StepStatus}
 */
export function stepStatus(step, outcome) {
  const ran = outcome?.ran !== false;
  const code = outcome?.exitCode ?? null;

  if (ran && code === 0) return 'ok';
  return criticalityOf(step) === 'noncritical' ? 'skipped-noncritical' : 'failed-critical';
}

/**
 * Должна ли цепочка встать на этом статусе.
 * @param {StepStatus} status
 * @returns {boolean}
 */
export function isBlocking(status) {
  return status === 'failed-critical';
}

/**
 * Читаемое объяснение статуса — для человека в консоли, не голый exit-код.
 * @param {Step} step
 * @param {StepStatus} status
 * @param {Outcome} [outcome]
 * @returns {string}
 */
export function explainStatus(step, status, outcome) {
  const name = step?.label ? `${step.id} (${step.label})` : (step?.id ?? '<без id>');
  const code = outcome?.exitCode ?? null;

  if (status === 'ok') return `✓ ${name}`;
  if (status === 'skipped-noncritical') {
    const why = outcome?.ran === false ? 'не запускался' : `упал (exit ${code ?? '?'})`;
    return `⊘ ${name}: ${why}; объявлен некритичным — цепочка идёт дальше, выход НЕ считается входом`;
  }
  return `✗ ${name}: упал (exit ${code ?? '?'}) и критичен — цепочка встала`;
}

/**
 * ГЕЙТ НА СТЫКЕ: какие объявленные входы шага испорчены — их производитель
 * отработал не `ok`.
 *
 * Блокирующее ребро — ТОЛЬКО `consumesFrom` (артефакт → шаг-производитель).
 * Поле `consumes` информационное: шаг может читать артефакт, не становясь его
 * заложником. Разница несущая, и она из канона: team-evening-feedback читает
 * DAILY_CODE_REVIEW, но обязан идти даже при упавшем ревью
 * («feedback is independent», .claude/CLAUDE.md) — поэтому у него consumes есть,
 * а consumesFrom нет. Объявлять зависимость порядком строк в шелл-цепочке было
 * нельзя: `&&` делает заложниками всех подряд.
 *
 * @param {{consumesFrom?: Record<string,string>}} step
 * @param {Record<string, StepStatus>} statuses  статусы уже отработавших шагов
 * @returns {{artifact:string, producer:string, status:StepStatus}[]}
 */
export function blockedInputs(step, statuses) {
  const out = [];
  for (const [artifact, producer] of Object.entries(step?.consumesFrom ?? {})) {
    const status = statuses?.[producer];
    if (status && status !== 'ok') out.push({ artifact, producer, status });
  }
  return out;
}

/**
 * ГАРД манифеста: у каждого шага есть id, и некритичность объявлена осознанно.
 * Ловит две болезни разом — сирот (шаг цепочки без записи) и молчаливый дефолт.
 * @param {Step[]} steps
 * @returns {string[]} список претензий; пустой — манифест здоров
 */
export function validateManifest(steps) {
  const problems = [];
  const list = Array.isArray(steps) ? steps : [];
  if (list.length === 0) return ['манифест пуст — ни одного шага'];

  const seen = new Set();
  for (const [i, s] of list.entries()) {
    const at = `steps[${i}]`;
    if (!s?.id) problems.push(`${at}: нет id`);
    else if (seen.has(s.id)) problems.push(`${at}: дубль id «${s.id}»`);
    else seen.add(s.id);

    if (s?.criticality !== undefined && s.criticality !== 'critical' && s.criticality !== 'noncritical') {
      problems.push(`${at} (${s.id}): неизвестная criticality «${s.criticality}» — допустимо critical|noncritical`);
    }
    if (s?.kind !== undefined && s.kind !== 'mechanic' && s.kind !== 'gate') {
      problems.push(`${at} (${s.id}): неизвестный kind «${s.kind}» — допустимо mechanic|gate`);
    }
    if (criticalityOf(s) === 'noncritical' && !s?.whyNoncritical) {
      problems.push(`${at} (${s.id}): объявлен noncritical без whyNoncritical — некритичность без причины протухнет`);
    }
  }
  return problems;
}
