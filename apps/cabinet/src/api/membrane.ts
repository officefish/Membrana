import { OVERFLOW_POLICIES, type OverflowPolicy } from '@membrana/plugin-contracts';

import { getApiBase } from './auth';

export type NodeAccessKeyDuration =
  | 'hours_4'
  | 'days_3'
  | 'weeks_2'
  | 'month_1'
  | 'months_3';

export const DURATION_OPTIONS: { value: NodeAccessKeyDuration; label: string }[] = [
  { value: 'hours_4', label: '4 часа' },
  { value: 'days_3', label: '3 дня' },
  { value: 'weeks_2', label: '2 недели' },
  { value: 'month_1', label: '1 месяц' },
  { value: 'months_3', label: '3 месяца' },
];

export interface TariffView {
  id: string;
  name: string;
  userStorageQuotaBytes: string;
  bufferQuotaBytes: string;
  datasetCatalogId: string;
  maxActiveKeysPerNode: number;
  maxNodesPerMembrane: number;
}

export interface NodeDeviceView {
  mediaDeviceId: string;
  label: string | null;
  lastSeenAt: string;
  /** #279: производный статус ключа сопряжения (истина сервера, без часов клиента). */
  pairedKeyStatus: 'active' | 'expired' | 'revoked';
  /** ISO; null, если ключ удалён и срок неизвестен. */
  pairedKeyExpiresAt: string | null;
  /** #2308: собственная настройка прибора (действует при снятой галочке-привязке). */
  bufferPolicy: BufferPolicyView;
  /** #2308: что прибор исполняет на самом деле — считает сервер, витрина не пересчитывает. */
  effectiveBufferPolicy: BufferPolicyView;
}

/**
 * ПОЛИТИКА ПЕРЕПОЛНЕНИЯ БУФЕРА (#2308, вердикт M1) — FOLLOWER контракта кабинетного сервера
 * (`modules/membrane/buffer-policy.ts`). Дом истины — сервер; новые режимы и причины здесь не
 * выдумываются. Словарь режимов — один на монорепо, `OVERFLOW_POLICIES` из
 * `@membrana/plugin-contracts` (адаптер B-1 интеграции `cowork-buffer-full-stop`).
 * Легаси `auto-cleanup` в типе нет: витрина не умеет его ни показать, ни послать.
 */
export const BUFFER_POLICY_MODES = [OVERFLOW_POLICIES.STOP, OVERFLOW_POLICIES.SMART_CLEANUP] as const;
export type BufferPolicyMode = OverflowPolicy;

export const SMART_CLEANUP_SELECTIONS = ['oldest_first', 'largest_first'] as const;
export type SmartCleanupSelection = (typeof SMART_CLEANUP_SELECTIONS)[number];

/** Каркас параметров умной очистки (M1): порог, критерий отбора, защита вещдоков. Алгоритма нет. */
export interface SmartCleanupParams {
  thresholdPercent: number;
  selection: SmartCleanupSelection;
  protectLabeled: boolean;
}

export interface BufferPolicyView {
  mode: BufferPolicyMode;
  params: SmartCleanupParams | null;
}

export interface MembraneBufferPolicyView extends BufferPolicyView {
  /** Галочка «применить ко всем» — привязка, не снимок. */
  applyToAll: boolean;
}

/** Закрытый список причин отказа записи — follower, 1:1 с сервером. */
export const BUFFER_POLICY_DENY_REASONS = [
  'unknown_mode',
  'params_incomplete',
  'params_invalid',
  'binding_active',
  'binding_not_confirmed',
  'node_not_paired',
] as const;
export type BufferPolicyDenyReason = (typeof BUFFER_POLICY_DENY_REASONS)[number];

export interface ContextSyncCount {
  updated: number;
  failed: number;
}

type BufferPolicyDeny = { ok: false; reason: BufferPolicyDenyReason | (string & Record<never, never>) };

export type SetMembraneBufferPolicyOutcome =
  | { ok: true; bufferPolicy: BufferPolicyView; applyToAll: boolean; contextSync: ContextSyncCount }
  | BufferPolicyDeny;

export type SetBufferPolicyBindingOutcome =
  | { ok: true; applyToAll: boolean; contextSync: ContextSyncCount }
  | BufferPolicyDeny;

