#!/usr/bin/env node
/**
 * node-duty-ready — предикат готовности полевого узла к дежурству (#2049).
 *
 * Три «да», без которых ночь не состоится, и каждое — переключатель Windows, а не код:
 *   1. сон и гибернация ВЫКЛЮЧЕНЫ — узел не уснёт посреди ночи (23.08 ночь цела: 1136 проб);
 *   2. автовход ЕСТЬ — после перезагрузки задача «при входе пользователя» поднимет поллер
 *      (ADR-0027 b5: захват звука живёт в интерактивной сессии, службой SYSTEM не сделать);
 *   3. задача планировщика MembranaNode существует, включена, срабатывает при входе и
 *      запускает firebat-poller.mjs — от имени того же пользователя, что входит автоматически.
 *
 * Скрипт ЧИТАЕТ и СУДИТ, ничего не меняет: руки владельца — только переключатели Windows.
 * Каждое «нет» несёт лекарство словами, а не кодом ошибки. Переносимость как у поллера:
 * без npm-зависимостей, едет в комплект узла C:\membrana-node.
 *
 * Локаль: Windows узла может быть русской или английской — оба словаря вывода читаются.
 *
 * Usage:
 *   node node-duty-ready.mjs            # три вердикта, exit 0 при трёх «да», 26 иначе
 *   node node-duty-ready.mjs --json
 */
import { execFileSync } from 'node:child_process';

export const EXIT_NOT_READY = 26;
export const TASK_NAME = 'MembranaNode';

/**
 * Консольные утилиты Windows пишут в OEM-кодировке (cp866 на русской системе), а не в UTF-8:
 * читать их как utf8 значит получить байтовый мусор и молчащий парсер — ровно это случилось
 * на первом живом прогоне 25.08. Байты декодируются явно; отказ команды — тоже текст.
 */
const decode = (buf) => (buf ? new TextDecoder('cp866').decode(buf) : '');
function run(cmd, args) {
  try {
    return decode(execFileSync(cmd, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }));
  } catch (e) {
    return `${decode(e.stdout)}\n${decode(e.stderr)}\n[exit ${e.status ?? '?'}]`;
  }
}

/**
 * Индекс настройки питания для сети из `powercfg /query`: 0 — «никогда».
 * Русская Windows пишет «Текущий индекс настройки питания от сети», английская —
 * «Current AC Power Setting Index»; батарею («от батарей» / DC) не судим — узел у розетки.
 */
export function acIndexOf(text) {
  const m = /(?:Current AC Power Setting Index|питания от сети|для источника переменного тока)[^\n]*?:\s*0x([0-9a-fA-F]{1,8})/u.exec(text);
  return m ? parseInt(m[1], 16) : null;
}

/**
 * 1. Сон и гибернация выключены на сети: оба таймера = 0. Узел стоит у розетки, батарею не судим.
 * @param {{standby: string, hibernate: string}} out тексты powercfg по двум настройкам
 */
export function judgeSleep(out) {
  const standby = acIndexOf(out.standby);
  const hibernate = acIndexOf(out.hibernate);
  if (standby === null || hibernate === null) {
    return { ok: false, detail: 'powercfg не прочитан — вывод не разобран (не Windows или чужая локаль)', fix: 'проверить руками: powercfg /query SCHEME_CURRENT SUB_SLEEP' };
  }
  if (standby === 0 && hibernate === 0) return { ok: true, detail: 'сон 0 · гибернация 0 (сеть)', fix: null };
  const bad = [standby !== 0 ? `сон через ${standby} с` : null, hibernate !== 0 ? `гибернация через ${hibernate} с` : null].filter(Boolean).join(', ');
  return { ok: false, detail: bad, fix: 'Параметры → Система → Питание: «Переводить в спящий режим» = Никогда; гибернацию отключить (powercfg /h off)' };
}

/** 2. Автовход: Winlogon\AutoAdminLogon = 1 и пользователь назван. */
export function judgeAutologon(text) {
  const on = /AutoAdminLogon\s+REG_SZ\s+1\b/u.test(text);
  const user = /DefaultUserName\s+REG_SZ\s+(\S+)/u.exec(text)?.[1] ?? null;
  if (on && user) return { ok: true, detail: `автовход под ${user}`, fix: null };
  return {
    ok: false,
    detail: on ? 'автовход включён, но пользователь не назван' : 'автовход выключен',
    fix: 'netplwiz → снять галку «Требовать ввод имени пользователя и пароля», указать пользователя узла (firebat-t6\\indic)',
  };
}

/** Имя без домена/машины, в нижнем регистре: `firebat-t6\indic` и `indic` — один пользователь. */
const bareUser = (u) => (u ? u.split('\\').pop().trim().toLowerCase() : null);

