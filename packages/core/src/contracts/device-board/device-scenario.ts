/**
 * Корневой документ `device-scenario` v1.
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §9
 */

import type { IsoDateTime, Result } from '../../types/index.js';
import { ValidationError } from '../../errors/index.js';
import { err, ok } from '../../utils/index.js';
import type { DeviceKind } from './device-kind.js';
import { isDeviceKind } from './device-kind.js';
import { createEmptySignalGraph, type SignalGraph } from './signal-graph.js';
import {
  createEmptyScenarioGraph,
  type ScenarioGraph,
  type ScenarioSubgraph,
} from './scenario-graph.js';

/** Discriminator JSON-документа сценария устройства. */
export const DEVICE_SCENARIO_DOCUMENT_KIND = 'device-scenario' as const;

/** Текущая версия schema `device-scenario`. */
export const DEVICE_SCENARIO_DOCUMENT_VERSION = 1 as const;

/** Метаданные export/import (hash обязателен при export — бриф V5). */
export interface DeviceScenarioMeta {
  readonly title?: string;
  readonly exportedAt?: IsoDateTime;
  readonly hash?: string;
}

/** Полный документ сценария устройства v1. */
export interface DeviceScenarioDocument {
  readonly version: typeof DEVICE_SCENARIO_DOCUMENT_VERSION;
  readonly kind: typeof DEVICE_SCENARIO_DOCUMENT_KIND;
  readonly deviceKind: DeviceKind;
  readonly meta?: DeviceScenarioMeta;
  readonly signalGraph: SignalGraph;
  readonly scenario: ScenarioGraph;
}