export type SetNodeBufferPolicyOutcome =
  | {
      ok: true;
      nodeId: string;
      bufferPolicy: BufferPolicyView;
      effectiveBufferPolicy: BufferPolicyView;
      contextSync: ContextSyncCount;
    }
  | BufferPolicyDeny;

/** Что уезжает на сервер: режим и (для умной очистки) параметры. Гейт полноты судит сервер. */
export interface BufferPolicyInput {
  mode: BufferPolicyMode;
  params?: SmartCleanupParams | null;
}

export interface AccessKeyView {
  id: string;
  duration: NodeAccessKeyDuration;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  active: boolean;
}

export interface NodeView {
  id: string;
  label: string;
  createdAt: string;
  accessKeys: AccessKeyView[];
  device: NodeDeviceView | null;
}

export interface MembraneView {
  membrane: {
    id: string;
    tariff: TariffView;
    createdAt: string;
    /** #2308: режим, параметры и галочка-привязка мембраны. */
    bufferPolicy: MembraneBufferPolicyView;
  };
  /** Все узлы мембраны (MP7b multi-node). */
  nodes: NodeView[];
  /** Первый узел — для обратной совместимости. */
  node: NodeView | null;
}

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = sessionStorage.getItem('membrana.cabinet.sessionToken');
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${getApiBase()}${path}`, { ...init, headers });
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(', ');
    if (typeof body.message === 'string') return body.message;
  } catch {
    /* ignore */
  }
  return res.statusText || 'Request failed';
}

export async function fetchMembraneMe(): Promise<MembraneView> {
  const res = await authFetch('/v1/membranes/me');
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as MembraneView;
}

export async function createNode(label?: string): Promise<{ node: NodeView }> {
  const res = await authFetch('/v1/membranes/me/nodes', {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { node: NodeView };
}

export async function deleteNode(
  nodeId: string,
): Promise<{ deletedNodeId: string; revokedKeyIds: string[] }> {
  const res = await authFetch(`/v1/nodes/${nodeId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { deletedNodeId: string; revokedKeyIds: string[] };
}

export async function createAccessKey(
  nodeId: string,
  duration: NodeAccessKeyDuration,
): Promise<{ key: string; accessKey: AccessKeyView }> {
  const res = await authFetch(`/v1/nodes/${nodeId}/access-keys`, {
    method: 'POST',
    body: JSON.stringify({ duration }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { key: string; accessKey: AccessKeyView };
}

export async function revokeAccessKey(keyId: string): Promise<{ accessKey: AccessKeyView }> {
  const res = await authFetch(`/v1/access-keys/${keyId}/revoke`, { method: 'POST' });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { accessKey: AccessKeyView };
}

export async function purgeRevokedAccessKeys(
  nodeId: string,
): Promise<{ deletedCount: number }> {
  const res = await authFetch(`/v1/nodes/${nodeId}/access-keys/purge-inactive`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { deletedCount: number };
}

export async function deleteAccessKey(keyId: string): Promise<{ deletedKeyId: string }> {
  const res = await authFetch(`/v1/access-keys/${keyId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { deletedKeyId: string };
}

/**
 * Три записи политики переполнения (#2308). Транспортные ошибки (401/403/404/5xx) — throw;
 * доменный исход (`ok` | `reason`) — возврат, как у тарифа.
 */
export async function setMembraneBufferPolicy(
  input: BufferPolicyInput,
): Promise<SetMembraneBufferPolicyOutcome> {
  const res = await authFetch('/v1/membranes/me/buffer-policy', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SetMembraneBufferPolicyOutcome;
}

/** Включение требует `confirmed: true` — подтверждение живёт и на сервере, не только в окне. */
export async function setBufferPolicyBinding(
  applyToAll: boolean,
  confirmed: boolean,
): Promise<SetBufferPolicyBindingOutcome> {
  const res = await authFetch('/v1/membranes/me/buffer-policy/binding', {
    method: 'PUT',
    body: JSON.stringify({ applyToAll, confirmed }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SetBufferPolicyBindingOutcome;
}

export async function setNodeBufferPolicy(
  nodeId: string,
  input: BufferPolicyInput,
): Promise<SetNodeBufferPolicyOutcome> {
  const res = await authFetch(`/v1/nodes/${nodeId}/buffer-policy`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SetNodeBufferPolicyOutcome;
}
