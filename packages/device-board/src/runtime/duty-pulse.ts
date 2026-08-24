/**
 * Пульс дежурства (кусок C #2120, вердикт M1b заседания logging-observability-cut).
 *
 * У duty-записи собственный пульс раз в минуту (Т4): «проб пришло · шаг · места
 * осталось». Издаёт УЗЕЛ записи (не кабинет, не журнал как источник ритма — свой
 * таймер); лента локальная (ring); кабинет — optional read-model. Сам пульс в
 * картотеку не летит (Т6) — туда уезжает только его СБОЙ: переход alive→silent
 * рождает ровно одно происшествие (дедуп до выхода из silent).
 *
 * Числа 23.08 считались руками (1136 проб · шаг 5,26 с · буфер 788/1024 МБ) —
 * этот модуль даёт им хозяина по расписанию.
 */

export type DutyPulseSample = {
  /** epoch ms момента тика. */
  ts: number;
  /** Проб пришло с начала duty-окна (сбрасывается на start). */
  probesTotal: number;
  /** Средний шаг проб за последнюю минуту, сек; null если проб в окне < 2 (Т4/M1b). */
  stepS: number | null;
  /** Буфер media: занято/предел, МБ; null когда backend квоту буфера не ведёт. */
  mediaUsedMb: number | null;
  mediaCapMb: number | null;
};

export type DutyPulseState = 'ok' | 'stale' | 'silent';

export const PULSE_PERIOD_MS = 60_000;
export const PULSE_STALE_MS = 60_000;
export const PULSE_SILENT_MS = 120_000;

/** Состояние пульса по возрасту последнего тика (пороги 60/120 с, вердикт M1b). */
export function pulseState(
  lastSampleTs: number | null,
  nowMs: number,
  staleMs: number = PULSE_STALE_MS,
  silentMs: number = PULSE_SILENT_MS,
): DutyPulseState {
  if (lastSampleTs === null) return 'silent';
  const age = nowMs - lastSampleTs;
  if (age > silentMs) return 'silent';
  if (age > staleMs) return 'stale';
  return 'ok';
}

export interface DutyPulseMediaReader {
  (): { usedMb: number | null; capMb: number | null };
}

export interface DutyPulsePublisherOptions {
  readMedia: DutyPulseMediaReader;
  periodMs?: number;
  /** Ёмкость локальной ленты (ring): 180 тиков ≈ 3 часа дежурства. */
  ringSize?: number;
  /** Окно усреднения шага, мс. */
  stepWindowMs?: number;
  now?: () => number;
  /** Инъекция планировщика — детерминизм в тестах и свобода от setInterval в среде узла. */
  schedule?: (fn: () => void, ms: number) => unknown;
  cancel?: (handle: unknown) => void;
  /** Optional read-model: витрина дежурства подписывается на каждый тик. */
  onSample?: (sample: DutyPulseSample) => void;
}

export class DutyPulsePublisher {
  private readonly readMedia: DutyPulseMediaReader;

  private readonly periodMs: number;

  private readonly ringSize: number;

  private readonly stepWindowMs: number;

  private readonly now: () => number;

  private readonly scheduleFn: (fn: () => void, ms: number) => unknown;

  private readonly cancelFn: (handle: unknown) => void;

  private readonly onSample?: (sample: DutyPulseSample) => void;

  private ring: DutyPulseSample[] = [];

  private probeTimestamps: number[] = [];

  private probesTotal = 0;

  private timerHandle: unknown = null;

  constructor(options: DutyPulsePublisherOptions) {
    this.readMedia = options.readMedia;
    this.periodMs = options.periodMs ?? PULSE_PERIOD_MS;
    this.ringSize = options.ringSize ?? 180;
    this.stepWindowMs = options.stepWindowMs ?? 60_000;
    this.now = options.now ?? (() => Date.now());
    this.scheduleFn = options.schedule ?? ((fn, ms) => setInterval(fn, ms));
    this.cancelFn = options.cancel ?? ((h) => clearInterval(h as ReturnType<typeof setInterval>));
    this.onSample = options.onSample;
  }

