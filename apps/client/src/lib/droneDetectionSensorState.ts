import {
  subscribeDroneDetection,
  type DroneDetectionEvent,
} from './droneDetectionHub';

export type DroneSensorPhase = 'idle' | 'active' | 'fading';

export const DRONE_SENSOR_HOLD_MS = 4_000;
export const DRONE_SENSOR_FADE_MS = 3_000;

export interface DroneDetectionSensorSnapshot {
  readonly phase: DroneSensorPhase;
  readonly lastEvent: DroneDetectionEvent | null;
  /** 0…1 для opacity / scale в UI */
  readonly intensity: number;
  /** 1 → 0, обратный отсчёт за цикл hold + fade */
  readonly progress: number;
}

export const DRONE_SENSOR_CYCLE_MS = DRONE_SENSOR_HOLD_MS + DRONE_SENSOR_FADE_MS;

type DroneDetectionSubscribe = typeof subscribeDroneDetection;

export class DroneDetectionSensorState {
  private phase: DroneSensorPhase = 'idle';
  private lastEvent: DroneDetectionEvent | null = null;
  private detectedAt: number | null = null;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private readonly listeners = new Set<() => void>();
  private snapshotCache: DroneDetectionSensorSnapshot = this.buildSnapshot();
  private readonly unsubscribeHub: () => void;

  constructor(subscribe: DroneDetectionSubscribe = subscribeDroneDetection) {
    this.unsubscribeHub = subscribe((event) => this.onDetected(event));
  }

  dispose(): void {
    this.clearHoldTimer();
    this.stopProgressTick();
    this.unsubscribeHub();
    this.listeners.clear();
  }

  getSnapshot = (): DroneDetectionSensorSnapshot => this.snapshotCache;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  onFadeTransitionEnd(): void {
    if (this.phase === 'fading') {
      this.phase = 'idle';
      this.detectedAt = null;
      this.stopProgressTick();
      this.rebuild();
    }
  }

  private onDetected(event: DroneDetectionEvent): void {
    this.lastEvent = event;
    this.detectedAt = Date.now();
    this.clearHoldTimer();
    this.stopProgressTick();
    this.phase = 'active';
    this.rebuild();
    this.startProgressTick();
    this.holdTimer = setTimeout(() => this.beginFade(), DRONE_SENSOR_HOLD_MS);
  }

  private beginFade(): void {
    this.holdTimer = null;
    if (this.phase !== 'active') {
      return;
    }
    this.phase = 'fading';
    this.rebuild();
  }

  private clearHoldTimer(): void {
    if (this.holdTimer !== null) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  private startProgressTick(): void {
    this.progressTimer = setInterval(() => {
      if (this.phase === 'idle') {
        this.stopProgressTick();
        return;
      }
      const elapsed = Date.now() - (this.detectedAt ?? 0);
      if (elapsed >= DRONE_SENSOR_CYCLE_MS) {
        this.stopProgressTick();
      }
      this.rebuild();
    }, 50);
  }

  private stopProgressTick(): void {
    if (this.progressTimer !== null) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private computeProgress(): number {
    if (this.phase === 'idle' || this.detectedAt == null) {
      return 0;
    }
    const elapsed = Date.now() - this.detectedAt;
    return Math.max(0, Math.min(1, 1 - elapsed / DRONE_SENSOR_CYCLE_MS));
  }

  private rebuild(): void {
    this.snapshotCache = this.buildSnapshot();
    for (const listener of this.listeners) {
      listener();
    }
  }

  private buildSnapshot(): DroneDetectionSensorSnapshot {
    const intensity = this.phase === 'active' ? 1 : 0.35;
    return {
      phase: this.phase,
      lastEvent: this.lastEvent,
      intensity,
      progress: this.computeProgress(),
    };
  }
}

export const droneDetectionSensorState = new DroneDetectionSensorState();
