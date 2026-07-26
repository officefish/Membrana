#!/usr/bin/env node
/**
 * yarn audit:concentrate — аудит дня как СВЕРКА источников правды (#1238, фаза А3).
 *
 *   yarn audit:concentrate                      — за сегодня
 *   yarn audit:concentrate --date 2026-07-25
 *   yarn audit:concentrate --ref origin/main    — с чем сверять «общую ветку» (default origin/main)
 *   yarn audit:concentrate --json
 *   yarn audit:concentrate --out docs/seanses/concentrate-<день>.md
 *
 * Отчёт — функция от снимков, а не от момента запуска: день подаётся флагом, состояние
 * общей ветки читается из указанной ревизии. Два прогона на одних снимках дают один текст.
 *
 * Недоступный источник НЕ сокращает выдачу молча — он называется в шапке отчёта.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { reconcile, renderConcentrate } from './lib/audit-concentrate.mjs';
import {
  factsFromCardVsIssue,
  factsFromProcedureState,
  factsFromResponsibility,
  factsFromRitualTrace,
  factsFromSnapshotLinks,
} from './lib/audit-sources.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (name, dflt = null) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};

const day = arg('date') || new Date().toISOString().slice(0, 10);
const baseRef = arg('ref', 'origin/main');
const unavailable = [];

/**
 * Ревизия НА КОНЕЦ ДНЯ, а не «сейчас». Без этого отчёт за прошедший день врёт: сегодняшние
 * починки закрывают вчерашние расхождения, и аудит показывает благополучие задним числом.
 * Приёмка 26.07 поймала это на живом прогоне — состояние комнаты и снимок прецедентов
 * читались текущими и потому «сходились».
 */
