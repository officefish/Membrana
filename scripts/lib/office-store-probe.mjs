/**
 * Вердикт пробы хранилищ office (#2580, спринт office-mongo-credentials-2580, блок b2).
 *
 * Где живёт что:
 *   - СБОР — `deploy/office-stack.sh probe`, на VPS (рядом с /etc/membrana/office.env и docker).
 *     Печатает только машинные строки `probe …`: имена, статусы, HTTP-коды. Ни значений env,
 *     ни тел ответов, ни токена.
 *   - СУД — здесь, чистой функцией, на машине оператора: `_ssh-office-prod-up.mjs` (после up)
 *     и `_ssh-office-smoke.mjs` [7] собирают вывод по ssh и зовут `judgeOfficeStoreProbe`.
 *     Один предикат на оба входа — сбор на сервере не судит сам, чтобы правды не было две.
 *
 * Почему чтения, а не запись (решение владельца 04.10, развилка 4а): безпобочной записи в API
 * нет — пустой `POST /v1/archivarius/ingest` отвечает 200, не трогая базу
 * (`archivarius.mongo-store.ts`, `spans.length === 0`), кривое тело `POST /plugin-results/runs`
 * отбивается 400 до базы. Чтения через те же хранилища проходят тот же путь, что запись:
 * connect с учётными данными URI + createIndex (команда с правом записи) + find.
 * Без пользователя в базе (инцидент 24.09–04.10) любое из них — 5xx.
 *
 * Ловушка памяти: без URI модули office молча берут in-memory хранилище, и HTTP-проба на
 * памяти зелёная (404/200). Поэтому первым судится env: оба URI есть и несут `user:pass@`.
 * Предел: проверяется ФОРМА URI в env-файле, а не то, что контейнер его получил; прод-оверлей
 * (b1) сам требует оба URI (`:?`), так что расхождение env ↔ контейнер падает раньше, на up.
 */

/** Закрытый словарь исходов. Порядок — приоритет: первый найденный и есть вердикт. */
export const PROBE_OUTCOMES = Object.freeze([
  'ok',
  'env-uri-without-credentials',
  'db-unhealthy',
  'db-timeout',
  'door-5xx',
  'door-unexpected',
]);

/** URI, без которых office уходит в память. Имена — как в env-файле и в office-stack.sh. */
export const PROBE_ENV_URIS = Object.freeze(['ARCHIVARIUS_MONGO_URI', 'TASK_ARCHIVE_MONGO_URI']);

/**
 * Двери-пробы: чтения через хранилища записи. Пути живут в `deploy/office-stack.sh`
 * (сбор), ожидаемые коды — здесь (суд); имена сверяет зуб `office-store-probe.test.mjs`.
 */
export const PROBE_DOORS = Object.freeze([
  Object.freeze({ name: 'plugin-results-runs', expect: 200, why: 'GET /plugin-results/runs?collectionId=<проба> → пустой список' }),
  Object.freeze({ name: 'archivarius-span', expect: 404, why: 'GET /v1/archivarius/span/<проба>/<проба> → спана нет' }),
  Object.freeze({ name: 'task-archive-closure', expect: 404, why: 'GET /v1/task-archive/closures/<проба> → записи нет' }),
]);

export const PROBE_DB_SERVICE = 'archivarius-mongo';

/**
 * Разбор вывода пробы. Чужие строки (ps, логи ssh) пропускаются: суд видит только `probe …`.
 * @param {string} text
 */
export function parseProbeOutput(text) {
  const parsed = { env: new Map(), health: new Map(), doors: new Map(), ended: false, lines: 0 };
  for (const raw of String(text ?? '').split(/\r?\n/u)) {
    const parts = raw.trim().split(/\s+/u);
    if (parts[0] !== 'probe') continue;
    parsed.lines += 1;
    const [, kind, subject, value] = parts;
    if (kind === 'env' && subject && value) parsed.env.set(subject, value);
    else if (kind === 'health' && subject && value) parsed.health.set(subject, value);
    else if (kind === 'door' && subject && value) parsed.doors.set(subject, value);
    else if (kind === 'end') parsed.ended = true;
  }
  return parsed;
}

/**
 * Вердикт. Пустой или оборванный вывод — не ok: молчание пробы не бывает зелёным.
 * @param {string} text вывод `office-stack.sh probe`
 * @returns {{ ok: boolean, outcome: string, findings: Array<{outcome: string, subject: string, detail: string}> }}
 */
export function judgeOfficeStoreProbe(text) {
  const p = parseProbeOutput(text);
  const findings = [];
  const add = (outcome, subject, detail) => findings.push({ outcome, subject, detail });

  if (p.lines === 0 || !p.ended) {
    add('door-unexpected', 'probe', p.lines === 0 ? 'проба не напечатала ни одной строки' : 'проба оборвалась до «probe end»');
  }

  for (const key of PROBE_ENV_URIS) {
    const form = p.env.get(key);
    if (form !== 'credentials') {
      add('env-uri-without-credentials', key, form === undefined ? 'нет строки пробы' : `форма URI: ${form} — office уйдёт в память или без auth`);
    }
  }

  const db = p.health.get(PROBE_DB_SERVICE);
  if (db === 'unhealthy') add('db-unhealthy', PROBE_DB_SERVICE, 'healthcheck базы unhealthy');
  else if (db !== 'healthy') add('db-timeout', PROBE_DB_SERVICE, `база не стала healthy: ${db ?? 'нет строки пробы'}`);

  for (const door of PROBE_DOORS) {
    const code = p.doors.get(door.name);
    if (code === undefined) add('door-unexpected', door.name, 'нет строки пробы');
    else if (/^5\d\d$/u.test(code)) add('door-5xx', door.name, `HTTP ${code} (${door.why})`);
    else if (code !== String(door.expect)) add('door-unexpected', door.name, `HTTP ${code}, ожидался ${door.expect} (${door.why})`);
  }

  const outcome = worstOutcome(findings);
  return { ok: outcome === 'ok', outcome, findings };
}

/**
 * Худший исход по приоритету словаря. 'ok' — только при ПУСТОМ списке: выбор идёт по словарю
 * без 'ok', так что находка с outcome 'ok' (или вне словаря) зелёного не даёт (ревью PR #2583).
 * @param {Array<{outcome: string}>} findings
 */
export function worstOutcome(findings) {
  if (findings.length === 0) return 'ok';
  return PROBE_OUTCOMES.filter((o) => o !== 'ok').find((o) => findings.some((f) => f.outcome === o)) ?? 'door-unexpected';
}

/** Человеческая сводка вердикта — без значений (их в выводе пробы и нет). */
export function formatProbeVerdict(verdict) {
  if (verdict.ok) return 'office store probe: ok';
  const lines = [`office store probe: ${verdict.outcome}`];
  for (const f of verdict.findings) lines.push(`  - ${f.outcome} · ${f.subject}: ${f.detail}`);
  return lines.join('\n');
}
