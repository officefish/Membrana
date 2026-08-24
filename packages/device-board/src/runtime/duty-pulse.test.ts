import { describe, expect, it, vi } from 'vitest';

import {
  DutyPulsePublisher,
  PulseSilenceDetector,
  pulseState,
  type DutyPulseSample,
} from './duty-pulse';

const T0 = 1_756_000_000_000;

function makePublisher(overrides: Partial<ConstructorParameters<typeof DutyPulsePublisher>[0]> = {}) {
  const samples: DutyPulseSample[] = [];
  const publisher = new DutyPulsePublisher({
    readMedia: () => ({ usedMb: 788, capMb: 1024 }),
    now: () => T0,
    schedule: () => ({}),
    cancel: () => undefined,
    onSample: (s) => samples.push(s),
    ...overrides,
  });
  return { publisher, samples };
}

describe('DutyPulsePublisher — издатель пульса дежурства (кусок C, вердикт M1b)', () => {
  it('тик издаёт «проб пришло · шаг · места» на локальную ленту, кабинет не участвует', () => {
    const { publisher, samples } = makePublisher();
    publisher.start();
    publisher.notifyProbe(T0 - 20_000);
    publisher.notifyProbe(T0 - 15_000);
    publisher.notifyProbe(T0 - 10_000);
    const s = publisher.tick(T0);
    expect(s.probesTotal).toBe(3);
    expect(s.stepS).toBe(5); // 10 с на 2 интервала
    expect(s.mediaUsedMb).toBe(788);
    expect(s.mediaCapMb).toBe(1024);
    expect(publisher.latest()).toEqual(s);
    expect(samples).toHaveLength(1); // optional read-model получил тот же сэмпл
  });

  it('шаг null, пока проб в минутном окне меньше двух (M1b)', () => {
    const { publisher } = makePublisher();
    publisher.start();
    expect(publisher.tick(T0).stepS).toBeNull();
    publisher.notifyProbe(T0 - 5_000);
    expect(publisher.tick(T0).stepS).toBeNull();
    // старые пробы за окном минуты в шаг не входят
    publisher.notifyProbe(T0 - 300_000);
    expect(publisher.tick(T0).stepS).toBeNull();
  });

  it('probesTotal накоплен с начала duty-окна и обнуляется новым start', () => {
    const { publisher } = makePublisher();
    publisher.start();
    publisher.notifyProbe(T0);
    publisher.notifyProbe(T0);
    expect(publisher.tick(T0).probesTotal).toBe(2);
    publisher.start(); // новое duty-окно
    expect(publisher.tick(T0).probesTotal).toBe(0);
  });

  it('лента — ring: старые тики вытесняются, издание не растёт без предела', () => {
    const { publisher } = makePublisher({ ringSize: 3 });
    publisher.start();
    for (let i = 0; i < 5; i += 1) publisher.tick(T0 + i * 60_000);
    expect(publisher.getSamples()).toHaveLength(3);
    expect(publisher.getSamples()[0].ts).toBe(T0 + 2 * 60_000);
  });

  it('start взводит собственный таймер узла с периодом 60 с; stop снимает (не тишина)', () => {
    const schedule = vi.fn(() => ({ h: 1 }));
    const cancel = vi.fn();
    const { publisher } = makePublisher({ schedule, cancel });
    publisher.start();
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), 60_000);
    expect(publisher.isActive()).toBe(true);
    publisher.stop();
    expect(cancel).toHaveBeenCalled();
    expect(publisher.isActive()).toBe(false);
  });

  it('media-квота без буферных полей → null, тик не падает', () => {
    const { publisher } = makePublisher({ readMedia: () => ({ usedMb: null, capMb: null }) });
    publisher.start();
    const s = publisher.tick(T0);
    expect(s.mediaUsedMb).toBeNull();
    expect(s.mediaCapMb).toBeNull();
  });
});

describe('pulseState — пороги 60/120 с', () => {
  it('ok ≤ 60 c < stale ≤ 120 c < silent; нет тиков вовсе — silent', () => {
    expect(pulseState(T0, T0 + 59_000)).toBe('ok');
    expect(pulseState(T0, T0 + 61_000)).toBe('stale');
    expect(pulseState(T0, T0 + 121_000)).toBe('silent');
    expect(pulseState(null, T0)).toBe('silent');
  });
});

describe('PulseSilenceDetector — сбой пульса в картотеку, сам пульс — нет (Т6)', () => {
  it('переход alive→silent рождает РОВНО одно происшествие, дедуп до выхода из silent', () => {
    const onSilenceIncident = vi.fn();
    const d = new PulseSilenceDetector({ onSilenceIncident });
    d.observeSample(T0);
    expect(d.check(T0 + 30_000)).toBe('ok');
    expect(d.check(T0 + 90_000)).toBe('stale');
    expect(onSilenceIncident).not.toHaveBeenCalled(); // при нормальном/степенном тике — ничего
    expect(d.check(T0 + 121_000)).toBe('silent');
    expect(d.check(T0 + 200_000)).toBe('silent');
    expect(d.check(T0 + 300_000)).toBe('silent');
    expect(onSilenceIncident).toHaveBeenCalledTimes(1); // повторные минуты тишины карточек не плодят
    expect(onSilenceIncident).toHaveBeenCalledWith({ lastSampleTs: T0, ageMs: 121_000 });
  });

  it('выход из silent взводит дедуп заново — следующий эпизод тишины снова виден', () => {
    const onSilenceIncident = vi.fn();
    const d = new PulseSilenceDetector({ onSilenceIncident });
    d.observeSample(T0);
    d.check(T0 + 121_000);
    d.observeSample(T0 + 130_000); // пульс ожил
    expect(d.check(T0 + 131_000)).toBe('ok');
    d.check(T0 + 130_000 + 121_000);
    expect(onSilenceIncident).toHaveBeenCalledTimes(2);
  });

  it('при живом тике происшествий нет вовсе (DoD 4: пульс в картотеку не летит)', () => {
    const onSilenceIncident = vi.fn();
    const d = new PulseSilenceDetector({ onSilenceIncident });
    for (let i = 0; i < 10; i += 1) {
      d.observeSample(T0 + i * 60_000);
      expect(d.check(T0 + i * 60_000 + 30_000)).toBe('ok');
    }
    expect(onSilenceIncident).not.toHaveBeenCalled();
  });
});
