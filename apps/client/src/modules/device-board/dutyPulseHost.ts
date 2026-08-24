/**
 * Хост пульса дежурства на узле борда (кусок C #2120, вердикт M1b).
 *
 * Обвязка ядра @membrana/device-board (DutyPulsePublisher + PulseSilenceDetector):
 * издание раз в 60 с «проб пришло · шаг · места» на локальную ленту (ring + строка
 * scenarioChainLog), детекция тишины 60/120 с. Кабинет в издании НЕ участвует —
 * источники только локальные (счётчик проб узла, квота media-библиотеки).
 *
 * Сбой пульса (alive→silent, дедуп) сегодня фиксируется локально строкой
 * `duty-pulse silent-incident`; доезд события в картотеку по контракту куска B
 * подключит кусок E (Сентри) — картотеки до него не существует.
 */
import {
  DutyPulsePublisher,
  PulseSilenceDetector,
  PULSE_PERIOD_MS,
  type DutyPulseSample,
  type DutyPulseState,
} from '@membrana/device-board';
import { getDefaultMediaLibraryService } from '@membrana/media-library-service';
import { scenarioChainLog, scenarioRuntimeInfo } from './scenarioRuntimeInfoGate';

function readMediaBuffer(): { usedMb: number | null; capMb: number | null } {
  try {
    const quota = getDefaultMediaLibraryService().getSnapshot().quota;
    const toMb = (b: number | undefined): number | null =>
      typeof b === 'number' ? Math.round(b / 1048576) : null;
    return { usedMb: toMb(quota.bufferUsedBytes), capMb: toMb(quota.bufferLimitBytes) };
  } catch {
    return { usedMb: null, capMb: null };
  }
}

class DutyPulseHost {
  private publisher: DutyPulsePublisher | null = null;

  private detector: PulseSilenceDetector | null = null;

  private checkTimer: ReturnType<typeof setInterval> | null = null;

  /** Проба записана узлом: лениво стартует duty-окно пульса. */
  probe(): void {
    this.ensureStarted();
    this.publisher?.notifyProbe(Date.now());
  }

  /** Намеренный конец duty-записи: остановка ≠ тишина, тревоги нет. */
  stop(): void {
    if (this.publisher === null && this.checkTimer === null) return;
    this.publisher?.stop();
    if (this.checkTimer !== null) clearInterval(this.checkTimer);
    this.publisher = null;
    this.detector = null;
    this.checkTimer = null;
    scenarioChainLog('duty-pulse', 'stopped', {});
  }

  state(nowMs = Date.now()): DutyPulseState | 'inactive' {
    if (this.detector === null) return 'inactive';
    return this.detector.check(nowMs);
  }

  samples(): readonly DutyPulseSample[] {
    return this.publisher?.getSamples() ?? [];
  }

  latest(): DutyPulseSample | null {
    return this.publisher?.latest() ?? null;
  }

  private ensureStarted(): void {
    if (this.publisher !== null) return;
    const detector = new PulseSilenceDetector({
      onSilenceIncident: ({ lastSampleTs, ageMs }) => {
        // Лицо сбоя — локально; в картотеку уедет по контракту B через кусок E.
        scenarioChainLog('duty-pulse', 'silent-incident', {
          lastSampleTs: lastSampleTs === null ? null : new Date(lastSampleTs).toISOString(),
          ageS: Number.isFinite(ageMs) ? Math.round(ageMs / 1000) : null,
        });
        scenarioRuntimeInfo(
          '[duty-pulse] тишина пульса дежурства дольше порога — пульс не издаётся, запись сейчас не наблюдается',
        );
      },
    });
    const publisher = new DutyPulsePublisher({
      readMedia: readMediaBuffer,
      onSample: (sample) => {
        detector.observeSample(sample.ts);
        scenarioChainLog('duty-pulse', 'tick', {
          probesTotal: sample.probesTotal,
          stepS: sample.stepS === null ? null : Number(sample.stepS.toFixed(2)),
          mediaUsedMb: sample.mediaUsedMb,
          mediaCapMb: sample.mediaCapMb,
        });
      },
    });
    publisher.start();
    // Старт duty-окна — первый «вдох»: до первого тика издания тишины ещё нет,
    // иначе холодный check() выстрелил бы ложным silent-incident (ревью PR #2137, P2).
    detector.observeSample(Date.now());
    this.publisher = publisher;
    this.detector = detector;
    this.checkTimer = setInterval(() => {
      detector.check(Date.now());
    }, PULSE_PERIOD_MS);
    scenarioChainLog('duty-pulse', 'started', { periodMs: PULSE_PERIOD_MS });
  }
}

let defaultHost: DutyPulseHost | null = null;

export function getDutyPulseHost(): DutyPulseHost {
  if (defaultHost === null) defaultHost = new DutyPulseHost();
  return defaultHost;
}
