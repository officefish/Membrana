import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const HERE = fileURLToPath(new URL('./', import.meta.url));
const CLIENT_SRC = join(HERE, '..', '..');

const PLUGIN = readFileSync(join(CLIENT_SRC, 'plugins', 'mic-buffer-recorder', 'micBufferRecorderPlugin.ts'), 'utf8');
const BOARD = readFileSync(join(CLIENT_SRC, 'modules', 'device-board', 'scenarioMicJournalBridge.ts'), 'utf8');
const RUNTIME_BRIDGE = readFileSync(join(CLIENT_SRC, 'lib', 'runtimeRealtimeBridge.ts'), 'utf8');
const NODE_CLIENT = readFileSync(join(CLIENT_SRC, 'lib', 'nodeRealtimeClient.ts'), 'utf8');
const HOLD = readFileSync(join(HERE, 'deviceOverflowHold.ts'), 'utf8');

/**
 * Структурный зуб M3 DoD 6 (#2309): доска и плагин микрофона не содержат второй копии машины
 * стопа — только вызовы носителя. Порча «завести свой флаг в адаптере» → красный.
 */
describe('одна машина удержания на два входа — структурно', () => {
  const adapters: ReadonlyArray<[string, string]> = [
    ['mic plugin', PLUGIN],
    ['device-board bridge', BOARD],
  ];

  it.each(adapters)('%s зовёт носитель: isHeld/refuseStart через getDeviceOverflowHold', (_name, src) => {
    expect(src).toContain('getDeviceOverflowHold');
    expect(src).toMatch(/refuseStart\(\{ source: '(mic|board)'/u);
  });

  it.each(adapters)('%s не хранит свой флаг удержания и свой overflowId', (_name, src) => {
    expect(src).not.toMatch(/(let|private)\s+\w*(Held|held|Hold)\w*\s*[:=]\s*(false|true|null)/u);
    expect(src).not.toMatch(/bufferStoppedPermanently|overflowStopped|bufferFullStop/u);
    // Своё поле/переменная с id эпизода — вторая память; ключ в строке лога — нет.
    expect(src).not.toMatch(/(let|const|var|private|readonly)\s+\w*overflowId\w*\s*[:=]/u);
    expect(src).not.toContain('localStorage');
    expect(src).not.toContain('activateFrom');
  });

  it.each(adapters)('%s не возобновляет и не сбрасывает удержание сам', (_name, src) => {
    expect(src).not.toMatch(/\.release\(/u);
  });

  it('носитель — единственное место, где активируется и снимается удержание', () => {
    expect(HOLD).toContain('activateFromServer(');
    expect(HOLD).toContain('activateFromLocalGuard(');
    expect(HOLD).toContain('release(by: HoldReleaseBy)');
  });

  it('канал узла об удержании не знает: heartbeat нельзя погасить «вместо» отправки (T16)', () => {
    expect(NODE_CLIENT).not.toMatch(/overflow|OverflowHold|isHeld/u);
    expect(RUNTIME_BRIDGE).not.toMatch(/clearHeartbeatTimer|disconnect\(\)/u);
  });

  it('копия словаря причин — только в stubs/ и localGuard (стаб), не в адаптерах', () => {
    expect(PLUGIN).not.toMatch(/'device_buffer_full'|'user_storage_full'/u);
    expect(BOARD).not.toMatch(/'device_buffer_full'|'user_storage_full'/u);
  });
});
