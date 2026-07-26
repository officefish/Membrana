#!/usr/bin/env node
// Паритет секрет-гейта (#1262): локально проверяем ТЕМ ЖЕ правилом, что CI, но по
// диапазону отправляемых коммитов, а не по растущей истории.
//
// Расхождение, которое это чинит (26.07): pre-commit гоняет `gitleaks protect --staged`
// (только индекс), а CI — `gitleaks detect --source .` при `fetch-depth: 0`, то есть по
// ИСТОРИИ ВСЕХ ВЕТОК. Синтетическая PEM-фикстура прошла локально, а в CI стала находкой —
// и покрасила заявку СОСЕДНЕЙ сессии, в которой этого коммита не было. Пока ветка жила
// в origin, красными были все заявки подряд.
//
// Здесь — `detect --log-opts=<base>..HEAD`: те же правила и тот же `.gitleaksignore`,
// но объём работы не растёт с историей репозитория.
//
// Usage:
//   node scripts/secret-gate-push.mjs            # база origin/main
//   node scripts/secret-gate-push.mjs --base origin/dev
//   SKIP_SECRET_GATE=1 …                         # аварийный обход
//
// Exit: 0 — чисто или инструмент/база недоступны (мягко); 1 — находки (push не проходит).
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * Аргументы вызова gitleaks для диапазона. Правила и baseline берутся из репозитория,
 * поэтому здесь их НЕ дублируем — иначе локально и в CI разошлись бы наборы.
 *
 * @param {{ base?: string }} [opts]
 * @returns {string[]}
 */
export function rangeScanArgs(opts = {}) {
  const base = opts.base ?? 'origin/main';
  return ['detect', '--no-banner', '--redact', '-v', `--log-opts=${base}..HEAD`];
}

/** Версия gitleaks, пришпиленная в CI (единственный источник правды — сам workflow). */
export function parseCiGitleaksVersion(workflowText) {
  const m = String(workflowText ?? '').match(/GITLEAKS_VERSION:\s*([0-9]+\.[0-9]+\.[0-9]+)/u);
  return m ? m[1] : null;
}

/** Версия локального бинаря из вывода `gitleaks version`. */
export function parseLocalGitleaksVersion(output) {
  const m = String(output ?? '').match(/([0-9]+\.[0-9]+\.[0-9]+)/u);
  return m ? m[1] : null;
}

/**
 * Второй слой паритета — ВЕРСИЯ. Одного объёма недостаточно: у разных версий разные
 * правила, и «локально чисто» ничего не значит при расхождении.
 *
 * Найдено при проверке гейта падением (26.07): локальный gitleaks 8.30.1 НЕ считает
 * находкой синтетический PEM-блок, а пришпиленный в CI 8.21.2 — считает. Именно это
 * расхождение и пропустило фикстуру в origin, откуда она покрасила заявку соседа.
 *
 * Гейт из-за этого не падает (установка бинаря — дело машины, а не ветки), но молчать
 * нельзя: молчание здесь и есть ложное «зелёно».
 *
 * @param {{ local?: string|null, ci?: string|null }} v
 * @returns {{ ok: boolean, note: string|null }}
 */
export function versionParity(v = {}) {
  if (!v.ci) return { ok: true, note: null };
  if (!v.local) return { ok: true, note: null };
  if (v.local === v.ci) return { ok: true, note: null };
  return {
    ok: false,
    note:
      `версии расходятся: локально ${v.local}, в CI ${v.ci} — наборы правил РАЗНЫЕ, ` +
      'локальный зелёный не гарантирует зелёный CI (прецедент 26.07: 8.30.1 пропустил PEM-фикстуру, 8.21.2 поймал)',
  };
}

/**
 * Как трактовать исход. Отсутствие gitleaks или недостижимая база — НЕ провал ветки:
 * гейт мягкий локально (строгий зуб — в CI), иначе первый же агент без установленного
 * бинаря начнёт обходить его через SKIP.
 *
 * @param {{ toolMissing?: boolean, baseMissing?: boolean, code?: number|null }} state
 * @returns {{ exitCode: 0|1, reason: 'ok'|'leaks'|'tool-missing'|'base-missing'|'unknown' }}
 */
export function classifyGateOutcome(state = {}) {
  if (state.toolMissing) return { exitCode: 0, reason: 'tool-missing' };
  if (state.baseMissing) return { exitCode: 0, reason: 'base-missing' };
  if (state.code === 0) return { exitCode: 0, reason: 'ok' };
  if (state.code === 1) return { exitCode: 1, reason: 'leaks' };
  return { exitCode: 0, reason: 'unknown' };
}

/** @param {string[]} argv */
export function parseGateArgs(argv) {
  const o = { base: 'origin/main' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--base') {
      const v = argv[i + 1];
      if (!v || v.startsWith('-')) throw new Error('secret-gate: --base требует значение');
      o.base = v;
      i += 1;
    }
  }
  return o;
}

const CI_WORKFLOW = '.github/workflows/gitleaks.yml';

function readCiWorkflow() {
  try {
    return readFileSync(new URL(`../${CI_WORKFLOW}`, import.meta.url), 'utf8');
  } catch {
    return '';
  }
}

function has(cmd) {
  const probe = spawnSync(cmd, ['version'], { encoding: 'utf8' });
  return !probe.error;
}

function revExists(ref) {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', ref], { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (process.env.SKIP_SECRET_GATE === '1') {
    console.log('secret-gate: пропущено (SKIP_SECRET_GATE=1)');
    return;
  }
  let cli;
  try {
    cli = parseGateArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
    return;
  }

  if (!has('gitleaks')) {
    const { reason } = classifyGateOutcome({ toolMissing: true });
    console.log(`secret-gate: gitleaks не установлен — скан диапазона пропущен (${reason}); CI проверит.`);
    return;
  }
  if (!revExists(cli.base)) {
    console.log(`secret-gate: базы ${cli.base} нет локально — скан диапазона пропущен; CI проверит.`);
    return;
  }

  const parity = versionParity({
    local: parseLocalGitleaksVersion(spawnSync('gitleaks', ['version'], { encoding: 'utf8' }).stdout),
    ci: parseCiGitleaksVersion(readCiWorkflow()),
  });
  if (!parity.ok) console.log(`secret-gate ⚠ ${parity.note}`);

  const args = rangeScanArgs({ base: cli.base });
  console.log(`secret-gate: gitleaks ${args.join(' ')}`);
  const run = spawnSync('gitleaks', args, { stdio: 'inherit' });
  const { exitCode, reason } = classifyGateOutcome({ code: run.status });
  if (reason === 'leaks') {
    console.error(
      [
        '',
        'secret-gate: находки в коммитах, которые уходят в origin.',
        'Это ровно то, что увидит CI — и, пока ветка жива в origin, CI будет красить',
        'заявки СОСЕДНИХ сессий тоже (скан идёт по истории всех ветвей).',
        '',
        'Если это синтетический образец в тесте — собирай его В РАНТАЙМЕ из частей,',
        'а не литералом (см. scripts/secret-redact.test.mjs). Baseline .gitleaksignore',
        'привязан к SHA коммита и при ребейзе перестаёт совпадать, поэтому для НОВЫХ',
        'фикстур он не подходит.',
      ].join('\n'),
    );
  }
  process.exitCode = exitCode;
}

if (process.argv[1]?.endsWith('secret-gate-push.mjs')) main();