/**
 * 3. Задача планировщика: есть, включена, при входе, запускает поллер — и запускается от имени ТОГО ЖЕ
 * пользователя, под которым идёт автовход. Только так «при входе» означает «без человека»: служба SYSTEM
 * не годится (dshow живёт в интерактивной сессии, ADR-0027 b5), а задача чужого пользователя после
 * автовхода не сработает. Русская Windows пишет «Состояние назначенной задачи» (живой вывод 21.11);
 * «запланированной» — прежняя догадка фикстуры, оставлена про запас.
 * @param {string} text вывод `schtasks /query /tn MembranaNode /fo LIST /v`
 * @param {string | null} autologonUser `DefaultUserName` из Winlogon (null — автовход не прочитан)
 */
export function judgeTask(text, autologonUser = null) {
  if (/ERROR|ОШИБКА|cannot find|не удается найти|не найден/iu.test(text) && !/firebat-poller/u.test(text)) {
    return { ok: false, detail: `задачи ${TASK_NAME} нет`, fix: 'установить узел: powershell -File firebat-service-install.ps1 … (см. docs/field/firebat-node.md)' };
  }
  const enabled = /(Scheduled Task State|Состояние (?:назначенной|запланированной) задачи)\s*:\s*(Enabled|Включено)/iu.test(text);
  const atLogon = /(At logon time|При входе в систему|При входе)/iu.test(text);
  const poller = /firebat-poller\.mjs/u.test(text);
  const runAs = bareUser(/(?:Run As User|Запуск от имени)\s*:[ \t]*(\S[^\r\n]*)/u.exec(text)?.[1] ?? null);
  const wanted = bareUser(autologonUser);
  const userProblem = !runAs
    ? 'пользователь задачи не прочитан'
    : wanted && runAs !== wanted
      ? `задача от имени ${runAs}, а автовход — ${wanted}`
      : null;
  const problems = [!enabled ? 'задача отключена' : null, !atLogon ? 'триггер не «при входе»' : null, !poller ? 'действие не firebat-poller.mjs' : null, userProblem].filter(Boolean);
  if (problems.length === 0) return { ok: true, detail: `${TASK_NAME}: включена · при входе ${runAs} · firebat-poller.mjs`, fix: null };
  return { ok: false, detail: problems.join(', '), fix: 'переустановить задачу firebat-service-install.ps1 под пользователем автовхода (обновит триггер и действие)' };
}

export function observe() {
  return {
    sleep: {
      standby: run('powercfg', ['/query', 'SCHEME_CURRENT', 'SUB_SLEEP', 'STANDBYIDLE']),
      hibernate: run('powercfg', ['/query', 'SCHEME_CURRENT', 'SUB_SLEEP', 'HIBERNATEIDLE']),
    },
    autologon: run('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon']),
    task: run('schtasks', ['/query', '/tn', TASK_NAME, '/fo', 'LIST', '/v']),
  };
}

export function judge(obs) {
  const autologonUser = /DefaultUserName\s+REG_SZ\s+(\S+)/u.exec(obs.autologon)?.[1] ?? null;
  const checks = [
    { name: 'сон и гибернация выключены', ...judgeSleep(obs.sleep) },
    { name: 'автовход есть', ...judgeAutologon(obs.autologon) },
    { name: 'служба узла поднимется без человека', ...judgeTask(obs.task, autologonUser) },
  ];
  return { ready: checks.every((c) => c.ok), checks };
}

/** Одна таблица: проверка · ответ · причина; лекарства — пронумерованы под таблицей. */
export function renderTable(verdict) {
  const rows = verdict.checks.map((c) => [c.name, c.ok ? 'да' : 'НЕТ', c.detail]);
  const head = ['проверка', 'ответ', 'причина'];
  const width = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells) => `| ${cells.map((c, i) => c.padEnd(width[i])).join(' | ')} |`;
  const out = [line(head), `|${width.map((w) => '-'.repeat(w + 2)).join('|')}|`, ...rows.map(line)];
  const fixes = verdict.checks.filter((c) => !c.ok && c.fix);
  if (fixes.length) out.push('', 'что повернуть руками:', ...fixes.map((c, i) => `  ${i + 1}. ${c.name}: ${c.fix}`));
  out.push('', verdict.ready ? 'node:duty-ready — узел к дежурству готов' : 'node:duty-ready — узел НЕ готов');
  return out.join('\n');
}

function main() {
  const verdict = judge(observe());
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(verdict, null, 2)}\n`);
  } else {
    console.log(renderTable(verdict));
  }
  process.exit(verdict.ready ? 0 : EXIT_NOT_READY);
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/gu, '/')}`) main();
else if (process.argv[1] && process.argv[1].endsWith('node-duty-ready.mjs') && !process.env.VITEST && !process.env.NODE_TEST_CONTEXT) main();
