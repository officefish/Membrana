import React, { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_FRAME_HIT_RATIO,
  type Bounds,
  type PatternTemplate,
  type TemporalPatternSpec,
} from '@membrana/trends-detector-service';

import {
  ENVELOPE_OPTIONS,
  FRAME_HIT_RATIO_PERCENT_MAX,
  FRAME_HIT_RATIO_PERCENT_MIN,
  PERIODICITY_OPTIONS,
  STABILITY_OPTIONS,
  TREND_OPTIONS,
  normalizeFrameHitRatioPercent,
} from '../templateEditorDefaults';

type EditorTab = 'spectrum' | 'temporal' | 'advanced';

export interface TrendsTemplateEditorProps {
  readonly template: PatternTemplate;
  readonly existingKeys: readonly string[];
  readonly isNew: boolean;
  readonly onSave: (template: PatternTemplate) => void;
  readonly onCancel: () => void;
}

function boundsField(
  label: string,
  unit: string,
  value: Bounds,
  onChange: (next: Bounds) => void,
): React.ReactNode {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="form-control">
        <span className="label-text text-xs">
          {label}, мин ({unit})
        </span>
        <input
          type="number"
          className="input input-bordered input-sm"
          value={value.min}
          step="any"
          onChange={(e) =>
            onChange({ ...value, min: Number(e.target.value) })
          }
        />
      </label>
      <label className="form-control">
        <span className="label-text text-xs">
          {label}, макс ({unit})
        </span>
        <input
          type="number"
          className="input input-bordered input-sm"
          value={value.max}
          step="any"
          onChange={(e) =>
            onChange({ ...value, max: Number(e.target.value) })
          }
        />
      </label>
    </div>
  );
}

function optionalBoundsField(
  label: string,
  unit: string,
  value: Bounds | undefined,
  onChange: (next: Bounds | undefined) => void,
): React.ReactNode {
  const enabled = value !== undefined;
  return (
    <div className="rounded-lg border border-base-300 p-2 space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="checkbox checkbox-xs"
          checked={enabled}
          onChange={(e) =>
            onChange(
              e.target.checked ? { min: 0, max: 1 } : undefined,
            )
          }
        />
        <span className="text-xs font-medium">{label}</span>
      </label>
      {enabled && value ? boundsField(label, unit, value, onChange) : null}
    </div>
  );
}

