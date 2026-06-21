import React, { useEffect, useState } from 'react';
import type {
  ScenarioBlockKind,
  ScenarioCollectorConfig,
  ScenarioFftTrendsPolicy,
  ScenarioNodeKind,
  ScenarioRecordingPolicy,
  ScenarioVariableType,
  ScenarioVariableValue,
} from '@membrana/core';
import {
  DEFAULT_SCENARIO_COLLECTOR_CONFIG,
  FFT_TRENDS_BUILTIN_TEMPLATE_KEYS,
  FFT_TRENDS_DETECTION_MODES,
  createDateTimeValue,
  createIntegerValue,
  createStringValue,
  isPureEligibleScenarioNodeKind,
  isReferenceSocketType,
  isScenarioDateTimeValue,
  isScenarioIntegerValue,
  isScenarioReferenceValue,
  isScenarioStringValue,
  isValueSocketType,
  resolveScenarioCollectorConfig,
  resolveScenarioFftTrendsPolicy,
  resolveScenarioRecordingPolicy,
} from '@membrana/core';

import { D0_SCENARIO_NODE_CATALOG } from '../graph/index.js';
import type { V04PaletteNodeKind } from '../graph/palette-node.js';
import {
  SCENARIO_CAPTURE_FORMATS,
  RECORDING_WINDOW_SEC_PRESETS,
  captureFormatInspectorLabel,
  formatRecordingPolicyBadge,
} from '../graph/recording-policy-ui.js';
import {
  FFT_TRENDS_INTERVAL_MS_PRESETS,
  FFT_TRENDS_MEASUREMENT_COUNT_PRESETS,
  fftTrendsDetectionModeLabel,
  fftTrendsPolicyDurationSec,
  formatFftTrendsPolicyBadge,
  fftTrendsBuiltinTemplateLabel,
} from '../graph/fft-trends-policy-ui.js';
import { START_RECORDING_POLICY_HANDLE } from '../graph/start-recording-node.js';
import { IS_RECORDING_WINDOW_FULL_WINDOW_SEC_HANDLE } from '../graph/is-recording-window-full-node.js';
import type { NodePortInspectionResult } from '../runtime/index.js';
import type { ScenarioMicrophoneOption } from '../runtime/index.js';
import {
  isLegacyPaletteEnabled,
  LEGACY_SCENARIO_NODE_PALETTE,
  SCENARIO_V04_PALETTE_SECTIONS,
} from '../types/board-ui.js';
import { BoardRuntimePortPanel } from './board-runtime-port-panel.js';

export interface BoardRightSidebarProps {
  readonly selectedNodeId: string | null;
  readonly selectedNodeLabel: string | null;
  readonly selectedNodeKind: ScenarioNodeKind | null;
  readonly selectedMicrophoneId: string | null;
  readonly selectedCollectorConfig: ScenarioCollectorConfig | null;
  readonly selectedRecordingPolicy: ScenarioRecordingPolicy | null;
  /** True, если порт policy подключён dataflow (MakeRecordingPolicy / variable-get). */
  readonly selectedRecordingPolicyWired: boolean;
  readonly selectedFftTrendsPolicy: ScenarioFftTrendsPolicy | null;
  readonly selectedVariableName: string;
  readonly selectedVariableId: string | null;
  readonly selectedVariableType: ScenarioVariableType | null;
  readonly selectedVariableValue: ScenarioVariableValue | null;
  readonly selectedGetterPure: boolean;
  readonly selectedGetterPureLocked: boolean;
  readonly selectedVariableTypeLabel: string | null;
  readonly microphoneOptions: readonly ScenarioMicrophoneOption[];
  readonly microphoneOptionsLoading?: boolean;
  readonly canEditScenario: boolean;
  readonly isRuntime: boolean;
  readonly runtimeInspection: NodePortInspectionResult | null;
  readonly printLastOutput: string | null;
  readonly onAddLegacyNode: (blockKind: ScenarioBlockKind) => void;
  readonly onAddPaletteNode: (nodeKind: V04PaletteNodeKind) => void;
  readonly onMicrophoneIdChange: (nodeId: string, microphoneId: string) => void;
  readonly onCollectorConfigChange: (nodeId: string, config: ScenarioCollectorConfig) => void;
  readonly onRecordingPolicyChange: (nodeId: string, policy: ScenarioRecordingPolicy) => void;
  readonly onFftTrendsPolicyChange: (nodeId: string, policy: ScenarioFftTrendsPolicy) => void;
  readonly onAssignVariableName: (nodeId: string, variableName: string) => void;
  readonly onVariableGetterPureChange: (nodeId: string, pure: boolean) => void;
  readonly onVariableValueChange: (variableId: string, value: ScenarioVariableValue | null) => void;
  readonly onClearBoard: () => void;
}

