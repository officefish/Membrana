import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEVICE_HINTS, MEASURED_FIELDS, SILENCE_PEAK_DBFS,
  buildDeclared, buildMeta, measureWav, parseArgs, parseAudioDevices, pickFieldDevice,
} from './field-capture.mjs';

const LIST = [
  '[in#0 @ 0x1] "Integrated Camera" (video)',
  '[in#0 @ 0x1]   Alternative name "@device_pnp_\\\\?\\usb#vid_5986"',
  '[in#0 @ 0x1] "Analogue 1 + 2 (Focusrite USB Audio)" (audio)',
  '[in#0 @ 0x1]   Alternative name "@device_cm_{33D9}\\wave_{F5E2}"',
  '[in#0 @ 0x1] "Микрофон (Intel Smart Sound)" (audio)',
  '[in#0 @ 0x1]   Alternative name "@device_cm_{33D9}\\wave_{A8D5}"',
].join('\r\n');

/** @param {{rate?:number, channels?:number, seconds?:number, amp?:number}} o */
function makeWav({ rate = 44100, channels = 1, seconds = 1, amp = 0 } = {}) {
  const frames = Math.round(rate * seconds);
  const data = Buffer.alloc(frames * channels * 2);
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * amp), (i * channels + c) * 2);
    }
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * channels * 2, 28);
  h.writeUInt16LE(channels * 2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

test('parseAudioDevices: имя и адрес берутся парой, видео пропускается', () => {
  const devices = parseAudioDevices(LIST);
  assert.equal(devices.length, 2, 'только звуковые входы');
  assert.equal(devices[0].name, 'Analogue 1 + 2 (Focusrite USB Audio)');
  assert.match(devices[0].address, /^@device_cm_/u);
  assert.ok(!devices.some((d) => d.name.includes('Camera')), 'камера не звуковой вход');
});

test('pickFieldDevice: полевой вход опознаётся по имени, а не по порядку', () => {
  const devices = parseAudioDevices(LIST);
  assert.equal(pickFieldDevice(devices)?.name, 'Analogue 1 + 2 (Focusrite USB Audio)');
  assert.equal(pickFieldDevice([{ name: 'Realtek', address: 'x' }]), null, 'чужой вход не выдаётся за полевой');
  assert.ok(DEVICE_HINTS.length > 0);
});

test('pickFieldDevice: адрес не подставляется из памяти — он берётся из живого перечня', () => {
  const before = parseAudioDevices(LIST);
  const after = parseAudioDevices(LIST.replace('wave_{F5E2}', 'wave_{NEW1}'));
  assert.notEqual(pickFieldDevice(before)?.address, pickFieldDevice(after)?.address,
    'смена адреса устройством обязана отражаться — иначе запись молча даст тишину');
});

test('measureWav: тишина и сигнал различаются вердиктом, а не на глаз', () => {
  const silent = measureWav(makeWav({ amp: 0 }));
  const loud = measureWav(makeWav({ amp: 12000 }));
  assert.ok(silent.peakDbfs < SILENCE_PEAK_DBFS, 'нулевой сигнал ниже порога тишины');
  assert.ok(loud.peakDbfs > SILENCE_PEAK_DBFS, 'заметный сигнал выше порога');
  assert.ok(loud.rmsDbfs > silent.rmsDbfs);
});

test('measureWav: свойства читаются из файла, а не принимаются на слово', () => {
  const m = measureWav(makeWav({ rate: 48000, channels: 2, seconds: 2, amp: 5000 }));
  assert.equal(m.sampleRate, 48000);
  assert.equal(m.channels, 2);
  assert.ok(Math.abs(m.seconds - 2) < 0.01);
});

test('buildMeta: измеряемые поля в объявленное не попадают НИКОГДА', () => {
  const meta = buildMeta(parseArgs(['--what', 'drone', '--distance', '50']), 'stamp');
  for (const field of MEASURED_FIELDS) {
    assert.ok(!(field in meta), `${field} обязано мериться сервером, а не объявляться`);
  }
  assert.match(meta.notes, /снимали: drone/u);
  assert.match(meta.notes, /дистанция: 50 м/u);
});

test('buildDeclared: пустое объявление называется словом, а не молчит', () => {
  assert.equal(buildDeclared(parseArgs([])), 'объявленное не заполнено');
});

test('parseArgs: частота по умолчанию — поддерживаемая устройством', () => {
  assert.equal(parseArgs([]).rate, 44100, '48000 через этот драйвер даёт тишину (находка 16.08)');
  assert.equal(parseArgs(['--dry-run']).dryRun, true);
  assert.throws(() => parseArgs(['--нет-такого']), /неизвестный флаг/u);
});
