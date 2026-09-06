#!/usr/bin/env node
/**
 * node-link-state — ЖИВОЕ состояние связки узла с кабинетом: ключ доступа, сопряжение,
 * присутствие (#2284, п. 2).
 *
 * Зачем отдельный глагол. 03.09 в порядок установки Studio попала строка «ключ от 20.08
 * истекает сегодня» — по СНИМКУ приёмки двухнедельной давности, а не по живому состоянию.
 * Живое состояние лежит в кабинете за сессией пользователя (SessionGuard, Bearer), и снять
 * его может только тот, у кого есть вход: владелец. Этот скрипт — его рука: логинится ЕГО
 * учёткой (или берёт готовый CABINET_TOKEN), читает `GET /v1/membranes/me` и
 * `GET /v1/nodes/:id/link-state`, печатает вердикт со ШТАМПОМ ВРЕМЕНИ снятия и лекарством.
 *
 * Секреты в вывод не попадают: ни пароль, ни токен, ни сырой ключ.
 *
 * Usage:
 *   CABINET_TOKEN=<токен сессии> yarn node:link-state
 *   CABINET_LOGIN=<логин> CABINET_PASSWORD=<пароль> yarn node:link-state
 *   yarn node:link-state --json
 *
 * Exit: 0 — у каждого узла живой ключ и сопряжение · 27 — хотя бы у одного нет (лекарство в
 * выводе) · 1 — не смогли снять состояние (без входа, кабинет не ответил, форма неизвестна).
 * Неснятое состояние — НЕ «всё хорошо»: у отказа свой код.
 */
export const EXIT_OK = 0;
export const EXIT_REFUSED = 1;
export const EXIT_NOT_LIVE = 27;

export const DEFAULT_API = 'https://cabinet.membrana.space';
/** Ключ, которому осталось меньше суток, — «истекает»: дежурство длится ночь. */
export const EXPIRING_WITHIN_MS = 24 * 60 * 60 * 1000;

/**
 * Суд над одним узлом по ответу `membranes/me` (+ link-state, если снят).
 * Чистая функция: время снятия приходит снаружи.
 *
 * @param {object} node — элемент `nodes[]` из `GET /v1/membranes/me`
 * @param {{ now: number, link?: {paired?: boolean, live?: boolean, lastSeenAt?: string|null} | null }} ctx
 * @returns {{ verdict: 'ok'|'expiring'|'expired'|'revoked'|'no-key'|'not-paired'|'unknown', lines: string[], remedy: string|null }}
 */
export function judgeNode(node, ctx) {
  const lines = [];
  const now = ctx.now;
  const name = node?.name ?? node?.id ?? '?';
  const device = node?.device ?? null;
  const keys = Array.isArray(node?.accessKeys) ? node.accessKeys : null;

  if (keys === null && !device) {
    return {
      verdict: 'unknown',
      lines: [`узел ${name}: в ответе нет ни accessKeys, ни device — форма ответа неизвестна, судить нечего`],
      remedy: 'проверить версию кабинета: скрипт ждёт nodes[].accessKeys[] и nodes[].device',
    };
  }

  // Ключ, которым узел сопряжён: сначала то, что кабинет сам назвал pairedKey, иначе — лучший живой.
  const pairedKeyId = device?.pairedKeyId ?? null;
  let key = keys?.find((k) => k.id === pairedKeyId) ?? null;
  if (!key && keys && keys.length > 0) {
    const alive = keys.filter((k) => !k.revokedAt && Date.parse(k.expiresAt) > now);
    key = alive.sort((a, b) => Date.parse(b.expiresAt) - Date.parse(a.expiresAt))[0] ?? keys[0];
  }
  const pairedExpires = device?.pairedKeyExpiresAt ?? key?.expiresAt ?? null;
  const paired = ctx.link?.paired ?? (device ? device.pairingStatus === 'paired' || Boolean(device.pairedKeyId) : null);

  if (device) {
    lines.push(
      `узел ${name}: сопряжён=${paired === null ? '?' : paired ? 'да' : 'НЕТ'}` +
        (device.lastSeenAt || ctx.link?.lastSeenAt ? ` · виден ${ctx.link?.lastSeenAt ?? device.lastSeenAt}` : ' · не виден') +
        (ctx.link ? ` · живой WS=${ctx.link.live ? 'да' : 'нет'}` : ''),
    );
  }

  if (!key && !pairedExpires) {
    return { verdict: 'no-key', lines: [...lines, `узел ${name}: ключа доступа НЕТ`], remedy: 'кабинет → Узлы → выпустить ключ доступа и связать узел заново (руки владельца)' };
  }
  if (key?.revokedAt) {
    return { verdict: 'revoked', lines: [...lines, `узел ${name}: ключ ${String(key.id).slice(0, 8)} ОТОЗВАН ${key.revokedAt}`], remedy: 'выпустить новый ключ в кабинете и перевязать узел' };
  }
  const exp = Date.parse(pairedExpires);
  if (!Number.isFinite(exp)) {
    return { verdict: 'unknown', lines: [...lines, `узел ${name}: срок ключа нечитаем: ${pairedExpires}`], remedy: 'проверить форму ответа кабинета' };
  }
  const left = exp - now;
  const keyLine = `узел ${name}: ключ ${key ? String(key.id).slice(0, 8) : '(из device)'}${key?.duration ? ` (${key.duration})` : ''} истекает ${pairedExpires}`;
  if (left <= 0) {
    return { verdict: 'expired', lines: [...lines, `${keyLine} — ИСТЁК ${Math.round(-left / 3600000)} ч назад`], remedy: 'выпустить новый ключ в кабинете (Узлы → ключ доступа) и вставить в Studio → панель связки; на узле: Start-ScheduledTask -TaskName MembranaNode' };
  }
  if (paired === false) {
    return { verdict: 'not-paired', lines: [...lines, keyLine], remedy: 'ключ жив, но узел НЕ сопряжён: Studio → панель связки → вставить ключ заново' };
  }
  if (left < EXPIRING_WITHIN_MS) {
    return { verdict: 'expiring', lines: [...lines, `${keyLine} — осталось ${Math.round(left / 3600000)} ч, дежурство не переживёт`], remedy: 'выпустить новый ключ ДО ночи и перевязать узел' };
  }
  return { verdict: 'ok', lines: [...lines, `${keyLine} — жив ещё ${Math.round(left / 3600000)} ч`], remedy: null };
}

