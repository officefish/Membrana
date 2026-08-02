#!/usr/bin/env node
/**
 * yarn deps:watch — дозор за зависимостями (вердикт M1 заседания security-posture,
 * ратифицирован 19.07.2026; протокол docs/seanses/security-posture-m1-watch-2026-07-19.md).
 *
 * Порог severity → действие (с разрезом рантайм-прод vs dev-тулинг):
 *   рантайм:  critical/high → задача СРАЗУ · moderate → планово · low → накопительно
 *   dev:      critical → СРАЗУ · high → планово · moderate/low → накопительно
 *
 *   yarn deps:watch --mode morning   # полная сводка + снапшот (шаг ritual:day)
 *   yarn deps:watch --mode evening   # diff против утреннего снапшота (шаг ritual:evening)
 *   yarn deps:watch                  # сводка без записи снапшота
 *
 * Всегда exit 0: дозор ИНФОРМИРУЕТ (alert → задача реестра руками Teamlead),
 * ритуал не роняет — сеть/registry могут мигать, отчёт не должен блокировать утро.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { AUDIT_STATES, auditState, comparable, snapshotWritable } from './lib/deps-watch-audit-state.mjs';
import { diffFindings, formatDiffReport } from './lib/deps-watch-diff.mjs';

const SNAPSHOT = join(process.cwd(), 'docs', 'security', 'deps-watch-snapshot.json');

// Dev-тулинг: пакеты без сетевой поверхности прода (основание — вердикт M1).
// Неизвестный пакет консервативно считается РАНТАЙМОМ (строже порог).
const DEV_TOOLING = new Set([
  'vite', 'vitest', '@vitest/ui', 'esbuild', 'rollup', 'webpack', 'turbo',
  'eslint', 'prettier', 'typescript', 'jsdom', 'happy-dom', 'vue-template-compiler',
  'whatwg-encoding', 'nodemon', 'tsx', 'ts-node', 'concurrently', 'rimraf',
]);

const mode = (() => {
  const i = process.argv.indexOf('--mode');
  return i === -1 ? 'plain' : (process.argv[i + 1] ?? 'plain');
})();

function runAudit() {
  // yarn npm audit выходит ненулевым кодом, когда advisories ЕСТЬ — это данные,
  // а не сбой; сбой — это когда stdout пуст (сеть/registry).
  let raw;
  try {
    raw = execSync('yarn npm audit --all --recursive --json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    raw = err.stdout ?? '';
    if (!raw.trim()) throw err;
  }
  const findings = [];
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    let o;
    try { o = JSON.parse(t); } catch { continue; }
    const c = o.children ?? {};
    findings.push({
      pkg: o.value,
      id: String(c.ID ?? ''),
      severity: String(c.Severity ?? 'unknown').toLowerCase(),
      issue: c.Issue ?? '',
      url: c.URL ?? '',
    });
  }
  return findings;
}

const zoneOf = (pkg) => (DEV_TOOLING.has(pkg) ? 'dev' : 'runtime');

// Порог M1: severity+зона → корзина действия.
function actionOf(zone, severity) {
  if (zone === 'runtime') {
    if (severity === 'critical' || severity === 'high') return 'сразу';
    if (severity === 'moderate') return 'планово';
    return 'накопительно';
  }
  if (severity === 'critical') return 'сразу';
  if (severity === 'high') return 'планово';
  return 'накопительно';
}

const RED = '[31m';
const YELLOW = '[33m';
const RESET = '[0m';

function label(severity) {
  // DESIGN-норма (вердикт M1): не только цвет — текстовый префикс обязателен.
  if (severity === 'critical') return `${RED}[CRIT]${RESET}`;
  if (severity === 'high') return `${YELLOW}[HIGH]${RESET}`;
  return `[${severity}]`;
}

function summarize(findings) {
  const bySev = {};
  const byZone = { runtime: {}, dev: {} };
  for (const f of findings) {
    bySev[f.severity] = (bySev[f.severity] ?? 0) + 1;
    const z = byZone[zoneOf(f.pkg)];
    z[f.severity] = (z[f.severity] ?? 0) + 1;
  }
  return { bySev, byZone };
}

function printSummary(findings) {
  const { bySev, byZone } = summarize(findings);
  const fmt = (o) =>
    ['critical', 'high', 'moderate', 'low']
      .filter((s) => o[s])
      .map((s) => `${s}: ${o[s]}`)
      .join(' · ') || 'чисто';
  console.log(`deps:watch — всего advisories: ${findings.length} (${fmt(bySev)})`);
  console.log(`  рантайм-прод: ${fmt(byZone.runtime)}`);
  console.log(`  dev-тулинг:   ${fmt(byZone.dev)}`);

  const urgent = findings.filter((f) => actionOf(zoneOf(f.pkg), f.severity) === 'сразу');
  if (urgent.length > 0) {
    console.log(`  корзина «задача СРАЗУ» (${urgent.length}):`);
    for (const f of urgent) {
      console.log(`    ${label(f.severity)} ${f.pkg} — ${f.issue}`);
    }
    console.log('  → alert превращает в задачу реестра Teamlead (вердикт M1).');
  }
}

/**
 * Прежний снимок значением. Нет файла либо файл испорчен → `null`, а не пустой список:
 * «снимка нет» и «в снимке ноль записей» — разные факты, и второй разрешает сравнение,
 * а первый нет.
 */
