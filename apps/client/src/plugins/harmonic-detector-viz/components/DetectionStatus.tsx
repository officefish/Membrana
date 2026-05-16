import { useEffect, useRef, useState } from 'react';

import { DroneDetectionIndicator } from '../../../components/drone-detection/DroneDetectionIndicator';
import type { DroneSensorPhase } from '../../../lib/droneDetectionSensorState';

interface Props {
  readonly isDrone: boolean;
  readonly isRunning: boolean;
  readonly confidence?: number;
}

export function DetectionStatus({ isDrone, isRunning, confidence = 0 }: Props) {
  const [pulseAt, setPulseAt] = useState<number | undefined>(undefined);
  const prevDroneRef = useRef(false);

  useEffect(() => {
    if (isDrone && !prevDroneRef.current) {
      setPulseAt(Date.now());
    }
    prevDroneRef.current = isDrone;
  }, [isDrone]);

  const phase: DroneSensorPhase = !isRunning ? 'idle' : isDrone ? 'active' : 'idle';

  const title = !isRunning
    ? 'Запустите поток микрофона для анализа'
    : isDrone
      ? 'Гармонический детектор: мультироторный сигнал'
      : 'Гармонический детектор: ожидание сигнала';

  return (
    <div className="flex flex-col gap-2 shrink-0">
      <DroneDetectionIndicator
        layout="panel"
        phase={phase}
        progress={isDrone ? confidence : 0}
        pulseAt={pulseAt}
        title={title}
      />
      {!isRunning ? (
        <p className="text-xs text-base-content/60 pl-1">Микрофон выключен — используйте «Запустить поток».</p>
      ) : null}
    </div>
  );
}