function refAtEndOfDay() {
  try {
    const sha = execFileSync('git', ['rev-list', '-1', `--before=${day}T23:59:59`, baseRef], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    return sha || baseRef;
  } catch {
    unavailable.push({ source: 'git rev-list', why: `ревизия на конец ${day} не найдена — сверка идёт по ${baseRef}` });
    return baseRef;
  }
}
const ref = refAtEndOfDay();

/** Чтение файла из ревизии; отсутствие — не ошибка, а факт. */
function showFromRef(relPath) {
  try {
    return execFileSync('git', ['show', `${ref}:${relPath}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 40e6 });
  } catch {
    return null;
  }
}
function listInRef(prefix) {
  try {
    return execFileSync('git', ['ls-tree', '-r', '--name-only', ref, prefix], { cwd: ROOT, encoding: 'utf8', maxBuffer: 60e6 })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return null;
  }
}
function readLocal(relPath) {
  const abs = join(ROOT, relPath);
  return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
}
function parseJsonOrNull(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Проверка доступности ревизии — иначе половина пар молча схлопнется в «нет данных».
if (listInRef('docs') === null) {
  unavailable.push({ source: ref, why: 'ревизия недоступна (нет fetch?) — сверка с общей веткой пропущена' });
}

const facts = [];

// ─── Пара 1 · состояние процедур ──────────────────────────────────────────────────────
// Для СЕГОДНЯШНЕГО дня сверяем рабочее дерево с общей веткой (классическое расхождение
// «локально одно, в ветке другое»). Для прошедшего дня рабочее дерево не свидетельствует
// о прошлом — вместо него голосом выступает сам вечер: если он в тот день прошёл, комната
// обязана была закрыться. Разошлось — конфликт.
const isToday = day === new Date().toISOString().slice(0, 10);
for (const [procedure, statePath] of [['bridge', 'docs/bridge/state.json']]) {
  const inRef = parseJsonOrNull(showFromRef(statePath));
  if (isToday) {
    const local = parseJsonOrNull(readLocal(statePath));
    facts.push(...factsFromProcedureState({ procedure, worktreeState: local, mainState: inRef }));
  } else {
    facts.push(...factsFromProcedureState({ procedure, worktreeState: undefined, mainState: inRef }));
  }

  // Голос канона процедуры: комната закрывается неявно, шагом вечера. Значит состояние
  // «открыта» с ПРОШЛОГО дня противоречит собственному регламенту процедуры — независимо
  // от того, оставил вечер артефакты или нет. Без этого голоса висящая комната выглядела
  // единственным мнением и молча уходила в «без подтверждения» (поймано приёмкой 26.07).
  if (inRef?.phase === 'opened' && inRef?.day && inRef.day < day) {
    facts.push({
      subject: `состояние процедуры «${procedure}»`,
      claim: 'closed',
      source: 'procedure-canon',
      date: day,
      evidence: `регламент: закрытие неявное, шагом вечернего ритуала; открыта с ${inRef.day}`,
    });
  }
}

// ─── Пара 2 · вечерний ритуал: работа шла против следов в общей ветке ─────────────────
{
  const artifacts = [];
  const dayArchive = listInRef(`docs/archive/daily-day/${day}`) ?? [];
  if (dayArchive.length > 0) artifacts.push(`архив дня (${dayArchive.length} файл(ов))`);
  const feedback = showFromRef(`docs/seanses/team-evening-feedback-${day}.md`);
  if (feedback) artifacts.push('протокол фидбека');
  const reviewSnaps = (listInRef('docs/archive/daily-code-review') ?? []).filter((p) => p.includes(day));
  if (reviewSnaps.length > 0) artifacts.push('снимок вечернего ревью');

  // «Работа шла» — объективный признак: коммиты этого дня. Не мнение, не память сессии.
  let commitsThatDay = 0;
  try {
    const out = execFileSync(
      'git',
      ['log', ref, '--since', `${day}T00:00:00`, '--until', `${day}T23:59:59`, '--oneline'],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 20e6 },
    );
    commitsThatDay = out.split(/\r?\n/).filter(Boolean).length;
  } catch {
    unavailable.push({ source: 'git log', why: 'история за день недоступна' });
  }

  facts.push(...factsFromRitualTrace({
    day,
    ritual: 'вечерний ритуал',
    claimedRun: commitsThatDay > 0 ? true : null,
    artifactsInMain: artifacts,
  }));

  // Вечер, если он прошёл, обязан был закрыть комнату — это его шаг. Голос вечера про
  // состояние процедуры независим от самого состояния: расхождение = потерянное закрытие.
  if (!isToday && artifacts.length > 0) {
    facts.push({
      subject: 'состояние процедуры «bridge»',
      claim: 'closed',
      source: 'evening-ritual',
      date: day,
      evidence: `вечер ${day} прошёл (${artifacts.join(', ')}) — шаг закрытия комнаты входит в цепочку`,
    });
  }
}

// ─── Пара 3 · производный снимок против своих источников ──────────────────────────────
{
  const snapText = showFromRef('docs/precedents/registry/PRECEDENTS.md') ?? readLocal('docs/precedents/registry/PRECEDENTS.md');
  if (!snapText) {
    unavailable.push({ source: 'снимок прецедентов', why: 'файл не найден ни в ревизии, ни в дереве' });
  } else {
    const referenced = [...snapText.matchAll(/\]\(\.\.\/([^)]+\.md)\)/gu)].map((m) => `docs/precedents/${m[1]}`);
    const existing = listInRef('docs/precedents') ?? [];
    facts.push(...factsFromSnapshotLinks({ snapshot: 'PRECEDENTS', referenced: [...new Set(referenced)], existing }));
  }
}

// ─── Пара 4 · ответственный против следа участия (карточки, заведённые в этот день) ────
{
  const registry = parseJsonOrNull(readLocal('docs/tasks/registry.json'));
  const cards = registry ? (Array.isArray(registry.tasks) ? registry.tasks : Object.values(registry.tasks ?? {})) : [];
  const todays = cards.filter((c) => String(c?.createdAt ?? '').startsWith(day));
  if (!registry) unavailable.push({ source: 'реестр задач', why: 'не прочитан' });

  for (const card of todays.slice(0, 12)) {
    if (!card?.leadPersona) continue;
    let traces = [];
    try {
      const out = execFileSync(
        'git',
        ['log', ref, '--since', `${day}T00:00:00`, '--until', `${day}T23:59:59`, '--format=%s%n%b', '--grep', card.leadPersona, '-i'],
        { cwd: ROOT, encoding: 'utf8', maxBuffer: 20e6 },
      );
      if (out.trim()) traces.push('упоминание в коммитах дня');
    } catch {
      /* отсутствие следа — это факт, а не сбой */
    }
    facts.push(...factsFromResponsibility({ card: card.id, leadPersona: card.leadPersona, participationTraces: traces }));
  }
}

// ─── Пара 5 · карточка против состояния снаружи ───────────────────────────────────────
{
  const registry = parseJsonOrNull(readLocal('docs/tasks/registry.json'));
  const cards = registry ? (Array.isArray(registry.tasks) ? registry.tasks : Object.values(registry.tasks ?? {})) : [];
  const todays = cards.filter((c) => String(c?.createdAt ?? '').startsWith(day) && c?.githubIssue);
  let ghAlive = true;
  for (const card of todays.slice(0, 10)) {
    let issueState = null;
    if (ghAlive) {
      try {
        issueState = execFileSync('gh', ['issue', 'view', String(card.githubIssue), '--json', 'state', '--jq', '.state'], {
          cwd: ROOT,
          encoding: 'utf8',
          timeout: 15_000,
        }).trim();
      } catch {
        ghAlive = false;
        unavailable.push({ source: 'github', why: 'состояние задач снаружи недоступно — пара «учёт против мира» неполна' });
      }
    }
    facts.push(...factsFromCardVsIssue({ card: card.id, registryStatus: card.status, issueState }));
  }
}

const { subjects, problems } = reconcile(facts);
const report = renderConcentrate({ day, subjects, problems, unavailable });

if (argv.includes('--json')) {
  console.log(JSON.stringify({ day, ref, subjects, problems, unavailable }, null, 2));
} else {
  console.log(report);
}

const out = arg('out');
if (out) {
  mkdirSync(dirname(resolve(ROOT, out)), { recursive: true });
  writeFileSync(resolve(ROOT, out), `${report}\n`, 'utf8');
  console.log(`\nЗаписано: ${out}`);
}

// Находки — не ошибка инструмента: код 0. Ненулевой код только на инструментальный сбой.
process.exitCode = 0;