function multiChipSelect(
  label: string,
  options: readonly string[],
  selected: readonly string[] | undefined,
  onChange: (next: readonly string[]) => void,
): React.ReactNode {
  const set = new Set(selected ?? []);
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-base-content/70">{label}</div>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => {
          const active = set.has(option);
          return (
            <button
              key={option}
              type="button"
              className={`btn btn-xs ${active ? 'btn-primary' : 'btn-ghost border border-base-300'}`}
              aria-pressed={active}
              onClick={() => {
                const next = new Set(set);
                if (active) next.delete(option);
                else next.add(option);
                onChange([...next]);
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function validateTemplate(template: PatternTemplate): string[] {
  const errors: string[] = [];
  const { centroid, flux, rms } = template.thresholds;
  if (centroid.min >= centroid.max) errors.push('Центр: мин должен быть меньше макс');
  if (flux.min >= flux.max) errors.push('Поток: мин должен быть меньше макс');
  if (rms.min >= rms.max) errors.push('RMS: мин должен быть меньше макс');
  if (!template.name.trim()) errors.push('Укажите имя шаблона');
  return errors;
}

export const TrendsTemplateEditor: React.FC<TrendsTemplateEditorProps> = ({
  template: initial,
  existingKeys,
  isNew,
  onSave,
  onCancel,
}) => {
  const [draft, setDraft] = useState<PatternTemplate>(() => structuredClone(initial));
  const [tab, setTab] = useState<EditorTab>('spectrum');

  const errors = useMemo(() => validateTemplate(draft), [draft]);
  const warnings = useMemo(() => {
    const list: string[] = [];
    const tp = draft.temporalPatterns;
    if (!tp.volumeTrend?.length && !tp.frequencyTrend?.length) {
      list.push('Рекомендуется выбрать хотя бы один тренд (громкость или частота).');
    }
    return list;
  }, [draft.temporalPatterns]);

  const patchThresholds = useCallback(
    (patch: Partial<PatternTemplate['thresholds']>) => {
      setDraft((prev) => ({
        ...prev,
        thresholds: { ...prev.thresholds, ...patch },
      }));
    },
    [],
  );

  const patchTemporal = useCallback((patch: Partial<TemporalPatternSpec>) => {
    setDraft((prev) => ({
      ...prev,
      temporalPatterns: { ...prev.temporalPatterns, ...patch },
    }));
  }, []);

  const frameHitMinPercent = Math.round(
    (draft.thresholds.frameHitRatio?.min ?? DEFAULT_FRAME_HIT_RATIO.min) * 100,
  );
  const frameHitMaxPercent = Math.round(
    (draft.thresholds.frameHitRatio?.max ?? DEFAULT_FRAME_HIT_RATIO.max) * 100,
  );

  const handleSave = () => {
    if (errors.length > 0) return;
    onSave({
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
    });
  };

  const tabs: { id: EditorTab; label: string }[] = [
    { id: 'spectrum', label: 'Спектр' },
    { id: 'temporal', label: 'Временные' },
    { id: 'advanced', label: 'Расширенные' },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-base-100 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          {isNew ? 'Новый шаблон' : 'Редактирование шаблона'}
        </h3>
        <span className="text-[10px] text-base-content/50 font-mono truncate max-w-[40%]">
          {draft.key}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="form-control col-span-2">
          <span className="label-text text-xs">Имя</span>
          <input
            className="input input-bordered input-sm"
            value={draft.name}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
          />
        </label>
        <label className="form-control">
          <span className="label-text text-xs">Иконка</span>
          <input
            className="input input-bordered input-sm"
            value={draft.icon}
            maxLength={4}
            onChange={(e) => setDraft((p) => ({ ...p, icon: e.target.value }))}
          />
        </label>
        <label className="form-control">
          <span className="label-text text-xs">Цвет</span>
          <input
            type="color"
            className="input input-bordered input-sm h-9 p-1"
            value={draft.color}
            onChange={(e) => setDraft((p) => ({ ...p, color: e.target.value }))}
          />
        </label>
        <label className="form-control col-span-2 sm:col-span-4">
          <span className="label-text text-xs">Описание</span>
          <textarea
            className="textarea textarea-bordered textarea-sm"
            rows={2}
            value={draft.description}
            onChange={(e) =>
              setDraft((p) => ({ ...p, description: e.target.value }))
            }
          />
        </label>
      </div>

      <div
        className="flex flex-wrap gap-1 border-b border-base-300 pb-2"
        role="tablist"
        aria-label="Разделы редактора шаблона"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`btn btn-xs min-h-8 ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'spectrum' ? (
        <div className="space-y-3" role="tabpanel">
          {boundsField('Спектральный центр', 'Hz', draft.thresholds.centroid, (centroid) =>
            patchThresholds({ centroid }),
          )}
          {boundsField('Спектральный поток', '—', draft.thresholds.flux, (flux) =>
            patchThresholds({ flux }),
          )}
          {boundsField('Громкость RMS', '—', draft.thresholds.rms, (rms) =>
            patchThresholds({ rms }),
          )}
          <div className="space-y-2">
            <div className="text-xs font-medium text-base-content/70">
              Доля тактов в диапазоне ({FRAME_HIT_RATIO_PERCENT_MIN}–
              {FRAME_HIT_RATIO_PERCENT_MAX}%)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="form-control">
                <span className="label-text text-xs">Мин, %</span>
                <input
                  type="number"
                  className="input input-bordered input-sm"
                  min={FRAME_HIT_RATIO_PERCENT_MIN}
                  max={FRAME_HIT_RATIO_PERCENT_MAX}
                  value={frameHitMinPercent}
                  onChange={(e) => {
                    const ratio = normalizeFrameHitRatioPercent(
                      Number(e.target.value),
                      frameHitMaxPercent,
                    );
                    patchThresholds({ frameHitRatio: ratio });
                  }}
                />
              </label>
              <label className="form-control">
                <span className="label-text text-xs">Макс, %</span>
                <input
                  type="number"
                  className="input input-bordered input-sm"
                  min={FRAME_HIT_RATIO_PERCENT_MIN}
                  max={FRAME_HIT_RATIO_PERCENT_MAX}
                  value={frameHitMaxPercent}
                  onChange={(e) => {
                    const ratio = normalizeFrameHitRatioPercent(
                      frameHitMinPercent,
                      Number(e.target.value),
                    );
                    patchThresholds({ frameHitRatio: ratio });
                  }}
                />
              </label>
            </div>
            <p className="text-[11px] text-base-content/50 leading-snug">
              Доля замеров, где centroid, flux и RMS одновременно в заданных границах.
            </p>
          </div>
        </div>
      ) : null}

      {tab === 'temporal' ? (
        <div className="space-y-3" role="tabpanel">
          {multiChipSelect('Тренд громкости', TREND_OPTIONS, draft.temporalPatterns.volumeTrend, (volumeTrend) =>
            patchTemporal({ volumeTrend: volumeTrend.length ? volumeTrend : undefined }),
          )}
          {multiChipSelect(
            'Тренд частоты',
            TREND_OPTIONS,
            draft.temporalPatterns.frequencyTrend,
            (frequencyTrend) =>
              patchTemporal({
                frequencyTrend: frequencyTrend.length ? frequencyTrend : undefined,
              }),
          )}
          {multiChipSelect(
            'Долгосрочная стабильность',
            STABILITY_OPTIONS,
            draft.temporalPatterns.longTermStability,
            (longTermStability) =>
              patchTemporal({
                longTermStability: longTermStability.length ? longTermStability : undefined,
              }),
          )}
          {multiChipSelect(
            'Периодичность',
            PERIODICITY_OPTIONS,
            draft.temporalPatterns.periodicity,
            (periodicity) =>
              patchTemporal({
                periodicity: periodicity.length ? periodicity : undefined,
              }),
          )}
          {multiChipSelect(
            'Форма огибающей',
            ENVELOPE_OPTIONS,
            draft.temporalPatterns.envelopeShape,
            (envelopeShape) =>
              patchTemporal({
                envelopeShape: envelopeShape.length ? envelopeShape : undefined,
              }),
          )}
        </div>
      ) : null}

      {tab === 'advanced' ? (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1" role="tabpanel">
          <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-base-300 p-2">
            <input
              type="checkbox"
              className="checkbox checkbox-xs"
              checked={draft.countsAsDetection === true}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  countsAsDetection: e.target.checked,
                }))
              }
            />
            <span className="text-xs font-medium">Считать победу шаблона обнаружением дрона</span>
          </label>
          {optionalBoundsField(
            'Отклонение центра (σ)',
            'Hz',
            draft.temporalPatterns.centroidStd,
            (centroidStd) => patchTemporal({ centroidStd }),
          )}
          {optionalBoundsField(
            'Отклонение потока (σ)',
            '—',
            draft.temporalPatterns.fluxStd,
            (fluxStd) => patchTemporal({ fluxStd }),
          )}
          {optionalBoundsField(
            'Отклонение RMS (σ)',
            '—',
            draft.temporalPatterns.rmsStd,
            (rmsStd) => patchTemporal({ rmsStd }),
          )}
          {optionalBoundsField(
            'Коэффициент активности',
            '0…1',
            draft.temporalPatterns.activityRatio,
            (activityRatio) => patchTemporal({ activityRatio }),
          )}
          {optionalBoundsField(
            'Средняя длительность тишины',
            'с',
            draft.temporalPatterns.avgSilenceDuration,
            (avgSilenceDuration) => patchTemporal({ avgSilenceDuration }),
          )}
          {optionalBoundsField(
            'Средняя длительность всплеска',
            'с',
            draft.temporalPatterns.avgBurstDuration,
            (avgBurstDuration) => patchTemporal({ avgBurstDuration }),
          )}
          <div className="rounded-lg border border-base-300 p-2 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={draft.temporalPatterns.frequencyJumps?.enabled ?? false}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  patchTemporal({
                    frequencyJumps: enabled
                      ? {
                          enabled: true,
                          minJumpsRequired:
                            draft.temporalPatterns.frequencyJumps?.minJumpsRequired ?? 1,
                          densityPerSecond:
                            draft.temporalPatterns.frequencyJumps?.densityPerSecond ?? {
                              max: 2,
                            },
                        }
                      : undefined,
                  });
                }}
              />
              <span className="text-xs font-medium">Частотные скачки</span>
            </label>
            {draft.temporalPatterns.frequencyJumps?.enabled ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="form-control">
                  <span className="label-text text-xs">Мин. число скачков</span>
                  <input
                    type="number"
                    className="input input-bordered input-sm"
                    min={0}
                    value={draft.temporalPatterns.frequencyJumps.minJumpsRequired}
                    onChange={(e) =>
                      patchTemporal({
                        frequencyJumps: {
                          ...draft.temporalPatterns.frequencyJumps!,
                          minJumpsRequired: Math.max(0, Number(e.target.value)),
                        },
                      })
                    }
                  />
                </label>
                <label className="form-control">
                  <span className="label-text text-xs">Плотность, макс (1/с)</span>
                  <input
                    type="number"
                    className="input input-bordered input-sm"
                    min={0}
                    step="any"
                    value={
                      draft.temporalPatterns.frequencyJumps.densityPerSecond?.max ?? ''
                    }
                    onChange={(e) =>
                      patchTemporal({
                        frequencyJumps: {
                          ...draft.temporalPatterns.frequencyJumps!,
                          densityPerSecond: {
                            max: Number(e.target.value),
                          },
                        },
                      })
                    }
                  />
                </label>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <ul className="text-[11px] text-warning space-y-0.5">
          {warnings.map((w) => (
            <li key={w}>⚠ {w}</li>
          ))}
        </ul>
      ) : null}

      {errors.length > 0 ? (
        <ul className="text-[11px] text-error space-y-0.5">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2 justify-end pt-1 border-t border-base-300">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Отмена
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={errors.length > 0}
          onClick={handleSave}
        >
          Сохранить
        </button>
      </div>

      {!isNew && existingKeys.includes(draft.key) ? null : (
        <p className="text-[10px] text-base-content/40">
          Ключ шаблона фиксируется при создании.
        </p>
      )}
    </div>
  );
};
