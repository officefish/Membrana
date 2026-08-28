import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { stopDecision } from '@membrana/media-library-service';

const HERE = fileURLToPath(new URL('./', import.meta.url));
const PANEL = readFileSync(join(HERE, 'MicBufferRecorderPanel.tsx'), 'utf8');
const STATE = readFileSync(join(HERE, 'micBufferRecorderPluginState.ts'), 'utf8');
const PLUGIN = readFileSync(join(HERE, 'micBufferRecorderPlugin.ts'), 'utf8');
const TYPES = readFileSync(join(HERE, 'types.ts'), 'utf8');

const MB = 1048576;

describe('порог → stop → сигнал: один verdict для state, recorder и панели', () => {
  it('state считает stopDecision с выбранной политикой, а панель не копирует порог', () => {
    expect(STATE).toContain('this.bufferVerdict = this.makeStopDecision()');
    expect(STATE).toContain('policy: this.bufferPolicy');
    expect(PANEL).toContain('snapshot.bufferVerdict.say');
    expect(PANEL).not.toContain('stopDecision(');
  });

  it('активная запись гасится по stop-verdict, а не только по полной квоте', () => {
    expect(PLUGIN).toContain("verdict.action === 'stop'");
    expect(PLUGIN).toContain('const holding = payload.recordingBlocked || verdict.action === \'stop\'');
    expect(PLUGIN).toContain('void finishActiveRecorder(\'error\')');
  });

  it('новый старт отбивается тем же stop-verdict до следующего сегмента', () => {
    expect(PLUGIN).toContain("if (snap.bufferVerdict.action === 'stop') {");
    expect(PLUGIN).toContain('micBufferRecorderPluginState.setError(snap.bufferVerdict.say)');
    expect(PLUGIN).toContain('if (!canStartRecording(humanRestart) || !currentStream) return;');
  });

  it('наружный сигнал — плашка verdict.say с причиной и остатком', () => {
    expect(PANEL).toContain('stopVerdictActive || pressureWarningActive');
    expect(PANEL).toContain('role="alert"');
    const v = stopDecision({ usedBytes: 1020 * MB, limitBytes: 1024 * MB }, { policy: 'stop', what: 'сценарий дежурства' });
    expect(v.say).toMatch(/Остановлено насовсем: сценарий дежурства/u);
    expect(v.say).toMatch(/Буфер заполнен/u);
    expect(v.say).toMatch(/свободно/u);
  });
});

describe('насовсем: освобождение места не запускает сценарий само', () => {
  it('recorder хранит permanent hold до humanRestart', () => {
    expect(PLUGIN).toContain('let bufferStoppedPermanently = false');
    expect(PLUGIN).toContain('bufferStoppedPermanently && !humanRestart');
    expect(PLUGIN).toContain('bufferStoppedPermanently && humanRestart');
  });

  it('после quota update нет авто-resume через schedulePauseThenNextSegment', () => {
    const quotaHandler = PLUGIN.slice(PLUGIN.indexOf('const unsubQuota = subscribeMediaLibraryQuotaUpdated'));
    expect(quotaHandler).not.toContain('if (runtimeMode === \'auto\' && !activeRecorder) schedulePauseThenNextSegment()');
    expect(quotaHandler).toContain('bufferStoppedPermanently = true');
  });

  it('ручной restart назван в слове, resumable:true запрещён', () => {
    expect(STATE).not.toContain('resumable');
    expect(PLUGIN).not.toContain('bufferHold');
    const v = stopDecision({ usedBytes: 1020 * MB, limitBytes: 1024 * MB }, { policy: 'stop' });
    expect(v.restart).toBe('manual');
    expect(v.say).toMatch(/запустите сценарий рукой/u);
  });
});

describe('режимы взаимоисключающие', () => {
  it('конфиг имеет одну policy: auto-cleanup или stop', () => {
    expect(TYPES).toContain("bufferPolicy: 'auto-cleanup'");
    expect(TYPES).toContain("raw?.bufferPolicy === 'stop' ? 'stop' : 'auto-cleanup'");
    expect(STATE).toContain('readonly bufferPolicy');
  });

  it('выбор auto-cleanup не ставит stop even at threshold', () => {
    const v = stopDecision({ usedBytes: 973 * MB, limitBytes: 1024 * MB }, { policy: 'auto-cleanup' });
    expect(v.autoCleanupDue).toBe(true);
    expect(v.action).not.toBe('stop');
  });

  it('stop-ветка не вызывает очистку буфера', () => {
    expect(PLUGIN).not.toMatch(/requestClearMediaLibraryBuffer|executeBufferCleanup|planBufferCleanup/u);
    expect(PANEL).toContain("patchConfig({ bufferPolicy: 'stop' })");
    expect(PANEL).toContain("patchConfig({ bufferPolicy: 'auto-cleanup' })");
  });
});
