/**
 * ЧИСТАЯ ЛОГИКА ВИТРИНЫ ПОЛИТИКИ ПЕРЕПОЛНЕНИЯ (#2308, вердикт M1, блок B `overflow-policy`).
 *
 * Здесь всё, что можно проверить без DOM: черновик параметров умной очистки, признак «режим
 * `smart_cleanup` выбираем» (disabled — UX, судит сервер), человеческие тексты причин отказа
 * (follower закрытого списка сервера, как `tariffDenyText`) и подписи режимов.
 *
 * Правило одно на показ и на действие: `smartCleanupDisabledReason(draft)` и `toPolicyInput(draft)`
 * берут один и тот же предикат полноты. Разведи их — и селект разрешит то, что форма отправить
 * не сможет, либо наоборот.
 */
import { OVERFLOW_POLICIES, SMART_CLEANUP_AVAILABLE } from '@membrana/plugin-contracts';

import {
  BUFFER_POLICY_DENY_REASONS,
  SMART_CLEANUP_SELECTIONS,
  type BufferPolicyDenyReason,
  type BufferPolicyInput,
  type BufferPolicyMode,
  type BufferPolicyView,
  type SmartCleanupParams,
  type SmartCleanupSelection,
} from '@/api/membrane';

/** Черновик S в форме: поля могут быть пустыми — это и есть «не заполнено». */
export interface SmartCleanupDraft {
  thresholdPercent: string;
  selection: SmartCleanupSelection | '';
  protectLabeled: boolean | null;
}

export const EMPTY_DRAFT: SmartCleanupDraft = { thresholdPercent: '', selection: '', protectLabeled: null };

export const MODE_LABEL: Record<BufferPolicyMode, string> = {
  stop: 'Стоп: прибор перестаёт писать, вещдоки не трогаются',
  smart_cleanup: 'Умная очистка: по заданным параметрам',
};

export const SELECTION_LABEL: Record<SmartCleanupSelection, string> = {
  oldest_first: 'Сначала самые старые',
  largest_first: 'Сначала самые крупные',
};

/** Черновик из того, что уже сохранено на сервере (при открытии формы). */
export function draftFromParams(params: SmartCleanupParams | null): SmartCleanupDraft {
  if (!params) return EMPTY_DRAFT;
  return {
    thresholdPercent: String(params.thresholdPercent),
    selection: params.selection,
    protectLabeled: params.protectLabeled,
  };
}

/**
 * Полный набор из черновика или `null`. Предикат полноты — ЗДЕСЬ и только здесь; тот же, что у
 * сервера по смыслу (три слота, порог 1..100 целый, критерий из списка, защита указана явно).
 */
export function completeParams(draft: SmartCleanupDraft): SmartCleanupParams | null {
  const trimmed = draft.thresholdPercent.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return null;
  const thresholdPercent = Number(trimmed);
  if (thresholdPercent < 1 || thresholdPercent > 100) return null;
  if (!draft.selection || !(SMART_CLEANUP_SELECTIONS as readonly string[]).includes(draft.selection)) return null;
  if (draft.protectLabeled === null) return null;
  return { thresholdPercent, selection: draft.selection, protectLabeled: draft.protectLabeled };
}

/**
 * #2318 (долг D-1): прямой текст витрины, пока переключатель `SMART_CLEANUP_AVAILABLE` словаря
 * выключен — алгоритма T12 нет. Честная витрина, не скрытая кнопка: пункт виден, выключен, и
 * рядом сказано почему. Тот же гейт стоит на сервере (`smart_cleanup_unavailable`).
 */
export const SMART_CLEANUP_UNAVAILABLE_TEXT = 'Недоступно до появления алгоритма очистки';

/** Опция гейта — ТОЛЬКО для зубов ветки полноты параметров; боевой код опцию не передаёт. */
export interface SmartCleanupGateOptions {
  smartCleanupAvailable?: boolean;
}

