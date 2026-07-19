/**
 * #622 — карта кодов возврата + гард на недокументированный ненулевой код.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { stepStatus, isFinding } from './lib/step-status.mjs';
import {
  assertDocumentedExitCode,
  checkEveningCoverage,
  classifyExitCode,
  loadRitualExitCodesMap,
  reconcileEveningFindings,
} from './lib/ritual-exit-codes.mjs';

const map = loadRitualExitCodesMap();

describe('ritual-exit-codes map (#622)', () => {
  it('каждый шаг evening-манифеста есть в карте (сирот нет)', () => {
    const cov = checkEveningCoverage(map);
    assert.deepEqual(cov.missingInMap, [], `нет в карте: ${cov.missingInMap.join(', ')}`);
    assert.deepEqual(cov.orphansInMap, [], `сироты карты: ${cov.orphansInMap.join(', ')}`);
    assert.equal(cov.ok, true);
  });

  it('каждый ненулевой код вечера — failure или finding (не undefined в карте)', () => {
    const evening = map.chains.evening.steps;
    for (const [stepId, step] of Object.entries(evening)) {
      for (const [code, entry] of Object.entries(step.codes ?? {})) {
        if (code === '0') {
          assert.equal(entry.bucket, 'ok', `${stepId} exit 0 → ok`);
          continue;
        }
        assert.ok(
          entry.bucket === 'failure' || entry.bucket === 'finding',
          `${stepId} exit ${code}: bucket=${entry.bucket}`,
        );
        assert.ok(entry.meaning?.trim(), `${stepId} exit ${code}: пустой meaning`);
      }
    }
  });

  it('findingExitCodes манифеста ↔ карта (reconcile)', () => {
    const r = reconcileEveningFindings(map);
    assert.equal(r.ok, true, r.mismatches.join('\n'));
  });

  it('day + night chains присутствуют в карте (не пустые)', () => {
    assert.ok(Object.keys(map.chains.day.steps).length >= 5);
    assert.ok(Object.keys(map.chains.night.steps).length >= 3);
  });

  it('undefinedDebt — непустой список долга (предъявить, не чинить)', () => {
    assert.ok(Array.isArray(map.undefinedDebt));
    assert.ok(map.undefinedDebt.length >= 1);
    for (const d of map.undefinedDebt) {
      assert.ok(d.id && d.script && d.note);
    }
  });
});

describe('assertDocumentedExitCode guard', () => {
  it('exit 0 всегда проходит', () => {
    assert.deepEqual(assertDocumentedExitCode(map, 'evening', 'insight-drift', 0), { ok: true });
  });

  it('документированный finding/failure проходит', () => {
    assert.equal(assertDocumentedExitCode(map, 'evening', 'insight-drift', 3).entry.bucket, 'finding');
    assert.equal(assertDocumentedExitCode(map, 'evening', 'code-review', 1).entry.bucket, 'failure');
  });

  it('ЖИВОЕ ПАДЕНИЕ: недокументированный код бросает', () => {
    assert.throws(
      () => assertDocumentedExitCode(map, 'evening', 'insight-drift', 99),
      (err) => {
        assert.match(String(err.message), /недокументированный exit 99/);
        assert.equal(err.undocumented, true);
        return true;
      },
    );
  });

  it('шаг вне карты + ненулевой → throw', () => {
    assert.throws(() => assertDocumentedExitCode(map, 'evening', 'no-such-step', 1), /недокументированный/);
  });
});

describe('findingExitCodes ↔ stepStatus', () => {
  it('каждый finding вечера: isFinding + stepStatus=ok; exit 1 остаётся сбоем', () => {
    const evening = map.chains.evening.steps;
    for (const [stepId, stepMap] of Object.entries(evening)) {
      const findings = stepMap.findingExitCodes ?? [];
      for (const code of findings) {
        const step = {
          id: stepId,
          criticality: 'noncritical',
          findingExitCodes: findings,
        };
        const outcome = { ran: true, exitCode: code };
        assert.equal(isFinding(step, outcome), true, `${stepId} exit ${code}`);
        assert.equal(stepStatus(step, outcome), 'ok', `${stepId} exit ${code} → ok`);
        assert.equal(classifyExitCode(map, 'evening', stepId, code)?.bucket, 'finding');
      }
      // регрессия: настоящая ошибка 1
      if (stepMap.codes?.['1']?.bucket === 'failure') {
        const step = { id: stepId, criticality: 'critical', findingExitCodes: findings };
        assert.equal(isFinding(step, { ran: true, exitCode: 1 }), false);
        assert.equal(stepStatus(step, { ran: true, exitCode: 1 }), 'failed-critical');
      }
    }
  });
});
