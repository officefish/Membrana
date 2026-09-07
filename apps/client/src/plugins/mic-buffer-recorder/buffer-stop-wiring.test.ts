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

describe('порог → stop → сигнал: один verdict для state и панели (#2204/#2214)', () => {
  it('state считает stopDecision с выбранной политикой, а панель не копирует порог', () => {
    expect(STATE).toContain('this.bufferVerdict = this.makeStopDecision()');
    expect(STATE).toContain('policy: this.bufferPolicy');
    expect(PANEL).toContain('snapshot.bufferVerdict.say');
    expect(PANEL).not.toContain('stopDecision(');
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

/**
 * #2309, M3 (г): решение «стоп» и память «уже остановлен» живут в ОДНОМ носителе
 * `DeviceOverflowHold`; плагин — вызовы носителя, не вторая машина.
 */
describe('плагин — тонкий адаптер носителя удержания (#2309)', () => {
  it('старт и гашение идут через носитель: refuseStart / subscribe / applyLocalGuardFromQuota', () => {
    expect(PLUGIN).toContain("from '../../lib/device-overflow-hold'");
    expect(PLUGIN).toContain("hold.refuseStart({ source: 'mic'");
    expect(PLUGIN).toContain('hold.subscribe(');
    expect(PLUGIN).toContain('applyLocalGuardFromQuota(');
    expect(PLUGIN).toContain("cancelActiveRecorder('overflow-hold')");
  });

  it('второй машины нет: ни локального флага удержания, ни своего overflowId, ни ручного restart (порча → красный)', () => {
    expect(PLUGIN).not.toMatch(/bufferStoppedPermanently|bufferHold\b|overflowStopped|heldByBuffer/u);
    expect(PLUGIN).not.toMatch(/let\s+\w*[hH]eld\w*\s*=/u);
    expect(PLUGIN).not.toMatch(/overflowId\s*=/u);
    expect(PLUGIN).not.toContain('humanRestart');
    expect(PLUGIN).not.toContain("bufferVerdict.action === 'stop'");
    expect(STATE).not.toContain('resumable');
  });

  it('активная запись при удержании НЕ дописывается в отправку: гашение — cancel, не finish', () => {
    const quench = PLUGIN.slice(PLUGIN.indexOf('const quenchForOverflowHold'), PLUGIN.indexOf('const canStartRecording'));
    expect(quench).toContain("cancelActiveRecorder('overflow-hold')");
    expect(quench).not.toContain('finishActiveRecorder');
  });

  it('обработчик квоты не гасит и не возобновляет сам — только страж в носитель', () => {
    const quotaHandler = PLUGIN.slice(
      PLUGIN.indexOf('const unsubQuota = subscribeMediaLibraryQuotaUpdated'),
      PLUGIN.indexOf('const unsubHold'),
    );
    expect(quotaHandler).toContain('applyLocalGuardFromQuota(');
    expect(quotaHandler).not.toContain('schedulePauseThenNextSegment');
    expect(quotaHandler).not.toContain('release(');
    expect(quotaHandler).not.toContain('finishActiveRecorder');
  });

  it('политику носитель берёт у читателя B (мост buffer-policy-bridge), а не у конфига плагина', () => {
    expect(PLUGIN).toContain("from '../../lib/buffer-policy-bridge'");
    const guardCall = PLUGIN.slice(PLUGIN.indexOf('applyLocalGuardFromQuota('), PLUGIN.indexOf('const unsubHold'));
    expect(guardCall).toContain('getEffectiveOverflowPolicy()');
    expect(guardCall).not.toContain('cfg.bufferPolicy');
    expect(guardCall).not.toContain('Stub');
  });
});

/**
 * BC-2 (контракт интеграции `cowork-buffer-full-stop`): плагин — ЗЕРКАЛО политики B, не хозяин.
 * Порчи → красный: дефолт `'auto-cleanup'` вернулся в конфиг/состояние; панель снова патчит
 * `bufferPolicy`; зеркало не подписано на читателя.
 */
describe('зеркало политики B: плагин не хозяин bufferPolicy', () => {
  it('в конфиге плагина политики нет, умолчания автоочистки нет нигде (судится код, не комментарии)', () => {
    const code = (src: string) => src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/u.test(l)).join('\n');
    expect(code(TYPES)).not.toMatch(/bufferPolicy/u);
    expect(code(TYPES)).not.toContain('auto-cleanup');
    expect(code(STATE)).not.toContain("'auto-cleanup'");
    expect(code(PANEL)).not.toContain('auto-cleanup');
    expect(STATE).toContain("bufferPolicy: BufferPressurePolicy = 'stop'");
  });

  it('слово панели — от читателя: состояние подписано на мост, панель не патчит политику', () => {
    expect(PLUGIN).toContain('subscribeEffectiveOverflowPolicy(');
    expect(PLUGIN).toContain('setBufferPolicy(getEffectiveOverflowPolicy())');
    expect(STATE).toContain('readonly bufferPolicy');
    expect(PANEL).not.toMatch(/patchConfig\(\{\s*bufferPolicy/u);
    expect(PANEL).toContain('mic-buffer-policy-mirror');
  });

  it('smart_cleanup для вердикта до T12 = «не стоп», stop = стоп на 95%', () => {
    const smart = stopDecision({ usedBytes: 973 * MB, limitBytes: 1024 * MB }, { policy: 'smart_cleanup' });
    expect(smart.autoCleanupDue).toBe(true);
    expect(smart.action).not.toBe('stop');
    const stop = stopDecision({ usedBytes: 973 * MB, limitBytes: 1024 * MB }, { policy: 'stop' });
    expect(stop.action).toBe('stop');
  });

  it('stop-ветка не вызывает очистку буфера', () => {
    expect(PLUGIN).not.toMatch(/requestClearMediaLibraryBuffer|deleteSamplesByIds|planBufferCleanup/u);
  });
});
