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
 *   yarn node:link-state --node-env C:\membrana-node\.env   # сверить и привязку службы узла
 *
 * Вторая привязка (#2461). У прибора их ДВЕ: ключ доступа в Студии и ключ узла в службе
 * (`FIELD_NODE_DEVICE_ID` в `.env` комплекта узла). 25.09 перевязка аккаунта коснулась только
 * первой, и скрипт печатал «узлы к ночи готовы», пока на сервер не уезжало ни одной пробы.
 * Теперь вторая привязка — предмет суда: `--node-env <путь>` или `FIELD_NODE_ENV`, иначе
 * кандидаты `NODE_ENV_CANDIDATES`. Расхождение — вердикт `binding-split` и exit 27; отсутствие
 * предмета — не «сошлись», а сказанное вслух «НЕ сверена».
 *
 * Exit: 0 — у каждого узла живой ключ и сопряжение · 27 — хотя бы у одного нет (лекарство в
 * выводе) · 1 — не смогли снять состояние (без входа, кабинет не ответил, форма неизвестна).
 * Неснятое состояние — НЕ «всё хорошо»: у отказа свой код.
 */
import { existsSync, readFileSync } from 'node:fs';

export const EXIT_OK = 0;
export const EXIT_REFUSED = 1;
export const EXIT_NOT_LIVE = 27;

export const DEFAULT_API = 'https://cabinet.membrana.space';
/** Ключ, которому осталось меньше суток, — «истекает»: дежурство длится ночь. */
export const EXPIRING_WITHIN_MS = 24 * 60 * 60 * 1000;

/**
 * Где лежит ВТОРАЯ привязка прибора — файл привязки службы узла (#2461).
 * Первый кандидат — комплект узла на самом узле, второй — `.env` рядом с запуском.
 */
export const NODE_ENV_CANDIDATES = Object.freeze(['C:\\membrana-node\\.env', '.env']);

/**
 * Разбор файла привязки службы узла. Служба ходит на сервер ИМЕНЕМ этого прибора
 * (`firebat-poller.mjs`: `/v1/devices/<FIELD_NODE_DEVICE_ID>/node…` плюс ключ узла в заголовке),
 * и это привязка, независимая от той, которую держит Студия.
 *
 * Отсутствие названо словом, а не `undefined`: нечитаемый предмет проверки — отказ сверки,
 * а не успех сверки.
 *
 * @param {string|undefined|null} raw содержимое `.env` узла
 * @returns {{deviceId: string} | {error: string}}
 */
export function parseNodeEnvBinding(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return { error: 'файл привязки службы узла пуст' };
  const map = Object.fromEntries(
    raw
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
  const deviceId = (map.FIELD_NODE_DEVICE_ID ?? '').trim();
  if (deviceId === '') return { error: 'в файле привязки нет FIELD_NODE_DEVICE_ID' };
  return { deviceId };
}

const normalizeDeviceId = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * СВЕРКА ДВУХ ПРИВЯЗОК ОДНОГО ПРИБОРА (#2461) — несущая проверка этого скрипта.
 *
 * У прибора их две, и они независимы:
 *  - Студия (интерфейс) работает от имени `device.mediaDeviceId` — его назвал кабинет в ответ
 *    на ключ доступа, вставленный человеком в панель связки;
 *  - служба узла (ОТПРАВИТЕЛЬ проб) работает от имени `FIELD_NODE_DEVICE_ID` из своего `.env`.
 *
 * 25.09 владелец перевязал прибор на другой кабинет: ключ доступа уехал в Студию, служба
 * осталась на прежнем приборе. Связь была жива, квота читалась, пульс шёл 110 раз за 20 минут —
 * а `POST …/samples` не было НИ ОДНОГО: записи уходили не «не туда», а никуда. Этот самый
 * скрипт при этом печатал «узлы к ночи готовы»: он судил только кабинетную половину.
 * Расхождение двух привязок обязано быть отказом с названной причиной, а не тишиной.
 *
 * ПРЕДМЕТ. Проверка судит файл привязки службы. Нет файла — нет и «да»: возвращается
 * `checked: false` и строка об этом. Молчаливый успех здесь был бы той же ложью, только новой.
 *
 * @param {{mediaDeviceId?: string|null} | null} device половина Студии из `membranes/me`
 * @param {{deviceId?: string, error?: string} | null} nodeBinding половина службы узла
 * @returns {{checked: boolean, split: boolean, line: string, remedy: string|null}}
 */
export function reconcileServiceBinding(device, nodeBinding) {
  const studio = normalizeDeviceId(device?.mediaDeviceId);
  if (!nodeBinding) {
    return {
      checked: false,
      split: false,
      line: `привязка службы узла НЕ сверена: файл привязки не прочитан (--node-env <путь> · FIELD_NODE_ENV · ${NODE_ENV_CANDIDATES.join(' · ')})`,
      remedy: null,
    };
  }
  if (typeof nodeBinding.error === 'string') {
    return { checked: false, split: false, line: `привязка службы узла НЕ сверена: ${nodeBinding.error}`, remedy: null };
  }
  const service = normalizeDeviceId(nodeBinding.deviceId);
  if (service === null) {
    return { checked: false, split: false, line: 'привязка службы узла НЕ сверена: FIELD_NODE_DEVICE_ID пуст', remedy: null };
  }
  if (studio === null) {
    return {
      checked: false,
      split: false,
      line: `привязка службы узла ${service} есть, а кабинет прибор Студии не назвал (device.mediaDeviceId пуст) — сверять не с чем`,
      remedy: null,
    };
  }
  // Имя прочитанного файла входит в строку: отказ должен быть ПРОВЕРЯЕМЫМ. Без него «расхождение»
  // нечем опровергнуть — читатель не знает, чей `.env` скрипт взял (в корне репозитория тоже `.env`).
  const from = typeof nodeBinding.path === 'string' && nodeBinding.path !== '' ? ` (по ${nodeBinding.path})` : '';
  if (service === studio) {
    return { checked: true, split: false, line: `привязки сошлись: Студия и служба узла на приборе ${studio}${from}`, remedy: null };
  }
  return {
    checked: true,
    split: true,
    line: `РАСХОЖДЕНИЕ ПРИВЯЗОК: Студия на приборе ${studio}, служба узла на приборе ${service}${from} — пробы не поедут никуда`,
    remedy:
      'перевязка аккаунта — ДВА действия, а не одно: (1) ключ доступа в Студию; (2) ключ узла новому прибору и переустановка службы — ' +
      'POST /v1/devices/<новый прибор>/node-key?rotate=true, затем powershell -File firebat-service-install.ps1 -DeviceId <новый прибор> -NodeKey <сырой ключ>; ' +
      'сверить обратно этим же yarn node:link-state',
  };
}

/**
 * Суд над одним узлом по ответу `membranes/me` (+ link-state, если снят) и по привязке службы.
 * Чистая функция: время снятия и привязка службы приходят снаружи.
 *
 * `bindingChecked` вынесен в результат намеренно: вызывающий обязан различать «привязки сошлись»
 * и «привязку не с чем было сверить» — иначе вернётся ровно та тишина, из-за которой открыт #2461.
 *
 * @param {object} node — элемент `nodes[]` из `GET /v1/membranes/me`
 * @param {{ now: number, link?: {paired?: boolean, live?: boolean, lastSeenAt?: string|null} | null, nodeBinding?: {deviceId?: string, error?: string} | null }} ctx
 * @returns {{ verdict: 'ok'|'expiring'|'expired'|'revoked'|'no-key'|'not-paired'|'binding-split'|'unknown', lines: string[], remedy: string|null, bindingChecked: boolean, bindingSplit: boolean }}
 */
export function judgeNode(node, ctx) {
  const binding = reconcileServiceBinding(node?.device ?? null, ctx.nodeBinding ?? null);
  const judged = judgeNodeAgainstCabinet(node, ctx, binding);
  return { ...judged, bindingChecked: binding.checked, bindingSplit: binding.split };
}

function judgeNodeAgainstCabinet(node, ctx, binding) {
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
    // Строка сверки печатается ВСЕГДА, каким бы ни вышел вердикт: расхождение привязок не должно
    // прятаться за более срочным отказом по ключу. Вердиктом оно становится ниже, шагом 4.
    lines.push(`узел ${name}: ${binding.line}`);
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
  // ШАГ 4 — ПРИВЯЗКА СЛУЖБЫ (#2461). Место выбрано: ПОСЛЕ ключа и сопряжения (те отказы
  // фундаментальнее — без живого ключа сверять нечего) и ПЕРЕД сроком, потому что расхождение
  // привязок отменяет запись целиком, а «истекает через 5 ч» — лишь предупреждение о будущем.
  // Именно эти две строки стоят между «узлы к ночи готовы» 25.09 и сорванным опытом.
  if (binding.split) {
    return { verdict: 'binding-split', lines: [...lines, keyLine], remedy: binding.remedy };
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

/**
 * Закрывающая строка — отдельной чистой функцией, потому что именно она соврала 25.09:
 * «узлы к ночи готовы по ключу и связке» при НЕСВЕРЕННОЙ второй привязке. Обещание теперь
 * сужено до проверенного: без предмета сверки успех называет себя неполным.
 *
 * @param {number} code исход `exitCodeFor`
 * @param {{node: string, bindingChecked: boolean}[]} results вердикты по узлам
 */
export function summaryLine(code, results) {
  if (code === EXIT_NOT_LIVE) return 'связка НЕ готова — см. лекарство';
  if (code !== EXIT_OK) return 'состояние не снято';
  const unchecked = results.filter((r) => !r.bindingChecked).map((r) => r.node);
  if (unchecked.length > 0) {
    return `ключ и связка живы, но привязка службы узла НЕ сверена (${unchecked.join(', ')}) — прогнать на самом узле либо задать --node-env <путь>`;
  }
  return 'узлы к ночи готовы: ключ, связка и привязка службы сошлись';
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

/**
 * Снять привязку службы узла с диска. Предмет ищется по явному пути, затем по кандидатам;
 * `null` означает «предмета нет» — и печатается словами, а не превращается в «сошлись».
 */
function observeNodeBinding(argv) {
  const flagAt = argv.indexOf('--node-env');
  const explicit = flagAt >= 0 ? argv[flagAt + 1] : process.env.FIELD_NODE_ENV;
  const candidates = explicit ? [explicit] : NODE_ENV_CANDIDATES;
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      return { path, ...parseNodeEnvBinding(readFileSync(path, 'utf8')) };
    } catch (e) {
      return { path, error: `файл привязки ${path} не прочитан: ${e instanceof Error ? e.message : e}` };
    }
  }
  if (explicit) return { path: explicit, error: `файла привязки ${explicit} нет` };
  return null;
}

async function main(argv) {
  const json = argv.includes('--json');
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: CABINET_TOKEN=… | CABINET_LOGIN=… CABINET_PASSWORD=… yarn node:link-state [--json] [--node-env <путь к .env узла>]');
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
  const nodeBinding = observeNodeBinding(argv);
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
    results.push({ node: node.name ?? node.id, ...judgeNode(node, { now, link, nodeBinding }), linkStateRead: link !== null });
  }
  const code = exitCodeFor(results.map((r) => r.verdict));
  if (json) {
    console.log(JSON.stringify({ snapshotAt: new Date(now).toISOString(), api, nodeEnv: nodeBinding?.path ?? null, results, exitCode: code }, null, 2));
    return code;
  }
  console.log(`node:link-state — снято ${new Date(now).toISOString()} с ${api}`);
  for (const r of results) {
    for (const l of r.lines) console.log(`  ${l}${r.linkStateRead ? '' : ' (link-state не снят)'}`);
    console.log(`  → ${r.verdict === 'ok' ? 'да' : 'НЕТ'} · ${r.verdict}${r.remedy ? ` · лекарство: ${r.remedy}` : ''}`);
  }
  console.log(summaryLine(code, results));
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
