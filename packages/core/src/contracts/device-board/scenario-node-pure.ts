/**
 * Pure / Impure semantics для scenario graph nodes (Blueprint parity v0.9).
 * @see docs/prompts/DEVICE_BOARD_PURE_GETTERS_EPIC_PROMPT.md
 */

import type { ScenarioGraphNode } from './scenario-graph.js';
import {
  POLICY_CONSTRUCTOR_SCENARIO_NODE_KINDS,
  RECORDING_GATE_SCENARIO_NODE_KINDS,
  REF_CONSTRUCTOR_SCENARIO_NODE_KINDS,
  type PolicyConstructorScenarioNodeKind,
  type ScenarioNodeKind,
} from './scenario-node-kind.js';

/**
 * Policy value constructors (D3): always pure, no exec pins, toggle disabled.
 * Alias для product term `CONSTRUCTOR_ALWAYS_PURE`.
 */
export const CONSTRUCTOR_ALWAYS_PURE_SCENARIO_NODE_KINDS = POLICY_CONSTRUCTOR_SCENARIO_NODE_KINDS;

export type ConstructorAlwaysPureScenarioNodeKind = PolicyConstructorScenarioNodeKind;

/**
 * Getters с галочкой Pure ↔ Impure в inspector.
 *
 * **Ref-provider getters** (только отдают ссылку на singleton/session — без per-tick host I/O):
 * `get-journal`, `get-reporter`, `get-recorder`, `get-spectral-analyser`.
 * Default pure: data-edge достаточен, exec passthrough не нужен.
 *
 * `variable-get` — document-scope variable read (value или ref).
 */
export const PURE_ELIGIBLE_SCENARIO_NODE_KINDS = [
  'variable-get',
  'get-journal',
  'get-reporter',
  'get-recorder',
  'get-spectral-analyser',
] as const satisfies readonly ScenarioNodeKind[];

export type PureEligibleScenarioNodeKind = (typeof PURE_ELIGIBLE_SCENARIO_NODE_KINDS)[number];

/** Default `pure` для PURE_ELIGIBLE kinds, когда поле отсутствует в JSON. */
export const DEFAULT_PURE_ELIGIBLE = true as const;

/**
 * Узлы, для которых `pure: true` запрещён (host I/O, side-effect, exec-only).
 * Значение `pure` на узле принудительно сбрасывается в `false` при hydrate.
 */
export const PURE_LOCKED_IMPURE_SCENARIO_NODE_KINDS = [
  'get-microphone',
  'get-audio-stream',
  'get-sample',
  'get-fft-frame',
  'collect-samples',
  'collect-fft-frames',
  ...REF_CONSTRUCTOR_SCENARIO_NODE_KINDS,
  ...RECORDING_GATE_SCENARIO_NODE_KINDS,
  'variable-set',
  'print',
  'is-valid',
  'start-streaming',
  'stop-streaming',
  'stop-runtime',
  'pause-runtime',
  'device-global',
  'publish-report',
  'event',
  'loop-repeat',
] as const satisfies readonly ScenarioNodeKind[];

export type PureLockedImpureScenarioNodeKind = (typeof PURE_LOCKED_IMPURE_SCENARIO_NODE_KINDS)[number];

/** True, если policy constructor — always pure (locked). */
export function isConstructorAlwaysPureScenarioNodeKind(
  value: string,
): value is ConstructorAlwaysPureScenarioNodeKind {
  return (CONSTRUCTOR_ALWAYS_PURE_SCENARIO_NODE_KINDS as readonly string[]).includes(value);
}

/** True, если getter поддерживает toggle Pure ↔ Impure. */
export function isPureEligibleScenarioNodeKind(value: string): value is PureEligibleScenarioNodeKind {
  return (PURE_ELIGIBLE_SCENARIO_NODE_KINDS as readonly string[]).includes(value);
}

/** True, если узел всегда impure (`pure: true` игнорируется). */
export function isPureLockedImpureScenarioNodeKind(value: string): value is PureLockedImpureScenarioNodeKind {
  return (PURE_LOCKED_IMPURE_SCENARIO_NODE_KINDS as readonly string[]).includes(value);
}

/** True, если поле `pure` сериализуется для данного `nodeKind`. */
export function isScenarioNodePureFieldApplicable(nodeKind: string | undefined): boolean {
  if (nodeKind === undefined) {
    return false;
  }
  return (
    isConstructorAlwaysPureScenarioNodeKind(nodeKind) ||
    isPureEligibleScenarioNodeKind(nodeKind)
  );
}

/**
 * Эффективное значение `pure` для runtime / validation.
 * Учитывает locked kinds и default для eligible getters.
 */
export function resolveScenarioGraphNodePure(
  node: Pick<ScenarioGraphNode, 'nodeKind' | 'pure'>,
): boolean {
  const kind = node.nodeKind;
  if (kind === undefined) {
    return false;
  }
  if (isConstructorAlwaysPureScenarioNodeKind(kind)) {
    return true;
  }
  if (isPureLockedImpureScenarioNodeKind(kind)) {
    return false;
  }
  if (isPureEligibleScenarioNodeKind(kind)) {
    return node.pure ?? DEFAULT_PURE_ELIGIBLE;
  }
  return false;
}

/**
 * Нормализует `pure` после hydrate / UI toggle.
 * - policy constructors → `pure: true`;
 * - locked impure → `pure` удаляется;
 * - eligible getter → явный boolean (default true можно опустить в JSON).
 */
export function normalizeScenarioGraphNodePure<T extends ScenarioGraphNode>(node: T): T {
  const kind = node.nodeKind;
  if (kind === undefined || !isScenarioNodePureFieldApplicable(kind)) {
    if (node.pure === undefined) {
      return node;
    }
    const { pure: _omit, ...rest } = node;
    return rest as T;
  }

  const effective = resolveScenarioGraphNodePure(node);

  if (isConstructorAlwaysPureScenarioNodeKind(kind)) {
    return effective ? ({ ...node, pure: true } as T) : node;
  }

  if (isPureEligibleScenarioNodeKind(kind)) {
    if (effective === DEFAULT_PURE_ELIGIBLE) {
      if (node.pure === undefined || node.pure === DEFAULT_PURE_ELIGIBLE) {
        const { pure: _omit, ...rest } = node;
        return rest as T;
      }
    }
    return { ...node, pure: effective } as T;
  }

  return node;
}