export function exitCodeFor(verdicts) {
  if (verdicts.length === 0) return EXIT_REFUSED;
  if (verdicts.some((v) => v === 'unknown')) return EXIT_REFUSED;
  return verdicts.every((v) => v === 'ok') ? EXIT_OK : EXIT_NOT_LIVE;
}

async function login(api, opts) {
  if (opts.token) return opts.token;
  if (!opts.password) throw new Error('нужен CABINET_TOKEN либо CABINET_LOGIN + CABINET_PASSWORD (вход владельца; сессия его не имеет)');
  const res = await fetch(`${api}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ login: opts.login, password: opts.password }),
  });
  if (!res.ok) throw new Error(`вход в кабинет не удался: ${res.status}`);
  const body = await res.json();
  if (!body?.token || typeof body.token !== 'string') throw new Error('ответ входа без token');
  return body.token;
}

async function getJson(api, token, path) {
  const res = await fetch(`${api}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

async function main(argv) {
  const json = argv.includes('--json');
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: CABINET_TOKEN=… | CABINET_LOGIN=… CABINET_PASSWORD=… yarn node:link-state [--json]');
    return EXIT_OK;
  }
  const api = (process.env.CABINET_API_URL || DEFAULT_API).replace(/\/$/u, '');
  const opts = { token: process.env.CABINET_TOKEN || '', login: process.env.CABINET_LOGIN || 'admin', password: process.env.CABINET_PASSWORD || '' };
  let token;
  try {
    token = await login(api, opts);
  } catch (e) {
    console.error(`✗ ОТКАЗ: ${e.message}`);
    return EXIT_REFUSED;
  }
  const now = Date.now();
  let me;
  try {
    me = await getJson(api, token, '/v1/membranes/me');
  } catch (e) {
    console.error(`✗ ОТКАЗ: состояние не снято — ${e.message}`);
    return EXIT_REFUSED;
  }
  const nodes = Array.isArray(me?.nodes) ? me.nodes : [];
  if (nodes.length === 0) {
    console.error(`✗ ОТКАЗ: в мембране нет узлов (снято ${new Date(now).toISOString()}) — судить нечего`);
    return EXIT_REFUSED;
  }
  const results = [];
  for (const node of nodes) {
    let link = null;
    try {
      link = await getJson(api, token, `/v1/nodes/${encodeURIComponent(node.id)}/link-state`);
    } catch {
      link = null; // link-state вспомогательный: без него суд по membranes/me, и это сказано в строке
    }
    results.push({ node: node.name ?? node.id, ...judgeNode(node, { now, link }), linkStateRead: link !== null });
  }
  const code = exitCodeFor(results.map((r) => r.verdict));
  if (json) {
    console.log(JSON.stringify({ snapshotAt: new Date(now).toISOString(), api, results, exitCode: code }, null, 2));
    return code;
  }
  console.log(`node:link-state — снято ${new Date(now).toISOString()} с ${api}`);
  for (const r of results) {
    for (const l of r.lines) console.log(`  ${l}${r.linkStateRead ? '' : ' (link-state не снят)'}`);
    console.log(`  → ${r.verdict === 'ok' ? 'да' : 'НЕТ'} · ${r.verdict}${r.remedy ? ` · лекарство: ${r.remedy}` : ''}`);
  }
  console.log(code === EXIT_OK ? 'узлы к ночи готовы по ключу и связке' : code === EXIT_NOT_LIVE ? 'связка НЕ готова — см. лекарство' : 'состояние не снято');
  return code;
}

if (process.argv[1] && process.argv[1].endsWith('node-link-state.mjs')) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (e) => {
      console.error(`✗ ОТКАЗ: ${e instanceof Error ? e.message : e}`);
      process.exitCode = EXIT_REFUSED;
    },
  );
}
