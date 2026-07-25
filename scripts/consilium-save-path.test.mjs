import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';

// Импорт БЕЗ запуска консилиума — гард #1051 (`process.argv[1]?.endsWith('consilium.mjs')`).
// Если гард сломан, этот import прогнал бы прогон (сеть/деньги) и тест бы завис/упал.
import { seanseModelLabel, seansePlan, wrapSeanseFile } from './consilium.mjs';

const CHAIN = 'anthropic/claude-sonnet-4-6 → xai/grok-4.5 → openrouter/anthropic/claude-sonnet-4.6';

// --- три ветки звеньев (метка модели) ---

test('#1051 звено 1 ответило → метка = имя первого звена', () => {
  assert.equal(seanseModelLabel({ answeredBy: 'anthropic/claude-sonnet-4-6', chainLabel: CHAIN }), 'anthropic/claude-sonnet-4-6');
});

test('#1051 звено 2 (fallback) ответило → метка = имя второго звена', () => {
  assert.equal(seanseModelLabel({ answeredBy: 'xai/grok-4.5', chainLabel: CHAIN }), 'xai/grok-4.5');
});

test('#1051 РЕГРЕССИЯ: никто не ответил → метка = chainLabel, БЕЗ ReferenceError', () => {
  // Ровно точка падения M0 tasks-workshop 23.07: до PR #1032 здесь стояла переменная `model`,
  // которой нет → `ReferenceError: model is not defined` ПОСЛЕ 28 реплик. Тест ловит этот класс.
  assert.doesNotThrow(() => seanseModelLabel({ answeredBy: null, chainLabel: CHAIN }));
  assert.equal(seanseModelLabel({ answeredBy: null, chainLabel: CHAIN }), CHAIN);
});

// --- обе ветки записи (seanses/ vs rejected/) ---

test('#1051 гейт чист → запись в docs/seanses/ (принят)', () => {
  const p = seansePlan({ answeredBy: 'xai/grok-4.5', chainLabel: CHAIN, rejected: false, relPath: 'docs/seanses/x-m0.md', cwd: '/repo' });
  assert.equal(p.rejected, false);
  assert.equal(p.targetPath, resolve('/repo', 'docs/seanses/x-m0.md'));
  assert.equal(p.model, 'xai/grok-4.5');
});

test('#1051 гейт заседания упал → запись в docs/seanses/rejected/ (черновик, НЕ протокол)', () => {
  const p = seansePlan({ answeredBy: null, chainLabel: CHAIN, rejected: true, relPath: 'docs/seanses/x-m0.md', cwd: '/repo' });
  assert.equal(p.rejected, true);
  assert.equal(p.targetPath, resolve('/repo', 'docs/seanses/rejected', 'x-m0.md'));
  // метка не обращается к переменным вне области видимости даже на упавшем гейте:
  assert.equal(p.model, CHAIN);
});

// --- save-path исполняется: wrapSeanseFile строит тело с меткой ---

test('#1051 wrapSeanseFile кладёт метку модели в метаданные (обе ветки звеньев)', () => {
  const bodyAnswered = wrapSeanseFile({
    body: '[Teamlead]: ок', question: 'Q', orderedRoles: ['Teamlead'],
    model: seanseModelLabel({ answeredBy: 'xai/grok-4.5', chainLabel: CHAIN }), relPath: 'docs/seanses/x.md',
  });
  assert.match(bodyAnswered, /\| Модель \| xai\/grok-4\.5 \|/u);

  const bodyNone = wrapSeanseFile({
    body: '[Teamlead]: ок', question: 'Q', orderedRoles: ['Teamlead'],
    model: seanseModelLabel({ answeredBy: null, chainLabel: CHAIN }), relPath: 'docs/seanses/x.md',
  });
  assert.ok(bodyNone.includes(`| Модель | ${CHAIN} |`), 'ветка «никто не ответил» пишет chainLabel без ошибки');
});
