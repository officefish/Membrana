#!/usr/bin/env node
/**
 * deploy-run — прогон выкладки в журнале процедур (спринт deploy-procedures, блок d2;
 * Р3 ADR-0023, П2 обзора деплоя 03.08).
 *
 *   yarn deploy:run <procedureId> --service <svc> -- <команда...>
 *
 * Открывает прогон (subject = сервис + ревизия HEAD), исполняет переданную команду с
 * наследованием stdio, закрывает pass при exit 0 / fail при ином; exit-код обёртки =
 * exit-коду команды (прозрачность — разбор Веснина 04.08). «Что, когда и на какой
 * ревизии выкатывалось» становится записью с leafHash, а не археологией по хвостам.
 *
 * Границы:
 * - процедуры — закрытый список серверов (одна процедура на сервер, слово владельца
 *   04.08: «пока две»); чужой id — ошибка входа, не молчаливый прогон;
 * - СЕКРЕТЫ И ENV-ЗНАЧЕНИЯ В ЖУРНАЛ НЕ ПИШУТСЯ: в запись едут только procedureId,
 *   сервис, ревизия и argv команды (пути/глаголы, не окружение);
 * - owner-gate не здесь: deploy:when-green печатает команду, запускает владелец —
 *   обёртка лишь журналирует то, что он запустил;
 * - обрыв (умер процесс обёртки) — ловится ленивым закрытием следующего прогона (#1694).
 *
 * Exit: код команды · 2 — ошибка входа (прогон не открывался).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cmdClose, cmdOpen } from './procedure-run-record.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Закрытый список процедур-серверов (слово владельца 04.08: два сервера — две процедуры). */
export const DEPLOY_PROCEDURES = Object.freeze(['deploy-office-vds', 'deploy-media-vps']);

/**
 * Извлечь причину обхода DR0 из любой позиции argv: yarn scripts часто доклеивает
 * пользовательские аргументы после команды, то есть уже за `--` deploy-run.
 */
function extractAllowDirtyReason(argv) {
  const out = [];
  let reason = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] !== '--allow-dirty-reason') {
      out.push(argv[i]);
      continue;
    }
    if (reason !== null) throw new Error('--allow-dirty-reason указан дважды');
    const value = argv[i + 1];
    if (typeof value !== 'string' || value.trim() === '' || value.startsWith('--')) {
      throw new Error('--allow-dirty-reason требует непустую причину');
    }
    reason = value.trim();
    i += 1;
  }
  return { argv: out, allowDirtyReason: reason };
}

/**
 * Разбор argv: `<procedureId> --service <svc> -- <команда...>`.
 * @param {string[]} argv
 * @returns {{procedureId: string, service: string, command: string[], allowDirtyReason: string | null}}
 */
export function parseDeployRunArgs(argv) {
  const extracted = extractAllowDirtyReason(argv);
  argv = extracted.argv;
  const sep = argv.indexOf('--');
  if (sep === -1 || sep === argv.length - 1) {
    throw new Error('нет команды после «--» — журналировать нечего');
  }
  const head = argv.slice(0, sep);
  const command = argv.slice(sep + 1);
  const procedureId = head.find((a) => !a.startsWith('-'));
  if (!DEPLOY_PROCEDURES.includes(procedureId)) {
    throw new Error(
      `процедура «${procedureId ?? '—'}» вне закрытого списка (${DEPLOY_PROCEDURES.join(' · ')}) — одна процедура на сервер`,
    );
  }
  const si = head.indexOf('--service');
  const service = si > -1 ? head[si + 1] : null;
  if (typeof service !== 'string' || service.trim() === '' || service.startsWith('-')) {
    throw new Error('нет --service <svc> — сервис есть параметр прогона, не пятая копия процедуры');
  }
  return { procedureId, service, command, allowDirtyReason: extracted.allowDirtyReason };
}
/** Ревизия HEAD рабочего дерева — вещдок «что выкатывалось»; недоступный git — честное «н/д». */
export function headRevision(root) {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'н/д';
  }
}

/**
 * Прогон выкладки: open → команда → close. Часы и spawn — параметры ради зубов;
 * журнал пишется библиотекой procedure-run-record, не второй копией.
 *
 * @param {string} root
 * @param {{procedureId: string, service: string, command: string[], allowDirtyReason?: string | null}} input
 * @param {{nowIso?: () => string, spawn?: typeof spawnSync}} [deps]
 * @returns {{exitCode: number, runId: string}}
 */
export function runDeploy(root, input, deps = {}) {
  const { procedureId, service, command, allowDirtyReason } = input;
  const nowIso = deps.nowIso ?? (() => new Date().toISOString());
  const spawn = deps.spawn ?? spawnSync;
  const rev = headRevision(root);
  const commandLabel = command.join(' ');
  const bypassReason = String(allowDirtyReason ?? '').trim();
  const openEvidence = [`ревизия ${rev}`, `команда: ${commandLabel}`];
  if (bypassReason) openEvidence.push(`deploy-preflight bypass: ${bypassReason}`);

  // Subject нейтрален («прогон», не «выкладка»): через vds:run идут и выкладки, и
  // диагностика — журнал не утверждает больше, чем знает; род видно по команде в evidence.
  const { record } = cmdOpen(root, {
    procedureId,
    at: nowIso(),
    subject: `прогон ${service} @ ${rev}`,
    evidence: openEvidence,
  });

  const spawnEnv = bypassReason
    ? { ...process.env, DEPLOY_ALLOW_DIRTY: '1', DEPLOY_DIRTY_REASON: bypassReason }
    : process.env;
  const res = spawn(command[0], command.slice(1), { stdio: 'inherit', cwd: root, env: spawnEnv });
  const exitCode = typeof res.status === 'number' ? res.status : 1;

  cmdClose(root, {
    procedureId,
    runId: record.runId,
    status: exitCode === 0 ? 'pass' : 'fail',
    at: nowIso(),
    subject:
      exitCode === 0
        ? `прогон ${service} @ ${rev} завершён (exit 0)`
        : `прогон ${service} @ ${rev} упал (exit ${exitCode})`,
    evidence: [`ревизия ${rev}`, `команда: ${commandLabel}`],
    gaps: exitCode === 0 ? [] : [`exit:${exitCode}`],
  });
  return { exitCode, runId: record.runId };
}
function main() {
  let parsed;
  try {
    parsed = parseDeployRunArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`deploy:run — ошибка входа: ${e.message}`);
    console.error('Usage: yarn deploy:run <deploy-office-vds|deploy-media-vps> --service <svc> -- <команда...>');
    process.exit(2);
  }
  const { exitCode, runId } = runDeploy(REPO_ROOT, parsed);
  console.error(`deploy:run — прогон ${runId} закрыт ${exitCode === 0 ? 'pass' : `fail (exit ${exitCode})`}`);
  process.exit(exitCode);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