/**
 * Правый сайдбар доски (MP7b RT6 / v0.4 DBR5): инспектор выбранной ноды
 * или палитра v0.4 (Print / isValid / GetMicrophone); legacy D0 — под флагом.
 */
export const BoardRightSidebar: React.FC<BoardRightSidebarProps> = ({
  selectedNodeId,
  selectedNodeLabel,
  selectedNodeKind,
  selectedMicrophoneId,
  selectedCollectorConfig,
  selectedRecordingPolicy,
  selectedRecordingPolicyWired,
  selectedFftTrendsPolicy,
  selectedVariableName,
  selectedVariableId,
  selectedVariableType,
  selectedVariableValue,
  selectedGetterPure,
  selectedGetterPureLocked,
  selectedVariableTypeLabel,
  microphoneOptions,
  microphoneOptionsLoading = false,
  canEditScenario,
  isRuntime,
  runtimeInspection,
  printLastOutput,
  onAddLegacyNode,
  onAddPaletteNode,
  onMicrophoneIdChange,
  onCollectorConfigChange,
  onRecordingPolicyChange,
  onFftTrendsPolicyChange,
  onAssignVariableName,
  onVariableGetterPureChange,
  onVariableValueChange,
  onClearBoard,
}) => {
  const legacyPalette = isLegacyPaletteEnabled();
  const [variableNameDraft, setVariableNameDraft] = useState(selectedVariableName);
  const [collectorDraft, setCollectorDraft] = useState<ScenarioCollectorConfig>(
    selectedCollectorConfig ?? DEFAULT_SCENARIO_COLLECTOR_CONFIG,
  );
  const [recordingPolicyDraft, setRecordingPolicyDraft] = useState<ScenarioRecordingPolicy>(
    selectedRecordingPolicy ?? resolveScenarioRecordingPolicy(undefined),
  );
  const [fftTrendsPolicyDraft, setFftTrendsPolicyDraft] = useState<ScenarioFftTrendsPolicy>(
    selectedFftTrendsPolicy ?? resolveScenarioFftTrendsPolicy(undefined),
  );
  const showRuntimeOutputs = isRuntime && runtimeInspection !== null;
  const editDisabled = isRuntime || !canEditScenario;

  useEffect(() => {
    setVariableNameDraft(selectedVariableName);
  }, [selectedNodeId, selectedVariableName]);

  useEffect(() => {
    setCollectorDraft(selectedCollectorConfig ?? DEFAULT_SCENARIO_COLLECTOR_CONFIG);
  }, [selectedNodeId, selectedCollectorConfig]);

  useEffect(() => {
    setRecordingPolicyDraft(
      selectedRecordingPolicy ?? resolveScenarioRecordingPolicy(undefined),
    );
  }, [selectedNodeId, selectedRecordingPolicy]);

  useEffect(() => {
    setFftTrendsPolicyDraft(
      selectedFftTrendsPolicy ?? resolveScenarioFftTrendsPolicy(undefined),
    );
  }, [selectedNodeId, selectedFftTrendsPolicy]);

  const commitRecordingPolicyField = (
    patch: Partial<ScenarioRecordingPolicy>,
  ): void => {
    if (selectedNodeId === null || editDisabled || selectedRecordingPolicyWired) {
      return;
    }
    const next = resolveScenarioRecordingPolicy({ ...recordingPolicyDraft, ...patch });
    setRecordingPolicyDraft(next);
    onRecordingPolicyChange(selectedNodeId, next);
  };

  const commitFftTrendsPolicyField = (patch: Partial<ScenarioFftTrendsPolicy>): void => {
    if (selectedNodeId === null || editDisabled) {
      return;
    }
    const next = resolveScenarioFftTrendsPolicy({ ...fftTrendsPolicyDraft, ...patch });
    setFftTrendsPolicyDraft(next);
    onFftTrendsPolicyChange(selectedNodeId, next);
  };

  const toggleFftTrendsTemplate = (key: string, enabled: boolean): void => {
    const set = new Set(fftTrendsPolicyDraft.enabledTemplateKeys);
    if (enabled) {
      set.add(key);
    } else {
      set.delete(key);
    }
    const nextKeys = [...set];
    commitFftTrendsPolicyField({
      enabledTemplateKeys:
        nextKeys.length > 0 ? nextKeys : [...fftTrendsPolicyDraft.enabledTemplateKeys],
    });
  };

  const commitVariableName = () => {
    if (selectedNodeId === null || editDisabled) {
      return;
    }
    const trimmed = variableNameDraft.trim();
    if (trimmed === '' || trimmed === selectedVariableName) {
      return;
    }
    onAssignVariableName(selectedNodeId, trimmed);
  };

  const commitCollectorField = (patch: Partial<ScenarioCollectorConfig>) => {
    if (selectedNodeId === null || editDisabled) {
      return;
    }
    const next = resolveScenarioCollectorConfig({ ...collectorDraft, ...patch });
    setCollectorDraft(next);
    onCollectorConfigChange(selectedNodeId, next);
  };

  return (
    <aside
      className="flex h-full w-[clamp(12rem,15vw,16rem)] flex-col overflow-y-auto overflow-x-hidden border-l border-base-300 bg-base-100/95 shadow-lg backdrop-blur-sm"
      aria-label="Инспектор и палитра нод"
    >
      {showRuntimeOutputs ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 text-sm">
          <div className="border-b border-base-200 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
              Исходящие данные
            </p>
            <h2 className="text-sm font-semibold text-base-content">{runtimeInspection.nodeLabel}</h2>
          </div>
          <BoardRuntimePortPanel
            title="Значения выходов"
            ports={runtimeInspection.outputs}
            mode="values"
            emptyHint="Нет выходов"
          />
          {selectedNodeKind === 'print' && printLastOutput !== null ? (
            <section className="flex flex-col gap-2 border-t border-base-200 pt-3" aria-label="Последний вывод Print">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
                Последний вывод
              </p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md border border-base-300 bg-base-200/50 p-2 font-mono text-xs text-base-content">
                {printLastOutput}
              </pre>
            </section>
          ) : null}
        </div>
      ) : selectedNodeId ? (
        <div className="flex flex-col gap-3 p-4 text-sm">
          <div className="border-b border-base-200 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
              Настройки ноды
            </p>
            <h2 className="text-sm font-semibold text-base-content">
              {selectedNodeLabel ?? selectedNodeId}
            </h2>
          </div>
          {isRuntime ? (
            <p className="text-xs leading-relaxed text-base-content/55">
              Редактирование узлов недоступно во время выполнения. Значения портов — в панелях слева и
              справа.
            </p>
          ) : (
            <>
              {selectedNodeKind !== null && isPureEligibleScenarioNodeKind(selectedNodeKind) ? (
                <div className="mb-3 flex flex-col gap-3 text-xs">
                  <label className="label cursor-pointer justify-start gap-2 p-0">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs checkbox-primary"
                      checked={selectedGetterPure}
                      disabled={editDisabled || selectedGetterPureLocked}
                      onChange={(event) => {
                        if (selectedNodeId === null) {
                          return;
                        }
                        onVariableGetterPureChange(selectedNodeId, event.target.checked);
                      }}
                      aria-label="Pure getter"
                    />
                    <span className="label-text font-medium">Pure</span>
                  </label>
                  {selectedNodeKind === 'get-journal' ? (
                    <p className="text-base-content/55 leading-relaxed">
                      Data-only: <code className="font-mono">device</code> или{' '}
                      <code className="font-mono">server</code> → <code className="font-mono">journal</code>.
                      В режиме Pure exec-пины скрыты.
                    </p>
                  ) : null}
                  {selectedNodeKind === 'get-reporter' ? (
                    <p className="text-base-content/55 leading-relaxed">
                      Data-only: <code className="font-mono">journal</code> →{' '}
                      <code className="font-mono">reporter</code>. Pure — без exec passthrough.
                    </p>
                  ) : null}
                </div>
              ) : null}
              {selectedNodeKind === 'get-microphone' ? (
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-base-content/70">Микрофон устройства</span>
              <select
                className="select select-bordered select-sm w-full"
                value={selectedMicrophoneId ?? ''}
                disabled={microphoneOptionsLoading || editDisabled}
                onChange={(event) =>
                  onMicrophoneIdChange(selectedNodeId, event.target.value)
                }
              >
                <option value="">
                  {microphoneOptionsLoading ? 'Загрузка устройств…' : '— выберите микрофон —'}
                </option>
                {microphoneOptions.map((option) => (
                  <option key={option.deviceId} value={option.deviceId}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="text-base-content/50">
                Список обновляется при выборе узла (audio-engine enumerate).
              </span>
            </label>
          ) : selectedNodeKind === 'collect-samples' || selectedNodeKind === 'collect-fft-frames' ? (
            <div className="flex flex-col gap-3 text-xs">
              <p className="text-base-content/55 leading-relaxed">
                Flush при <code className="font-mono">count ≥ queueCapacity</code> или истечении{' '}
                <code className="font-mono">windowSec</code>. Policy на singleton — out of scope MVP.
              </p>
              <label className="flex flex-col gap-1">
                <span className="font-medium text-base-content/70">bufferSize</span>
                <input
                  type="number"
                  className="input input-bordered input-sm w-full font-mono"
                  min={64}
                  max={32768}
                  step={64}
                  disabled={editDisabled}
                  value={collectorDraft.bufferSize}
                  onChange={(event) =>
                    commitCollectorField({ bufferSize: Number(event.target.value) })
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-medium text-base-content/70">smoothingTimeConstant</span>
                <input
                  type="number"
                  className="input input-bordered input-sm w-full font-mono"
                  min={0}
                  max={1}
                  step={0.05}
                  disabled={editDisabled}
                  value={collectorDraft.smoothingTimeConstant}
                  onChange={(event) =>
                    commitCollectorField({ smoothingTimeConstant: Number(event.target.value) })
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-medium text-base-content/70">windowSec</span>
                <input
                  type="number"
                  className="input input-bordered input-sm w-full font-mono"
                  min={0.1}
                  max={120}
                  step={0.5}
                  disabled={editDisabled}
                  value={collectorDraft.windowSec}
                  onChange={(event) =>
                    commitCollectorField({ windowSec: Number(event.target.value) })
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-medium text-base-content/70">queueCapacity</span>
                <input
                  type="number"
                  className="input input-bordered input-sm w-full font-mono"
                  min={1}
                  max={10000}
                  step={1}
                  disabled={editDisabled}
                  value={collectorDraft.queueCapacity}
                  onChange={(event) =>
                    commitCollectorField({ queueCapacity: Number(event.target.value) })
                  }
                />
              </label>
            </div>
          ) : selectedNodeKind === 'make-recording-policy' ? (
            <div className="flex flex-col gap-3 text-xs">
              <span className="badge badge-xs badge-accent w-fit">pure · constructor</span>
              <span className="badge badge-sm badge-outline w-fit font-mono">
                {formatRecordingPolicyBadge(recordingPolicyDraft)}
              </span>
              <label className="flex flex-col gap-1">
                <span className="font-medium text-base-content/70">windowSec</span>
                <select
                  className="select select-bordered select-sm w-full font-mono"
                  disabled={editDisabled}
                  value={recordingPolicyDraft.windowSec}
                  onChange={(event) =>
                    commitRecordingPolicyField({
                      windowSec: Number(event.target.value) as ScenarioRecordingPolicy['windowSec'],
                    })
                  }
                >
                  {RECORDING_WINDOW_SEC_PRESETS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec} s
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-medium text-base-content/70">captureFormat</span>
                <select
                  className="select select-bordered select-sm w-full font-mono"
                  disabled={editDisabled}
                  value={recordingPolicyDraft.captureFormat}
                  onChange={(event) =>
                    commitRecordingPolicyField({
                      captureFormat: event.target.value as ScenarioRecordingPolicy['captureFormat'],
                    })
                  }
                >
                  {SCENARIO_CAPTURE_FORMATS.map((format) => (
                    <option key={format} value={format}>
                      {captureFormatInspectorLabel(format)}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-base-content/50 leading-relaxed">
                Data-only: выход <code className="font-mono">policy</code> → StartRecording (exec не нужен).
              </span>
            </div>
          ) : selectedNodeKind === 'make-fft-trends-policy' ? (
            <div className="flex flex-col gap-3 text-xs">
              <span className="badge badge-xs badge-accent w-fit">pure · constructor</span>
              <span className="badge badge-sm badge-outline w-fit font-mono">
                {formatFftTrendsPolicyBadge(fftTrendsPolicyDraft)}
              </span>
              <p className="text-base-content/55 leading-relaxed">
                Окно анализа ≈ {fftTrendsPolicyDurationSec(fftTrendsPolicyDraft).toFixed(1)} с (
                {fftTrendsPolicyDraft.measurementsCount} × {fftTrendsPolicyDraft.intervalMs} мс).
              </p>
              <label className="flex flex-col gap-1">
                <span className="font-medium text-base-content/70">detectionMode</span>
                <select
                  className="select select-bordered select-sm w-full font-mono"
                  disabled={editDisabled}
                  value={fftTrendsPolicyDraft.detectionMode}
                  onChange={(event) =>
                    commitFftTrendsPolicyField({
                      detectionMode: event.target.value as ScenarioFftTrendsPolicy['detectionMode'],
                    })
                  }
                >
                  {FFT_TRENDS_DETECTION_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {fftTrendsDetectionModeLabel(mode)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-medium text-base-content/70">measurementsCount</span>
                <select
                  className="select select-bordered select-sm w-full font-mono"
                  disabled={editDisabled}
                  value={fftTrendsPolicyDraft.measurementsCount}
                  onChange={(event) =>
                    commitFftTrendsPolicyField({
                      measurementsCount: Number(
                        event.target.value,
                      ) as ScenarioFftTrendsPolicy['measurementsCount'],
                    })
                  }
                >
                  {FFT_TRENDS_MEASUREMENT_COUNT_PRESETS.map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-medium text-base-content/70">intervalMs</span>
                <select
                  className="select select-bordered select-sm w-full font-mono"
                  disabled={editDisabled}
                  value={fftTrendsPolicyDraft.intervalMs}
                  onChange={(event) =>
                    commitFftTrendsPolicyField({
                      intervalMs: Number(event.target.value) as ScenarioFftTrendsPolicy['intervalMs'],
                    })
                  }
                >
                  {FFT_TRENDS_INTERVAL_MS_PRESETS.map((ms) => (
                    <option key={ms} value={ms}>
                      {ms} ms
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-2">
                <span className="font-medium text-base-content/70">Шаблоны (tariff/catalog)</span>
                {FFT_TRENDS_BUILTIN_TEMPLATE_KEYS.map((key) => (
                  <label key={key} className="label cursor-pointer justify-start gap-2 py-0">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      disabled={editDisabled}
                      checked={fftTrendsPolicyDraft.enabledTemplateKeys.includes(key)}
                      onChange={(event) => toggleFftTrendsTemplate(key, event.target.checked)}
                    />
                    <span className="label-text text-xs">{fftTrendsBuiltinTemplateLabel(key)}</span>
                  </label>
                ))}
                <span className="text-base-content/50 leading-relaxed">
                  Пользовательские шаблоны подмешиваются в runtime (как в plugin sidebar).
                </span>
              </div>
              <span className="text-base-content/50 leading-relaxed">
                Выход <code className="font-mono">policy</code> → CollectFftFrames / MakeFftTrendsAnalysis
                (B1).
              </span>
            </div>
          ) : selectedNodeKind === 'start-recording' ? (
            <div className="flex flex-col gap-2 text-xs">
              {selectedRecordingPolicyWired ? (
                <p className="text-base-content/55 leading-relaxed">
                  Policy подключён к порту{' '}
                  <code className="font-mono">{START_RECORDING_POLICY_HANDLE}</code> — значение берётся
                  из dataflow (MakeRecordingPolicy или variable-get).
                </p>
              ) : (
                <>
                  <p className="text-base-content/55 leading-relaxed">
                    Fallback policy на узле (если порт{' '}
                    <code className="font-mono">{START_RECORDING_POLICY_HANDLE}</code> не подключён):
                  </p>
                  <span className="badge badge-sm badge-outline w-fit font-mono">
                    {formatRecordingPolicyBadge(recordingPolicyDraft)}
                  </span>
                  <label className="flex flex-col gap-1">
                    <span className="font-medium text-base-content/70">windowSec</span>
                    <select
                      className="select select-bordered select-sm w-full font-mono"
                      disabled={editDisabled}
                      value={recordingPolicyDraft.windowSec}
                      onChange={(event) =>
                        commitRecordingPolicyField({
                          windowSec: Number(event.target.value) as ScenarioRecordingPolicy['windowSec'],
                        })
                      }
                    >
                      {RECORDING_WINDOW_SEC_PRESETS.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec} s
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-medium text-base-content/70">captureFormat</span>
                    <select
                      className="select select-bordered select-sm w-full font-mono"
                      disabled={editDisabled}
                      value={recordingPolicyDraft.captureFormat}
                      onChange={(event) =>
                        commitRecordingPolicyField({
                          captureFormat: event.target.value as ScenarioRecordingPolicy['captureFormat'],
                        })
                      }
                    >
                      {SCENARIO_CAPTURE_FORMATS.map((format) => (
                        <option key={format} value={format}>
                          {captureFormatInspectorLabel(format)}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>
          ) : selectedNodeKind === 'is-recording-window-full' ? (
            <div className="flex flex-col gap-2 text-xs">
              {selectedRecordingPolicyWired ? (
                <p className="text-base-content/55 leading-relaxed">
                  windowSec подключён к порту{' '}
                  <code className="font-mono">{IS_RECORDING_WINDOW_FULL_WINDOW_SEC_HANDLE}</code>.
                </p>
              ) : (
                <>
                  <p className="text-base-content/55 leading-relaxed">
                    Fallback windowSec на узле:
                  </p>
                  <span className="badge badge-sm badge-outline w-fit font-mono">
                    {formatRecordingPolicyBadge(recordingPolicyDraft)}
                  </span>
                  <label className="flex flex-col gap-1">
                    <span className="font-medium text-base-content/70">windowSec</span>
                    <select
                      className="select select-bordered select-sm w-full font-mono"
                      disabled={editDisabled}
                      value={recordingPolicyDraft.windowSec}
                      onChange={(event) =>
                        commitRecordingPolicyField({
                          windowSec: Number(event.target.value) as ScenarioRecordingPolicy['windowSec'],
                        })
                      }
                    >
                      {RECORDING_WINDOW_SEC_PRESETS.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec} s
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>
          ) : selectedNodeKind === 'variable-get' ? (
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-base-content/70">
                  Переменная ({selectedVariableTypeLabel ?? 'Device'})
                </span>
                <p className="rounded-md border border-base-300 bg-base-200/40 px-2 py-1.5 font-mono italic text-base-content">
                  {selectedVariableName || '—'}
                </p>
              </div>
              {selectedVariableType !== null && isReferenceSocketType(selectedVariableType) ? (
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-base-content/70">Ссылка на выходе</span>
                  {selectedVariableValue === null ? (
                    <span className="badge badge-sm badge-warning w-fit">Пустая ссылка</span>
                  ) : isScenarioReferenceValue(selectedVariableValue) &&
                    selectedVariableValue.valid ? (
                    <span className="badge badge-sm badge-success w-fit">Связана с объектом</span>
                  ) : (
                    <span className="badge badge-sm badge-warning w-fit">Пустая ссылка</span>
                  )}
                  <span className="text-base-content/50">
                    Редактирование ref — в конструкторе переменных слева или через Set + Event.
                  </span>
                </div>
              ) : null}
              {selectedVariableType !== null &&
              isValueSocketType(selectedVariableType) &&
              selectedVariableId !== null ? (
                <div className="flex flex-col gap-2">
                  <span className="font-medium text-base-content/70">Значение на выходе</span>
                  {selectedVariableType === 'DateTime' ? (
                    <input
                      type="text"
                      className="input input-bordered input-sm w-full font-mono"
                      placeholder="2026-06-21T12:00:00.000Z"
                      disabled={editDisabled}
                      value={
                        selectedVariableValue !== null && isScenarioDateTimeValue(selectedVariableValue)
                          ? selectedVariableValue.iso
                          : ''
                      }
                      onChange={(event) => {
                        const iso = event.target.value.trim();
                        onVariableValueChange(
                          selectedVariableId,
                          iso === '' ? null : createDateTimeValue(iso),
                        );
                      }}
                    />
                  ) : null}
                  {selectedVariableType === 'Integer' ? (
                    <input
                      type="number"
                      className="input input-bordered input-sm w-full font-mono"
                      disabled={editDisabled}
                      value={
                        selectedVariableValue !== null && isScenarioIntegerValue(selectedVariableValue)
                          ? selectedVariableValue.value
                          : ''
                      }
                      onChange={(event) => {
                        const raw = event.target.value;
                        onVariableValueChange(
                          selectedVariableId,
                          raw === '' ? null : createIntegerValue(Number(raw)),
                        );
                      }}
                    />
                  ) : null}
                  {selectedVariableType === 'String' ? (
                    <input
                      type="text"
                      className="input input-bordered input-sm w-full font-mono"
                      disabled={editDisabled}
                      value={
                        selectedVariableValue !== null && isScenarioStringValue(selectedVariableValue)
                          ? selectedVariableValue.value
                          : ''
                      }
                      onChange={(event) => {
                        onVariableValueChange(
                          selectedVariableId,
                          event.target.value === '' ? null : createStringValue(event.target.value),
                        );
                      }}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : selectedNodeKind === 'variable-set' ? (
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-base-content/70">
                Имя переменной ({selectedVariableTypeLabel ?? 'Device'})
              </span>
              <input
                type="text"
                className="input input-bordered input-sm w-full font-mono"
                value={variableNameDraft}
                placeholder="device1"
                disabled={editDisabled}
                onChange={(event) => setVariableNameDraft(event.target.value)}
                onBlur={() => commitVariableName()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.currentTarget.blur();
                  }
                }}
              />
              <span className="text-base-content/50">
                Переименовывает существующую переменную на всех узлах get/set.
              </span>
            </label>
          ) : selectedNodeKind === 'get-journal' || selectedNodeKind === 'get-reporter' ? null : (
            <p className="text-xs leading-relaxed text-base-content/55">
              Параметры плагина и сокетов появятся здесь. Снимите выделение, чтобы вернуться к
              палитре нод.
            </p>
          )}
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <div className="border-b border-base-200 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
              {isRuntime ? 'Runtime' : 'Палитра нод'}
            </p>
            <h2 className="text-sm font-semibold text-base-content">
              {isRuntime
                ? 'Выберите узел на канвасе'
                : canEditScenario
                  ? 'Добавьте ноды в активную ветку'
                  : 'Выберите ветку сценария'}
            </h2>
          </div>

          {!isRuntime ? (
            <div className="flex flex-1 flex-col gap-4 p-4">
              {!legacyPalette ? (
                SCENARIO_V04_PALETTE_SECTIONS.map((section) => (
                  <div key={section.title} className="flex flex-col gap-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/40">
                      {section.title}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {section.items.map((item) => (
                        <button
                          key={item.nodeKind}
                          type="button"
                          className="btn btn-xs btn-outline btn-primary"
                          disabled={!canEditScenario}
                          onClick={() => onAddPaletteNode(item.nodeKind)}
                          title={item.label}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                LEGACY_SCENARIO_NODE_PALETTE.map((category) => (
                  <div key={category.title} className="flex flex-col gap-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/40">
                      {category.title}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {category.blockKinds.map((blockKind) => (
                        <button
                          key={blockKind}
                          type="button"
                          className="btn btn-xs btn-outline"
                          disabled={!canEditScenario}
                          onClick={() => onAddLegacyNode(blockKind)}
                          title={D0_SCENARIO_NODE_CATALOG[blockKind].label}
                        >
                          {D0_SCENARIO_NODE_CATALOG[blockKind].label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <p className="p-4 text-xs leading-relaxed text-base-content/50">
              Во время выполнения сценария палитра скрыта. Кликните по узлу, чтобы увидеть значения
              портов.
            </p>
          )}

          {!isRuntime ? (
            <div className="mt-auto border-t border-base-200 p-4">
              <button
                type="button"
                className="btn btn-sm btn-outline btn-error w-full"
                disabled={!canEditScenario}
                onClick={onClearBoard}
              >
                Очистить ветку
              </button>
            </div>
          ) : null}
        </div>
      )}

      {showRuntimeOutputs ? (
        <footer className="mt-auto shrink-0 border-t border-base-200 p-4">
          <BoardRuntimePortPanel
            title="Интерфейс выходов"
            ports={runtimeInspection.outputs}
            mode="interface"
            showTypeIndicators
            emptyHint="—"
          />
        </footer>
      ) : null}
    </aside>
  );
};