  /** Старт duty-окна: счётчик проб обнуляется, таймер издания взводится. */
  start(): void {
    if (this.timerHandle !== null) this.stop();
    this.probesTotal = 0;
    this.probeTimestamps = [];
    this.timerHandle = this.scheduleFn(() => this.tick(), this.periodMs);
  }

  /** Стоп вместе с duty-записью: намеренная остановка ≠ тишина, тревоги нет. */
  stop(): void {
    if (this.timerHandle !== null) {
      this.cancelFn(this.timerHandle);
      this.timerHandle = null;
    }
  }

  isActive(): boolean {
    return this.timerHandle !== null;
  }

  /** Каждая записанная проба отмечается здесь (точки appendTrack узла). */
  notifyProbe(tsMs: number = this.now()): void {
    this.probesTotal += 1;
    this.probeTimestamps.push(tsMs);
    // держим хвост чуть шире окна усреднения
    const cutoff = tsMs - this.stepWindowMs * 2;
    for (;;) {
      const first = this.probeTimestamps[0];
      if (first === undefined || first >= cutoff) break;
      this.probeTimestamps.shift();
    }
  }

  /** Тик издания; отдельно вызывается тестами для детерминизма. */
  tick(nowMs: number = this.now()): DutyPulseSample {
    const media = this.readMedia();
    const sample: DutyPulseSample = {
      ts: nowMs,
      probesTotal: this.probesTotal,
      stepS: this.meanStepS(nowMs),
      mediaUsedMb: media.usedMb,
      mediaCapMb: media.capMb,
    };
    this.ring.push(sample);
    if (this.ring.length > this.ringSize) this.ring.shift();
    this.onSample?.(sample);
    return sample;
  }

  /** Локальная лента (ring) — величины во времени, не картотека. */
  getSamples(): readonly DutyPulseSample[] {
    return this.ring;
  }

  latest(): DutyPulseSample | null {
    return this.ring[this.ring.length - 1] ?? null;
  }

  private meanStepS(nowMs: number): number | null {
    const from = nowMs - this.stepWindowMs;
    const inWindow = this.probeTimestamps.filter((t) => t >= from && t <= nowMs);
    const first = inWindow[0];
    const last = inWindow[inWindow.length - 1];
    if (inWindow.length < 2 || first === undefined || last === undefined) return null;
    return (last - first) / (inWindow.length - 1) / 1000;
  }
}

export interface PulseSilenceDetectorOptions {
  staleMs?: number;
  silentMs?: number;
  /**
   * Переход alive→silent — РОВНО ОДНО происшествие на эпизод (дедуп, пока silent).
   * Сам доезд в картотеку — контракт куска B (#2119): подключается интеграцией
   * (Сентри — кусок E); детектор отвечает за факт и дедуп события.
   */
  onSilenceIncident: (info: { lastSampleTs: number | null; ageMs: number }) => void;
}

export class PulseSilenceDetector {
  private readonly staleMs: number;

  private readonly silentMs: number;

  private readonly onSilenceIncident: PulseSilenceDetectorOptions['onSilenceIncident'];

  private lastSampleTs: number | null = null;

  private silentReported = false;

  constructor(options: PulseSilenceDetectorOptions) {
    this.staleMs = options.staleMs ?? PULSE_STALE_MS;
    this.silentMs = options.silentMs ?? PULSE_SILENT_MS;
    this.onSilenceIncident = options.onSilenceIncident;
  }

  /** Каждый тик пульса проходит сюда; выход из silent взводит дедуп заново. */
  observeSample(tsMs: number): void {
    this.lastSampleTs = tsMs;
    this.silentReported = false;
  }

  /** Проверка по расписанию читателя (витрина/интеграция). */
  check(nowMs: number): DutyPulseState {
    const state = pulseState(this.lastSampleTs, nowMs, this.staleMs, this.silentMs);
    if (state === 'silent' && !this.silentReported) {
      this.silentReported = true;
      this.onSilenceIncident({
        lastSampleTs: this.lastSampleTs,
        ageMs: this.lastSampleTs === null ? Number.POSITIVE_INFINITY : nowMs - this.lastSampleTs,
      });
    }
    return state;
  }
}
