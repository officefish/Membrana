import { useMembranaStore } from '@membrana/agenda';

import { QuickPresetButtons } from './components/QuickPresetButtons';
import { TrendsTemplateList } from './components/TrendsTemplateList';
import {
  INTERVAL_MS_MAX,
  INTERVAL_MS_MIN,
  INTERVAL_MS_PRESETS,
  MEASUREMENTS_MAX,
  MEASUREMENTS_MIN,
  MEASUREMENT_COUNT_PRESETS,
  analysisDurationSec,
} from './measurementPresets';
import {
  TRENDS_FFT_ANALYZER_PLUGIN_ID,
  resolveTrendsFftAnalyzerConfig,
  type TrendsFftAnalyzerPluginConfig,
} from './types';

interface Props {
  readonly moduleId: string;
}

export function TrendsFftSidebarSettings({ moduleId }: Props) {
  const rawConfig = useMembranaStore((s) =>
    s.getPlugin(moduleId, TRENDS_FFT_ANALYZER_PLUGIN_ID)?.config,
  );
  const updatePluginConfig = useMembranaStore((s) => s.updatePluginConfig);
  const config = resolveTrendsFftAnalyzerConfig(
    rawConfig as Partial<TrendsFftAnalyzerPluginConfig> | undefined,
  );

  const patch = (updates: Partial<TrendsFftAnalyzerPluginConfig>) => {
    updatePluginConfig<TrendsFftAnalyzerPluginConfig>(
      moduleId,
      TRENDS_FFT_ANALYZER_PLUGIN_ID,
      updates,
    );
  };

  const toggleTemplate = (key: string, enabled: boolean) => {
    const set = new Set(config.enabledTemplateKeys);
    if (enabled) set.add(key);
    else set.delete(key);
    const next = [...set];
    patch({
      enabledTemplateKeys: next.length > 0 ? next : config.enabledTemplateKeys,
    });
  };

  const durationSec = analysisDurationSec(config.measurementsCount, config.intervalMs);

  return (
    <div className="flex flex-col gap-3 text-sm min-h-0">
      <p className="text-base-content/60 text-xs leading-snug">
        Окно анализа: {config.measurementsCount} замеров × {config.intervalMs} мс ≈{' '}
        {durationSec.toFixed(1)} с. v1 — live микрофон.
      </p>

      <label className="form-control">
        <span className="label-text text-xs">Режим</span>
        <select
          className="select select-bordered select-sm"
          value={config.detectionMode}
          onChange={(e) =>
            patch({
              detectionMode: e.target.value === 'manual' ? 'manual' : 'auto',
            })
          }
        >
          <option value="auto">Авто — цикл пока активен микрофон</option>
          <option value="manual">Ручной — старт по кнопке</option>
        </select>
      </label>

      <QuickPresetButtons
        label="Замеров в окне"
        values={MEASUREMENT_COUNT_PRESETS}
        current={config.measurementsCount}
        onSelect={(measurementsCount) => patch({ measurementsCount })}
      />

      <label className="form-control">
        <span className="label-text text-xs">
          Замеров ({MEASUREMENTS_MIN}–{MEASUREMENTS_MAX})
        </span>
        <input
          type="number"
          className="input input-bordered input-sm"
          min={MEASUREMENTS_MIN}
          max={MEASUREMENTS_MAX}
          step={1}
          value={config.measurementsCount}
          onChange={(e) => patch({ measurementsCount: Number(e.target.value) })}
        />
      </label>

      <QuickPresetButtons
        label="Интервал (мс)"
        values={INTERVAL_MS_PRESETS}
        current={config.intervalMs}
        unit=" мс"
        onSelect={(intervalMs) => patch({ intervalMs })}
      />

      <label className="form-control">
        <span className="label-text text-xs">
          Интервал, мс ({INTERVAL_MS_MIN}–{INTERVAL_MS_MAX})
        </span>
        <input
          type="number"
          className="input input-bordered input-sm"
          min={INTERVAL_MS_MIN}
          max={INTERVAL_MS_MAX}
          step={10}
          value={config.intervalMs}
          onChange={(e) => patch({ intervalMs: Number(e.target.value) })}
        />
      </label>

      <label className="form-control">
        <span className="label-text text-xs">minRms (порог активности)</span>
        <input
          type="number"
          className="input input-bordered input-sm"
          min={0}
          max={1}
          step={0.005}
          value={config.minRms}
          onChange={(e) => patch({ minRms: Number(e.target.value) })}
        />
      </label>

      <label className="form-control">
        <span className="label-text text-xs">minConfidence (%)</span>
        <input
          type="number"
          className="input input-bordered input-sm"
          min={0}
          max={100}
          step={5}
          value={config.minConfidence}
          onChange={(e) => patch({ minConfidence: Number(e.target.value) })}
        />
      </label>

      <div>
        <span className="label-text text-xs block mb-1">Шаблоны для сопоставления</span>
        <TrendsTemplateList
          enabledKeys={config.enabledTemplateKeys}
          onToggle={toggleTemplate}
          compact
        />
      </div>
    </div>
  );
}
