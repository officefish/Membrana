import React, { useEffect, useState } from 'react';
import type {
  ScenarioBlockKind,
  ScenarioCollectorConfig,
  ScenarioFftTrendsPolicy,
  ScenarioNodeKind,
  ScenarioRecordingPolicy,
  ScenarioVariableType,
  ScenarioVariableValue,
  ScenarioCommentGroupFrameColor,
  ScenarioCommentGroupFrameColorPreset,
  SocketType,
} from '@membrana/core';
import {
  DEFAULT_SCENARIO_COLLECTOR_CONFIG,
  FFT_TRENDS_BUILTIN_TEMPLATE_KEYS,
  FFT_TRENDS_DETECTION_MODES,
  SCENARIO_COMMENT_GROUP_FRAME_COLOR_PRESETS,
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
  resolveScenarioCommentGroupFrameColor,
  resolveScenarioFftTrendsPolicy,
  resolveScenarioRecordingPolicy,
} from '@membrana/core';

import { D0_SCENARIO_NODE_CATALOG } from '../graph/index.js';
import type { V04PaletteNodeKind } from '../graph/palette-node.js';
import { COMMENT_GROUP_DESCRIPTION_MAX_LENGTH } from '../graph/comment-group.js';
import {
  COMMENT_GROUP_FRAME_COLOR_PRESET_LABELS,
  COMMENT_GROUP_FRAME_SWATCH_CLASS,
  commentGroupCustomPickerHex,
  parseCommentGroupRgbInput,
} from '../graph/comment-group-frame-color.js';
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
import { BoardFunctionPinInspector, type FunctionPinEditSide } from './board-function-pin-inspector.js';
import type { ScenarioFunctionCanvasMeta } from '../graph/hydrate-board-from-document.js';
import type { FunctionPinSide } from '../graph/function-pin-ops.js';

export interface BoardRightSidebarProps {
  readonly collapsed?: boolean;
  readonly onToggleCollapse?: () => void;
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
  readonly selectedIsCommentGroup: boolean;
  readonly selectedGroupTitle: string;
  readonly selectedGroupDescription: string;
  readonly selectedGroupFrameColor: ScenarioCommentGroupFrameColor;
  readonly selectedVariableTypeLabel: string | null;
  readonly selectedFunctionId: string | null;
  readonly selectedFunctionName: string | null;
  readonly microphoneOptions: readonly ScenarioMicrophoneOption[];
  readonly microphoneOptionsLoading?: boolean;
  readonly canEditScenario: boolean;
  readonly isFunctionBranch: boolean;
  readonly functionMeta: ScenarioFunctionCanvasMeta | null;
  readonly functionPinEditSide: FunctionPinEditSide;
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
  readonly onCommentGroupMetadataChange: (
    nodeId: string,
    patch: {
      readonly title?: string;
      readonly description?: string;
      readonly frameColor?: ScenarioCommentGroupFrameColor;
    },
  ) => void;
  readonly onUpdateFunctionMeta: (
    patch: Partial<Pick<ScenarioFunctionCanvasMeta, 'name' | 'description'>>,
  ) => void;
  readonly onOpenFunctionEditor: (functionId: string) => void;
  readonly onAddFunctionPin: (side: FunctionPinSide) => void;
  readonly onUpdateFunctionPin: (
    side: FunctionPinSide,
    pinId: string,
    patch: {
      readonly name?: string;
      readonly kind?: 'exec' | 'data';
      readonly socketType?: SocketType;
    },
  ) => void;
  readonly onRemoveFunctionPin: (side: FunctionPinSide, pinId: string) => void;
  readonly onDeleteFunction: () => void;
  readonly onClearBoard: () => void;
}

/**
 * Правый сайдбар доски (MP7b RT6 / v0.4 DBR5): инспектор выбранной ноды
 * или палитра v0.4 (Print / isValid / GetMicrophone); legacy D0 — под флагом.
 */
