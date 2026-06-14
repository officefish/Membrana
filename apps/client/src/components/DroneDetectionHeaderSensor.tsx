import type { FC } from 'react';

import { useDroneDetectionSensor } from '../hooks/useDroneDetectionSensor';
import { DroneDetectionIndicator } from './drone-detection/DroneDetectionIndicator';

export { DRONE_DETECTED_LABEL } from './drone-detection/constants';

export const DroneDetectionHeaderSensor: FC = () => {
  const { phase, lastEvent, progress, fadeDurationMs, onFadeTransitionEnd } =
    useDroneDetectionSensor();

  const title =
    lastEvent != null
      ? `Последнее срабатывание: ${lastEvent.sourceLabel}`
      : 'Датчик детекции дрона';

  return (
    <DroneDetectionIndicator
      layout="header"
      phase={phase}
      progress={progress}
      fadeDurationMs={fadeDurationMs}
      pulseAt={lastEvent?.timestamp}
      title={title}
      onFadeTransitionEnd={onFadeTransitionEnd}
    />
  );
};
