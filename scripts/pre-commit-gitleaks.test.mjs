/**
 * Static contract for .githooks/pre-commit (#1002 / DRU-366):
 * gitleaks non-zero must abort; missing binary and SKIP_PRECOMMIT stay soft-skip.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hookBody = readFileSync(join(root, '.githooks', 'pre-commit'), 'utf8');

test('pre-commit: SKIP_PRECOMMIT=1 soft-skips', () => {
  assert.match(hookBody, /SKIP_PRECOMMIT.*=.*"1"/);
  assert.ok(hookBody.includes('SKIP_PRECOMMIT=1'));
});

test('pre-commit: missing gitleaks binary soft-skips', () => {
  assert.match(hookBody, /command -v gitleaks/);
  assert.match(hookBody, /if ! command -v gitleaks/);
});

test('pre-commit: gitleaks non-zero aborts (no blind OK)', () => {
  assert.match(hookBody, /gitleaks protect --staged --no-banner --redact/);
  const dollarQ = String.fromCharCode(36) + '?';
  assert.ok(
    hookBody.includes('gitleaks protect --staged --no-banner --redact || exit ' + dollarQ),
    'must pipe non-zero gitleaks into exit (Issue #1002)',
  );
  const okIdx = hookBody.indexOf('pre-commit: OK');
  const protectIdx = hookBody.indexOf('gitleaks protect --staged');
  assert.ok(okIdx > protectIdx, 'OK must come after protect');
  const between = hookBody.slice(protectIdx, okIdx);
  assert.ok(between.includes('|| exit'), 'OK must be unreachable after failed protect');
});

// ─── Контракт workflow скана (#1272 Ф1) ───────────────────────────────────────────────
// Эпизод 26.07: скан полной истории на КАЖДОЙ заявке валился из-за фикстуры в чужой
// ветке — файла, которого нет ни в общей ветке, ни в заявке. Блокировало всех подряд,
// а чинить приходилось не автору заявки. Заявка отвечает за свой диапазон.
const scanWorkflow = readFileSync(join(root, '.github', 'workflows', 'gitleaks.yml'), 'utf8');

test('gitleaks workflow: заявка сканируется по своему диапазону, не по всей истории', () => {
  assert.match(scanWorkflow, /Scan PR range/, 'шаг скана диапазона заявки существует');
  assert.match(scanWorkflow, /--log-opts=/, 'диапазон задан через log-opts');
  assert.ok(
    /if:\s*github\.event_name == 'pull_request'/.test(scanWorkflow),
    'скан диапазона привязан к событию заявки',
  );
});

test('gitleaks workflow: полная история осталась вне заявок (общая ветка и расписание)', () => {
  assert.match(scanWorkflow, /Scan full history/, 'полный скан не удалён — он уместен на общей ветке');
  assert.ok(
    /if:\s*github\.event_name != 'pull_request'/.test(scanWorkflow),
    'полный скан не гоняется на заявках',
  );
});

test('gitleaks workflow: baseline исключений сохранён (не заменён списком на лету)', () => {
  // Решение 26.07: разовый повод убирается заменой фикстуры, а не расширением исключений;
  // baseline остаётся тем, чем был — проверенными вручную находками 19.07.
  assert.ok(readFileSync(join(root, '.gitleaksignore'), 'utf8').length > 0);
});
