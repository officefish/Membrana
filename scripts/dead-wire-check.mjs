#!/usr/bin/env node
/**
 * Зуб «мёртвые провода» (#1447) — обвязка над чистым ядром scripts/lib/dead-wire.mjs.
 *
 * Читает живой package.json, существование путей берёт с диска, перечень pending —
 * из docs/tasks/dead-wire-pending.json (файла может не быть: пустой перечень законен,
 * а вот молчаливое «нет находок» при нечитаемом входе — нет).
 *
 * Коды возврата — конвенция execution-gate, вторую шкалу не заводим:
 *   0 — связь честная: находок нет
 *   1 — находки есть
 *   2 — проверка НЕ состоялась (вход нечитаем) — это не «зелёный»
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditCatalogs, auditWires, FINDING_KINDS } from './lib/dead-wire.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PENDING_PATH = 'docs/tasks/dead-wire-pending.json';

/** @param {string} isoDate */
function todayFrom(argv) {
  const idx = argv.indexOf('--today');
  if (idx !== -1 && argv[idx + 1]) return argv[idx + 1];
  return new Date().toISOString().slice(0, 10);
}

/**
 * Прочитать перечень pending. Отсутствие файла — законный пустой перечень.
 * Нечитаемый или неверной формы файл — ошибка входа, а не пустота.
 * @param {string} root
 * @returns {{pending: Record<string, unknown>, source: string}}
 */
export function readPending(root) {
  const full = path.join(root, PENDING_PATH);
  if (!fs.existsSync(full)) return { pending: {}, source: 'перечня нет — пустой' };
  const raw = fs.readFileSync(full, 'utf8');
  const parsed = JSON.parse(raw);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${PENDING_PATH}: ожидался объект «имя команды → запись»`);
  }
  const pending = parsed.pending ?? parsed;
  if (pending === null || typeof pending !== 'object' || Array.isArray(pending)) {
    throw new Error(`${PENDING_PATH}: поле pending обязано быть объектом`);
  }
  return { pending, source: PENDING_PATH };
}

/**
 * Прогон по дереву. Вынесен отдельно, чтобы тест звал его без process.exit.
 * @param {object} [input]
 * @param {string} [input.root]
 * @param {string} [input.today]
 * @param {Record<string, string>} [input.extraScripts] подложенные команды (тест фальшивого провода)
 */
export function runCheck({ root = REPO_ROOT, today, extraScripts = {} } = {}) {
  const pkgPath = path.join(root, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const scripts = { ...(pkg.scripts ?? {}), ...extraScripts };
  const { pending, source } = readPending(root);

  const fileExists = (rel) => fs.existsSync(path.join(root, rel));
  const stamp = today ?? new Date().toISOString().slice(0, 10);

  const report = auditWires({ scripts, fileExists, pending, today: stamp });
  const catalogs = readCatalogs(root);
  const fromCatalogs = auditCatalogs({ catalogs, scripts, fileExists, pending, today: stamp });

  return {
    findings: [...report.findings, ...fromCatalogs.findings],
    checked: report.checked,
    byKind: report.byKind,
    catalogsChecked: catalogs.length,
    toolsChecked: fromCatalogs.checked,
    pendingSource: source,
  };
}

/**
 * Собрать каталоги мастерских. Отсутствие каталогов законно; нечитаемый каталог —
 * ошибка входа, а не пустота (иначе зуб зеленеет на сломанном файле).
 * @param {string} root
 * @returns {Array<{path: string, tools: Array<Record<string, unknown>>}>}
 */
export function readCatalogs(root) {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'workshop.catalog.json') found.push(full);
    }
  };
  walk(path.join(root, 'docs'));

  return found.map((full) => {
    const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
    return {
      path: path.relative(root, full).split(path.sep).join('/'),
      tools: Array.isArray(parsed.tools) ? parsed.tools : [],
    };
  });
}

/** @param {ReturnType<typeof runCheck>} report */
export function renderReport(report) {
  const lines = [];
  lines.push(`dead-wire — команд проверено: ${report.checked} · каталогов: ${report.catalogsChecked} (инструментов ${report.toolsChecked}) · находок: ${report.findings.length}`);
  lines.push(`перечень pending: ${report.pendingSource}`);
  if (report.findings.length === 0) {
    lines.push('связь честная: каждое объявление имеет носитель либо законный pending');
    return lines.join('\n');
  }
  lines.push('');
  for (const kind of FINDING_KINDS) {
    const group = report.findings.filter((f) => f.kind === kind);
    if (group.length === 0) continue;
    lines.push(`[${kind}] ${group.length}`);
    for (const f of group) {
      lines.push(`  ✖ ${f.name}${f.carrier ? ` → ${f.carrier}` : ''} — ${f.detail}`);
    }
  }
  return lines.join('\n');
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  // process.exitCode, а не process.exit(): обрыв процесса с недописанным stdout роняет
  // libuv ассертом UV_HANDLE_CLOSING и подменяет код на 127 — норма AGENTS.md §Agent tooling.
  try {
    const report = runCheck({ today: todayFrom(process.argv) });
    console.log(renderReport(report));
    process.exitCode = report.findings.length === 0 ? 0 : 1;
  } catch (error) {
    console.error(`dead-wire — проверка НЕ состоялась: ${error.message}`);
    process.exitCode = 2;
  }
}