export const BoardRightSidebar: React.FC<BoardRightSidebarProps> = ({
  collapsed = false,
  onToggleCollapse,
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
  selectedIsCommentGroup,
  selectedGroupTitle,
  selectedGroupDescription,
  selectedGroupFrameColor,
  selectedVariableTypeLabel,
  selectedFunctionId,
  selectedFunctionName,
  microphoneOptions,
  microphoneOptionsLoading = false,
  canEditScenario,
  isFunctionBranch,
  functionMeta,
  functionPinEditSide,
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
  onCommentGroupMetadataChange,
  onUpdateFunctionMeta,
  onOpenFunctionEditor,
  onAddFunctionPin,
  onUpdateFunctionPin,
  onRemoveFunctionPin,
  onDeleteFunction,
  onClearBoard,
}) => {
  const legacyPalette = isLegacyPaletteEnabled();
  const [variableNameDraft, setVariableNameDraft] = useState(selectedVariableName);
  const [groupTitleDraft, setGroupTitleDraft] = useState(selectedGroupTitle);
  const [groupDescriptionDraft, setGroupDescriptionDraft] = useState(selectedGroupDescription);
  const [groupFrameColorDraft, setGroupFrameColorDraft] = useState(selectedGroupFrameColor);
  const [groupCustomRgbDraft, setGroupCustomRgbDraft] = useState(
    commentGroupCustomPickerHex(selectedGroupFrameColor),
  );
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
  const showFunctionInspector = isFunctionBranch && functionMeta !== null && !isRuntime;
  const showSubgraphFunctionInspector =
    !isFunctionBranch &&
    selectedFunctionId !== null &&
    selectedFunctionName !== null &&
    !isRuntime;

  useEffect(() => {
    setVariableNameDraft(selectedVariableName);
  }, [selectedNodeId, selectedVariableName]);

  useEffect(() => {
    setGroupTitleDraft(selectedGroupTitle);
    setGroupDescriptionDraft(selectedGroupDescription);
    setGroupFrameColorDraft(selectedGroupFrameColor);
    setGroupCustomRgbDraft(commentGroupCustomPickerHex(selectedGroupFrameColor));
  }, [
    selectedGroupDescription,
    selectedGroupFrameColor,
    selectedGroupTitle,
    selectedNodeId,
  ]);

  const themeFramePresets = SCENARIO_COMMENT_GROUP_FRAME_COLOR_PRESETS.filter(
    (preset): preset is Exclude<ScenarioCommentGroupFrameColorPreset, 'custom'> => preset !== 'custom',
  );

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

  const commitGroupTitle = (): void => {
    if (selectedNodeId === null || editDisabled || !selectedIsCommentGroup) {
      return;
    }
    const trimmed = groupTitleDraft.trim();
    if (trimmed === selectedGroupTitle.trim()) {
      return;
    }
    onCommentGroupMetadataChange(selectedNodeId, { title: trimmed });
  };

  const commitGroupDescription = (): void => {
    if (selectedNodeId === null || editDisabled || !selectedIsCommentGroup) {
      return;
    }
    const trimmed = groupDescriptionDraft.trim().slice(0, COMMENT_GROUP_DESCRIPTION_MAX_LENGTH);
    if (trimmed === selectedGroupDescription.trim()) {
      return;
    }
    onCommentGroupMetadataChange(selectedNodeId, { description: trimmed });
  };

  const commitGroupFrameColor = (frameColor: ScenarioCommentGroupFrameColor): void => {
    if (selectedNodeId === null || editDisabled || !selectedIsCommentGroup) {
      return;
    }
    const normalized = resolveScenarioCommentGroupFrameColor(frameColor);
    setGroupFrameColorDraft(normalized);
    if (normalized.preset === 'custom') {
      setGroupCustomRgbDraft(commentGroupCustomPickerHex(normalized));
    }
    onCommentGroupMetadataChange(selectedNodeId, { frameColor: normalized });
  };

  const commitGroupCustomRgbField = (): void => {
    const parsed = parseCommentGroupRgbInput(groupCustomRgbDraft);
    if (parsed === null) {
      setGroupCustomRgbDraft(commentGroupCustomPickerHex(groupFrameColorDraft));
      return;
    }
    setGroupCustomRgbDraft(parsed);
    commitGroupFrameColor({ preset: 'custom', rgb: parsed });
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
      className={`flex h-full ${
        collapsed ? 'w-10' : 'w-[clamp(12rem,15vw,16rem)]'
      } flex-col overflow-y-auto overflow-x-hidden border-l border-base-300 bg-base-100/95 shadow-lg backdrop-blur-sm`}
      aria-label="Инспектор и палитра нод"
    >
      {onToggleCollapse ? (
        <button
          type="button"
          className="btn btn-ghost btn-xs m-2 self-start shrink-0"
          aria-label={collapsed ? 'Развернуть правую панель' : 'Свернуть правую панель'}
          title={collapsed ? 'Развернуть' : 'Свернуть'}
          onClick={onToggleCollapse}
        >
          {collapsed ? '«' : '»'}
        </button>
      ) : null}
      {collapsed ? null : (
        <>
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
      ) : showSubgraphFunctionInspector ? (
        <div className="flex flex-col gap-3 p-4 text-sm">
          <div className="border-b border-base-200 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
              Пользовательская функция
            </p>
            <h2 className="text-sm font-semibold text-base-content truncate">{selectedFunctionName}</h2>
          </div>
          <p className="text-xs leading-relaxed text-base-content/55">
            Двойной клик по блоку на канвасе открывает редактор функции.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm w-full"
            disabled={isRuntime}
            onClick={() => {
              if (selectedFunctionId !== null) {
                onOpenFunctionEditor(selectedFunctionId);
              }
            }}
          >
            Открыть редактор
          </button>
        </div>
      ) : showFunctionInspector ? (
        <BoardFunctionPinInspector
          meta={functionMeta}
          pinEditSide={functionPinEditSide}
          disabled={editDisabled}
          onUpdateMeta={onUpdateFunctionMeta}
          onAddPin={onAddFunctionPin}
          onUpdatePin={onUpdateFunctionPin}
          onRemovePin={onRemoveFunctionPin}
          onDeleteFunction={onDeleteFunction}
        />
      ) : selectedNodeId ? (
        <div className="flex flex-col gap-3 p-4 text-sm">
          <div className="border-b border-base-200 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
              {selectedIsCommentGroup ? 'Настройки группы' : 'Настройки ноды'}
            </p>
            <h2 className="text-sm font-semibold text-base-content">
              {selectedIsCommentGroup
                ? selectedGroupTitle || 'Группа'
                : (selectedNodeLabel ?? selectedNodeId)}
            </h2>
          </div>
          {isRuntime ? (
            <p className="text-xs leading-relaxed text-base-content/55">
              {selectedIsCommentGroup
                ? 'Группы нельзя редактировать во время выполнения сценария.'
                : 'Редактирование узлов недоступно во время выполнения. Значения портов — в панелях слева и справа.'}
            </p>
          ) : selectedIsCommentGroup ? (
            <div className="flex flex-col gap-3 text-xs">
              <label className="flex flex-col gap-1">
                <span className="font-medium text-base-content/70">Название</span>
                <input
                  type="text"
                  className="input input-bordered input-sm w-full"
                  value={groupTitleDraft}
                  placeholder="Группа"
                  disabled={editDisabled}
                  onChange={(event) => setGroupTitleDraft(event.target.value)}
                  onBlur={() => commitGroupTitle()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.currentTarget.blur();
                    }
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-medium text-base-content/70">Описание</span>
                <textarea
                  className="textarea textarea-bordered textarea-sm min-h-[5rem] w-full resize-y leading-snug"
                  value={groupDescriptionDraft}
                  maxLength={COMMENT_GROUP_DESCRIPTION_MAX_LENGTH}
                  placeholder="Необязательно"
                  disabled={editDisabled}
                  onChange={(event) => setGroupDescriptionDraft(event.target.value)}
                  onBlur={() => commitGroupDescription()}
                />
                <span className="text-base-content/50">
                  {groupDescriptionDraft.length}/{COMMENT_GROUP_DESCRIPTION_MAX_LENGTH}
                </span>
              </label>
              <div className="flex flex-col gap-2">
                <span className="font-medium text-base-content/70">Цвет рамки</span>
                <select
                  className="select select-bordered select-sm w-full font-mono"
                  value={groupFrameColorDraft.preset}
                  disabled={editDisabled}
                  onChange={(event) => {
                    const preset = event.target.value as ScenarioCommentGroupFrameColorPreset;
                    if (preset === 'custom') {
                      commitGroupFrameColor({
                        preset: 'custom',
                        rgb: commentGroupCustomPickerHex(groupFrameColorDraft),
                      });
                      return;
                    }
                    commitGroupFrameColor({ preset });
                  }}
                >
                  {SCENARIO_COMMENT_GROUP_FRAME_COLOR_PRESETS.map((preset) => (
                    <option key={preset} value={preset}>
                      {COMMENT_GROUP_FRAME_COLOR_PRESET_LABELS[preset]}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-1.5" role="list" aria-label="Палитра цветов">
                  {themeFramePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      role="listitem"
                      className={`h-6 w-6 rounded-md border border-base-content/20 ${COMMENT_GROUP_FRAME_SWATCH_CLASS[preset]} ${
                        groupFrameColorDraft.preset === preset ? 'ring-2 ring-base-content/40' : ''
                      }`}
                      disabled={editDisabled}
                      title={COMMENT_GROUP_FRAME_COLOR_PRESET_LABELS[preset]}
                      aria-label={COMMENT_GROUP_FRAME_COLOR_PRESET_LABELS[preset]}
                      onClick={() => commitGroupFrameColor({ preset })}
                    />
                  ))}
                  <button
                    type="button"
                    className={`flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-base-content/30 text-[9px] font-semibold uppercase ${
                      groupFrameColorDraft.preset === 'custom' ? 'ring-2 ring-base-content/40' : ''
                    }`}
                    style={{
                      backgroundColor:
                        groupFrameColorDraft.preset === 'custom'
                          ? commentGroupCustomPickerHex(groupFrameColorDraft)
                          : undefined,
                    }}
                    disabled={editDisabled}
                    title="Custom"
                    aria-label="Custom"
                    onClick={() =>
                      commitGroupFrameColor({
                        preset: 'custom',
                        rgb: commentGroupCustomPickerHex(groupFrameColorDraft),
                      })
                    }
                  >
                    {groupFrameColorDraft.preset === 'custom' ? null : 'C'}
                  </button>
                </div>
                {groupFrameColorDraft.preset === 'custom' ? (
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2">
                      <span className="shrink-0 text-base-content/60">Picker</span>
                      <input
                        type="color"
                        className="h-9 w-full cursor-pointer rounded-md border border-base-300 bg-base-100 p-1"
                        value={commentGroupCustomPickerHex(groupFrameColorDraft)}
                        disabled={editDisabled}
                        onChange={(event) => {
                          const rgb = event.target.value.toLowerCase();
                          setGroupCustomRgbDraft(rgb);
                          commitGroupFrameColor({ preset: 'custom', rgb });
                        }}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-base-content/60">RGB / hex</span>
                      <input
                        type="text"
                        className="input input-bordered input-sm w-full font-mono"
                        value={groupCustomRgbDraft}
                        placeholder="#7c3aed или rgb(124, 58, 237)"
                        disabled={editDisabled}
                        onChange={(event) => setGroupCustomRgbDraft(event.target.value)}
                        onBlur={() => commitGroupCustomRgbField()}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.currentTarget.blur();
                          }
                        }}
                      />
                    </label>
                  </div>
                ) : null}
              </div>
              <p className="text-base-content/55 leading-relaxed">
                Группа — визуальная рамка; не участвует в выполнении сценария.
              </p>
            </div>
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
      ) : !canEditScenario && !isRuntime ? (
        <div className="flex flex-1 flex-col gap-3 p-4 text-sm">
          <div className="border-b border-base-200 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
              Режим просмотра
            </p>
            <h2 className="text-sm font-semibold text-base-content">Сценарий только для чтения</h2>
          </div>
          <p className="text-xs leading-relaxed text-base-content/55">
            Палитра и редактирование недоступны. Выберите узел на канвасе, чтобы просмотреть параметры.
            Перемещение и масштаб канваса работают как обычно.
          </p>
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
        </>
      )}
    </aside>
  );
};
