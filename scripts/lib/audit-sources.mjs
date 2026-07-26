/**
 * audit-sources — адаптеры источников правды: сырьё → факты для сверки (#1238, фаза А2).
 *
 * Каждый адаптер ЧИСТЫЙ: получает уже прочитанное содержимое и возвращает факты. Чтение
 * файлов, вызовы git и gh — в CLI. Так адаптеры тестируются без файловой системы, а сверка
 * остаётся функцией от снимков (воспроизводимость — требование приёмки).
 *
 * Первая пятёрка выбрана не «чтобы было», а под известные расхождения 25.07: каждая пара
 * обязана поймать конкретную находку, разобранную вручную (приёмка А4).
 */

/**
 * Пара 1 — состояние процедуры: рабочее дерево против общей ветки.
 * Ловит комнату мостика, числившуюся открытой трое суток: локально закрывалась каждый вечер,
 * но состояние не доезжало, и каждая новая сессия читала «открыта».
 *
 * @param {{procedure: string, worktreeState: object|null, mainState: object|null}} io
 * @returns {import('./audit-concentrate.mjs').Fact[]}
 */
export function factsFromProcedureState({ procedure, worktreeState, mainState }) {
  const facts = [];
  const describe = (s) => {
    if (!s) return 'состояния нет';
    const phase = s.phase ?? 'неизвестно';
    return s.day ? `${phase} (день ${s.day})` : phase;
  };
  if (worktreeState !== undefined) {
    facts.push({
      subject: `состояние процедуры «${procedure}»`,
      claim: describe(worktreeState),
      source: 'worktree',
      evidence: 'состояние в рабочем дереве',
    });
  }
  if (mainState !== undefined) {
    facts.push({
      subject: `состояние процедуры «${procedure}»`,
      claim: describe(mainState),
      source: 'main',
      evidence: 'состояние в общей ветке',
    });
  }
  return facts;
}

/**
 * Пара 2 — артефакты дня: заявлено, что процедура шла, против следов в общей ветке.
 * Ловит вечера 23–24.07: прогоны были, артефактов в ветке нет.
 *
 * @param {{day: string, ritual: string, claimedRun: boolean|null, artifactsInMain: string[]}} io
 * @returns {import('./audit-concentrate.mjs').Fact[]}
 */
export function factsFromRitualTrace({ day, ritual, claimedRun, artifactsInMain }) {
  const subject = `${ritual} ${day}`;
  const facts = [];
  if (claimedRun !== null && claimedRun !== undefined) {
    facts.push({
      subject,
      claim: claimedRun ? 'проведён' : 'не проводился',
      source: 'session',
      date: day,
      evidence: 'заявлено сессией/владельцем',
    });
  }
  facts.push({
    subject,
    claim: artifactsInMain.length > 0 ? 'проведён' : 'следов в общей ветке нет',
    source: 'main',
    date: day,
    evidence: artifactsInMain.length > 0 ? artifactsInMain.join(', ') : 'артефакты дня отсутствуют',
  });
  return facts;
}

/**
 * Пара 3 — производный снимок против своих источников.
 * Ловит реестр прецедентов, ссылавшийся на файлы, которых в общей ветке не было.
 *
 * @param {{snapshot: string, referenced: string[], existing: string[]}} io
 * @returns {import('./audit-concentrate.mjs').Fact[]}
 */
export function factsFromSnapshotLinks({ snapshot, referenced, existing }) {
  const have = new Set(existing ?? []);
  const missing = (referenced ?? []).filter((r) => !have.has(r));
  const facts = [{
    subject: `снимок «${snapshot}»`,
    claim: `ссылается на ${referenced?.length ?? 0} запис(ей)`,
    source: 'snapshot',
    evidence: snapshot,
  }];
  facts.push({
    subject: `снимок «${snapshot}»`,
    claim: missing.length === 0
      ? `ссылается на ${referenced?.length ?? 0} запис(ей)`
      : `${missing.length} ссыл(ок) ведут в пустоту`,
    source: 'filesystem',
    evidence: missing.length ? missing.slice(0, 5).join(', ') : 'все ссылки резолвятся',
  });
  return facts;
}

/**
 * Пара 4 — ответственный против следа участия.
 * Ловит заглушку (#1219): поле заполнено, участия нет. «След» — любое объективное
 * свидетельство: авторство коммита, реплика в протоколе, проектный документ.
 *
 * @param {{card: string, leadPersona: string|null, participationTraces: string[]}} io
 * @returns {import('./audit-concentrate.mjs').Fact[]}
 */
export function factsFromResponsibility({ card, leadPersona, participationTraces }) {
  const subject = `ответственный по карточке ${card}`;
  const facts = [];
  if (leadPersona) {
    facts.push({
      subject,
      claim: `назначен ${leadPersona}`,
      source: 'tasks-registry',
      evidence: 'поле leadPersona',
    });
  }
  const traces = participationTraces ?? [];
  facts.push({
    subject,
    claim: traces.length > 0 ? `назначен ${leadPersona}` : 'следа участия нет',
    source: 'participation',
    evidence: traces.length ? traces.slice(0, 3).join('; ') : 'ни коммитов, ни реплик, ни проектных документов',
  });
  return facts;
}

/**
 * Пара 5 — карточка реестра против состояния снаружи.
 * Ловит расхождение учёта и мира: карточка активна, а иссью давно закрыт (и наоборот).
 *
 * @param {{card: string, registryStatus: string|null, issueState: string|null}} io
 * @returns {import('./audit-concentrate.mjs').Fact[]}
 */
export function factsFromCardVsIssue({ card, registryStatus, issueState }) {
  const subject = `жизненный цикл карточки ${card}`;
  const norm = (s) => {
    if (!s) return null;
    const v = String(s).toLowerCase();
    if (v === 'archived' || v === 'closed' || v === 'merged') return 'закрыта';
    if (v === 'active' || v === 'open') return 'активна';
    return v;
  };
  const facts = [];
  const r = norm(registryStatus);
  const i = norm(issueState);
  if (r) facts.push({ subject, claim: r, source: 'tasks-registry', evidence: `status: ${registryStatus}` });
  if (i) facts.push({ subject, claim: i, source: 'github', evidence: `issue: ${issueState}` });
  return facts;
}
