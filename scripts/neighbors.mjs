#!/usr/bin/env node
/**
 * neighbors (#469 ti-4): сводка активности СОСЕДНИХ сессий перед стартом работы —
 * только чтение существующих сигналов (координационные файлы НЕ вводятся,
 * карточка реестра остаётся единственным claim'ом; консилиум
 * agent-tooling-friction-2-2026-07-14, развилка ti-4).
 *
 * Usage: yarn neighbors [--hours N]   # default 4
 *
 * Показывает: коммиты origin/main за N часов · открытые PR · active-карточки
 * реестра за сегодня · свежие remote-ветки (24ч) · worktree-лист.
 * Триггер: коллизия скоупа #452/#454 (2026-07-14).
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function sh(cmd) {
  return execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function tryLines(fn, label) {
  try {
    const out = fn();
    return out ? out.split('\n').filter(Boolean) : [];
  } catch (e) {
    return [`(${label}: недоступно — ${String(e?.message ?? e).split('\n')[0].slice(0, 80)})`];
  }
}

/** Чистый рендер сводки из собранного среза (тестируется на фикстуре). */
export function renderNeighbors({ hours, commits, prs, cards, branches, worktrees }) {
  const section = (title, lines, empty) => [
    `## ${title}`,
    ...(lines.length ? lines.map((l) => `  ${l}`) : [`  ${empty}`]),
    '',
  ];
  return [
    `# neighbors — что делают соседние сессии`,
    '',
    ...section(`Коммиты origin/main за ${hours}ч`, commits, 'тихо — новых коммитов нет'),
    ...section('Открытые PR', prs, 'открытых PR нет'),
    ...section('Active-карточки реестра за сегодня', cards, 'сегодня карточек не регистрировали'),
    ...section('Свежие remote-ветки (24ч, кроме main)', branches, 'свежих веток нет'),
    ...section('Worktree', worktrees, 'только основной'),
    'Перед регистрацией своего спринта сверь пересечение СКОУПА (не только файлов) с карточками и PR выше.',
  ].join('\n');
}

/** Active-карточки, созданные сегодня (детерминированно из registry.json). */
export function todayActiveCards(registry, today) {
  return (registry.tasks ?? [])
    .filter((t) => t.status === 'active' && t.createdAt === today)
    .map((t) => `${t.id} (#${t.githubIssue ?? '—'}, ${t.size ?? '?'}) — ${String(t.title ?? '').slice(0, 90)}`);
}

const isMain = process.argv[1]?.endsWith('neighbors.mjs');
if (isMain) {
  const argv = process.argv.slice(2);
  const hoursIdx = argv.indexOf('--hours');
  const hours = hoursIdx >= 0 ? Number(argv[hoursIdx + 1]) || 4 : 4;

  try {
    sh('git fetch --quiet');
  } catch {
    console.error('(git fetch не прошёл — сводка по локальному состоянию remote-refs)');
  }

  const commits = tryLines(
    () => sh(`git log origin/main --since="${hours} hours ago" --pretty=format:"%h %s"`),
    'git log',
  );
  const prs = tryLines(() => {
    const raw = JSON.parse(sh('gh pr list --state open --json number,title,headRefName'));
    return raw.map((p) => `#${p.number} ${p.title} [${p.headRefName}]`).join('\n');
  }, 'gh pr list');
  const today = new Date().toISOString().slice(0, 10);
  let cards;
  try {
    // Реестр — из origin/main: локальная ветка может отставать от соседей.
    const registryRaw = (() => {
      try {
        return sh('git show origin/main:docs/tasks/registry.json');
      } catch {
        return readFileSync(join(root, 'docs/tasks/registry.json'), 'utf8');
      }
    })();
    cards = todayActiveCards(JSON.parse(registryRaw), today);
  } catch (e) {
    cards = [`(registry: недоступно — ${e?.message ?? e})`];
  }
  const branches = tryLines(
    () =>
      sh(
        'git for-each-ref refs/remotes/origin --sort=-committerdate --format="%(committerdate:relative)|%(refname:short)"',
      )
        .split('\n')
        .filter((l) => !/\|origin(\/(main|HEAD))?$/.test(l))
        .filter((l) => /(minute|hour|^\d+ seconds)/.test(l))
        .slice(0, 12)
        .map((l) => l.replace('|', ' — '))
        .join('\n'),
    'git for-each-ref',
  );
  const worktrees = tryLines(() => sh('git worktree list'), 'git worktree');

  console.log(renderNeighbors({ hours, commits, prs, cards, branches, worktrees }));
}