function smartCleanupAvailable(options: SmartCleanupGateOptions | undefined): boolean {
  return options?.smartCleanupAvailable ?? SMART_CLEANUP_AVAILABLE;
}

/**
 * Почему «умная очистка» сейчас недоступна — текстом, а не серой магией (Верстальщик, M1).
 * `null` — доступна. Гейт доступности (#2318) судится РАНЬШЕ полноты параметров: иначе текст
 * «не заданы: порог…» лгал бы о причине — оператор заполнит слоты и упрётся в ту же стену.
 */
export function smartCleanupDisabledReason(draft: SmartCleanupDraft, options?: SmartCleanupGateOptions): string | null {
  if (!smartCleanupAvailable(options)) return SMART_CLEANUP_UNAVAILABLE_TEXT;
  const missing: string[] = [];
  const trimmed = draft.thresholdPercent.trim();
  if (!trimmed) missing.push('порог');
  else if (!/^\d{1,3}$/.test(trimmed) || Number(trimmed) < 1 || Number(trimmed) > 100) {
    return 'Порог должен быть целым числом от 1 до 100';
  }
  if (!draft.selection) missing.push('критерий отбора');
  if (draft.protectLabeled === null) missing.push('защита вещдоков');
  if (missing.length === 0) return null;
  return `Недоступно, пока не заданы: ${missing.join(', ')}`;
}

/**
 * Что уезжает на сервер. `smart_cleanup` без полного S не собирается вовсе; и при выключенном
 * гейте (#2318) — тоже: ОДНО правило на показ и на действие — то же, что красит пункт селекта.
 */
export function toPolicyInput(
  mode: BufferPolicyMode,
  draft: SmartCleanupDraft,
  options?: SmartCleanupGateOptions,
): BufferPolicyInput | null {
  if (mode === 'stop') return { mode: 'stop' };
  if (smartCleanupDisabledReason(draft, options) !== null) return null;
  const params = completeParams(draft);
  return params ? { mode: OVERFLOW_POLICIES.SMART_CLEANUP, params } : null;
}

const DENY_TEXT: Record<BufferPolicyDenyReason, string> = {
  unknown_mode: 'Такого режима нет — обновите страницу',
  smart_cleanup_unavailable: 'Умная очистка недоступна до появления алгоритма очистки',
  params_incomplete: 'Умная очистка не включена: не заданы все параметры',
  params_invalid: 'Умная очистка не включена: один из параметров вне допустимого',
  binding_active: 'Пока стоит «применить ко всем», режим прибора задаёт мембрана — снимите галочку',
  binding_not_confirmed: 'Включение «применить ко всем» требует подтверждения',
  node_not_paired: 'У узла нет привязанного прибора — режим некуда записать',
};

/** Человеческий текст причины; неизвестная причина не молчит, а называется кодом. */
export function bufferPolicyDenyText(reason: string): string {
  if ((BUFFER_POLICY_DENY_REASONS as readonly string[]).includes(reason)) {
    return DENY_TEXT[reason as BufferPolicyDenyReason];
  }
  return `Неизвестная причина отказа: ${reason}`;
}

/** Короткая подпись политики в строке узла: режим и, для умной очистки, порог. */
export function describePolicy(policy: BufferPolicyView): string {
  if (policy.mode === 'stop') return 'стоп';
  const p = policy.params;
  return p ? `умная очистка · ${p.thresholdPercent}% · ${SELECTION_LABEL[p.selection]}${p.protectLabeled ? ' · вещдоки защищены' : ''}` : 'умная очистка';
}

/** Текст счёта разноски — тот же смысл, что у тарифа: правда о недоехавших. */
export function contextSyncText(sync: { updated: number; failed: number }): string {
  const base = `Приборов обновлено: ${sync.updated}`;
  return sync.failed > 0
    ? `${base}, не удалось: ${sync.failed} — на них режим обновится при следующем подключении`
    : base;
}