function readSnapshot() {
  if (!existsSync(SNAPSHOT)) return null;
  try {
    const doc = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
    return Array.isArray(doc?.findings) ? doc.findings : null;
  } catch {
    return null;
  }
}

function main() {
  // Прежний снимок читается ПЕРЕД аудитом: он нужен и стражу состояния (сколько записей было),
  // и сравнению — в обоих режимах, а не только вечером.
  const previous = readSnapshot();

  let findings = [];
  let ran = true;
  try {
    findings = runAudit();
  } catch (err) {
    ran = false;
    console.log(`deps:watch: аудит не отработал (${err.message?.split('\n')[0] ?? err}) — пропуск, не блокирую ритуал.`);
  }

  const { state, reason } = auditState({ ran, findings, previousCount: previous?.length ?? 0 });

  // Сравнивать и перезаписывать снимок вправе только состоявшийся прогон. Прежде этой развилки
  // не было вовсе, и один пустой ответ реестра объявил бы исчезнувшими все записи разом.
  if (!comparable(state)) {
    if (state !== AUDIT_STATES.NOT_RUN) console.log(`deps:watch: ${reason}`);
    return;
  }

  printSummary(findings);

  // Разница печатается в обоих режимах С ИСТОРИЕЙ. До 02.08 утренний шаг перезаписывал снимок
  // молча — и запись brace-expansion (high) исчезла из него ровно так: коммит ec0b9d33, утро
  // 01.08. Режим `plain` разницы НЕ печатает по разбору Ожегова: он статический отчёт
  // здесь-и-сейчас, снимка не пишет и истории не держит; сравнение принадлежит тем двум шагам,
  // которые в этой истории и живут.
  if (mode === 'morning' || mode === 'evening') {
    if (previous === null) {
      console.log(`deps:watch(${mode}): прежнего снимка нет — сравнивать не с чем, это первый замер.`);
    } else {
      for (const line of formatDiffReport(diffFindings(previous, findings), { mode })) {
        console.log(line);
      }
    }
  }

  if (mode === 'morning' && snapshotWritable(state)) {
    mkdirSync(dirname(SNAPSHOT), { recursive: true });
    writeFileSync(
      SNAPSHOT,
      `${JSON.stringify({ date: new Date().toISOString().slice(0, 10), findings }, null, 2)}\n`,
    );
    console.log(`deps:watch: снапшот → docs/security/deps-watch-snapshot.json`);
  }
}

main();