/** Создаёт пустой документ для `deviceKind`. */
export function createEmptyDeviceScenarioDocument(deviceKind: DeviceKind): DeviceScenarioDocument {
  return {
    version: DEVICE_SCENARIO_DOCUMENT_VERSION,
    kind: DEVICE_SCENARIO_DOCUMENT_KIND,
    deviceKind,
    signalGraph: createEmptySignalGraph(),
    scenario: createEmptyScenarioGraph(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSubgraph(value: unknown, path: string): Result<ScenarioSubgraph, ValidationError> {
  if (!isRecord(value)) {
    return err(new ValidationError(`${path} must be an object`, path));
  }
  const entry = value['entry'];
  if (typeof entry !== 'string' || entry.length === 0) {
    return err(new ValidationError(`${path}.entry must be a non-empty string`, `${path}.entry`));
  }
  const nodes = value['nodes'];
  const edges = value['edges'];
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return err(new ValidationError(`${path}.nodes and ${path}.edges must be arrays`, path));
  }
  return ok({
    entry,
    nodes: nodes as ScenarioSubgraph['nodes'],
    edges: edges as ScenarioSubgraph['edges'],
  });
}

/**
 * Парсит unknown JSON в `DeviceScenarioDocument`.
 * Отклоняет `version` > текущей (бриф V6).
 */
export function parseDeviceScenarioDocument(
  input: unknown,
): Result<DeviceScenarioDocument, ValidationError> {
  if (!isRecord(input)) {
    return err(new ValidationError('device-scenario root must be an object', 'root'));
  }

  const version = input['version'];
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    return err(new ValidationError('version must be an integer', 'version'));
  }
  if (version > DEVICE_SCENARIO_DOCUMENT_VERSION) {
    return err(
      new ValidationError(
        `unsupported device-scenario version ${version} (max ${DEVICE_SCENARIO_DOCUMENT_VERSION})`,
        'version',
      ),
    );
  }
  if (version !== DEVICE_SCENARIO_DOCUMENT_VERSION) {
    return err(
      new ValidationError(
        `unsupported device-scenario version ${version} (expected ${DEVICE_SCENARIO_DOCUMENT_VERSION})`,
        'version',
      ),
    );
  }

  const kind = input['kind'];
  if (kind !== DEVICE_SCENARIO_DOCUMENT_KIND) {
    return err(new ValidationError(`kind must be "${DEVICE_SCENARIO_DOCUMENT_KIND}"`, 'kind'));
  }

  const deviceKind = input['deviceKind'];
  if (typeof deviceKind !== 'string' || !isDeviceKind(deviceKind)) {
    return err(new ValidationError('deviceKind is invalid or missing', 'deviceKind'));
  }

  const signalGraphRaw = input['signalGraph'];
  if (!isRecord(signalGraphRaw)) {
    return err(new ValidationError('signalGraph must be an object', 'signalGraph'));
  }
  const signalNodes = signalGraphRaw['nodes'];
  const signalEdges = signalGraphRaw['edges'];
  if (!Array.isArray(signalNodes) || !Array.isArray(signalEdges)) {
    return err(
      new ValidationError('signalGraph.nodes and signalGraph.edges must be arrays', 'signalGraph'),
    );
  }

  const scenarioRaw = input['scenario'];
  if (!isRecord(scenarioRaw)) {
    return err(new ValidationError('scenario must be an object', 'scenario'));
  }

  const initialResult = parseSubgraph(scenarioRaw['initial'], 'scenario.initial');
  if (!initialResult.ok) {
    return initialResult;
  }

  const loopsRaw = scenarioRaw['loops'];
  if (!isRecord(loopsRaw)) {
    return err(new ValidationError('scenario.loops must be an object', 'scenario.loops'));
  }
  const mainResult = parseSubgraph(loopsRaw['main'], 'scenario.loops.main');
  if (!mainResult.ok) {
    return mainResult;
  }
  const alarmResult = parseSubgraph(loopsRaw['alarm'], 'scenario.loops.alarm');
  if (!alarmResult.ok) {
    return alarmResult;
  }

  const triggersRaw = scenarioRaw['triggers'];
  if (!isRecord(triggersRaw)) {
    return err(new ValidationError('scenario.triggers must be an object', 'scenario.triggers'));
  }
  const onStopResult = parseSubgraph(triggersRaw['onStop'], 'scenario.triggers.onStop');
  if (!onStopResult.ok) {
    return onStopResult;
  }
  const onDisconnectResult = parseSubgraph(
    triggersRaw['onDisconnect'],
    'scenario.triggers.onDisconnect',
  );
  if (!onDisconnectResult.ok) {
    return onDisconnectResult;
  }

  const customRaw = triggersRaw['custom'];
  if (customRaw !== undefined && !Array.isArray(customRaw)) {
    return err(new ValidationError('scenario.triggers.custom must be an array', 'scenario.triggers.custom'));
  }

  const functionsRaw = scenarioRaw['functions'];
  if (functionsRaw !== undefined && !Array.isArray(functionsRaw)) {
    return err(new ValidationError('scenario.functions must be an array', 'scenario.functions'));
  }

  const scheduledRaw = scenarioRaw['scheduled'];
  if (scheduledRaw !== undefined && !Array.isArray(scheduledRaw)) {
    return err(new ValidationError('scenario.scheduled must be an array', 'scenario.scheduled'));
  }

  const metaRaw = input['meta'];
  if (metaRaw !== undefined && !isRecord(metaRaw)) {
    return err(new ValidationError('meta must be an object when present', 'meta'));
  }

  return ok({
    version: DEVICE_SCENARIO_DOCUMENT_VERSION,
    kind: DEVICE_SCENARIO_DOCUMENT_KIND,
    deviceKind,
    meta: metaRaw as DeviceScenarioMeta | undefined,
    signalGraph: {
      nodes: signalNodes as SignalGraph['nodes'],
      edges: signalEdges as SignalGraph['edges'],
    },
    scenario: {
      initial: initialResult.value,
      loops: {
        main: mainResult.value,
        alarm: alarmResult.value,
      },
      triggers: {
        onStop: onStopResult.value,
        onDisconnect: onDisconnectResult.value,
        custom: (customRaw ?? []) as ScenarioGraph['triggers']['custom'],
      },
      functions: (functionsRaw ?? []) as ScenarioGraph['functions'],
      scheduled: (scheduledRaw ?? []) as ScenarioGraph['scheduled'],
    },
  });
}
