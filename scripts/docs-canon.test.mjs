/**
 * Тесты правил docs:verify-canon (#497).
 *
 * Главная ценность — НЕ ругаться на правдивые доки. Каждый кейс «не ошибка» —
 * реальное ложное срабатывание первой версии аудита 2026-07-15.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  findMissingCommands,
  findMissingScriptPaths,
  hasHonestMarker,
  isArchiveDoc,
  isCanonDoc,
} from './lib/docs-canon.mjs';

const scripts = new Set(['insight', 'comp:open', 'test:scripts', 'hackathon:close']);

// ─── что считаем каноном ──────────────────────────────────────────────────────────

test('канон: верхнеуровневые доки, регламенты, deploy, корневые правила', () => {
  for (const p of [
    'AGENTS.md',
    '.cursorrules',
    'docs/CONTRIBUTING.md',
    'docs/TASKS_MANAGEMENT.md',
    'docs/deploy/PANEL_DEPLOY.md',
    'docs/prompts/INSIGHT_REGULATION.md',
    'docs/prompts/TASK_PROMPT_WORKFLOW.md',
  ]) {
    assert.equal(isCanonDoc(p), true, p);
  }
});

test('архивы — НЕ канон: их правка = фальсификация истории', () => {
  for (const p of [
    'docs/day-sprint/repo-leveling-2026-06-27/CLOSURE.md',
    'docs/seanses/team-evening-feedback-2026-07-14.md',
    'docs/discussions/branch-x-code-review.md',
    'docs/insights/insight-sunrise-flash/INSIGHT.md',
    'docs/tasks/archive/vds-panel-tooling.md',
    'docs/reviews/x/y-review.md',
  ]) {
    assert.equal(isArchiveDoc(p), true, p);
    assert.equal(isCanonDoc(p), false, p);
  }
});

test('промпт конкретной задачи — не канон (описывает свой момент)', () => {
  assert.equal(isCanonDoc('docs/prompts/VDS_PANEL_TOOLING_PROMPT.md'), false);
});

// ─── честные пометки ──────────────────────────────────────────────────────────────

test('честная пометка распознаётся в любом регистре и форме', () => {
  assert.equal(hasHonestMarker('| `yarn comp:score` | **Не реализовано (бэклог)** |'), true);
  assert.equal(hasHonestMarker('`yarn hackathon:open` — Запланировано'), true);
  assert.equal(hasHonestMarker('`scripts/x.mjs` — **не существуют**'), true);
  assert.equal(hasHonestMarker('`yarn comp:open` (скрипт optional)'), true);
  assert.equal(hasHonestMarker('обычная строка про yarn build'), false);
});

test('строка с честной пометкой НЕ считается ошибкой', () => {
  // Живое ложное срабатывание: VDR_VALIDATION_SCOPE_BRIEF сам пишет «не существуют».
  const text = '`yarn comp:score --dry` | **Не реализовано (бэклог).** Проверить SCORECARD';
  assert.deepEqual(findMissingCommands(text, scripts), []);
  const paths = '- `scripts/validate-vdr-labels.mjs` (Kappa-скорер) — **не существуют**.';
  assert.deepEqual(findMissingScriptPaths(paths, () => false), []);
});

// ─── что ловим ────────────────────────────────────────────────────────────────────

test('несуществующая команда без пометки — ошибка с номером строки', () => {
  const text = 'первая\n| `yarn comp:score --id x` | Проверить арифметику |';
  const found = findMissingCommands(text, scripts);
  assert.equal(found.length, 1);
  assert.equal(found[0].command, 'comp:score');
  assert.equal(found[0].line, 2);
});

test('обещание — только команда В КОДЕ, проза не ловится', () => {
  // Живые ложные срабатывания: «(yarn download)» про скачивание пакетов и
  // «команда yarn ritual:evening:remote» в проектном брифе — это пересказ.
  assert.deepEqual(findMissingCommands('NAT душит пакеты к Cloudflare (yarn download).', scripts), []);
  assert.deepEqual(findMissingCommands('Возможность запуска: команда yarn ritual:evening:remote.', scripts), []);
  assert.equal(findMissingCommands('см. `yarn ritual:evening:remote`', scripts).length, 1);
});

test('глоб и плейсхолдер — шаблон, а не обещание команды', () => {
  // Живые: `yarn cabinet:*:prod`, `yarn studio:*`, `yarn competition:synthesis-<sprint>`.
  assert.deepEqual(findMissingCommands('не сохранять вывод `yarn cabinet:*:prod`', scripts), []);
  assert.deepEqual(findMissingCommands('Studio-сборка: `yarn studio:*`', scripts), []);
  assert.deepEqual(findMissingCommands('`yarn competition:synthesis-<sprint>`', scripts), []);
});

test('внутри fenced-блока команды ловятся без backticks', () => {
  const text = ['```bash', 'yarn comp:score --id x', '```'].join('\n');
  const found = findMissingCommands(text, scripts);
  assert.equal(found.length, 1);
  assert.equal(found[0].command, 'comp:score');
});

test('подкоманда существующего CLI — не ошибка, а двоеточная форма — ошибка', () => {
  // Живой баг INSIGHT_REGULATION: реально `yarn insight research`, док писал
  // `yarn insight:research` — функциональность есть, синтаксис в доке врал.
  assert.deepEqual(findMissingCommands('`yarn insight research <id>`', scripts), []);
  const bad = findMissingCommands('`yarn insight:research <id>`', scripts);
  assert.equal(bad.length, 1);
  assert.equal(bad[0].command, 'insight:research');
});

test('встроенные команды yarn и версии не ловятся', () => {
  assert.deepEqual(findMissingCommands('yarn install && yarn turbo run build', scripts), []);
  assert.deepEqual(findMissingCommands('используем yarn 4 (berry)', scripts), []);
  assert.deepEqual(findMissingCommands('yarn workspace @membrana/client dev', scripts), []);
});

test('хвостовая пунктуация прозы не делает команду несуществующей', () => {
  // «запусти yarn test:scripts.» — точка предложения, а не часть имени.
  assert.deepEqual(findMissingCommands('запусти yarn test:scripts.', scripts), []);
});

test('битая ссылка на скрипт ловится, существующая — нет', () => {
  const text = 'Локально: `scripts/_ssh-office-local-forward.mjs` слушает порт.';
  const found = findMissingScriptPaths(text, () => false);
  assert.equal(found.length, 1);
  assert.equal(found[0].path, 'scripts/_ssh-office-local-forward.mjs');
  assert.deepEqual(findMissingScriptPaths(text, () => true), []);
});

test('существующая команда не ловится', () => {
  assert.deepEqual(findMissingCommands('`yarn comp:open --id x` и `yarn hackathon:close`', scripts), []);
});
